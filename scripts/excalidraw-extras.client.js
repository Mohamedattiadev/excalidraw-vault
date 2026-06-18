// Inject theme/zoombox/minimap into native Excalidraw top toolbar.
(function () {
  if (window.__excExtrasLoaded) return;
  window.__excExtrasLoaded = true;

  // Sidebar toggle — multi-event capture so Excalidraw's React event layer can't swallow.
  let lastToggleAt = 0;
  function handleSidebarToggle(e) {
    const btn = e.target && e.target.closest && e.target.closest(".excalidraw-sidebar-toggle");
    if (!btn) return;
    // dedupe same gesture across pointerdown/click/touchstart
    const now = performance.now();
    if (now - lastToggleAt < 120) { e.stopPropagation(); e.stopImmediatePropagation(); return; }
    lastToggleAt = now;
    e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
    const page = btn.closest(".page[data-frame='excalidraw']") || document.querySelector(".page[data-frame='excalidraw']");
    if (page) page.classList.toggle("excalidraw-sidebar-open");
  }
  document.addEventListener("pointerdown", handleSidebarToggle, true);
  document.addEventListener("touchstart",  handleSidebarToggle, { capture: true, passive: false });
  document.addEventListener("mousedown",   handleSidebarToggle, true);
  document.addEventListener("click",       handleSidebarToggle, true);

  // Top-right PDF export button (mirrors the left sidebar toggle visually).
  function ensurePdfButton() {
    const page = document.querySelector(".page[data-frame='excalidraw']");
    if (!page) return;
    if (page.querySelector(".exc-pdf-export")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "exc-pdf-export";
    btn.setAttribute("aria-label", "Export drawing as high-quality PDF");
    btn.title = "Export as PDF";
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h2a2 2 0 0 1 0 4H9v-4z"/><path d="M14 13h1.5a1.5 1.5 0 0 1 0 3H14v-3z"/></svg>';
    page.appendChild(btn);
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.classList.add("exc-pdf-loading");
      try { await exportCanvasAsPdf(); }
      catch (err) { console.error("pdf export failed", err); alert("PDF export failed: " + (err?.message || err)); }
      finally { btn.disabled = false; btn.classList.remove("exc-pdf-loading"); }
    });
  }
  const pdfMO = new MutationObserver(ensurePdfButton);
  pdfMO.observe(document.body, { childList: true, subtree: true });
  ensurePdfButton();

  async function preloadImages(files) {
    await Promise.all(Object.values(files || {}).map((f) => {
      if (!f || typeof f.dataURL !== "string" || !f.dataURL) return null;
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // tolerate broken images
        img.src = f.dataURL;
      });
    }));
  }

  async function exportCanvasAsPdf() {
    const api = getApi();
    if (!api) throw new Error("Excalidraw API not ready");
    // Prefer the self-hosted vendor bundle (already loaded for mount), then CDN.
    async function loadExc() {
      // Reuse already-loaded module if mount script exposed it on window
      if (window.__excVendor && window.__excVendor.exportToCanvas) return window.__excVendor;
      const bp = (document.body?.dataset?.basepath || '').replace(/\/$/, '');
      const tries = [
        async () => import(`${bp}/vendor/excalidraw.bundle.js`),
        async () => import("https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@18.2.0,react-dom@18.2.0&bundle-deps"),
      ];
      let lastErr;
      for (const t of tries) {
        try { return await t(); } catch (err) { lastErr = err; }
      }
      throw lastErr || new Error("Excalidraw bundle unavailable");
    }
    const [excalMod, jspdfMod] = await Promise.all([
      loadExc(),
      import("https://esm.sh/jspdf@2.5.1"),
    ]);
    const exportToCanvas = excalMod.exportToCanvas;
    const jsPDF = jspdfMod.jsPDF || jspdfMod.default || jspdfMod.default?.jsPDF;
    if (!jsPDF) throw new Error("jsPDF could not be loaded");
    if (!exportToCanvas) throw new Error("exportToCanvas not exported");
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    if (!elements || !elements.length) throw new Error("Nothing to export");
    // Pre-decode every embedded image so exportToCanvas doesn't fail on half-loaded blobs.
    await preloadImages(files);
    // Compute scene bounds so we can clamp export to jsPDF's 14400px max dimension.
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (const e of elements) {
      if (e.isDeleted) continue;
      xmin = Math.min(xmin, e.x);
      ymin = Math.min(ymin, e.y);
      xmax = Math.max(xmax, e.x + (e.width || 0));
      ymax = Math.max(ymax, e.y + (e.height || 0));
    }
    const naturalW = Math.max(1, xmax - xmin);
    const naturalH = Math.max(1, ymax - ymin);
    const MAX_DIM = 13800;
    let scale = 3;
    if (naturalW * scale > MAX_DIM || naturalH * scale > MAX_DIM) {
      scale = Math.min(MAX_DIM / naturalW, MAX_DIM / naturalH);
    }
    scale = Math.max(1, Math.min(3, scale));
    let canvas;
    try {
      canvas = await exportToCanvas({
        elements,
        appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
        files,
        getDimensions: (w, h) => ({ width: Math.floor(w * scale), height: Math.floor(h * scale), scale }),
      });
    } catch (err) {
      console.warn("scaled export failed, retrying at 1x", err);
      canvas = await exportToCanvas({ elements, appState, files });
    }
    if (!canvas || !canvas.width || !canvas.height) throw new Error("exportToCanvas returned empty canvas");
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (!dataUrl || dataUrl.length < 100) throw new Error("canvas toDataURL returned empty");
    const orientation = canvas.width > canvas.height ? "l" : "p";
    const pdf = new jsPDF({ orientation, unit: "px", format: [canvas.width, canvas.height], compress: true });
    pdf.addImage(dataUrl, "JPEG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
    const slug = (location.pathname.split("/").filter(Boolean).pop() || "drawing").replace(/\.excalidraw$/, "");
    pdf.save(`${slug}.pdf`);
  }

  // Defensive: also bind directly when button appears (covers obscure cases where capture-phase doesn't fire).
  const bindToggle = (btn) => {
    if (btn.dataset.excBound === "1") return;
    btn.dataset.excBound = "1";
    btn.addEventListener("pointerdown", handleSidebarToggle, true);
    btn.addEventListener("click", handleSidebarToggle, true);
  };
  const sidebarMO = new MutationObserver(() => {
    document.querySelectorAll(".excalidraw-sidebar-toggle").forEach(bindToggle);
  });
  sidebarMO.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll(".excalidraw-sidebar-toggle").forEach(bindToggle);

  const ICONS = {
    theme: '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>',
    zoombox: '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="21" y1="21" x2="15.1" y2="15.1"/><rect x="7" y="7" width="7" height="7" stroke-dasharray="2 2"/></svg>',
    minimap: '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="7" height="7"/></svg>',
  };

  const state = { zoomOn: false, mmOn: false, mmCanvas: null, mmCtx: null, mmTransform: null, zoomOverlay: null };

  function getApi() { return window.__excApi || null; }
  function getHost() { return document.querySelector(".excalidraw") || document.querySelector(".exc-viewer-root"); }
  function getCanvas(host) { return host.querySelector(".excalidraw__canvas.interactive") || host.querySelector(".excalidraw__canvas"); }
  function isDark() { return document.documentElement.getAttribute("saved-theme") === "dark"; }

  function getViewport() {
    const host = getHost(); if (!host) return null;
    const api = getApi(); if (!api) return null;
    const s = api.getAppState();
    const canvas = getCanvas(host); if (!canvas) return null;
    const z = (s.zoom && typeof s.zoom === "object" ? s.zoom.value : s.zoom) || 1;
    const cr = canvas.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    return { host, zoom: z, scrollX: s.scrollX || 0, scrollY: s.scrollY || 0,
      offX: cr.left - hr.left, offY: cr.top - hr.top, w: cr.width, h: cr.height };
  }
  function screenToScene(px, py, vp) { return { x: (px - vp.offX) / vp.zoom - vp.scrollX, y: (py - vp.offY) / vp.zoom - vp.scrollY }; }

  function toggleTheme() {
    const next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("saved-theme", next);
    try { localStorage.setItem("saved-theme", next); } catch {}
  }

  // ---- zoom box ----
  function ensureZoomOverlay() {
    if (state.zoomOverlay) return state.zoomOverlay;
    const host = getHost(); if (!host) return null;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const ov = document.createElement("div");
    ov.className = "exc-zoombox-overlay";
    Object.assign(ov.style, { position: "absolute", inset: "0", zIndex: "4", cursor: "crosshair", display: "none", background: "transparent" });
    host.appendChild(ov);
    let start = null, rect = null, rectEl = null;
    ov.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      ov.setPointerCapture(e.pointerId);
      const hr = host.getBoundingClientRect();
      start = { x: e.clientX - hr.left, y: e.clientY - hr.top };
      rectEl = document.createElement("div");
      Object.assign(rectEl.style, { position: "absolute", left: start.x + "px", top: start.y + "px",
        width: "0px", height: "0px", border: "2px dashed #1971c2", background: "rgba(25,113,194,0.1)",
        pointerEvents: "none", zIndex: "6" });
      host.appendChild(rectEl);
    });
    ov.addEventListener("pointermove", (e) => {
      if (!start || !rectEl) return;
      const hr = host.getBoundingClientRect();
      const x = e.clientX - hr.left, y = e.clientY - hr.top;
      const x0 = Math.min(start.x, x), y0 = Math.min(start.y, y);
      const w = Math.abs(x - start.x), h = Math.abs(y - start.y);
      Object.assign(rectEl.style, { left: x0 + "px", top: y0 + "px", width: w + "px", height: h + "px" });
      rect = { x: x0, y: y0, w, h };
    });
    function end() {
      if (start && rect && rect.w > 6 && rect.h > 6) {
        const vp = getViewport();
        if (vp) {
          const p0 = screenToScene(rect.x, rect.y, vp);
          const p1 = screenToScene(rect.x + rect.w, rect.y + rect.h, vp);
          const bx = (p0.x + p1.x) / 2, by = (p0.y + p1.y) / 2;
          const nz = Math.max(0.01, Math.min(30, Math.min(vp.w * 0.9 / Math.max(p1.x - p0.x, 1), vp.h * 0.9 / Math.max(p1.y - p0.y, 1))));
          try { getApi().updateScene({ appState: { zoom: { value: nz }, scrollX: vp.w / 2 / nz - bx, scrollY: vp.h / 2 / nz - by } }); } catch {}
        }
      }
      if (rectEl) rectEl.remove();
      start = rect = rectEl = null;
      setZoom(false);
    }
    ov.addEventListener("pointerup", end);
    ov.addEventListener("pointercancel", end);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.zoomOn) end(); });
    state.zoomOverlay = ov;
    return ov;
  }
  function setZoom(on) {
    state.zoomOn = on;
    const ov = ensureZoomOverlay();
    if (ov) ov.style.display = on ? "block" : "none";
    const btn = document.querySelector('.exc-extra-btn[data-tool="zoombox"]');
    if (btn) btn.dataset.active = on ? "1" : "0";
  }

  // ---- minimap ----
  function ensureMinimap() {
    if (state.mmPanel) return state.mmPanel;
    const host = getHost(); if (!host) return null;
    const panel = document.createElement("div");
    panel.id = "excali-minimap-panel";
    panel.className = "excali-minimap excali-floating-panel";
    panel.innerHTML = `
      <div class="mm-header">
        <span class="mm-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
          Minimap
        </span>
        <span class="mm-actions">
          <span class="mm-btn mm-fit" title="Fit to scene">⊡</span>
          <span class="mm-btn mm-close" title="Hide">✕</span>
        </span>
      </div>
      <div class="mm-canvas-wrap"><canvas width="150" height="100"></canvas></div>
      <div class="mm-footer">
        <span class="mm-count">0 elements</span>
        <span class="mm-zoom">100%</span>
      </div>`;
    host.appendChild(panel);
    state.mmPanel = panel;
    const mm = panel.querySelector("canvas");
    state.mmCanvas = mm;
    state.mmCtx = mm.getContext("2d");
    state.mmCountEl = panel.querySelector(".mm-count");
    state.mmZoomEl = panel.querySelector(".mm-zoom");

    mm.addEventListener("pointerdown", (e) => {
      if (!state.mmTransform) return;
      const api = getApi(); if (!api) return;
      const r = mm.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const sx = (px - state.mmTransform.ox) / state.mmTransform.scale;
      const sy = (py - state.mmTransform.oy) / state.mmTransform.scale;
      const vp = getViewport(); if (!vp) return;
      const scrollX = (vp.w / 2 - vp.offX) / vp.zoom - sx;
      const scrollY = (vp.h / 2 - vp.offY) / vp.zoom - sy;
      try { api.updateScene({ appState: { scrollX, scrollY } }); } catch {}
    });
    panel.querySelector(".mm-close").addEventListener("click", () => setMinimap(false));
    panel.querySelector(".mm-fit").addEventListener("click", () => {
      const api = getApi(); if (!api) return;
      const els = (api.getSceneElements ? api.getSceneElements() : []).filter((e) => !e.isDeleted);
      if (!els.length) return;
      try { api.scrollToContent(els, { fitToContent: true, animate: true }); } catch {}
    });
    requestAnimationFrame(drawMinimap);
    return panel;
  }
  let lastMmDraw = 0;
  let lastMmSig = "";
  function drawMinimap() {
    if (!state.mmOn) { state.mmRafId = 0; return; }
    state.mmRafId = requestAnimationFrame(drawMinimap);
    const now = performance.now();
    if (now - lastMmDraw < 100) return;
    lastMmDraw = now;
    if (!state.mmCanvas) return;
    const api = getApi();
    const vp = getViewport();
    const sig = api && vp ? `${(api.getSceneElements?.() || []).length}|${vp.zoom.toFixed(3)}|${vp.scrollX.toFixed(0)}|${vp.scrollY.toFixed(0)}|${vp.w}|${vp.h}` : "";
    if (sig === lastMmSig) return;
    lastMmSig = sig;
    _doDrawMinimap();
  }
  function _doDrawMinimap() {
    if (!state.mmOn || !state.mmCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 150, H = 100;
    const mm = state.mmCanvas, ctx = state.mmCtx;
    if (mm.width !== W * dpr) { mm.width = W * dpr; mm.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    ctx.clearRect(0, 0, W, H);
    const api = getApi(); if (!api) return;
    const els = (api.getSceneElements ? api.getSceneElements() : []).filter((e) => !e.isDeleted);
    const vp = getViewport();
    if (state.mmCountEl) state.mmCountEl.textContent = els.length + " element" + (els.length === 1 ? "" : "s");
    if (state.mmZoomEl && vp) state.mmZoomEl.textContent = Math.round(vp.zoom * 100) + "%";
    if (!els.length) {
      ctx.fillStyle = isDark() ? "#666" : "#999";
      ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("empty scene", W / 2, H / 2);
      return;
    }
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const e of els) { bx0 = Math.min(bx0, e.x); by0 = Math.min(by0, e.y); bx1 = Math.max(bx1, e.x + (e.width || 0)); by1 = Math.max(by1, e.y + (e.height || 0)); }
    if (!isFinite(bx0)) return;
    const pad = 6, bw = Math.max(bx1 - bx0, 1), bh = Math.max(by1 - by0, 1);
    const scale = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
    const ox = (W - bw * scale) / 2 - bx0 * scale;
    const oy = (H - bh * scale) / 2 - by0 * scale;
    state.mmTransform = { scale, ox, oy };
    ctx.fillStyle = isDark() ? "#aaa" : "#555";
    for (const e of els) {
      const w = Math.max((e.width || 1) * scale, 1);
      const h = Math.max((e.height || 1) * scale, 1);
      ctx.fillRect(e.x * scale + ox, e.y * scale + oy, w, h);
    }
    if (!vp) return;
    const vx0 = -vp.scrollX, vy0 = -vp.scrollY;
    const vw = vp.w / vp.zoom, vh = vp.h / vp.zoom;
    ctx.strokeStyle = "#e03131"; ctx.lineWidth = 1.5;
    ctx.strokeRect(vx0 * scale + ox, vy0 * scale + oy, vw * scale, vh * scale);
  }
  function setMinimap(on) {
    const wasOn = state.mmOn;
    state.mmOn = on;
    const panel = ensureMinimap();
    if (panel) panel.style.display = on ? "flex" : "none";
    const btn = document.querySelector('.exc-extra-btn[data-tool="minimap"]');
    if (btn) btn.dataset.active = on ? "1" : "0";
    if (on && !wasOn) { lastMmSig = ""; requestAnimationFrame(drawMinimap); }
  }

  function makeBtn(tool, title, icon, onClick) {
    const label = document.createElement("label");
    label.className = "ToolIcon Shape exc-extra-btn";
    label.dataset.tool = tool;
    label.title = title;
    label.setAttribute("aria-label", title);
    const iconWrap = document.createElement("div");
    iconWrap.className = "ToolIcon__icon";
    iconWrap.innerHTML = icon;
    label.appendChild(iconWrap);
    label.addEventListener("click", (e) => { e.preventDefault(); onClick(); });
    return label;
  }

  function injectIntoNativeToolbar() {
    const host = getHost(); if (!host) return false;
    const inner = host.querySelector(".App-toolbar > .Stack_horizontal, .App-toolbar .Stack_horizontal");
    if (!inner) return false;
    if (inner.querySelector('.exc-extra-btn')) return true;

    const trigger = inner.querySelector(".App-toolbar__extra-tools-trigger");
    const themeBtn = makeBtn("theme", "Toggle dark/light", ICONS.theme, toggleTheme);
    const zoomBtn = makeBtn("zoombox", "Zoom to box", ICONS.zoombox, () => setZoom(!state.zoomOn));
    const mmBtn = makeBtn("minimap", "Toggle minimap", ICONS.minimap, () => setMinimap(!state.mmOn));

    const anchor = trigger || null;
    const insert = (el) => { if (anchor) inner.insertBefore(el, anchor); else inner.appendChild(el); };
    insert(themeBtn); insert(zoomBtn); insert(mmBtn);
    // Default minimap on after first successful inject.
    setTimeout(() => { if (!state.mmOn) setMinimap(true); }, 600);
    return true;
  }

  function resetState() {
    state.zoomOn = false; state.mmOn = false;
    state.mmPanel = null; state.mmCanvas = null; state.mmCtx = null;
    state.mmTransform = null; state.zoomOverlay = null;
    state.mmCountEl = null; state.mmZoomEl = null;
    lastMmSig = "";
  }
  let mo = null;
  function startObserver() {
    if (mo) return;
    mo = new MutationObserver(() => {
      const host = getHost();
      if (!host) return;
      if (host.querySelector('.exc-extra-btn')) {
        mo.disconnect();
        mo = null;
        return;
      }
      if (injectIntoNativeToolbar()) {
        mo.disconnect();
        mo = null;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function tryInject() {
    const host = getHost();
    if (!host) { startObserver(); return; }
    if (!host.querySelector('.exc-extra-btn')) {
      resetState();
      if (!injectIntoNativeToolbar()) startObserver();
    }
  }
  tryInject();
  document.addEventListener("nav", () => { resetState(); tryInject(); });
})();
