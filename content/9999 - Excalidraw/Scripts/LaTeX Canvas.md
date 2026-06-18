---
excalidraw-plugin: parsed
---

/*
LaTeX Canvas — render LaTeX in selected text elements directly on canvas.

UX:
  - Select a text element whose content contains `$...$` or `$$...$$`.
  - A floating Σ "TeX" pill appears in the group bar above the element
    (coexists with AI Edit + Export Element pills).
  - Click → text element replaced by a rendered LaTeX image at the same
    x/y, sized to the rendered SVG bbox. Original source is stashed in
    `customData.latexSource` for roundtrip.
  - Select that image → pill shows "Edit TeX" (yellow accent). Click →
    image replaced back with the original text element.

Settings (Excalidraw → Settings → LaTeX Canvas):
  - Render mode: svg (default) | png
  - Color follows stroke: bool (default true)
  - Display scale: 1..4 (default 2)
  - Auto-detect on text edit: bool (v2, reserved)

Pair with `latex-canvas-startup.md` Templater Startup Template so the
overlay auto-installs on every Excalidraw view (same pattern as AI Edit
/ Export Element).

```javascript
*/
const OVERLAY_ID_PREFIX = "excali-tex-overlay-";
const STYLE_ID = "excali-tex-style";
const CACHE_FOLDER = "latex-cache";

// ---------- settings ----------
const settings = ea.getScriptSettings() || {};
let dirty = false;
if (!settings["Render mode"]) {
  settings["Render mode"] = {
    value: "svg",
    valueset: ["svg", "png"],
    description: "svg = crisp scalable. png = safest in exports."
  };
  dirty = true;
}
if (settings["Color follows stroke"] === undefined) {
  settings["Color follows stroke"] = {
    value: true,
    description: "Snapshot the text element's strokeColor at render time."
  };
  dirty = true;
}
if (!settings["Display scale"]) {
  settings["Display scale"] = {
    value: 2,
    description: "Multiplies rendered LaTeX size (1..4)."
  };
  dirty = true;
}
if (settings["Auto-detect on text edit"] === undefined) {
  settings["Auto-detect on text edit"] = {
    value: false,
    description: "v2 — reserved for live preview while editing."
  };
  dirty = true;
}
if (settings["Debug logging"] === undefined) {
  settings["Debug logging"] = {
    value: false,
    description: "Verbose [LaTeX Canvas] breadcrumbs in DevTools console — pipeline input, regex match, addLaTex result. Off by default."
  };
  dirty = true;
}
if (dirty) ea.setScriptSettings(settings);

const RENDER_MODE = String(settings["Render mode"]?.value || "svg").toLowerCase();
const COLOR_FOLLOWS = Boolean(settings["Color follows stroke"]?.value);
const DISPLAY_SCALE = Math.max(1, Math.min(4, Number(settings["Display scale"]?.value) || 2));
const DEBUG_LOG    = Boolean(settings["Debug logging"]?.value);
const LOG_TAG = "[LaTeX Canvas]";
const DLOG = (...a) => { if (DEBUG_LOG) console.log(LOG_TAG, ...a); };
const ELOG = (...a) => console.error(LOG_TAG, ...a);
const WLOG = (...a) => console.warn(LOG_TAG, ...a);

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// ---------- one overlay per view ----------
const overlayId = OVERLAY_ID_PREFIX + (view.leaf?.id || "default");
const prior = view._latexCanvasOverlay;
if (prior && prior.cleanup) prior.cleanup();
document.getElementById(overlayId)?.remove();

// ---------- styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .excali-tex-pill {
      position: fixed; z-index: 2000;
      box-sizing: border-box; appearance: none; -webkit-appearance: none;
      height: 26px; min-width: 52px; padding: 0 10px; margin: 0;
      line-height: 1;
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      border-radius: 13px;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      cursor: pointer; user-select: none;
      font-family: var(--font-interface);
      font-size: 12px; font-weight: 700; letter-spacing: 0.4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: background 0.12s, color 0.12s, border-color 0.12s, transform 0.12s;
    }
    .excali-tex-pill::before {
      content: "Σ";
      font-size: 13px;
      color: var(--interactive-accent);
      line-height: 1;
      font-weight: 800;
    }
    .excali-tex-pill:hover {
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-color: var(--interactive-accent);
      transform: translateY(-1px);
    }
    .excali-tex-pill:hover::before { color: var(--text-on-accent); }
    .excali-tex-pill.editmode {
      background: #fde68a;
      color: #78350f;
      border-color: #f59e0b;
    }
    .excali-tex-pill.editmode::before { color: #b45309; }
    .excali-tex-pill.editmode:hover {
      background: #f59e0b;
      color: white;
      border-color: #d97706;
    }
    .excali-tex-pill.editmode:hover::before { color: white; }
    .excali-tex-pill.busy {
      pointer-events: none;
      color: transparent;
      position: relative;
    }
    .excali-tex-pill.busy::after {
      content: "";
      position: absolute;
      top: 50%; left: 50%;
      width: 12px; height: 12px;
      margin: -6px 0 0 -6px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--interactive-accent) 25%, transparent);
      border-top-color: var(--interactive-accent);
      animation: excali-tex-spin 0.7s linear infinite;
    }
    @keyframes excali-tex-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

// ---------- helpers ----------
// Detection vs extraction.
//   hasTexDelimiters → "this looks like LaTeX, show the pill".
//   extractPureMath  → "give me the math body to pass to MathJax, or
//                       null if input is mixed prose+math (which the
//                       plugin's MathJax build cannot render reliably —
//                       see learnings/excalidraw-api.md 2026-06-04)".
//
// Accepted forms (after trim, and after unwrapping \begin{document}…
// \end{document} if a full LaTeX preamble is present):
//   $...$            inline
//   $$...$$          display
//   \(...\)          inline
//   \[...\]          display
//   \begin{equation}...\end{equation}      (and starred variant)
//   \begin{align}    ...                    (and starred)
//   \begin{gather}   ...                    (and starred)
//   \begin{multline} ...                    (and starred)
//   \begin{eqnarray} ...                    (and starred)
//   \begin{array}    ...
const TEX_INLINE_RE   = /\$[^$\n]+\$/;
const TEX_BLOCK_RE    = /\$\$[\s\S]+\$\$/;
const TEX_BRACKET_RE  = /\\\[[\s\S]+\\\]/;
const TEX_PAREN_RE    = /\\\([\s\S]+\\\)/;
const TEX_DOCUMENT_RE = /\\begin\{document\}([\s\S]*?)\\end\{document\}/;
const MATH_ENV_NAME   = "(?:equation\\*?|align\\*?|gather\\*?|multline\\*?|eqnarray\\*?|array)";
const TEX_ENV_RE      = new RegExp(`\\\\begin\\{${MATH_ENV_NAME}\\}[\\s\\S]+?\\\\end\\{${MATH_ENV_NAME}\\}`);

function unwrapDocument(text) {
  const m = String(text || "").match(TEX_DOCUMENT_RE);
  return m ? m[1].trim() : String(text || "").trim();
}
// Returns the raw math body (no $..$ wrapping) ready to hand to
// `ea.addLaTex`, OR null when the input is mixed prose+math we can't
// safely render.
function extractPureMath(text) {
  const raw = String(text || "");
  const t = unwrapDocument(text);
  const docUnwrapped = (t !== raw.trim());
  DLOG("extractPureMath input", { rawLen: raw.length, trimmedLen: t.length, docUnwrapped, preview: t.slice(0, 80) });
  let m;
  const matched = (form, body) => { DLOG("matched form:", form, "→ math len", body.length, "preview", body.slice(0, 80)); return body; };
  if ((m = t.match(/^\$\$([\s\S]+)\$\$$/)))  return matched("$$..$$",      m[1].trim());
  if ((m = t.match(/^\$([^$\n]+)\$$/)))      return matched("$..$",        m[1].trim());
  if ((m = t.match(/^\\\[([\s\S]+)\\\]$/)))  return matched("\\[..\\]",    m[1].trim());
  if ((m = t.match(/^\\\(([\s\S]+)\\\)$/)))  return matched("\\(..\\)",    m[1].trim());
  if ((m = t.match(/^\[([\s\S]+)\\?\]$/)))   return matched("[..\\]?",     m[1].trim());
  if ((m = t.match(/^\\?\[([\s\S]+)\]$/)))   return matched("\\?[..]",     m[1].trim());
  if ((m = t.match(/^\(([^\n]+)\\?\)$/)))    return matched("(..\\)?",     m[1].trim());
  if ((m = t.match(/^\\?\(([^\n]+)\)$/)))    return matched("\\?(..)",     m[1].trim());
  const envRe = new RegExp(`^(\\\\begin\\{${MATH_ENV_NAME}\\}[\\s\\S]+\\\\end\\{${MATH_ENV_NAME}\\})$`);
  if ((m = t.match(envRe)))                  return matched("math env",    m[1]);
  DLOG("no pure-math form matched — refusing");
  return null;
}
function isPureTex(text) { return extractPureMath(text) !== null; }
function hasTexDelimiters(text) {
  if (!text) return false;
  return TEX_BLOCK_RE.test(text) || TEX_INLINE_RE.test(text)
      || TEX_BRACKET_RE.test(text) || TEX_PAREN_RE.test(text)
      || TEX_ENV_RE.test(text) || TEX_DOCUMENT_RE.test(text);
}
// Escape special TeX chars for \text{} arg. MathJax does NOT ship
// \textasciicircum / \textasciitilde / \char from the LaTeX prose layer
// — using them inside \text{} either silently fails the whole expression
// (returns a thin/blank SVG) or renders the macro name as red literal
// glyphs (see image bugs 2026-06-04). Inside MathJax \text{} the parser
// is in text mode, so ^ ~ are not active and render as literal glyphs.
// We escape only the chars that ARE special in text mode.
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

// ---------- overlay state ----------
let pill = null, currentEl = null, mode = "tex"; // "tex" | "edit"

function clearOverlay() {
  if (pill) { pill.remove(); pill = null; }
}

function renderForElement(el) {
  if (!el) { clearOverlay(); currentEl = null; return; }
  let nextMode = null;
  // Gate on extractPureMath (not hasTexDelimiters) so the pill only
  // appears when the element is actually renderable. Mixed prose+math,
  // multiple math runs, empty `$$ $$`, and \documentclass docs with no
  // math body all return null from extractPureMath → no pill, no
  // user-visible error path (was confusing — pill appeared then click
  // failed with a Notice).
  if (el.type === "text" && extractPureMath(el.text || el.originalText)) {
    nextMode = "tex";
  } else if (el.type === "image" && el.customData?.latexSource) {
    nextMode = "edit";
  } else {
    clearOverlay(); currentEl = null; return;
  }
  // Zoom-out hide: same rule as AI Edit / Export.
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  if ((el.width || 0) * zoom < 60) { clearOverlay(); currentEl = null; return; }
  currentEl = el;
  mode = nextMode;
  const topMid = sceneToScreen(el.x + (el.width || 0) / 2, el.y);
  if (!pill) {
    pill = document.createElement("button");
    pill.className = "excali-tex-pill";
    pill.title =
      "Render LaTeX\n" +
      "Accepted forms (whole element only — prose around math not supported):\n" +
      "  $a^2+b^2=c^2$           inline\n" +
      "  $$\\int_0^1 x\\,dx$$       display\n" +
      "  \\(...\\)  \\[...\\]         AMS inline / display\n" +
      "  \\begin{align}…\\end{align}  equation, align, gather, multline, eqnarray, array\n" +
      "Full \\documentclass{...} \\begin{document}…\\end{document} is unwrapped automatically.";
    document.body.appendChild(pill);
    pill.onclick = (e) => { e.stopPropagation(); onPillClick(); };
    // Forward wheel events to the canvas underneath.
    pill.addEventListener("wheel", (e) => {
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
  }
  pill.textContent = mode === "edit" ? "Edit TeX" : "TeX";
  pill.classList.toggle("editmode", mode === "edit");
  // Group layout: [TeX] [AI] [Export]. TeX is leftmost. Measure the
  // other two each tick so we coexist with their floating widths.
  const TEX_W = pill.offsetWidth || 52;
  const GAP   = 6;
  const voicePill = document.querySelector(".voice-text-mic-pill, .voice-text-stop");
  const voiceW    = voicePill ? voicePill.offsetWidth : 0;
  const aiBtn = document.querySelector(".ai-edit-btn");
  const aiW   = aiBtn ? aiBtn.offsetWidth : 0;
  const grpPill = document.querySelector(".excali-group-pill");
  const grpW    = grpPill ? grpPill.offsetWidth : 0;
  const expBar = document.querySelector(".excali-export-bar");
  const expW  = expBar ? expBar.offsetWidth : 0;
  // Resize Pills (− / +) sit between TeX and AI as one block.
  const minusPill = document.querySelector(".excali-resize-minus");
  const plusPill  = document.querySelector(".excali-resize-plus");
  const resizeW   = (minusPill ? minusPill.offsetWidth : 0)
                  + (plusPill  ? plusPill.offsetWidth  : 0)
                  + ((minusPill && plusPill) ? GAP : 0);
  const groupW = (voiceW ? voiceW + GAP : 0) + TEX_W + (resizeW ? GAP + resizeW : 0) + (aiW ? GAP + aiW : 0) + (grpW ? GAP + grpW : 0) + (expW ? GAP + expW : 0);
  let leftPx = topMid.x - groupW / 2 + (voiceW ? voiceW + GAP : 0);
  let topPx  = topMid.y - 34;
  // Hide the pill when the element is fully scrolled off the canvas.
  const canvas = view.contentEl.querySelector("canvas.interactive");
  const cRect  = canvas ? canvas.getBoundingClientRect() : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  const elRightPx  = sceneToScreen(el.x + (el.width || 0), el.y).x;
  const elBottomPx = sceneToScreen(el.x, el.y + (el.height || 0)).y;
  if (topMid.y > cRect.bottom || elBottomPx < cRect.top ||
      elRightPx < cRect.left  || topMid.x > cRect.right) {
    clearOverlay(); currentEl = null; return;
  }
  if (topPx < cRect.top + 6) topPx = cRect.top + 6;
  if (leftPx < cRect.left + 6) leftPx = cRect.left + 6;
  const maxLeft = (cRect.right || window.innerWidth) - groupW - 6;
  if (leftPx > maxLeft) leftPx = maxLeft;
  pill.style.left = `${leftPx}px`;
  pill.style.top  = `${topPx}px`;
}

// ---------- main actions ----------
async function renderTextToImage(el) {
  const srcRaw = el.text || el.originalText || "";
  DLOG("render: source", { elId: el.id, fontSize: el.fontSize, strokeColor: el.strokeColor, len: srcRaw.length, preview: srcRaw.slice(0, 120) });
  const tex = extractPureMath(srcRaw);
  if (!tex) {
    WLOG("render: refused — extractPureMath returned null");
    throw new Error(
      "Element must be pure math. Accepted: $..$, $$..$$, \\(..\\), \\[..\\], or a single equation/align/gather/multline/eqnarray/array env. Full \\documentclass docs are unwrapped automatically. Prose around the math is not supported — put prose in a separate text element."
    );
  }
  if (typeof ea.addLaTex !== "function") {
    ELOG("render: ea.addLaTex missing");
    throw new Error("ea.addLaTex unavailable — update obsidian-excalidraw-plugin");
  }
  DLOG("render: calling ea.addLaTex", { x: el.x, y: el.y, scale: DISPLAY_SCALE, texLen: tex.length });
  const t0 = performance.now();
  ea.reset();
  const imgId = await ea.addLaTex(el.x, el.y, tex, DISPLAY_SCALE, DISPLAY_SCALE);
  DLOG("render: addLaTex returned", { imgId, ms: Math.round(performance.now() - t0) });
  if (!imgId) throw new Error("addLaTex returned no id");
  // Stash roundtrip metadata. Color override is v2 (addLaTex does not
  // honor a color argument; reverting back to text restores strokeColor
  // from this snapshot).
  ea.addAppendUpdateCustomData(imgId, {
    latexSource: srcRaw,
    latexColor: COLOR_FOLLOWS ? (el.strokeColor || null) : null,
    latexScale: DISPLAY_SCALE,
    latexMode: RENDER_MODE,
    latexFontSize: el.fontSize || null,
    latexFontFamily: el.fontFamily || null
  });
  // Mark the original text element for deletion in the same commit.
  ea.copyViewElementsToEAforEditing([el]);
  const elDel = ea.getElement(el.id);
  if (elDel) elDel.isDeleted = true;
  await ea.addElementsToView(false, true, false);
}

async function reverseImageToText(img) {
  const src = img.customData?.latexSource || "";
  DLOG("revert: image →text", { imgId: img.id, srcLen: src.length, preview: src.slice(0, 80), color: img.customData?.latexColor });
  if (!src) throw new Error("Image has no stored LaTeX source");
  const color = img.customData?.latexColor || "#000000";
  ea.reset();
  ea.style.strokeColor = color;
  if (img.customData?.latexFontSize) ea.style.fontSize = img.customData.latexFontSize;
  if (img.customData?.latexFontFamily) ea.style.fontFamily = img.customData.latexFontFamily;
  const textId = ea.addText(img.x, img.y, src, { autoResize: true });
  if (!textId) throw new Error("addText failed");
  ea.copyViewElementsToEAforEditing([img]);
  const imgDel = ea.getElement(img.id);
  if (imgDel) imgDel.isDeleted = true;
  await ea.addElementsToView(false, true, false);
}

async function onPillClick() {
  if (!currentEl || !pill) return;
  DLOG("pill click", { mode, elId: currentEl.id, elType: currentEl.type });
  pill.classList.add("busy");
  try {
    if (mode === "tex") {
      await renderTextToImage(currentEl);
      DLOG("pill click: render OK");
      new ea.obsidian.Notice("LaTeX rendered");
    } else {
      await reverseImageToText(currentEl);
      DLOG("pill click: revert OK");
      new ea.obsidian.Notice("LaTeX reverted to text");
    }
  } catch (e) {
    ELOG("pill click failed:", e);
    new ea.obsidian.Notice(`LaTeX Canvas: ${e.message || e}`, 6000);
  } finally {
    if (pill) pill.classList.remove("busy");
  }
}

// ---------- watch selection ----------
function isViewLive() {
  // Only render the pill when this script's view is the currently active
  // Excalidraw leaf AND its DOM is attached + visible. Prevents the pill
  // from "leaking" over other tabs after the user switches notes.
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
  if (!el) { clearOverlay(); currentEl = null; return; }
  renderForElement(el);
}
// Shared pill-tick scheduler. See AI Edit for full notes.
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

DLOG("overlay installed for leaf", view.leaf?.id, "DEBUG_LOG=", DEBUG_LOG);
view._latexCanvasOverlay = {
  cleanup: () => {
    pillTick.subs.delete(refresh);
    if (pillTick.subs.size === 0) { try { pillTick.stop(); } catch (_) {} }
    try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
    try { ro?.disconnect(); } catch (_) {}
    clearOverlay();
    view._latexCanvasOverlay = null;
  }
};
refresh();
/*
```
*/
