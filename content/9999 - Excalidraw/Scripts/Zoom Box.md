---
excalidraw-plugin: parsed
---

/*
Zoom Box — drag a rectangle on the canvas, viewport zoom-fits it.

Toolbar trigger lives next to Excalidraw's "More tools" button (same
.App-toolbar__divider + .dropdown-menu-button.App-toolbar__extra-tools
-trigger markup, so theme + zen-mode follow for free). Click toggles
"zoom-box mode":

- Crosshair cursor + rubber-band rectangle that tracks the drag.
- Drag region is captured by a full-canvas overlay div mounted on
  view.contentEl (NOT body), so it survives fullscreen
  (learnings/excalidraw-dom.md — body-mounted overlays are invisible
  while .contentEl is the fullscreen element).
- On mouseup: convert dragged screen rect → scene rect (using the
  ADD-scrollX projection from learnings/excalidraw-api.md 2026-06-03),
  then call app.setState({zoom, scrollX, scrollY}) directly so the
  fitted zoom can exceed Excalidraw's normalized clamp the same way
  Zoom Wide does.
- Cancel: Esc, click trigger again, right-click during drag.

Re-run script = uninstall.

```javascript
*/
const STYLE_ID    = "excali-zoom-box-style";
const WRAP_ID     = "excali-zoom-box-wrap";
const TRIGGER_ID  = "excali-zoom-box-trigger";
const DIVIDER_ID  = "excali-zoom-box-divider";
const OVERLAY_ID  = "excali-zoom-box-overlay";
const RUBBER_ID   = "excali-zoom-box-rubber";

const PAD_FRAC    = 0.05;   // 5 % viewport padding around fitted box
const MIN_DRAG_PX = 6;      // ignore tiny accidental drags
const MIN_ZOOM    = 0.01;
const MAX_ZOOM    = 30;

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI?.();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// Toggle off if already installed in this view.
const prior = view._zoomBoxState;
if (prior && prior.cleanup) { prior.cleanup(); return; }

// ---------- find Excalidraw App fiber (same pattern as Zoom Wide) ----------
function findAppComponent() {
  const root = view.contentEl;
  const candidates = [".excalidraw__canvas.interactive", ".reset-zoom-button", ".excalidraw"];
  for (const sel of candidates) {
    const el = root.querySelector(sel);
    if (!el) continue;
    const key = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    if (!key) continue;
    let fiber = el[key];
    let walked = 0;
    while (fiber && walked < 60) {
      const sn = fiber.stateNode;
      if (sn && typeof sn.setState === "function" && sn.state && sn.state.zoom) return sn;
      fiber = fiber.return;
      walked++;
    }
  }
  return null;
}

// ---------- shared styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    #${TRIGGER_ID}[data-active="1"] {
      background: var(--color-primary-light, var(--background-modifier-hover)) !important;
    }
    #${OVERLAY_ID} {
      position: absolute;
      pointer-events: auto;
      cursor: crosshair;
      background: transparent;
      z-index: 5;
    }
    #${RUBBER_ID} {
      position: absolute;
      pointer-events: none;
      border: 1px dashed var(--interactive-accent, #4a90e2);
      background: color-mix(in srgb, var(--interactive-accent, #4a90e2) 12%, transparent);
      box-sizing: border-box;
      display: none;
    }
  `;
  document.head.appendChild(s);
}

// ---------- toolbar trigger ----------
function buildTrigger() {
  const wrap = document.createElement("div");
  wrap.id = WRAP_ID;
  wrap.className = "dropdown-menu-container";
  wrap.style.display = "contents";

  const trigger = document.createElement("button");
  trigger.id = TRIGGER_ID;
  trigger.type = "button";
  trigger.className = "dropdown-menu-button App-toolbar__extra-tools-trigger zen-mode-transition";
  trigger.title = "Zoom Box — drag to zoom to a region";
  trigger.setAttribute("aria-label", "Zoom to box");
  trigger.setAttribute("data-testid", "zoom-box-trigger");
  trigger.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="21" y1="21" x2="15.1" y2="15.1"/><rect x="7" y="7" width="7" height="7" stroke-dasharray="2 2"/></svg>`;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    state.armed ? disarm() : arm();
  });

  wrap.appendChild(trigger);
  return wrap;
}

function buildDivider() {
  const d = document.createElement("div");
  d.id = DIVIDER_ID;
  d.className = "App-toolbar__divider";
  return d;
}

// ---------- canvas-relative geometry ----------
function getCanvas() {
  return view.contentEl.querySelector(".excalidraw__canvas.interactive")
      || view.contentEl.querySelector(".excalidraw__canvas")
      || view.contentEl.querySelector("canvas");
}

function placeOverlay() {
  if (!state.overlay) return;
  const canvas = getCanvas();
  const host = state.overlay.parentElement;
  if (!canvas || !host) return;
  const cr = canvas.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  state.overlay.style.left   = (cr.left - hr.left) + "px";
  state.overlay.style.top    = (cr.top  - hr.top ) + "px";
  state.overlay.style.width  = cr.width  + "px";
  state.overlay.style.height = cr.height + "px";
}

// ---------- arm / disarm ----------
const state = {
  armed: false,
  overlay: null,
  rubber: null,
  drag: null,
  resizeObs: null,
};

function arm() {
  if (state.armed) return;
  const host = view.contentEl.querySelector(".excalidraw") || view.contentEl;
  if (!host) return;
  // Host needs positioned context for absolute children. .excalidraw is
  // position: relative by default — confirm by setting explicitly only
  // if computed style is static.
  const cs = getComputedStyle(host);
  if (cs.position === "static") host.style.position = "relative";

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  const rubber = document.createElement("div");
  rubber.id = RUBBER_ID;
  overlay.appendChild(rubber);
  host.appendChild(overlay);

  state.overlay = overlay;
  state.rubber  = rubber;
  state.armed   = true;
  placeOverlay();

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("contextmenu", onContext);
  window.addEventListener("keydown", onKey, true);

  // Reposition overlay if Excalidraw resizes its canvas (sidebar toggle,
  // window resize, zen mode).
  state.resizeObs = new ResizeObserver(placeOverlay);
  state.resizeObs.observe(host);
  const canvas = getCanvas();
  if (canvas) state.resizeObs.observe(canvas);

  const trig = document.getElementById(TRIGGER_ID);
  if (trig) trig.setAttribute("data-active", "1");
}

function disarm() {
  if (!state.armed) return;
  state.armed = false;
  endDrag();
  window.removeEventListener("keydown", onKey, true);
  try { state.resizeObs?.disconnect(); } catch (_) {}
  state.resizeObs = null;
  state.overlay?.remove();
  state.overlay = null;
  state.rubber = null;
  const trig = document.getElementById(TRIGGER_ID);
  if (trig) trig.removeAttribute("data-active");
}

// ---------- drag handlers ----------
function onMouseDown(e) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = state.overlay.getBoundingClientRect();
  state.drag = {
    startX: e.clientX - rect.left,
    startY: e.clientY - rect.top,
    curX:   e.clientX - rect.left,
    curY:   e.clientY - rect.top,
  };
  drawRubber();
  state.rubber.style.display = "block";
  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("mouseup",   onMouseUp,   true);
}

function onMouseMove(e) {
  if (!state.drag) return;
  const rect = state.overlay.getBoundingClientRect();
  state.drag.curX = e.clientX - rect.left;
  state.drag.curY = e.clientY - rect.top;
  drawRubber();
}

function onMouseUp(e) {
  if (!state.drag) return;
  const d = state.drag;
  endDrag();
  const w = Math.abs(d.curX - d.startX);
  const h = Math.abs(d.curY - d.startY);
  if (w < MIN_DRAG_PX || h < MIN_DRAG_PX) { disarm(); return; }
  const x = Math.min(d.startX, d.curX);
  const y = Math.min(d.startY, d.curY);
  zoomFitCanvasRect(x, y, w, h);
  disarm();
}

function onContext(e) {
  if (!state.drag) return;
  e.preventDefault();
  endDrag();
  disarm();
}

function onKey(e) {
  if (e.key === "Escape") { e.preventDefault(); disarm(); }
}

function endDrag() {
  state.drag = null;
  if (state.rubber) state.rubber.style.display = "none";
  window.removeEventListener("mousemove", onMouseMove, true);
  window.removeEventListener("mouseup",   onMouseUp,   true);
}

function drawRubber() {
  const d = state.drag; if (!d || !state.rubber) return;
  const x = Math.min(d.startX, d.curX);
  const y = Math.min(d.startY, d.curY);
  const w = Math.abs(d.curX - d.startX);
  const h = Math.abs(d.curY - d.startY);
  state.rubber.style.left   = x + "px";
  state.rubber.style.top    = y + "px";
  state.rubber.style.width  = w + "px";
  state.rubber.style.height = h + "px";
}

// ---------- screen-rect → scene-rect → setState fit ----------
// Excalidraw projection (learnings/excalidraw-api.md 2026-06-03):
//   screen = (scene + scrollX) * zoom + canvasRect.{left|top}
// Inverse (canvas-relative px → scene):
//   scene  = px / zoom - scrollX
function zoomFitCanvasRect(px, py, pw, ph) {
  const app = findAppComponent();
  if (!app) { new ea.obsidian.Notice("Zoom Box: App fiber not found"); return; }
  const cur = app.state.zoom?.value ?? 1;
  const sx  = app.state.scrollX ?? 0;
  const sy  = app.state.scrollY ?? 0;
  const cw  = app.state.width   ?? state.overlay.clientWidth;
  const ch  = app.state.height  ?? state.overlay.clientHeight;

  const sceneX1 = px        / cur - sx;
  const sceneY1 = py        / cur - sy;
  const sceneX2 = (px + pw) / cur - sx;
  const sceneY2 = (py + ph) / cur - sy;
  const bboxW = sceneX2 - sceneX1;
  const bboxH = sceneY2 - sceneY1;
  if (bboxW <= 0 || bboxH <= 0) return;
  const cx = (sceneX1 + sceneX2) / 2;
  const cy = (sceneY1 + sceneY2) / 2;

  const usable = 1 - 2 * PAD_FRAC;
  let next = Math.min((cw * usable) / bboxW, (ch * usable) / bboxH);
  next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));

  // Centre bbox in viewport: solving (cx + scrollX) * next = cw/2.
  const nextScrollX = (cw / 2) / next - cx;
  const nextScrollY = (ch / 2) / next - cy;

  app.setState({
    zoom: { value: next },
    scrollX: nextScrollX,
    scrollY: nextScrollY,
    shouldCacheIgnoreZoom: true,   // cheap scaled-cache render for the jump
  });
  // Flip back to false after the jump so the final frame rasterizes crisp.
  setTimeout(() => {
    try { app.setState({ shouldCacheIgnoreZoom: false }); } catch (_) {}
  }, 250);
}

// ---------- inject / re-inject trigger ----------
function injectAll() {
  const toolbar = view.contentEl.querySelector(".App-toolbar");
  if (!toolbar) return false;
  if (toolbar.querySelector("#" + WRAP_ID)) return true;
  toolbar.appendChild(buildDivider());
  toolbar.appendChild(buildTrigger());
  return true;
}
injectAll();

const mo = new MutationObserver(() => {
  injectAll();
  // Keep trigger's active highlight consistent across React remounts.
  const trig = document.getElementById(TRIGGER_ID);
  if (trig && state.armed) trig.setAttribute("data-active", "1");
});
mo.observe(view.contentEl, { childList: true, subtree: true });

view._zoomBoxState = {
  cleanup: () => {
    try { mo.disconnect(); } catch (_) {}
    disarm();
    document.getElementById(WRAP_ID)?.remove();
    document.getElementById(DIVIDER_ID)?.remove();
    view._zoomBoxState = null;
  }
};

new ea.obsidian.Notice("Zoom Box installed — click toolbar icon, drag to zoom", 2400);
/*
```
*/
