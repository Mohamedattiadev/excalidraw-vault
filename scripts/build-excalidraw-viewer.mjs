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

// ===== Custom 404 page (overrides Quartz's bland default) =====
const CUSTOM_404 = `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<title>404 — drawing wandered off · MY STUDYING EXCALI</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex" />
<link rel="icon" href="${SITE_BASEPATH}/static/icon.png" />
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100vh; font-family: "Assistant", "Segoe UI", system-ui, -apple-system, sans-serif; }
body { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#faf8ff 0%, #ede4ff 100%); color: #2a1f47; }
@media (prefers-color-scheme: dark) { body { background: linear-gradient(135deg,#1a1625 0%, #2a1f47 100%); color: #ece6f8; } }
.card { width: min(560px, 92vw); padding: 36px 32px; border-radius: 16px;
  background: rgba(255,255,255,0.7); border: 1px solid rgba(123,92,214,0.18);
  box-shadow: 0 12px 48px rgba(40,25,70,0.18); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  text-align: center; }
@media (prefers-color-scheme: dark) { .card { background: rgba(35,35,41,0.7); border-color: rgba(167,139,250,0.22); } }
.huge { font-size: 96px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; margin: 0; background: linear-gradient(135deg,#7b5cd6,#a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub  { font-size: 18px; font-weight: 600; margin: 12px 0 6px; color: #5e3fbd; }
@media (prefers-color-scheme: dark) { .sub { color: #c4b5fd; } }
.body { font-size: 14px; opacity: 0.85; margin: 8px 0 22px; line-height: 1.55; }
.btn  { display: inline-block; padding: 10px 18px; border-radius: 10px;
  background: #7b5cd6; color: #ffffff !important; text-decoration: none; font-weight: 600;
  transition: background 120ms ease, transform 120ms ease; }
.btn:hover { background: #5e3fbd; transform: translateY(-1px); }
.links { margin-top: 18px; font-size: 12px; opacity: 0.7; }
.links a { color: #7b5cd6; text-decoration: none; }
.links a:hover { text-decoration: underline; }
.scrib { width: 64px; height: 64px; margin: 0 auto 8px; opacity: 0.85; }
</style></head><body>
<main class="card">
  <svg class="scrib" viewBox="0 0 64 64" fill="none" stroke="#7b5cd6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 48 Q16 20 32 32 T56 16" />
    <circle cx="56" cy="16" r="3" fill="#7b5cd6" />
  </svg>
  <p class="huge">404</p>
  <p class="sub">that drawing wandered off the canvas</p>
  <p class="body">The page you tried to open doesn't exist (anymore). Maybe it was renamed in the canonical vault, or the URL was mistyped.</p>
  <a class="btn" href="${SITE_BASEPATH || '/'}">← Back to home</a>
  <div class="links">
    <a href="https://github.com/Mohamedattiadev/my-study-summaries" target="_blank" rel="noopener">canonical vault</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/Mohamedattiadev/excalidraw-vault" target="_blank" rel="noopener">site repo</a>
  </div>
</main></body></html>`;
async function write404() {
  try {
    await fs.writeFile(path.resolve('public/404.html'), CUSTOM_404);
    console.log('wrote custom public/404.html');
  } catch (err) { console.warn('404 write failed', err.message); }
}
// run at end of script, after Quartz's emission
process.on('beforeExit', () => { write404().catch(() => {}); });
write404();

// Build a static collapsible tree (no JS needed — uses <details>) from the scene list.
// Replaces Quartz's broken explorer inside .excalidraw-sidebar.
// Auto-detect subject folders: any top-level dir whose name starts with a numeric prefix.
// Asset / template folders look the same but must be excluded.
const SUBJECT_DIR_RE = /^\d{1,2}[-._ ]/;
const NON_SUBJECT_NAMES = new Set(['90-Assets', '99-Assets', '999-Templates']);
const subjectDirs = (await fs.readdir(CONTENT, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && SUBJECT_DIR_RE.test(e.name) && !NON_SUBJECT_NAMES.has(e.name))
  .map((e) => e.name);
const ALLOWED_TOP_LEVEL = new Set(subjectDirs);
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
  background: rgba(123,92,214,0.10);
  color: #7b5cd6;
}
.excalidraw-sidebar .exc-static-tree .exc-tree-file a.active {
  background: #ede4ff;
  color: #5e3fbd;
  font-weight: 600;
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a { color: #d4d4d8; }
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a:hover {
  background: rgba(167,139,250,0.14);
  color: #a78bfa;
}
html[saved-theme="dark"] .excalidraw-sidebar .exc-static-tree .exc-tree-file a.active {
  background: rgba(167,139,250,0.22);
  color: #c4b5fd;
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

// Service Worker (precache static assets, fast repeat-visit loads)
try {
  await fs.copyFile(path.resolve('scripts/sw.js'), path.resolve('public/sw.js'));
  console.log('copied sw -> public/sw.js');
} catch (err) { console.warn('sw copy failed', err.message); }

// === Inject author block into every page's left sidebar (above search) ===
const AUTHOR_BLOCK_HTML = `
<div class="exc-author-block">
  <div class="exc-author-name">Mohamed Attia</div>
  <div class="exc-author-sub">CS undergrad · visual study notes</div>
  <div class="exc-author-links">
    <a href="https://github.com/Mohamedattiadev" target="_blank" rel="noopener" aria-label="GitHub">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.66.5 12c0 5.07 3.29 9.37 7.86 10.89.58.11.79-.25.79-.55 0-.27-.01-.99-.02-1.94-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.26 1.89-.39 2.87-.39.97 0 1.96.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.8 1.17 1.82 1.17 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.07.78 2.15 0 1.56-.01 2.81-.01 3.19 0 .3.2.67.79.55C20.21 21.37 23.5 17.07 23.5 12 23.5 5.66 18.35.5 12 .5z"/></svg>
      Mohamedattiadev
    </a>
  </div>
</div>`;

const SITE_URL = `https:${SITE_BASEPATH ? '//mohamedattiadev.github.io' + SITE_BASEPATH : '//mohamedattiadev.github.io'}`;
const OG_IMAGE = `${SITE_URL}/static/icon.png`;
const SW_REGISTER = `<script>if('serviceWorker'in navigator){addEventListener('load',()=>{navigator.serviceWorker.register('${SITE_BASEPATH}/sw.js').catch(e=>console.warn('SW reg fail',e))})}</script>`;

const allHtml = await glob(`${PUBLIC}/**/*.html`);
console.log(`injecting author block + meta + SW into ${allHtml.length} html pages`);
for (const fp of allHtml) {
  try {
    const html = await fs.readFile(fp, 'utf8');
    const $$ = load(html, { xmlMode: false });

    // Inject author block (once)
    if (!html.includes('exc-author-block')) {
      const pt = $$('.page-title').first();
      if (pt.length) pt.after(AUTHOR_BLOCK_HTML);
    }

    // OG / Twitter meta (once)
    if (!$$('meta[property="og:title"]').length) {
      const title = $$('title').first().text() || 'MY STUDYING EXCALI';
      const desc = ($$('meta[name="description"]').attr('content') || 'Personal CS study vault — Excalidraw drawings, design patterns, OS, DB, networking notes').slice(0, 200);
      const ogTags = [
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="MY STUDYING EXCALI" />`,
        `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`,
        `<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />`,
        `<meta property="og:image" content="${OG_IMAGE}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`,
        `<meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`,
        `<meta name="twitter:image" content="${OG_IMAGE}" />`,
      ].join('\\n');
      $$('head').append(ogTags);
    }

    // Service Worker register (once)
    if (!html.includes('navigator.serviceWorker.register')) {
      $$('body').append(SW_REGISTER);
    }

    await fs.writeFile(fp, $$.html());
  } catch {}
}

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
  container.append(`<div id="${rootId}" class="exc-viewer-root" style="width:100%;height:100%;">
    <div class="exc-loading-overlay" aria-label="Loading drawing…">
      <div class="exc-spinner"></div>
      <div class="exc-loading-pct">0%</div>
      <div class="exc-loading-label">Loading drawing…</div>
    </div>
  </div>`);

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

  const vendorBase = (depth > 0 ? '../'.repeat(depth) : './') + 'vendor';
  $('head').append(`
<link rel="preload" as="style" href="${vendorBase}/excalidraw.css" />
<link rel="stylesheet" href="${vendorBase}/excalidraw.css" />
<link rel="modulepreload" href="${vendorBase}/excalidraw.bundle.js" />
<style>${STATIC_TREE_CSS}</style>
<style>
html, body { height: 100%; margin: 0; }
.page[data-frame="excalidraw"], .page[data-frame="excalidraw"] > #quartz-body { height: 100vh !important; min-height: 100vh !important; }
.excalidraw-page { height: 100vh !important; min-height: 100vh !important; max-height: 100vh !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
.excalidraw-container { display: block !important; height: 100% !important; width: 100% !important; min-height: 100% !important; padding: 0 !important; background: transparent !important; }
.exc-viewer-root { width: 100% !important; height: 100% !important; display: block; }
.exc-viewer-root .excalidraw, .exc-viewer-root .excalidraw .excalidraw-wrapper { height: 100% !important; width: 100% !important; }
.exc-viewer-root .excalidraw-wrapper { will-change: transform; contain: layout paint; }
.excalidraw__canvas { display: block; image-rendering: auto; }
.excalidraw__canvas.interactive { will-change: transform; }
/* PDF export + Reset buttons — top-right edge. Hidden until canvas paints. */
.page[data-frame="excalidraw"] .exc-pdf-export,
.page[data-frame="excalidraw"] .exc-reset-btn {
  position: absolute; z-index: 9999;
  opacity: 0; pointer-events: none;
  transition: opacity 200ms ease;
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--island-bg-color, #ffffff); color: var(--text-primary-color, #2a1f47);
  border: 1px solid rgba(123,92,214,0.18);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.08); transition: background 100ms ease;
}
.page[data-frame="excalidraw"] .exc-pdf-export { top: 12px; right: 12px; }
.page[data-frame="excalidraw"] .exc-reset-btn  { top: 12px; right: 54px; }
.exc-viewer-root.exc-ready ~ .exc-pdf-export,
.exc-viewer-root.exc-ready ~ .exc-reset-btn,
.page[data-frame="excalidraw"]:has(.exc-viewer-root.exc-ready) .exc-pdf-export,
.page[data-frame="excalidraw"]:has(.exc-viewer-root.exc-ready) .exc-reset-btn {
  opacity: 1; pointer-events: auto;
}
html[saved-theme="dark"] .page[data-frame="excalidraw"] .exc-pdf-export,
html[saved-theme="dark"] .page[data-frame="excalidraw"] .exc-reset-btn {
  background: #232329; color: #e3e3e8; border-color: rgba(167,139,250,0.22);
}
.page[data-frame="excalidraw"] .exc-pdf-export:hover,
.page[data-frame="excalidraw"] .exc-reset-btn:hover { background: rgba(167,139,250,0.12); color: #7b5cd6; }
.page[data-frame="excalidraw"] .exc-pdf-export.exc-pdf-loading svg { animation: exc-spin 0.85s linear infinite; }
.page[data-frame="excalidraw"] .exc-pdf-export[disabled] { opacity: 0.55; cursor: progress; }

/* Reset confirmation modal — Excalidraw-styled */
.exc-reset-modal {
  position: fixed; inset: 0; z-index: 20000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(40, 25, 70, 0.45);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  animation: exc-fade 160ms ease;
  font-family: "Assistant", system-ui, sans-serif;
}
@keyframes exc-fade { from { opacity: 0; } to { opacity: 1; } }
.exc-reset-card {
  width: min(420px, 92vw);
  background: var(--island-bg-color, #ffffff);
  color: var(--text-primary-color, #2a1f47);
  border-radius: 12px;
  border: 1px solid rgba(123,92,214,0.2);
  box-shadow: 0 10px 40px rgba(40,25,70,0.25);
  padding: 20px 22px 16px;
}
html[saved-theme="dark"] .exc-reset-card { background: #232329; color: #e3e3e8; border-color: rgba(167,139,250,0.28); }
.exc-reset-title { font-size: 17px; font-weight: 700; color: #7b5cd6; margin-bottom: 8px; }
html[saved-theme="dark"] .exc-reset-title { color: #a78bfa; }
.exc-reset-body { font-size: 13px; line-height: 1.5; opacity: 0.88; }
.exc-reset-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.exc-reset-actions button {
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 8px 14px; border-radius: 8px; cursor: pointer;
  border: 1px solid rgba(123,92,214,0.22); transition: background 100ms ease;
}
.exc-reset-actions .exc-reset-no { background: transparent; color: inherit; }
.exc-reset-actions .exc-reset-no:hover { background: rgba(123,92,214,0.08); }
.exc-reset-actions .exc-reset-yes { background: #7b5cd6; color: #ffffff; border-color: #7b5cd6; }
.exc-reset-actions .exc-reset-yes:hover { background: #5e3fbd; border-color: #5e3fbd; }
html[saved-theme="dark"] .exc-reset-actions .exc-reset-yes { background: #a78bfa; border-color: #a78bfa; color: #1a1625; }
html[saved-theme="dark"] .exc-reset-actions .exc-reset-yes:hover { background: #c4b5fd; border-color: #c4b5fd; }

/* Loading overlay — covers viewer until canvas paints + images decoded.
   z-index above PDF button (9999) so nothing leaks through. Background opaque to hide YT link bar. */
.exc-loading-overlay {
  position: absolute; inset: 0; z-index: 10000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: #f5f3fa;
  font-family: "Assistant", system-ui, sans-serif; color: #5e3fbd;
  transition: opacity 240ms ease;
}
html[saved-theme="dark"] .exc-loading-overlay { background: #1f1830; color: #c4b5fd; }
.exc-loading-overlay.exc-hide { opacity: 0; pointer-events: none; }
.exc-spinner {
  width: 48px; height: 48px; border-radius: 50%;
  border: 4px solid rgba(167,139,250,0.18);
  border-top-color: #7b5cd6;
  animation: exc-spin 0.85s linear infinite;
}
html[saved-theme="dark"] .exc-spinner { border-color: rgba(167,139,250,0.22); border-top-color: #a78bfa; }
.exc-loading-label { font-size: 13px; font-weight: 500; letter-spacing: 0.02em; opacity: 0.75; }
.exc-loading-pct { font-size: 22px; font-weight: 800; letter-spacing: 0.02em; }
@keyframes exc-spin { to { transform: rotate(360deg); } }
.exc-viewer-root { position: relative; }

/* Kill ALL web-embed UI inside canvas — iframe, container, link popup. YouTube/Notion etc set
   X-Frame-Options=sameorigin so embeds render as a "refused to connect" stub. We suppress all of it. */
.exc-viewer-root iframe,
.exc-viewer-root .excalidraw__embeddable-container,
.exc-viewer-root .excalidraw-hyperlinkContainer,
.exc-viewer-root .excalidraw-hyperlinkContainer__input { display: none !important; }
/* Block the small purple link banner that hovers above the canvas */
.exc-viewer-root .excalidraw-link__url,
.exc-viewer-root .excalidraw-link-popup { display: none !important; }
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
  position: absolute !important; bottom: 14px !important; right: 14px !important; z-index: 100 !important;
  width: 170px; display: none; flex-direction: column;
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
.excali-minimap canvas { display: block; width: 150px; height: 100px; cursor: crosshair; border-radius: 4px; background: var(--default-bg-color,#fafafa); }
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
const VENDOR_BUNDLE = ${JSON.stringify(vendorBase + '/excalidraw.bundle.js')};
let React, createRoot, Excalidraw;
async function loadDeps() {
  // Race local + esm.sh in parallel; whichever resolves first wins.
  // Fall back to skypack sequentially if both fail.
  const local = (async () => {
    const m = await import(VENDOR_BUNDLE);
    return { React: m.React, createRoot: m.createRoot, Excalidraw: m.Excalidraw, exportToCanvas: m.exportToCanvas };
  })();
  const esmsh = (async () => {
    const r = await import('https://esm.sh/react@18.2.0');
    const rd = await import('https://esm.sh/react-dom@18.2.0/client');
    const e = await import('https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@18.2.0,react-dom@18.2.0&bundle-deps');
    return { React: r.default || r, createRoot: rd.createRoot, Excalidraw: e.Excalidraw };
  })();
  const skypack = async () => {
    const r = await import('https://cdn.skypack.dev/react@18.2.0');
    const rd = await import('https://cdn.skypack.dev/react-dom@18.2.0/client');
    const e = await import('https://cdn.skypack.dev/@excalidraw/excalidraw@0.18.0');
    return { React: r.default || r, createRoot: rd.createRoot, Excalidraw: e.Excalidraw };
  };
  // Race the two parallel sources; first success wins.
  const winners = [local.catch((e) => { console.warn('local bundle fail', e); throw e; }),
                   esmsh.catch((e) => { console.warn('esm.sh bundle fail', e); throw e; })];
  try { return await Promise.any(winners); } catch (aggregate) {
    console.warn('both parallel sources failed; trying skypack', aggregate);
    return await skypack();
  }
}

const SCENE_SLUG = ${JSON.stringify(slug)};
try { window.__excSlug = SCENE_SLUG; } catch {}

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

// ---------- IndexedDB snapshot cache (per-user, browser-local) ----------
const SNAP_DB = 'exc-snapshots';
const SNAP_STORE = 'snaps';
function snapOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(SNAP_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(SNAP_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function snapGet(slug) {
  try {
    const db = await snapOpen();
    return await new Promise((res, rej) => {
      const tx = db.transaction(SNAP_STORE, 'readonly');
      const req = tx.objectStore(SNAP_STORE).get(slug);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  } catch { return null; }
}
async function snapPut(slug, dataUrl) {
  try {
    const db = await snapOpen();
    await new Promise((res, rej) => {
      const tx = db.transaction(SNAP_STORE, 'readwrite');
      tx.objectStore(SNAP_STORE).put({ dataUrl, ts: Date.now() }, slug);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch {}
}

async function mount() {
  const el = document.getElementById(${JSON.stringify(rootId)});
  if (!el) return;
  const pctEl = el.querySelector('.exc-loading-pct');
  const labelEl = el.querySelector('.exc-loading-label');
  let displayedPct = 0;

  // Try painting cached snapshot instantly behind the spinner (zero-network feel on revisit).
  snapGet(SCENE_SLUG).then((snap) => {
    if (!snap || !snap.dataUrl) return;
    if (el.querySelector('.exc-snap-preview')) return;
    const img = document.createElement('img');
    img.className = 'exc-snap-preview';
    img.src = snap.dataUrl;
    img.alt = '';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;z-index:5;pointer-events:none;transition:opacity 280ms ease;';
    el.appendChild(img);
  });
  try {
    if (labelEl) labelEl.textContent = 'Loading Excalidraw bundle…';
    if (pctEl) pctEl.textContent = '2%';
    const deps = await loadDeps();
    React = deps.React; createRoot = deps.createRoot; Excalidraw = deps.Excalidraw;
    if (pctEl) pctEl.textContent = '5%';
    // Expose for PDF-export reuse so we don't re-fetch the bundle.
    try { window.__excVendor = deps; } catch {}
  } catch (err) {
    console.error('Excalidraw bundle failed to load', err);
    if (labelEl) labelEl.textContent = 'Bundle failed to load — refresh to retry';
    if (pctEl) pctEl.textContent = '!';
    return;
  }
  function setProgress(target, label) {
    if (label && labelEl) labelEl.textContent = label;
    // smooth-step the displayed value towards target
    const step = () => {
      if (!pctEl) return;
      if (displayedPct >= target) return;
      displayedPct = Math.min(target, displayedPct + Math.max(1, Math.floor((target - displayedPct) / 4)));
      pctEl.textContent = displayedPct + '%';
      if (displayedPct < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  setProgress(8, 'Fetching scene…');

  const sceneUrl = getBasepath() + '/_scenes/' + SCENE_SLUG + '.json';
  let scene;
  try {
    const res = await fetch(sceneUrl);
    if (!res.ok) throw new Error('http ' + res.status);
    scene = await res.json();
  } catch (err) {
    console.error('excalidraw scene load failed', sceneUrl, err);
    if (labelEl) labelEl.textContent = 'Failed to load drawing — refresh to retry';
    return;
  }
  setProgress(18, 'Decoding images…');

  const bp = getBasepath();
  // Inline images into scene.files before mount (Excalidraw needs dataURL in initialFiles to render).
  // Parallel fetch w/ blob URLs — fast + no base64 conversion.
  if (scene.files) {
    const entries = Object.entries(scene.files).filter(([, f]) =>
      f && typeof f.dataURL === 'string' && !f.dataURL.startsWith('data:') && !f.dataURL.startsWith('blob:'),
    );
    const CONCURRENCY = 12;
    let cursor = 0;
    let done = 0;
    const total = entries.length || 1;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < entries.length) {
        const idx = cursor++;
        const [, f] = entries[idx];
        const url = f.dataURL.startsWith('/') ? (bp + f.dataURL) : f.dataURL;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('http ' + res.status);
          const blob = await res.blob();
          f.dataURL = URL.createObjectURL(blob);
          if (!f.mimeType) f.mimeType = blob.type;
        } catch (err) {
          console.warn('image load failed', url, err);
        }
        done++;
        // 18% → 88% during image loads
        setProgress(18 + Math.floor((done / total) * 70));
      }
    }));
  }
  setProgress(92, 'Mounting canvas…');
  function loadDeferredImages() { /* no-op (kept for compat) */ }

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
    }
  };

  let saveTimer = null;
  let lastVersion = -1;
  let pendingElements = null, pendingFiles = null;
  function doSave() {
    if (!pendingElements) return;
    try {
      const payloadObj = { elements: pendingElements, files: filterUserFiles(pendingFiles, scene.files) };
      let payload = JSON.stringify(payloadObj);
      if (payload.length > 4_500_000) {
        // Drop user files to fit. Elements alone almost always fit.
        payload = JSON.stringify({ elements: pendingElements, files: {} });
      }
      if (payload.length > 4_500_000) return;
      localStorage.setItem(LOCAL_KEY, payload);
    } catch (e) {
      if (!(e && e.name === 'QuotaExceededError')) console.warn('localStorage save failed', e);
    }
  }
  const onChange = (elements, _appState, files) => {
    let v = 0;
    for (const e of elements) v = (v + (e.version || 0) + (e.versionNonce || 0)) | 0;
    if (v === lastVersion) return;
    lastVersion = v;
    pendingElements = elements; pendingFiles = files;
    if (saveTimer) clearTimeout(saveTimer);
    // Short debounce (was 1000ms — caused edits to disappear on quick reload).
    saveTimer = setTimeout(doSave, 300);
  };
  // Flush on leave/refresh so an unsaved edit isn't lost.
  window.addEventListener('beforeunload', doSave);
  window.addEventListener('pagehide', doSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') doSave(); });
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
  // exc-ready class now set inside tryHide() once canvas actually painted.
  // Hide loading overlay once first canvas paint + scroll-to-content settle.
  const hideOverlay = () => {
    const ov = el.querySelector('.exc-loading-overlay');
    if (!ov) return;
    ov.classList.add('exc-hide');
    setTimeout(() => ov.remove(), 320);
  };
  // Hide overlay only AFTER Excalidraw canvas actually appears in DOM.
  let overlayHidden = false;
  const tryHide = () => {
    if (overlayHidden) return;
    overlayHidden = true;
    try { el.classList.add('exc-ready'); } catch {}
    setProgress(100, 'Ready');
    setTimeout(hideOverlay, 180);
    // Fade out the cached snapshot once live canvas is up
    const snapImg = el.querySelector('.exc-snap-preview');
    if (snapImg) {
      snapImg.style.opacity = '0';
      setTimeout(() => snapImg.remove(), 320);
    }
    // Capture a fresh snapshot for next visit (after a short idle so paint finishes)
    setTimeout(() => {
      try {
        const c = el.querySelector('.excalidraw__canvas.interactive') || el.querySelector('.excalidraw__canvas');
        if (!c) return;
        // Downscale snapshot to ~1200px max to keep IndexedDB usage modest
        const max = 1200;
        const scale = Math.min(1, max / Math.max(c.width, c.height));
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.floor(c.width * scale));
        off.height = Math.max(1, Math.floor(c.height * scale));
        const ctx = off.getContext('2d');
        ctx.drawImage(c, 0, 0, off.width, off.height);
        const url = off.toDataURL('image/webp', 0.75) || off.toDataURL('image/jpeg', 0.85);
        if (url && url.length > 100) snapPut(SCENE_SLUG, url);
      } catch (e) { /* taint or oom — skip silently */ }
    }, 1200);
  };
  const canvasReady = () => el.querySelector('.excalidraw__canvas.interactive');
  const waitForCanvas = (deadline) => {
    if (canvasReady()) {
      // give it one more idle tick for image decode
      if (window.requestIdleCallback) requestIdleCallback(tryHide, { timeout: 1500 });
      else setTimeout(tryHide, 500);
      return;
    }
    if (performance.now() > deadline) { tryHide(); return; }
    requestAnimationFrame(() => waitForCanvas(deadline));
  };
  waitForCanvas(performance.now() + 8000); // 8s hard cap
  // Absolute fallback so user is never stuck behind spinner.
  setTimeout(tryHide, 12000);

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
