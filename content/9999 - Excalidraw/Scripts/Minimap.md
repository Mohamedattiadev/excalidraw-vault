---
excalidraw-plugin: parsed
---

/*
Minimap — bottom-right floating overview of the Excalidraw scene.

- Simplified rectangle-per-element render at 1:N scale.
- Red viewport rectangle shows current visible region.
- Click / drag in minimap pans the main canvas.
- Updates on scene change, scroll, zoom.
- Auto-opens on every Excalidraw view when paired with the Templater
  startup template `TemplateOfTemplator/minimap-startup.md`.

```javascript
*/
const PANEL_ID = "excali-minimap-panel";
const STYLE_ID = "excali-minimap-style";
const MAP_W = 180;
const MAP_H = 130;

{
  const _s = ea.getScriptSettings() || {};
  let dirty = false;
  // Remove stale About entry that earlier seeded an unwanted input field.
  if (_s["About"]) { delete _s["About"]; dirty = true; }
  if (!_s["Auto-open on view"]) {
    _s["Auto-open on view"] = {
      value: "yes",
      description: "Whether the minimap should auto-open on every view (used by the Templater startup template).",
      valueset: ["yes", "no"]
    };
    dirty = true;
  }
  if (dirty) ea.setScriptSettings(_s);
}

var view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
var api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// ---------- per-view cache ----------
// The same leaf object is reused when the user switches to a different
// Excalidraw file inside the same tab. The previous minimap captured the
// OLD view's scene -> stays empty for the new file. Tear down + rebuild.
const currentFileId = view.file?.path || "";
var existing = view._minimap;
if (existing && existing.fileId === currentFileId && document.body.contains(existing.panel)) {
  // Same file -> re-firing the script toggles visibility. Also kill
  // any orphan panels from prior runs while we're here.
  document.querySelectorAll(".excali-minimap").forEach(el => {
    if (el !== existing.panel) el.remove();
  });
  const hidden = existing.panel.style.display === "none";
  existing.panel.style.display = hidden ? "" : "none";
  if (hidden) existing.redraw();
  return;
}
// File changed (or stale) -> destroy + rebuild fresh.
if (existing && typeof existing.destroy === "function") {
  try { existing.destroy(); } catch (_) {}
}
// Defensive nuke: Templater auto-runs minimap on every Excalidraw
// view mount. Session embeds, popouts and tab swaps each create a
// fresh `view` object, so view._minimap can't see siblings from
// other views. Wipe every stale panel before building a new one.
document.querySelectorAll(".excali-minimap").forEach(el => el.remove());

// ---------- styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .excali-minimap {
      position: absolute; right: 14px; bottom: 14px;
      width: ${MAP_W}px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.32);
      z-index: 50;
      font-family: var(--font-interface);
      font-size: 11px;
      user-select: none;
      overflow: hidden;
      backdrop-filter: blur(6px);
    }
    .excali-minimap .mm-header {
      height: 26px; padding: 0 10px;
      display: flex; align-items: center; justify-content: space-between;
      cursor: grab;
      background: linear-gradient(180deg, var(--background-secondary), var(--background-primary));
      color: var(--text-muted);
      border-bottom: 1px solid var(--background-modifier-border);
      font-weight: 600; letter-spacing: 0.3px;
    }
    .excali-minimap .mm-title { display: flex; align-items: center; gap: 6px; }
    .excali-minimap .mm-title svg { color: var(--text-accent); }
    .excali-minimap .mm-header:active { cursor: grabbing; }
    .excali-minimap .mm-actions { display: flex; gap: 2px; }
    .excali-minimap .mm-btn {
      cursor: pointer; padding: 2px 6px; border-radius: 4px;
      color: var(--text-muted);
    }
    .excali-minimap .mm-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
    .excali-minimap .mm-canvas-wrap {
      padding: 6px; background: var(--background-primary);
    }
    .excali-minimap canvas {
      display: block; width: ${MAP_W - 12}px; height: ${MAP_H}px;
      background: var(--background-secondary);
      border-radius: 6px;
      cursor: crosshair;
    }
    .excali-minimap.is-collapsed .mm-canvas-wrap,
    .excali-minimap.is-collapsed .mm-footer { display: none; }
    .excali-minimap.is-collapsed .mm-header { border-bottom: none; }
    .excali-minimap .mm-footer {
      font-size: 10px; color: var(--text-faint);
      padding: 4px 10px 6px; display: flex; justify-content: space-between;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
    }
  `;
  document.head.appendChild(s);
}

// ---------- modal-aware auto-hide (shared across all script panels) ----------
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

// ---------- panel DOM ----------
const panel = document.createElement("div");
panel.id = PANEL_ID;
panel.className = "excali-minimap excali-floating-panel";
panel.innerHTML = `
  <div class="mm-header">
    <span class="mm-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
      Minimap
    </span>
    <span class="mm-actions">
      <span class="mm-btn mm-fit" title="Fit to scene">⊡</span>
      <span class="mm-btn mm-close" title="Hide">✕</span>
    </span>
  </div>
  <div class="mm-canvas-wrap"></div>
  <div class="mm-footer">
    <span class="mm-count">0 elements</span>
    <span class="mm-zoom">100%</span>
  </div>
`;
const canvas = document.createElement("canvas");
canvas.width = MAP_W - 12;
canvas.height = MAP_H;
panel.querySelector(".mm-canvas-wrap").appendChild(canvas);
const _panelHost =
  view.contentEl.querySelector(".excalidraw") || view.contentEl;
if (_panelHost && getComputedStyle(_panelHost).position === "static") {
  _panelHost.style.position = "relative";
}
_panelHost.appendChild(panel);

panel.querySelector(".mm-close").onclick = () => { panel.style.display = "none"; };
function clampPanel() {
  const hr = _panelHost.getBoundingClientRect();
  const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
  const cl = panel.offsetLeft, ct = panel.offsetTop;
  if (ct + h > hr.height - m) {
    panel.style.top = `${Math.max(m, hr.height - m - h)}px`;
    panel.style.bottom = "auto";
  }
  if (cl + w > hr.width - m) {
    panel.style.left = `${Math.max(m, hr.width - m - w)}px`;
    panel.style.right = "auto";
  }
  if (ct < m) panel.style.top = `${m}px`;
  if (cl < m) panel.style.left = `${m}px`;
}
panel.querySelector(".mm-header").addEventListener("dblclick", (e) => {
  if (e.target.closest(".mm-actions")) return;
  panel.classList.toggle("is-collapsed");
  if (!panel.classList.contains("is-collapsed")) {
    requestAnimationFrame(() => { clampPanel(); redraw(); });
  }
});
panel.querySelector(".mm-fit").onclick = () => {
  const els = (api.getSceneElements() || []).filter(e => !e.isDeleted);
  if (els.length) api.zoomToFit(els, 10);
};
const countEl = panel.querySelector(".mm-count");
const zoomEl  = panel.querySelector(".mm-zoom");

// drag header to move
(function makeDraggable() {
  let dragging = false, ox = 0, oy = 0;
  const header = panel.querySelector(".mm-header");
  header.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("mm-close")) return;
    const r = panel.getBoundingClientRect();
    dragging = true; ox = e.clientX - r.left; oy = e.clientY - r.top;
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
    panel.style.right = "auto"; panel.style.bottom = "auto";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
})();

const ctx = canvas.getContext("2d");
const C_W = canvas.width, C_H = canvas.height;

// ---------- redraw ----------
let lastBox = null;          // last scene bbox covering all elements
let lastSceneSig = "";       // hash of scene state for change detection
let offCanvas = null;        // cached element-layer raster
let offCtx = null;
function getOff() {
  if (!offCanvas) {
    offCanvas = document.createElement("canvas");
    offCanvas.width = C_W; offCanvas.height = C_H;
    offCtx = offCanvas.getContext("2d");
  }
  return offCanvas;
}
function sceneSignature(els) {
  // O(n) but cheap per element — id + xywh + color. When unchanged we
  // reuse the cached element-layer raster instead of redrawing N rects.
  let h = 0;
  for (const e of els) {
    h = ((h << 5) - h + (e.id?.charCodeAt(0) || 0) + (e.x|0) + (e.y|0) + ((e.width|0)<<1) + ((e.height|0)<<2)) | 0;
  }
  return `${els.length}:${h}`;
}
function computeBox() {
  // Bail safely if the captured view is gone (user switched away,
  // popout closed, or session note replaced the leaf). Returning a
  // dummy box avoids the clientWidth-of-undefined crash spam.
  if (!view || !view.contentEl) return { x: 0, y: 0, w: 1, h: 1 };
  const els = (api.getSceneElements() || []).filter(e => !e.isDeleted);
  if (!els.length) {
    // fall back to viewport-sized box centered on current scroll so click-to-pan still works
    const st = api.getAppState();
    const w = view.contentEl.clientWidth  / (st.zoom?.value || 1);
    const h = view.contentEl.clientHeight / (st.zoom?.value || 1);
    return { x: -st.scrollX, y: -st.scrollY, w, h };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width  || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));
  }
  // pad so elements aren't flush with edge
  const padX = (maxX - minX) * 0.05 + 50;
  const padY = (maxY - minY) * 0.05 + 50;
  return { x: minX - padX, y: minY - padY, w: (maxX - minX) + padX * 2, h: (maxY - minY) + padY * 2 };
}

function redraw() {
  if (panel.style.display === "none") return;
  const allEls = (api.getSceneElements() || []).filter(e => !e.isDeleted);
  const sig = sceneSignature(allEls);
  const sceneChanged = sig !== lastSceneSig;
  let box = lastBox;
  if (sceneChanged || !box) {
    box = computeBox();
    lastBox = box;
  }
  const scale = Math.min(C_W / box.w, C_H / box.h);
  const offX = (C_W - box.w * scale) / 2;
  const offY = (C_H - box.h * scale) / 2;

  // Element layer cache. Re-rasterize only when the scene actually
  // changed. Scroll-only redraws skip the per-element loop entirely.
  if (sceneChanged) {
    const oc = getOff();
    offCtx.clearRect(0, 0, C_W, C_H);
    for (const el of allEls) {
      const x = (el.x - box.x) * scale + offX;
      const y = (el.y - box.y) * scale + offY;
      const w = Math.max(1, (el.width  || 1) * scale);
      const h = Math.max(1, (el.height || 1) * scale);
      if (el.customData && el.customData.maskLayer) {
        offCtx.fillStyle = (el.customData.maskTint || "#fff3a8") + "80";
        offCtx.fillRect(x, y, w, h);
      } else if (el.backgroundColor && el.backgroundColor !== "transparent") {
        offCtx.fillStyle = el.backgroundColor;
        offCtx.fillRect(x, y, w, h);
      } else {
        offCtx.strokeStyle = el.strokeColor || "#999";
        offCtx.lineWidth = 1;
        offCtx.strokeRect(x + 0.5, y + 0.5, w, h);
      }
    }
    countEl.textContent = `${allEls.length} elements`;
    lastSceneSig = sig;
  }
  ctx.clearRect(0, 0, C_W, C_H);
  ctx.drawImage(getOff(), 0, 0);
  const stZoom = api.getAppState().zoom?.value || 1;
  zoomEl.textContent = `${Math.round(stZoom * 100)}%`;

  // viewport rect — skip if the view is gone (popout closed etc.)
  if (!view || !view.contentEl) return;
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  const vpW = view.contentEl.clientWidth  / zoom;
  const vpH = view.contentEl.clientHeight / zoom;
  const vpX = -st.scrollX;
  const vpY = -st.scrollY;
  const rx = (vpX - box.x) * scale + offX;
  const ry = (vpY - box.y) * scale + offY;
  const rw = vpW * scale;
  const rh = vpH * scale;
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = "rgba(231,76,60,0.10)";
  ctx.fillRect(rx, ry, rw, rh);
}

// click/drag pan
function mapToScene(mx, my) {
  if (!lastBox) return null;
  const scale = Math.min(C_W / lastBox.w, C_H / lastBox.h);
  const offX = (C_W - lastBox.w * scale) / 2;
  const offY = (C_H - lastBox.h * scale) / 2;
  const sx = (mx - offX) / scale + lastBox.x;
  const sy = (my - offY) / scale + lastBox.y;
  return { sx, sy };
}
function panTo(sceneX, sceneY) {
  if (!view || !view.contentEl) return;
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  const vpW = view.contentEl.clientWidth  / zoom;
  const vpH = view.contentEl.clientHeight / zoom;
  api.updateScene({
    appState: { scrollX: -(sceneX - vpW / 2), scrollY: -(sceneY - vpH / 2) },
    commitToHistory: false
  });
}
let dragPan = false;
canvas.addEventListener("mousedown", (e) => {
  dragPan = true;
  const r = canvas.getBoundingClientRect();
  const p = mapToScene(e.clientX - r.left, e.clientY - r.top);
  if (p) panTo(p.sx, p.sy);
});
canvas.addEventListener("mousemove", (e) => {
  if (!dragPan) return;
  const r = canvas.getBoundingClientRect();
  const p = mapToScene(e.clientX - r.left, e.clientY - r.top);
  if (p) panTo(p.sx, p.sy);
});
window.addEventListener("mouseup", () => { dragPan = false; });

// ---------- subscribe to scene + scroll updates ----------
const onResize = () => clampPanel();
window.addEventListener("resize", onResize);
const unsubScroll = api.onScrollChange((sx, sy, zoom) => redraw());
let sceneTimer = null;
const onSceneChange = () => {
  if (sceneTimer) return;
  sceneTimer = setTimeout(() => { sceneTimer = null; redraw(); }, 150);
};
// onSceneChange isn't always exposed by name; fall back to a poll on appState every 500ms.
const poll = setInterval(onSceneChange, 500);

view._minimap = {
  panel, canvas, redraw, fileId: currentFileId,
  destroy: () => {
    try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
    try { window.removeEventListener("resize", onResize); } catch (_) {}
    clearInterval(poll);
    panel.remove();
    view._minimap = null;
  }
};

redraw();

// Auto-hide minimap panels on non-scriptable views (webviewer,
// session embed, popup, regular file). Session notes under Collab/
// are also treated as non-scriptable since they're a single embed.
//
// Tear down old hook + register fresh — closure on each script run
// captures the latest `view._minimap.destroy` so toggling Main→1→Main
// rebuilds correctly even when Templater doesn't re-fire.
if (window.__minimapLeafHook) {
  try { app.workspace.offref(window.__minimapLeafHook); } catch (_) {}
  window.__minimapLeafHook = null;
}
window.__minimapLeafHook = app.workspace.on("active-leaf-change", (leaf) => {
  const isExcali = leaf?.view?.getViewType?.() === "excalidraw";
  const path = leaf?.view?.file?.path || "";
  const isSession = path.startsWith("Collab/");
  const show = isExcali && !isSession;
  const panels = document.querySelectorAll(".excali-minimap");
  panels.forEach(el => { el.style.display = show ? "" : "none"; });

  // Returning to a scriptable Excalidraw view but no panel exists
  // (Templater didn't fire — fast tab switch / cached leaf). Trigger
  // a rebuild via the official command so this view gets its minimap.
  if (show && panels.length === 0) {
    try {
      // Excalidraw plugin registers each user script as a command
      // with id pattern `obsidian-excalidraw-plugin:user-<Script Name>`.
      // Best-effort lookup; ignore if id varies.
      const cmds = app.commands?.listCommands?.() || [];
      const c = cmds.find(c => /minimap/i.test(c.id) || /minimap/i.test(c.name || ""));
      if (c) app.commands.executeCommandById(c.id);
    } catch (_) {}
  }
});
/*
```
*/
