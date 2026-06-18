---
excalidraw-plugin: parsed
---

/*
Collaboration Frame — compact session switcher.

UX:
  - A tiny floating bar shows numbered badges, one per collab session:
      [Main] [1] [2] [3] [+] [⚙]
  - Click [Main]  → opens the home Excalidraw note + restores sidebars.
  - Click a [n]   → opens that session's dedicated .excalidraw.md and
                    collapses the Obsidian sidebars so the canvas fills
                    the whole app ("Full Excalidraw page").
  - Click [+]     → creates a new Live Room session (generates room +
                    encryption key, creates a dedicated note in
                    Collab/ containing one full-canvas embeddable,
                    persists to vault-root collab-sessions.json,
                    copies the room link).
  - Click [⚙]     → options modal: pick / clear Home, rename + delete
                    sessions, copy links, change default embed size,
                    toggle "auto full-screen on open".

Vault Share is gone. Live Room only.

Re-running the script toggles the bar (show/hide). State persists
across runs via window.__collabFrameState + the vault JSON.

```javascript
*/

const BAR_ID    = "collab-frame-bar";
const STYLE_ID  = "collab-frame-style";
const MODAL_ID  = "collab-frame-modal";
const KEY       = "Collab frame config";
const STORE_PATH = "collab-sessions.json";
const SESSION_FOLDER = "Collab";

const DEFAULTS = {
  homeFile: "",
  embedW: 4000,
  embedH: 2500,
  // How a session pill click opens the room:
  //   "tab"    — webviewer in a new tab in this window (default).
  //              Sidebars collapse if autoFull is on.
  //   "popout" — webviewer in its own native Obsidian window.
  //              No sidebars, full window = the room.
  //   "note"   — open the dedicated .excalidraw.md note that
  //              embeds the room. Vault scripts (Pen Styles,
  //              Mask, Paper Mode...) RUN on the host note;
  //              the room itself is still inside an iframe.
  //   "browser"— OS default browser.
  openMode: "tab",
  autoFull: true,
  barLeft: null,
  barTop:  null,
  modalLeft: null,
  modalTop:  null
};

const view = ea.targetView;
if (!view) { new Notice("Collab Frame: no Excalidraw view — switch to a .excalidraw.md note and re-run", 5000); return; }
const file = view.file;
const api  = ea.getExcalidrawAPI();
if (!api)  { new Notice("Collab Frame: Excalidraw API unavailable", 5000); return; }

// Remove stale About entry from earlier versions.
{
  const _s = ea.getScriptSettings() || {};
  if (_s["About"]) { delete _s["About"]; ea.setScriptSettings(_s); }
}

// ---------- cfg + cache ----------
let state = window.__collabFrameState;
if (!state) {
  const settings = ea.getScriptSettings() || {};
  if (!settings[KEY]) {
    settings[KEY] = { value: { ...DEFAULTS } };
    await ea.setScriptSettings(settings);
  }
  state = {
    settings,
    cfg: { ...DEFAULTS, ...settings[KEY].value },
    dirty: false,
    persistTimer: null
  };
  window.__collabFrameState = state;
}
const cfg = state.cfg;

// Auto-capture Home on first run so the [Main] button works out of
// the box. User can change it via ⚙ → Use current.
if (!cfg.homeFile && file?.path) {
  cfg.homeFile = file.path;
  state.dirty = true;
}

function persistCfgSoon() {
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(async () => {
    if (state.dirty) {
      state.settings[KEY].value = { ...cfg };
      await ea.setScriptSettings(state.settings);
      state.dirty = false;
    }
  }, 400);
}

// ---------- vault store: sessions list ----------
async function readStore() {
  const f = app.vault.getAbstractFileByPath(STORE_PATH);
  if (!f) return { sessions: [] };
  try {
    const txt = await app.vault.read(f);
    const obj = JSON.parse(txt);
    if (!Array.isArray(obj.sessions)) obj.sessions = [];
    return obj;
  } catch (e) { return { sessions: [] }; }
}
async function writeStore(store) {
  const data = JSON.stringify(store, null, 2);
  const f = app.vault.getAbstractFileByPath(STORE_PATH);
  if (f) await app.vault.modify(f, data);
  else   await app.vault.create(STORE_PATH, data);
}

// ---------- room helpers ----------
async function genRoomKey() {
  const room = Array.from(window.crypto.getRandomValues(new Uint8Array(10)))
    .map(b => ("0" + b.toString(16)).slice(-2)).join("");
  const jwk = await window.crypto.subtle.exportKey(
    "jwk",
    await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 128 }, true, ["encrypt", "decrypt"]
    )
  );
  return { room, key: jwk.k };
}
function buildLink(room, key) {
  return `https://excalidraw.com/#room=${room},${key}`;
}

// ---------- session file (dedicated .excalidraw.md, one full-canvas embed) ----------
async function ensureFolder(p) {
  if (!app.vault.getAbstractFileByPath(p)) {
    try { await app.vault.createFolder(p); } catch (_) {}
  }
}
function safeName(s) {
  return String(s || "Session").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60).trim() || "Session";
}
async function createSessionFile(label, link) {
  // Write the .excalidraw.md directly rather than ea.create() —
  // ea.create has been throwing "Cannot read properties of null
  // (reading 'settings')" on this user's build. The plugin only
  // needs a parsed frontmatter + a JSON block under `# Drawing`
  // to recognise the file as a scene.
  await ensureFolder(SESSION_FOLDER);
  const safe = safeName(label);
  let path = `${SESSION_FOLDER}/${safe}.excalidraw.md`;
  let n = 1;
  while (app.vault.getAbstractFileByPath(path)) {
    path = `${SESSION_FOLDER}/${safe} ${++n}.excalidraw.md`;
  }
  const id = "emb_" + Math.random().toString(36).slice(2, 10);
  const elements = [{
    id, type: "embeddable",
    x: 0, y: 0, width: cfg.embedW, height: cfg.embedH,
    angle: 0,
    strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 1, strokeStyle: "solid",
    roughness: 0, opacity: 100,
    groupIds: [], frameId: null, roundness: null,
    seed: Math.floor(Math.random() * 0x7fffffff),
    version: 1,
    versionNonce: Math.floor(Math.random() * 0x7fffffff),
    isDeleted: false, boundElements: null,
    updated: Date.now(), link, locked: false,
    customData: { collabSession: true }
  }];
  const drawing = {
    type: "excalidraw", version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
    files: {}
  };
  const body =
`---
excalidraw-plugin: parsed
tags: [excalidraw]
---

==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==


# Text Elements
%%
# Drawing
\`\`\`json
${JSON.stringify(drawing, null, 2)}
\`\`\`
%%
`;
  await app.vault.create(path, body);
  return path;
}

// ---------- full-screen helpers ----------
function enterFull() {
  try { app.workspace.leftSplit?.collapse?.(); } catch (_) {}
  try { app.workspace.rightSplit?.collapse?.(); } catch (_) {}
}
function exitFull() {
  try { app.workspace.leftSplit?.expand?.(); } catch (_) {}
  try { app.workspace.rightSplit?.expand?.(); } catch (_) {}
}

async function openFile(path) {
  const f = app.vault.getAbstractFileByPath(path);
  if (!f) { new Notice(`File missing: ${path}`, 4000); return false; }
  await app.workspace.getLeaf(false).openFile(f);
  return true;
}
// ----- room launch primitives -----
// Default behavior: every pill click reuses the CURRENT tab via
// openFile(path) so Main / 1 / 2 / 3 work like browser tab switches.
// "Open as live webview" is exposed only as an explicit per-session
// icon button in the options modal for the times the user wants the
// pure cross-origin room view.
// Per-session leaf cache so each room behaves like its own browser
// tab: clicking the pill reveals the existing webviewer leaf instead
// of rebuilding the iframe (which thrashed scroll/zoom and sometimes
// silently no-op'd when the active leaf was already a webviewer).
if (!window.__collabFrameLeaves) window.__collabFrameLeaves = new Map();
const leafCache = window.__collabFrameLeaves;

function leafIsAlive(leaf) {
  if (!leaf || !leaf.view) return false;
  try {
    return !!app.workspace.getLeafById?.(leaf.id) ||
           !!leaf.parent; // fall back: still has a parent splitter
  } catch (_) { return false; }
}

async function openWebviewerForSession(s) {
  const wv = app.internalPlugins?.plugins?.webviewer;
  if (!wv?.enabled) {
    new Notice("Enable Settings → Core plugins → Web viewer first.", 5000);
    return openBrowser(buildLink(s.room, s.key));
  }
  const link = buildLink(s.room, s.key);
  let leaf = leafCache.get(s.id);
  if (leafIsAlive(leaf)) {
    // Just bring it forward — preserves iframe state.
    app.workspace.setActiveLeaf(leaf, { focus: true });
    try { app.workspace.revealLeaf(leaf); } catch (_) {}
    return true;
  }
  // First click for this session — build a tab next to the current one.
  try {
    leaf = app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: "webviewer", active: true, state: { url: link, navigate: true } });
    leafCache.set(s.id, leaf);
    return true;
  } catch (_) {
    return openBrowser(link);
  }
}

async function openWebviewerTab(link) {
  const wv = app.internalPlugins?.plugins?.webviewer;
  if (!wv?.enabled) {
    new Notice("Enable Settings → Core plugins → Web viewer first.", 5000);
    return openBrowser(link);
  }
  try {
    const leaf = app.workspace.getLeaf(false);
    await leaf.setViewState({ type: "webviewer", active: true, state: { url: link, navigate: true } });
    return true;
  } catch (_) {
    return openBrowser(link);
  }
}
async function openWebviewerPopout(link) {
  const wv = app.internalPlugins?.plugins?.webviewer;
  if (!wv?.enabled) {
    new Notice("Enable Settings → Core plugins → Web viewer first.", 5000);
    return openBrowser(link);
  }
  try {
    const popout = app.workspace.openPopoutLeaf?.({ size: { width: 1500, height: 950 } });
    if (popout && typeof popout.setViewState === "function") {
      await popout.setViewState({ type: "webviewer", active: true, state: { url: link, navigate: true } });
      return true;
    }
  } catch (_) {}
  return openWebviewerTab(link);
}
function openBrowser(link) {
  try {
    const req = (typeof window.require === "function") ? window.require : null;
    const shell = req?.("electron")?.shell;
    if (shell?.openExternal) { shell.openExternal(link); return true; }
  } catch (_) {}
  const w = window.open(link, "_blank", "width=1500,height=950");
  if (!w) {
    try { window.navigator.clipboard.writeText(link); } catch (_) {}
    new Notice("Couldn't open the room. Link copied — paste in a browser.", 6000);
  }
  return !!w;
}

// Default pill click → swap the current pane into a webviewer
// loading the excalidraw.com room. Pure live session in the active
// tab. Alternate paths (embed note for scripts, OS browser, popout
// window) live as explicit per-session buttons in the modal.
async function openSession(s) {
  return openWebviewerForSession(s);
}
async function openSessionAsNote(s) {
  await openFile(s.filePath);
}
async function goHome() {
  // Don't auto-toggle the sidebars when going home — user expects
  // their normal vault layout, not a forced expand/collapse.
  if (!cfg.homeFile) { new Notice("No Home set. Open ⚙ → Use current.", 3000); return; }
  // Reveal the existing leaf hosting the home file if there is one,
  // otherwise open it in a new tab. Avoids tab churn / state loss.
  const homeFile = app.vault.getAbstractFileByPath(cfg.homeFile);
  if (!homeFile) { new Notice(`File missing: ${cfg.homeFile}`, 4000); return; }
  let existing = null;
  app.workspace.iterateAllLeaves((lf) => {
    if (!existing && lf.view?.file?.path === cfg.homeFile) existing = lf;
  });
  if (existing) {
    app.workspace.setActiveLeaf(existing, { focus: true });
    try { app.workspace.revealLeaf(existing); } catch (_) {}
    return;
  }
  await app.workspace.getLeaf("tab").openFile(homeFile);
}

// ---------- helpers: remove collab embeds from Home scene ----------
// Strip embed elements tagged with a given session id (or all collab
// embeds if `sid` is null). Acts on whichever Home leaf is currently
// open; if Home isn't loaded, the next tile-rebuild will reconcile.
function removeCollabEmbeds(sid) {
  let target = null;
  app.workspace.iterateAllLeaves((lf) => {
    if (!target && lf.view?.file?.path === cfg.homeFile &&
        lf.view?.getViewType?.() === "excalidraw") target = lf.view;
  });
  if (!target?.excalidrawAPI) return false;
  const api = target.excalidrawAPI;
  const next = (api.getSceneElements() || []).filter(e => {
    if (e.isDeleted) return false;
    if (!e.customData?.collabSessionId) return true;
    if (sid === null) return false;            // remove all collab embeds
    return e.customData.collabSessionId !== sid;
  });
  api.updateScene({ elements: next, commitToHistory: true });
  return true;
}

// Double-click-to-confirm button helper. First click sets the
// "armed" look (red, "Confirm?"); second click within 2 s fires the
// action. Idle resets after 2 s.
function armDoubleClickButton(btn, normalHTML, normalTitle, action) {
  let armed = false; let timer = null;
  const reset = () => {
    armed = false;
    btn.classList.remove("cf-armed");
    btn.innerHTML = normalHTML;
    btn.title = normalTitle;
    if (timer) { clearTimeout(timer); timer = null; }
  };
  btn.innerHTML = normalHTML;
  btn.title = normalTitle;
  btn.onclick = (e) => {
    e.stopPropagation();
    if (!armed) {
      armed = true;
      btn.classList.add("cf-armed");
      btn.title = "Click again to confirm";
      timer = setTimeout(reset, 2000);
      return;
    }
    reset();
    action();
  };
}

// ---------- embed overlay buttons (jump to tab) ----------
// Excalidraw's built-in embed chrome only ships globe/fit/cog. To
// give tiled sessions a one-click "switch to its Obsidian tab"
// action we paint a small HTML button at the top-right corner of
// each collab embed and track it across scroll/zoom.
const OVERLAY_CLASS = "cf-embed-overlay";

function teardownOverlays() {
  document.querySelectorAll(".cf-embed-overlay-host").forEach(el => el.remove());
  document.querySelectorAll("." + OVERLAY_CLASS).forEach(el => el.remove());
  document.querySelectorAll(".cf-embed-label").forEach(el => el.remove());
  if (window.__collabFrameOverlayUnsub) {
    try { window.__collabFrameOverlayUnsub(); } catch (_) {}
    window.__collabFrameOverlayUnsub = null;
  }
}

function paintOverlay(view, api, container) {
  // Bail if view torn down (interval may still fire after leaf swap).
  if (!view || !view.contentEl || !api?.getSceneElements) { teardownOverlays(); return; }
  const sceneEls = (api.getSceneElements() || []).filter(
    e => !e.isDeleted && e.customData?.collabSessionId
  );
  const wanted = new Map();
  for (const el of sceneEls) wanted.set(el.customData.collabSessionId, el);

  // Drop buttons/labels whose session is gone.
  container.querySelectorAll("." + OVERLAY_CLASS).forEach(btn => {
    if (!wanted.has(btn.dataset.sid)) btn.remove();
  });
  container.querySelectorAll(".cf-embed-label").forEach(lab => {
    if (!wanted.has(lab.dataset.sid)) lab.remove();
  });

  const sessions = window.__collabSessions || [];

  const st = api.getAppState();
  const z = st.zoom?.value || 1;
  const sx = st.scrollX, sy = st.scrollY;
  const canvas = view.contentEl.querySelector(".excalidraw__canvas.static") || view.contentEl;
  const cRect = canvas.getBoundingClientRect();
  // host is position:fixed inset:0 → coords are viewport coords; no offset.
  const hostRect = { left: 0, top: 0 };

  for (const [sid, el] of wanted) {
    // ---- Jump-to-tab button (top-right) ----
    let btn = container.querySelector(`.${OVERLAY_CLASS}[data-sid="${sid}"]`);
    if (!btn) {
      btn = document.createElement("button");
      btn.className = OVERLAY_CLASS;
      btn.dataset.sid = sid;
      btn.title = "Switch to this session's Obsidian tab";
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>`;
      btn.onclick = async (e) => {
        e.stopPropagation();
        const store = await readStore();
        const s = store.sessions.find(x => x.id === sid);
        if (s) openSession(s);
      };
      container.appendChild(btn);
    }
    // Excalidraw projects scene→canvas as (sceneX + scrollX) * zoom.
    const xL = (el.x              + sx) * z + cRect.left;
    const yT = (el.y              + sy) * z + cRect.top;
    const xR = (el.x + el.width   + sx) * z + cRect.left;
    const yB = (el.y + el.height  + sy) * z + cRect.top;
    const midX = (xL + xR) / 2;
    const midY = (yT + yB) / 2;
    const scrW = xR - xL;
    const scrH = yB - yT;

    // ---- "Session N" label ABOVE the embed ----
    let lab = container.querySelector(`.cf-embed-label[data-sid="${sid}"]`);
    if (!lab) {
      lab = document.createElement("div");
      lab.className = "cf-embed-label";
      lab.dataset.sid = sid;
      container.appendChild(lab);
    }
    const idx = sessions.findIndex(s => s.id === sid);
    const sessionMeta = sessions[idx];
    const display = idx >= 0 ? `Session ${idx + 1}` : "Session";
    lab.textContent = sessionMeta?.label
      ? `${display} · ${sessionMeta.label}`
      : display;

    const tooSmall = scrW < 60 || scrH < 60;
    if (tooSmall) {
      lab.style.display = "none";
      btn.style.display = "none";
      continue;
    }
    lab.style.display = "";
    btn.style.display = "";

    // Scale font with zoom so the label stays proportional to the
    // tile (constant CSS px looked huge at low zoom).
    const fs = Math.max(9, Math.min(18, 14 * z));
    lab.style.fontSize = `${fs}px`;
    lab.style.padding  = `${Math.round(fs * 0.35)}px ${Math.round(fs * 0.85)}px`;
    lab.style.borderRadius = `${Math.round(fs * 0.55)}px`;
    // Force a layout pass so offsetWidth/Height reflect the new size.
    void lab.offsetWidth;
    const lh = lab.offsetHeight || 28;
    const lw = lab.offsetWidth || 100;

    const GAP = Math.round(fs * 0.45);
    const BTN = lh;                     // match label height
    const ICO = Math.round(BTN * 0.6);
    const groupW = lw + GAP + BTN;

    // Center the label+button group above the embed.
    const labTop  = yT - lh - 6;
    const labLeft = midX - groupW / 2;
    lab.style.left = `${labLeft}px`;
    lab.style.top  = `${labTop}px`;

    btn.style.width  = `${BTN}px`;
    btn.style.height = `${BTN}px`;
    btn.style.left   = `${labLeft + lw + GAP}px`;
    btn.style.top    = `${labTop}px`;
    const svg = btn.querySelector("svg");
    if (svg) { svg.style.width = `${ICO}px`; svg.style.height = `${ICO}px`; }
  }
}

function ensureEmbedOverlays() {
  // Only active on the Home view; tear down otherwise.
  const leaf = app.workspace.activeLeaf;
  const view = leaf?.view;
  const isExcali = view?.getViewType?.() === "excalidraw";
  const isHome = isExcali && view.file?.path === cfg.homeFile;
  if (!isHome) { teardownOverlays(); return; }
  const api = view.excalidrawAPI;
  if (!api) { teardownOverlays(); return; }

  // Overlay host lives directly in document.body to dodge any
  // contentEl overflow/clipping the plugin might add. Position fixed
  // so coords map straight to viewport.
  let host = document.querySelector(".cf-embed-overlay-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "cf-embed-overlay-host";
    host.style.cssText =
      "position:fixed; inset:0; pointer-events:none; z-index:1400;";
    document.body.appendChild(host);
  }

  // Wire scroll/zoom + scene-change repaints once per view.
  if (!view._collabOverlayWired) {
    const repaint = () => paintOverlay(view, api, host);
    const unsubScroll = api.onScrollChange?.(repaint);
    // Re-paint on resize too (host inset:0 follows, but element pos depends on canvas rect).
    const ro = (typeof ResizeObserver === "function") ? new ResizeObserver(repaint) : null;
    if (ro) ro.observe(view.contentEl);
    // Periodic safety repaint (scene mutations w/o scroll callback).
    const poll = setInterval(repaint, 1200);
    view._collabOverlayWired = true;
    window.__collabFrameOverlayUnsub = () => {
      try { unsubScroll?.(); } catch (_) {}
      try { ro?.disconnect(); } catch (_) {}
      clearInterval(poll);
      view._collabOverlayWired = false;
    };
  }
  paintOverlay(view, api, host);
}

// ---------- multi-session grid view on Home ----------
// Layout N sessions in a near-square grid.  cols = ceil(sqrt(N)).
function gridSpec(n) {
  if (n <= 0) return { cols: 0, rows: 0 };
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

async function waitForExcalidrawApi(leaf, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const v = leaf?.view;
    if (v && v.getViewType?.() === "excalidraw" && typeof v.excalidrawAPI === "object" && v.excalidrawAPI) {
      return v.excalidrawAPI;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

async function viewAllSessions() {
  const store = await readStore();
  if (!store.sessions.length) { new Notice("No sessions yet.", 2500); return; }
  if (!cfg.homeFile) { new Notice("Set a Home note first (⚙ → Use current).", 3000); return; }
  const homeFile = app.vault.getAbstractFileByPath(cfg.homeFile);
  if (!homeFile) { new Notice(`Home file missing: ${cfg.homeFile}`, 4000); return; }

  // Reveal or open the home leaf.
  let leaf = null;
  app.workspace.iterateAllLeaves((lf) => {
    if (!leaf && lf.view?.file?.path === cfg.homeFile) leaf = lf;
  });
  if (leaf) {
    app.workspace.setActiveLeaf(leaf, { focus: true });
    try { app.workspace.revealLeaf(leaf); } catch (_) {}
  } else {
    leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(homeFile);
  }

  const homeApi = await waitForExcalidrawApi(leaf);
  if (!homeApi) { new Notice("Excalidraw view did not load.", 4000); return; }

  // Idempotency: if every session already has a live embed on the
  // home scene, just zoom-to-fit. No rebuild, no history churn.
  const sceneEls = (homeApi.getSceneElements() || []).filter(e => !e.isDeleted);
  const existingCollab = sceneEls.filter(e => e.customData?.collabSessionId);
  const haveAll = store.sessions.every(s =>
    existingCollab.some(e => e.customData.collabSessionId === s.id)
  );
  const sameCount = existingCollab.length === store.sessions.length;
  if (haveAll && sameCount) {
    try { homeApi.zoomToFit(existingCollab, 80); } catch (_) {}
    new Notice(`Fit ${store.sessions.length} session${store.sessions.length === 1 ? "" : "s"}.`, 1800);
    return;
  }

  // Otherwise remove prior collab embeds and rebuild fresh.
  const kept = sceneEls.filter(e => !e.customData?.collabSessionId);
  homeApi.updateScene({ elements: kept, commitToHistory: false });

  // Anchor the grid in a clear area: directly below the user's
  // existing content so embeds don't smother prior drawings.
  let anchorX = 0, anchorY = 0;
  if (kept.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of kept) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width  || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }
    anchorX = (minX + maxX) / 2;   // centered on existing content
    anchorY = maxY + 200;          // below it with a margin
  }

  // Use ExcalidrawAutomate helpers — they build elements with the
  // exact schema (fractional index, boundElements: [], …) the renderer
  // expects. Hand-rolled embeddables tripped a TypeError in
  // renderEmbeddables on Array.map / undefined[0].
  try { await ea.setView(leaf.view); } catch (_) {}
  ea.reset?.(); ea.clear?.();

  const n = store.sessions.length;
  const { cols, rows } = gridSpec(n);
  const W = Math.max(800, Math.round(cfg.embedW / 2));
  const H = Math.max(600, Math.round(cfg.embedH / 2));
  const GAP = Math.round(Math.min(W, H) * 0.08);
  const totalW = cols * W + (cols - 1) * GAP;
  const startX = anchorX - totalW / 2;
  const startY = anchorY;

  const newIds = [];
  for (let i = 0; i < store.sessions.length; i++) {
    const s = store.sessions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (W + GAP);
    const y = startY + row * (H + GAP);
    let id;
    try {
      id = ea.addEmbeddable(x, y, W, H, buildLink(s.room, s.key));
    } catch (e) {
      console.error("[Collab] addEmbeddable failed", e);
      new Notice(`Tile failed: ${e.message || e}`, 5000);
      return;
    }
    const el = ea.getElement?.(id);
    if (el) el.customData = { collabSessionId: s.id, collabSessionLabel: s.label };
    newIds.push(id);
  }

  // addElementsToView(repos, save, newOnTop) — false repositions = use raw coords.
  try {
    await ea.addElementsToView(false, true, false);
  } catch (e) {
    console.error("[Collab] addElementsToView failed", e);
    new Notice(`Tile failed: ${e.message || e}`, 5000);
    return;
  }

  // Zoom to the freshly added embeds.
  const after = homeApi.getSceneElements() || [];
  const fresh = after.filter(e => newIds.includes(e.id));
  try { homeApi.zoomToFit(fresh, 80); } catch (_) {}
  new Notice(`Tiled ${n} session${n === 1 ? "" : "s"} on Home.`, 2500);
}

// ---------- styles ----------
// Always re-inject — stale CSS from older script versions can stick
// around and mask new look.
document.getElementById(STYLE_ID)?.remove();
{
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_ID;
  styleTag.textContent = `
    /* Excalidraw-native palette — applied via body[class] so the bar
       matches the canvas chrome, not the Obsidian theme. */
    body.theme-light, body:not(.theme-dark) {
      --cf-bg:      #ffffff;
      --cf-bg-2:    #f1f0ff;
      --cf-panel:   #ffffff;
      --cf-border:  #e9ecf2;
      --cf-text:    #1b1b1f;
      --cf-muted:   #6b6b78;
      --cf-accent:  #6965db;
      --cf-accent-2:#5b57c2;
      --cf-accent-soft: #ece9ff;
      --cf-shadow:  0 6px 18px rgba(70,70,140,0.14);
    }
    body.theme-dark {
      --cf-bg:      #232329;
      --cf-bg-2:    #2b2b34;
      --cf-panel:   #1e1e24;
      --cf-border:  #393942;
      --cf-text:    #e3e3e8;
      --cf-muted:   #9c9cab;
      --cf-accent:  #a8a5ff;
      --cf-accent-2:#8a86ff;
      --cf-accent-soft: #2e2c52;
      --cf-shadow:  0 8px 22px rgba(0,0,0,0.55);
    }
    #${BAR_ID} {
      position: absolute; top: 96px; right: 4px;
      display: flex; flex-direction: column; gap: 5px;
      padding: 7px 5px;
      background: linear-gradient(180deg,
        color-mix(in srgb, var(--cf-bg) 92%, transparent),
        color-mix(in srgb, var(--cf-panel) 92%, transparent));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      border: 1px solid color-mix(in srgb, var(--cf-border) 80%, var(--cf-accent) 20%);
      border-radius: 14px;
      box-shadow:
        0 10px 28px rgba(0,0,0,0.42),
        0 0 0 1px rgba(255,255,255,0.04) inset;
      z-index: 1500;
      font-family: var(--font-interface);
      color: var(--cf-text);
      cursor: grab; user-select: none;
      animation: cf-bar-in 0.22s ease-out;
    }
    @keyframes cf-bar-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.96); }
      to   { opacity: 1; transform: none; }
    }
    #${BAR_ID}.is-dragging { cursor: grabbing; box-shadow: 0 14px 36px rgba(0,0,0,0.55); }
    #${BAR_ID} .cf-pill {
      width: 28px; height: 28px;
      border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11.5px; font-weight: 700;
      background: linear-gradient(160deg,
        var(--cf-panel),
        color-mix(in srgb, var(--cf-panel) 70%, var(--cf-bg)));
      color: var(--cf-text);
      border: 1px solid var(--cf-border);
      cursor: pointer;
      transition: transform 0.14s cubic-bezier(.34,1.56,.64,1),
                  background 0.14s, color 0.14s, box-shadow 0.14s;
      position: relative;
    }
    #${BAR_ID} .cf-pill:hover {
      background: linear-gradient(160deg,
        var(--cf-bg-2),
        var(--cf-panel));
      transform: scale(1.1) rotate(-1.5deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
    #${BAR_ID} .cf-pill:active { transform: scale(0.96); }
    #${BAR_ID} .cf-pill.is-active {
      background: linear-gradient(160deg,
        var(--cf-accent),
        color-mix(in srgb, var(--cf-accent) 70%, #000));
      color: #fff;
      border-color: color-mix(in srgb, var(--cf-accent) 60%, #fff 0%);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--cf-accent) 35%, transparent),
        0 4px 12px color-mix(in srgb, var(--cf-accent) 40%, transparent);
    }
    /* Floating "go to tab" button — centered over the embed, big. */
    .${OVERLAY_CLASS} {
      position: absolute; pointer-events: auto;
      width: 84px; height: 84px; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--cf-accent) 92%, #000);
      color: #fff;
      border: 2px solid color-mix(in srgb, var(--cf-accent) 60%, #fff 0%);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 8px 22px rgba(0,0,0,0.45),
                  0 0 0 6px color-mix(in srgb, var(--cf-accent) 15%, transparent);
      transition: background 0.14s, transform 0.14s, box-shadow 0.14s;
      opacity: 0.92;
    }
    .${OVERLAY_CLASS}:hover {
      transform: scale(1.12);
      opacity: 1;
      box-shadow: 0 12px 30px rgba(0,0,0,0.55),
                  0 0 0 10px color-mix(in srgb, var(--cf-accent) 25%, transparent);
    }
    .${OVERLAY_CLASS}:active { transform: scale(0.96); }
    .${OVERLAY_CLASS} svg { display: block; width: 44px; height: 44px; }

    /* "Session N" badge floating above each embed. */
    .cf-embed-label {
      position: absolute; pointer-events: none;
      padding: 6px 14px;
      background: color-mix(in srgb, var(--cf-accent) 88%, #000);
      color: #fff;
      font-family: var(--font-interface);
      font-size: 14px; font-weight: 800;
      letter-spacing: 0.5px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      white-space: nowrap;
      z-index: 40;
    }

    /* Pill whose session has a live cached Obsidian tab.
       Subtle accent ring so the user knows "click = switch tab" not "click = open new". */
    #${BAR_ID} .cf-pill.has-tab:not(.is-active) {
      box-shadow:
        0 0 0 1.5px color-mix(in srgb, var(--cf-accent) 55%, transparent),
        0 2px 5px rgba(0,0,0,0.25);
      border-color: color-mix(in srgb, var(--cf-accent) 35%, var(--cf-border));
    }
    #${BAR_ID} .cf-pill.cf-set-home {
      color: var(--cf-accent);
      border-style: dashed;
      animation: cf-pulse-soft 1.8s ease-in-out infinite;
    }
    @keyframes cf-pulse-soft {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--cf-accent) 35%, transparent); }
      50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--cf-accent) 0%, transparent); }
    }
    #${BAR_ID} .cf-pill.cf-main { flex-direction: column; gap: 0; font-size: 9px; }
    #${BAR_ID} .cf-pill.cf-main span { font-size: 7px; font-weight: 600; line-height: 1; margin-top: 1px; }
    #${BAR_ID} .cf-pill svg { width: 12px; height: 12px; }
    #${BAR_ID} .cf-pill.cf-main svg { width: 11px; height: 11px; }
    #${BAR_ID} .cf-sep {
      height: 1px; margin: 2px 4px;
      background: var(--cf-border);
    }
    /* Status dot — top-right corner of each pill. */
    #${BAR_ID} .cf-pill .cf-status-dot,
    #${MODAL_ID} .cf-status-dot {
      position: absolute; top: 1px; right: 1px;
      width: 6px; height: 6px; border-radius: 50%;
      box-shadow: 0 0 0 1px var(--cf-bg);
    }
    .cf-status-dot.is-ok   { background: #51cf66; }
    .cf-status-dot.is-live { background: #4dabf7; animation: cf-pulse 1.4s ease-out infinite; }
    .cf-status-dot.is-dead { background: #e03131; }
    @keyframes cf-pulse {
      0%   { box-shadow: 0 0 0 1px var(--cf-bg), 0 0 0 0 rgba(77,171,247,0.7); }
      70%  { box-shadow: 0 0 0 1px var(--cf-bg), 0 0 0 6px rgba(77,171,247,0); }
      100% { box-shadow: 0 0 0 1px var(--cf-bg), 0 0 0 0 rgba(77,171,247,0); }
    }
    #${MODAL_ID} .cf-sess-idx { position: relative; }

    /* Options modal — compact, glassy */
    #${MODAL_ID} {
      position: absolute; top: 80px; right: 90px;
      width: 360px; max-height: calc(100vh - 120px);
      display: flex; flex-direction: column;
      padding: 0;
      background: color-mix(in srgb, var(--cf-bg) 88%, transparent);
      backdrop-filter: blur(18px) saturate(150%);
      -webkit-backdrop-filter: blur(18px) saturate(150%);
      border: 1px solid color-mix(in srgb, var(--cf-border) 70%, var(--cf-accent) 30%);
      border-radius: 16px;
      box-shadow:
        0 18px 50px rgba(0,0,0,0.55),
        0 0 0 1px rgba(255,255,255,0.05) inset;
      z-index: 1600;
      font-family: var(--font-interface);
      color: var(--cf-text);
      font-size: 12.5px;
      animation: cf-modal-in 0.22s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes cf-modal-in {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to   { opacity: 1; transform: none; }
    }
    #${MODAL_ID}::-webkit-scrollbar { width: 8px; }
    #${MODAL_ID}::-webkit-scrollbar-thumb {
      background: var(--cf-border); border-radius: 4px;
    }
    #${MODAL_ID} .cf-mhd {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--cf-accent) 14%, var(--cf-panel)),
        var(--cf-bg));
      border-bottom: 1px solid var(--cf-border);
      border-radius: 16px 16px 0 0;
      flex-shrink: 0;
    }
    #${MODAL_ID} .cf-mbody {
      padding: 10px 14px 14px;
      flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    }
    #${MODAL_ID} .cf-sess-list {
      max-height: 200px; overflow-y: auto; overflow-x: hidden;
      padding-right: 2px;
    }
    #${MODAL_ID} .cf-mtitle {
      font-weight: 600; font-size: 13px;
      display: flex; align-items: center; gap: 6px;
    }
    #${MODAL_ID} .cf-mtitle svg { color: var(--cf-accent); width: 13px; height: 13px; }
    #${MODAL_ID} .cf-mclose {
      cursor: pointer; padding: 1px 7px; border-radius: 4px;
      color: var(--cf-muted); font-size: 13px;
    }
    #${MODAL_ID} .cf-mclose:hover {
      background: var(--cf-bg-2); color: var(--cf-text);
    }
    #${MODAL_ID} .cf-section { padding: 8px 0; }
    #${MODAL_ID} .cf-section + .cf-section {
      border-top: 1px solid var(--cf-border);
      padding-top: 8px; margin-top: 2px;
    }
    #${MODAL_ID} .cf-label {
      font-size: 9.5px; color: var(--cf-muted); text-transform: uppercase;
      letter-spacing: 0.4px; font-weight: 700; margin: 0 0 5px;
    }
    #${MODAL_ID} .cf-row { display: flex; align-items: center; gap: 6px; }
    #${MODAL_ID} .cf-row + .cf-row { margin-top: 5px; }
    #${MODAL_ID} .cf-input {
      flex: 1; padding: 4px 7px; border-radius: 5px;
      background: var(--cf-bg-2);
      border: 1px solid var(--cf-border);
      color: var(--cf-text); font-size: 11.5px;
      font-family: var(--font-interface); min-width: 0;
    }
    #${MODAL_ID} .cf-input:focus { outline: none; border-color: var(--cf-accent); }
    #${MODAL_ID} .cf-num {
      width: 70px; padding: 4px 6px; border-radius: 5px;
      background: var(--cf-bg-2);
      border: 1px solid var(--cf-border);
      color: var(--cf-text); font-size: 11.5px;
      font-variant-numeric: tabular-nums;
    }
    #${MODAL_ID} .cf-btn {
      padding: 4px 8px; border-radius: 5px;
      background: var(--cf-panel); color: var(--cf-text);
      border: 1px solid var(--cf-border);
      cursor: pointer; font-size: 11px; font-weight: 500;
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      white-space: nowrap; flex-shrink: 0;
    }
    #${MODAL_ID} .cf-btn:hover { background: var(--cf-bg-2); }
    #${MODAL_ID} .cf-btn.cf-primary {
      background: var(--cf-accent); color: #fff;
      border-color: var(--cf-accent);
    }
    #${MODAL_ID} .cf-btn.cf-primary:hover { background: var(--interactive-accent-hover); }
    #${MODAL_ID} .cf-btn.cf-danger { color: #e03131; }
    #${MODAL_ID} .cf-btn svg { width: 11px; height: 11px; flex-shrink: 0; }

    #${MODAL_ID} .cf-sess {
      display: grid;
      grid-template-columns: 22px 1fr auto;
      gap: 7px; align-items: center;
      padding: 6px 7px;
      border: 1px solid var(--cf-border);
      border-radius: 8px;
      background: linear-gradient(180deg,
        var(--cf-panel),
        color-mix(in srgb, var(--cf-panel) 60%, var(--cf-bg)));
      margin-bottom: 5px;
      transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
    }
    #${MODAL_ID} .cf-sess:hover {
      transform: translateX(2px);
      border-color: color-mix(in srgb, var(--cf-accent) 55%, var(--cf-border));
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
    }
    #${MODAL_ID} .cf-sess-idx {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      background: linear-gradient(160deg,
        var(--cf-accent),
        color-mix(in srgb, var(--cf-accent) 65%, #000));
      color: #fff;
      font-weight: 700; font-size: 10.5px;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 2px 5px color-mix(in srgb, var(--cf-accent) 40%, transparent);
    }
    #${MODAL_ID} .cf-sess-name {
      width: 100%; padding: 3px 6px; border-radius: 4px;
      background: var(--cf-bg);
      border: 1px solid transparent;
      color: var(--cf-text); font-size: 11.5px; font-weight: 500;
      font-family: var(--font-interface);
    }
    #${MODAL_ID} .cf-sess-name:hover { border-color: var(--cf-border); }
    #${MODAL_ID} .cf-sess-name:focus {
      outline: none; border-color: var(--cf-accent);
      background: var(--cf-bg-2);
    }
    #${MODAL_ID} .cf-sess-actions { display: flex; gap: 2px; }
    #${MODAL_ID} .cf-iconbtn {
      width: 22px; height: 22px; border-radius: 4px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--cf-text);
      background: transparent; border: 1px solid transparent;
      padding: 0;
    }
    #${MODAL_ID} .cf-iconbtn:hover {
      background: var(--cf-bg);
      border-color: var(--cf-border);
      color: var(--cf-accent);
    }
    #${MODAL_ID} .cf-iconbtn.cf-danger:hover { color: #e03131; }
    #${MODAL_ID} .cf-iconbtn.cf-armed,
    #${MODAL_ID} .cf-btn.cf-armed {
      background: #e03131; color: #fff;
      border-color: #e03131;
      animation: cf-armed-pulse 0.6s ease-in-out infinite alternate;
    }
    @keyframes cf-armed-pulse {
      from { box-shadow: 0 0 0 0 rgba(224,49,49,0.55); }
      to   { box-shadow: 0 0 0 4px rgba(224,49,49,0); }
    }
    #${MODAL_ID} .cf-iconbtn svg { width: 12px; height: 12px; display: block; }

    #${MODAL_ID} .cf-empty {
      padding: 8px; text-align: center; font-size: 11px;
      color: var(--cf-muted);
      border: 1px dashed var(--cf-border);
      border-radius: 6px;
    }
    #${MODAL_ID} .cf-toggle {
      display: inline-flex; align-items: center; gap: 6px;
      cursor: pointer; font-size: 11.5px;
      padding: 2px 0;
    }
    #${MODAL_ID} .cf-toggle input { accent-color: var(--cf-accent); }
    #${MODAL_ID} .cf-hint {
      font-size: 10px; color: var(--cf-muted);
      margin-top: 3px; line-height: 1.35;
    }
    #${MODAL_ID} .cf-times {
      color: var(--cf-muted); font-weight: 600; padding: 0 1px;
    }
  `;
  document.head.appendChild(styleTag);
}

// ---------- icons ----------
const ICON = {
  home:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>`,
  plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  cog:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  copy:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  open:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>`,
  note:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/></svg>`,
  globe:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></svg>`,
  full:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V3h4"/><path d="M21 7V3h-4"/><path d="M3 17v4h4"/><path d="M21 17v4h-4"/></svg>`,
  exit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  grid:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`
};

// ---------- toggle w/ auto-fire suppression ----------
// Script icon click should toggle the bar. But the script is also
// auto-invoked on Excalidraw view mount (Templater, startup scripts,
// split panes), so a naive toggle flips visibility on every view
// switch. Solution: timestamp the last toggle. Fires within 800 ms
// are treated as part of an auto-fire chain — enforce current state,
// no flip.
{
  const now = Date.now();
  const sinceToggle = now - (window.__collabFrameLastToggleAt || 0);
  const barEl = document.getElementById(BAR_ID);
  if (sinceToggle < 800) {
    // Auto-fire window — keep things consistent and exit.
    if (window.__collabFrameDismissed && barEl) barEl.remove();
    return;
  }
  window.__collabFrameLastToggleAt = now;
  if (window.__collabFrameDismissed) {
    // User had it hidden — explicit gesture means SHOW.
    window.__collabFrameDismissed = false;
    // fall through to build
  } else if (barEl) {
    // Visible → user gesture means HIDE.
    window.__collabFrameDismissed = true;
    barEl.remove();
    document.getElementById(MODAL_ID)?.remove();
    return;
  }
}
window.__collabFrameBuilding = false;
document.querySelectorAll("#" + BAR_ID).forEach(b => b.remove());
document.getElementById(MODAL_ID)?.remove();
if (window.__collabFrameObserver) {
  try { window.__collabFrameObserver.disconnect(); } catch (_) {}
  window.__collabFrameObserver = null;
}
let bar = null;

// ---------- build bar ----------
bar = document.createElement("div");
bar.id = BAR_ID;
// Mount inside .excalidraw host so bar stays inside canvas area (matches
// Book Mode pattern). position:absolute resolves against this host.
const _barHost =
  view.contentEl.querySelector(".excalidraw") || view.contentEl;
if (_barHost && getComputedStyle(_barHost).position === "static") {
  _barHost.style.position = "relative";
}
_barHost.appendChild(bar);
// Clamp saved coords into host rect — stale values from the old
// stretched-bar bug or prior viewport-based persists could park the bar
// off-screen.
{
  const hr = _barHost.getBoundingClientRect();
  const ok = (v, max) => typeof v === "number" && v >= 0 && v <= max - 40;
  if (!ok(cfg.barLeft, hr.width) || !ok(cfg.barTop, hr.height)) {
    cfg.barLeft = null; cfg.barTop = null;
    state.dirty = true; persistCfgSoon();
  }
}
if (cfg.barLeft != null && cfg.barTop != null) {
  bar.style.left = `${cfg.barLeft}px`;
  bar.style.top  = `${cfg.barTop}px`;
  bar.style.right = "auto";
  bar.style.transform = "none";
}
// Clamp into host post-mount + on resize so bar never leaks past canvas.
const _clampBar = () => {
  const hr = _barHost.getBoundingClientRect();
  const w = bar.offsetWidth, h = bar.offsetHeight, m = 4;
  let cl = bar.offsetLeft, ct = bar.offsetTop;
  if (cl + w > hr.width  - m) bar.style.left = `${Math.max(m, hr.width  - w - m)}px`;
  if (ct + h > hr.height - m) bar.style.top  = `${Math.max(m, hr.height - h - m)}px`;
  if (cl < m) bar.style.left = `${m}px`;
  if (ct < m) bar.style.top  = `${m}px`;
};
requestAnimationFrame(_clampBar);
window.addEventListener("resize", _clampBar);

// drag bar by header area (whole bar background is draggable; click on
// pill children still fires their own onclick because we only start
// drag on background mousedown).
(function makeBarDraggable() {
  let dragging = false, ox = 0, oy = 0, moved = false;
  bar.addEventListener("mousedown", (e) => {
    if (e.target.closest(".cf-pill")) return;
    const r = bar.getBoundingClientRect();
    dragging = true; moved = false;
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    bar.classList.add("is-dragging");
    // Pin width so it doesn't stretch while left+right both apply.
    bar.style.right = "auto";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    moved = true;
    const hr = _barHost.getBoundingClientRect();
    const w = bar.offsetWidth, h = bar.offsetHeight, m = 4;
    // host-relative + clamp so bar can't escape canvas while dragging.
    const left = Math.max(m, Math.min(hr.width  - w - m, e.clientX - hr.left - ox));
    const top  = Math.max(m, Math.min(hr.height - h - m, e.clientY - hr.top  - oy));
    bar.style.left = `${left}px`;
    bar.style.top  = `${top}px`;
    bar.style.right = "auto";
    bar.style.transform = "none";
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove("is-dragging");
    if (moved) {
      // Persist host-relative offsets, not viewport coords.
      cfg.barLeft = bar.offsetLeft;
      cfg.barTop  = bar.offsetTop;
      state.dirty = true; persistCfgSoon();
    }
  });
})();

let __renderToken = 0;
let __renderPending = false;
async function renderBar() {
  // Serialize: two concurrent renderBar() calls race past the child-clear,
  // both await readStore(), then both append — doubling every pill.
  if (__renderPending) return;
  __renderPending = true;
  const myToken = ++__renderToken;
  try {
    document.querySelectorAll("#" + BAR_ID).forEach(b => {
      if (b !== bar) b.remove();
    });
    while (bar.firstChild) bar.removeChild(bar.firstChild);
    const store = await readStore();
    // A newer render started while we awaited — bail to let it win.
    if (myToken !== __renderToken) return;
    // Expose latest sessions for the embed overlay labels.
    window.__collabSessions = store.sessions;
  // Read the active leaf's file path live each render — view may
  // have been swapped (the captured `view` only points at the leaf
  // the script first ran in).
  const activeFile = app.workspace.getActiveFile?.();
  const activePath = activeFile?.path || view?.file?.path || "";

  // [Main] pill — opens Home in the current tab.
  const mainPill = document.createElement("div");
  mainPill.className = "cf-pill cf-main";
  mainPill.innerHTML = `${ICON.home}<span>Main</span>`;
  mainPill.title = cfg.homeFile ? `Home: ${cfg.homeFile}` : "Set Home from ⚙";
  if (activePath && cfg.homeFile === activePath) mainPill.classList.add("is-active");
  // Status dot: live (active) / ok (file exists) / dead (missing).
  if (cfg.homeFile) {
    const homeExists = !!app.vault.getAbstractFileByPath(cfg.homeFile);
    const md = document.createElement("span");
    md.className = "cf-status-dot " + (mainPill.classList.contains("is-active") ? "is-live" : homeExists ? "is-ok" : "is-dead");
    mainPill.appendChild(md);
  }
  mainPill.onclick = goHome;
  bar.appendChild(mainPill);

  const sep = document.createElement("div");
  sep.className = "cf-sep";
  bar.appendChild(sep);

  // Numbered session pills — each shows a status dot.
  const activeLeaf = app.workspace.activeLeaf;
  store.sessions.forEach((s, i) => {
    const exists = !!app.vault.getAbstractFileByPath(s.filePath);
    const cachedLeaf = leafCache.get(s.id);
    const hasTab = leafIsAlive(cachedLeaf);
    const isActive =
      (hasTab && activeLeaf === cachedLeaf) ||
      (exists && activePath === s.filePath);
    const p = document.createElement("div");
    p.className = "cf-pill";
    if (hasTab) p.classList.add("has-tab");
    p.textContent = String(i + 1);
    p.title =
      `${s.label || ("Session " + (i + 1))}\n` +
      (hasTab ? "Click → switch to its open tab\n" : "Click → open in new tab\n") +
      `${s.filePath || ""}${exists ? "" : "\n(file missing)"}`;
    if (isActive) p.classList.add("is-active");
    const dot = document.createElement("span");
    dot.className = "cf-status-dot " + (isActive ? "is-live" : exists ? "is-ok" : "is-dead");
    p.appendChild(dot);
    p.onclick = () => openSession(s);
    bar.appendChild(p);
  });

  // "Set as Home" pill — shows only when the active file is an
  // unrecognized Excalidraw note (not Home, not a session). Single
  // [Main] stays rational; this gives a one-tap way to repoint it.
  const isExcali = !!activePath && activePath.endsWith(".excalidraw.md");
  const isHomeNow = activePath && activePath === cfg.homeFile;
  const isSession = store.sessions.some(s => s.filePath === activePath);
  if (isExcali && !isHomeNow && !isSession) {
    const setHomePill = document.createElement("div");
    // Re-use cf-main grid (icon + tiny label) so it visually announces
    // itself as an action ("Set?") rather than a second Main.
    setHomePill.className = "cf-pill cf-main cf-set-home";
    setHomePill.innerHTML = `${ICON.home}<span>Set?</span>`;
    setHomePill.title = `Make this file the Home (currently: ${cfg.homeFile || "none"})\nClick to pin.`;
    setHomePill.onclick = () => {
      cfg.homeFile = activePath;
      state.dirty = true; persistCfgSoon();
      new Notice(`Home → ${activePath}`, 2500);
      renderBar();
    };
    bar.appendChild(setHomePill);
  }

  // [+] new session
  const addPill = document.createElement("div");
  addPill.className = "cf-pill";
  addPill.innerHTML = ICON.plus;
  addPill.title = "New session";
  addPill.onclick = quickCreateSession;
  bar.appendChild(addPill);

  // [▦] tile-all — only useful when there's ≥1 session.
  // Sits between [+] and [⚙].
  if (store.sessions.length) {
    const tilePill = document.createElement("div");
    tilePill.className = "cf-pill";
    tilePill.innerHTML = ICON.grid;
    tilePill.title = "Tile all sessions on Home";
    tilePill.onclick = viewAllSessions;
    bar.appendChild(tilePill);
  }

  // [⚙] settings
  const cogPill = document.createElement("div");
  cogPill.className = "cf-pill";
  cogPill.innerHTML = ICON.cog;
  cogPill.title = "Options";
  cogPill.onclick = openModal;
  bar.appendChild(cogPill);
  } finally {
    __renderPending = false;
  }
}

async function quickCreateSession() {
  const label = `Session ${Date.now().toString(36).slice(-4)}`;
  try {
    const { room, key } = await genRoomKey();
    const link = buildLink(room, key);
    const filePath = await createSessionFile(label, link);
    const store = await readStore();
    store.sessions.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label, room, key, filePath, createdAt: Date.now()
    });
    await writeStore(store);
    try { await window.navigator.clipboard.writeText(link); } catch (_) {}
    new Notice(`Created "${label}". Link copied.`, 2500);
    renderBar();
    try { ensureEmbedOverlays(); } catch (_) {}
  } catch (e) {
    console.error("[Collab] create failed", e);
    new Notice(`Create failed: ${e.message || e}`, 5000);
  }
}

// ---------- options modal ----------
function openModal() {
  let existing = document.getElementById(MODAL_ID);
  if (existing) { existing.remove(); return; }
  buildModal();
}

function buildModal() {
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  // Mount inside .excalidraw host so position:absolute keeps modal inside
  // the canvas area (matches Book Mode pattern). Falls back to contentEl.
  const _modalHost =
    view.contentEl.querySelector(".excalidraw") || view.contentEl;
  if (_modalHost && getComputedStyle(_modalHost).position === "static") {
    _modalHost.style.position = "relative";
  }
  _modalHost.appendChild(modal);
  // Restore last drag position so the modal stays where the user left it.
  if (cfg.modalLeft != null && cfg.modalTop != null) {
    modal.style.left = `${cfg.modalLeft}px`;
    modal.style.top  = `${cfg.modalTop}px`;
    modal.style.right = "auto";
  }
  // Clamp into host after mount + on resize so the modal never overflows.
  const _clampModal = () => {
    const hr = _modalHost.getBoundingClientRect();
    const w = modal.offsetWidth, h = modal.offsetHeight, m = 8;
    let cl = modal.offsetLeft, ct = modal.offsetTop;
    if (cl + w > hr.width  - m) modal.style.left = `${Math.max(m, hr.width  - w - m)}px`;
    if (ct + h > hr.height - m) modal.style.top  = `${Math.max(m, hr.height - h - m)}px`;
    if (cl < m) modal.style.left = `${m}px`;
    if (ct < m) modal.style.top  = `${m}px`;
  };
  requestAnimationFrame(_clampModal);
  const _onResize = () => _clampModal();
  window.addEventListener("resize", _onResize);
  const _origRemove = modal.remove.bind(modal);
  modal.remove = () => { window.removeEventListener("resize", _onResize); _origRemove(); };

  // Header
  const header = modal.createDiv({ cls: "cf-mhd" });
  const titleEl = header.createDiv({ cls: "cf-mtitle" });
  titleEl.innerHTML = `${ICON.cog}<span>Collaboration · Options</span>`;
  const close = header.createDiv({ cls: "cf-mclose", text: "✕" });
  close.onclick = () => modal.remove();

  // Drag by header — mirrors the pill-bar behaviour.
  (function makeModalDraggable() {
    let dragging = false, ox = 0, oy = 0, moved = false;
    header.style.cursor = "grab";
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest(".cf-mclose")) return;
      const r = modal.getBoundingClientRect();
      dragging = true; moved = false;
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      modal.style.right = "auto";
      header.style.cursor = "grabbing";
      e.preventDefault();
    });
    const mv = (e) => {
      if (!dragging) return;
      moved = true;
      const hr = _modalHost.getBoundingClientRect();
      const w = modal.offsetWidth, h = modal.offsetHeight, m = 8;
      // host-relative coords + clamp inside host so modal can't leave canvas.
      const left = Math.max(m, Math.min(hr.width  - w - m, e.clientX - hr.left - ox));
      const top  = Math.max(m, Math.min(hr.height - h - m, e.clientY - hr.top  - oy));
      modal.style.left = `${left}px`;
      modal.style.top  = `${top}px`;
      modal.style.right = "auto";
    };
    const up = () => {
      if (!dragging) return;
      dragging = false; header.style.cursor = "grab";
      if (moved) {
        // Persist host-relative offsets, not viewport coords.
        cfg.modalLeft = modal.offsetLeft;
        cfg.modalTop  = modal.offsetTop;
        state.dirty = true; persistCfgSoon();
      }
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  })();

  const body = modal.createDiv({ cls: "cf-mbody" });

  // ----- Home section -----
  {
    const sec = body.createDiv({ cls: "cf-section" });
    sec.createDiv({ cls: "cf-label", text: "Home note" });
    const row = sec.createDiv({ cls: "cf-row" });
    const homeIn = document.createElement("input");
    homeIn.type = "text"; homeIn.className = "cf-input";
    homeIn.placeholder = "Path/to/HomeNote.md";
    homeIn.value = cfg.homeFile || "";
    homeIn.onchange = () => {
      cfg.homeFile = homeIn.value.trim();
      state.dirty = true; persistCfgSoon();
      renderBar();
    };
    row.appendChild(homeIn);
    const useCurrent = document.createElement("button");
    useCurrent.className = "cf-btn";
    useCurrent.innerHTML = `${ICON.home}<span>Use current</span>`;
    useCurrent.onclick = () => {
      if (!file) { new Notice("No active file."); return; }
      cfg.homeFile = file.path; homeIn.value = file.path;
      state.dirty = true; persistCfgSoon();
      new Notice(`Home → ${cfg.homeFile}`, 2500);
      renderBar();
    };
    row.appendChild(useCurrent);
    sec.createDiv({ cls: "cf-hint",
      text: "Clicking [Main] in the pill bar opens this file." });
  }


  // ----- Embed size -----
  {
    const sec = body.createDiv({ cls: "cf-section" });
    sec.createDiv({ cls: "cf-label", text: "Default embed size (new sessions)" });
    const row = sec.createDiv({ cls: "cf-row" });
    const wIn = document.createElement("input");
    wIn.type = "number"; wIn.className = "cf-num";
    wIn.value = cfg.embedW; wIn.min = 500; wIn.max = 10000;
    wIn.oninput = () => { cfg.embedW = parseInt(wIn.value, 10) || cfg.embedW; state.dirty = true; persistCfgSoon(); };
    const hIn = document.createElement("input");
    hIn.type = "number"; hIn.className = "cf-num";
    hIn.value = cfg.embedH; hIn.min = 500; hIn.max = 10000;
    hIn.oninput = () => { cfg.embedH = parseInt(hIn.value, 10) || cfg.embedH; state.dirty = true; persistCfgSoon(); };
    row.appendChild(wIn);
    const x = document.createElement("span");
    x.className = "cf-times"; x.textContent = "×";
    row.appendChild(x);
    row.appendChild(hIn);
  }

  // ----- Sessions list -----
  {
    const sec = body.createDiv({ cls: "cf-section" });
    const headRow = sec.createDiv({ cls: "cf-row" });
    headRow.style.justifyContent = "space-between";
    headRow.createDiv({ cls: "cf-label", text: "Sessions" });
    const delAll = document.createElement("button");
    delAll.className = "cf-btn cf-danger";
    armDoubleClickButton(
      delAll,
      `${ICON.trash}<span>Delete all</span>`,
      "Click twice to delete every session (files stay on disk)",
      async () => {
        const store2 = await readStore();
        const removed = store2.sessions.length;
        if (!removed) { new Notice("No sessions.", 1500); return; }
        // Tear down cached tabs.
        for (const s of store2.sessions) {
          const lf = leafCache.get(s.id);
          if (lf) { try { lf.detach(); } catch (_) {} leafCache.delete(s.id); }
        }
        store2.sessions = [];
        await writeStore(store2);
        removeCollabEmbeds(null);
        renderSessionList(modal._sessionHost);
        renderBar();
        try { ensureEmbedOverlays(); } catch (_) {}
        new Notice(`Removed ${removed} session${removed === 1 ? "" : "s"}.`, 2500);
      }
    );
    headRow.appendChild(delAll);
    const listHost = sec.createDiv({ cls: "cf-sess-list" });
    renderSessionList(listHost);
    sec.dataset.host = "sessions";
    modal._sessionHost = listHost;
  }

  // ----- Create session -----
  {
    const sec = body.createDiv({ cls: "cf-section" });
    sec.createDiv({ cls: "cf-label", text: "Create new session" });
    const row = sec.createDiv({ cls: "cf-row" });
    const cIn = document.createElement("input");
    cIn.type = "text"; cIn.className = "cf-input";
    cIn.placeholder = "Label (e.g. Sprint planning)";
    row.appendChild(cIn);
    const cBtn = document.createElement("button");
    cBtn.className = "cf-btn cf-primary";
    cBtn.innerHTML = `${ICON.plus}<span>Create</span>`;
    const doCreate = async () => {
      const label = (cIn.value || `Session ${Date.now().toString(36).slice(-4)}`).trim();
      cBtn.disabled = true;
      try {
        const { room, key } = await genRoomKey();
        const link = buildLink(room, key);
        const filePath = await createSessionFile(label, link);
        const store = await readStore();
        store.sessions.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          label, room, key, filePath, createdAt: Date.now()
        });
        await writeStore(store);
        try { await window.navigator.clipboard.writeText(link); } catch (_) {}
        cIn.value = "";
        new Notice(`Created "${label}". Link copied.`, 2500);
        renderSessionList(modal._sessionHost);
        renderBar();
      } catch (e) {
        console.error("[Collab] create failed", e);
        new Notice(`Create failed: ${e.message || e}`, 5000);
      } finally {
        cBtn.disabled = false;
      }
    };
    cBtn.onclick = doCreate;
    cIn.addEventListener("keydown", (e) => { if (e.key === "Enter") doCreate(); });
    row.appendChild(cBtn);
  }
}

async function renderSessionList(host) {
  while (host.firstChild) host.removeChild(host.firstChild);
  const store = await readStore();
  if (!store.sessions.length) {
    host.createDiv({ cls: "cf-empty", text: "No sessions yet." });
    return;
  }
  const activePath = view?.file?.path || "";
  store.sessions.forEach((s, i) => {
    const exists = !!app.vault.getAbstractFileByPath(s.filePath);
    const isActive = exists && activePath === s.filePath;
    const row = host.createDiv({ cls: "cf-sess" });

    // Status badge: green dot = file present, red dot = missing.
    // Pulsing accent = currently open in the active leaf.
    const idx = row.createDiv({ cls: "cf-sess-idx" });
    idx.textContent = String(i + 1);
    const dot = document.createElement("span");
    dot.className = "cf-status-dot"
      + (isActive ? " is-live" : exists ? " is-ok" : " is-dead");
    dot.title = isActive ? "Open now" : exists ? "Available" : "Session note missing";
    idx.appendChild(dot);

    const nameIn = document.createElement("input");
    nameIn.className = "cf-sess-name";
    nameIn.value = s.label || "";
    nameIn.title = "Rename";
    nameIn.onchange = async () => {
      const store2 = await readStore();
      const found = store2.sessions.find(x => x.id === s.id);
      if (found) {
        found.label = nameIn.value.trim() || found.label;
        await writeStore(store2);
        renderBar();
      }
    };
    row.appendChild(nameIn);

    const actions = row.createDiv({ cls: "cf-sess-actions" });
    const mkBtn = (icon, title, cls, fn) => {
      const b = document.createElement("button");
      b.className = "cf-iconbtn" + (cls ? " " + cls : "");
      b.title = title; b.innerHTML = icon;
      b.onclick = (e) => { e.stopPropagation(); fn(); };
      actions.appendChild(b);
    };
    mkBtn(ICON.open,  "Open live room in current tab (webviewer)", "",
      () => openSession(s));
    mkBtn(ICON.full,  "Open live room in popout window", "",
      () => openWebviewerPopout(buildLink(s.room, s.key)));
    mkBtn(ICON.globe, "Open in browser", "",
      () => openBrowser(buildLink(s.room, s.key)));
    mkBtn(ICON.copy,  "Copy room link", "", async () => {
      await window.navigator.clipboard.writeText(buildLink(s.room, s.key));
      new Notice("Link copied.", 1500);
    });
    // Double-click trash: 1st click arms (turns red), 2nd within 2 s deletes.
    const trashBtn = document.createElement("button");
    trashBtn.className = "cf-iconbtn cf-danger";
    armDoubleClickButton(
      trashBtn,
      ICON.trash,
      "Click twice to remove (keeps file on disk)",
      async () => {
        const store2 = await readStore();
        store2.sessions = store2.sessions.filter(x => x.id !== s.id);
        await writeStore(store2);
        const lf = leafCache.get(s.id);
        if (lf) { try { lf.detach(); } catch (_) {} leafCache.delete(s.id); }
        removeCollabEmbeds(s.id);
        renderSessionList(host);
        renderBar();
        try { ensureEmbedOverlays(); } catch (_) {}
        new Notice(`Removed "${s.label}".`, 2000);
      }
    );
    actions.appendChild(trashBtn);
  });
}

renderBar();
try { ensureEmbedOverlays(); } catch (_) {}

// Singleton enforcer: kill any other #collab-frame-bar that appears
// later (concurrent script fires, popout mounts, etc.). Cheap — only
// fires on body's direct childList changes.
window.__collabFrameObserver = new MutationObserver((muts) => {
  for (const m of muts) {
    for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.id === BAR_ID && n !== bar) {
        n.remove();
      }
    }
  }
});
window.__collabFrameObserver.observe(document.body, { childList: true });

// Sanity check — surface invisible-bar bugs (off-screen coords, zero
// size, detached node) instead of failing silently.
setTimeout(() => {
  const r = bar.getBoundingClientRect();
  const inDom = document.body.contains(bar);
  if (!inDom || r.width < 4 || r.height < 4 ||
      r.right < 0 || r.bottom < 0 ||
      r.left > window.innerWidth || r.top > window.innerHeight) {
    new Notice(`Collab Frame bar broken: inDom=${inDom} w=${r.width|0} h=${r.height|0} x=${r.left|0} y=${r.top|0}. Resetting position.`, 8000);
    bar.style.left = ""; bar.style.top = ""; bar.style.right = ""; bar.style.transform = "";
    cfg.barLeft = null; cfg.barTop = null;
    state.dirty = true; persistCfgSoon();
  }
}, 50);

// Re-render bar whenever the user switches notes so the active-pill
// highlight + status dots stay in sync. Drop any stale handler from a
// previous run (closure pointed at a now-detached bar) and re-register.
if (window.__collabFrameLeafHook) {
  try { app.workspace.offref(window.__collabFrameLeafHook); } catch (_) {}
  window.__collabFrameLeafHook = null;
}
window.__collabFrameLeafHook = app.workspace.on("active-leaf-change", () => {
  // Use the live DOM node, not the closure — old `bar` may be detached.
  const live = document.getElementById(BAR_ID);
  if (live && live === bar) renderBar();
  // Drop dead leaves from the per-session cache so `has-tab` glow
  // disappears when the user closes a session tab.
  for (const [sid, lf] of leafCache.entries()) {
    if (!leafIsAlive(lf)) leafCache.delete(sid);
  }
  // Refresh embed overlays for the new active view, if any.
  try { ensureEmbedOverlays(); } catch (_) {}
});

/*
```
*/
