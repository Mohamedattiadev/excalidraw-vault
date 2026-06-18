---
excalidraw-plugin: parsed
---

/*
Export Element — floating pill above the current selection. Click to copy
the selected element(s) as PNG, SVG, or JSON. Same overlay UX as AI Edit.

UX:
  - Select one or more elements on the canvas.
  - A small ✦ "Export" pill appears above the selection bbox.
  - Click → popup with format buttons: PNG, SVG, JSON.
  - Pick a format → element(s) exported and put on clipboard.
  - PNG → image on clipboard (paste into chat / docs).
  - SVG → SVG markup as text on clipboard.
  - JSON → Excalidraw element JSON on clipboard.
  - Esc or click outside closes the popup.

Pair with the same Templater startup template you use for AI Edit / Minimap
so the overlay auto-installs on every Excalidraw view.

```javascript
*/
const OVERLAY_ID_PREFIX = "excali-export-overlay-";
const STYLE_ID = "excali-export-style";

// ---------- settings ----------
const settings = ea.getScriptSettings() || {};
let dirty = false;
if (!settings["PNG scale"]) {
  settings["PNG scale"] = { value: 2, description: "Pixel scale for PNG export (1–4)." };
  dirty = true;
}
if (!settings["Transparent background"]) {
  settings["Transparent background"] = { value: true, description: "PNG with transparent background." };
  dirty = true;
}
if (!settings["Padding"]) {
  settings["Padding"] = { value: 10, description: "Padding around exported element(s)." };
  dirty = true;
}
if (dirty) await ea.setScriptSettings(settings);

const PNG_SCALE  = Number(settings["PNG scale"]?.value) || 2;
const PNG_TRANSP = Boolean(settings["Transparent background"]?.value);
const PADDING    = Number(settings["Padding"]?.value) || 10;

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// ---------- one overlay per view ----------
const overlayId = OVERLAY_ID_PREFIX + (view.leaf?.id || "default");
const prior = view._exportOverlay;
if (prior && prior.cleanup) prior.cleanup();
document.getElementById(overlayId)?.remove();

// ---------- styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .excali-export-bar {
      position: fixed; z-index: 2000;
      display: inline-flex; align-items: center; gap: 4px;
      user-select: none; font-family: var(--font-interface);
      padding: 2px;
      height: 26px; box-sizing: border-box;
      background: color-mix(in srgb, var(--background-primary) 92%, transparent);
      border: 1px solid var(--background-modifier-border);
      border-radius: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .excali-export-label {
      height: 20px; padding: 0 8px;
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: 10px;
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--interactive-accent) 14%, transparent),
        color-mix(in srgb, var(--interactive-accent) 4%, transparent));
      color: var(--text-normal);
      font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
      cursor: pointer;
    }
    .excali-export-label:hover {
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--interactive-accent) 28%, transparent),
        color-mix(in srgb, var(--interactive-accent) 10%, transparent));
    }
    .excali-export-bar.collapsed .excali-export-dot { display: none; }
    .excali-export-label::before {
      content: "";
      width: 12px; height: 12px;
      background-color: var(--interactive-accent);
      /* Lucide "upload" icon — arrow-out-of-tray, semantic match for
         "export to clipboard". Masked so the glyph picks up the theme
         accent colour and the accent drop-shadow keeps the AI-pill
         family resemblance. */
      -webkit-mask: var(--excali-export-icon) center/contain no-repeat;
              mask: var(--excali-export-icon) center/contain no-repeat;
      filter: drop-shadow(0 0 3px color-mix(in srgb, var(--interactive-accent) 50%, transparent));
    }
    .excali-export-label {
      --excali-export-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>");
    }
    .excali-export-dot {
      position: relative;
      min-width: 30px; height: 20px; border-radius: 10px;
      padding: 0 6px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--background-secondary);
      color: var(--text-muted);
      border: 1px solid transparent;
      cursor: pointer; overflow: hidden;
      font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
      font-family: var(--font-interface);
      transition: background 160ms ease, color 160ms ease,
                  border-color 160ms ease, transform 160ms ease,
                  box-shadow 160ms ease;
    }
    .excali-export-dot:hover {
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-color: color-mix(in srgb, var(--interactive-accent) 60%, white);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px color-mix(in srgb, var(--interactive-accent) 35%, transparent);
    }
    .excali-export-dot:active { transform: translateY(0); }
    .excali-export-dot:disabled { cursor: wait; }
    .excali-export-dot.busy {
      color: transparent;
      background: var(--background-secondary);
      border-color: var(--background-modifier-border);
    }
    .excali-export-dot.busy::after {
      content: "";
      position: absolute;
      top: 50%; left: 50%;
      width: 12px; height: 12px;
      margin: -6px 0 0 -6px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--interactive-accent) 25%, transparent);
      border-top-color: var(--interactive-accent);
      animation: excali-export-spin 0.7s linear infinite;
    }
    .excali-export-dot.ok {
      background: #16a34a; color: white; border-color: #16a34a;
    }
    .excali-export-dot.ok::after {
      content: "✓"; position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 900; color: white;
    }
    .excali-export-dot.err {
      background: #dc2626; color: white; border-color: #dc2626;
      animation: excali-export-shake 0.32s ease;
    }
    .excali-group-pill {
      position: fixed; z-index: 2000;
      box-sizing: border-box; appearance: none; -webkit-appearance: none;
      height: 26px; min-width: 64px; padding: 0 12px; margin: 0;
      line-height: 1;
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      border-radius: 13px;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      cursor: pointer; user-select: none;
      font-family: var(--font-interface);
      font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: background 0.12s, color 0.12s, border-color 0.12s, transform 0.12s;
    }
    .excali-group-pill::before {
      content: "⛶";
      font-size: 13px;
      color: var(--interactive-accent);
      line-height: 1; font-weight: 800;
    }
    .excali-group-pill:hover {
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-color: var(--interactive-accent);
      transform: translateY(-1px);
    }
    .excali-group-pill:hover::before { color: var(--text-on-accent); }
    .excali-group-pill.ungroup::before { content: "⛶̸"; }
    .excali-group-pill.busy { pointer-events: none; color: transparent; position: relative; }
    .excali-group-pill.busy::after {
      content: ""; position: absolute; top: 50%; left: 50%;
      width: 12px; height: 12px; margin: -6px 0 0 -6px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--interactive-accent) 25%, transparent);
      border-top-color: var(--interactive-accent);
      animation: excali-export-spin 0.7s linear infinite;
    }
    @keyframes excali-export-spin { to { transform: rotate(360deg); } }
    @keyframes excali-export-shake {
      0%,100% { transform: translateX(0); }
      25% { transform: translateX(-3px); }
      75% { transform: translateX(3px); }
    }
  `;
  document.head.appendChild(s);
}

// ---------- overlay state ----------
let bar = null, groupPill = null, currentEls = [];

function clearOverlay() {
  if (bar) {
    const h = bar._collapseHandlers;
    if (h) {
      document.removeEventListener("mousedown", h.outsideClick, true);
      document.removeEventListener("keydown", h.escKey, true);
    }
    bar.remove(); bar = null;
  }
  if (groupPill) { groupPill.remove(); groupPill = null; }
}
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
// Per-element bbox accounting for line/freedraw "points" arrays. For
// those element types `el.x/el.y` is the anchor of the first point, not
// the bbox top-left — using `el.y` alone places the overlay inside the
// shape (see polygon bug). When points exist, shift by their min coords.
function elBBox(el) {
  if (Array.isArray(el.points) && el.points.length) {
    let minPX = Infinity, minPY = Infinity, maxPX = -Infinity, maxPY = -Infinity;
    for (const [px, py] of el.points) {
      if (px < minPX) minPX = px;
      if (py < minPY) minPY = py;
      if (px > maxPX) maxPX = px;
      if (py > maxPY) maxPY = py;
    }
    return {
      minX: el.x + minPX, minY: el.y + minPY,
      maxX: el.x + maxPX, maxY: el.y + maxPY,
    };
  }
  const w = el.width || 0, h = el.height || 0;
  return { minX: el.x, minY: el.y, maxX: el.x + w, maxY: el.y + h };
}
function unionBBox(els) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    const b = elBBox(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

function renderForElements(els) {
  if (!els || els.length === 0) { clearOverlay(); currentEls = []; return; }
  const bb = unionBBox(els);
  // Hide overlay when the on-screen selection is too small to host the
  // bar without dwarfing the element. Mirrors the collab-frame `tooSmall`
  // rule. User can zoom in to access.
  const zoom = api.getAppState().zoom?.value || 1;
  const bbScreenW = (bb.maxX - bb.minX) * zoom;
  const bbScreenH = (bb.maxY - bb.minY) * zoom;
  if (bbScreenW < 60 || bbScreenH < 20) { clearOverlay(); currentEls = []; return; }
  currentEls = els;
  const top = sceneToScreen((bb.minX + bb.maxX) / 2, bb.minY);
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "excali-export-bar collapsed";
    bar.innerHTML = `
      <span class="excali-export-label" title="Export — click to choose format">Export</span>
      <button class="excali-export-dot" data-fmt="png" title="Copy as PNG">PNG</button>
      <button class="excali-export-dot" data-fmt="svg" title="Copy as SVG">SVG</button>
      <button class="excali-export-dot" data-fmt="json" title="Copy as JSON">JSON</button>
    `;
    document.body.appendChild(bar);
    bar.addEventListener("mousedown", e => e.stopPropagation(), true);
    // Collapse / expand: label is a one-pill ✦ chip until clicked, then
    // PNG / SVG / JSON dots fan out. Outside click + Esc re-collapse.
    const collapse = () => bar.classList.add("collapsed");
    const expand   = () => bar.classList.remove("collapsed");
    bar.querySelector(".excali-export-label").onclick = (e) => {
      e.stopPropagation();
      bar.classList.toggle("collapsed");
    };
    const outsideClick = (e) => { if (!bar.contains(e.target)) collapse(); };
    const escKey = (e) => { if (e.key === "Escape") collapse(); };
    document.addEventListener("mousedown", outsideClick, true);
    document.addEventListener("keydown", escKey, true);
    bar._collapseHandlers = { outsideClick, escKey, collapse };
    // Forward wheel events on the bar to the canvas underneath so the
    // user can keep scroll-zooming while the cursor is over the pill.
    bar.addEventListener("wheel", (e) => {
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
    }, { passive: false });
    bar.querySelectorAll(".excali-export-dot").forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (b.disabled) return;
        const fmt = b.dataset.fmt;
        const all = bar.querySelectorAll(".excali-export-dot");
        all.forEach(x => x.disabled = true);
        b.classList.remove("ok", "err");
        b.classList.add("busy");
        let ok = false;
        try { await exportAs(fmt); ok = true; }
        catch (err) {
          console.error("[Export Element]", err);
          new ea.obsidian.Notice(`Export failed: ${err.message || err}`, 6000);
        } finally {
          b.classList.remove("busy");
          b.classList.add(ok ? "ok" : "err");
          setTimeout(() => {
            b.classList.remove("ok", "err");
            all.forEach(x => x.disabled = false);
            if (ok) bar.classList.add("collapsed");
          }, ok ? 900 : 600);
        }
      };
    });
  }
  // Group pill: its own DOM element to the LEFT of the Export bar.
  // Only present when 2+ elements are selected.
  if (els.length >= 2) {
    if (!groupPill) {
      groupPill = document.createElement("button");
      groupPill.className = "excali-group-pill";
      groupPill.title = "Group / Ungroup the selection";
      document.body.appendChild(groupPill);
      groupPill.addEventListener("wheel", (e) => {
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
      }, { passive: false });
      groupPill.onclick = async (e) => {
        e.stopPropagation();
        if (!groupPill) return;
        groupPill.classList.add("busy");
        try { await toggleGroupSelection(); }
        catch (err) {
          console.error("[Export Element group]", err);
          new ea.obsidian.Notice(`Group failed: ${err.message || err}`);
        } finally {
          if (groupPill) groupPill.classList.remove("busy");
        }
      };
    }
    const isShared = !!commonGroupId(els);
    groupPill.textContent = `${isShared ? "Ungroup" : "Group"} (${els.length})`;
    groupPill.classList.toggle("ungroup", isShared);
  } else if (groupPill) {
    groupPill.remove(); groupPill = null;
  }
  const br = bar.getBoundingClientRect();
  const w = br.width || 200;
  const h = br.height || 38;
  // Layout: [TeX] [AI] [Group] [Export] centered above the element.
  // Each pill is owned by a different script (Group lives in this
  // script too but as a separate element). Measure live widths each
  // tick so we shift to make room as pills appear / disappear.
  const GAP  = 6;
  const voicePill = document.querySelector(".voice-text-mic-pill, .voice-text-stop");
  const voiceW    = voicePill ? voicePill.offsetWidth : 0;
  const texPill = document.querySelector(".excali-tex-pill");
  const texW    = texPill ? texPill.offsetWidth : 0;
  const aiBtn   = document.querySelector(".ai-edit-btn");
  const aiW     = aiBtn ? aiBtn.offsetWidth : 0;
  const groupW  = groupPill ? groupPill.offsetWidth : 0;
  // Resize Pills (− / +) sit between TeX and AI as one block.
  const minusPill = document.querySelector(".excali-resize-minus");
  const plusPill  = document.querySelector(".excali-resize-plus");
  const rzW      = (minusPill ? minusPill.offsetWidth : 0)
                 + (plusPill  ? plusPill.offsetWidth  : 0)
                 + ((minusPill && plusPill) ? GAP : 0);
  const leadW   = (voiceW ? voiceW + GAP : 0) + (texW ? texW + GAP : 0) + (rzW ? rzW + GAP : 0) + (aiW ? aiW + GAP : 0) + (groupW ? groupW + GAP : 0);
  let leftPx, topPx;
  if (leadW > 0) {
    const groupBarW = leadW + w;
    leftPx = top.x - groupBarW / 2 + leadW;
    topPx  = top.y - 34;
  } else {
    leftPx = top.x - w / 2;
    topPx  = top.y - h - 8;
  }
  // Position the Group pill just left of the Export bar (with a GAP).
  if (groupPill) {
    groupPill.style.left = `${leftPx - groupW - GAP}px`;
    groupPill.style.top  = `${topPx}px`;
  }
  // Hide the bar entirely when the selection bbox is fully outside the
  // canvas viewport. Clamping kept the bar stuck at the edge while the
  // element was scrolled away — looked broken.
  const canvas = view.contentEl.querySelector("canvas.interactive");
  const cRect  = canvas ? canvas.getBoundingClientRect() : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  const bbBR  = sceneToScreen(bb.maxX, bb.maxY);
  const bbTL  = sceneToScreen(bb.minX, bb.minY);
  if (bbTL.y > cRect.bottom || bbBR.y < cRect.top ||
      bbBR.x < cRect.left   || bbTL.x > cRect.right) {
    clearOverlay(); currentEls = []; return;
  }
  const minTop = cRect.top + 6;
  if (topPx < minTop) topPx = minTop;
  const maxLeft = (cRect.right || window.innerWidth) - w - 6;
  if (leftPx < cRect.left + 6) leftPx = cRect.left + 6;
  if (leftPx > maxLeft)        leftPx = maxLeft;
  bar.style.left = `${leftPx}px`;
  bar.style.top  = `${topPx}px`;
}

// ---------- export logic ----------
function freshSelectionEls() {
  const st = api.getAppState();
  const ids = Object.keys(st.selectedElementIds || {});
  if (ids.length === 0) return [];
  const all = api.getSceneElements() || [];
  return all.filter(e => ids.includes(e.id));
}

function commonGroupId(els) {
  if (!els || els.length < 2) return null;
  let common = new Set(els[0].groupIds || []);
  for (let i = 1; i < els.length; i++) {
    const g = new Set(els[i].groupIds || []);
    common = new Set([...common].filter(x => g.has(x)));
    if (common.size === 0) return null;
  }
  return common.size > 0 ? [...common][0] : null;
}

async function toggleGroupSelection() {
  const els = freshSelectionEls();
  if (els.length < 2) throw new Error("Select at least 2 elements");
  const shared = commonGroupId(els);
  ea.reset();
  ea.copyViewElementsToEAforEditing(els);
  if (shared) {
    for (const el of els) {
      const eel = ea.getElement(el.id);
      if (!eel) continue;
      eel.groupIds = (eel.groupIds || []).filter(g => g !== shared);
    }
  } else {
    const gid = "g_" + Math.random().toString(36).slice(2, 10);
    for (const el of els) {
      const eel = ea.getElement(el.id);
      if (!eel) continue;
      eel.groupIds = [...(eel.groupIds || []), gid];
    }
  }
  await ea.addElementsToView(false, true, false);
  new ea.obsidian.Notice(shared ? "Ungrouped" : `Grouped ${els.length} elements`);
}

async function loadEAFromSelection() {
  const els = freshSelectionEls();
  if (els.length === 0) throw new Error("Nothing selected");
  ea.reset();
  // copyImages=true forces the EA workbench to also copy image bytes
  // (imagesDict) from the view. Without it, createPNG/createSVG can't
  // resolve embedded image fileIds and the exported PNG comes out blank
  // when the selection contains an image element (e.g. a LaTeX Canvas
  // rendered equation).
  ea.copyViewElementsToEAforEditing(els, true);
  return els;
}

function buildLoader() {
  // Plugin-provided loader walks the view's image cache. Required so
  // createPNG/createSVG can fetch the bytes for image elements.
  try {
    const isDark = (api.getAppState().theme || "light") === "dark";
    return ea.getEmbeddedFilesLoader?.(isDark);
  } catch (_) { return undefined; }
}

async function exportAs(fmt) {
  const els = await loadEAFromSelection();
  const theme = api.getAppState().theme || "light";
  const loader = buildLoader();

  if (fmt === "png") {
    const blob = await ea.createPNG(
      undefined, PNG_SCALE,
      { withBackground: !PNG_TRANSP, withTheme: true },
      loader, theme, PADDING
    );
    if (!blob) throw new Error("createPNG returned empty");
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Clipboard image API unavailable in this build");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    new ea.obsidian.Notice(`Copied PNG (${els.length} element${els.length === 1 ? "" : "s"})`);
    return;
  }

  if (fmt === "svg") {
    const svg = await ea.createSVG(
      undefined, true,
      { withBackground: !PNG_TRANSP, withTheme: true },
      loader, theme, PADDING
    );
    if (!svg) throw new Error("createSVG returned empty");
    const xml = new XMLSerializer().serializeToString(svg);
    await navigator.clipboard.writeText(xml);
    new ea.obsidian.Notice(`Copied SVG (${els.length} element${els.length === 1 ? "" : "s"})`);
    return;
  }

  if (fmt === "json") {
    const files = api.getFiles?.() || {};
    const referenced = {};
    for (const el of els) {
      if (el.fileId && files[el.fileId]) referenced[el.fileId] = files[el.fileId];
    }
    const payload = { type: "excalidraw/clipboard", elements: els, files: referenced };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    new ea.obsidian.Notice(`Copied JSON (${els.length} element${els.length === 1 ? "" : "s"})`);
    return;
  }

  throw new Error(`Unknown format ${fmt}`);
}

// ---------- watch selection + scroll ----------
function isViewLive() {
  if (!view.contentEl?.isConnected) return false;
  const active = app.workspace.activeLeaf?.view;
  if (active !== view) return false;
  const r = view.contentEl.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function refresh() {
  if (!isViewLive()) { clearOverlay(); currentEls = []; return; }
  const els = freshSelectionEls();
  if (els.length === 0) { clearOverlay(); currentEls = []; return; }
  renderForElements(els);
}
// Shared pill-tick scheduler. See AI Edit for full notes — one rAF loop
// per view shared by all three pill scripts, idle when selection +
// zoom + scroll are unchanged.
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
  const fanout = () => {
    for (const fn of sched.subs) { try { fn(); } catch (_) {} }
  };
  const loop = () => {
    if (!sched.running) return;
    sched.handle = requestAnimationFrame(loop);
    sched.frame = (sched.frame | 0) + 1;
    if ((sched.frame & 1) && sched.pendingPasses <= 0) return;
    if (sched.subs.size === 0) return;
    const s = sig();
    if (s !== sched.lastSig) {
      sched.lastSig = s;
      fanout();
      sched.pendingPasses = 1;
    } else if (sched.pendingPasses > 0) {
      sched.pendingPasses--;
      fanout();
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

view._exportOverlay = {
  cleanup: () => {
    pillTick.subs.delete(refresh);
    if (pillTick.subs.size === 0) { try { pillTick.stop(); } catch (_) {} }
    try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
    try { ro?.disconnect(); } catch (_) {}
    clearOverlay();
    view._exportOverlay = null;
  }
};
refresh();
/*
```
*/
