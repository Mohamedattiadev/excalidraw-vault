import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { load } from 'cheerio';
import { parseExcalidraw } from '../.quartz/plugins/obsidian-plugin-excalidraw/dist/index.js';

const PUBLIC = path.resolve('public');
const CONTENT = path.resolve('content');
const VAULT = path.resolve('..', 'MY STUDING EXCALI');
const SCENES_DIR = path.resolve('public/_scenes');
const FILES_DIR = path.resolve('public/_files');

await fs.mkdir(SCENES_DIR, { recursive: true });
await fs.mkdir(FILES_DIR, { recursive: true });

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.bmp', '.ico']);
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

async function buildImageIndex() {
  const roots = [CONTENT];
  try {
    await fs.access(VAULT);
    roots.push(VAULT);
  } catch {}
  const idx = new Map();
  for (const root of roots) {
    const files = await glob(`${root}/**/*.{png,jpg,jpeg,gif,svg,webp,avif,bmp,ico}`, { nocase: true });
    for (const fp of files) {
      const name = path.basename(fp).toLowerCase();
      if (!idx.has(name)) idx.set(name, fp);
    }
  }
  return idx;
}

async function copyFileOnce(fp, hash) {
  const ext = path.extname(fp).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const outName = `${hash}${ext}`;
  const outPath = path.join(FILES_DIR, outName);
  try { await fs.access(outPath); }
  catch { await fs.copyFile(fp, outPath); }
  return { mime, outName };
}

async function resolveEmbedded(data, imgIndex) {
  data.files = data.files || {};
  // Inline base64 dataURLs from compressed JSON files → write to disk, replace with URL.
  for (const [hash, file] of Object.entries(data.files)) {
    if (!file?.dataURL || !file.dataURL.startsWith('data:')) continue;
    const m = file.dataURL.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) continue;
    const mime = m[1];
    const ext = Object.entries(MIME).find(([, v]) => v === mime)?.[0] ?? '.bin';
    const outName = `${hash}${ext}`;
    const outPath = path.join(FILES_DIR, outName);
    try {
      await fs.access(outPath);
    } catch {
      await fs.writeFile(outPath, Buffer.from(m[2], 'base64'));
    }
    data.files[hash] = { id: hash, dataURL: `/_files/${outName}`, mimeType: mime, created: Date.now(), lastRetrieved: Date.now() };
  }
  // Wikilink embedded files
  if (data.embeddedFiles) {
    for (const [hash, wikilink] of Object.entries(data.embeddedFiles)) {
      if (data.files[hash]?.dataURL && !data.files[hash].dataURL.startsWith('data:')) continue;
      const name = (wikilink.split('/').pop() ?? '').toLowerCase();
      const fp = imgIndex.get(name);
      if (!fp) continue;
      try {
        const { mime, outName } = await copyFileOnce(fp, hash);
        data.files[hash] = {
          id: hash,
          dataURL: `/_files/${outName}`,
          mimeType: mime,
          created: Date.now(),
          lastRetrieved: Date.now(),
        };
      } catch {}
    }
  }
}

const imgIndex = await buildImageIndex();
console.log(`indexed ${imgIndex.size} images`);

// Collect both `.excalidraw.md` and plain `.md` files that carry the Obsidian Excalidraw plugin marker.
const allMd = await glob(`${CONTENT}/**/*.md`, { follow: true });
const mdFiles = [];
for (const fp of allMd) {
  if (fp.endsWith('.excalidraw.md')) { mdFiles.push(fp); continue; }
  try {
    const head = await fs.readFile(fp, 'utf8');
    if (/^excalidraw-plugin:\s*\S/m.test(head.slice(0, 2048))) mdFiles.push(fp);
  } catch {}
}
console.log(`scanning ${mdFiles.length} excalidraw md`);

const sceneIndex = {};

for (const mdPath of mdFiles) {
  const rel = path.relative(CONTENT, mdPath);
  const content = await fs.readFile(mdPath, 'utf8');
  const data = parseExcalidraw(content, mdPath);
  if (!data) {
    console.log(`skip parse: ${rel}`);
    continue;
  }
  await resolveEmbedded(data, imgIndex);
  const slug = rel.replace(/\.excalidraw\.md$/, '').replace(/\.md$/, '').replace(/ /g, '-').replace(/[\/\\]/g, '__').toLowerCase();
  const jsonPath = path.join(SCENES_DIR, `${slug}.json`);
  const scene = {
    type: 'excalidraw',
    version: data.version || 2,
    source: data.source || 'https://excalidraw.com',
    elements: data.elements || [],
    appState: { ...(data.appState || {}), viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff' },
    files: data.files || {},
  };
  await fs.writeFile(jsonPath, JSON.stringify(scene));
  sceneIndex[rel.replace(/\.md$/, '').toLowerCase()] = slug;
  const fileCount = Object.keys(scene.files).length;
  console.log(`scene: ${rel} -> ${slug}.json (${scene.elements.length} els, ${fileCount} files)`);
}

await fs.writeFile(path.join(SCENES_DIR, 'index.json'), JSON.stringify(sceneIndex, null, 2));

// Derive site basepath from quartz.config.yaml baseUrl (e.g. user.github.io/repo → /repo).
async function readBasepath() {
  try {
    const yaml = await fs.readFile(path.resolve('quartz.config.yaml'), 'utf8');
    const m = yaml.match(/^\s*baseUrl:\s*(\S+)/m);
    if (!m) return '';
    const u = m[1].replace(/^https?:\/\//, '');
    const slashIdx = u.indexOf('/');
    if (slashIdx === -1) return '';
    const bp = u.slice(slashIdx).replace(/\/$/, '');
    return bp.startsWith('/') ? bp : '/' + bp;
  } catch { return ''; }
}
const SITE_BASEPATH = await readBasepath();
console.log(`site basepath: ${SITE_BASEPATH || '(none)'}`);

// Build a static collapsible tree (no JS needed — uses <details>) from the scene list.
// Replaces Quartz's broken explorer inside .excalidraw-sidebar.
const ALLOWED_TOP_LEVEL = new Set([
  '00-Index', '01-Algorithms', '02-DesignPatterns', '03-OS', '04-Databases',
  '05-Networking', '06-DataScience-Mining', '07-SoftwareArchitecture',
  '08-ScientificComputing', '09-Security', '10-English',
]);
// Pretty-print labels: drop leading "NN", "NN-", "NN.", "NN -" prefixes and
// excess hyphens/spaces, then title-case.
function prettifyLabel(raw) {
  let s = String(raw)
    .replace(/\.excalidraw$/i, '')
    .replace(/^\s*\d+(\.\d+)?\s*[-._)]?\s*/, '')   // strip leading numeric prefix
    .replace(/\(\s*\d+[^)]*\)/g, '')              // drop trailing "(5-..)" etc.
    .replace(/([a-z])([A-Z])/g, '$1 $2')          // split CamelCase
    .replace(/[-_]+/g, ' ')
    .replace(/\.+$/g, '')                          // drop trailing dots
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) s = String(raw);
  // Title case while preserving common acronyms (all-caps words).
  return s.split(' ').map((w) => {
    if (/^[A-Z]{2,}$/.test(w)) return w;          // keep "DB", "OS", "HOW"
    return w[0] ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
  }).join(' ');
}
function originalSortKey(rawSegment) {
  // Sort by leading number if any, else fall back to alphabetic.
  const m = String(rawSegment).match(/^\s*(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : Infinity;
}

const treeEntries = mdFiles
  .map((mdPath) => {
    const rel = path.relative(CONTENT, mdPath).replace(/\\/g, '/');
    const top = rel.split('/')[0];
    if (!ALLOWED_TOP_LEVEL.has(top)) return null;
    const noExt = rel.replace(/\.excalidraw\.md$/, '').replace(/\.md$/, '');
    const rawSegs = noExt.split('/');
    const rawFile = rawSegs.pop();
    const segments = rawSegs.map((raw) => ({ raw, label: prettifyLabel(raw), sortKey: originalSortKey(raw) }));
    const fileLabel = prettifyLabel(rawFile);
    const fileSortKey = originalSortKey(rawFile);
    const urlPath = SITE_BASEPATH + '/' + noExt.toLowerCase().split('/').map((s) => s.replace(/ /g, '-')).join('/') + '.excalidraw';
    return { segments, label: fileLabel, sortKey: fileSortKey, url: urlPath };
  })
  .filter(Boolean);

function buildTreeNode() {
  return { folders: new Map(), files: [], sortKey: Infinity, label: '' };
}
const treeRoot = buildTreeNode();
for (const e of treeEntries) {
  let node = treeRoot;
  for (const seg of e.segments) {
    if (!node.folders.has(seg.raw)) {
      const child = buildTreeNode();
      child.label = seg.label;
      child.sortKey = seg.sortKey;
      node.folders.set(seg.raw, child);
    }
    node = node.folders.get(seg.raw);
  }
  node.files.push({ label: e.label, url: e.url, sortKey: e.sortKey });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function renderTree(node, depth = 0) {
  let html = '<ul class="exc-tree-ul">';
  const folderEntries = [...node.folders.entries()].sort((a, b) => {
    const [, A] = a, [, B] = b;
    if (A.sortKey !== B.sortKey) return A.sortKey - B.sortKey;
    return A.label.localeCompare(B.label, undefined, { numeric: true, sensitivity: 'base' });
  });
  for (const [, child] of folderEntries) {
    html += `<li class="exc-tree-folder"><details${depth === 0 ? ' open' : ''}><summary>${escapeHtml(child.label)}</summary>${renderTree(child, depth + 1)}</details></li>`;
  }
  const files = node.files.slice().sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
  });
  for (const f of files) {
    html += `<li class="exc-tree-file"><a href="${escapeHtml(f.url)}">${escapeHtml(f.label)}</a></li>`;
  }
  html += '</ul>';
  return html;
}
const STATIC_TREE_HTML = `<nav class="exc-static-tree">${renderTree(treeRoot)}</nav>`;
const STATIC_TREE_CSS = `
.excalidraw-sidebar {
  background: var(--island-bg-color, #ffffff);
  color: var(--text-primary-color, #1b1b1f);
  font-family: "Assistant", "Segoe UI", system-ui, -apple-system, sans-serif;
  border-right: 1px solid var(--default-border-color, rgba(0,0,0,0.08));
}
html[saved-theme="dark"] .excalidraw-sidebar {
  background: #232329;
  color: #e3e3e8;
  border-right-color: rgba(255,255,255,0.08);
}
.excalidraw-sidebar .exc-static-tree {
  padding: 14px 10px 24px;
  font-size: 13px;
  line-height: 1.5;
  overflow-y: auto;
  max-height: 100vh;
  letter-spacing: 0.005em;
}
.excalidraw-sidebar .exc-static-tree ul { list-style: none; padding: 0; margin: 0; }
.excalidraw-sidebar .exc-static-tree .exc-tree-ul .exc-tree-ul {
  padding-left: 10px;
  margin-left: 8px;
  border-left: 1px solid var(--default-border-color, rgba(0,0,0,0.08));
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-ul .exc-tree-ul {
  border-left-color: rgba(255,255,255,0.08);
}
.excalidraw-sidebar .exc-static-tree details > summary {
  cursor: pointer;
  padding: 5px 8px 5px 6px;
  border-radius: 6px;
  font-weight: 600;
  color: var(--text-primary-color, #1b1b1f);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 80ms ease;
}
.excalidraw-sidebar .exc-static-tree details > summary::-webkit-details-marker,
.excalidraw-sidebar .exc-static-tree details > summary::marker { display: none; }
.excalidraw-sidebar .exc-static-tree details > summary::before {
  content: "";
  width: 0; height: 0;
  border-left: 5px solid currentColor;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  opacity: 0.55;
  transition: transform 120ms ease;
  flex-shrink: 0;
}
.excalidraw-sidebar .exc-static-tree details[open] > summary::before {
  transform: rotate(90deg);
}
.excalidraw-sidebar .exc-static-tree details > summary:hover {
  background: var(--button-hover-bg, rgba(0,0,0,0.06));
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree details > summary { color: #e3e3e8; }
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree details > summary:hover { background: rgba(255,255,255,0.06); }
.excalidraw-sidebar .exc-static-tree .exc-tree-file a {
  display: block;
  padding: 4px 8px 4px 22px;
  color: var(--text-primary-color, #1b1b1f);
  text-decoration: none;
  border-radius: 6px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 80ms ease, color 80ms ease;
}
.excalidraw-sidebar .exc-static-tree .exc-tree-file a::before {
  content: "·";
  display: inline-block;
  width: 0;
  margin-left: -10px;
  margin-right: 4px;
  color: var(--color-gray-50, #888);
  opacity: 0.7;
}
.excalidraw-sidebar .exc-static-tree .exc-tree-file a:hover {
  background: var(--button-hover-bg, rgba(25,113,194,0.10));
  color: var(--color-primary, #1971c2);
}
.excalidraw-sidebar .exc-static-tree .exc-tree-file a.active {
  background: var(--color-primary-light, #d3e4fd);
  color: var(--color-primary-darker, #0d62ad);
  font-weight: 600;
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a { color: #d4d4d8; }
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a:hover {
  background: rgba(116,192,252,0.12);
  color: #74c0fc;
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a.active {
  background: rgba(116,192,252,0.22);
  color: #a5d8ff;
}
.excalidraw-sidebar .exc-static-tree::-webkit-scrollbar { width: 6px; }
.excalidraw-sidebar .exc-static-tree::-webkit-scrollbar-thumb {
  background: var(--color-gray-30, rgba(0,0,0,0.18));
  border-radius: 3px;
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.14);
}
`;

const EXTRAS_SRC = path.resolve('scripts/excalidraw-extras.client.js');
const EXTRAS_DST = path.resolve('public/static/exc-extras.js');
await fs.mkdir(path.dirname(EXTRAS_DST), { recursive: true });
try { await fs.copyFile(EXTRAS_SRC, EXTRAS_DST); console.log('copied extras -> public/static/exc-extras.js'); }
catch (err) { console.warn('extras copy failed', err.message); }

// Quartz now emits these as plain .html (no .excalidraw.html suffix). Glob all .html and filter by marker string.
const htmlCandidates = await glob(`${PUBLIC}/**/*.html`);
const htmlFiles = [];
for (const fp of htmlCandidates) {
  try {
    const buf = await fs.readFile(fp, 'utf8');
    if (buf.includes('data-frame="excalidraw"') || buf.includes('class="excalidraw-container"') || buf.includes("excalidraw-container")) {
      htmlFiles.push(fp);
    }
  } catch {}
}
console.log(`\nrewriting ${htmlFiles.length} html pages`);

for (const file of htmlFiles) {
  const rel = path.relative(PUBLIC, file);
  const slug = rel.replace(/\.excalidraw\.html$/, '').replace(/\.html$/, '').replace(/ /g, '-').replace(/[\/\\]/g, '__').toLowerCase();

  const sceneFile = path.join(SCENES_DIR, `${slug}.json`);
  try { await fs.access(sceneFile); } catch {
    console.log(`skip (no scene): ${rel}`);
    continue;
  }

  const html = await fs.readFile(file, 'utf8');
  const $ = load(html, { xmlMode: false });
  $('script[src*="exc-toolbar.js"]').remove();
  $('script[src*="exc-extras.js"]').remove();
  $('script[type="module"]').remove();
  $('link[href*="@excalidraw/excalidraw"]').remove();
  $('style').filter((_, el) => {
    const html = $(el).html() || '';
    return html.includes('excalidraw-page') || html.includes('exc-static-tree');
  }).remove();
  // strip any previously-injected static tree so re-runs don't duplicate
  $('.exc-static-tree').remove();
  const container = $('.excalidraw-container').first();
  if (!container.length) {
    console.log(`skip (no container): ${rel}`);
    continue;
  }

  const rootId = `exc-root-${Math.random().toString(36).slice(2, 9)}`;
  container.empty();
  container.append(`<div id="${rootId}" class="exc-viewer-root" style="width:100%;height:100%;"></div>`);

  // Replace Quartz's broken explorer in sidebar with our static <details>-tree.
  const sidebar = $('.excalidraw-sidebar').first();
  if (sidebar.length) {
    sidebar.find('.explorer, .search, .darkmode, .readermode, .graph').remove();
    // Highlight current page in tree.
    const treeForPage = STATIC_TREE_HTML.replace(
      new RegExp(`href="${rel.replace(/\\/g, '/').replace(/\.html$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
      (m) => m + ' class="active"'
    );
    sidebar.append(treeForPage);
  }

  const depth = rel.split(path.sep).length - 1;
  const extrasSrc = (depth > 0 ? '../'.repeat(depth) : './') + 'static/exc-extras.js';

  $('head').append(`
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="preconnect" href="https://esm.sh" crossorigin />
<link rel="preload" as="style" href="https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.18.0/dist/prod/index.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.18.0/dist/prod/index.css" />
<style>${STATIC_TREE_CSS}</style>
<style>
html, body { height: 100%; margin: 0; }
.page[data-frame="excalidraw"], .page[data-frame="excalidraw"] > #quartz-body { height: 100vh !important; min-height: 100vh !important; }
.excalidraw-page { height: 100vh !important; min-height: 100vh !important; max-height: 100vh !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
.excalidraw-container { display: block !important; height: 100% !important; width: 100% !important; min-height: 100% !important; padding: 0 !important; background: transparent !important; }
.exc-viewer-root { width: 100% !important; height: 100% !important; display: block; }
.exc-viewer-root .excalidraw, .exc-viewer-root .excalidraw .excalidraw-wrapper { height: 100% !important; width: 100% !important; }
.excalidraw__canvas { display: block; }
/* Permanently kill web-embed iframes inside canvas — YouTube/Notion/etc all set X-Frame-Options=sameorigin
   and render as broken "refused to connect" panels. We keep the embeddable element shape but suppress iframe rendering. */
.exc-viewer-root iframe { display: none !important; }
.exc-viewer-root .excalidraw__embeddable-container { background: transparent !important; }
.exc-viewer-root .excalidraw__embeddable-container::after {
  content: "external embed (click element to open URL)"; display: block; padding: 8px 12px;
  font-family: "Assistant", system-ui, sans-serif; font-size: 12px; color: var(--exc-text-muted, #888);
  background: rgba(167,139,250,0.08); border: 1px dashed rgba(167,139,250,0.4); border-radius: 6px;
  pointer-events: none;
}
/* drop Quartz plugin floating zoom controls (we use native footer) */
.excalidraw-controls, .excalidraw-zoom-in, .excalidraw-zoom-out, .excalidraw-reset { display: none !important; }
/* sidebar toggle on top — boost z so native UI never covers it */
.page[data-frame="excalidraw"] .excalidraw-sidebar-toggle { z-index: 9999 !important; top: 12px; left: 12px; pointer-events: auto !important; }
.page[data-frame="excalidraw"].excalidraw-sidebar-open .excalidraw-sidebar-toggle { left: calc(var(--excalidraw-sidebar-width) + 12px); }
.page[data-frame="excalidraw"].excalidraw-sidebar-open .excalidraw-frame { padding-left: 0 !important; }
.page[data-frame="excalidraw"] .excalidraw-sidebar { box-shadow: 4px 0 24px rgba(0,0,0,0.2) !important; z-index: 2000 !important; pointer-events: auto !important; isolation: isolate; }
.page[data-frame="excalidraw"] .excalidraw-sidebar * { pointer-events: auto !important; }
/* Native Excalidraw canvas must not capture pointer events over the sidebar area */
.page[data-frame="excalidraw"].excalidraw-sidebar-open .excalidraw-stage { left: var(--excalidraw-sidebar-width, 260px); }
.page[data-frame="excalidraw"] .excalidraw-sidebar .darkmode { display: none !important; }
/* force-show explorer file tree inside sidebar */
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer,
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .explorer-content,
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .explorer-ul,
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .folder-outer {
  display: block !important; visibility: visible !important; opacity: 1 !important;
  max-height: none !important; height: auto !important; overflow: visible !important; transform: none !important;
}
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .explorer-content { height: 100% !important; overflow-y: auto !important; }
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .folder-outer:not(.open) > ul { display: none !important; }
.page[data-frame="excalidraw"] .excalidraw-sidebar .explorer .folder-outer.open > ul { display: block !important; }
/* nudge native top-left selected-shape popover 12px down+right */
.excalidraw .selected-shape-actions-container, .excalidraw .App-menu__left { margin: 12px 0 0 12px !important; }
/* hide library + welcome + more-tools dropdown */
.default-sidebar-trigger, button[aria-label="Library"], .library-button, button[data-testid="toolbar-library"] { display: none !important; }
.layer-ui__wrapper__top-right .Island { display: none !important; }
.App-toolbar__extra-tools-trigger { display: none !important; }
/* hide native hamburger contents but keep grid column so center stays centered */
.App-menu_top__left .main-menu-trigger,
.App-menu_top__left .selected-shape-actions-container { display: none !important; }
/* hide native footer-right help icon */
.layer-ui__wrapper__footer-right { display: none !important; }
/* footer: horizontal layout, equal sized buttons, bottom + slight right */
.layer-ui__wrapper__footer { padding: 0 !important; margin: 0 !important; }
.excalidraw .App-menu_bottom { bottom: 2rem !important; left: 2rem !important; right: auto !important; padding: 0 !important; }
.layer-ui__wrapper__footer-left {
  bottom: 0 !important; left: 0 !important;
  display: flex !important; flex-direction: row !important; gap: 8px !important;
}
.layer-ui__wrapper__footer-left .Stack_vertical { gap: 0 !important; flex-direction: row !important; display: flex !important; }
.layer-ui__wrapper__footer-left section, .layer-ui__wrapper__footer-left .canvas-actions { display: flex !important; flex-direction: row !important; gap: 8px !important; align-items: center !important; }
.layer-ui__wrapper__footer-left .zoom-actions { flex-direction: row !important; }
.layer-ui__wrapper__footer-left .undo-redo-buttons { flex-direction: row !important; display: flex !important; gap: 0 !important; align-items: center !important; margin: 0 !important; }
.layer-ui__wrapper__footer-left .zoom-actions, .layer-ui__wrapper__footer-left .undo-redo-buttons {
  background: var(--island-bg-color,#ffffff); border-radius: 10px; padding: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);
}
html[saved-theme="dark"] .layer-ui__wrapper__footer-left .zoom-actions,
html[saved-theme="dark"] .layer-ui__wrapper__footer-left .undo-redo-buttons {
  background: #232329; border-color: rgba(255,255,255,0.08); box-shadow: 0 1px 4px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
}
.layer-ui__wrapper__footer-left .zoom-button, .layer-ui__wrapper__footer-left [data-testid^="button-"] {
  width: 2rem !important; height: 2rem !important; min-width: 2rem !important; min-height: 2rem !important;
  background: transparent !important; border: 0 !important;
}
.layer-ui__wrapper__footer-left .reset-zoom-button { min-width: 3rem !important; }
/* hide trailing native divider before hidden more-tools trigger */
.App-toolbar__divider:has(+ .App-toolbar__extra-tools-trigger),
.App-toolbar__divider + .App-toolbar__extra-tools-trigger ~ * { display: none !important; }
.App-toolbar .App-toolbar__divider:last-of-type { display: none !important; }
/* our extras buttons match native look */
.App-toolbar .exc-extra-btn { cursor: pointer; }
.App-toolbar .exc-extra-btn[data-active="1"] { background: var(--color-primary-light,#bcd5ff) !important; color: var(--color-primary,#1971c2) !important; }
html[saved-theme="dark"] .App-toolbar .exc-extra-btn[data-active="1"] { background: rgba(116,192,252,0.18) !important; color: #74c0fc !important; }
/* minimap floating panel bottom-right */
.excali-minimap {
  position: absolute !important; bottom: 16px !important; right: 16px !important; z-index: 100 !important;
  width: 220px; display: none; flex-direction: column;
  background: var(--island-bg-color,#ffffff); border-radius: 10px; border: 1px solid rgba(0,0,0,0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12); overflow: hidden; pointer-events: auto !important;
  font-family: var(--ui-font, system-ui, sans-serif); font-size: 12px; user-select: none;
}
html[saved-theme="dark"] .excali-minimap { background: #232329; border-color: rgba(255,255,255,0.1); }
.excali-minimap .mm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.08);
  color: var(--text-primary-color,#1b1b1f);
}
html[saved-theme="dark"] .excali-minimap .mm-header { border-color: rgba(255,255,255,0.08); color: #e3e3e8; }
.excali-minimap .mm-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.excali-minimap .mm-actions { display: inline-flex; gap: 4px; }
.excali-minimap .mm-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 4px; cursor: pointer;
  color: var(--icon-fill-color,#1b1b1f); font-size: 14px; line-height: 1;
}
.excali-minimap .mm-btn:hover { background: rgba(0,0,0,0.06); }
html[saved-theme="dark"] .excali-minimap .mm-btn { color: #e3e3e8; }
html[saved-theme="dark"] .excali-minimap .mm-btn:hover { background: rgba(255,255,255,0.08); }
.excali-minimap .mm-canvas-wrap { padding: 6px; }
.excali-minimap canvas { display: block; width: 200px; height: 140px; cursor: crosshair; border-radius: 4px; background: var(--default-bg-color,#fafafa); }
html[saved-theme="dark"] .excali-minimap canvas { background: #1b1b1f; }
.excali-minimap .mm-footer {
  display: flex; justify-content: space-between; padding: 4px 8px;
  border-top: 1px solid rgba(0,0,0,0.08); color: var(--color-gray-50,#646464); font-size: 11px;
}
html[saved-theme="dark"] .excali-minimap .mm-footer { border-color: rgba(255,255,255,0.08); color: #888; }
.exc-zoombox-overlay { position: absolute; inset: 0; z-index: 4; cursor: crosshair; background: transparent; display: none; }
</style>
`);

  $('body').append(`
<script type="module">
import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { Excalidraw } from 'https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@18.2.0,react-dom@18.2.0&bundle-deps';

const SCENE_SLUG = ${JSON.stringify(slug)};

function getBasepath() {
  const bp = document.body?.dataset?.basepath ?? '';
  if (!bp) return '';
  return bp.startsWith('/') ? bp : '/' + bp;
}

function getTheme() {
  const root = document.documentElement;
  const saved = root.getAttribute('saved-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  const ds = root.dataset.theme;
  if (ds === 'dark' || ds === 'light') return ds;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

async function mount() {
  const el = document.getElementById(${JSON.stringify(rootId)});
  if (!el) return;
  const sceneUrl = getBasepath() + '/_scenes/' + SCENE_SLUG + '.json';
  let scene;
  try {
    const res = await fetch(sceneUrl);
    if (!res.ok) throw new Error('http ' + res.status);
    scene = await res.json();
  } catch (err) {
    console.error('excalidraw scene load failed', sceneUrl, err);
    el.textContent = 'Failed to load drawing';
    return;
  }

  const bp = getBasepath();
  // Defer image loading — keep files out of initialFiles, stream via api.addFiles() post-mount.
  const deferredFiles = [];
  const sceneFiles = scene.files || {};
  if (sceneFiles) {
    for (const [id, f] of Object.entries(sceneFiles)) {
      if (!f || typeof f.dataURL !== 'string') continue;
      if (f.dataURL.startsWith('data:') || f.dataURL.startsWith('blob:')) continue;
      const url = f.dataURL.startsWith('/') ? (bp + f.dataURL) : f.dataURL;
      deferredFiles.push({ id, mimeType: f.mimeType || '', url });
      delete sceneFiles[id]; // remove from initialFiles so Excalidraw doesn't show broken-image placeholder
    }
  }
  async function loadDeferredImages(api) {
    if (!deferredFiles.length || !api || !api.addFiles) return;
    const CONCURRENCY = 8;
    let cursor = 0;
    const worker = async () => {
      while (cursor < deferredFiles.length) {
        const idx = cursor++;
        const { id, url, mimeType } = deferredFiles[idx];
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('http ' + res.status);
          const blob = await res.blob();
          const dataURL = URL.createObjectURL(blob);
          api.addFiles([{ id, dataURL, mimeType: mimeType || blob.type, created: Date.now(), lastRetrieved: Date.now() }]);
        } catch (err) {
          console.warn('image load failed', id, url, err);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  const LOCAL_KEY = 'exc-scene:' + SCENE_SLUG;
  let local = null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) local = JSON.parse(raw);
  } catch {}
  const initialElements = (local && Array.isArray(local.elements) && local.elements.length) ? local.elements : scene.elements;
  const initialFiles = { ...(scene.files || {}), ...((local && local.files) || {}) };

  let mounted = false;
  let apiRef = null;
  const onAPI = (api) => {
    apiRef = api;
    window.__excApi = api;
    if (!mounted) {
      setTimeout(() => {
        try {
          const els = api.getSceneElements ? api.getSceneElements() : initialElements;
          if (els && els.length) api.scrollToContent(els, { fitToContent: true, animate: false });
        } catch (e) { console.warn('scrollToContent failed', e); }
      }, 50);
      // Stream deferred images after first paint so LCP isn't blocked on N image fetches.
      requestIdleCallback ? requestIdleCallback(() => loadDeferredImages(api), { timeout: 1500 })
                          : setTimeout(() => loadDeferredImages(api), 50);
    }
  };

  let saveTimer = null;
  let lastVersion = -1;
  const onChange = (elements, _appState, files) => {
    let v = 0;
    for (const e of elements) v = (v + (e.version || 0) + (e.versionNonce || 0)) | 0;
    if (v === lastVersion) return;
    lastVersion = v;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const work = () => {
        try {
          const payload = JSON.stringify({ elements, files: filterUserFiles(files, scene.files) });
          // Skip silently if payload is huge (typical localStorage cap ≈ 5MB; reserve headroom).
          if (payload.length > 4_500_000) return;
          localStorage.setItem(LOCAL_KEY, payload);
        } catch (e) {
          if (!(e && e.name === 'QuotaExceededError')) console.warn('localStorage save failed', e);
        }
      };
      if (window.requestIdleCallback) requestIdleCallback(work, { timeout: 2000 });
      else work();
    }, 1000);
  };
  function filterUserFiles(files, origFiles) {
    if (!files) return {};
    const out = {};
    for (const [k, v] of Object.entries(files)) {
      if (origFiles && origFiles[k]) continue;
      out[k] = v;
    }
    return out;
  }

  const render = (theme) =>
    React.createElement(Excalidraw, {
      excalidrawAPI: onAPI,
      onChange,
      initialData: {
        elements: initialElements,
        appState: { ...scene.appState, viewBackgroundColor: scene.appState.viewBackgroundColor, openSidebar: null, openMenu: null },
        files: initialFiles,
        scrollToContent: !mounted,
      },
      viewModeEnabled: false,
      zenModeEnabled: false,
      gridModeEnabled: false,
      detectScroll: false,
      handleKeyboardGlobally: false,
      autoFocus: false,
      theme,
      UIOptions: {
        welcomeScreen: false,
        canvasActions: {
          loadScene: false,
          saveAsImage: true,
          export: { saveFileToDisk: true },
          toggleTheme: true,
          clearCanvas: false,
          changeViewBackgroundColor: false,
        },
      },
    });

  let currentTheme = getTheme();
  const root = createRoot(el);
  root.render(render(currentTheme));
  mounted = true;
  // Reveal iframes after Excalidraw canvas paints; small delay covers scrollToContent + first render.
  setTimeout(() => { try { el.classList.add('exc-ready'); } catch {} }, 250);

  const observer = new MutationObserver(() => {
    const t = getTheme();
    if (t === currentTheme) return;
    currentTheme = t;
    if (apiRef && apiRef.updateScene) {
      try { apiRef.updateScene({ appState: { theme: t } }); return; } catch {}
    }
    root.render(render(t));
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['saved-theme', 'data-theme'] });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
</script>
<script defer src="${extrasSrc}"></script>
`);

  await fs.writeFile(file, $.html());
  console.log(`viewer: ${rel}`);
}

console.log('\ndone');
