---
excalidraw-plugin: parsed
---

/*
Mask Tap Listener — invisible background script.

Installs the per-Excalidraw-view canvas listener that lets the user
toggle an existing mask by Ctrl/Cmd/Shift+click (laptop) or finger
tap (iPad). No UI. No Notice. No panel.

Use:
  - Pin this script in Excalidraw plugin settings -> a command appears
    like "Excalidraw: Mask Tap Listener".
  - Bind that command to a hotkey, OR run it from Templater on workspace
    ready (see snippet at the bottom of this file).

Pairs with the Mask Highlighter pen preset in `Pen Styles.md` and with
`Mask Toggle.md`.

```javascript
*/
var MASK_TAG = "maskLayer";
var MASK_HIDDEN_OPACITY = 25;

// -----------------------------------------------------------------------------
// Excalidraw script settings.
// Renders under "Settings for installed Scripts" in the Excalidraw plugin
// pane after this script has run at least once.
// -----------------------------------------------------------------------------
function clampNum(v, lo, hi, fallback) {
  var n = parseFloat(v);
  if (!isFinite(n)) return fallback;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

var DEFAULTS = {
  "Modifier key": {
    value: "ctrl",
    description:
      "Mouse / Apple Pencil: hold this key while clicking a mask to flip " +
      "it. iPad finger tap toggles regardless of this choice.",
    valueset: ["ctrl", "shift", "alt", "meta"]
  },
  "Hidden opacity (%)": {
    value: 25,
    description:
      "Opacity used when a mask is hidden. 0 = invisible. 25 = soft " +
      "ghost so you still see where masks sit. 100 = no hiding."
  },
  "Hit tolerance (px)": {
    value: 6,
    description:
      "Extra pixels added to the mask stroke radius when hit-testing a " +
      "click. Higher = easier to tap thin strokes; lower = more precise."
  }
};
var settings = ea.getScriptSettings() || {};
var changed = false;
for (var k in DEFAULTS) {
  if (!settings[k]) { settings[k] = JSON.parse(JSON.stringify(DEFAULTS[k])); changed = true; }
  else if (settings[k].description !== DEFAULTS[k].description) {
    settings[k].description = DEFAULTS[k].description; changed = true;
  }
}
// Remove stale About entry from earlier versions.
if (settings["About"]) { delete settings["About"]; changed = true; }
if (changed) await ea.setScriptSettings(settings);

var liveModifier  = String(settings["Modifier key"]?.value || "ctrl").toLowerCase();
var liveHideOp    = clampNum(settings["Hidden opacity (%)"]?.value, 0, 100, 25);
var liveTolerance = clampNum(settings["Hit tolerance (px)"]?.value, 0, 40, 6);
MASK_HIDDEN_OPACITY = liveHideOp;

var view = ea.targetView;
if (!view) return;
var api = ea.getExcalidrawAPI();
if (!api || typeof api.getSceneElements !== "function") return;

var canvasEl = view.contentEl.querySelector("canvas.interactive");
if (!canvasEl) return;

// Tear down prior install (e.g. re-firing on view switch).
var prior = window.__penStylesMaskTap;
if (prior && prior.host) {
  if (prior.down)  prior.host.removeEventListener("pointerdown", prior.down,  true);
  if (prior.move)  prior.host.removeEventListener("pointermove", prior.move,  true);
  if (prior.up)    prior.host.removeEventListener("pointerup",   prior.up,    true);
  if (prior.click) {
    prior.host.removeEventListener("click",    prior.click, true);
    prior.host.removeEventListener("dblclick", prior.click, true);
  }
}

var hostEl = view.contentEl;
var active = null;

function shouldHandle(e) {
  if (e.pointerType === "touch") return true;
  switch (liveModifier) {
    case "ctrl":  return !!e.ctrlKey;
    case "shift": return !!e.shiftKey;
    case "alt":   return !!e.altKey;
    case "meta":  return !!e.metaKey;
    default:      return !!(e.ctrlKey || e.metaKey || e.shiftKey);
  }
}
function clientToScene(clientX, clientY) {
  var rect = canvasEl.getBoundingClientRect();
  var app = api.getAppState();
  var zoom = (app.zoom && app.zoom.value) || 1;
  return {
    x: (clientX - rect.left) / zoom - app.scrollX,
    y: (clientY - rect.top)  / zoom - app.scrollY
  };
}
function pointSegDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  var len2 = dx * dx + dy * dy;
  var t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  var cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function hitMaskAt(sx, sy) {
  var masks = (api.getSceneElements() || []).filter(
    function (el) { return el.customData && el.customData[MASK_TAG] === true && !el.isDeleted; }
  );
  for (var i = masks.length - 1; i >= 0; i--) {
    var m = masks[i];
    var lx = sx - m.x, ly = sy - m.y;
    var r = ((m.strokeWidth || 18) / 2) + liveTolerance;
    var pts = m.points || [];
    if (pts.length === 0) continue;
    if (pts.length === 1) {
      if (Math.hypot(lx - pts[0][0], ly - pts[0][1]) <= r) return m;
      continue;
    }
    for (var j = 1; j < pts.length; j++) {
      if (pointSegDist(lx, ly, pts[j-1][0], pts[j-1][1], pts[j][0], pts[j][1]) <= r) return m;
    }
  }
  return null;
}
function setMaskVisible(m, visible) {
  var elements = api.getSceneElements() || [];
  var tint = m.customData && m.customData.maskTint;
  var st = window.__penStylesState;
  var showOpacity = (st && st.cfg && typeof st.cfg.maskOpacity === "number") ? st.cfg.maskOpacity : 100;
  var nextOpacity = visible ? (tint ? showOpacity : 100) : MASK_HIDDEN_OPACITY;
  var changed = false;
  var next = elements.map(function (el) {
    if (el.id !== m.id) return el;
    changed = true;
    return Object.assign({}, el, {
      opacity: nextOpacity,
      customData: Object.assign({}, el.customData || {}, { maskState: visible ? "visible" : "hidden" })
    });
  });
  if (changed) api.updateScene({ elements: next, commitToHistory: true });
}

// Custom drag handler: Excalidraw freedraw hit-test is polyline-only,
// so plain pointerdown inside the visible blob misses the element and
// starts a marquee instead of a drag. We intercept pointerdown on a
// mask + translate its x/y directly during pointermove. Plain click
// (no drag) → force-select. Modifier/touch tap (no drag) → toggle
// hide/show. Plain click on a draw tool → pass through to Excalidraw.
var drag = null;
var onDown = function (e) {
  drag = null;
  if (e.target !== canvasEl) return;
  var sc = clientToScene(e.clientX, e.clientY);
  var hit = hitMaskAt(sc.x, sc.y);
  if (!hit) return;
  var tool = api.getAppState() && api.getAppState().activeTool && api.getAppState().activeTool.type;
  var modifier = shouldHandle(e);
  if (!modifier && tool !== "selection") return;
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  drag = {
    hit: hit, kind: modifier ? "toggle" : "select",
    downX: e.clientX, downY: e.clientY,
    downSx: sc.x, downSy: sc.y,
    origX: hit.x, origY: hit.y,
    dragged: false
  };
};
var onMove = function (e) {
  if (!drag) return;
  var pdx = e.clientX - drag.downX, pdy = e.clientY - drag.downY;
  if (!drag.dragged) {
    if (pdx * pdx + pdy * pdy <= 25) return;
    drag.dragged = true;
  }
  var sc = clientToScene(e.clientX, e.clientY);
  var nx = drag.origX + (sc.x - drag.downSx);
  var ny = drag.origY + (sc.y - drag.downSy);
  var elements = api.getSceneElements() || [];
  var next = elements.map(function (el) {
    if (el.id !== drag.hit.id) return el;
    return Object.assign({}, el, { x: nx, y: ny });
  });
  api.updateScene({ elements: next, commitToHistory: false });
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
};
var onUp = function (e) {
  if (!drag) return;
  var s = drag; drag = null;
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  if (s.dragged) {
    var elements = api.getSceneElements() || [];
    api.updateScene({ elements: elements, commitToHistory: true });
    try {
      var sel1 = {}; sel1[s.hit.id] = true;
      api.updateScene({ appState: { selectedElementIds: sel1 }, commitToHistory: false });
    } catch (_) {}
    return;
  }
  if (s.kind === "toggle") {
    var fresh = (api.getSceneElements() || []).find(function (el) { return el.id === s.hit.id; }) || s.hit;
    var visible = (fresh.customData && fresh.customData.maskState || "visible") === "visible";
    setMaskVisible(fresh, !visible);
    var st = window.__penStylesState;
    if (st && typeof st.refreshMaskStatus === "function") st.refreshMaskStatus();
  } else {
    try {
      var sel2 = {}; sel2[s.hit.id] = true;
      api.updateScene({ appState: { selectedElementIds: sel2 }, commitToHistory: false });
    } catch (_) {}
  }
};
var onClickLike = function (e) {
  if (!shouldHandle(e)) return;
  var sc = clientToScene(e.clientX, e.clientY);
  if (!hitMaskAt(sc.x, sc.y)) return;
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
/*
```

---

Templater snippet (paste into a startup template):

```js
<%*
const trigger = () => {
  const id = "obsidian-excalidraw-plugin:Mask Tap Listener.md";
  if (app.commands.commands[id]) app.commands.executeCommandById(id);
};
// Fire whenever an Excalidraw leaf becomes active so a fresh view gets the listener.
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf && leaf.view && leaf.view.getViewType && leaf.view.getViewType() === "excalidraw") {
    setTimeout(trigger, 150);
  }
});
%>
```

Replace the command id with the one Excalidraw assigns after you pin
this script (see the "Excalidraw: ..." entries in Obsidian's command
palette).
*/
