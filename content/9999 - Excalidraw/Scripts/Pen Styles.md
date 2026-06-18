---
excalidraw-plugin: parsed
---

/*
Pen Styles — combined floating panel: preset chips + integrated fine-tune section.
GoodNotes-style pressure pens for iPad + Apple Pencil. Uses native Excalidraw
Perfect-Freehand customPen API (`appState.currentStrokeOptions`).

Pen Settings.md is a thin wrapper that opens this same panel with the fine-tune
section auto-expanded.

```javascript
*/

// =========================================================================================
// TDZ-safe top-level state
// =========================================================================================
var PANEL_ID = "pen-styles-panel";
var STYLE_ID = "pen-styles-style";
var KEY      = "Pen Styles config";

var EASINGS = [
  "linear","easeInQuad","easeOutQuad","easeInOutQuad",
  "easeInCubic","easeOutCubic","easeInOutCubic",
  "easeInSine","easeOutSine","easeInOutSine"
];

var COLOR_PRESETS = [
  "#000000","#1a1a2e","#0b1d51","#d32f2f","#e8590c",
  "#fcc419","#2f9e44","#1c7ed6","#9c36b5","#ffffff"
];

// Lucide-style per-pen icons (inline body paths, stroked in preset color at runtime).
var PEN_ICONS = {
  "Fine Pen":    `<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>`,
  "Ballpoint":   `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  "Fountain":    `<path d="m20.24 12.24-8.49 8.49a4.24 4.24 0 1 1-6-6l8.49-8.49a3 3 0 0 1 4.24 0l1.76 1.76a3 3 0 0 1 0 4.24z"/><path d="M16 8 2 22"/><path d="M17.5 15h-12"/>`,
  "Brush":       `<path d="M9.06 11.9a8 8 0 0 1 2.84-2.83l9.32-5.31a1 1 0 0 1 1.42 1.42l-5.31 9.32a8 8 0 0 1-2.83 2.84"/><path d="M7.81 14.18a4 4 0 1 0 5.66 5.66c1.36-1.36 2-3.84 1.34-7-3.16-.66-5.64 0-7 1.34Z"/>`,
  "Pencil":      `<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/><path d="M11 13 2 22"/>`,
  "Marker":      `<path d="M2 18 18 2l4 4L6 22z"/><path d="m12 8 4 4"/><path d="M2 22h20"/>`,
  "Highlighter": `<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8z"/>`,
  "Native iPad": `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
  "Mask Highlighter": `<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8z"/>`
};
function penIconSvg(name, _color) {
  const body = PEN_ICONS[name] || PEN_ICONS["Fine Pen"];
  // Native Excalidraw ToolIcon SVG markup: stroke=var(--icon-fill-color) +
  // <g stroke-width="1.5"> wrapper. Lets native .ToolIcon[checked] CSS paint
  // the icon white-on-primary identically to shape buttons.
  return `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="var(--icon-fill-color)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5">${body}</g></svg>`;
}

// Native Apple Pencil feel: simulatePressure:false, low streamline+smoothing.
var BUILTIN_PRESETS = {
  "Fine Pen": {
    strokeWidth: 1.5, strokeColor: "#000000", opacity: 100,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.1, smoothing: 0.08, streamline: 0.02, easing: "linear",
        simulatePressure: false,
        start: { cap: true, taper: 0, easing: "linear" },
        end:   { cap: true, taper: 0, easing: "linear" } } } },
  "Ballpoint": {
    strokeWidth: 2.5, strokeColor: "#1a1a2e", opacity: 100,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.2, smoothing: 0.1, streamline: 0.05, easing: "linear",
        simulatePressure: false,
        start: { cap: true, taper: 0, easing: "linear" },
        end:   { cap: true, taper: 0, easing: "linear" } } } },
  "Fountain": {
    strokeWidth: 4, strokeColor: "#0b1d51", opacity: 100,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.75, smoothing: 0.4, streamline: 0.25, easing: "easeInOutCubic",
        simulatePressure: false,
        start: { cap: true, taper: 20, easing: "easeOutQuad" },
        end:   { cap: true, taper: 40, easing: "easeInQuad" } } } },
  "Brush": {
    strokeWidth: 8, strokeColor: "#222222", opacity: 100,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.85, smoothing: 0.5, streamline: 0.2, easing: "easeInQuad",
        simulatePressure: false,
        start: { cap: true, taper: 30, easing: "easeOutQuad" },
        end:   { cap: true, taper: 30, easing: "easeInQuad" } } } },
  "Pencil": {
    strokeWidth: 3, strokeColor: "#333333", opacity: 80,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.4, smoothing: 0.08, streamline: 0.03, easing: "linear",
        simulatePressure: false,
        start: { cap: true, taper: 2, easing: "linear" },
        end:   { cap: true, taper: 2, easing: "linear" } } } },
  "Marker": {
    strokeWidth: 6, strokeColor: "#111111", opacity: 100,
    penOptions: { highlighter: false, constantPressure: true, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0, smoothing: 0.35, streamline: 0.25, easing: "linear",
        simulatePressure: false,
        start: { cap: false, taper: 0, easing: "linear" },
        end:   { cap: false, taper: 0, easing: "linear" } } } },
  "Highlighter": {
    strokeWidth: 16, strokeColor: "#ffe44d", opacity: 40,
    penOptions: { highlighter: true, constantPressure: true, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0, smoothing: 0.35, streamline: 0.25, easing: "linear",
        simulatePressure: false,
        start: { cap: false, taper: 0, easing: "linear" },
        end:   { cap: false, taper: 0, easing: "linear" } } } },
  "Native iPad": {
    strokeWidth: 2, strokeColor: "#000000", opacity: 100,
    penOptions: { highlighter: false, constantPressure: false, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0.45, smoothing: 0.05, streamline: 0, easing: "linear",
        simulatePressure: false,
        start: { cap: true, taper: 0, easing: "linear" },
        end:   { cap: true, taper: 0, easing: "linear" } } } },
  "Mask Highlighter": {
    strokeWidth: 18, strokeColor: "#ffd54f", opacity: 100,
    penOptions: { highlighter: false, constantPressure: true, hasOutline: false, outlineWidth: 0,
      options: { thinning: 0, smoothing: 0.35, streamline: 0.2, easing: "linear",
        simulatePressure: false,
        start: { cap: true, taper: 0, easing: "linear" },
        end:   { cap: true, taper: 0, easing: "linear" } } } }
};

var DEFAULTS = {
  active: "Native iPad",
  width:  null, color: null, opacity: null,
  customPresets: {},
  paperFeel: false,
  maskColor: "#ffd54f",   // saturated highlighter yellow so 100% opacity covers
  maskOpacity: 100,       // 100 = fully covers content underneath when "shown"
  maskWidth: 18
};

var MASK_TAG = "maskLayer";

// Inline Lucide icons rendered with native Excalidraw ToolIcon SVG chrome:
// stroke=var(--icon-fill-color) + <g stroke-width="1.5"> wrapper so native
// [checked]/hover CSS rules pick them up identically to shape buttons.
function _ni(body) {
  return `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="var(--icon-fill-color)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5">${body}</g></svg>`;
}
var ICON = {
  play:    _ni(`<polygon points="6 3 20 12 6 21 6 3"/>`),
  undo:    _ni(`<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>`),
  save:    _ni(`<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>`),
  eye:     _ni(`<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff:  _ni(`<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>`),
  refresh: _ni(`<path d="M3 12a9 9 0 0 1 15-6.7l3 2.7"/><path d="M21 4v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 20v-5h5"/>`),
  trash:   _ni(`<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`),
  pen:     _ni(`<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>`),
  stop:    _ni(`<rect x="6" y="6" width="12" height="12" rx="2"/>`),
  paper:   _ni(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/>`),
  sliders: _ni(`<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>`),
  mask:    _ni(`<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8z"/>`),
  chev:    _ni(`<polyline points="9 18 15 12 9 6"/>`),
  pin:     _ni(`<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>`)
};
function ico(k, cls = "ps-ico") { return `<span class="${cls}">${ICON[k]}</span>`; }

// Paper feel modifier — overlays on top of the active preset's pen options to give
// strokes a "ink-on-paper" character: more dynamic thinning, micro tremor preserved
// (lower streamline), subtle taper, real-pressure curve.
function applyPaperModifier(p) {
  const po = p.penOptions;
  const o  = po.options;
  o.thinning   = Math.min(1, Math.max(0.35, (o.thinning ?? 0.3) + 0.2));
  o.smoothing  = Math.max(0.05, Math.min(o.smoothing ?? 0.3, 0.2));
  o.streamline = Math.max(0.05, Math.min(o.streamline ?? 0.2, 0.15));
  o.easing     = "easeOutCubic";
  o.simulatePressure = false;
  o.start.taper = Math.max(o.start.taper || 0, 8);
  o.end.taper   = Math.max(o.end.taper   || 0, 14);
  o.start.easing = "easeOutQuad";
  o.end.easing   = "easeInQuad";
  po.hasOutline  = false;
  return p;
}

// =========================================================================================
// Setup
// =========================================================================================
var view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
var api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// Remove stale About entry that earlier seeded an unwanted input field.
{
  const _s = ea.getScriptSettings() || {};
  if (_s["About"]) { delete _s["About"]; ea.setScriptSettings(_s); }
}
var state = window.__penStylesState;
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
    cleanup: []   // disposers run when panel hides/rebuilds (drag listeners, mask arm)
  };
  window.__penStylesState = state;
}
var cfg = state.cfg;
// Migrate stale persisted cfg: backfill any DEFAULTS keys missing on disk.
for (const k of Object.keys(DEFAULTS)) {
  if (cfg[k] === undefined) cfg[k] = (typeof DEFAULTS[k] === "object" && DEFAULTS[k] !== null)
    ? (Array.isArray(DEFAULTS[k]) ? [] : {})
    : DEFAULTS[k];
}
if (!cfg.customPresets) cfg.customPresets = {};
if (!cfg._tune) cfg._tune = {};
// If saved active preset is gone (custom deleted in another session), fall back.
if (!BUILTIN_PRESETS[cfg.active] && !cfg.customPresets[cfg.active]) {
  cfg.active = "Native iPad";
  cfg.width = cfg.color = cfg.opacity = null;
}
// Clamp numeric overrides to sane ranges.
if (cfg.maskOpacity == null || isNaN(cfg.maskOpacity)) cfg.maskOpacity = DEFAULTS.maskOpacity;
cfg.maskOpacity = Math.max(0, Math.min(100, cfg.maskOpacity));
if (cfg.maskWidth == null || isNaN(cfg.maskWidth)) cfg.maskWidth = DEFAULTS.maskWidth;
cfg.maskWidth = Math.max(1, Math.min(60, cfg.maskWidth));
if (!/^#[0-9a-f]{6}$/i.test(cfg.maskColor || "")) cfg.maskColor = DEFAULTS.maskColor;

// Expand a freedraw element's bbox to cover the full visible stroke
// width without shifting the visual. Excalidraw's selection box wraps
// element.x/y/width/height (NOT the perfect-freehand polygon), so a
// thick mask renders far outside the bbox -> clicks on the visible
// blob miss the element and drag never engages.
function expandFreedrawBbox(el, padPx) {
  if (!el.points || el.points.length === 0) return el;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < el.points.length; i++) {
    var p = el.points[i], px = p[0], py = p[1];
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  var newPoints = el.points.map(function (p) { return [p[0] - minX + padPx, p[1] - minY + padPx]; });
  return Object.assign({}, el, {
    x: el.x + minX - padPx,
    y: el.y + minY - padPx,
    width:  maxX - minX + padPx * 2,
    height: maxY - minY + padPx * 2,
    points: newPoints
  });
}

// One-shot migration: backfill backgroundColor + fillStyle on every
// existing mask so the blob renders filled. Bbox is NOT expanded any
// more — that caused a 1px snap on the first click after drawing,
// and the custom drag handler hit-tests the polyline directly so a
// tight bbox is fine.
if (!window.__penStylesMaskFillMigrated) {
  window.__penStylesMaskFillMigrated = true;
  try {
    const a = ea.getExcalidrawAPI?.();
    if (a && typeof a.getSceneElements === "function") {
      const els = a.getSceneElements() || [];
      let dirty = false;
      const fixed = els.map(el => {
        if (!el.customData || el.customData.maskLayer !== true) return el;
        if (el.fillStyle === "solid" && el.backgroundColor && el.backgroundColor !== "transparent") return el;
        dirty = true;
        return Object.assign({}, el, {
          backgroundColor: el.strokeColor,
          fillStyle: "solid"
        });
      });
      if (dirty) a.updateScene({ elements: fixed, commitToHistory: true });
    }
  } catch (e) { console.warn("[Pen Styles] mask fill migration failed", e); }
}
// Migrate users from the pale sticky-note default (#fff3a8) to the new
// saturated highlighter yellow (#ffd54f). Pale yellow at opacity 100
// still looked ~50% on white, which was confusing.
if ((cfg.maskColor || "").toLowerCase() === "#fff3a8") cfg.maskColor = DEFAULTS.maskColor;

// =========================================================================================
// Helpers
// =========================================================================================
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function allPresets() { return { ...BUILTIN_PRESETS, ...cfg.customPresets }; }
function getPreset(name) { return allPresets()[name] || null; }
function activePresetCopy() {
  const p = getPreset(cfg.active) || BUILTIN_PRESETS["Native iPad"];
  const s = clone(p);
  if (cfg.width   != null) s.strokeWidth = cfg.width;
  if (cfg.opacity != null) s.opacity     = cfg.opacity;
  if (cfg.color)           s.strokeColor = cfg.color;
  return s;
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

function applyActivePen() {
  // Mask Highlighter is a pen preset that ALSO arms the mask-tagging listener,
  // so switching to it is the same gesture as picking any other pen.
  if (cfg.active === "Mask Highlighter") {
    // Sync mask cfg from the active preset so the shared PEN COLOR/WIDTH/OPACITY
    // rows drive mask drawing too. activePresetCopy already merges user overrides.
    const mp = activePresetCopy();
    if (mp) {
      if (typeof mp.strokeColor === "string") cfg.maskColor   = mp.strokeColor;
      if (typeof mp.strokeWidth === "number") cfg.maskWidth   = mp.strokeWidth;
      if (typeof mp.opacity === "number")     cfg.maskOpacity = mp.opacity;
    }
    if (isMaskArmed()) {
      // Already armed — width/color/opacity slider movement should NOT
      // re-arm + re-notify. Just push the new appState values to Excalidraw.
      ea.viewUpdateScene({
        appState: {
          currentItemStrokeWidth: cfg.maskWidth,
          currentItemStrokeColor: cfg.maskColor,
          currentItemOpacity:     cfg.maskOpacity
        }
      });
      return;
    }
    startMaskDraw();
    return;
  }
  // Switching to any non-mask pen disarms mask tagging so the next stroke
  // does NOT get tagged as a mask.
  if (typeof isMaskArmed === "function" && isMaskArmed()) stopMaskDraw(false);
  let p = activePresetCopy();
  if (cfg.paperFeel) p = applyPaperModifier(p);
  ea.viewUpdateScene({
    appState: {
      currentStrokeOptions:       p.penOptions,
      currentItemStrokeWidth:     p.strokeWidth,
      currentItemStrokeColor:     p.strokeColor,
      currentItemOpacity:         p.opacity,
      currentItemFillStyle:       "solid",
      currentItemRoughness:       0,
      currentItemStrokeStyle:     "solid",
      currentItemBackgroundColor: "transparent"
    }
  });
  // Time-window suppress so our tool watcher doesn't auto-close panel
  // when applyActivePen switches to freedraw (see learnings/bugs-and-
  // fixes.md — onChange fires multiple times per setActiveTool).
  if (state) state.suppressUntil = Date.now() + 300;
  api.setActiveTool({ type: "freedraw" });
  installEscToSelection();
}

// Pressing Escape after picking any Pen Styles preset returns the
// canvas to the selection tool (mouse mode). The keydown listener
// has to sit on `document` in the capture phase so it runs BEFORE
// Excalidraw's own ESC handler (which would otherwise consume the
// event, leaving our freedraw tool active). Idempotent per view.
function installEscToSelection() {
  if (view.__penStylesEsc) return;
  const h = (e) => {
    if (e.key !== "Escape") return;
    // Only act if this Excalidraw view is the active one — otherwise
    // ESC in unrelated panes shouldn't poke at the canvas tool.
    if (!view.contentEl.contains(document.activeElement)
        && !view.contentEl.contains(e.target)
        && document.activeElement !== document.body) return;
    try { api.setActiveTool({ type: "selection" }); } catch (_) {}
    try { ea.viewUpdateScene({ appState: { currentStrokeOptions: null } }); } catch (_) {}
    if (typeof isMaskArmed === "function" && isMaskArmed()) stopMaskDraw(false);
  };
  document.addEventListener("keydown", h, true);
  view.__penStylesEsc = h;
}

function clearPen() {
  ea.viewUpdateScene({ appState: { currentStrokeOptions: null } });
}

// ---- Mask Highlighter helpers --------------------------------------------------------
function getAllMasks() {
  return (api.getSceneElements() || []).filter(
    el => el.customData && el.customData[MASK_TAG] === true && !el.isDeleted
  );
}
function activeBookFrame() {
  const frames = (ea.getViewElements() || []).filter(
    el => el.type === "frame" && el.customData && el.customData.bookPage
  );
  if (!frames.length) return null;
  const p = ea.getViewLastPointerPosition?.();
  if (!p) return frames[0];
  return frames.find(f =>
    p.x >= f.x && p.x <= f.x + f.width &&
    p.y >= f.y && p.y <= f.y + f.height
  ) || frames[0];
}
function startMaskDraw() {
  const frame = activeBookFrame();
  const frameId = frame ? frame.id : null;
  ea.viewUpdateScene({
    appState: {
      currentStrokeOptions: {
        highlighter: false, constantPressure: true, hasOutline: false, outlineWidth: 0,
        options: {
          thinning: 0, smoothing: 0.35, streamline: 0.2, easing: "linear",
          simulatePressure: false,
          start: { cap: true, taper: 0, easing: "linear" },
          end:   { cap: true, taper: 0, easing: "linear" }
        }
      },
      currentItemStrokeWidth:     cfg.maskWidth,
      currentItemStrokeColor:     cfg.maskColor,
      currentItemOpacity:         cfg.maskOpacity,
      currentItemFillStyle:       "solid",
      currentItemRoughness:       0,
      currentItemStrokeStyle:     "solid",
      currentItemBackgroundColor: "transparent"
    }
  });
  if (state) state.suppressUntil = Date.now() + 300;
  api.setActiveTool({ type: "freedraw" });
  installEscToSelection();

  stopMaskDraw(false);
  const canvas = view.contentEl.querySelector("canvas.interactive");
  if (!canvas) { new Notice("No canvas — open Excalidraw view"); return; }
  const knownIds = new Set((api.getSceneElements() || []).map(e => e.id));
  const tagInFlight = new Set();
  let scheduled = false;

  // Tag fresh freedraw strokes by mutating the scene array directly via
  // api.updateScene. This avoids ea.copyViewElementsToEAforEditing +
  // addElementsToView, which appended a second element in some versions
  // (cause of the "1 stroke -> 2 masks" bug).
  const tagFresh = () => {
    scheduled = false;
    const sceneEls = api.getSceneElements() || [];
    let changed = false;
    const next = sceneEls.map(el => {
      if (el.type !== "freedraw") return el;
      if (knownIds.has(el.id)) return el;
      if (el.customData && el.customData.maskLayer) {
        knownIds.add(el.id); return el;
      }
      if (tagInFlight.has(el.id)) return el;
      tagInFlight.add(el.id);
      knownIds.add(el.id);
      changed = true;
      const patch = {
        ...(el.customData || {}),
        maskLayer: true, maskState: "visible", maskTint: cfg.maskColor
      };
      if (frameId) patch.maskFrameId = frameId;
      // Don't touch x/y/points — bbox expansion caused a 1px snap on
      // the next click. The custom drag handler hit-tests the polyline
      // directly so a tight bbox is fine. Just fill the stroke shape
      // so the visible blob looks solid.
      return {
        ...el,
        backgroundColor: el.strokeColor,
        fillStyle: "solid",
        customData: patch,
        ...(frameId ? { frameId } : {})
      };
    });
    if (changed) {
      api.updateScene({ elements: next, commitToHistory: false });
      if (typeof notifyMaskChange === "function") notifyMaskChange();
      else if (typeof refreshMaskStatus === "function") refreshMaskStatus();
    }
  };

  const listener = (e) => {
    if (e.pointerType === "touch") return;
    if (scheduled) return;
    scheduled = true;
    setTimeout(tagFresh, 80);
  };
  canvas.addEventListener("pointerup", listener, true);
  window.__maskHighlighter = { canvas, listener };
  new Notice(`Mask draw armed${frameId ? " (clipped to book frame)" : ""}`);
}
function stopMaskDraw(notify = true) {
  const s = window.__maskHighlighter;
  if (s && s.canvas && s.listener) s.canvas.removeEventListener("pointerup", s.listener, true);
  window.__maskHighlighter = null;
  if (notify) new Notice("Mask draw disarmed");
}
function isMaskArmed() { return !!window.__maskHighlighter; }
var MASK_HIDDEN_OPACITY = 25;  // 0 = invisible; ~25 = ghost so user sees where masks sit

// All mask mutations go through api.updateScene directly. The ea.copy/add
// path was appending duplicate elements in some Excalidraw versions
// (cause of "1 stroke -> 2 masks") and ea.deleteViewElements left
// soft-deleted entries that resurrected on redraw.
function mapScene(idsSet, mutator) {
  const elements = api.getSceneElements() || [];
  let changed = false;
  const next = elements.map(el => {
    if (!idsSet.has(el.id)) return el;
    const upd = mutator(el);
    if (upd && upd !== el) { changed = true; return upd; }
    return el;
  });
  if (changed) api.updateScene({ elements: next, commitToHistory: true });
  return changed;
}
function visOpacity(el, visible) {
  return visible
    ? ((el.customData && el.customData.maskTint) ? cfg.maskOpacity : 100)
    : MASK_HIDDEN_OPACITY;
}
async function setMasksVisible(visible) {
  const masks = getAllMasks();
  if (!masks.length) { new Notice("No masks in view."); return; }
  const ids = new Set(masks.map(m => m.id));
  mapScene(ids, el => ({
    ...el,
    opacity: visOpacity(el, visible),
    customData: { ...(el.customData || {}), maskState: visible ? "visible" : "hidden" }
  }));
  if (typeof notifyMaskChange === "function") notifyMaskChange();
  new Notice(`${masks.length} mask(s) ${visible ? "shown" : "hidden"}`);
}
async function setMaskVisible(m, visible) {
  mapScene(new Set([m.id]), el => ({
    ...el,
    opacity: visOpacity(el, visible),
    customData: { ...(el.customData || {}), maskState: visible ? "visible" : "hidden" }
  }));
  if (typeof notifyMaskChange === "function") notifyMaskChange();
}
async function setMaskColor(m, color) {
  mapScene(new Set([m.id]), el => ({
    ...el,
    strokeColor: color,
    customData: { ...(el.customData || {}), maskTint: color }
  }));
  if (typeof notifyMaskChange === "function") notifyMaskChange();
}
async function deleteMask(m) {
  const elements = api.getSceneElements() || [];
  const next = elements.filter(el => el.id !== m.id);
  api.updateScene({ elements: next, commitToHistory: true });
  if (typeof notifyMaskChange === "function") notifyMaskChange();
}
async function toggleMasks() {
  const masks = getAllMasks();
  if (!masks.length) { new Notice("No masks in view."); return; }
  const ref = masks[0].customData.maskState || "visible";
  await setMasksVisible(ref !== "visible");
}
async function clearAllMasks() {
  const masks = getAllMasks();
  if (!masks.length) { new Notice("No masks to clear."); return; }
  const ids = new Set(masks.map(m => m.id));
  const elements = api.getSceneElements() || [];
  const next = elements.filter(el => !ids.has(el.id));
  api.updateScene({ elements: next, commitToHistory: true });
  if (typeof notifyMaskChange === "function") notifyMaskChange();
  new Notice(`Cleared ${masks.length} mask(s)`);
}

// =========================================================================================
// Persistent canvas mask-tap listener.
// Installed BEFORE the panel-rebuild branch so it works even when the Pen Styles
// panel is closed / never opened in this session. Re-installed on every run with
// fresh closures over api/view/cfg.
//   Gate: Ctrl/Cmd/Shift + click on laptop; finger tap on iPad (pointerType=touch).
// =========================================================================================
(() => {
  const canvasEl = view.contentEl.querySelector("canvas.interactive");
  if (!canvasEl) return;
  const hostEl = view.contentEl;
  const prior = window.__penStylesMaskTap;
  if (prior && prior.host) {
    if (prior.down)  prior.host.removeEventListener("pointerdown", prior.down,  true);
    if (prior.move)  prior.host.removeEventListener("pointermove", prior.move,  true);
    if (prior.up)    prior.host.removeEventListener("pointerup",   prior.up,    true);
    if (prior.click) {
      prior.host.removeEventListener("click",    prior.click, true);
      prior.host.removeEventListener("dblclick", prior.click, true);
    }
  }
  let active = null;

  function shouldHandle(e) {
    // Don't skip when mask-armed: user may be in Mask Highlighter mode
    // and still want Ctrl/Shift/Cmd+click to toggle existing masks.
    if (e.pointerType === "touch") return true;
    return !!(e.ctrlKey || e.metaKey || e.shiftKey);
  }
  function clientToScene(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    const app = api.getAppState();
    const zoom = (app.zoom && app.zoom.value) || 1;
    return {
      x: (clientX - rect.left) / zoom - app.scrollX,
      y: (clientY - rect.top)  / zoom - app.scrollY
    };
  }
  function pointSegDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }
  function hitMaskAt(sx, sy) {
    const masks = (api.getSceneElements() || []).filter(
      el => el.customData && el.customData.maskLayer && !el.isDeleted
    );
    for (let i = masks.length - 1; i >= 0; i--) {
      const m = masks[i];
      const lx = sx - m.x, ly = sy - m.y;
      const r = ((m.strokeWidth || cfg.maskWidth || 18) / 2) + 6;
      const pts = m.points || [];
      if (pts.length === 0) continue;
      if (pts.length === 1) {
        if (Math.hypot(lx - pts[0][0], ly - pts[0][1]) <= r) return m;
        continue;
      }
      for (let j = 1; j < pts.length; j++) {
        if (pointSegDist(lx, ly, pts[j-1][0], pts[j-1][1], pts[j][0], pts[j][1]) <= r) return m;
      }
    }
    return null;
  }
  // Excalidraw's freedraw hit-test is polyline-only — clicks inside the
  // visible blob are missed by the engine, so a normal pointerdown
  // starts a marquee instead of a drag. We intercept pointerdown on a
  // mask, then translate the mask's x/y directly on pointermove. This
  // makes plain selection-tool drag behave the same as any other
  // element. Modifier+click (or touch tap) without drag → toggle
  // hide/show. No drag, plain click → force-select.
  let drag = null;  // { hit, downX, downY, downSx, downSy, origX, origY, kind, dragged }
  const onDown = (e) => {
    drag = null;
    if (e.target !== canvasEl) return;
    const sc = clientToScene(e.clientX, e.clientY);
    const hit = hitMaskAt(sc.x, sc.y);
    if (!hit) return;
    const tool = api.getAppState()?.activeTool?.type;
    const modifier = shouldHandle(e);
    // Plain click on a draw tool → let Excalidraw draw on top.
    if (!modifier && tool !== "selection") return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    drag = {
      hit, kind: modifier ? "toggle" : "select",
      downX: e.clientX, downY: e.clientY,
      downSx: sc.x, downSy: sc.y,
      origX: hit.x, origY: hit.y,
      dragged: false
    };
  };
  const onMove = (e) => {
    if (!drag) return;
    const pdx = e.clientX - drag.downX, pdy = e.clientY - drag.downY;
    if (!drag.dragged) {
      if (pdx * pdx + pdy * pdy <= 25) return;
      drag.dragged = true;
    }
    const sc = clientToScene(e.clientX, e.clientY);
    const nx = drag.origX + (sc.x - drag.downSx);
    const ny = drag.origY + (sc.y - drag.downSy);
    const elements = api.getSceneElements() || [];
    const next = elements.map(el => el.id === drag.hit.id ? { ...el, x: nx, y: ny } : el);
    api.updateScene({ elements: next, commitToHistory: false });
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  };
  const onUp = (e) => {
    if (!drag) return;
    const s = drag; drag = null;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    if (s.dragged) {
      // Re-emit to capture an undo point + select the moved mask.
      const elements = api.getSceneElements() || [];
      api.updateScene({ elements, commitToHistory: true });
      try {
        api.updateScene({
          appState: { selectedElementIds: { [s.hit.id]: true } },
          commitToHistory: false
        });
      } catch (_) {}
      return;
    }
    if (s.kind === "toggle") {
      const fresh = (api.getSceneElements() || []).find(el => el.id === s.hit.id) || s.hit;
      const visible = (fresh.customData && fresh.customData.maskState || "visible") === "visible";
      Promise.resolve(setMaskVisible(fresh, !visible)).then(() => {
        if (state && typeof state.refreshMaskStatus === "function") state.refreshMaskStatus();
      });
    } else {
      try {
        api.updateScene({
          appState: { selectedElementIds: { [s.hit.id]: true } },
          commitToHistory: false
        });
      } catch (_) {}
    }
  };
  const onClickLike = (e) => {
    const gated = !!(e.ctrlKey || e.metaKey || e.shiftKey) || e.pointerType === "touch";
    if (!gated) return;
    const { x: sx, y: sy } = clientToScene(e.clientX, e.clientY);
    if (!hitMaskAt(sx, sy)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  };
  hostEl.addEventListener("pointerdown", onDown, true);
  hostEl.addEventListener("pointermove", onMove, true);
  hostEl.addEventListener("pointerup",   onUp,   true);
  hostEl.addEventListener("click",       onClickLike, true);
  hostEl.addEventListener("dblclick",    onClickLike, true);
  window.__penStylesMaskTap = { host: hostEl, down: onDown, move: onMove, up: onUp, click: onClickLike };
})();

// ---------- shared float-panel z-index stack + modal-aware auto-hide ----------
// Base 50 keeps panels BELOW Obsidian sidebars/tabs/topbar/status-bar.
// Modal/palette open => toggle body.excali-modal-open => CSS hides every
// element tagged .excali-floating-panel. Position + state preserved.
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

// =========================================================================================
// Toggle re-run
// =========================================================================================
var panel = document.getElementById(PANEL_ID);
var wantFine = !!(window.__penStylesOpenFine);
window.__penStylesOpenFine = false;

if (panel) {
  const hidden = panel.style.display === "none";
  const wantOpen = wantFine || hidden;
  if (wantOpen) {
    if (typeof window.openPenSidePanel === "function") window.openPenSidePanel();
    else panel.style.display = "";
    if (wantFine && typeof panel.__openFineTune === "function") panel.__openFineTune();
    applyActivePen();
  } else {
    if (typeof window.closePenSidePanel === "function") window.closePenSidePanel();
    else panel.style.display = "none";
    if (window.__maskHighlighter) {
      // Disarm mask draw so pointerup listener doesn't tag strokes.
      const s = window.__maskHighlighter;
      if (s.canvas && s.listener) s.canvas.removeEventListener("pointerup", s.listener, true);
      window.__maskHighlighter = null;
    }
  }
  return;
}

// =========================================================================================
// CSS
// =========================================================================================
if (!document.getElementById(STYLE_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_ID;
  styleTag.textContent = `
    /* Outer SECTION: cap to canvas viewport height, scroll inside. Same
       formula as Paper Mode side panel. NO chrome overrides on inner
       panel — native .Island + .selected-shape-actions paint everything. */
    #pen-styles-side-wrap {
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      overflow-x: hidden;
    }
    /* Hide sibling native selected-shape-actions while Pen Styles open. */
    .selected-shape-actions-container.pen-styles-open > section:not(#pen-styles-side-wrap) {
      display: none !important;
    }

    /* Layout-only rules — native .Island + .selected-shape-actions paint
       all typography, padding, gaps, h3, fieldset chrome. Do NOT override. */

    /* 3x3 pen grid — keeps 9 pens compact instead of a wider auto-flow.
       Clamp height to ~3 rows; extra pens scroll internally instead of
       pushing the sidebar taller. */
    #${PANEL_ID} fieldset.ps-pen-set .buttonList {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      max-height: 130px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 2px;
    }
    /* Hide redundant 0-label on Width/Opacity sliders — value-bubble already
       shows current value; the two overlap when slider near minimum. */
    #${PANEL_ID} .range-wrapper .zero-label { display: none !important; }
    /* Combined Tools fieldset — 3-col grid (2 rows of 3) so each button
       can show icon + small text label without overflowing. */
    #${PANEL_ID} fieldset.ps-toolbar .buttonList {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 4px !important;
    }
    #${PANEL_ID} fieldset.ps-toolbar .zIndexButton {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 1px !important;
      padding: 2px 1px !important;
      min-width: 0 !important;
      min-height: 34px !important;
    }
    #${PANEL_ID} fieldset.ps-toolbar .zIndexButton > span {
      font-size: 0.6rem;
      line-height: 1.1;
      white-space: normal;
      overflow: visible;
      max-width: 100%;
      text-align: center;
    }
    #${PANEL_ID} fieldset.ps-toolbar .zIndexButton svg {
      width: 13px;
      height: 13px;
    }
    #${PANEL_ID} > * + * { margin-top: 4px !important; }
    #${PANEL_ID} fieldset { padding: 2px 4px !important; }
    #${PANEL_ID} .control-label { padding: 1px 0 !important; }

    /* Pen preset grid — sits inside a native fieldset+legend+buttonList.
       Only addition: relative positioning for the per-chip × delete badge. */
    #${PANEL_ID} fieldset.ps-pen-set .ToolIcon { position: relative; }
    /* Active pen radio: whole label gets primary fill + white svg. */
    #${PANEL_ID} fieldset.ps-pen-set .ToolIcon:has(input:checked),
    #${PANEL_ID} fieldset.ps-pen-set .ToolIcon:has(input:checked) .ToolIcon__icon {
      background: var(--color-primary, var(--interactive-accent)) !important;
      color: var(--color-on-primary, #fff) !important;
      border-radius: var(--border-radius-lg, 4px);
    }
    #${PANEL_ID} fieldset.ps-pen-set .ToolIcon:has(input:checked) svg,
    #${PANEL_ID} fieldset.ps-pen-set .ToolIcon:has(input:checked) svg g {
      stroke: var(--color-on-primary, #fff) !important;
    }
    #${PANEL_ID} .ps-chip-del {
      position: absolute; top: 2px; right: 2px; z-index: 2;
      width: 12px; height: 12px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); font-size: 10px; line-height: 1;
      opacity: 0; transition: opacity 0.1s; cursor: pointer;
      background: transparent;
    }
    #${PANEL_ID} .ToolIcon:hover > .ps-chip-del { opacity: 1; }
    #${PANEL_ID} .ps-chip-del:hover {
      background: var(--background-modifier-error);
      color: var(--text-on-accent, #fff);
    }

    /* Popovers — Island anchored beside the panel, same chrome as the
       native color popover. */
    #pen-styles-finetune-popover,
    #pen-styles-mask-popover {
      position: absolute; z-index: 9999;
    }
    /* Force native Excalidraw typography on every element inside popovers.
       Stacked-slider labels use inner <span> elements which lose the native
       .control-label rule; this scoped reset paints them like native. */
    #pen-styles-finetune-popover,
    #pen-styles-mask-popover,
    #pen-styles-finetune-popover *,
    #pen-styles-mask-popover * {
      font-family: var(--ui-font, var(--font-interface, "Assistant", sans-serif));
      font-size: 0.75rem;
      line-height: 1.4;
    }
    #pen-styles-finetune-popover .color-picker__heading,
    #pen-styles-mask-popover .color-picker__heading {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      padding: 4px 0;
    }
    /* Mask popover: clamp Island width only; let internal list scroll
       so the heading + Actions row remain visible when masks accumulate. */
    #pen-styles-mask-popover > .Island {
      max-width: 13rem !important;
      max-height: none !important;
      overflow: visible !important;
      position: relative;
    }
    /* Fine-tune popover: wider clamp + internal content scroll so heading + pin
       stay visible. Per-popover override so #4 fix wins over inline maxWidth. */
    #pen-styles-finetune-popover > .Island {
      width: 14rem !important;
      max-width: 14rem !important;
      min-width: 14rem !important;
      max-height: 24rem !important;
      overflow: hidden !important;
      padding-right: 4px;
      position: relative;
    }
    #pen-styles-finetune-popover .color-picker-content {
      max-height: calc(24rem - 2rem) !important;
      overflow-y: auto !important;
      padding-right: 4px;
    }

    /* Popover pin button — top-right corner of the inner Island. Click to
       toggle outer.dataset.pinned; outside-click dismiss respects pinned.
       Aggressive !important so native button rules cannot paint it black. */
    .ps-pin-btn {
      position: absolute !important; top: 4px !important; right: 4px !important;
      width: 22px !important; height: 22px !important;
      background: transparent !important;
      border: none !important;
      padding: 0 !important; margin: 0 !important;
      display: inline-flex !important; align-items: center !important; justify-content: center !important;
      cursor: pointer !important; border-radius: 4px !important;
      color: var(--icon-fill-color) !important;
      z-index: 3 !important;
      box-shadow: none !important;
    }
    .ps-pin-btn:hover {
      background: var(--background-modifier-hover, rgba(0,0,0,0.08)) !important;
    }
    .ps-pin-btn svg { width: 14px !important; height: 14px !important; }
    .ps-pin-btn[aria-pressed="true"] {
      background: var(--color-primary, var(--interactive-accent)) !important;
      color: var(--color-on-primary, #fff) !important;
    }
    .ps-pin-btn[aria-pressed="true"] svg { stroke: currentColor !important; }
    /* Slider rows (have a child <div> head): stack vertically.
       Select / checkbox rows keep native row layout from .control-label. */
    #pen-styles-finetune-popover .control-label:has(> div) {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 2px 0;
    }
    #pen-styles-finetune-popover .control-label > div:first-child {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #pen-styles-finetune-popover input[type="range"] { width: 100%; }
    #pen-styles-finetune-popover .control-label > div:first-child > span:last-child,
    #pen-styles-finetune-popover .control-label .ps-val {
      font-variant-numeric: tabular-nums;
      color: var(--text-muted, var(--text-faint));
    }
    /* Mask popover content: NO overflow on container — list scrolls itself
       so the heading + Actions row remain pinned visible. */
    #pen-styles-mask-popover .color-picker-content {
      max-height: none !important;
      overflow: visible !important;
    }
    /* Action buttons in mask/fine-tune popovers must flow horizontally.
       Native .buttonList renders column-wise inside our custom popovers. */
    #pen-styles-mask-popover .buttonList,
    #pen-styles-finetune-popover .buttonList {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px;
    }
    /* Tighten stacked slider rows in fine-tune so all controls fit the clamp. */
    #pen-styles-finetune-popover .control-label {
      margin: 0 !important;
      padding: 2px 0 !important;
    }
    /* Native font on the label text — don't override Excalidraw's typography. */
    #pen-styles-finetune-popover .control-label > div > span:first-child {
      font-size: inherit;
    }
    /* Fixed min-width on value span so numeric columns align across rows. */
    #pen-styles-finetune-popover .ps-val {
      min-width: 3.5rem !important;
      text-align: right !important;
    }
    /* Native select (Easing) renders with black bg on dark theme — theme it. */
    #pen-styles-finetune-popover select {
      background: var(--color-surface-high, var(--button-bg-color, #fff)) !important;
      color: var(--color-on-surface, var(--icon-fill-color, #242424)) !important;
      border: 1px solid var(--default-border-color, #ccc) !important;
      border-radius: 4px !important;
      padding: 2px 6px !important;
      font-size: 0.75rem !important;
      max-width: 8rem;
      appearance: auto;
    }
    #pen-styles-finetune-popover select option {
      background: var(--color-surface-high, #fff) !important;
      color: var(--color-on-surface, var(--icon-fill-color, #242424)) !important;
    }
    #pen-styles-finetune-popover,
    #pen-styles-finetune-popover .color-picker-content,
    #pen-styles-finetune-popover .control-label,
    #pen-styles-finetune-popover .control-label > span,
    #pen-styles-finetune-popover .control-label > div,
    #pen-styles-finetune-popover .control-label > div > span {
      color: var(--color-on-surface, var(--icon-fill-color, #242424)) !important;
    }
    #pen-styles-finetune-popover .ps-val {
      color: var(--color-gray-50, #646464) !important;
    }
    /* Rows with direct child select/checkbox/radio: lay out as space-between
       flex row so label text + control hug opposite ends, vertically centered. */
    #pen-styles-finetune-popover .control-label:has(> select),
    #pen-styles-finetune-popover .control-label:has(> input[type="checkbox"]),
    #pen-styles-finetune-popover .control-label:has(> input[type="radio"]) {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
    }
    #pen-styles-finetune-popover .control-label > select,
    #pen-styles-finetune-popover .control-label > input[type="checkbox"],
    #pen-styles-finetune-popover .control-label > input[type="radio"] {
      flex: 0 0 auto;
      margin: 0;
    }
    #pen-styles-finetune-popover .control-label > span {
      flex: 1 1 auto;
      min-width: 0;
    }
    #pen-styles-finetune-popover .color-picker__heading {
      color: var(--color-gray-50, #646464) !important;
    }

    /* Mask popover list rows. Mask color swatch uses .color-picker__button
       for native border/sizing; only structural rules below. */
    #pen-styles-mask-popover .ps-mask-list {
      max-height: 140px !important;
      overflow-y: auto !important;
      overflow-x: hidden;
      margin-top: 6px;
      display: flex; flex-direction: column; gap: 2px;
    }
    #pen-styles-mask-popover .ps-mask-list:empty::before {
      content: "No masks yet";
      display: block; padding: 8px; text-align: center;
      color: var(--text-muted); font-style: italic;
    }
    #pen-styles-mask-popover .ps-mask-item {
      display: flex; align-items: center; gap: 4px;
      padding: 2px 4px; border-radius: 4px;
    }
    #pen-styles-mask-popover .ps-mask-item:hover { background: var(--background-modifier-hover); }
    /* Per-row eye + trash buttons: minimal inline icon-button chrome.
       Avoids the big native button background that turned them into
       black blocks inside the list row. */
    #pen-styles-mask-popover .ps-mask-item button {
      background: transparent; border: none; padding: 2px; margin: 0;
      width: 20px; height: 20px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 3px;
      color: var(--icon-fill-color);
    }
    #pen-styles-mask-popover .ps-mask-item button:hover {
      background: var(--background-modifier-hover, rgba(0,0,0,0.08));
    }
    #pen-styles-mask-popover .ps-mask-item button svg {
      width: 14px; height: 14px;
    }
    #pen-styles-mask-popover .ps-mask-item input[type="color"] {
      width: 18px; height: 18px; padding: 0;
      border: 1px solid var(--default-border-color); border-radius: 3px;
    }
    #pen-styles-mask-popover .ps-mask-name {
      flex: 1; cursor: pointer; padding: 2px 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #pen-styles-mask-popover .ps-mask-item.is-hidden .ps-mask-name {
      opacity: 0.55; text-decoration: line-through;
    }
    #pen-styles-mask-popover .zIndexButton.is-armed {
      background: var(--text-error) !important;
      animation: ps-pulse 1.2s ease-in-out infinite;
    }
    @keyframes ps-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    /* Active state for toggle-style zIndexButton (e.g. Paper). Mirrors
       native [aria-pressed="true"] / Excalidraw's "active" primary fill. */
    #${PANEL_ID} .zIndexButton[data-active="true"] {
      background: var(--color-primary, var(--interactive-accent)) !important;
      color: var(--color-on-primary, var(--text-on-accent, #fff)) !important;
    }
    #${PANEL_ID} .zIndexButton[data-active="true"] svg,
    #${PANEL_ID} .zIndexButton[data-active="true"] svg g {
      stroke: var(--color-on-primary, var(--text-on-accent, #fff)) !important;
    }

    /* Visual mutual-exclusion: while Pen Styles panel open, suppress
       the active-tool highlight in the shape toolbar. */
    body.pen-styles-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon,
    body.pen-styles-active .App-toolbar label.ToolIcon:has(input:checked) > .ToolIcon__icon {
      background: transparent !important;
      color: var(--icon-fill-color) !important;
    }
    body.pen-styles-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon svg,
    body.pen-styles-active .App-toolbar label.ToolIcon:has(input:checked) > .ToolIcon__icon svg,
    body.pen-styles-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon svg g {
      stroke: var(--icon-fill-color) !important;
    }
    body.pen-styles-active .App-toolbar label.ToolIcon input[type="radio"]:checked + .ToolIcon__icon .ToolIcon__keybinding {
      color: var(--icon-fill-color) !important;
    }

    /* Main panel — slightly tighter gap between sections only. Native
       fieldset/legend/h3/control-label sizing untouched. */
    #${PANEL_ID} > * + * { margin-top: 6px; }

    /* Fine-tune popover overflow fix — sliders + value spans cause
       horizontal scroll past 13rem clamp. Force value span to shrink,
       label to ellipsis, slider full width. */
    #pen-styles-finetune-popover .control-label > div {
      display: flex; align-items: center; justify-content: space-between;
      gap: 4px; font-size: 0.7rem;
    }
    #pen-styles-finetune-popover .control-label > div > span:first-child {
      flex: 1 1 auto; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #pen-styles-finetune-popover .control-label > div > .ps-val {
      flex: 0 0 auto; color: var(--text-muted, var(--text-faint));
      font-variant-numeric: tabular-nums;
    }
    #pen-styles-finetune-popover .control-label input[type="range"] {
      width: 100%; min-width: 0;
    }
    #pen-styles-finetune-popover .control-label select {
      max-width: 8rem; min-width: 0;
    }
  `;
  document.head.appendChild(styleTag);
}

// =========================================================================================
// Build panel — docked native side bar (matches Paper Mode pattern).
// Mount inside .App-menu_top__left as section.selected-shape-actions >
// Island.App-menu__left. React-controlled, but MO restore keeps it
// alive across re-renders. Native .Island supplies bg/shadow/radius.
// =========================================================================================
const PEN_SIDE_WRAP_ID = "pen-styles-side-wrap";

function mountPenSidePanel() {
  const host =
    view.contentEl.querySelector(".App-menu_top__left") ||
    view.contentEl.querySelector(".excalidraw") ||
    view.contentEl;
  if (!host) return null;
  const wrapSec = document.createElement("section");
  wrapSec.id = PEN_SIDE_WRAP_ID;
  wrapSec.className = "selected-shape-actions zen-mode-transition";
  wrapSec.setAttribute("aria-label", "Pen Styles");
  const island = document.createElement("div");
  island.className = "Island App-menu__left";
  island.style.setProperty("--padding", "2");
  wrapSec.appendChild(island);
  host.appendChild(wrapSec);
  return island;
}

// Dedupe: remove ALL existing #pen-styles-panel nodes anywhere in
// view.contentEl before mount. Prevents ghost empty panel from MO
// restore race or stale display:none leftovers.
view.contentEl.querySelectorAll("#" + PANEL_ID).forEach(n => n.remove());

panel = document.createElement("div");
panel.id = PANEL_ID;
// Inner panel uses the native .selected-shape-actions class so native
// CSS rules paint typography/spacing/h3 styling identically to native.
panel.className = "selected-shape-actions";
const _penIsland = mountPenSidePanel();
const _panelHost = _penIsland || view.contentEl;
_panelHost.appendChild(panel);

// Header removed — toolbar button + Esc are the dismiss paths.

function closePenSidePanel() {
  document.body.classList.remove("pen-styles-active");
  // Fully remove panel + side wrap — no display:none leftovers that
  // render as ghost empty white boxes.
  view.contentEl.querySelectorAll("#" + PANEL_ID).forEach(n => n.remove());
  view.contentEl.querySelector("#" + PEN_SIDE_WRAP_ID)?.remove();
  // Restore native selected-shape-actions visibility.
  view.contentEl.querySelector(".selected-shape-actions-container")
    ?.classList.remove("pen-styles-open");
  if (typeof isMaskArmed === "function" && isMaskArmed()) {
    stopMaskDraw(false);
  }
}

function openPenSidePanel() {
  // If panel was .remove()'d on close, re-mount the side wrap + panel
  // before showing. Keeps the closed-over `panel` ref attached.
  if (!panel.isConnected) {
    view.contentEl.querySelectorAll("#" + PANEL_ID).forEach(n => n.remove());
    view.contentEl.querySelector("#" + PEN_SIDE_WRAP_ID)?.remove();
    const island = mountPenSidePanel();
    (island || view.contentEl).appendChild(panel);
  }
  panel.style.display = "";
  document.body.classList.add("pen-styles-active");
  const wrap = view.contentEl.querySelector("#" + PEN_SIDE_WRAP_ID);
  if (wrap) wrap.style.display = "";
  // Hide native selected-shape-actions so the two side bars don't stack.
  view.contentEl.querySelector(".selected-shape-actions-container")
    ?.classList.add("pen-styles-open");
  // Time-window suppress for tool watcher — setActiveTool fires onChange
  // multiple times across React commits; single-shot flags get consumed
  // by no-op first fire. 300ms window covers all batched fires.
  state.suppressUntil = Date.now() + 300;
  try { api.setActiveTool({ type: "freedraw" }); } catch (_) {}
}

// Expose globally so the toggle path at script top can reuse.
window.openPenSidePanel = openPenSidePanel;
window.closePenSidePanel = closePenSidePanel;

// ---- Tool watcher: auto-close when user picks a different tool -------------------------
if (view._penStylesToolWatcher) {
  try { view._penStylesToolWatcher.cleanup(); } catch (_) {}
}
{
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
    const isOpen = !!document.getElementById(PANEL_ID);
    if (!isOpen) return;
    // Only close on transition AWAY from freedraw (Pen Styles is for
    // drawing). If user picks selection / rect / etc., panel should close.
    if (toolChanged && tool !== "freedraw") closePenSidePanel();
    else if (selGained) closePenSidePanel();
  });
  view._penStylesToolWatcher = {
    cleanup: () => { try { off?.(); } catch (_) {} view._penStylesToolWatcher = null; }
  };
  state.cleanup.push(() => view._penStylesToolWatcher?.cleanup());
}

// ---- Color popover (anchored, Paper-Mode style) ---------------------------------------
// Big swatch grid + hex input + OS color picker, mounted inside .excalidraw
// for native CSS scope. Triggered by the active-color button.
function buildPSColorPopover(onPick, currentColor) {
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
  outer.id = "pen-styles-color-popover";
  outer.style.cssText = "position:absolute;z-index:9999;";
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
    b.type = "button"; b.tabIndex = -1;
    const isActive = currentColor && c.toLowerCase() === currentColor.toLowerCase();
    b.className = "color-picker__button color-picker__button--large has-outline" + (isActive ? " active" : "");
    b.title = `${c} — ${k}`;
    b.setAttribute("aria-label", `${c} — ${k}`);
    b.style.setProperty("--swatch-color", c);
    const o = document.createElement("div"); o.className = "color-picker__button-outline"; b.appendChild(o);
    const hk = document.createElement("div");
    hk.className = "color-picker__button__hotkey-label";
    hk.style.color = dark ? "rgb(255,255,255)" : "rgb(0,0,0)";
    hk.textContent = k;
    b.appendChild(hk);
    b.onclick = (e) => { e.stopPropagation(); onPick(c); outer.remove(); };
    cGrid.appendChild(b);
  }
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

// ---- Color section (FIRST — native color-picker markup) -----------------------------
// Native h3 + .color-picker-container > .color-picker__top-picks + active-color
// trigger. Same chrome as the Background/Stroke row in Excalidraw's
// selected-shape-actions. Custom OS picker hidden behind active-color
// click for hex / wheel access.
{
  const colSection = panel.createDiv();
  const colH3 = document.createElement("h3");
  colH3.setAttribute("aria-hidden", "true");
  colH3.textContent = "Color";
  colSection.appendChild(colH3);
  const cpcOuter = colSection.createDiv();
  const cpc = document.createElement("div");
  cpc.className = "color-picker-container";
  cpc.setAttribute("role", "dialog");
  cpc.setAttribute("aria-modal", "true");
  cpcOuter.appendChild(cpc);
  const topPicks = document.createElement("div");
  topPicks.className = "color-picker__top-picks";
  cpc.appendChild(topPicks);
  const swatchBtns = {};
  const customPicker = document.createElement("input");
  customPicker.type = "color";
  customPicker.style.cssText = "position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;";
  customPicker.value = /^#[0-9a-f]{6}$/i.test(cfg.color) ? cfg.color : "#000000";
  cpc.appendChild(customPicker);
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
    const o = document.createElement("div");
    o.className = "color-picker__button-outline";
    b.appendChild(o);
    b.onclick = () => {
      cfg.color = c;
      refreshActiveColor();
      state.dirty = true; applyActivePen(); persistSoon();
      syncFineRowsLive();
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
  const ao = document.createElement("div");
  ao.className = "color-picker__button-outline";
  activeBtn.appendChild(ao);
  activeBtn.onclick = (e) => {
    e.stopPropagation();
    const existing = view.contentEl.querySelector("#pen-styles-color-popover");
    if (existing) { existing.remove(); return; }
    const pop = buildPSColorPopover((c) => {
      cfg.color = c;
      refreshActiveColor();
      state.dirty = true; applyActivePen(); persistSoon();
      syncFineRowsLive();
    }, cfg.color);
    const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
    host.appendChild(pop);
    // Anchor to the active-color trigger button — verbatim Paper Mode
    // pattern (right + 28, top - 4). Keeps the popover flush beside the
    // trigger like the native color flyout.
    const btnRect = activeBtn.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    let left = btnRect.right - hostRect.left + 28;
    let top  = btnRect.top   - hostRect.top  - 4;
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top  = `${Math.round(top)}px`;
    const popH  = pop.offsetHeight;
    const hostH = host.getBoundingClientRect().height;
    if (top + popH > hostH - 8) {
      top = Math.max(8, hostH - popH - 8);
      pop.style.top = `${Math.round(top)}px`;
    }
    setTimeout(() => {
      const onDown = (ev) => {
        if (pop.contains(ev.target) || activeBtn.contains(ev.target)) return;
        pop.remove();
        document.removeEventListener("mousedown", onDown, true);
      };
      document.addEventListener("mousedown", onDown, true);
    }, 0);
  };
  cpc.appendChild(activeBtn);
  refreshActiveColor();
  customPicker.oninput = (e) => {
    cfg.color = e.target.value;
    refreshActiveColor();
    state.dirty = true; applyActivePen(); persistSoon();
    syncFineRowsLive();
  };
  // Expose so the PEN-preset-change handler can re-sync the active color
  // when switching presets (e.g. clicking "Highlighter" changes color).
  window.__penStylesRefreshColor = () => {
    customPicker.value = /^#[0-9a-f]{6}$/i.test(cfg.color) ? cfg.color : "#000000";
    refreshActiveColor();
  };
}

// ---- Pen preset grid -----------------------------------------------------------------
// (The fieldset+legend mounted by buildControlLabelSlider's neighbour
// further down — see rebuildGrid call site. Legend replaces the old
// standalone <h3>Pen</h3>.)

// Helper: build native Excalidraw range-input row. Mirrors exactly the
// "Opacity" / "Stroke width" control-label markup from selected-shape-actions:
//   <label class="control-label">TEXT
//     <div class="range-wrapper">
//       <input class="range-input" type="range" …>
//       <div class="value-bubble">…</div>
//       <div class="zero-label">0</div>
//     </div>
//   </label>
// Native CSS paints the slider, the floating value bubble, and the trailing
// "0" zero-label. We update bubble position on input.
function buildControlLabelSlider(parent, labelText, value, min, max, step, fmt) {
  const lbl = document.createElement("label");
  lbl.className = "control-label";
  lbl.appendChild(document.createTextNode(labelText));
  const wrap = document.createElement("div");
  wrap.className = "range-wrapper";
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(min); range.max = String(max); range.step = String(step);
  range.value = String(value);
  range.className = "range-input";
  wrap.appendChild(range);
  const bubble = document.createElement("div");
  bubble.className = "value-bubble";
  bubble.textContent = fmt(value);
  wrap.appendChild(bubble);
  const zero = document.createElement("div");
  zero.className = "zero-label";
  zero.textContent = "0";
  wrap.appendChild(zero);
  lbl.appendChild(wrap);
  parent.appendChild(lbl);
  // Position bubble above the thumb (native pattern uses left:calc(...)).
  const positionBubble = () => {
    const ratio = (parseFloat(range.value) - min) / (max - min || 1);
    bubble.style.left = `calc(${ratio * 100}% + (${(0.5 - ratio) * 16}px))`;
  };
  positionBubble();
  range.addEventListener("input", positionBubble);
  return { wrap: lbl, input: range, value: bubble, fmt, reposition: positionBubble };
}
// Pen preset grid — native fieldset+legend+buttonList chrome. The legend
// replaces the standalone <h3>Pen</h3> heading so it matches the native
// "Stroke width" row exactly.
const penFieldset = document.createElement("fieldset");
penFieldset.className = "ps-pen-set";
const penLegend = document.createElement("legend");
penLegend.textContent = "Pen";
penFieldset.appendChild(penLegend);
const grid = document.createElement("div");
grid.className = "buttonList";
penFieldset.appendChild(grid);
panel.appendChild(penFieldset);
const chipEls = {};
function rebuildGrid() {
  grid.empty();
  for (const [name, p] of Object.entries(allPresets())) {
    const col = "currentColor";
    const isCustom = !BUILTIN_PRESETS[name];
    const iconKey = PEN_ICONS[name] ? name : "Fine Pen";
    // Native ToolIcon.Shape pattern: <label.ToolIcon.Shape><input radio>
    // <div.ToolIcon__icon>svg</div></label>. CSS paints :checked purple.
    const label = document.createElement("label");
    label.className = "ToolIcon Shape";
    label.title = name;
    label.setAttribute("aria-label", name);
    const input = document.createElement("input");
    // Native shape ToolIcon: size class lives on the INPUT (not the label).
    input.className = "ToolIcon_type_radio ToolIcon_size_medium";
    input.type = "radio";
    input.name = "pen-styles-pen";
    input.value = name;
    input.setAttribute("aria-label", name);
    if (name === cfg.active) input.checked = true;
    label.appendChild(input);
    const iconWrap = document.createElement("div");
    iconWrap.className = "ToolIcon__icon";
    iconWrap.innerHTML = penIconSvg(iconKey, col);
    label.appendChild(iconWrap);
    if (isCustom) {
      const del = document.createElement("span");
      del.className = "ps-chip-del";
      del.title = "Delete preset";
      del.textContent = "×";
      label.appendChild(del);
      del.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        let ok = false;
        try {
          ok = await utils.suggester(
            [`Delete preset "${name}"`, "Cancel"], [true, false], "Confirm delete"
          );
        } catch (_) {
          ok = confirm(`Delete preset "${name}"?`);
        }
        if (!ok) return;
        delete cfg.customPresets[name];
        if (cfg._tune) delete cfg._tune[name];
        if (cfg.active === name) {
          cfg.active = "Native iPad";
          cfg.width = cfg.color = cfg.opacity = null;
        }
        state.dirty = true; persistSoon();
        rebuildGrid(); syncControls();
        applyActivePen();
        new Notice(`Deleted preset: ${name}`);
      };
    }
    chipEls[name] = label;
    input.onchange = () => {
      cfg.active = name;
      cfg.width = null; cfg.color = null; cfg.opacity = null;
      state.dirty = true; applyActivePen(); persistSoon();
      syncControls();
    };
    grid.appendChild(label);
  }
}
rebuildGrid();

// Color section already rendered above (native color-picker-container).
// Stub vars so legacy syncControls() reference still works.
const swatchEls = [];
const customPicker = { value: "" };

// ---- Width control-label slider (label IS the section header) ------------------------
const wCtrl = buildControlLabelSlider(panel, "Width", 1.5, 1, 60, 0.5, v => `${v}px`);
const wSlider = wCtrl.input;
const wValue  = { setText: (t) => { wCtrl.value.textContent = t; wCtrl.reposition && wCtrl.reposition(); } };
wSlider.oninput = () => {
  cfg.width = parseFloat(wSlider.value);
  wValue.setText(`${cfg.width}px`);
  state.dirty = true; applyActivePen(); persistSoon();
  if (fineWidth && fineWidth.input.isConnected) {
    fineWidth.input.value = cfg.width;
    fineWidth.value.setText(`${cfg.width}px`);
  }
};

// ---- Opacity control-label slider (label IS the section header) ----------------------
const oCtrl = buildControlLabelSlider(panel, "Opacity", 100, 0, 100, 1, v => `${v}%`);
const oSlider = oCtrl.input;
const oValue  = { setText: (t) => { oCtrl.value.textContent = t; oCtrl.reposition && oCtrl.reposition(); } };
oSlider.oninput = () => {
  cfg.opacity = parseFloat(oSlider.value);
  oValue.setText(`${cfg.opacity}%`);
  state.dirty = true; applyActivePen(); persistSoon();
  if (fineOp && fineOp.input.isConnected) {
    fineOp.input.value = cfg.opacity;
    fineOp.value.setText(`${cfg.opacity}%`);
  }
};

function syncControls() {
  const p = activePresetCopy();
  wSlider.value = p.strokeWidth; wValue.setText(`${p.strokeWidth}px`);
  oSlider.value = p.opacity;     oValue.setText(`${p.opacity}%`);
  cfg.color = p.strokeColor;
  window.__penStylesRefreshColor?.();
  // If fine-tune popover is open, rebuild it for the new active preset.
  if (typeof syncFineRowsLive === "function") syncFineRowsLive();
}
syncControls();

// ---- Action bar (native fieldset + buttonList + zIndexButton) ------------------------
// Helper: native ToolIcon button with svg + tooltip (used inside popovers).
function toolIconBtn(parent, title, iconKey, onClick, extraCls = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ToolIcon ToolIcon_size_medium" + (extraCls ? " " + extraCls : "");
  btn.title = title;
  btn.setAttribute("aria-label", title);
  const inner = document.createElement("div");
  inner.className = "ToolIcon__icon";
  inner.innerHTML = ICON[iconKey] || "";
  btn.appendChild(inner);
  btn.onclick = onClick;
  parent.appendChild(btn);
  return btn;
}
// Helper: native action-row button (matches Layers / zIndex buttons).
// `labelText` (optional) appends a visible <span> so the toolbar buttons
// can show "Activate" / "Reset" / "Save" / etc. beneath the icon.
function zIndexBtn(parent, title, iconKey, onClick, labelText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "zIndexButton";
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.innerHTML = ICON[iconKey] || "";
  if (labelText) {
    const lbl = document.createElement("span");
    lbl.textContent = labelText;
    btn.appendChild(lbl);
  }
  btn.onclick = onClick;
  parent.appendChild(btn);
  return btn;
}

// ---- Tools row (Activate + Reset + Save + Paper + Fine-tune + Mask) -----------------
// Single fieldset+legend+buttonList row so the six zIndexButton entries
// share horizontal space and the panel stays compact (wraps if needed).
const toolsFs = document.createElement("fieldset");
toolsFs.className = "ps-toolbar";
const toolsLg = document.createElement("legend");
toolsLg.textContent = "Tools";
toolsFs.appendChild(toolsLg);
const toolsRow = document.createElement("div");
toolsRow.className = "buttonList";
toolsFs.appendChild(toolsRow);
panel.appendChild(toolsFs);

zIndexBtn(toolsRow, "Activate pen", "play",
  () => { applyActivePen(); new Notice(`Pen → ${cfg.active}`); }, "Activate");
zIndexBtn(toolsRow, "Reset to default freedraw", "undo",
  () => { clearPen(); new Notice("Pen → default freedraw"); }, "Reset");
zIndexBtn(toolsRow, "Save current as preset", "save", async () => {
  const snap = activePresetCopy();
  let name = await utils.inputPrompt("Save current pen as preset", "My Pen", "My Pen");
  if (!name) return;
  name = name.trim();
  if (!name) { new Notice("Preset name cannot be empty."); return; }
  if (BUILTIN_PRESETS[name]) {
    new Notice(`"${name}" is a built-in preset name — pick another.`);
    return;
  }
  cfg.customPresets[name] = snap;
  cfg.active = name;
  cfg.width = cfg.color = cfg.opacity = null;
  state.dirty = true; persistSoon();
  rebuildGrid(); syncControls();
  new Notice(`Saved preset: ${name}`);
}, "Save");

const paperBtn = document.createElement("button");
paperBtn.type = "button";
paperBtn.className = "zIndexButton";
paperBtn.title = "Paper feel modifier";
paperBtn.setAttribute("aria-label", "Paper");
paperBtn.innerHTML = `${ICON.paper}`;
{
  const _lbl = document.createElement("span");
  _lbl.textContent = "Paper";
  paperBtn.appendChild(_lbl);
}
toolsRow.appendChild(paperBtn);
function syncPaperToggle() {
  paperBtn.setAttribute("aria-pressed", cfg.paperFeel ? "true" : "false");
  paperBtn.setAttribute("data-active", cfg.paperFeel ? "true" : "false");
}
syncPaperToggle();
paperBtn.onclick = () => {
  cfg.paperFeel = !cfg.paperFeel;
  syncPaperToggle();
  state.dirty = true; applyActivePen(); persistSoon();
};

function makeTriggerBtn(label, iconKey, onClick, visibleLabel) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "zIndexButton";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = `${ICON[iconKey] || ""}`;
  if (visibleLabel) {
    const lbl = document.createElement("span");
    lbl.textContent = visibleLabel;
    btn.appendChild(lbl);
  }
  btn.onclick = onClick;
  toolsRow.appendChild(btn);
  return btn;
}

const fineTriggerBtn = makeTriggerBtn("Fine-tune", "sliders", (e) => {
  e.stopPropagation();
  openFineTunePopover(fineTriggerBtn);
}, "Tune");
const maskTriggerBtn = makeTriggerBtn("Mask Highlighter", "mask", (e) => {
  e.stopPropagation();
  openMaskPopover(maskTriggerBtn);
}, "Mask");

function scrollToMask(m) {
  // Read fresh: the captured m may be stale after a scene update.
  const fresh = (api.getSceneElements() || []).find(el => el.id === m.id) || m;
  try {
    api.updateScene({
      appState: {
        activeTool: { type: "selection", lastActiveTool: null, locked: false },
        selectedElementIds: { [fresh.id]: true }
      },
      commitToHistory: false
    });
    if (typeof api.scrollToContent === "function") {
      try { api.scrollToContent([fresh], { fitToContent: true, animate: true, duration: 280 }); }
      catch (_) { api.scrollToContent([fresh]); }
    } else if (typeof ea.targetView?.zoomToFit === "function") {
      ea.targetView.zoomToFit([fresh]);
    }
    setTimeout(() => {
      try {
        api.updateScene({
          appState: { selectedElementIds: { [fresh.id]: true } },
          commitToHistory: false
        });
      } catch (_) {}
    }, 60);
  } catch (e) { console.warn("scrollToMask failed", e); }
}

// =========================================================================================
// Fine-tune popover — _tune draft override + builder.
// =========================================================================================
var fineWidth = null, fineOp = null;

function getActivePenOptions() {
  if (!cfg._tune) cfg._tune = {};
  if (!cfg._tune[cfg.active]) {
    const p = getPreset(cfg.active);
    cfg._tune[cfg.active] = p ? clone(p.penOptions) : null;
  }
  return cfg._tune[cfg.active];
}

// Override activePresetCopy so it honours the _tune draft.
const origActivePresetCopy = activePresetCopy;
activePresetCopy = function() {
  const s = origActivePresetCopy();
  const t = cfg._tune && cfg._tune[cfg.active];
  if (t) s.penOptions = clone(t);
  return s;
};

// Popover slider — stacked-head layout (label + value on one row, slider
// below). Mirrors Paper Mode's pattern. Native .range-wrapper/.value-bubble
// don't lay out cleanly inside the narrow popover Island, so we use a
// plain stacked input here. Width/Opacity sliders OUTSIDE popovers keep
// the native range-wrapper via buildControlLabelSlider.
function buildStackedSlider(parent, label, value, min, max, step, fmt) {
  // Clean native markup — no inline styles. The scoped popover CSS paints
  // flex/column layout, head row, value coloring, and full-width range.
  const lbl = document.createElement("label");
  lbl.className = "control-label";

  const head = document.createElement("div");
  const nameSpan = document.createElement("span");
  nameSpan.textContent = label;
  const valSpan = document.createElement("span");
  valSpan.className = "ps-val";
  valSpan.textContent = fmt(value);
  head.appendChild(nameSpan);
  head.appendChild(valSpan);
  lbl.appendChild(head);

  const input = document.createElement("input");
  input.type = "range";
  input.className = "range-input";
  input.min = min; input.max = max; input.step = step;
  input.value = value;
  lbl.appendChild(input);

  parent.appendChild(lbl);
  return { input, value: valSpan, reposition: null };
}

function sliderRow(parent, label, value, min, max, step, fmt, onChange) {
  const ctrl = buildStackedSlider(parent, label, value, min, max, step, fmt);
  ctrl.input.oninput = () => {
    const x = parseFloat(ctrl.input.value);
    ctrl.value.textContent = fmt(x);
    onChange(x); applyActivePen(); state.dirty = true; persistSoon();
  };
  return {
    input: ctrl.input,
    value: { setText: (t) => { ctrl.value.textContent = t; } }
  };
}
function selectRow(parent, label, options, value, onChange) {
  // Native pattern: <label class="control-label"><span>TEXT</span><select>…</select></label>.
  // No inline styles — .control-label paints flex+typography natively.
  const lbl = document.createElement("label");
  lbl.className = "control-label";
  const lblText = document.createElement("span");
  lblText.textContent = label;
  lbl.appendChild(lblText);
  const s = document.createElement("select");
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o; opt.text = o;
    if (o === value) opt.selected = true;
    s.appendChild(opt);
  }
  lbl.appendChild(s);
  parent.appendChild(lbl);
  s.onchange = () => { onChange(s.value); applyActivePen(); state.dirty = true; persistSoon(); };
  return s;
}
function checkRow(parent, label, value, onChange) {
  const lbl = document.createElement("label");
  lbl.className = "control-label";
  const lblText = document.createElement("span");
  lblText.textContent = label;
  lbl.appendChild(lblText);
  const c = document.createElement("input");
  c.type = "checkbox"; c.checked = !!value;
  lbl.appendChild(c);
  parent.appendChild(lbl);
  c.onchange = () => { onChange(c.checked); applyActivePen(); state.dirty = true; persistSoon(); };
  return c;
}

function buildFineRows(fineBox) {
  fineBox.empty();
  const t = getActivePenOptions();
  if (!t) { fineBox.createDiv({ text: "No active preset." }); return; }
  const o = t.options;
  const p = activePresetCopy();

  const fineHead = document.createElement("div");
  fineHead.className = "color-picker__heading";
  fineHead.textContent = "Fine-tune";
  fineBox.appendChild(fineHead);

  fineWidth = sliderRow(fineBox, "Width", p.strokeWidth, 1, 40, 0.5, v => `${v}px`, v => {
    cfg.width = v; wSlider.value = v; wValue.setText(`${v}px`);
  });
  fineOp = sliderRow(fineBox, "Opacity", p.opacity, 0, 100, 1, v => `${v}%`, v => {
    cfg.opacity = v; oSlider.value = v; oValue.setText(`${v}%`);
  });
  sliderRow(fineBox, "Thinning",    o.thinning,   -1, 1, 0.05, v => v.toFixed(2), v => o.thinning   = v);
  sliderRow(fineBox, "Smoothing",   o.smoothing,   0, 1, 0.05, v => v.toFixed(2), v => o.smoothing  = v);
  sliderRow(fineBox, "Streamline",  o.streamline,  0, 1, 0.05, v => v.toFixed(2), v => o.streamline = v);
  sliderRow(fineBox, "Taper start", +o.start.taper || 0, 0, 100, 1, v => `${v}`, v => o.start.taper = v);
  sliderRow(fineBox, "Taper end",   +o.end.taper   || 0, 0, 100, 1, v => `${v}`, v => o.end.taper   = v);
  selectRow(fineBox, "Easing",            EASINGS, o.easing, v => o.easing = v);
  checkRow (fineBox, "Constant pressure", t.constantPressure, v => t.constantPressure = v);
  checkRow (fineBox, "Highlighter mode",  t.highlighter,      v => t.highlighter = v);
  checkRow (fineBox, "Real pressure",    !o.simulatePressure, v => o.simulatePressure = !v);
}

// ---- Anchored popover infra ----------------------------------------------------------
// Wraps content in native color-picker-content/properties-content so
// Excalidraw's CSS paints typography + spacing identically to the
// color popover. dlg is the .color-picker-content node — append rows
// directly to it and let .control-label paint natively.
function buildAnchoredPopover(id, ariaLabel) {
  // Outer wrapper copied verbatim from Paper Mode's buildColorPopover:
  //   <div id position:absolute z:9999>
  //     <div.Island --padding=3 max-width=13rem>
  //       <div role=dialog aria-modal aria-label>
  //         <div.color-picker-content.properties-content tabindex=-1>
  //           …rows…
  //         </div></div></div></div>
  const outer = document.createElement("div");
  outer.id = id;
  outer.style.cssText = "position:absolute;z-index:9999;";
  const island = document.createElement("div");
  island.className = "Island";
  island.style.setProperty("--padding", "3");
  // No inline max-width — scoped CSS per popover id paints it (Fine-tune 18rem,
  // Mask 13rem) so the wider Fine-tune rule is not blocked by inline style.
  outer.appendChild(island);
  const dlgRole = document.createElement("div");
  dlgRole.setAttribute("role", "dialog");
  dlgRole.setAttribute("aria-modal", "true");
  dlgRole.setAttribute("aria-label", ariaLabel);
  island.appendChild(dlgRole);
  const content = document.createElement("div");
  content.className = "color-picker-content properties-content";
  content.tabIndex = -1;
  dlgRole.appendChild(content);

  // Pin button (top-right of Island). When pinned, outside-click is
  // ignored by bindPopoverDismiss(); Esc still always closes.
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "ps-pin-btn";
  pinBtn.title = "Pin popover (stay open on outside click)";
  pinBtn.setAttribute("aria-label", "Pin popover");
  pinBtn.setAttribute("aria-pressed", "false");
  pinBtn.innerHTML = ICON.pin;
  outer.dataset.pinned = "false";
  pinBtn.onclick = (e) => {
    e.stopPropagation();
    const pinned = outer.dataset.pinned === "true";
    outer.dataset.pinned = pinned ? "false" : "true";
    pinBtn.setAttribute("aria-pressed", pinned ? "false" : "true");
    pinBtn.title = pinned
      ? "Pin popover (stay open on outside click)"
      : "Unpin popover";
  };
  island.appendChild(pinBtn);

  return { outer, island, dlg: content };
}
// Anchor popover to the trigger button — same formula as Paper Mode's
// color popover (offset right + 28, top - 4). After placement, clamp
// the top so the popover stays inside the host viewport.
function anchorPopover(pop, triggerBtn) {
  const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
  host.appendChild(pop);
  const btnRect = triggerBtn.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  let left = btnRect.right - hostRect.left + 28;
  let top  = btnRect.top   - hostRect.top  - 4;
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top  = `${Math.round(top)}px`;
  // Clamp so a tall popover near the viewport bottom doesn't overflow.
  const popH  = pop.offsetHeight;
  const hostH = host.getBoundingClientRect().height;
  if (top + popH > hostH - 8) {
    top = Math.max(8, hostH - popH - 8);
    pop.style.top = `${Math.round(top)}px`;
  }
}
// Anchor a popover to the SIDE of the Pen Styles panel (not the trigger).
// Used by Fine-tune + Mask popovers whose triggers sit near the bottom of
// the panel — anchoring to them pushes the popover off-screen. The color
// popover keeps `anchorPopover` (anchored to the color swatch trigger
// near the panel top, which already aligns perfectly).
function anchorPopoverToSide(pop, host) {
  host.appendChild(pop);
  // Anchor to the active color-picker button (top of panel) so Fine-tune
  // and Mask popovers land at the IDENTICAL position as the color popover.
  // Fall back to the side wrap if no active color button exists.
  const colorBtn = document.querySelector(`#${PANEL_ID} .color-picker__button.active-color`);
  const anchor = colorBtn || document.getElementById(PEN_SIDE_WRAP_ID) || host;
  const aRect = anchor.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  let left = aRect.right - hostRect.left + 28;
  let top  = aRect.top   - hostRect.top - 4;
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top  = `${Math.round(top)}px`;
  // Clamp so a tall popover doesn't overflow the host bottom.
  const popH  = pop.offsetHeight;
  const hostH = hostRect.height;
  if (top + popH > hostH - 8) {
    top = Math.max(8, hostH - popH - 8);
    pop.style.top = `${Math.round(top)}px`;
  }
}

function bindPopoverDismiss(pop, triggerBtn, onClose) {
  setTimeout(() => {
    const onDown = (ev) => {
      if (pop.contains(ev.target) || triggerBtn.contains(ev.target)) return;
      // When pinned, outside-click does NOT dismiss. Esc still closes.
      if (pop.dataset.pinned === "true") return;
      cleanup();
    };
    const onKey = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); cleanup(); } };
    function cleanup() {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      try { pop.remove(); } catch (_) {}
      if (typeof onClose === "function") onClose();
    }
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    pop.__close = cleanup;
  }, 0);
}

function openFineTunePopover(triggerBtn) {
  // Toggle off if already open.
  const existing = document.getElementById("pen-styles-finetune-popover");
  if (existing) { existing.__close ? existing.__close() : existing.remove(); return; }
  const { outer, dlg } = buildAnchoredPopover("pen-styles-finetune-popover", "Fine-tune pen");
  buildFineRows(dlg);
  const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
  anchorPopoverToSide(outer, host);
  bindPopoverDismiss(outer, triggerBtn);
}
// Live re-render of the fine-tune popover (used when the global color/
// preset selection changes while it's open). No-op if popover is closed.
function syncFineRowsLive() {
  const pop = document.getElementById("pen-styles-finetune-popover");
  if (!pop) return;
  const dlg = pop.querySelector("[role='dialog']");
  if (dlg) buildFineRows(dlg);
}
// Public so the toggle-panel branch at script top can open Fine-tune via
// the same code path (replaces the old panel.__setFineOpen accordion).
panel.__openFineTune = () => openFineTunePopover(fineTriggerBtn);

// =========================================================================================
// Mask Highlighter popover — status + list + actions.
// =========================================================================================
var maskStatusEl = null, maskListEl = null;
function refreshMaskStatus() {
  if (!maskStatusEl || !maskListEl || !maskStatusEl.isConnected) return;
  const masks = getAllMasks();
  const vis = masks.filter(m => (m.customData.maskState || "visible") === "visible").length;
  maskStatusEl.innerHTML = `<b>${masks.length}</b> mask(s) · <b>${vis}</b> visible`;
  maskListEl.empty();
  masks.forEach((m, i) => {
    const item = maskListEl.createDiv({ cls: "ps-mask-item" });
    const mstate = m.customData.maskState || "visible";
    if (mstate !== "visible") item.classList.add("is-hidden");
    const tint = m.customData.maskTint || m.strokeColor || cfg.maskColor;

    // Color swatch — native .color-picker__button swatch chrome.
    const colorInp = document.createElement("input");
    colorInp.type = "color";
    colorInp.className = "color-picker__button";
    colorInp.value = tint;
    colorInp.title = "Mask color";
    colorInp.style.setProperty("--swatch-color", tint);
    colorInp.onclick = (e) => e.stopPropagation();
    colorInp.oninput  = async (e) => { await setMaskColor(m, e.target.value); };
    colorInp.onchange = async (e) => { await setMaskColor(m, e.target.value); refreshMaskStatus(); };
    item.appendChild(colorInp);

    const name = item.createDiv({ cls: "ps-mask-name", text: `Mask #${i + 1}` });
    name.onclick = () => scrollToMask(m);

    // Native zIndexButton chrome for eye + trash, identical to Layers row.
    const visBtn = document.createElement("button");
    visBtn.type = "button";
    visBtn.className = "zIndexButton";
    visBtn.title = mstate === "visible" ? "Hide this mask" : "Show this mask";
    visBtn.innerHTML = mstate === "visible" ? ICON.eye : ICON.eyeOff;
    visBtn.onclick = async (e) => {
      e.stopPropagation();
      await setMaskVisible(m, mstate !== "visible");
      refreshMaskStatus();
    };
    item.appendChild(visBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "zIndexButton";
    delBtn.title = "Delete this mask";
    delBtn.innerHTML = ICON.trash;
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      await deleteMask(m);
      refreshMaskStatus();
    };
    item.appendChild(delBtn);
  });
}
// Expose for the persistent canvas listener installed earlier.
state.refreshMaskStatus = refreshMaskStatus;

// Explicit refresh path — call after every mask mutation (create / toggle /
// delete / color change / visibility). The api.onChange subscription is a
// fallback; some mask mutations don't propagate through normal scene diffs
// or the diff key (count + visKey) misses fast-burst changes.
function notifyMaskChange() {
  if (typeof state.refreshMaskStatus === "function") state.refreshMaskStatus();
  const pop = document.getElementById("pen-styles-mask-popover");
  if (pop && typeof pop.__refreshList === "function") pop.__refreshList();
}

function openMaskPopover(triggerBtn) {
  const existing = document.getElementById("pen-styles-mask-popover");
  if (existing) { existing.__close ? existing.__close() : existing.remove(); return; }
  const { outer, dlg } = buildAnchoredPopover("pen-styles-mask-popover", "Mask Highlighter");

  const header = document.createElement("div");
  header.className = "color-picker__heading";
  header.textContent = "Mask Highlighter";
  dlg.appendChild(header);

  // Status uses native .control-label typography (light, muted).
  maskStatusEl = document.createElement("div");
  maskStatusEl.className = "control-label";
  dlg.appendChild(maskStatusEl);
  maskListEl   = dlg.createDiv({ cls: "ps-mask-list" });

  // Action row: native fieldset+legend+buttonList chrome.
  const maskActionsFs = document.createElement("fieldset");
  const maskActionsLg = document.createElement("legend");
  maskActionsLg.textContent = "Actions";
  maskActionsFs.appendChild(maskActionsLg);
  const maskActions = document.createElement("div");
  maskActions.className = "buttonList";
  maskActionsFs.appendChild(maskActions);
  dlg.appendChild(maskActionsFs);
  zIndexBtn(maskActions, "Show masks", "eye",
    async () => { await setMasksVisible(true);  refreshMaskStatus(); });
  zIndexBtn(maskActions, "Hide masks", "eyeOff",
    async () => { await setMasksVisible(false); refreshMaskStatus(); });
  zIndexBtn(maskActions, "Toggle masks", "refresh",
    async () => { await toggleMasks(); refreshMaskStatus(); });
  const clrB = zIndexBtn(maskActions, "Click twice to clear all masks", "trash", null);
  let clrArmed = false; let clrTimer = null;
  function disarmClear() {
    clrArmed = false;
    clrB.classList.remove("is-armed");
    clrB.title = "Click twice to clear all masks";
    if (clrTimer) { clearTimeout(clrTimer); clrTimer = null; }
  }
  clrB.onclick = async () => {
    if (clrArmed) {
      disarmClear();
      await clearAllMasks();
      refreshMaskStatus();
      return;
    }
    clrArmed = true;
    clrB.classList.add("is-armed");
    clrB.title = "Click again to confirm delete all";
    new Notice("Click trash again to delete all masks");
    clrTimer = setTimeout(disarmClear, 2500);
  };

  // Explicit-refresh hook for notifyMaskChange() — primary live-update path
  // since some mask scene mutations may not roundtrip via api.onChange.
  outer.__refreshList = refreshMaskStatus;
  const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
  anchorPopoverToSide(outer, host);
  // Paint initial mask state — MUST run AFTER anchorPopoverToSide() so
  // maskStatusEl.isConnected is true (refreshMaskStatus early-returns
  // otherwise). Was previously called before append → empty list bug.
  refreshMaskStatus();

  // Live refresh: when masks are added/removed/changed (e.g. user keeps
  // drawing with mask highlighter while popover open), the list + count
  // re-render automatically. Throttle to coalesce burst onChange fires.
  let pending = false, lastCount = -1, lastVisKey = "";
  const tickRefresh = () => {
    pending = false;
    if (!maskStatusEl || !maskListEl || !maskStatusEl.isConnected) return;
    // Cheap diff: rebuild only if mask count or visibility set changed.
    const masks = getAllMasks();
    const visKey = masks.map(m => (m.customData?.maskState || "visible")[0] + (m.customData?.maskTint || m.strokeColor || "")).join(",");
    if (masks.length === lastCount && visKey === lastVisKey) return;
    lastCount = masks.length; lastVisKey = visKey;
    refreshMaskStatus();
  };
  const offChange = api.onChange(() => {
    if (pending) return;
    pending = true;
    setTimeout(tickRefresh, 120);
  });
  // Initial baseline so first scheduled tick has accurate diff state.
  {
    const masks0 = getAllMasks();
    lastCount = masks0.length;
    lastVisKey = masks0.map(m => (m.customData?.maskState || "visible")[0] + (m.customData?.maskTint || m.strokeColor || "")).join(",");
  }

  bindPopoverDismiss(outer, triggerBtn, () => {
    // null refs so refreshMaskStatus from canvas listener becomes a no-op.
    maskStatusEl = null; maskListEl = null;
    try { offChange?.(); } catch (_) {}
  });
}

// If user pressed the Pen Settings entrypoint, open Fine-tune popover.
if (wantFine) {
  // Defer until panel mounted so triggerBtn has a bounding rect.
  setTimeout(() => openFineTunePopover(fineTriggerBtn), 0);
}

// ---- Toolbar button (matches Paper Mode pattern) -------------------------------------
// Injects a pen icon into Excalidraw's .App-toolbar that toggles the
// Pen Styles panel. MutationObserver re-injects on Excalidraw toolbar
// re-render. data-state="open" gives full primary highlight while panel
// is visible.
(function installPenStylesToolbar() {
  const BTN_ID    = "pen-styles-toolbar-btn";
  const WRAP_ID   = "pen-styles-toolbar-wrap";
  const DIV_ID    = "pen-styles-toolbar-divider";
  const STYLE_ID2 = "pen-styles-toolbar-style";

  if (!document.getElementById(STYLE_ID2)) {
    const s = document.createElement("style");
    s.id = STYLE_ID2;
    s.textContent = `
      #${BTN_ID}[data-state="open"] {
        background: var(--color-primary, var(--interactive-accent)) !important;
      }
      #${BTN_ID}[data-state="open"] svg { stroke: var(--color-on-primary, white) !important; }
    `;
    document.head.appendChild(s);
  }

  const syncBtn = (btn) => {
    const p = document.getElementById(PANEL_ID);
    const visible = !!p;
    btn.setAttribute("data-state", visible ? "open" : "closed");
    btn.setAttribute("aria-expanded", visible ? "true" : "false");
  };

  const inject = () => {
    const toolbar = view.contentEl.querySelector(".App-toolbar");
    if (!toolbar) return;
    if (toolbar.querySelector("#" + WRAP_ID)) return;
    const wrap = document.createElement("div");
    wrap.id = WRAP_ID;
    wrap.className = "dropdown-menu-container";
    wrap.style.display = "contents";
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.className = "dropdown-menu-button App-toolbar__extra-tools-trigger zen-mode-transition";
    btn.title = "Pen Styles";
    btn.setAttribute("aria-label", "Pen Styles");
    btn.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="12" rx="1.5"/><line x1="4" y1="10" x2="20" y2="10"/><polygon points="8,10 8,3 10,3 10,10"/><line x1="9" y1="5" x2="9" y2="3"/><polygon points="12.5,10 12.5,4 15.5,4 15.5,10"/><line x1="14" y1="4" x2="14" y2="2"/><polygon points="17,10 17,6 19,6 19,10"/></svg>`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = document.getElementById(PANEL_ID);
      if (p) {
        // Open → close: fully remove.
        if (typeof window.closePenSidePanel === "function") window.closePenSidePanel();
        else p.remove();
      } else {
        // Closed → open: re-run the script to rebuild the panel.
        if (typeof window.openPenSidePanel === "function") window.openPenSidePanel();
        applyActivePen?.();
      }
      syncBtn(btn);
    });
    wrap.appendChild(btn);
    toolbar.appendChild(wrap);
    syncBtn(btn);
  };

  inject();
  const prior = view._penStylesToolbar;
  if (prior?.cleanup) prior.cleanup();
  const mo = new MutationObserver(() => {
    inject();
    const btn = view.contentEl.querySelector("#" + BTN_ID);
    if (btn) syncBtn(btn);
  });
  mo.observe(view.contentEl, { childList: true, subtree: true });
  view._penStylesToolbar = {
    cleanup: () => {
      try { mo.disconnect(); } catch (_) {}
      view.contentEl.querySelector("#" + WRAP_ID)?.remove();
      view.contentEl.querySelector("#" + DIV_ID)?.remove();
      view._penStylesToolbar = null;
    }
  };
})();

// ---- Esc closes panel ----------------------------------------------------------------
if (window.__penStylesEscHandler) {
  document.removeEventListener("keydown", window.__penStylesEscHandler, true);
}
window.__penStylesEscHandler = (e) => {
  if (e.key !== "Escape") return;
  // Panel may have been .remove()'d by closePenSidePanel — re-resolve.
  if (!document.getElementById(PANEL_ID)) return;
  closePenSidePanel();
};
document.addEventListener("keydown", window.__penStylesEscHandler, true);

// ---- Auto-apply on first open --------------------------------------------------------
const _isPenStylesAutoStartup = !!window.__penStylesAutoStartup;
if (!_isPenStylesAutoStartup) {
  openPenSidePanel();
  applyActivePen();
} else {
  // Auto-startup: fully remove panel + side wrap so no ghost empty box
  // shows. Toolbar button rebuilds via re-run; toolbar inject persists.
  closePenSidePanel();
}
/*
```
*/
