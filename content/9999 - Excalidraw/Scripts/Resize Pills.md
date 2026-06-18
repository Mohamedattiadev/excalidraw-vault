---
excalidraw-plugin: parsed
---

/*
Resize Pills — two floating `[−]` `[+]` pills in the group bar above a single
selected text or image element. Click to grow / shrink the element from its
CENTER by `scaleStep` (default 1.15×). For text elements, fontSize scales
with the box (autoResize is preserved). For images, only width + height
scale — Excalidraw redraws from its cached bitmap.

Layout slot (left → right):
  [🎤 Voice] [Σ TeX] [−] [+] [✦ AI] [⛶ Group] [✦ Export]

Multi-select hides the pills (v1). Clamps to a configurable min/max font /
pixel range; rejected scales flash a brief Notice.

EA workbench round-trip is used to mutate geometry — direct
`api.updateScene` paths revert on the next interaction (see
`learnings/bugs-and-fixes.md`).

Pair with `TemplateOfTemplator/resize-pills-startup.md` so the overlay
auto-installs on every Excalidraw view (same idiom as Voice Text / AI Edit).

```javascript
*/
const STYLE_ID  = "excali-resize-style";
const OVL_PREFIX = "excali-resize-overlay-";

// ---------- settings ----------
const settings = ea.getScriptSettings() || {};
let dirty = false;
if (!settings["scaleStep"])    { settings["scaleStep"]    = { value: 1.15, description: "Multiplier per click. + uses this, − uses 1/this." }; dirty = true; }
if (!settings["minFontSize"])  { settings["minFontSize"]  = { value: 6,    description: "Smallest allowed text fontSize." }; dirty = true; }
if (!settings["maxFontSize"])  { settings["maxFontSize"]  = { value: 200,  description: "Largest allowed text fontSize." }; dirty = true; }
if (!settings["minImagePx"])   { settings["minImagePx"]   = { value: 20,   description: "Smallest allowed image width or height in scene px." }; dirty = true; }
if (!settings["maxImagePx"])   { settings["maxImagePx"]   = { value: 4000, description: "Largest allowed image width or height in scene px." }; dirty = true; }
if (dirty) await ea.setScriptSettings(settings);

const SCALE_STEP  = Math.max(1.001, Number(settings["scaleStep"]?.value)  || 1.15);
const MIN_FONT    = Math.max(1,    Number(settings["minFontSize"]?.value) || 6);
const MAX_FONT    = Math.max(MIN_FONT + 1, Number(settings["maxFontSize"]?.value) || 200);
const MIN_IMG_PX  = Math.max(1,    Number(settings["minImagePx"]?.value)  || 20);
const MAX_IMG_PX  = Math.max(MIN_IMG_PX + 1, Number(settings["maxImagePx"]?.value) || 4000);

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// ---------- one overlay per view ----------
const overlayId = OVL_PREFIX + (view.leaf?.id || "default");
const prior = view._resizePillsOverlay;
if (prior && prior.cleanup) prior.cleanup();
document.getElementById(overlayId)?.remove();

// ---------- styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .excali-resize-minus,
    .excali-resize-plus {
      position: fixed; z-index: 2000;
      box-sizing: border-box; appearance: none; -webkit-appearance: none;
      height: 26px; min-width: 30px; padding: 0 8px; margin: 0;
      line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 13px;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      cursor: pointer; user-select: none;
      font-family: var(--font-interface);
      font-size: 14px; font-weight: 800; letter-spacing: 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: background 0.12s, color 0.12s, border-color 0.12s, transform 0.12s;
    }
    .excali-resize-minus:hover,
    .excali-resize-plus:hover {
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-color: var(--interactive-accent);
      transform: translateY(-1px);
    }
    .excali-resize-minus:active,
    .excali-resize-plus:active { transform: translateY(0); }
    .excali-resize-minus.disabled,
    .excali-resize-plus.disabled {
      opacity: 0.45; pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

// ---------- helpers ----------
function sceneToScreen(sceneX, sceneY) {
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  const canvas = view.contentEl.querySelector("canvas.interactive");
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (sceneX + st.scrollX) * zoom,
    y: rect.top  + (sceneY + st.scrollY) * zoom
  };
}
function forwardWheel(e) {
  const c = view.contentEl.querySelector("canvas.interactive");
  if (!c) return;
  e.preventDefault();
  c.dispatchEvent(new WheelEvent("wheel", {
    deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
    clientX: e.clientX, clientY: e.clientY,
    ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
    altKey: e.altKey, metaKey: e.metaKey,
    bubbles: true, cancelable: true
  }));
}
function freshSelectionEls() {
  const st = api.getAppState();
  const ids = Object.keys(st.selectedElementIds || {});
  if (ids.length === 0) return [];
  const all = api.getSceneElements() || [];
  return all.filter(e => ids.includes(e.id));
}

// ---------- overlay state ----------
let minusBtn = null, plusBtn = null, currentEl = null;
let busy = false; // suppress double-clicks while EA round-trip is in flight

function clearOverlay() {
  if (minusBtn) { minusBtn.remove(); minusBtn = null; }
  if (plusBtn)  { plusBtn.remove();  plusBtn  = null; }
}

// Hold-to-repeat: after HOLD_DELAY_MS, fire scale every HOLD_TICK_MS until
// pointer up / leave. Each tick uses the live SCALE_STEP. EA round-trips
// queue serially via the `busy` flag so we never re-enter applyScale.
const HOLD_DELAY_MS = 320;
const HOLD_TICK_MS  = 110;
// Wheel-on-pill: fine-grained scale. Each notch nudges by WHEEL_STEP. Up
// = grow, down = shrink. Coalesces rapid scrolls via a microtask trailing
// edge so we don't spawn 30 EA round-trips on a fast flick.
const WHEEL_STEP = 1.06;

function makeBtn(role, label, title) {
  const b = document.createElement("button");
  b.className = role === "minus" ? "excali-resize-minus" : "excali-resize-plus";
  b.dataset.resizeRole = role;
  b.title = title + " — hold to repeat, scroll to fine-tune";
  b.textContent = label;
  b.addEventListener("mousedown", e => e.stopPropagation(), true);

  // ---- wheel: fine-grained scale ----
  let wheelAccum = 0, wheelPending = false;
  b.addEventListener("wheel", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // deltaY > 0 = scroll down = shrink. Compound notches in one frame.
    const notch = e.deltaY > 0 ? -1 : 1;
    wheelAccum += notch;
    if (wheelPending) return;
    wheelPending = true;
    queueMicrotask(async () => {
      const n = wheelAccum; wheelAccum = 0; wheelPending = false;
      if (!n || busy) return;
      const factor = Math.pow(WHEEL_STEP, n);
      busy = true;
      try { await applyScale(factor); }
      catch (err) { console.error("[Resize Pills wheel]", err); }
      finally { busy = false; }
    });
  }, { passive: false });

  // ---- click + hold-to-repeat ----
  let holdTimer = 0, repeatTimer = 0, didRepeat = false;
  const factorOf = () => (role === "plus" ? SCALE_STEP : (1 / SCALE_STEP));
  const fireOnce = async () => {
    if (busy) return;
    busy = true;
    try { await applyScale(factorOf()); }
    catch (err) {
      console.error("[Resize Pills]", err);
      new ea.obsidian.Notice(`Resize failed: ${err.message || err}`);
    } finally { busy = false; }
  };
  const stopHold = () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = 0; }
  };
  b.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    didRepeat = false;
    holdTimer = setTimeout(() => {
      didRepeat = true;
      // First repeat tick + then steady cadence.
      fireOnce();
      repeatTimer = setInterval(fireOnce, HOLD_TICK_MS);
    }, HOLD_DELAY_MS);
  });
  const endHold = () => stopHold();
  b.addEventListener("pointerup",    endHold);
  b.addEventListener("pointerleave", endHold);
  b.addEventListener("pointercancel", endHold);
  b.onclick = async (e) => {
    e.stopPropagation();
    // If hold-repeat fired, swallow the trailing click so we don't
    // double-apply the last step.
    if (didRepeat) { didRepeat = false; return; }
    await fireOnce();
  };
  document.body.appendChild(b);
  return b;
}

function ensurePills() {
  if (!minusBtn) minusBtn = makeBtn("minus", "−", `Shrink (× ${(1/SCALE_STEP).toFixed(3)})`);
  if (!plusBtn)  plusBtn  = makeBtn("plus",  "+", `Grow (× ${SCALE_STEP.toFixed(3)})`);
}

// Layout convention shared with AI Edit / LaTeX Canvas / Export Element /
// Voice Text. Row order: [Voice] [TeX] [−] [+] [AI] [Group] [Export].
// Each script measures sibling widths each rAF tick + computes the same
// groupW. The shared scheduler's two-pass fanout settles cross-measure on
// the same frame.
function positionPills(el) {
  const topMid = sceneToScreen(el.x + (el.width || 0) / 2, el.y);
  const GAP = 6;
  const MINUS_W = minusBtn.offsetWidth || 30;
  const PLUS_W  = plusBtn.offsetWidth  || 30;

  const voicePill = document.querySelector(".voice-text-mic-pill, .voice-text-stop");
  const voiceW   = voicePill ? voicePill.offsetWidth : 0;
  const texPill  = document.querySelector(".excali-tex-pill");
  const texW     = texPill ? texPill.offsetWidth : 0;
  const aiBtn    = document.querySelector(".ai-edit-btn");
  const aiW      = aiBtn ? aiBtn.offsetWidth : 0;
  const grpPill  = document.querySelector(".excali-group-pill");
  const grpW     = grpPill ? grpPill.offsetWidth : 0;
  const expBar   = document.querySelector(".excali-export-bar");
  const expW     = expBar ? expBar.offsetWidth : 0;

  const groupW =
      (voiceW ? voiceW + GAP : 0)
    + (texW   ? texW   + GAP : 0)
    + MINUS_W + GAP + PLUS_W
    + (aiW    ? GAP + aiW    : 0)
    + (grpW   ? GAP + grpW   : 0)
    + (expW   ? GAP + expW   : 0);

  const groupLeft = topMid.x - groupW / 2;
  const minusLeftBase =
      groupLeft
    + (voiceW ? voiceW + GAP : 0)
    + (texW   ? texW   + GAP : 0);
  let minusLeft = Math.round(minusLeftBase);
  let plusLeft  = Math.round(minusLeftBase + MINUS_W + GAP);
  let topPx     = Math.round(topMid.y - 34);

  const canvas = view.contentEl.querySelector("canvas.interactive");
  const cRect  = canvas ? canvas.getBoundingClientRect() : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };

  const elRightPx  = sceneToScreen(el.x + (el.width || 0), el.y).x;
  const elBottomPx = sceneToScreen(el.x, el.y + (el.height || 0)).y;
  if (topMid.y > cRect.bottom || elBottomPx < cRect.top ||
      elRightPx < cRect.left  || topMid.x > cRect.right) {
    clearOverlay(); currentEl = null; return;
  }
  if (topPx < cRect.top + 6) topPx = cRect.top + 6;
  const minLeftPx = cRect.left + 6;
  if (minusLeft < minLeftPx) {
    const shift = minLeftPx - minusLeft;
    minusLeft += shift; plusLeft += shift;
  }
  const maxRight = (cRect.right || window.innerWidth) - 6;
  if (plusLeft + PLUS_W > maxRight) {
    const shift = (plusLeft + PLUS_W) - maxRight;
    minusLeft -= shift; plusLeft -= shift;
  }

  // Skip DOM writes when integer pixel coords are unchanged to avoid
  // layout thrash while panning. Same trick as Voice Text.
  if (minusBtn._lastLeft !== minusLeft || minusBtn._lastTop !== topPx) {
    minusBtn.style.left = `${minusLeft}px`;
    minusBtn.style.top  = `${topPx}px`;
    minusBtn._lastLeft = minusLeft; minusBtn._lastTop = topPx;
  }
  if (plusBtn._lastLeft !== plusLeft || plusBtn._lastTop !== topPx) {
    plusBtn.style.left = `${plusLeft}px`;
    plusBtn.style.top  = `${topPx}px`;
    plusBtn._lastLeft = plusLeft; plusBtn._lastTop = topPx;
  }
}

function updateClampHints(el, factor) {
  // Best-effort: dim the pill that would violate the clamp on next click.
  if (!minusBtn || !plusBtn) return;
  const grow = el; // current element snapshot
  const cantGrow = wouldClamp(grow, SCALE_STEP);
  const cantShrink = wouldClamp(grow, 1 / SCALE_STEP);
  plusBtn.classList.toggle("disabled", cantGrow);
  minusBtn.classList.toggle("disabled", cantShrink);
}

function wouldClamp(el, factor) {
  if (el.type === "text") {
    const next = (el.fontSize || 20) * factor;
    return next < MIN_FONT || next > MAX_FONT;
  }
  if (el.type === "image") {
    const nw = (el.width  || 0) * factor;
    const nh = (el.height || 0) * factor;
    return nw < MIN_IMG_PX || nh < MIN_IMG_PX || nw > MAX_IMG_PX || nh > MAX_IMG_PX;
  }
  return true;
}

async function applyScale(factor) {
  const els = freshSelectionEls();
  if (els.length !== 1) return; // multi-select handled by refresh()
  const cur = els[0];
  if (cur.type !== "text" && cur.type !== "image") return;
  if (wouldClamp(cur, factor)) {
    new ea.obsidian.Notice(factor > 1 ? "at max size" : "at min size", 1400);
    return;
  }
  const oldW = cur.width  || 0;
  const oldH = cur.height || 0;
  const newW = oldW * factor;
  const newH = oldH * factor;
  const newX = cur.x + (oldW - newW) / 2;
  const newY = cur.y + (oldH - newH) / 2;

  // EA workbench round-trip — direct api.updateScene mutations revert on
  // the next click because the plugin re-derives geometry from its
  // binding cache. See learnings/bugs-and-fixes.md.
  ea.reset();
  ea.copyViewElementsToEAforEditing([cur]);
  const eel = ea.getElement(cur.id);
  if (!eel) throw new Error("EA workbench missing element");
  eel.x = newX; eel.y = newY;
  eel.width = newW; eel.height = newH;
  if (cur.type === "text") {
    const oldFs = cur.fontSize || 20;
    eel.fontSize = oldFs * factor;
    // Preserve autoResize:false if the element already opted out. Do NOT
    // toggle it — flipping autoResize re-derives width from line metrics
    // on next render and undoes our box scale.
    if (cur.autoResize === false) eel.autoResize = false;
  }
  await ea.addElementsToView(false, true, false);
}

// ---------- selection watcher ----------
function isViewLive() {
  if (!view.contentEl?.isConnected) return false;
  const active = app.workspace.activeLeaf?.view;
  if (active !== view) return false;
  const r = view.contentEl.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function refresh() {
  if (!isViewLive()) { clearOverlay(); currentEl = null; return; }
  const st = api.getAppState();
  const ids = Object.keys(st.selectedElementIds || {});
  if (ids.length !== 1) { clearOverlay(); currentEl = null; return; }
  const el = (api.getSceneElements() || []).find(e => e.id === ids[0]);
  // Image-only. Text elements get their own font-size control in the
  // Excalidraw side panel + native handle drag; adding [−][+] on text was
  // redundant and crowded the row.
  if (!el || el.type !== "image") {
    clearOverlay(); currentEl = null; return;
  }
  // Zoom-out hide: match neighbours so the row collapses together.
  const zoom = st.zoom?.value || 1;
  if ((el.width || 0) * zoom < 50) { clearOverlay(); currentEl = null; return; }
  currentEl = el;
  ensurePills();
  positionPills(el);
  updateClampHints(el);
}

// Shared pill-tick scheduler — same one used by AI Edit / Voice Text /
// LaTeX Canvas / Export Element. Subscribing here means all five scripts
// fan out off a single rAF loop and resolve cross-measurement in two
// passes per dirty frame.
const PILL_TICK_KEY = "__excaliPillTick_" + (view.leaf?.id || "default");
function ensurePillTick() {
  let sched = window[PILL_TICK_KEY];
  if (sched && sched.view === view) return sched;
  if (sched) { try { sched.stop(); } catch (_) {} }
  sched = { view, subs: new Set(), lastSig: "", running: true, handle: 0 };
  const sig = () => {
    try {
      const st = api.getAppState();
      const ids = Object.keys(st.selectedElementIds || {});
      ids.sort();
      let geom = "";
      if (ids.length) {
        const all = api.getSceneElements() || [];
        const byId = new Map(all.map(e => [e.id, e]));
        for (const id of ids) {
          const e = byId.get(id);
          if (e) geom += `${e.x}|${e.y}|${e.width}|${e.height};`;
        }
      }
      return `${ids.join(",")}|${st.zoom?.value}|${st.scrollX}|${st.scrollY}|${st.theme}|${geom}`;
    } catch (_) { return Math.random().toString(); }
  };
  sched.forceNext = () => { sched.lastSig = ""; sched.pendingPasses = 2; };
  sched.pendingPasses = 0;
  const fanout = () => { for (const fn of sched.subs) { try { fn(); } catch (_) {} } };
  const loop = () => {
    if (!sched.running) return;
    sched.handle = requestAnimationFrame(loop);
    sched.frame = (sched.frame | 0) + 1;
    if ((sched.frame & 1) && sched.pendingPasses <= 0) return;
    if (sched.subs.size === 0) return;
    const s = sig();
    if (s !== sched.lastSig) {
      sched.lastSig = s; fanout(); sched.pendingPasses = 1;
    } else if (sched.pendingPasses > 0) {
      sched.pendingPasses--; fanout();
    }
  };
  sched.stop = () => {
    sched.running = false;
    cancelAnimationFrame(sched.handle);
    if (window[PILL_TICK_KEY] === sched) delete window[PILL_TICK_KEY];
  };
  sched.handle = requestAnimationFrame(loop);
  window[PILL_TICK_KEY] = sched;
  return sched;
}
const pillTick = ensurePillTick();
pillTick.subs.add(refresh);
const unsubScroll = api.onScrollChange?.(() => { pillTick.forceNext?.(); refresh(); });
const ro = (typeof ResizeObserver === "function")
  ? new ResizeObserver(() => { pillTick.forceNext?.(); refresh(); }) : null;
if (ro) ro.observe(view.contentEl);

view._resizePillsInstalled = true;
view._resizePillsOverlay = {
  cleanup: () => {
    pillTick.subs.delete(refresh);
    if (pillTick.subs.size === 0) { try { pillTick.stop(); } catch (_) {} }
    try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
    try { ro?.disconnect(); } catch (_) {}
    clearOverlay();
    view._resizePillsInstalled = false;
    view._resizePillsOverlay = null;
  }
};
refresh();
/*
```
*/
