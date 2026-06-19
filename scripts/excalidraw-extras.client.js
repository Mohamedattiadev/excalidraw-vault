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

  function currentSlug() {
    // Mount script exposes the canonical build-time slug (e.g. "01-algorithms__algorithms").
    if (window.__excSlug) return window.__excSlug;
    // Fallback: derive from URL path (same transform as build script).
    const m = location.pathname.match(/\/([^\/]+\/[^\/]+)\.excalidraw\/?$/) || location.pathname.match(/\/([^\/]+)\.excalidraw\/?$/);
    if (!m) return '';
    return m[1].replace(/\//g, '__').toLowerCase();
  }

  // Top-right PDF export + reset buttons (mirrors the left sidebar toggle visually).
  function ensureTopButtons() {
    const page = document.querySelector(".page[data-frame='excalidraw']");
    if (!page) return;
    if (!page.querySelector(".exc-pdf-export")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "exc-pdf-export";
      btn.setAttribute("aria-label", "Export drawing as high-quality PDF");
      btn.title = "Export as PDF";
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h2a2 2 0 0 1 0 4H9v-4z"/><path d="M14 13h1.5a1.5 1.5 0 0 1 0 3H14v-3z"/></svg>';
      page.appendChild(btn);
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const quality = await openPdfQualityModal();
        if (!quality) return;
        btn.disabled = true;
        btn.classList.add("exc-pdf-loading");
        try { await exportCanvasAsPdf(quality); }
        catch (err) { console.error("pdf export failed", err); alert("PDF export failed: " + (err?.message || err)); }
        finally { btn.disabled = false; btn.classList.remove("exc-pdf-loading"); }
      });
    }
    if (!page.querySelector(".exc-reset-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "exc-reset-btn";
      btn.setAttribute("aria-label", "Reset drawing to original (drops your local edits for this canvas)");
      btn.title = "Reset to original";
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      page.appendChild(btn);
      btn.addEventListener("click", (e) => { e.preventDefault(); openResetModal(); });
    }
    if (!page.querySelector(".exc-reset-all-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "exc-reset-all-btn";
      btn.setAttribute("aria-label", "Reset all drawings to original (drops local edits across every canvas)");
      btn.title = "Reset ALL canvases";
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>';
      page.appendChild(btn);
      btn.addEventListener("click", (e) => { e.preventDefault(); openResetAllModal(); });
    }
  }
  function openResetModal() {
    if (document.querySelector(".exc-reset-modal")) return;
    const overlay = document.createElement("div");
    overlay.className = "exc-reset-modal";
    overlay.innerHTML = '<div class="exc-reset-card">'
      + '<div class="exc-reset-title">Reset this drawing?</div>'
      + '<div class="exc-reset-body">All edits you made on <b>this canvas only</b> (your local browser changes — shapes added, text, deletes, anything) will be discarded. The original drawing from the vault will be restored. Other canvases are not affected.</div>'
      + '<div class="exc-reset-actions"><button type="button" class="exc-reset-no">No, keep my edits</button><button type="button" class="exc-reset-yes">Yes, reset</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".exc-reset-no").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".exc-reset-yes").addEventListener("click", async () => {
      const slug = currentSlug();
      // Signal mount-script's beforeunload/pagehide handlers to skip persistence on the upcoming reload.
      try { window.__excResetting = true; } catch {}
      try { if (slug) localStorage.removeItem("exc-scene:" + slug); } catch {}
      // Drop IDB stores: edits (user changes) AND snaps (cached preview).
      try {
        const req = indexedDB.open("exc-snapshots", 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("snaps")) db.createObjectStore("snaps");
          if (!db.objectStoreNames.contains("edits")) db.createObjectStore("edits");
        };
        req.onsuccess = () => {
          const db = req.result;
          try {
            const stores = ["snaps", "edits"].filter((s) => db.objectStoreNames.contains(s));
            if (!stores.length) return location.reload();
            const tx = db.transaction(stores, "readwrite");
            for (const s of stores) tx.objectStore(s).delete(slug);
            tx.oncomplete = () => location.reload();
            tx.onerror = () => location.reload();
          } catch { location.reload(); }
        };
        req.onerror = () => location.reload();
      } catch { location.reload(); }
    });
    document.addEventListener("keydown", function escClose(ev) {
      if (ev.key === "Escape") { close(); document.removeEventListener("keydown", escClose); }
    });
  }

  function openPdfQualityModal() {
    return new Promise((resolve) => {
      if (document.querySelector(".exc-reset-modal")) return resolve(null);
      const overlay = document.createElement("div");
      overlay.className = "exc-reset-modal";
      overlay.innerHTML = '<div class="exc-reset-card">'
        + '<div class="exc-reset-title">Export PDF — pick quality</div>'
        + '<div class="exc-reset-body">'
        +   '<b>Mid</b> — JPEG, ~3-8 MB, fast, sharp at normal zoom.<br/>'
        +   '<b>High</b> — PNG, ~30-80 MB, lossless, sharp at deep zoom. Slower.'
        + '</div>'
        + '<div class="exc-reset-actions">'
        +   '<button type="button" class="exc-reset-no" data-q="cancel">Cancel</button>'
        +   '<button type="button" class="exc-reset-no" data-q="mid">Mid</button>'
        +   '<button type="button" class="exc-reset-yes" data-q="high">High</button>'
        + '</div>'
        + '</div>';
      document.body.appendChild(overlay);
      const done = (val) => { overlay.remove(); document.removeEventListener("keydown", esc); resolve(val); };
      overlay.querySelectorAll("button[data-q]").forEach((b) => {
        b.addEventListener("click", () => {
          const q = b.getAttribute("data-q");
          done(q === "cancel" ? null : q);
        });
      });
      overlay.addEventListener("click", (e) => { if (e.target === overlay) done(null); });
      function esc(ev) { if (ev.key === "Escape") done(null); }
      document.addEventListener("keydown", esc);
    });
  }

  function openResetAllModal() {
    if (document.querySelector(".exc-reset-modal")) return;
    const overlay = document.createElement("div");
    overlay.className = "exc-reset-modal";
    overlay.innerHTML = '<div class="exc-reset-card">'
      + '<div class="exc-reset-title">Reset ALL canvases?</div>'
      + '<div class="exc-reset-body">This drops your local edits across <b>every drawing</b> in the vault. The original drawings will be restored. This cannot be undone.</div>'
      + '<div class="exc-reset-actions"><button type="button" class="exc-reset-no">No, keep my edits</button><button type="button" class="exc-reset-yes">Yes, reset all</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".exc-reset-no").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".exc-reset-yes").addEventListener("click", async () => {
      try { window.__excResetting = true; } catch {}
      // Wipe every exc-scene:* localStorage key.
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf("exc-scene:") === 0) keys.push(k);
        }
        for (const k of keys) localStorage.removeItem(k);
      } catch {}
      // Nuke the IDB database entirely so every snap + every edit goes with it.
      // Any open connection in the current tab is closed first; the DB is recreated by mount() on the next load.
      const done = () => location.reload();
      let safety = setTimeout(done, 1500); // never get stuck on a hung delete
      try {
        const req = indexedDB.deleteDatabase("exc-snapshots");
        req.onsuccess = () => { clearTimeout(safety); done(); };
        req.onerror = () => { clearTimeout(safety); done(); };
        req.onblocked = () => { /* let safety timer fire */ };
      } catch { clearTimeout(safety); done(); }
    });
    document.addEventListener("keydown", function escClose(ev) {
      if (ev.key === "Escape") { close(); document.removeEventListener("keydown", escClose); }
    });
  }

  const pdfMO = new MutationObserver(ensureTopButtons);
  pdfMO.observe(document.body, { childList: true, subtree: true });
  ensureTopButtons();

  async function preloadImages(files) {
    await Promise.all(Object.values(files || {}).map((f) => {
      if (!f || typeof f.dataURL !== "string" || !f.dataURL) return null;
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // keep export canvas un-tainted
        img.onload = () => resolve();
        img.onerror = () => resolve(); // tolerate broken images
        img.src = f.dataURL;
      });
    }));
  }

  // Convert every file entry whose dataURL is still a relative/absolute /_files path
  // (or any non-blob, non-data URL) into a base64 data: URL by fetching → blob → reader.
  // exportToCanvas draws via <img>; without this, a network-fetched image can taint the canvas.
  async function blobifyFiles(files) {
    if (!files) return files;
    const out = {};
    let ok = 0, fail = 0;
    await Promise.all(Object.entries(files).map(async ([id, f]) => {
      if (!f || typeof f.dataURL !== "string") { out[id] = f; return; }
      const u = f.dataURL;
      if (u.startsWith("data:")) { out[id] = f; ok++; return; }
      try {
        const res = await fetch(u, { credentials: "same-origin", mode: "cors" });
        if (!res.ok) throw new Error("http " + res.status);
        const blob = await res.blob();
        const b64 = await new Promise((r, rej) => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
        out[id] = { ...f, dataURL: b64, mimeType: f.mimeType || blob.type };
        ok++;
      } catch (err) {
        console.warn("[exc-pdf] blobify failed for", u, err && err.message);
        out[id] = f;
        fail++;
      }
    }));
    console.log("[exc-pdf] blobify done. ok:", ok, "fail:", fail);
    return out;
  }

  async function exportCanvasAsPdf(quality = "mid") {
    const LOG = (...args) => console.log("[exc-pdf]", ...args);
    LOG("start, quality:", quality);
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
    // Snapshot scene + count types so we can see exactly what's about to be exported.
    const rawElements = api.getSceneElements();
    const typeCounts = {};
    for (const e of rawElements) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    LOG("element type counts:", typeCounts, "total", rawElements.length);
    // Embeddable / iframe elements load cross-origin previews and taint the export canvas.
    // Replace them with a placeholder rectangle so the rest of the scene still exports cleanly.
    let swapped = 0;
    const elements = rawElements.map((e) => {
      if (e.type !== "embeddable" && e.type !== "iframe") return e;
      swapped++;
      return {
        ...e,
        type: "rectangle",
        strokeColor: "#7b5cd6",
        backgroundColor: "rgba(123,92,214,0.08)",
        strokeStyle: "dashed",
        fillStyle: "solid",
        roundness: { type: 3 },
        link: e.link || null,
      };
    });
    LOG("swapped embeddables → rectangles:", swapped);
    const appState = api.getAppState();
    // Convert every file to an inline data: URL so the export canvas can never taint.
    const rawFiles = api.getFiles() || {};
    const rawCount = Object.keys(rawFiles).length;
    const rawSchemes = {};
    for (const f of Object.values(rawFiles)) {
      const u = f && typeof f.dataURL === "string" ? f.dataURL : "";
      const k = u.startsWith("data:") ? "data:" : u.startsWith("blob:") ? "blob:" : u.startsWith("/") ? "/path" : u.startsWith("http") ? "http(s)" : "(empty)";
      rawSchemes[k] = (rawSchemes[k] || 0) + 1;
    }
    LOG("raw files:", rawCount, "schemes:", rawSchemes);
    const files = await blobifyFiles(rawFiles);
    const afterSchemes = {};
    for (const f of Object.values(files)) {
      const u = f && typeof f.dataURL === "string" ? f.dataURL : "";
      const k = u.startsWith("data:") ? "data:" : u.startsWith("blob:") ? "blob:" : u.startsWith("/") ? "/path" : u.startsWith("http") ? "http(s)" : "(empty)";
      afterSchemes[k] = (afterSchemes[k] || 0) + 1;
    }
    LOG("post-blobify schemes:", afterSchemes);
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
    // Memory cap. toBlob (used below) streams instead of building a huge base64 string, so we can safely push the cap higher than the old toDataURL path could handle.
    // Mid (JPEG): 8000 px / 60 MP keeps file size in the 3-8 MB range while staying sharp at normal zoom.
    // High (PNG): 14000 px / 180 MP stays inside Chrome's 16384-per-side and 268 MP canvas hard caps. Output ~30-80 MB.
    const MAX_DIM = quality === "high" ? 14000 : 8000;
    const MAX_PIXELS = quality === "high" ? 180_000_000 : 60_000_000;
    let scale = 3;
    if (naturalW * scale > MAX_DIM || naturalH * scale > MAX_DIM) {
      scale = Math.min(MAX_DIM / naturalW, MAX_DIM / naturalH);
    }
    if (naturalW * naturalH * scale * scale > MAX_PIXELS) {
      scale = Math.sqrt(MAX_PIXELS / (naturalW * naturalH));
    }
    // Cap at 3 (we never want to upscale beyond 3x) but DO allow <1 so giant scenes downscale to fit canvas limits.
    scale = Math.min(3, scale);
    // Browsers cap canvas area + per-side dim. Re-clamp so neither side exceeds MAX_DIM after rounding.
    scale = Math.min(scale, MAX_DIM / naturalW, MAX_DIM / naturalH);
    if (scale <= 0 || !isFinite(scale)) scale = 1;
    LOG("scene bounds:", { naturalW: Math.round(naturalW), naturalH: Math.round(naturalH), scale });
    let canvas;
    try {
      canvas = await exportToCanvas({
        elements,
        appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
        files,
        getDimensions: (w, h) => ({ width: Math.floor(w * scale), height: Math.floor(h * scale), scale }),
      });
    } catch (err) {
      console.warn("[exc-pdf] scaled export failed, retrying at 1x", err);
      canvas = await exportToCanvas({ elements, appState, files });
    }
    if (!canvas || !canvas.width || !canvas.height) throw new Error("exportToCanvas returned empty canvas");
    LOG("export canvas:", canvas.width, "x", canvas.height);
    // Try multiple paths: PNG dataURL → JPEG dataURL → toBlob+FileReader → final SVG fallback.
    async function canvasToDataUrl(c) {
      const order = quality === "high"
        ? [{ mime: "image/png", q: undefined, fmt: "PNG" }, { mime: "image/jpeg", q: 0.95, fmt: "JPEG" }]
        : [{ mime: "image/jpeg", q: 0.92, fmt: "JPEG" }, { mime: "image/png", q: undefined, fmt: "PNG" }];
      for (const enc of order) {
        try {
          const blob = await new Promise((res) => c.toBlob ? c.toBlob(res, enc.mime, enc.q) : res(null));
          LOG(enc.fmt, "toBlob size:", blob && blob.size);
          if (blob) {
            const fr = new FileReader();
            const url = await new Promise((res, rej) => { fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
            if (url && url.length > 100) return { url, fmt: enc.fmt };
          }
        } catch (e) { console.warn("[exc-pdf]", enc.fmt, "toBlob failed", e.name, e.message); }
      }
      // Last resort: toDataURL JPEG.
      try {
        const u = c.toDataURL("image/jpeg", 0.92);
        LOG("JPEG dataURL length:", u && u.length);
        if (u && u.length > 100) return { url: u, fmt: "JPEG" };
      } catch (e) { console.warn("[exc-pdf] JPEG dataURL failed", e.name, e.message); }
      throw new Error("canvas.toDataURL returned empty — canvas may be tainted; try refreshing");
    }
    const { url: dataUrl, fmt } = await canvasToDataUrl(canvas);
    const cw = canvas.width, ch = canvas.height;
    // Free the canvas memory before jsPDF starts re-encoding (avoids OOM crashes on huge scenes).
    try { canvas.width = 1; canvas.height = 1; } catch {}
    const orientation = cw > ch ? "l" : "p";
    const pdf = new jsPDF({ orientation, unit: "px", format: [cw, ch], compress: true });
    pdf.addImage(dataUrl, fmt, 0, 0, cw, ch, undefined, "NONE");
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

  // Quartz SPA navigation doesn't re-execute <script type="module"> in swapped pages,
  // so the inline excalidraw mount script never runs on SPA-internal nav into a canvas.
  // Detect SPA arrival on an excalidraw page where nothing is mounted, and force a full reload.
  function isExcalidrawPage() {
    return !!document.querySelector('.excalidraw-container');
  }
  function isMounted() {
    return !!document.querySelector('.exc-viewer-root');
  }
  document.addEventListener("nav", () => {
    if (isExcalidrawPage() && !isMounted()) {
      // Avoid an infinite loop if reload itself somehow fails to render.
      if (sessionStorage.getItem('exc-nav-reload') !== location.pathname) {
        sessionStorage.setItem('exc-nav-reload', location.pathname);
        location.reload();
      }
    } else if (isMounted()) {
      // Clear once successfully mounted so a later visit can reload again if needed.
      sessionStorage.removeItem('exc-nav-reload');
    }
  });
})();
