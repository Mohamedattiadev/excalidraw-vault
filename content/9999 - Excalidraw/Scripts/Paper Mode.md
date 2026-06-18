---
excalidraw-plugin: parsed
---

/*
Toggle paper-style background on the active Excalidraw view via persistent floating panel.
First run builds the panel and caches it on window. Subsequent runs just show/hide it for
instant toggling. Pattern itself persists across toggles via the Enabled switch inside.

```javascript
*/

const MODE_OPTIONS = {
  dotted:     "Dotted",
  dashed:     "Dashed cross",
  grid:       "Grid (square)",
  ruled:      "Ruled (lines)",
  cross:      "Crosses (+)",
  crosshatch: "Crosshatch (diag)",
  iso:        "Isometric",
  circles:    "Open circles",
  diamonds:   "Diamonds",
  triangles:  "Triangles",
  waves:      "Waves",
  bricks:     "Bricks",
  music:      "Music staff",
  hex:        "Hexagons",
  stars:      "Stars (·)",
  checker:    "Checker",
};
const DEFAULTS = { enabled: true, mode: "dotted", spacing: 24, color: "#cfcfcf", opacity: 100, panelMode: "side" };
const SPACING_MIN = 20;
const SPACING_MAX = 50;
const STROKE_WIDTH = 1;
const DOT_RADIUS = 1.5;
const CROSS_ARM = 3;
const KEY = "Paper mode config";
const PANEL_ID = "paper-mode-panel";
const STYLE_ID = "paper-mode-style";
const SIDE_PANEL_ID = "paper-mode-side-panel";
const SIDE_STYLE_ID = "paper-mode-side-style";
const TOOLBAR_WRAP_ID = "paper-mode-toolbar-wrap";
const TOOLBAR_BTN_ID = "paper-mode-toolbar-btn";
const TOOLBAR_DIVIDER_ID = "paper-mode-toolbar-divider";

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// Remove stale About entry from earlier versions — fire-and-forget so
// the disk write doesn't block the panel build.
{
  const _s = ea.getScriptSettings() || {};
  if (_s["About"]) { delete _s["About"]; ea.setScriptSettings(_s); }
}
// ---------- settings (cached on window for speed across runs) ----------
let state = window.__paperModeState;
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
    sideOpen: false,
  };
  window.__paperModeState = state;
}
const cfg = state.cfg;

// ---------- pattern apply / clear ----------
function getCanvases() {
  return Array.from(view.contentEl.querySelectorAll(".excalidraw__canvas.static"));
}

function buildSVG(mode, s, col, alpha = 1) {
  const sw = STROKE_WIDTH;
  let body = "", w = s, h = s;
  if (mode === "dotted") {
    body = `<circle cx='${s/2}' cy='${s/2}' r='${DOT_RADIUS}' fill='${col}'/>`;
  } else if (mode === "dashed") {
    const d = Math.max(2, Math.floor(s / 6));
    const a = `stroke='${col}' stroke-width='${sw}' stroke-dasharray='${d} ${d}'`;
    body = `<line x1='0' y1='0.5' x2='${s}' y2='0.5' ${a}/><line x1='0.5' y1='0' x2='0.5' y2='${s}' ${a}/>`;
  } else if (mode === "grid") {
    body = `<line x1='0' y1='0.5' x2='${s}' y2='0.5' stroke='${col}' stroke-width='${sw}'/><line x1='0.5' y1='0' x2='0.5' y2='${s}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "ruled") {
    body = `<line x1='0' y1='0.5' x2='${s}' y2='0.5' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "cross") {
    const c = s / 2, a = Math.min(CROSS_ARM, s / 4);
    body = `<line x1='${c-a}' y1='${c}' x2='${c+a}' y2='${c}' stroke='${col}' stroke-width='${sw}'/><line x1='${c}' y1='${c-a}' x2='${c}' y2='${c+a}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "crosshatch") {
    body = `<line x1='0' y1='${s}' x2='${s}' y2='0' stroke='${col}' stroke-width='${sw}'/><line x1='0' y1='0' x2='${s}' y2='${s}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "iso") {
    h = Math.round(s * 0.866);
    body = `<line x1='0' y1='${h/2}' x2='${s}' y2='${h/2}' stroke='${col}' stroke-width='${sw}'/><line x1='0' y1='0' x2='${s}' y2='${h}' stroke='${col}' stroke-width='${sw}'/><line x1='0' y1='${h}' x2='${s}' y2='0' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "circles") {
    const r = s / 2 - 1.5;
    body = `<circle cx='${s/2}' cy='${s/2}' r='${r}' fill='none' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "diamonds") {
    const c = s / 2, e = s / 2 - 1;
    body = `<polygon points='${c},${c-e} ${c+e},${c} ${c},${c+e} ${c-e},${c}' fill='none' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "triangles") {
    // equilateral triangle grid: tile = up + down triangle pair
    w = s; h = Math.round(s * 0.866);
    body = `<polyline points='0,${h} ${s/2},0 ${s},${h} 0,${h}' fill='none' stroke='${col}' stroke-width='${sw}'/><line x1='${s/2}' y1='0' x2='${s/2}' y2='${h}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "waves") {
    // half-sine across tile width; vertical center at h/2
    const m = s / 2;
    body = `<path d='M0,${m} Q${s/4},0 ${s/2},${m} T${s},${m}' fill='none' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "bricks") {
    // tile 2s wide, s tall — brick offset row built into single tile
    w = s * 2; h = s;
    body = `<line x1='0' y1='0.5' x2='${w}' y2='0.5' stroke='${col}' stroke-width='${sw}'/><line x1='0' y1='${h/2}' x2='${w}' y2='${h/2}' stroke='${col}' stroke-width='${sw}'/><line x1='${s/2}' y1='0' x2='${s/2}' y2='${h/2}' stroke='${col}' stroke-width='${sw}'/><line x1='${s+s/2}' y1='0' x2='${s+s/2}' y2='${h/2}' stroke='${col}' stroke-width='${sw}'/><line x1='${s}' y1='${h/2}' x2='${s}' y2='${h}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "music") {
    // 5 horizontal staff lines in upper portion, gap below
    const step = Math.max(2, Math.floor(s / 8));
    let lines = "";
    for (let i = 0; i < 5; i++) {
      const y = step * (i + 1);
      lines += `<line x1='0' y1='${y}' x2='${s}' y2='${y}' stroke='${col}' stroke-width='${sw}'/>`;
    }
    body = lines;
  } else if (mode === "hex") {
    // hex grid approximation: tile draws two half-hex columns
    w = s; h = Math.round(s * 1.732); // sqrt(3)
    const q = s / 4, half = s / 2;
    body = `<polyline points='0,${h*0.25} ${q},0 ${s-q},0 ${s},${h*0.25} ${s-q},${h*0.5} ${q},${h*0.5} 0,${h*0.25}' fill='none' stroke='${col}' stroke-width='${sw}'/><line x1='${q}' y1='${h*0.5}' x2='${q}' y2='${h*0.75}' stroke='${col}' stroke-width='${sw}'/><line x1='${s-q}' y1='${h*0.5}' x2='${s-q}' y2='${h*0.75}' stroke='${col}' stroke-width='${sw}'/>`;
  } else if (mode === "stars") {
    // small filled stars at grid intersections (using simple 4-point star paths)
    const c = s / 2, r = 2;
    body = `<path d='M${c},${c-r} L${c+r/3},${c-r/3} L${c+r},${c} L${c+r/3},${c+r/3} L${c},${c+r} L${c-r/3},${c+r/3} L${c-r},${c} L${c-r/3},${c-r/3} Z' fill='${col}'/>`;
  } else if (mode === "checker") {
    // checkerboard squares — 2x2 tile of half-squares
    const half = s / 2;
    body = `<rect x='0' y='0' width='${half}' height='${half}' fill='${col}' opacity='0.4'/><rect x='${half}' y='${half}' width='${half}' height='${half}' fill='${col}' opacity='0.4'/>`;
  } else {
    body = `<line x1='0' y1='0.5' x2='${s}' y2='0.5' stroke='${col}' stroke-width='${sw}'/>`;
  }
  const wrapped = alpha < 1 ? `<g opacity='${alpha}'>${body}</g>` : body;
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${wrapped}</svg>`
  );
  return { url, w, h };
}

// CSS-injected canvas background. Using inline canvas style fails:
// React reconciles the canvas's style attribute on every render and
// wipes our backgroundImage. An injected <style> tag with !important
// rule survives because React doesn't manage external style nodes.
const CANVAS_BG_STYLE_ID = "paper-mode-canvas-bg-style";

function getCanvasBgStyleEl() {
  let el = document.getElementById(CANVAS_BG_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = CANVAS_BG_STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

function clearPattern() {
  const prev = view._paperMode;
  if (prev?.unsubscribe) { try { prev.unsubscribe(); } catch (e) {} }
  document.getElementById(CANVAS_BG_STYLE_ID)?.remove();
  if (prev?.originalBg !== undefined) {
    api.updateScene({ appState: { viewBackgroundColor: prev.originalBg }, commitToHistory: false });
  }
  view._paperMode = null;
}

function applyPattern() {
  // Don't double-clear if same originalBg already captured — saves an
  // extra api.updateScene round-trip that would otherwise trigger
  // React to re-render the toolbar / side-panel area.
  const prev = view._paperMode;
  if (prev?.unsubscribe) { try { prev.unsubscribe(); } catch (e) {} }
  const { url, w, h } = buildSVG(cfg.mode, cfg.spacing, cfg.color, (cfg.opacity ?? 100) / 100);
  let originalBg;
  if (prev?.originalBg !== undefined) {
    originalBg = prev.originalBg;
  } else {
    originalBg = api.getAppState().viewBackgroundColor;
  }
  if (api.getAppState().viewBackgroundColor !== "transparent") {
    api.updateScene({ appState: { viewBackgroundColor: "transparent" }, commitToHistory: false });
  }
  const styleEl = getCanvasBgStyleEl();
  const paint = (sx, sy, zoom) => {
    const z = zoom?.value ?? 1;
    const px = (sx || 0) * z;
    const py = (sy || 0) * z;
    styleEl.textContent = `
      .excalidraw__canvas.static {
        background-image: url("${url}") !important;
        background-repeat: repeat !important;
        background-size: ${w}px ${h}px !important;
        background-position: ${px}px ${py}px !important;
      }
    `;
  };
  const s0 = api.getAppState();
  paint(s0.scrollX, s0.scrollY, s0.zoom);
  const unsubscribe = api.onScrollChange((sx, sy, zoom) => paint(sx, sy, zoom));
  view._paperMode = { unsubscribe, originalBg };
}

function refresh() {
  if (cfg.enabled) applyPattern();
  else clearPattern();
}

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

// ---------- shared float-panel z-index stack + modal-aware auto-hide ----------
// Base 50 keeps panels below Obsidian sidebars/tabs/modal/palette. When a
// modal or command palette opens we toggle body.excali-modal-open which
// hides every .excali-floating-panel via CSS — position + state intact.
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

const COLOR_PRESETS = ["#cfcfcf", "#9e9e9e", "#5a5a5a", "#ff6b6b", "#ffa940", "#4dabf7", "#51cf66", "#cc5de8"];

// ---------- toolbar button + side panel survival (race-condition safe) ----------
// One MutationObserver, rAF-debounced, idempotent ensure() calls. Side
// panel re-mounts itself if Excalidraw re-renders its container (which
// happens when selecting/deselecting shapes, switching tools, opening
// the main-menu dropdown, etc). State of "open" lives on `state.sideOpen`
// so it survives those re-renders without flicker.
function buildToolbarButton(toolbar) {
  const wrap = document.createElement("div");
  wrap.id = TOOLBAR_WRAP_ID;
  wrap.className = "dropdown-menu-container";
  wrap.style.display = "contents";
  const btn = document.createElement("button");
  btn.id = TOOLBAR_BTN_ID;
  btn.type = "button";
  btn.className = "dropdown-menu-button App-toolbar__extra-tools-trigger zen-mode-transition";
  btn.title = "Paper Mode";
  btn.setAttribute("aria-label", "Paper Mode");
  btn.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="var(--icon-fill-color)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="0.8" fill="var(--icon-fill-color)"/><circle cx="12" cy="8" r="0.8" fill="var(--icon-fill-color)"/><circle cx="16" cy="8" r="0.8" fill="var(--icon-fill-color)"/><circle cx="8" cy="12" r="0.8" fill="var(--icon-fill-color)"/><circle cx="12" cy="12" r="0.8" fill="var(--icon-fill-color)"/><circle cx="16" cy="12" r="0.8" fill="var(--icon-fill-color)"/><circle cx="8" cy="16" r="0.8" fill="var(--icon-fill-color)"/><circle cx="12" cy="16" r="0.8" fill="var(--icon-fill-color)"/><circle cx="16" cy="16" r="0.8" fill="var(--icon-fill-color)"/></g></svg>`;
  btn.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  wrap.appendChild(btn);
  toolbar.appendChild(wrap);
}
function ensureToolbarButton() {
  const toolbar = view.contentEl.querySelector(".App-toolbar");
  if (!toolbar) return;
  if (toolbar.querySelector("#" + TOOLBAR_WRAP_ID)) return;
  buildToolbarButton(toolbar);
}
function ensureSidePanel() {
  if (!state.sideOpen || cfg.panelMode !== "side") return;
  const container = view.contentEl.querySelector(".selected-shape-actions-container");
  container?.classList.add("paper-mode-open");
  if (view.contentEl.querySelector("#" + SIDE_PANEL_ID)) return;
  buildSidePanel();
}
function setBtnState(open) {
  const btn = view.contentEl.querySelector("#" + TOOLBAR_BTN_ID);
  if (!btn) return;
  btn.setAttribute("data-state", open ? "open" : "closed");
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}
// Synchronous ensure — no rAF debounce. When React re-renders App-menu_
// top__left and wipes our foreign wrapSec, we re-append in the same
// microtask/MO cycle so there's no paint frame where the panel is
// missing. Idempotent checks (early returns) prevent infinite loops.
let _ensureReentry = false;
function scheduleEnsure() {
  if (_ensureReentry) return;
  _ensureReentry = true;
  try {
    ensureToolbarButton();
    ensureSidePanel();
    setBtnState(state.sideOpen && cfg.panelMode === "side");
  } finally {
    _ensureReentry = false;
  }
}
function installMounts() {
  // Tear down any prior observer on this view before reinstalling
  // (e.g. script re-run during same session) — avoids dual-fire.
  const prior = view._paperModeMounts;
  if (prior?.cleanup) prior.cleanup();
  ensureToolbarButton();
  ensureSidePanel();
  setBtnState(state.sideOpen && cfg.panelMode === "side");
  const mo = new MutationObserver(scheduleEnsure);
  mo.observe(view.contentEl, { childList: true, subtree: true });
  view._paperModeMounts = {
    cleanup: () => {
      try { mo.disconnect(); } catch (_) {}
      view.contentEl.querySelector("#" + TOOLBAR_WRAP_ID)?.remove();
      view.contentEl.querySelector("#" + TOOLBAR_DIVIDER_ID)?.remove();
      view.contentEl.querySelector("#" + SIDE_PANEL_ID)?.remove();
      view._paperModeMounts = null;
    }
  };
}

function closeSidePanel() {
  if (cfg.panelMode !== "side") return;
  state.sideOpen = false;
  const existing = view.contentEl.querySelector("#" + SIDE_PANEL_ID);
  existing?._unbindDismiss?.();
  existing?.remove();
  // Restore native selected-shape-actions visibility.
  view.contentEl.querySelector(".selected-shape-actions-container")
    ?.classList.remove("paper-mode-open");
  // Restore native tool-active highlight.
  document.body.classList.remove("paper-mode-active");
  // Kill any open color popover so it doesn't dangle.
  view.contentEl.querySelector("#paper-mode-color-popover")?.remove();
  setBtnState(false);
}

function togglePanel() {
  if (cfg.panelMode === "float") {
    let p = document.getElementById(PANEL_ID);
    if (p) {
      const hidden = p.style.display === "none";
      p.style.display = hidden ? "" : "none";
      if (hidden) { refresh(); cfRaisePanel(p); setBtnState(true); }
      else setBtnState(false);
      return;
    }
    buildFloatPanel(); setBtnState(true);
    return;
  }
  // side mode
  if (view.contentEl.querySelector("#" + SIDE_PANEL_ID)) {
    closeSidePanel();
    return;
  }
  // Open: reset active tool so the previously-selected shape tool
  // (pen / rect / etc.) drops its purple highlight — only one button
  // should ever look active. Then set flag, build panel, ensure() keeps
  // it alive across re-renders.
  // Build panel + apply pattern. Tool-deactivation via api.setActiveTool
  // proved unreliable (React's tool-change re-render fights with our
  // panel mount, causing it to flicker/not appear on first click).
  // Accept dual highlight — opening paper does NOT change the active
  // drawing tool. User can still draw with their prior tool selection.
  state.sideOpen = true;
  buildSidePanel();
  refresh();
  setBtnState(true);
  document.body.classList.add("paper-mode-active");
  // Time-window suppress instead of single-shot flag: api.setActiveTool
  // fires onChange multiple times (first with old tool, then with new).
  // A boolean flag gets consumed by the no-op first fire; the real
  // change then closes our panel. 300ms covers React batched commits.
  state.suppressUntil = Date.now() + 300;
  try { api.setActiveTool({ type: "selection" }); } catch (_) {}
  // Defensive restores: if React still wipes the panel during commit,
  // re-mount at micro/raf/timeout boundaries. Idempotent.
  const restore = () => {
    if (!state.sideOpen || cfg.panelMode !== "side") return;
    if (view.contentEl.querySelector("#" + SIDE_PANEL_ID)) return;
    buildSidePanel();
    const ssa = view.contentEl.querySelector(".selected-shape-actions-container");
    ssa?.classList.add("paper-mode-open");
  };
  Promise.resolve().then(restore);
  requestAnimationFrame(restore);
  setTimeout(restore, 50);
  setTimeout(restore, 150);
  setTimeout(restore, 400);
}

// Auto-close on tool / selection change so Paper Mode behaves like a
// native tool button: only one side bar at a time. Watches api.onChange.
function installToolWatcher() {
  const prior = view._paperModeToolWatcher;
  if (prior?.cleanup) prior.cleanup();
  const initial = api.getAppState();
  let lastTool = initial.activeTool?.type;
  let lastSel  = Object.keys(initial.selectedElementIds || {}).length;
  const off = api.onChange((_els, app) => {
    const tool = app.activeTool?.type;
    const sel  = Object.keys(app.selectedElementIds || {}).length;
    const toolChanged = tool !== lastTool;
    const selGained   = sel > 0 && lastSel === 0;
    lastTool = tool; lastSel = sel;
    if (state.suppressUntil && Date.now() < state.suppressUntil) return;
    if (!state.sideOpen || cfg.panelMode !== "side") return;
    if (toolChanged || selGained) closeSidePanel();
  });
  view._paperModeToolWatcher = {
    cleanup: () => { try { off?.(); } catch (_) {} view._paperModeToolWatcher = null; }
  };
}

// ---------- shared content builder ----------
// Renders enable toggle, pattern grid, color swatches, spacing slider,
// and layout-mode switcher into `host`. Used by both panel variants.
function buildPanelContent(host) {
  const toggleRow = host.createDiv({ cls: "pm-toggle-row" });
  toggleRow.createDiv({ cls: "pm-label", text: "ENABLED" });
  const switchEl = toggleRow.createDiv({ cls: "pm-switch" });
  const setSwitch = (on) => switchEl.classList.toggle("is-on", on);
  setSwitch(cfg.enabled);
  switchEl.onclick = () => {
    cfg.enabled = !cfg.enabled;
    setSwitch(cfg.enabled);
    state.dirty = true; refresh(); persistSoon();
  };

  host.createDiv({ cls: "pm-row" }).createDiv({ cls: "pm-label", text: "PATTERN" });
  const grid = host.createDiv({ cls: "pm-pattern-grid pm-section" });
  const chipEls = {};
  for (const [k, label] of Object.entries(MODE_OPTIONS)) {
    const chip = grid.createDiv({ cls: "pm-pattern-chip", attr: { title: label } });
    const preview = buildSVG(k, 14, "#9e9e9e");
    chip.style.backgroundImage = `url("${preview.url}")`;
    chip.style.backgroundSize = `${preview.w}px ${preview.h}px`;
    chipEls[k] = chip;
    chip.onclick = () => {
      cfg.mode = k;
      for (const key of Object.keys(chipEls)) chipEls[key].classList.toggle("is-active", key === k);
      state.dirty = true; refresh(); persistSoon();
    };
    if (k === cfg.mode) chip.classList.add("is-active");
  }

  host.createDiv({ cls: "pm-row" }).createDiv({ cls: "pm-label", text: "COLOR" });
  const swatchRow = host.createDiv({ cls: "pm-color-swatches pm-section" });
  const swatchEls = [];
  for (const c of COLOR_PRESETS) {
    const sw = swatchRow.createDiv({ cls: "pm-swatch", attr: { title: c } });
    sw.style.background = c;
    swatchEls.push({ el: sw, color: c });
    sw.onclick = () => {
      cfg.color = c;
      customPicker.value = c;
      swatchEls.forEach(s => s.el.classList.toggle("is-active", s.color === c));
      state.dirty = true; refresh(); persistSoon();
    };
    if (c.toLowerCase() === cfg.color.toLowerCase()) sw.classList.add("is-active");
  }
  const customPicker = document.createElement("input");
  customPicker.type = "color";
  customPicker.className = "pm-color-custom";
  customPicker.value = cfg.color;
  customPicker.title = "Custom color";
  customPicker.oninput = (e) => {
    cfg.color = e.target.value;
    swatchEls.forEach(s => s.el.classList.toggle("is-active", s.color.toLowerCase() === cfg.color.toLowerCase()));
    state.dirty = true; refresh(); persistSoon();
  };
  swatchRow.appendChild(customPicker);

  const spacingHeader = host.createDiv({ cls: "pm-row" });
  spacingHeader.createDiv({ cls: "pm-label", text: "SPACING" });
  const spacingValue = spacingHeader.createDiv({ cls: "pm-value", text: `${cfg.spacing}px` });
  const sliderRow = host.createDiv({ cls: "pm-slider-row pm-section" });
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = SPACING_MIN;
  slider.max = SPACING_MAX;
  slider.step = 1;
  slider.value = Math.max(SPACING_MIN, Math.min(SPACING_MAX, cfg.spacing));
  slider.oninput = (e) => {
    cfg.spacing = parseInt(e.target.value, 10);
    spacingValue.textContent = `${cfg.spacing}px`;
    state.dirty = true; refresh(); persistSoon();
  };
  sliderRow.appendChild(slider);

  const modeRow = host.createDiv({ cls: "pm-row" });
  modeRow.createDiv({ cls: "pm-label", text: "LAYOUT" });
  const modeBtn = modeRow.createDiv({ cls: "pm-value", text: cfg.panelMode === "side" ? "Side ⇄ Float" : "Float ⇄ Side" });
  modeBtn.style.cursor = "pointer";
  modeBtn.style.color = "var(--text-accent)";
  modeBtn.onclick = () => {
    cfg.panelMode = cfg.panelMode === "side" ? "float" : "side";
    state.dirty = true; persistSoon();
    document.getElementById(PANEL_ID)?.remove();
    view.contentEl.querySelector("#" + SIDE_PANEL_ID)?.remove();
    togglePanel();
  };
}

// ---------- side panel: rich UI inside native .Island ----------
// Mounts an .Island wrapper inside .App-menu_top__left (the Stack that
// holds the hamburger + native selected-shape-actions). Reuses the
// float panel's UX: header with title + close, pattern chip grid with
// previews, all color swatches, switch toggle, slider with value
// readout. Native .Island gives bg/shadow/radius/typography.

// Color picker popover — byte-match Excalidraw's native markup so the
// existing scoped CSS (`.Island`, `.color-picker-content`, `.color-
// picker__button[style="--swatch-color: ..."]`, `.color-picker__input-
// label`, etc.) paints it identically. Mounted INSIDE `.excalidraw`
// so those scoped rules match.
function buildColorPopover(onPick, currentColor) {
  // Native Excalidraw palette (15 colors + hotkey letters).
  const PALETTE = [
    { c: "#ffffff", k: "w", dark: false },
    { c: "#e9ecef", k: "e", dark: false },
    { c: "#1e1e1e", k: "r", dark: true  },
    { c: "#eaddd7", k: "t", dark: false },
    { c: "#cfcfcf", k: "y", dark: false },
    { c: "#99e9f2", k: "a", dark: false },
    { c: "#a5d8ff", k: "s", dark: false },
    { c: "#d0bfff", k: "d", dark: false },
    { c: "#eebefa", k: "f", dark: false },
    { c: "#fcc2d7", k: "g", dark: false },
    { c: "#b2f2bb", k: "z", dark: false },
    { c: "#96f2d7", k: "x", dark: false },
    { c: "#ffec99", k: "c", dark: false },
    { c: "#ffd8a8", k: "v", dark: false },
    { c: "#ffc9c9", k: "b", dark: false },
  ];
  const outer = document.createElement("div");
  outer.id = "paper-mode-color-popover";
  outer.style.cssText = "position:fixed;z-index:9999;";
  const island = document.createElement("div");
  island.className = "Island";
  island.style.setProperty("--padding", "3");
  island.style.maxWidth = "13rem";
  outer.appendChild(island);
  const dlg = document.createElement("div");
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-label", "Color picker");
  island.appendChild(dlg);
  const content = document.createElement("div");
  content.className = "color-picker-content properties-content";
  content.tabIndex = -1;
  dlg.appendChild(content);

  // Colors section
  const cSec = document.createElement("div");
  content.appendChild(cSec);
  const cHead = document.createElement("div");
  cHead.className = "color-picker__heading";
  cHead.textContent = "Colors";
  cSec.appendChild(cHead);
  const cGrid = document.createElement("div");
  cGrid.className = "color-picker-content--default";
  cSec.appendChild(cGrid);
  for (const { c, k, dark } of PALETTE) {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    const isActive = currentColor && c.toLowerCase() === currentColor.toLowerCase();
    b.className = "color-picker__button color-picker__button--large has-outline" + (isActive ? " active" : "");
    b.title = `${c} — ${k}`;
    b.setAttribute("aria-label", `${c} — ${k}`);
    b.style.setProperty("--swatch-color", c);
    const o = document.createElement("div");
    o.className = "color-picker__button-outline";
    b.appendChild(o);
    const hk = document.createElement("div");
    hk.className = "color-picker__button__hotkey-label";
    hk.style.color = dark ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
    hk.textContent = k;
    b.appendChild(hk);
    b.onclick = (e) => { e.stopPropagation(); onPick(c); outer.remove(); };
    cGrid.appendChild(b);
  }

  // Hex code section
  const hSec = document.createElement("div");
  content.appendChild(hSec);
  const hHead = document.createElement("div");
  hHead.className = "color-picker__heading";
  hHead.textContent = "Hex code";
  hSec.appendChild(hHead);
  const hRow = document.createElement("div");
  hRow.className = "color-picker__input-label";
  hSec.appendChild(hRow);
  const hash = document.createElement("div");
  hash.className = "color-picker__input-hash";
  hash.textContent = "#";
  hRow.appendChild(hash);
  const hex = document.createElement("input");
  hex.spellcheck = false;
  hex.className = "color-picker-input";
  hex.setAttribute("aria-label", "Hex code");
  hex.tabIndex = -1;
  hex.placeholder = "Color";
  hex.value = (currentColor || "").replace(/^#/, "");
  hex.style.cssText = "border:0;padding:0;background:transparent;outline:none;";
  hRow.appendChild(hex);
  const sep = document.createElement("div");
  sep.style.cssText = "width:1px;height:1.25rem;background-color:var(--icon-fill-color);";
  hRow.appendChild(sep);
  // Visible <input type="color"> — clicking opens the browser native
  // OS picker adjacent to it. Styled to look like native eyedropper.
  const native = document.createElement("input");
  native.type = "color";
  native.value = currentColor || "#000000";
  native.style.cssText = "margin:auto -0.625rem auto 4px;cursor:pointer;border:0;background:transparent;width:24px;height:24px;padding:0;";
  native.title = "OS color picker";
  hRow.appendChild(native);

  hex.addEventListener("change", () => {
    const v = hex.value.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3,8}$/i.test(v)) { onPick("#" + v); outer.remove(); }
  });
  native.addEventListener("input",  (e) => onPick(e.target.value));
  native.addEventListener("change", () => outer.remove());

  return outer;
}

function buildSidePanel() {
  if (!document.getElementById(SIDE_STYLE_ID)) {
    const s = document.createElement("style");
    s.id = SIDE_STYLE_ID;
    s.textContent = `
      /* Toolbar button "active" state — full primary purple matching
         the native selected shape-tool look. Auto-close via tool
         watcher guarantees only one button is ever active at a time. */
      #${TOOLBAR_BTN_ID}[data-state="open"] {
        background: var(--color-primary, var(--interactive-accent)) !important;
      }
      #${TOOLBAR_BTN_ID}[data-state="open"] svg { stroke: var(--color-on-primary, white) !important; }
      #${TOOLBAR_BTN_ID}[data-state="open"] svg circle { fill: var(--color-on-primary, white) !important; }
      /* When Paper Mode panel open, hide any sibling native
         selected-shape-actions section so the two side bars never stack. */
      .selected-shape-actions-container.paper-mode-open > section:not(#${SIDE_PANEL_ID}) { display: none !important; }
      /* Visual mutual-exclusion: while paper panel is open, suppress
         the active-tool highlight in the shape toolbar so only Paper
         Mode looks active. CSS-only — no api.setActiveTool fight. */
      body.paper-mode-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon,
      body.paper-mode-active .App-toolbar label.ToolIcon:has(input:checked) > .ToolIcon__icon {
        background: transparent !important;
        color: var(--icon-fill-color) !important;
      }
      body.paper-mode-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon svg,
      body.paper-mode-active .App-toolbar label.ToolIcon:has(input:checked) > .ToolIcon__icon svg,
      body.paper-mode-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon svg g {
        stroke: var(--icon-fill-color) !important;
      }
      body.paper-mode-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon .ToolIcon__keybinding,
      body.paper-mode-active .App-toolbar label.ToolIcon:has(input:checked) > .ToolIcon__icon .ToolIcon__keybinding {
        color: var(--icon-fill-color) !important;
      }

      /* Side panel — native .Island sizing (no width override); native typography */
      #${SIDE_PANEL_ID} { max-height: calc(100vh - 120px); overflow-y: auto; }

      /* Enabled row — h3 label paired with iOS switch */
      #${SIDE_PANEL_ID} .pm-enabled-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 2px 0;
      }
      #${SIDE_PANEL_ID} .pm-enabled-row > h3 { margin: 0; }
      #${SIDE_PANEL_ID} .pm-switch {
        position: relative; width: 30px; height: 18px; border-radius: 9px;
        background: var(--default-border-color); cursor: pointer;
        transition: background 0.15s;
      }
      #${SIDE_PANEL_ID} .pm-switch::after {
        content: ""; position: absolute; top: 2px; left: 2px;
        width: 14px; height: 14px; border-radius: 50%;
        background: var(--island-bg-color, white);
        box-shadow: 0 1px 2px rgba(0,0,0,.25);
        transition: transform 0.15s;
      }
      #${SIDE_PANEL_ID} .pm-switch.is-on { background: var(--color-primary); }
      #${SIDE_PANEL_ID} .pm-switch.is-on::after { transform: translateX(12px); }

      /* Pattern chips — smaller, native-button-sized */
      #${SIDE_PANEL_ID} .pm-pattern-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 2px 0;
      }
      #${SIDE_PANEL_ID} .pm-pattern-chip {
        aspect-ratio: 1; border: 1px solid var(--default-border-color);
        border-radius: var(--border-radius-lg, 4px); cursor: pointer;
        background-color: var(--island-bg-color);
        background-repeat: repeat;
        transition: border-color 0.1s, transform 0.1s;
      }
      #${SIDE_PANEL_ID} .pm-pattern-chip:hover { transform: scale(1.05); border-color: var(--color-primary); }
      #${SIDE_PANEL_ID} .pm-pattern-chip.is-active {
        border: 2px solid var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
      }

      /* Layout row */
      #${SIDE_PANEL_ID} .pm-layout-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 2px 0;
      }
      #${SIDE_PANEL_ID} .pm-layout-row > h3 { margin: 0; }
      #${SIDE_PANEL_ID} .pm-layout-link {
        cursor: pointer; font-size: 0.75rem;
        color: var(--color-primary);
      }
      #${SIDE_PANEL_ID} .pm-layout-link:hover { text-decoration: underline; }
    `;
    document.head.appendChild(s);
  }

  // Mount inside .App-menu_top__left — native CSS scope applies so
  // .Island, .color-picker__button, h3, fieldset etc. paint correctly.
  const container =
    view.contentEl.querySelector(".App-menu_top__left") ||
    view.contentEl.querySelector(".excalidraw") ||
    view.contentEl;

  // Wrap in <section> like native: <section.selected-shape-actions> →
  // <div.Island.App-menu__left> → <div.selected-shape-actions>. Match
  // gives us native margin, padding, font, colors for free.
  const wrapSec = document.createElement("section");
  wrapSec.id = SIDE_PANEL_ID;
  wrapSec.className = "selected-shape-actions zen-mode-transition";
  wrapSec.setAttribute("aria-label", "Paper Mode actions");
  const panel = document.createElement("div");
  panel.className = "Island App-menu__left";
  panel.style.setProperty("--padding", "2");
  wrapSec.appendChild(panel);
  container.appendChild(wrapSec);
  // Mark container so CSS hides any sibling native selected-shape-actions.
  const ssaContainer = view.contentEl.querySelector(".selected-shape-actions-container");
  ssaContainer?.classList.add("paper-mode-open");

  const inner = document.createElement("div");
  inner.className = "selected-shape-actions";
  panel.appendChild(inner);

  // ---- Enabled (h3 paired with iOS switch) ----
  const enRow = document.createElement("div");
  enRow.className = "pm-enabled-row";
  inner.appendChild(enRow);
  const enH3 = document.createElement("h3");
  enH3.setAttribute("aria-hidden", "true");
  enH3.textContent = "Enabled";
  enRow.appendChild(enH3);
  const switchEl = document.createElement("div");
  switchEl.className = "pm-switch";
  const setSwitch = (on) => switchEl.classList.toggle("is-on", on);
  setSwitch(cfg.enabled);
  switchEl.onclick = () => {
    cfg.enabled = !cfg.enabled;
    setSwitch(cfg.enabled);
    state.dirty = true; refresh(); persistSoon();
  };
  enRow.appendChild(switchEl);

  // ---- Pattern (h3 header + chip grid with SVG previews) ----
  // Created here but appended AFTER the Color section below so the
  // final order is Enabled → Color → Pattern → Spacing → Opacity → Layout.
  const patSection = document.createElement("div");
  const patH3 = document.createElement("h3");
  patH3.setAttribute("aria-hidden", "true");
  patH3.textContent = "Pattern";
  patSection.appendChild(patH3);
  const grid = document.createElement("div");
  grid.className = "pm-pattern-grid";
  patSection.appendChild(grid);
  // SVG previews use literal #9e9e9e so the encoded data: URL renders.
  // CSS vars inside data URIs do not resolve; need a concrete color.
  const PREVIEW_COLOR = "#9e9e9e";
  const chipEls = {};
  for (const [k, label] of Object.entries(MODE_OPTIONS)) {
    const chip = document.createElement("div");
    chip.className = "pm-pattern-chip";
    chip.title = label;
    const preview = buildSVG(k, 14, PREVIEW_COLOR);
    chip.style.backgroundImage = `url("${preview.url}")`;
    chip.style.backgroundSize = `${preview.w}px ${preview.h}px`;
    if (k === cfg.mode) chip.classList.add("is-active");
    chip.onclick = () => {
      cfg.mode = k;
      for (const kk of Object.keys(chipEls)) chipEls[kk].classList.toggle("is-active", kk === k);
      state.dirty = true; refresh(); persistSoon();
    };
    chipEls[k] = chip;
    grid.appendChild(chip);
  }

  // ---- Color (native color-picker-container) ----
  const colSection = document.createElement("div");
  inner.appendChild(colSection);
  // Now append Pattern after Color so visual order is Color → Pattern.
  inner.appendChild(patSection);
  const colH3 = document.createElement("h3");
  colH3.setAttribute("aria-hidden", "true");
  colH3.textContent = "Color";
  colSection.appendChild(colH3);
  const cpcOuter = document.createElement("div");
  colSection.appendChild(cpcOuter);
  const cpc = document.createElement("div");
  cpc.className = "color-picker-container";
  cpc.setAttribute("role", "dialog");
  cpc.setAttribute("aria-modal", "true");
  cpcOuter.appendChild(cpc);
  const topPicks = document.createElement("div");
  topPicks.className = "color-picker__top-picks";
  cpc.appendChild(topPicks);
  const swatchBtns = {};
  const refreshActiveColor = () => {
    activeBtn.style.setProperty("--swatch-color", cfg.color);
    for (const [c, b] of Object.entries(swatchBtns)) {
      b.classList.toggle("active", c.toLowerCase() === cfg.color.toLowerCase());
    }
  };
  for (const c of COLOR_PRESETS.slice(0, 5)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "color-picker__button";
    b.title = c;
    b.style.setProperty("--swatch-color", c);
    const o = document.createElement("div"); o.className = "color-picker__button-outline"; b.appendChild(o);
    b.onclick = () => {
      cfg.color = c;
      refreshActiveColor();
      state.dirty = true; refresh(); persistSoon();
    };
    swatchBtns[c] = b;
    topPicks.appendChild(b);
  }
  const sep = document.createElement("div");
  sep.style.cssText = "width:1px;height:1rem;background-color:var(--default-border-color);margin:0 auto;";
  cpc.appendChild(sep);
  const activeBtn = document.createElement("button");
  activeBtn.type = "button";
  activeBtn.className = "color-picker__button active-color properties-trigger";
  activeBtn.title = "Pick color";
  activeBtn.setAttribute("aria-label", "Color");
  activeBtn.style.setProperty("--swatch-color", cfg.color);
  const ao = document.createElement("div"); ao.className = "color-picker__button-outline"; activeBtn.appendChild(ao);
  cpc.appendChild(activeBtn);
  refreshActiveColor();

  // Click → open Excalidraw-style anchored color popover (big swatches
  // grid + hex input + native <input type="color"> trigger). Positioned
  // to the right of the active-color button via fixed coords (Radix-
  // popper style), not as a body-rooted free popup.
  activeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const existing = view.contentEl.querySelector("#paper-mode-color-popover");
    if (existing) { existing.remove(); return; }
    const pop = buildColorPopover((c) => {
      cfg.color = c;
      refreshActiveColor();
      state.dirty = true;
      // applyPattern now uses CSS-injected !important rule (survives
      // React re-renders). One call is enough.
      refresh();
      persistSoon();
    }, cfg.color);
    // Mount inside .excalidraw for native CSS scope. Position via
    // absolute coords relative to the host — `position: fixed` becomes
    // unreliable because Excalidraw's container can have transforms
    // (zen-mode-transition, sidebar open/close) that anchor fixed
    // descendants to itself rather than the viewport.
    const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
    host.appendChild(pop);
    const btnRect = activeBtn.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    pop.style.position = "absolute";
    pop.style.left = `${Math.round(btnRect.right - hostRect.left + 28)}px`;
    pop.style.top  = `${Math.round(btnRect.top  - hostRect.top - 4)}px`;
    // Defer outside-click bind so the opening click doesn't immediately close.
    setTimeout(() => {
      const onDown = (ev) => {
        if (pop.contains(ev.target) || activeBtn.contains(ev.target)) return;
        pop.remove();
        document.removeEventListener("mousedown", onDown, true);
      };
      document.addEventListener("mousedown", onDown, true);
    }, 0);
  });

  // ---- Spacing (label + static value to the right of label, then range) ----
  // Static readout instead of value-bubble — bubble that follows the
  // thumb feels jumpy; user prefers a fixed-position number.
  const spLbl = document.createElement("label");
  spLbl.className = "control-label";
  spLbl.style.cssText = "display:flex;flex-direction:column;gap:4px;";
  const spHead = document.createElement("div");
  spHead.style.cssText = "display:flex;align-items:center;justify-content:space-between;";
  const spName = document.createElement("span"); spName.textContent = "Spacing";
  const spVal  = document.createElement("span");
  spVal.textContent = String(cfg.spacing);
  spVal.style.cssText = "font-variant-numeric:tabular-nums;color:var(--text-muted,var(--text-faint));";
  spHead.appendChild(spName); spHead.appendChild(spVal);
  spLbl.appendChild(spHead);
  const range = document.createElement("input");
  range.type = "range";
  range.min = SPACING_MIN; range.max = SPACING_MAX; range.step = 1;
  range.value = String(cfg.spacing);
  range.className = "range-input";
  range.style.width = "100%";
  spLbl.appendChild(range);
  range.oninput = (e) => {
    cfg.spacing = parseInt(e.target.value, 10);
    spVal.textContent = String(cfg.spacing);
    state.dirty = true; refresh(); persistSoon();
  };
  inner.appendChild(spLbl);

  // ---- Opacity (label + static value, same pattern as Spacing) ----
  const opLbl = document.createElement("label");
  opLbl.className = "control-label";
  opLbl.style.cssText = "display:flex;flex-direction:column;gap:4px;";
  const opHead = document.createElement("div");
  opHead.style.cssText = "display:flex;align-items:center;justify-content:space-between;";
  const opName = document.createElement("span"); opName.textContent = "Opacity";
  const opVal  = document.createElement("span");
  opVal.textContent = String(cfg.opacity ?? 100);
  opVal.style.cssText = "font-variant-numeric:tabular-nums;color:var(--text-muted,var(--text-faint));";
  opHead.appendChild(opName); opHead.appendChild(opVal);
  opLbl.appendChild(opHead);
  const opRange = document.createElement("input");
  opRange.type = "range";
  opRange.min = 0; opRange.max = 100; opRange.step = 10;
  opRange.value = String(cfg.opacity ?? 100);
  opRange.className = "range-input";
  opRange.style.width = "100%";
  opLbl.appendChild(opRange);
  opRange.oninput = (e) => {
    cfg.opacity = parseInt(e.target.value, 10);
    opVal.textContent = String(cfg.opacity);
    state.dirty = true; refresh(); persistSoon();
  };
  inner.appendChild(opLbl);

  // ---- Layout row (text link to flip to float) ----
  const layRow = document.createElement("div");
  layRow.className = "pm-layout-row";
  inner.appendChild(layRow);
  const layH3 = document.createElement("h3");
  layH3.setAttribute("aria-hidden", "true");
  layH3.textContent = "Layout";
  layRow.appendChild(layH3);
  const layLink = document.createElement("div");
  layLink.className = "pm-layout-link";
  layLink.textContent = "Float ⇄ Side";
  layLink.onclick = () => {
    cfg.panelMode = "float";
    state.dirty = true; persistSoon();
    state.sideOpen = false;
    wrapSec._unbindDismiss?.();
    wrapSec.remove();
    document.getElementById(PANEL_ID)?.remove();
    togglePanel();
  };
  layRow.appendChild(layLink);

  // ---- Esc closes ----
  // Bind dismiss on the wrapper (#SIDE_PANEL_ID) so ensureSidePanel /
  // togglePanel can find and unbind it across re-renders. Track active
  // handler on `state.escHandler` so rebuilds (after Excalidraw re-
  // renders the container) don't stack duplicate listeners.
  if (state.escHandler) {
    document.removeEventListener("keydown", state.escHandler, true);
    state.escHandler = null;
  }
  function onEsc(e) {
    if (e.key !== "Escape") return;
    // Use the canonical close path so body class + container class +
    // color popover all get cleaned up (otherwise native panel stays
    // hidden + tool-active highlight stays suppressed after Esc).
    closeSidePanel();
  }
  wrapSec._bindDismiss = () => {
    state.escHandler = onEsc;
    document.addEventListener("keydown", onEsc, true);
  };
  wrapSec._unbindDismiss = () => {
    document.removeEventListener("keydown", onEsc, true);
    if (state.escHandler === onEsc) state.escHandler = null;
  };

  // NOTE: refresh() intentionally NOT called here. buildSidePanel can
  // run from ensureSidePanel's MO loop; if we trigger applyPattern
  // (which calls api.updateScene), React re-renders the toolbar area
  // and wipes our just-mounted panel → MO fires again → infinite loop.
  // Pattern apply is the caller's job (togglePanel / settings change).
  wrapSec._bindDismiss();
}


// ---------- float panel (legacy, kept behind panelMode = "float") ----------
function buildFloatPanel() {

if (!document.getElementById(STYLE_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_ID;
  styleTag.textContent = `
    #${PANEL_ID} {
      position: absolute; top: 80px; right: 16px;
      width: 280px; padding: 12px 14px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.28);
      z-index: 50; font-size: 13px;
      font-family: var(--font-interface);
    }
    #${PANEL_ID} .pm-header {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:8px; margin-bottom:10px;
      border-bottom:1px solid var(--background-modifier-border);
    }
    #${PANEL_ID} .pm-title {
      font-weight:600; font-size:14px; display:flex; align-items:center; gap:6px;
    }
    #${PANEL_ID} .pm-title svg { color: var(--text-accent); }
    #${PANEL_ID} .pm-close {
      cursor:pointer; padding:2px 8px; border-radius:4px;
      color: var(--text-muted); user-select:none;
    }
    #${PANEL_ID} .pm-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }

    #${PANEL_ID} .pm-row {
      display:flex; align-items:center; justify-content:space-between;
      padding: 6px 0;
    }
    #${PANEL_ID} .pm-row > .pm-label {
      font-size: 12px; color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.5px; font-weight: 600;
    }
    #${PANEL_ID} .pm-row > .pm-value {
      font-size: 12px; color: var(--text-normal); font-variant-numeric: tabular-nums;
    }

    #${PANEL_ID} .pm-section { margin-top: 4px; margin-bottom: 8px; }

    #${PANEL_ID} .pm-pattern-grid {
      display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;
    }
    #${PANEL_ID} .pm-pattern-chip {
      aspect-ratio: 1; border: 1px solid var(--background-modifier-border);
      border-radius: 6px; cursor:pointer;
      background-color: var(--background-secondary);
      background-repeat: repeat; background-size: 14px 14px;
      transition: border-color 0.1s, transform 0.1s;
    }
    #${PANEL_ID} .pm-pattern-chip:hover { transform: scale(1.05); }
    #${PANEL_ID} .pm-pattern-chip.is-active {
      border: 2px solid var(--interactive-accent);
      box-shadow: 0 0 0 1px var(--interactive-accent);
    }

    #${PANEL_ID} .pm-color-swatches { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    #${PANEL_ID} .pm-swatch {
      width:22px; height:22px; border-radius:50%;
      cursor:pointer; border:2px solid transparent;
      box-shadow: inset 0 0 0 1px var(--background-modifier-border);
    }
    #${PANEL_ID} .pm-swatch.is-active {
      border-color: var(--interactive-accent);
    }
    #${PANEL_ID} .pm-color-custom {
      width:22px; height:22px; padding:0; border:1px dashed var(--background-modifier-border);
      border-radius:50%; cursor:pointer; background:transparent;
    }

    #${PANEL_ID} .pm-slider-row { display:flex; align-items:center; gap:8px; }
    #${PANEL_ID} .pm-slider-row input[type=range] { flex:1; accent-color: var(--interactive-accent); }
    #${PANEL_ID} .pm-spacing-value {
      min-width:32px; text-align:right; font-size:12px; color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    #${PANEL_ID} .pm-toggle-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0 8px; }
    #${PANEL_ID} .pm-switch {
      position:relative; width:36px; height:20px; border-radius:10px;
      background: var(--background-modifier-border); cursor:pointer;
      transition: background 0.15s;
    }
    #${PANEL_ID} .pm-switch::after {
      content:""; position:absolute; top:2px; left:2px;
      width:16px; height:16px; border-radius:50%;
      background:white; transition: transform 0.15s;
    }
    #${PANEL_ID} .pm-switch.is-on { background: var(--interactive-accent); }
    #${PANEL_ID} .pm-switch.is-on::after { transform: translateX(16px); }
  `;
  document.head.appendChild(styleTag);
}

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.classList.add("excali-floating-panel");
  // Mount inside the Excalidraw container so Obsidian chrome (sidebar /
  // ribbon / titlebar / tab header / file tree) naturally stays above —
  // panel only renders over the canvas area.
  const _panelHost =
    view.contentEl.querySelector(".excalidraw") || view.contentEl;
  if (_panelHost && getComputedStyle(_panelHost).position === "static") {
    _panelHost.style.position = "relative";
  }
  _panelHost.appendChild(panel);
  cfRaisePanel(panel);
  panel.addEventListener("mousedown", () => cfRaisePanel(panel), true);

  const header = panel.createDiv({ cls: "pm-header" });
  const titleEl = header.createDiv({ cls: "pm-title" });
  titleEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/><circle cx="12" cy="8" r="0.8" fill="currentColor"/><circle cx="16" cy="8" r="0.8" fill="currentColor"/><circle cx="8" cy="12" r="0.8" fill="currentColor"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/><circle cx="16" cy="12" r="0.8" fill="currentColor"/><circle cx="8" cy="16" r="0.8" fill="currentColor"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/><circle cx="16" cy="16" r="0.8" fill="currentColor"/></svg> Paper Mode`;
  const closeBtn = header.createDiv({ cls: "pm-close", text: "✕" });
  closeBtn.onclick = () => { panel.style.display = "none"; };

  // Draggable header
  header.style.cursor = "grab";
  header.style.userSelect = "none";
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener("mousedown", (e) => {
    if (e.target.closest(".pm-close")) return;
    const r = panel.getBoundingClientRect();
    dragging = true; ox = e.clientX - r.left; oy = e.clientY - r.top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });
  // Drag clamp uses the host (.excalidraw) rect, not the window — panel
  // is position:absolute inside the host, so left/top are host-relative.
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const hostRect = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const left = Math.max(m, Math.min(hostRect.width  - w - m, e.clientX - hostRect.left - ox));
    const top  = Math.max(m, Math.min(hostRect.height - h - m, e.clientY - hostRect.top  - oy));
    panel.style.setProperty("left",  `${left}px`, "important");
    panel.style.setProperty("top",   `${top}px`,  "important");
    panel.style.setProperty("right", "auto", "important");
  });
  window.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; header.style.cursor = "grab"; }
  });
  window.addEventListener("resize", () => {
    const hostRect = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const cur = { left: panel.offsetLeft, top: panel.offsetTop };
    if (cur.left + w > hostRect.width  - m) panel.style.setProperty("left", `${Math.max(m, hostRect.width  - w - m)}px`, "important");
    if (cur.top  + h > hostRect.height - m) panel.style.setProperty("top",  `${Math.max(m, hostRect.height - h - m)}px`, "important");
    if (cur.left < m) panel.style.setProperty("left", `${m}px`, "important");
    if (cur.top  < m) panel.style.setProperty("top",  `${m}px`, "important");
  });

  buildPanelContent(panel);
  refresh();
}

// ---------- boot ----------
installMounts();
installToolWatcher();
// Auto-startup invocation (via Templater) installs the toolbar button +
// MO but does NOT open the side panel — user clicks the toolbar icon to
// open. Manual invocation (script panel / command palette) toggles the
// panel like before, but only if neither variant is already open.
const _isAutoStartup = !!window.__paperModeAutoStartup;
const _alreadyOpen =
  state.sideOpen ||
  !!document.getElementById(PANEL_ID) ||
  !!view.contentEl.querySelector("#" + SIDE_PANEL_ID);
if (!_alreadyOpen && !_isAutoStartup) togglePanel();

/*
```
*/
