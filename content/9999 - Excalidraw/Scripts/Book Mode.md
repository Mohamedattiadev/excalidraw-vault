---
excalidraw-plugin: parsed
---

/*
Book Mode v3 — page-based layout with per-page paper patterns + multi-page PDF export.
Persistent floating control panel. Each page row has: name (click to zoom), paper-mode
dropdown, color picker, focus button, delete button. Patterns are real scene elements
scoped to each page (tagged for atomic cleanup) so they appear in editor AND in export.

```javascript
*/

// ---------- constants ----------
const PAGE_SIZES = [
  { id: "a4p", label: "A4 portrait",      w: 794,  h: 1123 },
  { id: "a4l", label: "A4 landscape",     w: 1123, h: 794  },
  { id: "ltp", label: "Letter portrait",  w: 816,  h: 1056 },
  { id: "ltl", label: "Letter landscape", w: 1056, h: 816  },
  { id: "cust", label: "Custom...",       w: null, h: null },
];
const PAPER_MODES = ["off", "dotted", "grid", "ruled", "dashed", "cross"];
const PAPER_LABELS = { off: "Off", dotted: "Dotted", grid: "Grid", ruled: "Ruled", dashed: "Dashed", cross: "Cross" };
const TAG_PAGE  = "bookPage";
const TAG_BG    = "bookPageBg";
const TAG_LABEL = "bookPageLabel";
const TAG_PATTERN = "bookPagePattern";
const PAGE_BG_STROKE = "#888";
const LABEL_FONT_SIZE = 18;
const LABEL_GAP = 12;
const EXISTING_CONTENT_PAD = 80;
const DEFAULT_PAPER_SPACING = 24;
const DEFAULT_PAPER_COLOR = "#cfcfcf";
const PATTERN_SCALE = 1;  // SVG patterns scale crisp natively; kept for cache-bust on regenerate
const PDF_QUALITY_ZOOM = 2; // PDF rasterizer zoom — higher = sharper but bigger file

const DEFAULTS = {
  sizeId: "a4p", custW: 800, custH: 1100,
  count: 5, gap: 40, orientation: "vertical",
  defaultPaper: "off", defaultColor: DEFAULT_PAPER_COLOR,
};
const KEY = "Book mode config";
const PANEL_ID = "book-mode-panel";
const STYLE_ID = "book-mode-style";

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
const Notice = ea.obsidian.Notice;
const hasFrameAPI = typeof ea.addFrame === "function";

// Top-level forward declarations — hoisted `let` would still be TDZ when
// `function` declarations reference them before their assignment line. Declared
// here so any hoisted helper that touches them sees an initialized binding.
var openPopover = null;
var dragSrcIdx = null;
var MINI_PREVIEW_CACHE = new Map();

// Lucide SVG icon strings — declared at top so re-runs of the script (toggle off/on)
// have them initialized BEFORE rebuildPageList runs from the early-return branch.
var ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
var ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
var ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
var ICON_X = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
var ICON_ZOOM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

// Remove stale About entry that earlier seeded an unwanted input field.
{
  const _s = ea.getScriptSettings() || {};
  if (_s["About"]) { delete _s["About"]; ea.setScriptSettings(_s); }
}
// ---------- state ----------
let state = window.__bookModeState;
if (!state) {
  const settings = ea.getScriptSettings() || {};
  if (!settings[KEY]) {
    settings[KEY] = { value: { ...DEFAULTS } };
    await ea.setScriptSettings(settings);
  }
  state = {
    settings,
    cfg: { ...DEFAULTS, ...settings[KEY].value },
    dirty: false,
    persistTimer: null,
  };
  window.__bookModeState = state;
}
const cfg = state.cfg;

function persistSoon() {
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(async () => {
    if (state.dirty) {
      state.settings[KEY].value = { ...cfg };
      await ea.setScriptSettings(state.settings);
      state.dirty = false;
    }
  }, 400);
}

// ---------- helpers ----------
function isBookPage(el)    { return el?.customData?.[TAG_PAGE]    === true; }
function isBookBg(el)      { return el?.customData?.[TAG_BG]      === true; }
function isBookLabel(el)   { return el?.customData?.[TAG_LABEL]   === true; }
function isBookPattern(el) { return el?.customData?.[TAG_PATTERN] === true; }
function isBookAny(el)     { return isBookPage(el) || isBookBg(el) || isBookLabel(el) || isBookPattern(el); }

function pageOrder(el) {
  // bookOrder overrides pageIndex (used after drag reorder); falls back to pageIndex
  return el?.customData?.bookOrder ?? el?.customData?.pageIndex ?? 0;
}
function getBookPages() {
  return ea.getViewElements().filter(isBookPage).sort((a, b) => pageOrder(a) - pageOrder(b));
}
function getAllBookElements() { return ea.getViewElements().filter(isBookAny); }
function getNonBookBoundingBox() {
  const els = ea.getViewElements().filter(el => !isBookAny(el));
  return els.length === 0 ? null : ea.getBoundingBox(els);
}
function getCurrentPageSize() {
  const s = PAGE_SIZES.find(p => p.id === cfg.sizeId) || PAGE_SIZES[0];
  return s.id === "cust" ? { w: cfg.custW, h: cfg.custH } : { w: s.w, h: s.h };
}

// ---------- pattern as single SVG image per page ----------
// SVG with explicit <line>/<circle> elements (NOT <pattern> fills — Excalidraw's
// image rasterizer ignores those). Vectors stay crisp at any zoom + the file's
// declared width/height stick after Excalidraw's EmbeddedFilesLoader resolves.
// PNG fallback was lossy: PATTERN_SCALE upscale caused el.width override to be
// undone by the loader → image overflowed the page on zoom-in.
const PATTERN_CACHE_DIR = "_cache/bookmode-cache";

function buildPatternSVG(w, h, mode, color) {
  if (mode === "off") return null;
  const s = DEFAULT_PAPER_SPACING;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`);
  parts.push(`<g stroke="${color}" fill="${color}" stroke-width="1">`);

  if (mode === "dotted") {
    for (let x = s; x < w; x += s)
      for (let y = s; y < h; y += s)
        parts.push(`<circle cx="${x}" cy="${y}" r="1.4" stroke="none"/>`);
  } else if (mode === "cross") {
    const arm = 3;
    for (let x = s; x < w; x += s)
      for (let y = s; y < h; y += s) {
        parts.push(`<line x1="${x - arm}" y1="${y}" x2="${x + arm}" y2="${y}"/>`);
        parts.push(`<line x1="${x}" y1="${y - arm}" x2="${x}" y2="${y + arm}"/>`);
      }
  } else if (mode === "ruled") {
    for (let y = s; y < h; y += s)
      parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  } else if (mode === "dashed") {
    for (let y = s; y < h; y += s)
      parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke-dasharray="4 4"/>`);
    for (let x = s; x < w; x += s)
      parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke-dasharray="4 4"/>`);
  } else { // grid
    for (let y = s; y < h; y += s)
      parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    for (let x = s; x < w; x += s)
      parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  }
  parts.push(`</g></svg>`);
  return new TextEncoder().encode(parts.join("")).buffer;
}

async function getOrCreatePatternFile(w, h, mode, color) {
  const safeColor = color.replace(/[^0-9a-zA-Z]/g, "");
  // .svg extension + v2 cache-bust (old PNG cache files become irrelevant).
  const filename = `bm_${mode}_${safeColor}_${w}x${h}_v2.svg`;
  const path = `${PATTERN_CACHE_DIR}/${filename}`;
  const app = ea.plugin.app;
  let file = app.vault.getAbstractFileByPath(path);
  if (file) return file;
  try { await app.vault.createFolder(PATTERN_CACHE_DIR); } catch (e) { /* exists */ }
  let buf;
  try { buf = buildPatternSVG(w, h, mode, color); }
  catch (e) { console.error("[BookMode] buildPatternSVG failed", e); return null; }
  if (!buf) { console.warn("[BookMode] buildPatternSVG returned null", mode); return null; }
  try {
    file = await app.vault.createBinary(path, buf);
    return file;
  } catch (e) {
    console.warn("[BookMode] createBinary failed, refetching", e);
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing) return existing;
    console.error("[BookMode] could not create or find pattern file at", path);
    return null;
  }
}

async function pushPatternImage(pageX, pageY, pageW, pageH, idx, mode, color) {
  if (mode === "off") return null;
  const file = await getOrCreatePatternFile(pageW, pageH, mode, color);
  if (!file) { console.warn("[BookMode] no pattern file"); return null; }
  // SVG natural dimensions == pageW × pageH (declared in <svg width/height>) so
  // EmbeddedFilesLoader's auto-sizing matches our intent. Still set x/y + locked
  // explicitly. width/height override now redundant but kept for safety on
  // older Excalidraw builds that may reset to 1×1 placeholder briefly.
  const id = await ea.addImage(pageX, pageY, file, true, true);
  const el = ea.getElement(id);
  if (el) {
    el.x = pageX;
    el.y = pageY;
    el.width = pageW;
    el.height = pageH;
    el.locked = true;
  } else {
    console.warn("[BookMode] image element missing after addImage", id);
  }
  ea.addAppendUpdateCustomData(id, { [TAG_PATTERN]: true, parentPageIndex: idx });
  return id;
}

// Single-page change (used by per-row dropdown / color picker)
async function applyPatternToPage(pageEl, mode, color) {
  const idx = pageEl.customData?.pageIndex;
  const existing = ea.getViewElements().filter(el =>
    isBookPattern(el) && el.customData?.parentPageIndex === idx
  );
  if (existing.length > 0) ea.deleteViewElements(existing);

  ea.clear();
  await pushPatternImage(pageEl.x, pageEl.y, pageEl.width, pageEl.height, idx, mode, color);

  ea.copyViewElementsToEAforEditing([pageEl]);
  ea.addAppendUpdateCustomData(pageEl.id, { paperMode: mode, paperColor: color });

  await ea.addElementsToView(false, false, false);
  await ea.targetView.save();
}

// ---------- core: add pages ----------
async function addPages(appendMode) {
  const { w: pageW, h: pageH } = getCurrentPageSize();
  if (!pageW || !pageH || pageW < 50 || pageH < 50) { new Notice("Invalid page size"); return; }

  const existing = getBookPages();

  if (!appendMode && existing.length > 0) {
    if (!window.confirm(`${existing.length} book page(s) exist. Replace them?`)) return;
    ea.deleteViewElements(getAllBookElements());
    existing.length = 0;
  }

  let startX = 0, startY = 0, startIndex = 1;
  const stride = cfg.orientation === "vertical"
    ? (pageH + LABEL_GAP + LABEL_FONT_SIZE + cfg.gap)
    : (pageW + cfg.gap);

  if (appendMode && existing.length > 0) {
    const last = existing[existing.length - 1];
    startIndex = (last.customData?.pageIndex ?? existing.length) + 1;
    if (cfg.orientation === "vertical") { startX = last.x; startY = last.y + last.height + LABEL_GAP + LABEL_FONT_SIZE + cfg.gap; }
    else { startX = last.x + last.width + cfg.gap; startY = last.y; }
  } else {
    const bb = getNonBookBoundingBox();
    if (bb) {
      if (cfg.orientation === "vertical") { startX = bb.topX; startY = bb.topY + bb.height + EXISTING_CONTENT_PAD; }
      else { startX = bb.topX + bb.width + EXISTING_CONTENT_PAD; startY = bb.topY; }
    }
  }

  ea.clear();
  if (!hasFrameAPI) new Notice("Frames unsupported, using rectangles");

  const newPageIds = [];

  for (let i = 0; i < cfg.count; i++) {
    const idx = startIndex + i;
    const x = cfg.orientation === "horizontal" ? startX + i * stride : startX;
    const y = cfg.orientation === "vertical"   ? startY + i * stride : startY;

    // bg outline only
    ea.style.strokeColor = PAGE_BG_STROKE;
    ea.style.backgroundColor = "transparent";
    ea.style.fillStyle = "solid";
    ea.style.strokeWidth = 1;
    ea.style.roughness = 0;
    ea.style.opacity = 100;
    const bgId = ea.addRect(x, y, pageW, pageH);
    ea.getElement(bgId).locked = true;
    ea.addAppendUpdateCustomData(bgId, { [TAG_BG]: true, pageIndex: idx });

    // frame
    let frameId;
    if (hasFrameAPI) {
      frameId = ea.addFrame(x, y, pageW, pageH, `Page ${idx}`);
    } else {
      ea.style.strokeWidth = 2;
      frameId = ea.addRect(x, y, pageW, pageH);
    }
    const frameEl = ea.getElement(frameId);
    if (frameEl) frameEl.locked = false;
    ea.addAppendUpdateCustomData(frameId, {
      [TAG_PAGE]: true, pageIndex: idx,
      paperMode: cfg.defaultPaper, paperColor: cfg.defaultColor,
    });
    newPageIds.push({ id: frameId, idx });

    // label
    ea.style.strokeColor = "#888";
    ea.style.fontSize = LABEL_FONT_SIZE;
    const labelId = ea.addText(x, y + pageH + LABEL_GAP, `Page ${idx}`, {
      width: pageW, height: LABEL_FONT_SIZE * 1.4,
      textAlign: "center", autoResize: false,
    });
    ea.getElement(labelId).locked = true;
    ea.addAppendUpdateCustomData(labelId, { [TAG_LABEL]: true, pageIndex: idx });
  }

  // Batch in same workbench. Pattern is one SVG image per page (not 100+ lines)
  // → adding 50 grid pages produces 50 image elements, not 5000+ line elements.
  if (cfg.defaultPaper !== "off") {
    for (let i = 0; i < newPageIds.length; i++) {
      const { idx } = newPageIds[i];
      const px = cfg.orientation === "horizontal" ? startX + i * stride : startX;
      const py = cfg.orientation === "vertical"   ? startY + i * stride : startY;
      await pushPatternImage(px, py, pageW, pageH, idx, cfg.defaultPaper, cfg.defaultColor);
    }
  }

  await ea.addElementsToView(false, false, false);
  await ea.targetView.save();

  const firstFrame = ea.getViewElements().find(el => el.id === newPageIds[0]?.id);
  if (firstFrame) api.zoomToFit([firstFrame], 10);

  rebuildPageList();
  new Notice(`${appendMode ? "Appended" : "Added"} ${cfg.count} page(s) starting at Page ${startIndex}`);
}

async function removeAll() {
  const all = getAllBookElements();
  if (all.length === 0) { new Notice("Nothing to remove"); return; }
  ea.deleteViewElements(all);
  await ea.targetView.save();
  rebuildPageList();
  new Notice("Book mode removed");
}

async function deletePage(pageEl) {
  const idx = pageEl.customData?.pageIndex;
  const toDelete = ea.getViewElements().filter(el =>
    (isBookAny(el) && el.customData?.pageIndex === idx)
    || (isBookPattern(el) && el.customData?.parentPageIndex === idx)
  );
  if (toDelete.length === 0) return;
  ea.deleteViewElements(toDelete);
  await ea.targetView.save();
  rebuildPageList();
}

function jumpToPage(frameEl) {
  if (!frameEl) return;
  // Use the exact pattern from the "Zoom to Fit Selected Elements" script:
  // api.zoomToFit(elements, 10). Re-fetch fresh element to avoid stale ref.
  const fresh = ea.getViewElements().find(el => el.id === frameEl.id) || frameEl;
  api.zoomToFit([fresh], 10);
}

// ---------- export to PDF ----------
async function exportPDF() {
  const pages = getBookPages();
  if (pages.length === 0) { new Notice("No pages to export"); return; }

  const noticeEl = new Notice("Generating PDF...", 0);
  try {
    const st = api.getAppState();
    const allEls = ea.getViewElements();
    const masterBB = ea.getBoundingBox(allEls);

    const svgScene = await ea.createViewSVG({
      withBackground: true,
      theme: st.theme,
      padding: 0,
      selectedOnly: false,
      embedScene: false,
      // Hide "Page N" frame name label + outline border in PDF export
      frameRendering: { enabled: true, name: false, outline: false, clip: true },
      elementsOverride: allEls,
    });

    const svgPages = [];
    for (const frame of pages) {
      const host = window.createDiv();
      host.innerHTML = svgScene.outerHTML;
      const cloned = host.firstElementChild;
      // FIX: createViewSVG renders origin at masterBB.topX/topY, so translate
      const vbX = frame.x - masterBB.topX;
      const vbY = frame.y - masterBB.topY;
      cloned.setAttribute("viewBox", `${vbX} ${vbY} ${frame.width} ${frame.height}`);
      cloned.setAttribute("width",  `${frame.width}`);
      cloned.setAttribute("height", `${frame.height}`);
      svgPages.push(cloned);
    }

    const filename = (ea.targetView.file?.basename || "book") + "-book.pdf";
    await ea.createPDF({
      SVG: svgPages,
      // fitToPage=1 plus zoom>1 = sharper rasterization
      scale: { fitToPage: 1, zoom: PDF_QUALITY_ZOOM },
      pageProps: {
        dimensions: {},
        backgroundColor: "#ffffff",
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
        alignment: "center",
      },
      filename,
    });
    new Notice(`Exported ${svgPages.length} page(s) → ${filename}`);
  } catch (e) {
    console.error("[BookMode] export failed", e);
    new Notice("Export failed — see console");
  } finally {
    noticeEl.hide();
  }
}

// ---------- shared float-panel z-index stack + modal-aware auto-hide ----------
const PANEL_Z_BASE = 50;
const PANEL_Z_MAX  = 70;
function cfRaisePanel(el) {
  if (!el) return;
  if (typeof window.__excaliPanelZ !== "number") window.__excaliPanelZ = PANEL_Z_BASE;
  window.__excaliPanelZ = window.__excaliPanelZ >= PANEL_Z_MAX ? PANEL_Z_BASE : window.__excaliPanelZ + 1;
  el.style.zIndex = String(window.__excaliPanelZ);
}
if (!window.__excaliPanelSuppressInstalled) {
  window.__excaliPanelSuppressInstalled = true;
  const _s = document.createElement("style");
  _s.id = "excali-panel-suppress-style";
  _s.textContent = `body.excali-modal-open .excali-floating-panel { display: none !important; }`;
  document.head.appendChild(_s);
  const _update = () => {
    const open = !!document.querySelector("body > .modal-container, body > .suggestion-container, body > .prompt");
    document.body.classList.toggle("excali-modal-open", open);
  };
  new MutationObserver(_update).observe(document.body, { childList: true });
  _update();
}

// ---------- UI panel ----------
let panel = document.getElementById(PANEL_ID);
if (panel) {
  const hidden = panel.style.display === "none";
  panel.style.display = hidden ? "" : "none";
  if (hidden) { rebuildPageList(); cfRaisePanel(panel); }
  return;
}

if (!document.getElementById(STYLE_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_ID;
  styleTag.textContent = `
    #${PANEL_ID} {
      position: absolute; top: 80px; right: 16px;
      width: 280px; max-height: 80vh;
      padding: 12px 14px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.28);
      z-index: 50; font-size: 13px;
      font-family: var(--font-interface);
      display: flex; flex-direction: column; gap: 0;
    }
    #${PANEL_ID} .bm-header {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:8px; margin-bottom:8px;
      border-bottom:1px solid var(--background-modifier-border);
      flex-shrink: 0;
    }
    #${PANEL_ID} .bm-title { font-weight:600; font-size:14px; display:flex; align-items:center; gap:6px; }
    #${PANEL_ID} .bm-title svg { color: var(--text-accent); }
    #${PANEL_ID} .bm-close { cursor:pointer; padding:2px 8px; border-radius:4px; color: var(--text-muted); user-select:none; }
    #${PANEL_ID} .bm-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
    #${PANEL_ID} .bm-body { overflow-y: auto; flex: 1; min-height: 0; padding-right: 2px; }
    #${PANEL_ID} .bm-footer { flex-shrink: 0; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border); }

    #${PANEL_ID} .bm-label {
      font-size: 11px; color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.5px; font-weight: 600;
      margin-top: 10px; margin-bottom: 4px;
    }
    #${PANEL_ID} .bm-body > .bm-label:first-child { margin-top: 2px; }
    #${PANEL_ID} .bm-row { display:flex; align-items:center; gap: 6px; }
    #${PANEL_ID} .bm-row > * { flex: 1; }

    #${PANEL_ID} select, #${PANEL_ID} input[type=number], #${PANEL_ID} input[type=text] {
      width: 100%; padding: 5px 7px; box-sizing: border-box;
      background: var(--background-secondary); color: var(--text-normal);
      border: 1px solid var(--background-modifier-border); border-radius: 5px;
      font-size: 12px;
    }
    #${PANEL_ID} input[type=color].bm-color {
      width: 26px; height: 26px; padding: 0;
      border: 1px solid var(--background-modifier-border);
      border-radius: 50%; cursor: pointer; background: transparent;
      box-shadow: inset 0 0 0 1px var(--background-modifier-border);
      flex: 0 0 26px;
    }

    #${PANEL_ID} button.bm-btn {
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      background: var(--interactive-normal); color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      font-size: 12px; font-weight: 500;
      transition: background 0.1s;
    }
    #${PANEL_ID} button.bm-btn:hover { background: var(--interactive-hover); }
    #${PANEL_ID} button.bm-btn.is-accent { background: var(--interactive-accent); color: var(--text-on-accent); border-color: transparent; }
    #${PANEL_ID} button.bm-btn.is-danger { background: var(--background-modifier-error); color: white; border-color: transparent; }
    #${PANEL_ID} .bm-btn-row { display:flex; gap:6px; margin-top: 6px; }
    #${PANEL_ID} .bm-btn-row > button { flex: 1; }

    #${PANEL_ID} .bm-segmented {
      display:flex; border:1px solid var(--background-modifier-border);
      border-radius:6px; overflow:hidden;
    }
    #${PANEL_ID} .bm-segmented > div { flex:1; padding:6px; text-align:center; cursor:pointer; font-size:12px; user-select:none; }
    #${PANEL_ID} .bm-segmented > div.is-active { background: var(--interactive-accent); color: var(--text-on-accent); font-weight: 600; }

    #${PANEL_ID} .bm-page-list {
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      background: var(--background-secondary);
      overflow: hidden;
    }
    #${PANEL_ID} .bm-page-item {
      display: grid; grid-template-columns: 14px 22px 1fr 22px 22px;
      align-items: center; gap: 6px;
      padding: 6px 6px 6px 4px;
      border-bottom: 1px solid var(--background-modifier-border);
      font-size: 12px;
      border-left: 2px solid transparent;
      transition: border-left-color 0.1s, background 0.1s;
    }
    #${PANEL_ID} .bm-page-item:last-child { border-bottom: none; }
    #${PANEL_ID} .bm-page-item:hover {
      background: var(--background-modifier-hover);
      border-left-color: var(--interactive-accent);
    }
    #${PANEL_ID} .bm-page-item.is-dragover-top { border-top: 2px solid var(--interactive-accent); }
    #${PANEL_ID} .bm-page-item.is-dragover-bot { border-bottom: 2px solid var(--interactive-accent); }
    #${PANEL_ID} .bm-page-item.is-dragging { opacity: 0.4; }
    #${PANEL_ID} .bm-drag-handle {
      cursor: grab; color: var(--text-faint);
      font-size: 14px; line-height: 1; text-align: center;
      user-select: none;
    }
    #${PANEL_ID} .bm-drag-handle:active { cursor: grabbing; }
    #${PANEL_ID} .bm-page-chip {
      width: 20px; height: 20px; border-radius: 4px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      background-repeat: repeat;
      cursor: pointer;
      transition: border-color 0.1s, transform 0.1s;
    }
    #${PANEL_ID} .bm-page-chip:hover { border-color: var(--interactive-accent); transform: scale(1.1); }

    .bm-popover {
      position: absolute;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      padding: 10px 12px;
      z-index: 65;
      min-width: 200px;
      font-family: var(--font-interface); font-size: 13px;
    }
    .bm-popover .bm-pop-title {
      font-size: 11px; color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px;
    }
    .bm-popover .bm-pop-row { display: flex; gap: 8px; align-items: center; }
    .bm-popover select {
      flex: 1; padding: 5px 7px;
      background: var(--background-secondary); color: var(--text-normal);
      border: 1px solid var(--background-modifier-border); border-radius: 5px;
      font-size: 12px;
    }
    .bm-popover input[type=color] {
      width: 28px; height: 28px; padding: 0; flex: 0 0 28px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 50%; cursor: pointer; background: transparent;
    }
    #${PANEL_ID} .bm-page-name {
      cursor: text; color: var(--text-normal); user-select: none;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-weight: 500;
      padding: 2px 4px; border-radius: 3px;
    }
    #${PANEL_ID} .bm-page-name:hover { background: var(--background-modifier-hover); }
    #${PANEL_ID} .bm-page-rename {
      width: 100%; padding: 2px 4px; box-sizing: border-box;
      font-size: 12px; background: var(--background-primary);
      color: var(--text-normal); border: 1px solid var(--interactive-accent);
      border-radius: 3px;
    }
    #${PANEL_ID} .bm-page-mode {
      padding: 3px 4px !important; font-size: 11px !important;
      height: 22px;
    }
    #${PANEL_ID} .bm-page-color {
      width: 20px !important; height: 20px !important; flex: 0 0 20px !important;
    }
    #${PANEL_ID} .bm-status {
      font-size: 11px; color: var(--text-muted);
      padding: 4px 0 6px; margin-bottom: 4px;
      border-bottom: 1px dashed var(--background-modifier-border);
    }
    #${PANEL_ID} .bm-status b { color: var(--text-normal); font-weight: 600; }
    #${PANEL_ID} .bm-mini-btn {
      padding: 3px 8px !important; font-size: 11px !important;
      border-radius: 4px;
    }
    #${PANEL_ID} .bm-icon-btn {
      cursor: pointer; padding: 0; border-radius: 4px; text-align: center;
      color: var(--text-muted); background: transparent; border: none;
      width: 22px; height: 22px;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 0.1s, color 0.1s;
    }
    #${PANEL_ID} .bm-icon-btn:hover { background: var(--background-modifier-hover); color: var(--text-error); }
    #${PANEL_ID} .bm-icon-btn.is-confirm { color: var(--text-error); background: var(--background-modifier-error-hover, rgba(255,68,68,0.15)); }
    #${PANEL_ID} .bm-icon-btn svg { width: 13px; height: 13px; }

    #${PANEL_ID} .bm-empty { color: var(--text-muted); font-size: 12px; text-align: center; padding: 16px; }
    #${PANEL_ID} .bm-footer button.bm-btn { display:flex; align-items:center; justify-content:center; gap:4px; }
    #${PANEL_ID} .bm-footer button.bm-btn svg { width: 13px; height: 13px; }
  `;
  document.head.appendChild(styleTag);
}

panel = document.createElement("div");
panel.id = PANEL_ID;
panel.classList.add("excali-floating-panel");
const _panelHost =
  view.contentEl.querySelector(".excalidraw") || view.contentEl;
if (_panelHost && getComputedStyle(_panelHost).position === "static") {
  _panelHost.style.position = "relative";
}
_panelHost.appendChild(panel);
cfRaisePanel(panel);
panel.addEventListener("mousedown", () => cfRaisePanel(panel), true);

const header = panel.createDiv({ cls: "bm-header" });
const titleEl = header.createDiv({ cls: "bm-title" });
titleEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h8"/><path d="M8 11h6"/></svg> Book Mode`;
header.createDiv({ cls: "bm-close", text: "✕" }).onclick = () => { panel.style.display = "none"; };

// Make panel draggable via header. Drops inline left/top + clears right so the
// initial CSS-anchored position takes over on first show.
header.style.cursor = "grab";
header.style.userSelect = "none";
(function makeDraggable() {
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener("mousedown", (e) => {
    if (e.target.closest(".bm-close")) return;
    const r = panel.getBoundingClientRect();
    dragging = true;
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const hr = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const left = Math.max(m, Math.min(hr.width  - w - m, e.clientX - hr.left - ox));
    const top  = Math.max(m, Math.min(hr.height - h - m, e.clientY - hr.top  - oy));
    panel.style.left = `${left}px`;
    panel.style.top  = `${top}px`;
    panel.style.right = "auto";
  });
  window.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; header.style.cursor = "grab"; }
  });
})();
(function clampOnResize() {
  const clamp = () => {
    const hr = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const cl = panel.offsetLeft, ct = panel.offsetTop;
    if (cl + w > hr.width  - m) panel.style.left = `${Math.max(m, hr.width  - w - m)}px`;
    if (ct + h > hr.height - m) panel.style.top  = `${Math.max(m, hr.height - h - m)}px`;
    if (cl < m) panel.style.left = `${m}px`;
    if (ct < m) panel.style.top  = `${m}px`;
  };
  window.addEventListener("resize", clamp);
})();

// SCROLLABLE BODY (fixed-height parent, this scrolls when pages grow)
const body = panel.createDiv({ cls: "bm-body" });

// Page size
body.createDiv({ cls: "bm-label", text: "PAGE SIZE" });
const sizeSel = document.createElement("select");
for (const s of PAGE_SIZES) { const o = document.createElement("option"); o.value = s.id; o.textContent = s.label; sizeSel.appendChild(o); }
sizeSel.value = cfg.sizeId;
sizeSel.onchange = () => { cfg.sizeId = sizeSel.value; updateCustomVisibility(); state.dirty = true; persistSoon(); };
body.appendChild(sizeSel);
const custRow = body.createDiv({ cls: "bm-row" });
custRow.style.marginTop = "4px";
const custW = document.createElement("input"); custW.type = "number"; custW.value = cfg.custW; custW.placeholder = "W";
custW.onchange = () => { cfg.custW = parseInt(custW.value, 10) || 800; state.dirty = true; persistSoon(); };
const custH = document.createElement("input"); custH.type = "number"; custH.value = cfg.custH; custH.placeholder = "H";
custH.onchange = () => { cfg.custH = parseInt(custH.value, 10) || 1100; state.dirty = true; persistSoon(); };
custRow.appendChild(custW); custRow.appendChild(custH);
function updateCustomVisibility() { custRow.style.display = cfg.sizeId === "cust" ? "flex" : "none"; }
updateCustomVisibility();

// Orientation
body.createDiv({ cls: "bm-label", text: "ORIENTATION" });
const segm = body.createDiv({ cls: "bm-segmented" });
const segV = segm.createDiv({ text: "Vertical" });
const segH = segm.createDiv({ text: "Horizontal" });
function setOrientation(v) {
  cfg.orientation = v;
  segV.classList.toggle("is-active", v === "vertical");
  segH.classList.toggle("is-active", v === "horizontal");
  state.dirty = true; persistSoon();
}
segV.onclick = () => setOrientation("vertical");
segH.onclick = () => setOrientation("horizontal");
setOrientation(cfg.orientation);

// Count + Gap
body.createDiv({ cls: "bm-label", text: "COUNT / GAP" });
const cgRow = body.createDiv({ cls: "bm-row" });
const cntInput = document.createElement("input"); cntInput.type = "number"; cntInput.min = "1"; cntInput.max = "50"; cntInput.value = cfg.count;
cntInput.onchange = () => { cfg.count = Math.max(1, parseInt(cntInput.value, 10) || 1); state.dirty = true; persistSoon(); };
const gapInput = document.createElement("input"); gapInput.type = "number"; gapInput.min = "0"; gapInput.max = "200"; gapInput.value = cfg.gap;
gapInput.onchange = () => { cfg.gap = Math.max(0, parseInt(gapInput.value, 10) || 0); state.dirty = true; persistSoon(); };
cgRow.appendChild(cntInput); cgRow.appendChild(gapInput);

// Default paper (used for new pages)
body.createDiv({ cls: "bm-label", text: "DEFAULT PAPER" });
const defRow = body.createDiv({ cls: "bm-row" });
const defMode = document.createElement("select");
for (const m of PAPER_MODES) { const o = document.createElement("option"); o.value = m; o.textContent = PAPER_LABELS[m]; defMode.appendChild(o); }
defMode.value = cfg.defaultPaper;
defMode.onchange = () => { cfg.defaultPaper = defMode.value; state.dirty = true; persistSoon(); };
const defColor = document.createElement("input"); defColor.type = "color"; defColor.className = "bm-color"; defColor.value = cfg.defaultColor;
defColor.oninput = () => { cfg.defaultColor = defColor.value; state.dirty = true; persistSoon(); };
defRow.appendChild(defMode); defRow.appendChild(defColor);

// Add / Append
const actionRow = body.createDiv({ cls: "bm-btn-row" });
const addBtn    = document.createElement("button"); addBtn.className = "bm-btn is-accent"; addBtn.textContent = "Add";
const appendBtn = document.createElement("button"); appendBtn.className = "bm-btn"; appendBtn.textContent = "Append";
addBtn.onclick    = () => addPages(false);
appendBtn.onclick = () => addPages(true);
actionRow.appendChild(addBtn); actionRow.appendChild(appendBtn);

// Apply default to all pages — quick bulk update
const applyAllBtn = document.createElement("button");
applyAllBtn.className = "bm-btn bm-mini-btn";
applyAllBtn.textContent = "Apply default to all pages";
applyAllBtn.style.marginTop = "6px";
applyAllBtn.style.width = "100%";
applyAllBtn.onclick = async () => {
  const pages = getBookPages();
  if (pages.length === 0) return;
  const orig = applyAllBtn.textContent;
  applyAllBtn.textContent = "Applying...";
  applyAllBtn.disabled = true;
  // Batch: clear all existing pattern elements at once, then push new ones in one workbench
  const existing = ea.getViewElements().filter(isBookPattern);
  if (existing.length > 0) ea.deleteViewElements(existing);
  ea.clear();
  for (const p of pages) {
    await pushPatternImage(p.x, p.y, p.width, p.height, p.customData?.pageIndex, cfg.defaultPaper, cfg.defaultColor);
    ea.copyViewElementsToEAforEditing([p]);
    ea.addAppendUpdateCustomData(p.id, { paperMode: cfg.defaultPaper, paperColor: cfg.defaultColor });
  }
  await ea.addElementsToView(false, false, false);
  await ea.targetView.save();
  applyAllBtn.disabled = false;
  applyAllBtn.textContent = orig;
  rebuildPageList();
  new Notice(`Applied ${cfg.defaultPaper} to ${pages.length} page(s)`);
};
body.appendChild(applyAllBtn);

// Status summary + Pages list
body.createDiv({ cls: "bm-label", text: "PAGES" });
const statusEl = body.createDiv({ cls: "bm-status" });
const pageList = body.createDiv({ cls: "bm-page-list" });

// Mini pattern preview (data URI) for row chips — small inline canvas render.
// Cache declared at top of file as var to avoid TDZ when this hoisted function
// is referenced before this line executes.
function getMiniPreview(mode, color) {
  const key = `${mode}_${color}`;
  if (MINI_PREVIEW_CACHE.has(key)) return MINI_PREVIEW_CACHE.get(key);
  const w = 18, h = 18, s = 6;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
  if (mode === "off") {
    ctx.fillStyle = "#0000";
  } else if (mode === "dotted") {
    for (let x = s/2; x < w; x += s) for (let y = s/2; y < h; y += s) {
      ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI*2); ctx.fill();
    }
  } else if (mode === "grid") {
    ctx.beginPath();
    for (let y = 0; y <= h; y += s) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
    for (let x = 0; x <= w; x += s) { ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, h); }
    ctx.stroke();
  } else if (mode === "ruled") {
    ctx.beginPath();
    for (let y = 0; y <= h; y += s) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
    ctx.stroke();
  } else if (mode === "dashed") {
    ctx.setLineDash([2,2]); ctx.beginPath();
    for (let y = 0; y <= h; y += s) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
    for (let x = 0; x <= w; x += s) { ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, h); }
    ctx.stroke(); ctx.setLineDash([]);
  } else if (mode === "cross") {
    ctx.beginPath();
    for (let x = s; x < w; x += s) for (let y = s; y < h; y += s) {
      ctx.moveTo(x-1.5, y); ctx.lineTo(x+1.5, y);
      ctx.moveTo(x, y-1.5); ctx.lineTo(x, y+1.5);
    }
    ctx.stroke();
  }
  const url = canvas.toDataURL("image/png");
  MINI_PREVIEW_CACHE.set(key, url);
  return url;
}

// ICON_* declared at top of script

async function renamePage(pageEl, newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed) return;
  ea.copyViewElementsToEAforEditing([pageEl]);
  const fresh = ea.getElement(pageEl.id);
  if (fresh) fresh.name = trimmed;
  ea.addAppendUpdateCustomData(pageEl.id, { pageName: trimmed });
  await ea.addElementsToView(false, false, false);
  await ea.targetView.save();
}

// Inline confirm: click once → button turns red w/ check icon, click again → executes.
// 3s timeout reverts. No native confirm dialog.
function makeConfirmButton({ initialIcon, initialTitle, confirmTitle, onConfirm }) {
  const btn = document.createElement("button");
  btn.className = "bm-icon-btn";
  btn.title = initialTitle;
  btn.innerHTML = initialIcon;
  let armed = false, timer = null;
  const reset = () => {
    armed = false;
    btn.innerHTML = initialIcon;
    btn.title = initialTitle;
    btn.classList.remove("is-confirm");
    if (timer) { clearTimeout(timer); timer = null; }
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    if (!armed) {
      armed = true;
      btn.innerHTML = ICON_CHECK;
      btn.title = confirmTitle;
      btn.classList.add("is-confirm");
      timer = setTimeout(reset, 3000);
    } else {
      reset();
      onConfirm();
    }
  };
  return btn;
}

// ---------- popover for chip click (mode + color) ----------
// `openPopover` declared at top of script as var to avoid TDZ when
// rebuildPageList → closePopover runs during initial script execution.
function closePopover() {
  if (openPopover) { openPopover.remove(); openPopover = null; }
  document.removeEventListener("mousedown", popoverOutsideClick, true);
}
function popoverOutsideClick(e) {
  if (openPopover && !openPopover.contains(e.target)) closePopover();
}
function openPaperPopover(pageEl, anchorRect) {
  closePopover();
  const pop = document.createElement("div");
  pop.className = "bm-popover excali-floating-panel";
  pop.innerHTML = `<div class="bm-pop-title">Paper</div>`;
  const row = document.createElement("div");
  row.className = "bm-pop-row";
  const sel = document.createElement("select");
  for (const m of PAPER_MODES) {
    const o = document.createElement("option");
    o.value = m; o.textContent = PAPER_LABELS[m];
    sel.appendChild(o);
  }
  sel.value = pageEl.customData?.paperMode || "off";
  const col = document.createElement("input");
  col.type = "color";
  col.value = pageEl.customData?.paperColor || cfg.defaultColor;
  row.appendChild(sel); row.appendChild(col);
  pop.appendChild(row);
  _panelHost.appendChild(pop);

  const popRect = pop.getBoundingClientRect();
  const hr = _panelHost.getBoundingClientRect();
  let x = anchorRect.left - hr.left;
  let y = anchorRect.bottom - hr.top + 4;
  if (x + popRect.width > hr.width - 8) x = hr.width - popRect.width - 8;
  if (y + popRect.height > hr.height - 8) y = anchorRect.top - hr.top - popRect.height - 4;
  pop.style.left = `${x}px`; pop.style.top = `${y}px`;

  const apply = async () => {
    await applyPatternToPage(pageEl, sel.value, col.value);
    closePopover();
    rebuildPageList();
  };
  sel.onchange = apply;
  col.onchange = apply;

  openPopover = pop;
  setTimeout(() => document.addEventListener("mousedown", popoverOutsideClick, true), 0);
}

// ---------- drag reorder (also physically swap page positions on canvas) ----------
// `dragSrcIdx` declared at top of script
async function reorderPages(srcIdx, destIdx, insertBefore) {
  const pages = getBookPages();
  if (srcIdx === destIdx) return;
  const src = pages[srcIdx];
  pages.splice(srcIdx, 1);
  const insertAt = insertBefore ? destIdx : destIdx + 1;
  const finalIdx = insertAt > srcIdx ? insertAt - 1 : insertAt;
  pages.splice(finalIdx, 0, src);

  // Layout anchor = min coords across all pages; stride from first page size
  const anchorX = Math.min(...pages.map(p => p.x));
  const anchorY = Math.min(...pages.map(p => p.y));
  const stride = cfg.orientation === "vertical"
    ? pages[0].height + LABEL_GAP + LABEL_FONT_SIZE + cfg.gap
    : pages[0].width + cfg.gap;

  // Build move plan: each page's frame + bg + label + pattern + frame children shift by delta
  const allView = ea.getViewElements();
  const movePlan = []; // {id, dx, dy}
  pages.forEach((p, newIdx) => {
    const targetX = cfg.orientation === "horizontal" ? anchorX + newIdx * stride : anchorX;
    const targetY = cfg.orientation === "vertical"   ? anchorY + newIdx * stride : anchorY;
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    if (dx === 0 && dy === 0) return;
    const pageIdx = p.customData?.pageIndex;
    const related = allView.filter(el =>
      el.id === p.id
      || (el.customData?.pageIndex === pageIdx && (isBookBg(el) || isBookLabel(el)))
      || (el.customData?.parentPageIndex === pageIdx && isBookPattern(el))
      || el.frameId === p.id
    );
    for (const e of related) movePlan.push({ id: e.id, dx, dy });
  });

  // Commit: copy all affected + page elements to workbench, apply shifts + bookOrder
  const affectedIds = new Set(movePlan.map(m => m.id));
  pages.forEach(p => affectedIds.add(p.id));
  const affectedEls = allView.filter(el => affectedIds.has(el.id));
  ea.copyViewElementsToEAforEditing(affectedEls);
  for (const m of movePlan) {
    const el = ea.getElement(m.id);
    if (el) { el.x += m.dx; el.y += m.dy; }
  }
  pages.forEach((p, i) => {
    ea.addAppendUpdateCustomData(p.id, { bookOrder: (i + 1) * 10 });
  });
  await ea.addElementsToView(false, false, false);
  await ea.targetView.save();
  rebuildPageList();
}

function rebuildPageList() {
  const pageList = document.querySelector(`#${PANEL_ID} .bm-page-list`);
  const statusEl = document.querySelector(`#${PANEL_ID} .bm-status`);
  if (!pageList) return;
  pageList.empty();
  closePopover();
  const pages = getBookPages();

  if (statusEl) {
    const sizeLabel = (PAGE_SIZES.find(s => s.id === cfg.sizeId) || {}).label || "?";
    statusEl.innerHTML = pages.length === 0
      ? `<span>No pages yet</span>`
      : `<b>${pages.length}</b> page${pages.length === 1 ? "" : "s"} · <b>${sizeLabel}</b>`;
  }

  if (pages.length === 0) {
    pageList.createDiv({ cls: "bm-empty", text: "Click Add to create pages" });
    return;
  }

  const frag = document.createDocumentFragment();
  pages.forEach((p, rowIdx) => {
    const row = document.createElement("div");
    row.className = "bm-page-item";
    row.draggable = true;

    const handle = document.createElement("div");
    handle.className = "bm-drag-handle";
    handle.textContent = "⋮⋮";
    handle.title = "Drag to reorder";
    row.appendChild(handle);

    const chip = document.createElement("div");
    chip.className = "bm-page-chip";
    const curMode = p.customData?.paperMode || "off";
    const curColor = p.customData?.paperColor || cfg.defaultColor;
    if (curMode !== "off") chip.style.backgroundImage = `url(${getMiniPreview(curMode, curColor)})`;
    chip.style.borderLeft = `4px solid ${curColor}`;
    chip.title = `${PAPER_LABELS[curMode] || curMode} (click to change)`;
    chip.onclick = (e) => { e.stopPropagation(); openPaperPopover(p, chip.getBoundingClientRect()); };
    row.appendChild(chip);

    const nameEl = document.createElement("div");
    nameEl.className = "bm-page-name";
    nameEl.title = "Click to rename";
    const displayName = p.name || p.customData?.pageName || `Page ${p.customData?.pageIndex ?? "?"}`;
    nameEl.textContent = displayName;
    nameEl.onclick = () => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "bm-page-rename";
      input.value = displayName;
      let committed = false;
      const commit = async () => {
        if (committed) return;
        committed = true;
        const val = input.value.trim();
        if (val && val !== displayName) await renamePage(p, val);
        rebuildPageList();
      };
      const cancel = () => { if (!committed) { committed = true; rebuildPageList(); } };
      input.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        else if (e.key === "Escape") { e.preventDefault(); cancel(); }
      };
      input.onblur = () => commit();
      nameEl.replaceWith(input);
      input.focus(); input.select();
    };
    row.appendChild(nameEl);

    const zoomBtn = document.createElement("button");
    zoomBtn.className = "bm-icon-btn";
    zoomBtn.title = "Zoom to fit";
    zoomBtn.innerHTML = ICON_ZOOM;
    zoomBtn.onclick = (e) => { e.stopPropagation(); jumpToPage(p); };
    row.appendChild(zoomBtn);

    const delBtn = makeConfirmButton({
      initialIcon: ICON_TRASH,
      initialTitle: `Delete Page ${p.customData?.pageIndex}`,
      confirmTitle: "Click again to confirm",
      onConfirm: () => deletePage(p),
    });
    row.appendChild(delBtn);

    // Drag events
    row.addEventListener("dragstart", (e) => {
      dragSrcIdx = rowIdx;
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", String(rowIdx)); } catch (_) {}
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("is-dragging");
      pageList.querySelectorAll(".bm-page-item").forEach(el => {
        el.classList.remove("is-dragover-top", "is-dragover-bot");
      });
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      row.classList.toggle("is-dragover-top", before);
      row.classList.toggle("is-dragover-bot", !before);
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("is-dragover-top", "is-dragover-bot");
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      row.classList.remove("is-dragover-top", "is-dragover-bot");
      if (dragSrcIdx === null) return;
      reorderPages(dragSrcIdx, rowIdx, before);
      dragSrcIdx = null;
    });

    frag.appendChild(row);
  });
  pageList.appendChild(frag);
}
rebuildPageList();

// FOOTER: Export + Remove all
const utilRow = panel.createDiv({ cls: "bm-footer bm-btn-row" });

const expBtn = document.createElement("button");
expBtn.className = "bm-btn";
expBtn.innerHTML = `${ICON_DOWNLOAD}<span>Export PDF</span>`;
expBtn.onclick = () => exportPDF();
utilRow.appendChild(expBtn);

let rmArmed = false, rmTimer = null;
const rmBtn = document.createElement("button");
rmBtn.className = "bm-btn is-danger";
rmBtn.innerHTML = `${ICON_TRASH}<span>Remove all</span>`;
rmBtn.onclick = () => {
  if (!rmArmed) {
    rmArmed = true;
    rmBtn.innerHTML = `${ICON_CHECK}<span>Click again</span>`;
    rmTimer = setTimeout(() => {
      rmArmed = false;
      rmBtn.innerHTML = `${ICON_TRASH}<span>Remove all</span>`;
    }, 3000);
  } else {
    clearTimeout(rmTimer); rmArmed = false;
    rmBtn.innerHTML = `${ICON_TRASH}<span>Remove all</span>`;
    removeAll();
  }
};
utilRow.appendChild(rmBtn);

/*
```
*/
