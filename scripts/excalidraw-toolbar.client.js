// Custom toolbar for Excalidraw viewer pages.
// 5 tools: dark/light, pen, eraser, minimap, zoom-box.
// Strokes persisted per scene slug in localStorage.

(function () {
  if (window.__excToolbarInit) return;
  window.__excToolbarInit = true;

  const SLUG = (document.body?.dataset?.slug ?? location.pathname).replace(/[^a-z0-9_-]+/gi, "_");
  const PEN_KEY = "exc-pen:" + SLUG;
  const COLORS = { light: "#1971c2", dark: "#74c0fc" };
  const ERASE_RADIUS = 12;

  let state = {
    tool: "none",
    strokes: loadStrokes(),
    drawing: null,
    minimapOn: false,
    app: null,
    host: null,
    canvas: null,
    overlay: null,
    octx: null,
    minimap: null,
    mctx: null,
  };

  function loadStrokes() {
    try {
      return JSON.parse(localStorage.getItem(PEN_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveStrokes() {
    try {
      localStorage.setItem(PEN_KEY, JSON.stringify(state.strokes));
    } catch {}
  }

  function findApp(host) {
    const sels = [".excalidraw__canvas.interactive", ".excalidraw", ".excalidraw-wrapper"];
    for (const sel of sels) {
      const el = host.querySelector(sel);
      if (!el) continue;
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (!key) continue;
      let fiber = el[key];
      for (let i = 0; i < 80 && fiber; i++) {
        const sn = fiber.stateNode;
        if (sn?.setState && sn?.state?.zoom) return sn;
        fiber = fiber.return;
      }
    }
    return null;
  }

  function getAppState() {
    const api = window.__excApi;
    if (api && api.getAppState) {
      try { return api.getAppState(); } catch {}
    }
    return state.app ? state.app.state : null;
  }
  function getViewport() {
    const s = getAppState();
    if (!s || !state.canvas) return null;
    const z = (s.zoom && typeof s.zoom === "object" ? s.zoom.value : s.zoom) || 1;
    const rect = state.canvas.getBoundingClientRect();
    const host = state.host.getBoundingClientRect();
    return {
      zoom: z,
      scrollX: s.scrollX || 0,
      scrollY: s.scrollY || 0,
      offX: rect.left - host.left,
      offY: rect.top - host.top,
      w: rect.width,
      h: rect.height,
    };
  }
  function screenToScene(px, py, vp) {
    return { x: (px - vp.offX) / vp.zoom - vp.scrollX, y: (py - vp.offY) / vp.zoom - vp.scrollY };
  }
  function sceneToScreen(x, y, vp) {
    return { x: (x + vp.scrollX) * vp.zoom + vp.offX, y: (y + vp.scrollY) * vp.zoom + vp.offY };
  }

  function ensureOverlay() {
    if (state.overlay) return;
    const host = state.host;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const ov = document.createElement("canvas");
    ov.className = "exc-toolbar-overlay";
    Object.assign(ov.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "5",
    });
    host.appendChild(ov);
    state.overlay = ov;
    state.octx = ov.getContext("2d");

    const mm = document.createElement("canvas");
    mm.className = "exc-toolbar-minimap";
    Object.assign(mm.style, {
      position: "absolute",
      right: "12px",
      bottom: "60px",
      width: "200px",
      height: "150px",
      background: "var(--island-bg-color,rgba(255,255,255,0.92))",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: "8px",
      zIndex: "6",
      display: "none",
      cursor: "crosshair",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    });
    host.appendChild(mm);
    state.minimap = mm;
    state.mctx = mm.getContext("2d");
    state.mmTransform = null;
    mm.addEventListener("pointerdown", (e) => {
      if (!state.mmTransform || !window.__excApi) return;
      const r = mm.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const t = state.mmTransform;
      const sx = (px - t.ox) / t.scale;
      const sy = (py - t.oy) / t.scale;
      const vp = getViewport(); if (!vp) return;
      try {
        window.__excApi.updateScene({ appState: {
          scrollX: vp.w / 2 / vp.zoom - sx,
          scrollY: vp.h / 2 / vp.zoom - sy,
        }});
      } catch {}
    });

    attachPointer();
    requestAnimationFrame(loop);
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const r = state.host.getBoundingClientRect();
    const ov = state.overlay;
    if (ov.width !== Math.floor(r.width * dpr) || ov.height !== Math.floor(r.height * dpr)) {
      ov.width = Math.floor(r.width * dpr);
      ov.height = Math.floor(r.height * dpr);
      state.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const mm = state.minimap;
    if (mm.width !== 200 * dpr) {
      mm.width = 200 * dpr;
      mm.height = 150 * dpr;
      state.mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function isDark() {
    return document.documentElement.getAttribute("saved-theme") === "dark";
  }

  function drawStrokes() {
    const ctx = state.octx;
    const ov = state.overlay;
    ctx.clearRect(0, 0, ov.width, ov.height);
    const vp = getViewport();
    if (!vp) return;
    const color = isDark() ? COLORS.dark : COLORS.light;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = state.drawing ? state.strokes.concat([state.drawing]) : state.strokes;
    for (const stroke of all) {
      if (!stroke.pts || stroke.pts.length < 2) {
        if (stroke.pts?.length === 1) {
          const p = sceneToScreen(stroke.pts[0][0], stroke.pts[0][1], vp);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (stroke.w || 2) * vp.zoom * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
        continue;
      }
      ctx.lineWidth = (stroke.w || 2) * vp.zoom;
      ctx.beginPath();
      const pts = stroke.pts.map((p) => sceneToScreen(p[0], p[1], vp));
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
  }

  function drawMinimap() {
    if (!state.minimapOn) return;
    const ctx = state.mctx;
    const mm = state.minimap;
    ctx.clearRect(0, 0, mm.width, mm.height);
    const api = window.__excApi;
    const els = (api && api.getSceneElements && api.getSceneElements()) || (state.app && state.app.scene?.getNonDeletedElements?.()) || [];
    if (!els.length) return;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const e of els) {
      bx0 = Math.min(bx0, e.x);
      by0 = Math.min(by0, e.y);
      bx1 = Math.max(bx1, e.x + (e.width || 0));
      by1 = Math.max(by1, e.y + (e.height || 0));
    }
    if (!isFinite(bx0)) return;
    const W = 200, H = 150, pad = 8;
    const bw = bx1 - bx0, bh = by1 - by0;
    const scale = Math.min((W - pad * 2) / Math.max(bw, 1), (H - pad * 2) / Math.max(bh, 1));
    const ox = (W - bw * scale) / 2 - bx0 * scale;
    const oy = (H - bh * scale) / 2 - by0 * scale;
    state.mmTransform = { scale, ox, oy };
    ctx.fillStyle = isDark() ? "#444" : "#ccc";
    for (const e of els) {
      ctx.fillRect(e.x * scale + ox, e.y * scale + oy, (e.width || 1) * scale, (e.height || 1) * scale);
    }
    const vp = getViewport();
    if (!vp) return;
    const vx0 = -vp.scrollX;
    const vy0 = -vp.scrollY;
    const vw = vp.w / vp.zoom;
    const vh = vp.h / vp.zoom;
    ctx.strokeStyle = "#e03131";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx0 * scale + ox, vy0 * scale + oy, vw * scale, vh * scale);
  }

  let lastSig = "";
  function loop() {
    if (!state.host || !state.overlay) return;
    resizeCanvases();
    const s = getAppState();
    const r = state.host.getBoundingClientRect();
    const sig = s
      ? `${r.width}|${r.height}|${(s.zoom && s.zoom.value) || s.zoom || 1}|${s.scrollX||0}|${s.scrollY||0}|${state.strokes.length}|${state.drawing ? state.drawing.pts.length : 0}|${state.minimapOn?1:0}`
      : "";
    if (sig !== lastSig) {
      lastSig = sig;
      drawStrokes();
      drawMinimap();
    }
    requestAnimationFrame(loop);
  }

  function attachPointer() {
    const ov = state.overlay;
    let dragging = false;
    let zoomBoxStart = null;
    let zoomBoxRect = null;
    let zoomBoxEl = null;

    function setActiveCursor() {
      if (state.tool === "pen") ov.style.cursor = "crosshair";
      else if (state.tool === "eraser") ov.style.cursor = "cell";
      else if (state.tool === "zoombox") ov.style.cursor = "zoom-in";
      else ov.style.cursor = "default";
      ov.style.pointerEvents = state.tool === "none" ? "none" : "auto";
    }
    state._setCursor = setActiveCursor;
    setActiveCursor();

    ov.addEventListener("pointerdown", (e) => {
      if (state.tool === "none") return;
      e.preventDefault();
      ov.setPointerCapture(e.pointerId);
      dragging = true;
      const host = state.host.getBoundingClientRect();
      const x = e.clientX - host.left;
      const y = e.clientY - host.top;
      if (state.tool === "pen") {
        const vp = getViewport();
        const s = screenToScene(x, y, vp);
        state.drawing = { w: 3, pts: [[s.x, s.y]] };
      } else if (state.tool === "eraser") {
        eraseAt(x, y);
      } else if (state.tool === "zoombox") {
        zoomBoxStart = { x, y };
        zoomBoxEl = document.createElement("div");
        Object.assign(zoomBoxEl.style, {
          position: "absolute",
          left: x + "px",
          top: y + "px",
          width: "0px",
          height: "0px",
          border: "2px dashed #1971c2",
          background: "rgba(25,113,194,0.1)",
          pointerEvents: "none",
          zIndex: "7",
        });
        state.host.appendChild(zoomBoxEl);
      }
    });

    ov.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const host = state.host.getBoundingClientRect();
      const x = e.clientX - host.left;
      const y = e.clientY - host.top;
      if (state.tool === "pen" && state.drawing) {
        const vp = getViewport();
        const s = screenToScene(x, y, vp);
        const last = state.drawing.pts[state.drawing.pts.length - 1];
        const dx = s.x - last[0], dy = s.y - last[1];
        const minDist = 1.5 / vp.zoom;
        if (dx * dx + dy * dy >= minDist * minDist) state.drawing.pts.push([s.x, s.y]);
      } else if (state.tool === "eraser") {
        eraseAt(x, y);
      } else if (state.tool === "zoombox" && zoomBoxStart && zoomBoxEl) {
        const x0 = Math.min(zoomBoxStart.x, x);
        const y0 = Math.min(zoomBoxStart.y, y);
        const w = Math.abs(x - zoomBoxStart.x);
        const h = Math.abs(y - zoomBoxStart.y);
        Object.assign(zoomBoxEl.style, { left: x0 + "px", top: y0 + "px", width: w + "px", height: h + "px" });
        zoomBoxRect = { x: x0, y: y0, w, h };
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (state.tool === "pen" && state.drawing) {
        if (state.drawing.pts.length >= 1) {
          state.strokes.push(state.drawing);
          saveStrokes();
        }
        state.drawing = null;
      } else if (state.tool === "zoombox" && zoomBoxRect) {
        applyZoomBox(zoomBoxRect);
        if (zoomBoxEl) zoomBoxEl.remove();
        zoomBoxEl = null;
        zoomBoxStart = null;
        zoomBoxRect = null;
        setTool("none");
      }
    }
    ov.addEventListener("pointerup", endDrag);
    ov.addEventListener("pointercancel", endDrag);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (zoomBoxEl) {
          zoomBoxEl.remove();
          zoomBoxEl = null;
          zoomBoxStart = null;
          zoomBoxRect = null;
        }
        setTool("none");
      }
    });
  }

  function pointSegDist2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const cx = ax + t * dx, cy = ay + t * dy;
    const ex = px - cx, ey = py - cy;
    return ex * ex + ey * ey;
  }
  function eraseAt(x, y) {
    const vp = getViewport();
    if (!vp) return;
    const s = screenToScene(x, y, vp);
    const r = ERASE_RADIUS / vp.zoom;
    const r2 = r * r;
    let changed = false;
    const next = [];
    for (const stroke of state.strokes) {
      const pts = stroke.pts || [];
      if (pts.length < 2) {
        const [px, py] = pts[0] || [0, 0];
        const dx = px - s.x, dy = py - s.y;
        if (dx * dx + dy * dy <= r2) { changed = true; continue; }
        next.push(stroke); continue;
      }
      let segStart = 0;
      let cut = false;
      for (let i = 1; i < pts.length; i++) {
        const d2 = pointSegDist2(s.x, s.y, pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1]);
        if (d2 <= r2) {
          cut = true; changed = true;
          if (i - 1 - segStart >= 1) {
            next.push({ w: stroke.w, pts: pts.slice(segStart, i) });
          }
          segStart = i + 1;
        }
      }
      if (!cut) next.push(stroke);
      else if (pts.length - segStart >= 2) next.push({ w: stroke.w, pts: pts.slice(segStart) });
    }
    if (changed) { state.strokes = next; saveStrokes(); }
  }

  function applyZoomBox(rect) {
    const api = window.__excApi;
    if (!api || rect.w < 6 || rect.h < 6) return;
    const vp = getViewport(); if (!vp) return;
    const p0 = screenToScene(rect.x, rect.y, vp);
    const p1 = screenToScene(rect.x + rect.w, rect.y + rect.h, vp);
    const bx = (p0.x + p1.x) / 2;
    const by = (p0.y + p1.y) / 2;
    const PAD = 0.05;
    const usable = 1 - 2 * PAD;
    const nz = Math.min(
      (vp.w * usable) / Math.max(p1.x - p0.x, 1),
      (vp.h * usable) / Math.max(p1.y - p0.y, 1),
    );
    const next = Math.max(0.01, Math.min(30, nz));
    try {
      api.updateScene({ appState: {
        zoom: { value: next },
        scrollX: vp.w / 2 / next - bx,
        scrollY: vp.h / 2 / next - by,
      }});
    } catch {}
  }

  function setTool(name) {
    state.tool = state.tool === name ? "none" : name;
    const active = state.tool === "none" ? "hand" : state.tool;
    document.querySelectorAll(".exc-toolbar-btn").forEach((b) => {
      const t = b.dataset.tool;
      if (t === "minimap") return;
      if (t === "theme") return;
      b.dataset.active = t === active ? "1" : "0";
    });
    if (state._setCursor) state._setCursor();
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("saved-theme", cur);
    try {
      localStorage.setItem("saved-theme", cur);
    } catch {}
  }
  function toggleMinimap() {
    state.minimapOn = !state.minimapOn;
    state.minimap.style.display = state.minimapOn ? "block" : "none";
    const btn = document.querySelector('.exc-toolbar-btn[data-tool="minimap"]');
    if (btn) btn.dataset.active = state.minimapOn ? "1" : "0";
  }

  function injectToolbar() {
    if (state.host.querySelector(".exc-toolbar-wrap")) return true;

    const wrap = document.createElement("div");
    wrap.className = "exc-toolbar-wrap";
    const inner = document.createElement("div");
    inner.className = "exc-toolbar-inner";
    wrap.appendChild(inner);
    state.host.appendChild(wrap);

    const ICONS = {
      hand:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 12.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4l-2.05-5.5a1.5 1.5 0 0 1 2.83-1l1.88 4.5"/></svg>',
      theme:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>',
      pen:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"/><path d="m11.25 5.417 3.333 3.333"/></svg>',
      eraser:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3"/><path d="M18 13.3l-6.3 -6.3"/></svg>',
      minimap:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="7" height="7"/></svg>',
      zoombox:
        '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="var(--icon-fill-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="21" y1="21" x2="15.1" y2="15.1"/><rect x="7" y="7" width="7" height="7" stroke-dasharray="2 2"/></svg>',
    };

    function btn(name, title, icon, onClick) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "exc-toolbar-btn";
      b.dataset.tool = name;
      b.dataset.active = "0";
      b.title = title;
      b.setAttribute("aria-label", title);
      b.innerHTML = icon;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        onClick();
      });
      inner.appendChild(b);
      return b;
    }

    const divider = document.createElement("div");
    divider.className = "exc-toolbar-divider";

    btn("theme", "Toggle dark/light", ICONS.theme, toggleTheme);
    inner.appendChild(divider.cloneNode());
    const handBtn = btn("hand", "Mouse / Pan", ICONS.hand, () => setTool("none"));
    handBtn.dataset.active = "1";
    btn("pen", "Pen (saves locally)", ICONS.pen, () => setTool("pen"));
    btn("eraser", "Eraser (your strokes)", ICONS.eraser, () => setTool("eraser"));
    inner.appendChild(divider.cloneNode());
    btn("minimap", "Toggle minimap", ICONS.minimap, toggleMinimap);
    btn("zoombox", "Zoom to box", ICONS.zoombox, () => setTool("zoombox"));

    return true;
  }

  function tryInit() {
    const host = document.querySelector(".excalidraw") || document.querySelector(".exc-viewer-root");
    if (!host) return false;
    state.host = host;
    if (!state.host.querySelector(".exc-toolbar-wrap")) injectToolbar();
    const canvas = host.querySelector(".excalidraw__canvas.interactive") || host.querySelector(".excalidraw__canvas");
    if (!canvas) return false;
    state.canvas = canvas;
    const app = findApp(host);
    if (app) state.app = app;
    ensureOverlay();
    return !!app;
  }

  const mo = new MutationObserver(() => {
    tryInit();
    if (state.host && !state.host.querySelector(".exc-toolbar-wrap")) injectToolbar();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  const style = document.createElement("style");
  style.textContent = `
.page[data-frame="excalidraw"] .excalidraw-sidebar .darkmode{display:none!important;}
.exc-toolbar-wrap{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);
  z-index:50;width:max-content;max-width:calc(100% - 24px);
  background:var(--island-bg-color,#ffffff);
  border-radius:10px;
  box-shadow:0 1px 4px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);
  padding:6px;
  border:1px solid rgba(0,0,0,0.06);
}
html[saved-theme="dark"] .exc-toolbar-wrap{
  background:var(--island-bg-color,#232329);
  border-color:rgba(255,255,255,0.08);
  box-shadow:0 1px 4px rgba(0,0,0,0.4),0 4px 16px rgba(0,0,0,0.3);
}
.exc-toolbar-inner{display:flex;flex-direction:row;align-items:center;gap:2px;}
.exc-toolbar-divider{
  width:1px;align-self:stretch;margin:2px 4px;
  background:var(--default-border-color,rgba(0,0,0,0.1));
}
html[saved-theme="dark"] .exc-toolbar-divider{background:rgba(255,255,255,0.12);}
.exc-toolbar-btn{
  display:inline-flex;align-items:center;justify-content:center;
  width:2rem;height:2rem;padding:0;
  background:transparent;border:0;border-radius:6px;cursor:pointer;
  color:var(--icon-fill-color,#1b1b1f);
  transition:background-color .12s ease;
}
.exc-toolbar-btn:hover{background:var(--button-hover-bg,rgba(0,0,0,0.06));}
html[saved-theme="dark"] .exc-toolbar-btn{color:var(--icon-fill-color,#e3e3e8);}
html[saved-theme="dark"] .exc-toolbar-btn:hover{background:rgba(255,255,255,0.08);}
.exc-toolbar-btn svg{width:1rem;height:1rem;stroke:currentColor;display:block;}
.exc-toolbar-btn[data-active="1"]{
  background:var(--color-primary-light,#bcd5ff);
  color:var(--color-primary,#1971c2);
}
html[saved-theme="dark"] .exc-toolbar-btn[data-active="1"]{
  background:rgba(116,192,252,0.18);color:#74c0fc;
}
`;
  document.head.appendChild(style);

  tryInit();
})();
