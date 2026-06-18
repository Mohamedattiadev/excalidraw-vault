---
excalidraw-plugin: parsed
---

/*
Vim Mode — modal vim keys inside any Excalidraw text-element editor.

UX:
  - Start editing any text element (double-click / Enter on selection).
  - Mode pill appears bottom-left of the live textarea:
      -- NORMAL --  /  -- INSERT --  /  -- VISUAL --
  - Default mode on focus = NORMAL (true vim feel).
  - Esc in INSERT/VISUAL → NORMAL.
  - Esc in NORMAL → propagates to Excalidraw (commits the edit).

Subset (v1):
  - Modes: normal | insert | visual (charwise).
  - Insert entries:  i  a  A  I  o  O
  - Motions:         h j k l  0 $  gg G  w b e
  - Normal ops:      x  dd  yy  p  P  u
  - Visual ops:      d (cut) | y (yank) | c (cut + insert)
  - Single unnamed register, persisted on window.__vimMode.

Settings (Excalidraw → Settings → Scripts → Vim Mode):
  - Enabled
  - Start in insert mode
  - Status pill: corner | hidden
  - Use system clipboard for yank/paste

Pair with TemplateOfTemplator/vim-mode-startup.md so the watcher
auto-installs on every Excalidraw view.

```javascript
*/
const PILL_CLASS    = "excali-vim-pill";
const STATUS_CLASS  = "excali-vim-status";
const HINT_CLASS    = "excali-vim-hint";
const STYLE_ID      = "excali-vim-style";
const WATCHER_KEY   = "__vimMode";
const ESC_WINDOW_MS = 400;
const ESC_THRESHOLD = 2;     // N rapid Escs to deselect

// ---------- shared register (cross-edit, in-session) ----------
window.__vimMode = window.__vimMode || { register: "", registerLinewise: false };
window.__vimMode.lastChange = window.__vimMode.lastChange || null;
window.__vimMode.lastFind   = window.__vimMode.lastFind   || null;

// ---------- settings ----------
const settings = ea.getScriptSettings() || {};
let _dirty = false;
if (settings["About"]) { delete settings["About"]; _dirty = true; }
if (!settings["Enabled"]) {
  settings["Enabled"] = { value: true, description: "Master switch. Disable without unpinning." };
  _dirty = true;
}
if (!settings["Start in insert mode"]) {
  settings["Start in insert mode"] = { value: false, description: "If true, edits start in INSERT (Obsidian-like). Default false = NORMAL on focus." };
  _dirty = true;
}
if (!settings["Status pill"]) {
  settings["Status pill"] = { value: "corner", valueset: ["corner", "hidden"], description: "Where to render the mode pill. 'hidden' = no pill (mode still active)." };
  _dirty = true;
}
if (!settings["Global status badge"]) {
  settings["Global status badge"] = { value: true, description: "Bottom-center 'VIM' badge inside the canvas. Click to toggle Enabled." };
  _dirty = true;
}
if (!settings["Esc-to-deselect presses"]) {
  settings["Esc-to-deselect presses"] = { value: 3, description: "Total Esc presses from NORMAL mode to deselect. 1 = native (single Esc commits+deselects)." };
  _dirty = true;
}
if (!settings["Use system clipboard"]) {
  settings["Use system clipboard"] = { value: true, description: "Mirror yank/paste to navigator.clipboard so yanks survive across notes." };
  _dirty = true;
}
if (_dirty) ea.setScriptSettings(settings); // fire-and-forget

const CFG = {
  enabled:     !!settings["Enabled"]?.value,
  startInsert: !!settings["Start in insert mode"]?.value,
  pill:        String(settings["Status pill"]?.value || "corner"),
  badge:       !!settings["Global status badge"]?.value,
  escN:        Math.max(1, parseInt(settings["Esc-to-deselect presses"]?.value, 10) || 2),
  sysclip:     !!settings["Use system clipboard"]?.value,
};

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }

// ---------- per-view cleanup of prior installation (always run first) ----------
if (view._vimMode?.cleanup) view._vimMode.cleanup();

// If disabled, still render a dim "VIM OFF" badge so the user can click
// to re-enable without unpinning. Then exit before installing handlers.
if (!CFG.enabled) {
  // Always show the badge in the disabled branch — clickable rescue.
  installGlobalBadge(false);
  view._vimMode = { cleanup: () => { removeGlobalBadge(); view._vimMode = null; } };
  return;
}

// ---------- stylesheet (re-inject every run so CSS edits land) ----------
document.getElementById(STYLE_ID)?.remove();
{
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .${PILL_CLASS} {
      position: fixed; z-index: 2000;
      padding: 2px 8px; border-radius: 10px;
      font-family: var(--font-monospace, ui-monospace, monospace);
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      user-select: none; pointer-events: auto;
      white-space: nowrap;
    }
    .${PILL_CLASS}.mode-normal { color: var(--text-accent); }
    .${PILL_CLASS}.mode-insert { color: var(--color-green, #2bb673); }
    .${PILL_CLASS}.mode-visual { color: var(--color-orange, #e89132); }
    /* .${STATUS_CLASS} is styled entirely via inline styles in installGlobalBadge */
    .${HINT_CLASS} {
      position: fixed; z-index: 2200;
      padding: 4px 10px; border-radius: 8px;
      background: var(--background-primary);
      color: var(--text-muted);
      border: 1px solid var(--background-modifier-border);
      font-family: var(--font-interface);
      font-size: 11px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
      opacity: 0; transition: opacity 0.12s;
    }
    .${HINT_CLASS}.show { opacity: 1; }
  `;
  document.head.appendChild(s);
}

// ---------- shared state (var for TDZ safety — hoisted helpers read it) ----------
var globalBadge = null;
var badgeRaf = 0;
var globalBadgeMo = null;

function positionBadge() { /* no-op: badge is now absolute-positioned inside the excalidraw container, scrolls/clips with the view */ }

function installGlobalBadge(on) {
  // Tear down any prior badge / observer first.
  removeGlobalBadge();

  // Native ToolIcon-shaped button matching the zoom + / - / undo / redo
  // size (ToolIcon_size_medium). Mounted as a sibling of undo/redo so
  // it lives in the natural footer-left flow.
  // Free-floating badge anchored to canvas bottom-center. Per-frame
  // rAF tick keeps it positioned across canvas resize, zen-mode, leaf
  // switch (hides when not on active leaf).
  const b = document.createElement("button");
  b.className = STATUS_CLASS;
  b.type = "button";
  b.setAttribute("aria-label", on ? "Vim Mode ON" : "Vim Mode OFF");
  b.title = on ? "Vim Mode ON - click to disable" : "Vim Mode OFF - click to enable";
  b.textContent = "VIM";
  Object.assign(b.style, {
    position: "fixed",
    zIndex: "50",
    display: "inline-block",
    alignItems: "center",
    justifyContent: "center",
    height: "20px",
    minWidth: "32px",
    padding: "0 6px",
    fontFamily: "var(--font-monospace, ui-monospace, monospace)",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1px",
    lineHeight: "20px",
    textAlign: "center",
    borderRadius: "var(--border-radius-md, 6px)",
    background: on ? "var(--color-primary, #6965db)" : "var(--island-bg-color, var(--background-primary))",
    color: on ? "var(--color-on-primary, #fff)" : "var(--icon-fill-color, var(--text-muted))",
    border: "1px solid var(--default-border-color, var(--background-modifier-border))",
    boxShadow: "var(--shadow-island, 0 1px 2px rgba(0,0,0,0.1))",
    cursor: "pointer",
    userSelect: "none",
    opacity: on ? "1" : "0.7",
    pointerEvents: "auto",
    transition: "background 0.15s, opacity 0.15s",
  });
  b.addEventListener("wheel", (e) => {
    const c = view.contentEl.querySelector("canvas.interactive");
    if (!c) return;
    e.preventDefault();
    c.dispatchEvent(new WheelEvent("wheel", {
      deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
      clientX: e.clientX, clientY: e.clientY,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
      altKey: e.altKey, metaKey: e.metaKey,
      bubbles: true, cancelable: true,
    }));
  }, { passive: false });
  b.onclick = async () => {
    const s = ea.getScriptSettings() || {};
    if (!s["Enabled"]) s["Enabled"] = { value: true };
    s["Enabled"].value = !on;
    await ea.setScriptSettings(s);
    if (app.commands.commands["obsidian-excalidraw-plugin:Vim Mode"]) {
      app.commands.executeCommandById("obsidian-excalidraw-plugin:Vim Mode");
    }
  };
  document.body.appendChild(b);
  globalBadge = b;
  const tick = () => {
    if (!globalBadge || !document.body.contains(globalBadge)) return;
    const isActive = app.workspace.activeLeaf?.view === view && view.contentEl?.isConnected;
    const canvas = isActive ? view.contentEl.querySelector("canvas.interactive") : null;
    const r = canvas?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) {
      globalBadge.style.display = "none";
    } else {
      globalBadge.style.display = "inline-block";
      globalBadge.style.left = `${r.left + r.width / 2 - globalBadge.offsetWidth / 2}px`;
      globalBadge.style.top  = `${r.bottom - globalBadge.offsetHeight - 10}px`;
    }
    badgeRaf = requestAnimationFrame(tick);
  };
  badgeRaf = requestAnimationFrame(tick);
}

function removeGlobalBadge() {
  try { globalBadgeMo?.disconnect(); } catch (_) {}
  globalBadgeMo = null;
  try { cancelAnimationFrame(badgeRaf); } catch (_) {}
  view?.contentEl?.querySelectorAll("." + STATUS_CLASS).forEach(n => n.remove());
  try { globalBadge?.remove(); } catch (_) {}
  globalBadge = null;
}

// ---------- vim engine over a textarea ----------
function isWord(ch) { return /\w/.test(ch); }

function lineBoundsAt(text, i) {
  const start = text.lastIndexOf("\n", i - 1) + 1;
  let end = text.indexOf("\n", i);
  if (end === -1) end = text.length;
  return { start, end };
}
function columnOf(text, i) {
  return i - (text.lastIndexOf("\n", i - 1) + 1);
}
function moveVertical(text, i, delta) {
  const col = columnOf(text, i);
  const { start } = lineBoundsAt(text, i);
  if (delta < 0) {
    if (start === 0) return i;
    const prev = lineBoundsAt(text, start - 1);
    return Math.min(prev.start + col, prev.end);
  } else {
    const { end } = lineBoundsAt(text, i);
    if (end === text.length) return i;
    const next = lineBoundsAt(text, end + 1);
    return Math.min(next.start + col, next.end);
  }
}
function wordForward(text, i) {
  const n = text.length;
  if (i >= n) return n;
  const onWord = isWord(text[i]);
  let j = i;
  // skip current run
  while (j < n && isWord(text[j]) === onWord && text[j] !== "\n") j++;
  // skip whitespace
  while (j < n && /\s/.test(text[j])) j++;
  return j;
}
function wordBack(text, i) {
  if (i <= 0) return 0;
  let j = i - 1;
  while (j > 0 && /\s/.test(text[j])) j--;
  if (j === 0) return 0;
  const onWord = isWord(text[j]);
  while (j > 0 && isWord(text[j - 1]) === onWord && text[j - 1] !== "\n") j--;
  return j;
}
function wordEnd(text, i) {
  const n = text.length;
  if (i >= n - 1) return n - 1 < 0 ? 0 : n - 1;
  let j = i + 1;
  while (j < n && /\s/.test(text[j])) j++;
  if (j >= n) return n - 1;
  const onWord = isWord(text[j]);
  while (j + 1 < n && isWord(text[j + 1]) === onWord && text[j + 1] !== "\n") j++;
  return j;
}
function firstNonBlank(text, lineStart, lineEnd) {
  let j = lineStart;
  while (j < lineEnd && /[ \t]/.test(text[j])) j++;
  return j;
}

// Text object range: returns [a,b) or null. kind: "w" | quote/bracket char.
function textObjectRange(text, pos, inner, kind) {
  if (kind === "w") {
    if (pos >= text.length || /\s/.test(text[pos] || "")) return null;
    let a = pos, b = pos;
    const onW = isWord(text[pos]);
    while (a > 0 && text[a - 1] !== "\n" && isWord(text[a - 1]) === onW) a--;
    while (b < text.length && text[b] !== "\n" && isWord(text[b]) === onW) b++;
    if (!inner) while (b < text.length && /[ \t]/.test(text[b])) b++;
    return [a, b];
  }
  const pairs = {
    '"': ['"', '"'], "'": ["'", "'"], "`": ["`", "`"],
    "(": ["(", ")"], ")": ["(", ")"], "b": ["(", ")"],
    "[": ["[", "]"], "]": ["[", "]"],
    "{": ["{", "}"], "}": ["{", "}"], "B": ["{", "}"],
    "<": ["<", ">"], ">": ["<", ">"],
  };
  const pr = pairs[kind];
  if (!pr) return null;
  const [open, close] = pr;
  if (open === close) {
    const { start, end } = lineBoundsAt(text, pos);
    let a = -1;
    for (let i = pos; i >= start; i--) if (text[i] === open) { a = i; break; }
    if (a < 0) for (let i = pos + 1; i < end; i++) if (text[i] === open) { a = i; break; }
    if (a < 0) return null;
    let b = -1;
    for (let i = a + 1; i < end; i++) if (text[i] === close) { b = i; break; }
    if (b < 0) return null;
    return inner ? [a + 1, b] : [a, b + 1];
  }
  let depth = 0, a = -1;
  for (let i = pos; i >= 0; i--) {
    if (text[i] === close && i !== pos) depth++;
    else if (text[i] === open) {
      if (depth === 0) { a = i; break; }
      depth--;
    }
  }
  if (a < 0) return null;
  depth = 0;
  let b = -1;
  for (let i = a + 1; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      if (depth === 0) { b = i; break; }
      depth--;
    }
  }
  if (b < 0) return null;
  return inner ? [a + 1, b] : [a, b + 1];
}

// Cheatsheet modal — `?` in NORMAL opens, Esc / click-out closes.
function showCheatsheet() {
  document.querySelector(".excali-vim-cheat")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "excali-vim-cheat";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "3000",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.5)", cursor: "pointer",
  });
  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "var(--background-primary)",
    color: "var(--text-normal)",
    padding: "18px 22px", borderRadius: "10px",
    fontFamily: "var(--font-monospace, ui-monospace, monospace)",
    fontSize: "12px", lineHeight: "1.55",
    maxWidth: "720px", maxHeight: "82vh", overflow: "auto",
    border: "1px solid var(--background-modifier-border)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)", cursor: "default",
  });
  const sec = (title, rows) =>
    `<div style="margin-top:10px"><div style="font-weight:700;color:var(--text-accent);margin-bottom:4px">${title}</div>` +
    rows.map(([k, d]) =>
      `<div style="display:flex;gap:12px"><code style="min-width:90px;color:var(--color-orange,#e89132)">${k}</code><span style="color:var(--text-muted)">${d}</span></div>`
    ).join("") + `</div>`;
  card.innerHTML =
    `<div style="font-weight:800;font-size:14px">Vim Mode — keys</div>
     <div style="color:var(--text-muted);margin-top:2px">Esc or click outside to close</div>` +
    sec("Modes", [
      ["i a A I", "insert (at / after / line-end / first non-blank)"],
      ["o O", "open line below / above"],
      ["v V", "visual char / line"],
      ["Esc", "back to NORMAL (or commit edit)"],
    ]) +
    sec("Motions", [
      ["h j k l", "left / down / up / right"],
      ["0 $", "line start / end"],
      ["w b e", "word forward / back / end"],
      ["gg G", "buffer top / bottom"],
      ["f<ch> F<ch>", "find char forward / back"],
      ["t<ch> T<ch>", "till char forward / back"],
      ["; ,", "repeat / reverse last find"],
    ]) +
    sec("Operators", [
      ["d y c", "delete / yank / change + motion"],
      ["dd yy cc", "linewise"],
      ["D Y C", "to end-of-line"],
      ["x", "delete char"],
      ["r<ch>", "replace char"],
      ["J", "join with next line"],
      ["p P", "paste after / before"],
      ["u  Ctrl-r", "undo / redo"],
      [".", "repeat last change"],
    ]) +
    sec("Text objects (with d/y/c)", [
      ["iw aw", "inner / a word"],
      ['i" a" i\' a\' i` a`', "inside / around quotes"],
      ["i( i) ib", "inside parens  (a( for around)"],
      ["i[ i] i{ i} iB", "inside brackets / braces"],
      ["i< i>", "inside angle brackets"],
    ]) +
    sec("UI", [
      ["?", "this cheatsheet"],
      ["VIM badge", "click to toggle Vim Mode"],
    ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", esc, true);
  };
  const esc = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", esc, true);
}

// Find char in whole text (not line-scoped — Excalidraw text elements are
// usually short and caret often starts at very end of buffer, so line-scope
// makes `f` useless). dir=+1 forward, -1 back. till=true → stop one before.
function findCharOnLine(text, pos, ch, dir, till) {
  const n = text.length;
  if (dir > 0) {
    for (let i = pos + 1; i < n; i++) if (text[i] === ch) return till ? i - 1 : i;
  } else {
    for (let i = pos - 1; i >= 0;  i--) if (text[i] === ch) return till ? i + 1 : i;
  }
  return -1;
}

function attachVim(ta) {
  if (!ta || ta._vimAttached) return null;
  ta._vimAttached = true;

  const state = {
    mode: CFG.startInsert ? "insert" : "normal",
    visualAnchor: 0,
    visualLine: false,
    pendingOp: null,   // null | "d" | "y" | "c" | "g"
    pendingObj: null,  // null | "i" | "a"  (text-object prefix after operator)
    pendingFind: null, // null | {kind:"f"|"F"|"t"|"T", op:"d"|"y"|"c"|null}
    pendingR: false,   // r<ch> waiting for replacement char
    count: "",         // numeric prefix buffer
    normalEscCount: 0, // require N Escs in NORMAL before commit
  };

  // Insert-mode capture for `.` repeat
  let insertSnap   = null;  // { start, len }
  let insertReplay = null;  // fn(insertedText) — re-applies entry op

  // --- pill ---
  let pill = null;
  if (CFG.pill === "corner") {
    pill = document.createElement("div");
    pill.className = `${PILL_CLASS} mode-${state.mode}`;
    pill.textContent = labelFor(state.mode);
    document.body.appendChild(pill);
    // wheel forwarding so scroll-zoom keeps working when hovering pill
    pill.addEventListener("wheel", (e) => {
      const c = view.contentEl.querySelector("canvas.interactive");
      if (!c) return;
      e.preventDefault();
      c.dispatchEvent(new WheelEvent("wheel", {
        deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
        clientX: e.clientX, clientY: e.clientY,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
        altKey: e.altKey, metaKey: e.metaKey,
        bubbles: true, cancelable: true,
      }));
    }, { passive: false });
  }
  function labelFor(m) {
    if (m === "insert") return "-- INSERT --";
    if (m === "visual") return state.visualLine ? "-- VISUAL LINE --" : "-- VISUAL --";
    return "-- NORMAL --";
  }
  // Live suffix: count + pending op/textobj/find/r — like real vim's keystroke
  // buffer ("3", "3d", "3di", "3diw", "f", etc).
  function pillSuffix() {
    const parts = [];
    if (state.count) parts.push(state.count);
    if (state.pendingOp && state.pendingOp !== "g") parts.push(state.pendingOp);
    if (state.pendingOp === "g") parts.push("g");
    if (state.pendingObj) parts.push(state.pendingObj);
    if (state.pendingFind) parts.push(state.pendingFind.kind);
    if (state.pendingR) parts.push("r");
    return parts.length ? "  " + parts.join("") : "";
  }
  let pillFlashing = false;
  function renderPill() {
    if (!pill || pillFlashing) return;
    pill.className = `${PILL_CLASS} mode-${state.mode}`;
    pill.textContent = labelFor(state.mode) + pillSuffix();
  }
  function setMode(m) {
    state.mode = m;
    renderPill();
    if (m !== "visual") {
      // collapse selection
      const p = ta.selectionEnd;
      ta.setSelectionRange(p, p);
    }
  }
  // Briefly flash a message in the mode pill (e.g. "1 line yanked"), then
  // revert to the mode label. Matches vim's bottom-line feedback.
  let flashTimer = 0;
  function flash(msg, ms = 900) {
    if (!pill) { new ea.obsidian.Notice(msg, ms); return; }
    pillFlashing = true;
    pill.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      pillFlashing = false;
      renderPill();
    }, ms);
  }
  // Briefly highlight a range to give yank/op visual feedback. Restores
  // caret to `finalCaret` (or current caret) after the flash.
  function flashRange(a, b, finalCaret) {
    if (a == null || b == null || a >= b) return;
    const fc = (finalCaret == null) ? ta.selectionStart : finalCaret;
    try { ta.setSelectionRange(a, b); } catch (_) {}
    setTimeout(() => {
      try {
        const n = ta.value.length;
        ta.setSelectionRange(Math.min(fc, n), Math.min(fc, n));
      } catch (_) {}
    }, 250);
  }
  function countLines(s) {
    if (!s) return 0;
    const n = (s.match(/\n/g) || []).length;
    return n + (s.endsWith("\n") ? 0 : 1);
  }
  function positionPill() {
    if (!pill) return;
    const canvas = view.contentEl.querySelector("canvas.interactive");
    const cRect  = canvas ? canvas.getBoundingClientRect()
                          : { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    const r = ta.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 ||
        r.bottom < cRect.top || r.top > cRect.bottom ||
        r.right  < cRect.left || r.left > cRect.right) {
      pill.style.display = "none";
      return;
    }
    pill.style.display = "";
    let left = r.left;
    let top  = r.bottom + 4;
    if (top > cRect.bottom - 4) top = r.top - 18;
    if (left < cRect.left + 4) left = cRect.left + 4;
    pill.style.left = `${left}px`;
    pill.style.top  = `${top}px`;
  }

  // --- ops ---
  function readClip() {
    return Promise.resolve(window.__vimMode.register || "");
  }
  function writeRegister(text, linewise) {
    window.__vimMode.register = text;
    window.__vimMode.registerLinewise = !!linewise;
    if (CFG.sysclip) {
      try { navigator.clipboard?.writeText(text); } catch (_) {}
    }
  }
  function replaceRange(a, b, withText, finalCaret) {
    // Route through execCommand so the browser's undo stack records the edit.
    // ta.value = ... is faster but bypasses undo entirely (u / Ctrl-r fail).
    ta.setSelectionRange(a, b);
    let ok = false;
    try { ok = document.execCommand("insertText", false, withText); } catch (_) {}
    if (!ok) {
      // Fallback (no undo) — used if execCommand is disabled in this context.
      const before = ta.value.slice(0, a);
      const after  = ta.value.slice(b);
      ta.value = before + withText + after;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const c = (finalCaret == null) ? (a + withText.length) : finalCaret;
    ta.setSelectionRange(c, c);
  }
  function caret() { return ta.selectionStart; }
  function setCaret(i) {
    const n = ta.value.length;
    i = Math.max(0, Math.min(n, i));
    ta.setSelectionRange(i, i);
  }
  function setSel(a, b) {
    if (a > b) [a, b] = [b, a];
    ta.setSelectionRange(a, b);
  }

  // motion → returns new caret position (pure: takes text + pos + ch).
  function motionFrom(t, p, ch) {
    const { start, end } = lineBoundsAt(t, p);
    switch (ch) {
      case "h": return Math.max(start, p - 1);
      case "l": return Math.min(end, p + 1);
      case "j": return moveVertical(t, p, +1);
      case "k": return moveVertical(t, p, -1);
      case "0": return start;
      case "$": return end;
      case "w": return wordForward(t, p);
      case "b": return wordBack(t, p);
      case "e": return wordEnd(t, p);
      case "G": return t.length;
    }
    return p;
  }
  function applyMotionN(ch, n) {
    let p = caret();
    const t = ta.value;
    for (let i = 0; i < Math.max(1, n); i++) p = motionFrom(t, p, ch);
    return p;
  }

  function deleteRange(a, b, linewise) {
    if (a === b) return;
    const cut = ta.value.slice(a, b);
    writeRegister(cut, linewise);
    replaceRange(a, b, "");
  }
  function yankRange(a, b, linewise) {
    if (a === b) return;
    writeRegister(ta.value.slice(a, b), linewise);
  }
  function deleteLines(n) {
    n = Math.max(1, n);
    const t0 = ta.value;
    const { start } = lineBoundsAt(t0, caret());
    // walk forward to consume n line ends from `start`
    let b = start;
    for (let i = 0; i < n; i++) {
      const lb = lineBoundsAt(ta.value, b);
      b = lb.end;
      if (b < ta.value.length) b += 1; else break;
    }
    let a = start;
    if (b >= ta.value.length && start > 0) a = start - 1; // last-line case: eat preceding \n
    const cut = ta.value.slice(a, b);
    writeRegister(cut.endsWith("\n") ? cut : cut + "\n", true);
    replaceRange(a, b, "");
    const nb = lineBoundsAt(ta.value, Math.min(a, ta.value.length));
    setCaret(firstNonBlank(ta.value, nb.start, nb.end));
    flash(`${countLines(cut)} fewer lines`);
  }
  function yankLines(n) {
    n = Math.max(1, n);
    const t = ta.value;
    const { start } = lineBoundsAt(t, caret());
    let b = start;
    for (let i = 0; i < n; i++) {
      const lb = lineBoundsAt(t, b);
      b = lb.end;
      if (b < t.length) b += 1; else break;
    }
    let chunk = t.slice(start, b);
    if (!chunk.endsWith("\n")) chunk += "\n";
    writeRegister(chunk, true);
    flashRange(start, b, caret());
    flash(`${countLines(chunk)} line${countLines(chunk) === 1 ? "" : "s"} yanked`);
  }
  function paste(after, n) {
    const reg = window.__vimMode.register || "";
    if (!reg) { flash("register empty"); return; }
    n = Math.max(1, n);
    const linewise = window.__vimMode.registerLinewise;
    const t = ta.value;
    const p = caret();
    const payload = reg.repeat(n);
    if (linewise) {
      const { start, end } = lineBoundsAt(t, p);
      const insertAt = after ? (end < t.length ? end + 1 : t.length) : start;
      const body = after && end === t.length ? ("\n" + payload.replace(/\n$/, "")) : payload;
      replaceRange(insertAt, insertAt, body, insertAt + (body.startsWith("\n") ? 1 : 0));
    } else {
      const insertAt = after ? Math.min(t.length, p + 1) : p;
      replaceRange(insertAt, insertAt, payload, insertAt + payload.length - 1);
    }
  }
  function enterInsert(at, replay) {
    if (at != null) setCaret(at);
    insertSnap = { start: caret(), len: ta.value.length };
    insertReplay = replay || null;
    setMode("insert");
  }
  function insertTextAt(at, text) {
    if (!text) { setCaret(at); return; }
    replaceRange(at, at, text, at + text.length);
  }

  // --- key handler (capture) ---
  function onKey(e) {
    try { handleKey(e); } finally { renderPill(); }
  }
  function handleKey(e) {
    // Handle a few modifier combos in NORMAL/VISUAL (redo). Anything else
    // with modifiers passes through to Obsidian/Excalidraw shortcuts.
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (state.mode !== "insert" && (e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault(); e.stopPropagation();
        try { document.execCommand("redo"); } catch (_) {}
        return;
      }
      return;
    }

    // Skip modifier-only keystrokes — they must not consume pending state
    // (e.g. f<Shift+A> sends a Shift keydown before "A").
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" ||
        e.key === "Meta"  || e.key === "CapsLock") return;

    // Any non-Esc key in NORMAL resets the NORMAL-exit counter.
    if (state.mode === "normal" && e.key !== "Escape" && state.normalEscCount > 0) {
      state.normalEscCount = 0;
    }
    if (state.mode === "insert") {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation();
        // Capture inserted text for `.` repeat
        let insertedText = "";
        if (insertSnap) {
          const grew = ta.value.length - insertSnap.len;
          if (grew > 0) insertedText = ta.value.slice(insertSnap.start, insertSnap.start + grew);
        }
        if (insertReplay) {
          const replay = insertReplay;
          const text = insertedText;
          window.__vimMode.lastChange = () => replay(text);
        }
        insertSnap = null; insertReplay = null;
        // True-vim feel: Esc in INSERT backs caret up one column (unless at lineStart).
        const p = caret();
        const { start } = lineBoundsAt(ta.value, p);
        if (p > start) setCaret(p - 1);
        setMode("normal");
        return;
      }
      return; // pass-through typing
    }

    // NORMAL / VISUAL
    const k = e.key;

    // Esc in NORMAL → require N rapid Escs (escN) to commit the edit,
    // so users can't accidentally drop out of NORMAL with a stray Esc.
    // Then ONE more canvas Esc deselects the element. Total = N + 1.
    if (k === "Escape") {
      if (state.mode === "visual") {
        e.preventDefault(); e.stopPropagation();
        state.pendingOp = null;
        state.normalEscCount = 0;
        setMode("normal");
        return;
      }
      e.preventDefault(); e.stopPropagation();
      e.stopImmediatePropagation?.();
      state.pendingOp = null;
      state.count = "";
      // Threshold gate: stay in NORMAL until escN Escs have been pressed.
      if (CFG.escN > 1) {
        state.normalEscCount++;
        if (state.normalEscCount < CFG.escN) {
          flash(`Esc ×${CFG.escN} to exit NORMAL (${state.normalEscCount}/${CFG.escN})`, 1200);
          return;
        }
        state.normalEscCount = 0;
      }
      // Snapshot editing id BEFORE blur, then re-apply selection on a
      // ladder of timeouts — Excalidraw's blur-commit re-clears the
      // selection on its own scene-update, sometimes 100ms+ later.
      let editingId = null;
      try {
        const apiX = ea.getExcalidrawAPI();
        const st = apiX?.getAppState();
        editingId = st?.editingElement?.id || st?.editingTextElement?.id || null;
      } catch (_) {}
      try { ta.blur(); } catch (_) {}
      if (editingId) {
        const reselect = () => {
          try {
            const apiX = ea.getExcalidrawAPI();
            // Also clear editingElement / editingTextElement so the next
            // Esc Excalidraw sees goes straight to "clear selection"
            // instead of "finalize the in-progress edit" (which is what
            // ate the deselect Esc).
            apiX?.updateScene({ appState: {
              selectedElementIds: { [editingId]: true },
              editingElement: null,
              editingTextElement: null,
              newElement: null,
            } });
          } catch (_) {}
        };
        // Track ids so the canvas Esc trap can cancel them on deselect
        // — otherwise a late reselect would re-select after the user
        //   already pressed deselect-Esc.
        window.__vimReselectTimers = (window.__vimReselectTimers || []);
        [40, 120, 220, 360, 550].forEach(t => {
          window.__vimReselectTimers.push(setTimeout(reselect, t));
        });
      }
      try { window.__vimEscBump?.(); } catch (_) {}
      return;
    }

    // numeric count prefix (1-9; 0 only when count buffer non-empty,
    // otherwise 0 is the line-start motion).
    if (/^[0-9]$/.test(k) && !(k === "0" && state.count === "")) {
      e.preventDefault(); e.stopPropagation();
      state.count += k;
      return;
    }
    const cnt = state.count ? parseInt(state.count, 10) : 1;

    // pending "g" prefix
    if (state.pendingOp === "g") {
      e.preventDefault(); e.stopPropagation();
      state.pendingOp = null;
      state.count = "";
      if (k === "g") {
        const next = 0;
        if (state.mode === "visual") {
          if (state.visualLine) {
            const lo = Math.min(state.visualAnchor, next);
            const hi = Math.max(state.visualAnchor, next);
            const a = lineBoundsAt(ta.value, lo).start;
            const b = lineBoundsAt(ta.value, hi).end;
            setSel(a, b);
          } else {
            setSel(state.visualAnchor, next);
          }
        } else {
          setCaret(next);
        }
      }
      return;
    }

    // text-object completion must run BEFORE operator-pending since pendingOp
    // is kept alive while waiting for the object char.
    if (state.pendingObj) {
      e.preventDefault(); e.stopPropagation();
      const inner = state.pendingObj === "i";
      const objCh = k;
      const op = state.pendingOp;
      state.pendingObj = null;
      state.pendingOp = null;
      state.count = "";
      const doObj = () => {
        const rng = textObjectRange(ta.value, caret(), inner, objCh);
        if (!rng) return false;
        const [a, b] = rng;
        if (op === "d" || op === "c") deleteRange(a, b, false);
        else if (op === "y") { yankRange(a, b, false); flashRange(a, b, a); }
        return true;
      };
      if (op === "y") doObj();
      else if (op === "d") { if (doObj()) window.__vimMode.lastChange = doObj; }
      else if (op === "c") {
        if (doObj()) enterInsert(undefined, (t) => { doObj(); insertTextAt(caret(), t); });
      }
      return;
    }

    // find-motion completion must also run before operator-pending.
    if (state.pendingFind) {
      e.preventDefault(); e.stopPropagation();
      const { kind, op } = state.pendingFind;
      state.pendingFind = null;
      state.pendingOp = null;
      state.count = "";
      if (k.length !== 1) return;
      const dir  = (kind === "f" || kind === "t") ? +1 : -1;
      const till = (kind === "t" || kind === "T");
      window.__vimMode.lastFind = { ch: k, dir, till };
      const p = caret();
      const target = findCharOnLine(ta.value, p, k, dir, till);
      if (target < 0) { flash(`'${k}' not found`); return; }
      if (op) {
        const a = Math.min(p, dir > 0 ? target + 1 : target);
        const b = Math.max(p, dir > 0 ? target + 1 : target);
        const doFindOp = () => {
          const pp = caret();
          const tt = findCharOnLine(ta.value, pp, k, dir, till);
          if (tt < 0) return;
          const aa = Math.min(pp, dir > 0 ? tt + 1 : tt);
          const bb = Math.max(pp, dir > 0 ? tt + 1 : tt);
          if (op === "d" || op === "c") deleteRange(aa, bb, false);
          else if (op === "y") yankRange(aa, bb, false);
        };
        if (op === "y") { yankRange(a, b, false); flashRange(a, b, p); }
        else if (op === "d") { deleteRange(a, b, false); window.__vimMode.lastChange = doFindOp; }
        else if (op === "c") {
          deleteRange(a, b, false);
          enterInsert(undefined, (t) => { doFindOp(); insertTextAt(caret(), t); });
        }
      } else {
        if (state.mode === "visual") {
          if (state.visualLine) {
            const lo = Math.min(state.visualAnchor, target);
            const hi = Math.max(state.visualAnchor, target);
            const a = lineBoundsAt(ta.value, lo).start;
            const b = lineBoundsAt(ta.value, hi).end;
            setSel(a, b);
          } else setSel(state.visualAnchor, target);
        } else setCaret(target);
        flash(`'${k}'  ;=next  ,=prev`, 1100);
      }
      return;
    }

    // operator-pending in NORMAL
    if (state.mode === "normal" && state.pendingOp) {
      e.preventDefault(); e.stopPropagation();
      const op = state.pendingOp;
      const n = cnt;
      state.pendingOp = null;
      state.count = "";

      // Text-object prefix: d<i|a><obj>
      if (k === "i" || k === "a") {
        state.pendingObj = k;
        state.pendingOp = op; // keep operator alive for next key
        return;
      }
      // Find motion: d<f|F|t|T><ch>
      if (k === "f" || k === "F" || k === "t" || k === "T") {
        state.pendingFind = { kind: k, op };
        return;
      }

      if (k === op && (op === "d" || op === "y" || op === "c")) {
        // linewise: dd / yy / cc
        if (op === "d") {
          const doDD = () => deleteLines(n);
          doDD();
          window.__vimMode.lastChange = doDD;
        } else if (op === "y") {
          yankLines(n);
        } else { // cc
          const ccEntry = () => {
            const { start, end } = lineBoundsAt(ta.value, caret());
            const indent = ta.value.slice(start, end).match(/^[ \t]*/)[0];
            deleteLines(n);
            const lb = lineBoundsAt(ta.value, caret());
            replaceRange(lb.start, lb.start, indent, lb.start + indent.length);
            return indent;
          };
          ccEntry();
          enterInsert(undefined, (t) => { ccEntry(); insertTextAt(caret(), t); });
        }
        return;
      }
      // operator + motion (counted)
      const doDelMotion = () => {
        const p = caret();
        let t = p;
        for (let i = 0; i < Math.max(1, n); i++) t = motionFrom(ta.value, t, k);
        const a = Math.min(p, t), b = Math.max(p, t);
        if (a !== b) deleteRange(a, b, false);
        return b - a;
      };
      if (op === "d") {
        const len = doDelMotion();
        window.__vimMode.lastChange = doDelMotion;
        if (len) flash(`${len} chars deleted`);
      } else if (op === "y") {
        const p = caret();
        const target = applyMotionN(k, n);
        if (target !== p) {
          const a = Math.min(p, target), b = Math.max(p, target);
          yankRange(a, b, false);
          flashRange(a, b, p);
          flash(`${b - a} chars yanked`);
        }
      } else if (op === "c") {
        doDelMotion();
        enterInsert(undefined, (t) => { doDelMotion(); insertTextAt(caret(), t); });
      }
      return;
    }

    // r<ch> — replace single char (count = N chars)
    if (state.pendingR) {
      e.preventDefault(); e.stopPropagation();
      state.pendingR = false;
      if (k.length !== 1) return;
      const n = cnt;
      state.count = "";
      const ch = k;
      const doR = () => {
        const p = caret();
        const { end } = lineBoundsAt(ta.value, p);
        const b = Math.min(end, p + n);
        if (p < b) replaceRange(p, b, ch.repeat(b - p), b - 1);
      };
      doR();
      window.__vimMode.lastChange = doR;
      return;
    }

    // motions in normal/visual (with count)
    if ("hjkl0$wbeG".includes(k)) {
      e.preventDefault(); e.stopPropagation();
      const next = applyMotionN(k, cnt);
      state.count = "";
      if (state.mode === "visual") {
        if (state.visualLine) {
          const lo = Math.min(state.visualAnchor, next);
          const hi = Math.max(state.visualAnchor, next);
          const a = lineBoundsAt(ta.value, lo).start;
          const b = lineBoundsAt(ta.value, hi).end;
          setSel(a, b);
        } else {
          setSel(state.visualAnchor, next);
        }
      } else { setCaret(next); }
      return;
    }
    if (k === "g") {
      e.preventDefault(); e.stopPropagation();
      state.pendingOp = "g";
      return;
    }

    // bare find motions (no operator): f<ch>, F<ch>, t<ch>, T<ch>
    if ("fFtT".includes(k)) {
      e.preventDefault(); e.stopPropagation();
      state.pendingFind = { kind: k, op: null };
      return;
    }
    // ; / , — repeat last find (; same dir, , reverse)
    if (k === ";" || k === ",") {
      const lf = window.__vimMode.lastFind;
      if (!lf) return;
      e.preventDefault(); e.stopPropagation();
      state.count = "";
      const dir = (k === ";") ? lf.dir : -lf.dir;
      const target = findCharOnLine(ta.value, caret(), lf.ch, dir, lf.till);
      if (target < 0) { flash(`'${lf.ch}' not found`); return; }
      if (state.mode === "visual") {
        if (state.visualLine) {
          const lo = Math.min(state.visualAnchor, target);
          const hi = Math.max(state.visualAnchor, target);
          const a = lineBoundsAt(ta.value, lo).start;
          const b = lineBoundsAt(ta.value, hi).end;
          setSel(a, b);
        } else setSel(state.visualAnchor, target);
      } else setCaret(target);
      return;
    }

    // mode entries (only valid in NORMAL — VISUAL handles its own keys below)
    if (state.mode === "normal") {
      const consumeCount = () => { state.count = ""; };
      if (k === "i") { e.preventDefault(); e.stopPropagation(); consumeCount();
        enterInsert(undefined, (t) => insertTextAt(caret(), t)); return; }
      if (k === "a") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const { end } = lineBoundsAt(ta.value, caret());
        enterInsert(Math.min(end, caret() + 1), (t) => {
          const p = caret();
          const { end } = lineBoundsAt(ta.value, p);
          insertTextAt(Math.min(end, p + 1), t);
        }); return; }
      if (k === "A") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const { end } = lineBoundsAt(ta.value, caret());
        enterInsert(end, (t) => {
          const { end } = lineBoundsAt(ta.value, caret());
          insertTextAt(end, t);
        }); return; }
      if (k === "I") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const { start, end } = lineBoundsAt(ta.value, caret());
        enterInsert(firstNonBlank(ta.value, start, end), (t) => {
          const { start, end } = lineBoundsAt(ta.value, caret());
          insertTextAt(firstNonBlank(ta.value, start, end), t);
        }); return; }
      if (k === "o") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const openBelow = () => {
          const { start, end } = lineBoundsAt(ta.value, caret());
          const indent = ta.value.slice(start, end).match(/^[ \t]*/)[0];
          replaceRange(end, end, "\n" + indent, end + 1 + indent.length);
          return indent;
        };
        openBelow();
        enterInsert(undefined, (t) => { openBelow(); insertTextAt(caret(), t); });
        return; }
      if (k === "O") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const openAbove = () => {
          const { start, end } = lineBoundsAt(ta.value, caret());
          const indent = ta.value.slice(start, end).match(/^[ \t]*/)[0];
          replaceRange(start, start, indent + "\n", start + indent.length);
          return indent;
        };
        openAbove();
        enterInsert(undefined, (t) => { openAbove(); insertTextAt(caret(), t); });
        return; }
      if (k === "v") { e.preventDefault(); e.stopPropagation(); consumeCount();
        state.visualAnchor = caret();
        state.visualLine = false;
        setMode("visual");
        setSel(state.visualAnchor, Math.min(ta.value.length, state.visualAnchor + 1));
        return; }
      if (k === "V") { e.preventDefault(); e.stopPropagation(); consumeCount();
        const p = caret();
        state.visualAnchor = p;
        state.visualLine = true;
        const { start, end } = lineBoundsAt(ta.value, p);
        setMode("visual");
        setSel(start, end);
        return; }
      if (k === "x") { e.preventDefault(); e.stopPropagation();
        const n = cnt;
        const doX = () => {
          const p = caret();
          const { end } = lineBoundsAt(ta.value, p);
          const b = Math.min(end, p + n);
          if (p < b) deleteRange(p, b, false);
        };
        doX();
        window.__vimMode.lastChange = doX;
        consumeCount(); return; }
      // r<ch> — replace char
      if (k === "r") { e.preventDefault(); e.stopPropagation();
        state.pendingR = true;
        return; }
      // J — join line with next (N+1 lines if count)
      if (k === "J") { e.preventDefault(); e.stopPropagation();
        const n = cnt;
        const doJ = () => {
          for (let i = 0; i < Math.max(1, n); i++) {
            const { end } = lineBoundsAt(ta.value, caret());
            if (end >= ta.value.length) break;
            let j = end + 1;
            while (j < ta.value.length && /[ \t]/.test(ta.value[j])) j++;
            replaceRange(end, j, " ", end);
          }
        };
        doJ();
        window.__vimMode.lastChange = doJ;
        consumeCount(); return; }
      // ? — cheatsheet
      if (k === "?") { e.preventDefault(); e.stopPropagation();
        showCheatsheet(); consumeCount(); return; }
      // . — repeat last change
      if (k === ".") { e.preventDefault(); e.stopPropagation();
        const lc = window.__vimMode.lastChange;
        if (lc) { try { lc(); } catch (_) {} }
        else flash("nothing to repeat");
        consumeCount(); return; }
      if (k === "d" || k === "y" || k === "c") {
        e.preventDefault(); e.stopPropagation();
        state.pendingOp = k;
        return;
      }
      // D / Y / C — operator to end-of-line (Neovim default Y = y$)
      if (k === "D" || k === "Y" || k === "C") {
        e.preventDefault(); e.stopPropagation();
        const p = caret();
        const { end } = lineBoundsAt(ta.value, p);
        const a = p, b = end;
        if (k === "D") {
          const len = b - a;
          const doD = () => {
            const pp = caret();
            const { end: ee } = lineBoundsAt(ta.value, pp);
            if (pp < ee) deleteRange(pp, ee, false);
          };
          deleteRange(a, b, false);
          window.__vimMode.lastChange = doD;
          flash(`${len} chars deleted`);
        } else if (k === "Y") {
          yankRange(a, b, false);
          flashRange(a, b, a);
          flash(`${b - a} chars yanked`);
        } else { // C
          const delEOL = () => {
            const pp = caret();
            const { end: ee } = lineBoundsAt(ta.value, pp);
            if (pp < ee) deleteRange(pp, ee, false);
          };
          deleteRange(a, b, false);
          enterInsert(undefined, (t) => { delEOL(); insertTextAt(caret(), t); });
        }
        consumeCount();
        return;
      }
      if (k === "p") { e.preventDefault(); e.stopPropagation();
        const n = cnt; const doP = () => paste(true,  n);
        doP(); window.__vimMode.lastChange = doP; consumeCount(); return; }
      if (k === "P") { e.preventDefault(); e.stopPropagation();
        const n = cnt; const doP = () => paste(false, n);
        doP(); window.__vimMode.lastChange = doP; consumeCount(); return; }
      if (k === "u") {
        e.preventDefault(); e.stopPropagation();
        for (let i = 0; i < cnt; i++) {
          try { document.execCommand("undo"); } catch (_) {}
        }
        consumeCount();
        return;
      }
      // unknown key in NORMAL → swallow so it doesn't type into the textarea
      if (k.length === 1) { e.preventDefault(); e.stopPropagation(); consumeCount(); return; }
      return;
    }

    // VISUAL ops
    if (state.mode === "visual") {
      const isLine = state.visualLine;
      // For linewise: include trailing newline so whole-line ops work.
      const rangeForOp = () => {
        let a = ta.selectionStart, b = ta.selectionEnd;
        if (isLine && b < ta.value.length && ta.value[b] === "\n") b += 1;
        return [a, b];
      };
      if (k === "d" || k === "x" || k === "D" || k === "X") {
        e.preventDefault(); e.stopPropagation();
        const [a, b] = rangeForOp();
        const len = b - a;
        deleteRange(a, b, isLine);
        setMode("normal");
        flash(isLine ? `${len} chars deleted (linewise)` : `${len} chars deleted`);
        return;
      }
      if (k === "y" || k === "Y") {
        e.preventDefault(); e.stopPropagation();
        const [a, b] = rangeForOp();
        const len = b - a;
        yankRange(a, b, isLine);
        setMode("normal");
        flashRange(a, b, a);
        flash(isLine ? `${len} chars yanked (linewise)` : `${len} chars yanked`);
        return;
      }
      if (k === "c" || k === "C") {
        e.preventDefault(); e.stopPropagation();
        const [a, b] = rangeForOp();
        deleteRange(a, b, isLine);
        enterInsert();
        return;
      }
      if (k.length === 1) { e.preventDefault(); e.stopPropagation(); return; }
      return;
    }
  }

  ta.addEventListener("keydown", onKey, true);

  // Excalidraw places caret at end-of-text on focus. In NORMAL the caret is
  // ON a char (not past it) — clamp so f<ch>/x/etc. can find anything forward.
  if (state.mode === "normal") {
    const n = ta.value.length;
    if (n > 0 && ta.selectionStart >= n) {
      ta.setSelectionRange(n - 1, n - 1);
    }
  }

  // ResizeObserver + reposition hooks for the pill
  const ro = (typeof ResizeObserver === "function") ? new ResizeObserver(positionPill) : null;
  if (ro) ro.observe(ta);
  const onScroll = () => positionPill();
  ta.addEventListener("input", positionPill);
  window.addEventListener("scroll", onScroll, true);
  positionPill();

  const api = ea.getExcalidrawAPI();
  const unsubScroll = api?.onScrollChange?.(positionPill);

  // Subscribe to shared pill-tick scheduler so the mode pill follows the
  // textarea during canvas pan/zoom even when ResizeObserver doesn't fire.
  const PILL_TICK_KEY = "__excaliPillTick_" + (view.leaf?.id || "default");
  const sched = window[PILL_TICK_KEY];
  if (sched?.subs?.add) sched.subs.add(positionPill);

  return {
    ta,
    detach() {
      try { ta.removeEventListener("keydown", onKey, true); } catch (_) {}
      try { ta.removeEventListener("input", positionPill); } catch (_) {}
      try { window.removeEventListener("scroll", onScroll, true); } catch (_) {}
      try { ro?.disconnect(); } catch (_) {}
      try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
      try { sched?.subs?.delete?.(positionPill); } catch (_) {}
      try { pill?.remove(); } catch (_) {}
      ta._vimAttached = false;
    },
  };
}

// ---------- watch view.contentEl for textarea inserts ----------
let active = null;  // { ta, detach }

function maybeAttach(node) {
  if (active) return;
  if (!(node instanceof HTMLElement)) return;
  const ta = node.matches?.("textarea") ? node : node.querySelector?.("textarea");
  if (!ta) return;
  // skip our own / settings textareas — only attach to ones inside excalidraw editor
  if (!ta.closest(".excalidraw") && !ta.closest(".excalidraw-textEditorContainer")) return;
  if (ta._vimAttached) return;
  active = attachVim(ta);
}

function maybeDetach(node) {
  if (!active) return;
  if (!(node instanceof HTMLElement)) return;
  if (node === active.ta || node.contains?.(active.ta) || !document.body.contains(active.ta)) {
    try { active.detach(); } catch (_) {}
    active = null;
  }
}

const mo = new MutationObserver((muts) => {
  for (const m of muts) {
    m.addedNodes.forEach(maybeAttach);
    m.removedNodes.forEach(maybeDetach);
  }
  // Safety: if our textarea got yanked silently, drop the install.
  if (active && !document.body.contains(active.ta)) {
    try { active.detach(); } catch (_) {}
    active = null;
  }
});
mo.observe(view.contentEl, { childList: true, subtree: true });

// Pick up any textarea already mounted at install time.
view.contentEl.querySelectorAll("textarea").forEach(maybeAttach);

// ---------- global "VIM" badge (bottom-center of canvas) ----------
if (CFG.badge) installGlobalBadge(true);

// ---------- Esc-debounce: require N rapid Escs to deselect on canvas ----------
let escCount = 0, escTimer = 0;
let hintEl = null, hintTimer = 0;
// Bridge so the textarea NORMAL-Esc handler can pre-bump the counter.
// No timeout: the bump persists until the next Esc consumes it. Otherwise
// users who pause between "commit" and "deselect" hit the window expiring
// and end up pressing Esc one extra time.
// Bump = pre-fill canvas counter to escN-1, so ONE canvas Esc after
// the NORMAL commit reaches threshold and deselects. Combined with the
// "escN Escs to leave NORMAL" rule, total presses from NORMAL = escN + 1.
window.__vimEscBump = () => {
  if (CFG.escN <= 1) return;
  escCount = Math.max(escCount, CFG.escN - 1);
  clearTimeout(escTimer);
};
// NOTE: previously a mousedown/pointerdown reset wiped escCount on user
// clicks, but Excalidraw also fires a synthetic pointerdown on the canvas
// right after blur-commit, which wiped the bump before Esc#2 could
// consume it. Removed.
function showHint(text) {
  if (!hintEl) {
    hintEl = document.createElement("div");
    hintEl.className = HINT_CLASS;
    document.body.appendChild(hintEl);
  }
  hintEl.textContent = text;
  const canvas = view.contentEl.querySelector("canvas.interactive");
  const r = canvas?.getBoundingClientRect();
  if (r) {
    hintEl.style.left = `${r.left + r.width / 2 - hintEl.offsetWidth / 2}px`;
    hintEl.style.top  = `${r.top + 12}px`;
  }
  hintEl.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hintEl?.classList.remove("show"), 700);
}
function escTrap(e) {
  if (e.key !== "Escape") return;
  if (CFG.escN <= 1) return;
  if (app.workspace.activeLeaf?.view !== view) return;
  if (!view.contentEl?.isConnected) return;
  if (active && document.activeElement === active.ta) return;
  let hasSel = false;
  try {
    const st = ea.getExcalidrawAPI()?.getAppState();
    hasSel = st && Object.keys(st.selectedElementIds || {}).length > 0;
  } catch (_) {}
  if (!hasSel && escCount === 0) return;
  escCount++;
  if (escCount < CFG.escN) {
    e.preventDefault(); e.stopPropagation();
    showHint(`Esc ×${CFG.escN} to deselect (${escCount}/${CFG.escN})`);
    // No decay — counter persists until threshold reached or pointer
    // input resets it. Otherwise users pausing between Escs hit the
    // window expiring and end up pressing far more than escN times.
    return;
  }
  // Deselect ourselves via updateScene — Excalidraw's own Esc handler
  // sometimes re-opens edit on the just-committed text element.
  e.preventDefault(); e.stopPropagation();
  escCount = 0;
  clearTimeout(escTimer);
  try {
    (window.__vimReselectTimers || []).forEach(id => clearTimeout(id));
    window.__vimReselectTimers = [];
  } catch (_) {}
  try {
    ea.getExcalidrawAPI()?.updateScene({ appState: {
      selectedElementIds: {},
      editingElement: null,
      editingTextElement: null,
      newElement: null,
    } });
  } catch (_) {}
}
// Listen at document capture so we fire before Excalidraw's own Esc handler.
document.addEventListener("keydown", escTrap, true);

view._vimMode = {
  cleanup: () => {
    try { mo.disconnect(); } catch (_) {}
    try { active?.detach(); } catch (_) {}
    try { document.removeEventListener("keydown", escTrap, true); } catch (_) {}
    try { delete window.__vimEscBump; } catch (_) {}
    try { clearTimeout(escTimer); clearTimeout(hintTimer); } catch (_) {}
    try { hintEl?.remove(); } catch (_) {}
    removeGlobalBadge();
    active = null;
    view._vimMode = null;
  },
};
/*
```
*/
