---
excalidraw-plugin: parsed
---

/*
Mask Toggle — one-click flip of mask visibility (show ↔ hide).
Targets every element tagged `customData.maskLayer=true`.
Pairs with the Mask Highlighter section in Pen Styles for drawing/clearing.

```javascript
*/
var MASK_TAG = "maskLayer";
var HIDDEN_OPACITY = 25;

// Remove stale About entry that earlier seeded an unwanted input field.
(async () => {
  const s = ea.getScriptSettings() || {};
  if (s["About"]) { delete s["About"]; await ea.setScriptSettings(s); }
})();

var view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
var api = ea.getExcalidrawAPI();
if (!api || typeof api.getSceneElements !== "function") {
  new ea.obsidian.Notice("Excalidraw API unavailable"); return;
}

var elements = api.getSceneElements() || [];
var masks = elements.filter(
  el => el.customData && el.customData[MASK_TAG] === true && !el.isDeleted
);
if (!masks.length) { new Notice("No masks in view."); return; }

// Determine target state from the first mask. If state field missing, infer
// from opacity: anything <= HIDDEN_OPACITY treated as hidden.
var first = masks[0];
var refState = first.customData.maskState
  || ((first.opacity ?? 100) <= HIDDEN_OPACITY ? "hidden" : "visible");
var nextVisible = (refState !== "visible");

var cfg = window.__penStylesState && window.__penStylesState.cfg;
var showOpacity = (cfg && typeof cfg.maskOpacity === "number") ? cfg.maskOpacity : 80;
showOpacity = Math.max(0, Math.min(100, showOpacity));

var ids = new Set(masks.map(m => m.id));
var next = elements.map(el => {
  if (!ids.has(el.id)) return el;
  const tint = el.customData && el.customData.maskTint;
  return {
    ...el,
    opacity: nextVisible ? (tint ? showOpacity : 100) : HIDDEN_OPACITY,
    customData: {
      ...(el.customData || {}),
      maskState: nextVisible ? "visible" : "hidden"
    }
  };
});
api.updateScene({ elements: next, commitToHistory: false });

new Notice(`${masks.length} mask(s) ${nextVisible ? "👁 shown" : "🙈 hidden"}`);
/*
```
*/
