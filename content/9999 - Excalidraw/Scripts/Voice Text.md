---
excalidraw-plugin: parsed
---

/*
Voice Text — speak into text elements on the Excalidraw canvas.

Two ways to use:
  A) PERSISTENT MIC PILL — once the overlay is installed (i.e. after you
     run this script once), selecting any text element shows a "Voice"
     pill above it next to AI / Export. Click → dictate (Chrome boots
     on first click, instant after). Click Stop / press Esc → mic pill
     returns so you can continue.
  B) PLACEMENT MODE — clicking the pinned 🎤 icon in the Excalidraw
     side-tools panel enters placement mode: cursor → crosshair,
     bottom-right pill says "Click canvas to speak". Click empty canvas →
     a new text element is created at that point and dictation starts.

Run-script semantics (clicking the pinned icon):
  • Not yet installed → install overlay + enter placement mode.
  • Installed, idle    → enter placement mode.
  • Installed, in placement mode → cancel placement mode.
  • Installed, dictating → soft stop (commit text, keep Chrome warm).

The overlay stays installed for the rest of the Obsidian session. To
fully tear down Chrome + overlay, reload Obsidian (Ctrl+R).

How it works (technical):
  Web Speech API can't reach Google's Speech endpoint from Electron
  (no API key). We spawn off-screen Google Chrome (--app, 1×1 px at
  -3000,-3000, --use-fake-ui-for-media-stream) pointed at a localhost
  HTML bridge served by an in-Obsidian HTTP server. Chrome runs
  webkitSpeechRecognition and POSTs delta finals back. Obsidian
  streams them into the active text element via the EA workbench
  (per learnings/excalidraw-api.md — direct updateScene reverts).

Settings:
  • lang           BCP-47 language tag (default en-US).
  • wrapWidth      Width in scene px to wrap new dictation at (default 480).
  • chromeBinary   Path to Google Chrome. Empty = auto-detect. MUST be
                   real Google Chrome (Chromium/Brave/Edge lack the
                   Speech key and fail with error:network).
  • bridgePort     Localhost port for the bridge server (default 17891).

```javascript
*/
// ---------------------------------------------------------------------------
// Constants. `var` for hoisted-helper-referenced state (TDZ rule).
// ---------------------------------------------------------------------------
var STATE_KEY              = "__voiceTextState";
var BOTTOM_PILL_ID         = "voice-text-bottom-pill";
var STYLE_ID               = "voice-text-style";
var DEFAULT_LANG           = "en-US";
var DEFAULT_WRAP_WIDTH     = 480;
var DEFAULT_BRIDGE_PORT    = 17891;
var INTERIM_PREVIEW_CHARS  = 40;
var STARTUP_TIMEOUT_MS     = 15000;
var WRITE_THROTTLE_MS      = 120; // min interval between element commits during stream
var WRAP_FONT_SIZE         = 20;  // Excalidraw default text size — used to estimate wrap char count
var DRAG_THRESHOLD_PX      = 6;   // pointer-move distance below which we treat drag as plain click
var win                    = window;
// Hoisted bindings (used by hoisted helpers like softStop / cancelPlacement
// called from the toggle dispatcher above their `const` declarations).
var pillTick = null;
var LANGS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "ar-EG", label: "العربية" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "es-ES", label: "Español" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "ru-RU", label: "Русский" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "zh-CN", label: "中文" },
  { code: "hi-IN", label: "हिन्दी" },
];

var nodeReq = (typeof require === "function") ? require : (win.require || null);

var BRIDGE_HTML_DEBUG_PLACEHOLDER = "%%DEBUG%%";
var BRIDGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Voice Bridge</title></head>
<body><script>
(function(){
  var p = new URLSearchParams(location.search);
  var lang = p.get("lang") || "en-US";
  // bridgeToken identifies this Chrome instance to the server. Stale Chromes
  // (left over from a prior crash) have a different token; the server drops
  // their transcripts. dictToken is a per-dictation token sent by the server
  // via /cmd "settoken:..." — only this token is accepted at /transcript.
  var bridgeToken = p.get("token") || "";
  var dictToken = "";
  var SR = window.webkitSpeechRecognition || window.SpeechRecognition;
  var DEBUG = %%DEBUG%%;
  function blog(msg, data){
    if(!DEBUG) return;
    fetch("/log?bt=" + encodeURIComponent(bridgeToken),{method:"POST",headers:{"Content-Type":"application/json"},
      body: JSON.stringify({msg: msg, data: data || null, t: Date.now()})}).catch(function(){});
  }
  blog("page-load", {bridgeToken: bridgeToken});
  if(!SR){ fetch("/error?bt="+encodeURIComponent(bridgeToken),{method:"POST",body:"no-sr"}); return; }
  var stopped = false;
  var sessionId = 0;
  var currentRec = null;
  function makeRec(){
    var rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = lang;
    var mySession = ++sessionId;
    rec.onstart = function(){ blog("onstart", {sessionId: mySession}); };
    rec.onresult = function(ev){
      var finalTxt = "", interim = "";
      for(var i = 0; i < ev.results.length; i++){
        var r = ev.results[i];
        var t = r[0].transcript;
        if(r.isFinal) finalTxt += (finalTxt ? " " : "") + t;
        else          interim  += t;
      }
      finalTxt = finalTxt.replace(/\s+/g," ").trim();
      interim  = interim.replace(/\s+/g," ").trim();
      // Tag every transcript with bridgeToken + dictToken so server can
      // drop messages from stale bridges or stale dictations.
      fetch("/transcript",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          sessionFinal: finalTxt, sessionInterim: interim, sessionId: mySession,
          bridgeToken: bridgeToken, dictToken: dictToken
        })
      }).catch(function(){});
    };
    rec.onerror = function(ev){
      blog("onerror", {sessionId: mySession, error: ev.error});
      fetch("/error?bt="+encodeURIComponent(bridgeToken),{method:"POST",body: ev.error || "unknown"}).catch(function(){});
    };
    rec.onend = function(){
      blog("onend", {sessionId: mySession, stopped: stopped});
      if(stopped) return;
      currentRec = makeRec();
      try { currentRec.start(); } catch(e){ blog("restart-fail", {err: e.message}); }
    };
    return rec;
  }
  currentRec = makeRec();
  try { currentRec.start(); fetch("/ready?bt="+encodeURIComponent(bridgeToken),{method:"POST"}).catch(function(){}); }
  catch(e){ fetch("/error?bt="+encodeURIComponent(bridgeToken),{method:"POST",body:"start-fail:"+e.message}).catch(function(){}); }
  // EventSource for control commands. URL carries bridgeToken so server can
  // reject SSE connections from stale Chromes.
  var es = null;
  function connectSSE(){
    try {
      es = new EventSource("/cmd?bt=" + encodeURIComponent(bridgeToken));
      es.onopen = function(){ blog("sse-open", {}); };
      es.onerror = function(){
        blog("sse-error", {readyState: es && es.readyState});
        try { es.close(); } catch(e){}
        es = null;
        setTimeout(connectSSE, 1000);
      };
      es.onmessage = function(m){
        blog("sse-msg", {data: m.data});
        if(m.data === "die"){
          // Server signalled this bridge is stale. Close the window.
          stopped = true;
          try { currentRec && currentRec.stop(); } catch(e){}
          try { window.close(); } catch(e){}
          return;
        }
        if(m.data.indexOf("settoken:") === 0){
          dictToken = m.data.slice("settoken:".length);
          blog("dict-token-set", {dictToken: dictToken});
          // Restart SR so ev.results is cleared and the next emission
          // carries only the new dictation's audio.
          try { currentRec && currentRec.stop(); } catch(e){ blog("settoken-stop-fail", {err: e.message}); }
        }
      };
    } catch(e) { blog("sse-ctor-fail", {err: e.message}); setTimeout(connectSSE, 1000); }
  }
  connectSSE();
  window.addEventListener("beforeunload", function(){
    stopped = true; try{ currentRec && currentRec.stop(); }catch(e){}
  });
})();
</script></body></html>`;

// ---------------------------------------------------------------------------
// Settings seed.
// ---------------------------------------------------------------------------
{
  const _s = ea.getScriptSettings() || {};
  let dirty = false;
  const seed = (k, v, d) => {
    if (typeof _s[k] === "undefined") { _s[k] = { value: v, description: d }; dirty = true; }
  };
  seed("lang",         DEFAULT_LANG,        "BCP-47 language tag (e.g. en-US, ar-EG, fr-FR).");
  seed("wrapWidth",    DEFAULT_WRAP_WIDTH,  "Width in scene px to wrap new dictation at.");
  seed("chromeBinary", "",
    "Path/name of Google Chrome executable. Empty = auto-detect. MUST be real Google Chrome.");
  seed("bridgePort",   DEFAULT_BRIDGE_PORT, "Localhost port for the bridge HTTP server.");
  seed("debug",        false,
    "Log bridge + script events to DevTools console. Off by default (chatty during dictation).");
  if (typeof _s.fontSize       !== "undefined") { delete _s.fontSize;       dirty = true; }
  if (typeof _s.autoFinalizeMs !== "undefined") { delete _s.autoFinalizeMs; dirty = true; }
  if (dirty) ea.setScriptSettings(_s);
}

// ---------------------------------------------------------------------------
// Pre-flight.
// ---------------------------------------------------------------------------
if (!nodeReq) {
  new ea.obsidian.Notice("Voice Text: Node `require` unavailable — desktop Obsidian only.", 4000);
  return;
}
const view = ea.targetView;
if (!view || !view.contentEl) {
  new ea.obsidian.Notice("Voice Text: no active Excalidraw view.", 2000);
  return;
}
const api = ea.getExcalidrawAPI();
const canvas = view.contentEl.querySelector(".excalidraw__canvas.interactive");
if (!api || !canvas) {
  new ea.obsidian.Notice("Voice Text: canvas not ready.", 2000);
  return;
}

const http_         = nodeReq("http");
const child_process = nodeReq("child_process");
const fs_           = nodeReq("fs");
const path_         = nodeReq("path");
const os_           = nodeReq("os");

// ---------------------------------------------------------------------------
// Settings.
// ---------------------------------------------------------------------------
const settings = ea.getScriptSettings() || {};
const LANG       = settings.lang?.value               || DEFAULT_LANG;
const WRAP_WIDTH = Number(settings.wrapWidth?.value)  || DEFAULT_WRAP_WIDTH;
const PORT       = Number(settings.bridgePort?.value) || DEFAULT_BRIDGE_PORT;
const CHROME_OVERRIDE = (settings.chromeBinary?.value || "").trim();
const DEBUG = !!settings.debug?.value;
// Always-on critical events (startDictation / softStop / token swap).
const VLOG = (...args) => { try { console.log("[VoiceText]", ...args); } catch (_) {} };
// Verbose per-frame / per-transcript logs gated by DEBUG setting.
const DLOG = DEBUG ? VLOG : () => {};

// ---------------------------------------------------------------------------
// Stylesheet. Mic pill is a 1:1 clone of AI Edit's .ai-edit-btn so the row
// [Voice] [AI] [Export] is visually homogeneous.
// ---------------------------------------------------------------------------
if (!document.getElementById(STYLE_ID)) {
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = `
    .voice-text-mic-pill,
    .voice-text-stop,
    .voice-text-bubble {
      will-change: transform;
      transform: translate3d(0, 0, 0);
    }
    .voice-text-mic-pill {
      position: fixed; z-index: 2000;
      height: 26px; min-width: 38px; padding: 0 10px;
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
    .voice-text-mic-pill .vt-ic {
      width: 12px; height: 12px;
      color: var(--interactive-accent);
      flex: 0 0 auto; display: inline-block;
    }
    .voice-text-mic-pill .vt-ic svg { width: 100%; height: 100%; display: block; }
    .voice-text-mic-pill:hover {
      background: #dc2626; color: #fff; border-color: #dc2626;
      transform: translateY(-1px);
    }
    .voice-text-mic-pill:hover .vt-ic { color: #fff; }

    .voice-text-stop {
      position: fixed; z-index: 2001;
      height: 26px; min-width: 38px; padding: 0 10px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      border-radius: 13px;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: #fff; border: 1px solid #b91c1c;
      cursor: pointer; user-select: none;
      font-family: var(--font-interface);
      font-size: 12px; font-weight: 700; letter-spacing: 0.4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: transform .1s, box-shadow .12s;
      max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .voice-text-stop:hover { transform: translateY(-1px); }
    .voice-text-stop .vt-rec {
      width: 7px; height: 7px; border-radius: 50%; background: #fff;
      flex: 0 0 auto;
      box-shadow: 0 0 0 0 rgba(255,255,255,.6);
      animation: voice-text-rec 1.3s infinite;
    }
    .voice-text-stop .vt-preview {
      color: rgba(255,255,255,.8); font-weight: 500; font-size: 11px;
      max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .voice-text-stop .vt-x { opacity: .7; margin-left: 2px; }
    @keyframes voice-text-rec {
      0%,100%{box-shadow:0 0 0 0  rgba(255,255,255,.6);}
      50%   {box-shadow:0 0 0 5px rgba(255,255,255,0);}
    }

    /* Live transcript bubble — floats just above the Stop pill so the
       user sees recognition output even before it lands in the element. */
    .voice-text-bubble {
      position: fixed; z-index: 2002;
      max-width: 360px; min-width: 140px;
      padding: 8px 12px; border-radius: 10px;
      background: linear-gradient(135deg, #1f1f23 0%, #2a2a30 100%);
      color: #f5f5f5; border: 1px solid rgba(255,255,255,.08);
      font: 500 12px var(--font-interface); line-height: 1.4;
      box-shadow: 0 6px 20px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.04) inset;
      pointer-events: none;
      white-space: normal; overflow-wrap: anywhere;
      backdrop-filter: blur(8px);
    }
    .voice-text-bubble::after {
      content: ""; position: absolute; bottom: -5px; left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 9px; height: 9px;
      background: #2a2a30; border-right: 1px solid rgba(255,255,255,.08);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .voice-text-bubble .vt-bubble-interim { color: #a1a1aa; font-style: italic; }
    .voice-text-bubble .vt-bubble-empty { color: #71717a; font-style: italic; }

    /* Language switcher popup. */
    .voice-text-lang-pop {
      position: fixed; z-index: 2003;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,.45);
      padding: 4px 0;
      font: 500 12.5px var(--font-interface);
      max-height: 320px; overflow-y: auto; min-width: 180px;
    }
    .voice-text-lang-pop button {
      display: block; width: 100%;
      padding: 6px 14px; text-align: left;
      background: transparent; color: inherit; border: none;
      cursor: pointer; font: inherit;
    }
    .voice-text-lang-pop button:hover {
      background: var(--background-modifier-hover);
    }
    .voice-text-lang-pop button.is-current {
      color: var(--interactive-accent); font-weight: 700;
    }

    /* Stop pill gets a small lang chip. */
    .voice-text-stop .vt-lang {
      font-size: 10px; font-weight: 700; letter-spacing: .5px;
      padding: 2px 6px; border-radius: 6px;
      background: rgba(255,255,255,.12);
      color: rgba(255,255,255,.85);
      margin-right: 2px;
      cursor: pointer; pointer-events: auto;
    }
    .voice-text-stop .vt-lang:hover { background: rgba(255,255,255,.22); }

    /* Bottom-right placement-mode pill. */
    #${BOTTOM_PILL_ID} {
      position: fixed; right: 16px; bottom: 16px; z-index: 999999;
      padding: 9px 16px 9px 14px; border-radius: 999px;
      background: linear-gradient(135deg, #1f1f23 0%, #2a2a30 100%);
      color: #f5f5f5; border: 1px solid rgba(255,255,255,.08);
      font: 600 12.5px var(--font-interface); letter-spacing: .2px;
      box-shadow: 0 6px 20px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.04) inset;
      display: flex; gap: 9px; align-items: center;
      user-select: none; max-width: 60vw;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      backdrop-filter: blur(8px);
    }
    #${BOTTOM_PILL_ID} .vt-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #fb923c;
      box-shadow: 0 0 0 0 rgba(251,146,60,.55);
      animation: voice-text-pulse-orange 1.6s infinite;
    }
    @keyframes voice-text-pulse-orange {
      0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,.55);}
      50%   {box-shadow:0 0 0 8px rgba(251,146,60,0);}
    }
  `;
  document.head.appendChild(st);
}

// ---------------------------------------------------------------------------
// Skip-placement flag: set by the Templater startup template so auto-fires
// install the overlay WITHOUT entering placement mode (which would pop the
// bottom pill / crosshair on every leaf change). Manual icon clicks leave
// the flag unset, so placement mode triggers as normal.
// ---------------------------------------------------------------------------
const skipPlacement = !!win.__voiceTextSkipPlacement;
delete win.__voiceTextSkipPlacement;

// ---------------------------------------------------------------------------
// Dispatcher — script-run semantics.
//
//   not installed         → install overlay + enter placement
//   installed, idle       → enter placement
//   installed, placement  → cancel placement
//   installed, dictating  → soft stop (commit, keep Chrome warm)
//   installed, MENU mode  → full exit (kills Chrome, removes overlay)
//
// MENU mode = "user clicked icon twice in a row with no other action".
// Detect via timestamp: second run within 800 ms of last run + no
// placement / dictation in between → treat as full-exit request.
// ---------------------------------------------------------------------------
{
  const prior = win[STATE_KEY];
  const now = Date.now();
  if (prior && prior.active) {
    if (prior.view !== view) {
      await exitOverlay("view-change");
    } else if (skipPlacement) {
      return;
    } else if (prior.elementId) {
      await softStop("toggle"); prior.lastRunAt = now; return;
    } else if (prior.placementMode) {
      cancelPlacement("toggle"); prior.lastRunAt = now; return;
    } else {
      // Idle. If within double-click window of last run, fully exit.
      if (prior.lastRunAt && (now - prior.lastRunAt) < 800) {
        await exitOverlay("double-click");
        new ea.obsidian.Notice("Voice Text: overlay removed.", 1500);
        return;
      }
      prior.lastRunAt = now;
      enterPlacement();
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Fresh install for this view.
// ---------------------------------------------------------------------------
const state = {
  active: true,
  view, canvas,

  // Bridge
  server: null,
  child: null,
  userDataDir: null,
  startupTimer: null,
  chromeWarming: false,

  // Per-dictation
  elementId: null,
  elemBox: null,        // {x, y, w, h} — locked at placement, used for ALL commits
  baseText: "",
  sessionFinals: {},   // {sessionId: finalText} — replaced wholesale per event
  sessionInterim: "",  // current session's interim text
  pendingWrite: false,
  suppressed: false,
  gotFirstTranscript: false,
  bridgeToken: null,    // per-Chrome-instance identity (server filters by it)
  dictToken: null,      // per-dictation identity (server filters by it)

  // Modes
  placementMode: false,
  prevCursor: view.contentEl.style.cursor || "",

  // UI refs
  micPillEl: null,
  micPillForId: null,
  stopPillEl: null,
  stopPillPreviewEl: null,
  stopPillLangEl: null,
  bubbleEl: null,
  langPopEl: null,
  bottomPillEl: null,
  bottomPillLabelEl: null,
  dragRectEl: null,
  drag: null,
  currentLang: LANG,

  // Scheduler / observers
  schedSub: null,
  unsubScroll: null,
  resizeObs: null,

  // Event teardown
  cleanup: null,
};
state.lastRunAt = Date.now();
win[STATE_KEY] = state;
// Flag for the Templater startup template to avoid re-firing on this view.
view._voiceTextOverlayInstalled = true;

// ---------------------------------------------------------------------------
// Geometry + utils.
// ---------------------------------------------------------------------------
function sceneToScreen(sceneX, sceneY) {
  const st = api.getAppState();
  const z  = st.zoom?.value || 1;
  const cR = canvas.getBoundingClientRect();
  // appState.offsetLeft/offsetTop is Excalidraw's authoritative viewport
  // offset; cR.left is a fallback for older builds.
  const offX = (typeof st.offsetLeft === "number") ? st.offsetLeft : cR.left;
  const offY = (typeof st.offsetTop  === "number") ? st.offsetTop  : cR.top;
  return { x: offX + (sceneX + st.scrollX) * z, y: offY + (sceneY + st.scrollY) * z };
}
function getEl(id) {
  if (!id) return null;
  return ea.getViewElements().find(e => e.id === id) || null;
}
function isViewLive() {
  if (!view.contentEl?.isConnected) return false;
  const r = view.contentEl.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function forwardWheel(e) {
  e.preventDefault();
  canvas.dispatchEvent(new WheelEvent("wheel", {
    deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
    clientX: e.clientX, clientY: e.clientY,
    ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
    bubbles: true, cancelable: true,
  }));
}

// Layout convention shared with AI Edit / LaTeX Canvas / Export Element:
// [Voice] [TeX] [AI] [Group] [Export] centered above the element. Each
// script measures sibling widths each tick + computes the same total
// group width, then offsets to its own slot. Voice is leftmost (offset 0).
// Neighbor pill cache. Querying document.querySelector for 4 selectors
// every rAF is small but adds up across all pill scripts; cache the
// elements with a short TTL.
var _nbrCache = { t: 0, ai: null, tex: null, grp: null, exp: null, rzm: null, rzp: null };
function nbrPill(sel, key) {
  const now = performance.now();
  if (now - _nbrCache.t > 250) {
    _nbrCache.ai   = document.querySelector(".ai-edit-btn");
    _nbrCache.tex  = document.querySelector(".excali-tex-pill");
    _nbrCache.grp  = document.querySelector(".excali-group-pill");
    _nbrCache.exp  = document.querySelector(".excali-export-bar");
    _nbrCache.rzm  = document.querySelector(".excali-resize-minus");
    _nbrCache.rzp  = document.querySelector(".excali-resize-plus");
    _nbrCache.t    = now;
  }
  return _nbrCache[key];
}
function positionInGroup(btn, el) {
  const top = sceneToScreen(el.x + (el.width || 0) / 2, el.y);
  const W       = btn.offsetWidth   || 70;
  const AI_W    = nbrPill(null, "ai")?.offsetWidth  || 0;
  const TEX_W   = nbrPill(null, "tex")?.offsetWidth || 0;
  const GRP_W   = nbrPill(null, "grp")?.offsetWidth || 0;
  const EXP_W   = nbrPill(null, "exp")?.offsetWidth || 0;
  const RZM_W   = nbrPill(null, "rzm")?.offsetWidth || 0;
  const RZP_W   = nbrPill(null, "rzp")?.offsetWidth || 0;
  const GAP = 6;
  // Resize Pills (− / +) sit between TeX and AI as one block.
  const RZ_W = RZM_W + RZP_W + ((RZM_W && RZP_W) ? GAP : 0);
  const groupW = W
    + (TEX_W ? GAP + TEX_W : 0)
    + (RZ_W  ? GAP + RZ_W  : 0)
    + (AI_W  ? GAP + AI_W  : 0)
    + (GRP_W ? GAP + GRP_W : 0)
    + (EXP_W ? GAP + EXP_W : 0);
  const groupLeft = top.x - groupW / 2;
  let leftPx = Math.round(groupLeft);
  let topPx  = Math.round(top.y - 34);

  const elRight  = sceneToScreen(el.x + (el.width || 0), el.y).x;
  const elBottom = sceneToScreen(el.x, el.y + (el.height || 0)).y;
  const cRect = canvas.getBoundingClientRect();
  if (top.y > cRect.bottom || elBottom < cRect.top ||
      elRight < cRect.left || top.x   > cRect.right) {
    btn.style.display = "none"; return;
  }
  btn.style.display = "";
  if (topPx  < cRect.top + 6)  topPx  = Math.round(cRect.top + 6);
  if (leftPx < cRect.left + 6) leftPx = Math.round(cRect.left + 6);
  const maxLeft = cRect.right - W - 6;
  if (leftPx > maxLeft) leftPx = Math.round(maxLeft);
  // Skip DOM write if position is unchanged — eliminates layout thrash
  // during pan/zoom (scheduler fires every rAF; many ticks resolve to
  // the same integer pixel coords).
  if (btn._lastLeft !== leftPx || btn._lastTop !== topPx) {
    btn.style.left = `${leftPx}px`;
    btn.style.top  = `${topPx}px`;
    btn._lastLeft = leftPx;
    btn._lastTop  = topPx;
  }
}

// ---------------------------------------------------------------------------
// Mic pill (selection-anchored).
// ---------------------------------------------------------------------------
function ensureMicPill() {
  const s = win[STATE_KEY];
  if (!s) return null;
  if (s.micPillEl) return s.micPillEl;
  const btn = document.createElement("button");
  btn.className = "voice-text-mic-pill";
  btn.title = "Dictate into this text (Esc to stop)";
  // Inline mic SVG (Lucide-style, currentColor → theme-aware).
  const ic = document.createElement("span"); ic.className = "vt-ic";
  ic.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`;
  const lab = document.createElement("span"); lab.textContent = "Voice";
  btn.append(ic, lab);
  btn.onclick = (e) => {
    e.stopPropagation();
    const id = s.micPillForId;
    if (id) startDictation(id);
  };
  btn.addEventListener("wheel", forwardWheel, { passive: false });
  document.body.appendChild(btn);
  s.micPillEl = btn;
  return btn;
}
function removeMicPill() {
  const s = win[STATE_KEY];
  if (!s?.micPillEl) return;
  s.micPillEl.parentNode?.removeChild(s.micPillEl);
  s.micPillEl = null;
  s.micPillForId = null;
}
function renderMicPill() {
  const s = win[STATE_KEY];
  if (!s || !s.active) return;
  if (s.elementId) { removeMicPill(); return; }
  if (!isViewLive()) { removeMicPill(); return; }
  const st = api.getAppState();
  const ids = Object.keys(st.selectedElementIds || {});
  if (ids.length !== 1) { removeMicPill(); return; }
  const el = (api.getSceneElements() || []).find(e => e.id === ids[0]);
  if (!el || el.type !== "text") { removeMicPill(); return; }
  const zoom = st.zoom?.value || 1;
  if ((el.width || 0) * zoom < 50) { removeMicPill(); return; }

  const btn = ensureMicPill();
  s.micPillForId = el.id;
  positionInGroup(btn, el);
}

// ---------------------------------------------------------------------------
// Stop pill (dictation-anchored).
// ---------------------------------------------------------------------------
function ensureStopPill() {
  const s = win[STATE_KEY];
  if (!s) return null;
  if (s.stopPillEl) return s.stopPillEl;
  const btn = document.createElement("button");
  btn.className = "voice-text-stop";
  btn.title = "Stop dictation";
  const rec = document.createElement("span"); rec.className = "vt-rec";
  const lab = document.createElement("span"); lab.textContent = "Stop";
  const lang = document.createElement("span"); lang.className = "vt-lang";
  lang.textContent = (s.currentLang || LANG).split("-")[0].toUpperCase();
  lang.title = "Change language";
  lang.onclick = (e) => { e.stopPropagation(); openLangPop(); };
  const x   = document.createElement("span"); x.className = "vt-x"; x.textContent = "✕";
  btn.append(rec, lab, lang, x);
  btn.onclick = (e) => {
    // Only the main button area triggers stop — lang chip + x have their own handlers.
    if (e.target === lang || lang.contains(e.target)) return;
    e.stopPropagation();
    softStop("stop-btn");
  };
  btn.addEventListener("wheel", forwardWheel, { passive: false });
  document.body.appendChild(btn);
  s.stopPillEl = btn;
  s.stopPillLangEl = lang;
  s.stopPillPreviewEl = null;
  return btn;
}
function removeStopPill() {
  const s = win[STATE_KEY];
  if (!s?.stopPillEl) return;
  s.stopPillEl.parentNode?.removeChild(s.stopPillEl);
  s.stopPillEl = null;
  s.stopPillPreviewEl = null;
}
function setStopPreview(text) {
  // No-op: preview lives in the floating bubble now, not the pill.
}

// ---------------------------------------------------------------------------
// Live transcript bubble — floats above the Stop pill, shows interim + final
// in real time so user can verify recognition without watching the element.
// ---------------------------------------------------------------------------
function ensureBubble() {
  const s = win[STATE_KEY];
  if (!s) return null;
  if (s.bubbleEl) return s.bubbleEl;
  const b = document.createElement("div");
  b.className = "voice-text-bubble";
  document.body.appendChild(b);
  s.bubbleEl = b;
  return b;
}
function removeBubble() {
  const s = win[STATE_KEY];
  if (!s?.bubbleEl) return;
  s.bubbleEl.parentNode?.removeChild(s.bubbleEl);
  s.bubbleEl = null;
}
function renderBubble() {
  const s = win[STATE_KEY];
  if (!s || !s.active || !s.elementId || !s.stopPillEl) { removeBubble(); return; }
  const b = ensureBubble();
  const finalT = getFinalText();
  const interimT = (s.sessionInterim || "").trim();
  // Cache content; only update DOM on change. Critical for pan/zoom where
  // this fn fires every rAF but content rarely changes.
  const contentKey = finalT + "" + interimT;
  if (b._lastContent !== contentKey) {
    if (!finalT && !interimT) {
      b.innerHTML = `<span class="vt-bubble-empty">Listening…</span>`;
    } else {
      const esc = (t) => t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const finalPart   = finalT   ? esc(finalT)   : "";
      const interimPart = interimT ? `<span class="vt-bubble-interim">${finalT ? " " : ""}${esc(interimT)}</span>` : "";
      b.innerHTML = finalPart + interimPart;
    }
    b._lastContent = contentKey;
  }
  // Position above Stop pill. Round to integer px + skip write if same.
  const r = s.stopPillEl.getBoundingClientRect();
  const bw = b.offsetWidth || 200;
  const bh = b.offsetHeight || 30;
  let left = Math.round(r.left + r.width / 2 - bw / 2);
  let top  = Math.round(r.top - bh - 12);
  if (left < 8) left = 8;
  if (left + bw > window.innerWidth - 8) left = window.innerWidth - bw - 8;
  if (top < 8) top = Math.round(r.bottom + 12);
  if (b._lastLeft !== left || b._lastTop !== top) {
    b.style.left = `${left}px`;
    b.style.top  = `${top}px`;
    b._lastLeft = left;
    b._lastTop  = top;
  }
}

// ---------------------------------------------------------------------------
// Language switcher.
// ---------------------------------------------------------------------------
function closeLangPop() {
  const s = win[STATE_KEY];
  if (!s?.langPopEl) return;
  s.langPopEl.parentNode?.removeChild(s.langPopEl);
  s.langPopEl = null;
}
function openLangPop() {
  const s = win[STATE_KEY];
  if (!s) return;
  if (s.langPopEl) { closeLangPop(); return; }
  const pop = document.createElement("div");
  pop.className = "voice-text-lang-pop";
  for (const L of LANGS) {
    const b = document.createElement("button");
    b.textContent = `${L.label}  ·  ${L.code}`;
    if (L.code === s.currentLang) b.classList.add("is-current");
    b.onclick = (e) => { e.stopPropagation(); pickLang(L.code); };
    pop.appendChild(b);
  }
  document.body.appendChild(pop);
  // Anchor below the lang chip (or Stop pill).
  const anchor = s.stopPillLangEl || s.stopPillEl;
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth || 200;
  let left = r.left + r.width / 2 - pw / 2;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  let top = r.bottom + 6;
  if (top + pop.offsetHeight > window.innerHeight - 8) top = r.top - pop.offsetHeight - 6;
  pop.style.left = `${left}px`;
  pop.style.top  = `${top}px`;
  s.langPopEl = pop;
}
async function pickLang(code) {
  const s = win[STATE_KEY];
  if (!s) return;
  closeLangPop();
  if (code === s.currentLang) return;
  s.currentLang = code;
  // Persist.
  try {
    const _s = ea.getScriptSettings() || {};
    if (!_s.lang) _s.lang = { value: code, description: "" }; else _s.lang.value = code;
    ea.setScriptSettings(_s);
  } catch (_) {}
  // Update the chip on the Stop pill.
  if (s.stopPillLangEl) s.stopPillLangEl.textContent = code.split("-")[0].toUpperCase();
  // Restart Chrome with new lang. Kill current child + server, ensureBridge
  // on the next event will spawn fresh with updated URL query.
  if (s.child) {
    const c = s.child;
    s.child = null;
    try { c.removeAllListeners("exit"); } catch (_) {}
    try { c.kill("SIGTERM"); } catch (_) {}
    setTimeout(() => { try { c.kill("SIGKILL"); } catch (_) {} }, 1000);
  }
  if (s.server) { try { s.server.close(); } catch (_) {} s.server = null; }
  if (s.userDataDir && fs_?.rm) {
    fs_.rm(s.userDataDir, { recursive: true, force: true }, () => {});
    s.userDataDir = null;
  }
  // Force a fresh bridge with the new lang, then dictation continues
  // streaming into the same element.
  await ensureBridge(code);
}
function renderStopPill() {
  const s = win[STATE_KEY];
  if (!s || !s.elementId || !s.stopPillEl) return;
  const el = getEl(s.elementId);
  if (!el) { softStop("element-gone"); return; }
  positionInGroup(s.stopPillEl, el);
}

// ---------------------------------------------------------------------------
// Bottom pill (placement-mode hint).
// ---------------------------------------------------------------------------
function mountBottomPill() {
  const s = win[STATE_KEY];
  if (!s || s.bottomPillEl) return;
  document.getElementById(BOTTOM_PILL_ID)?.remove();
  const p = document.createElement("div");
  p.id = BOTTOM_PILL_ID;
  const dot = document.createElement("span"); dot.className = "vt-dot";
  const lab = document.createElement("span"); lab.textContent = "Drag a box on empty canvas (or click for default width) — then speak";
  p.append(dot, lab);
  document.body.appendChild(p);
  s.bottomPillEl = p;
  s.bottomPillLabelEl = lab;
}
function removeBottomPill() {
  const s = win[STATE_KEY];
  if (!s?.bottomPillEl) return;
  s.bottomPillEl.parentNode?.removeChild(s.bottomPillEl);
  s.bottomPillEl = null;
  s.bottomPillLabelEl = null;
}

// ---------------------------------------------------------------------------
// Shared rAF scheduler (one per leaf, shared across AI / Export / Voice).
// ---------------------------------------------------------------------------
const PILL_TICK_KEY = "__excaliPillTick_" + (view.leaf?.id || "default");
function ensurePillTick() {
  let sched = window[PILL_TICK_KEY];
  if (sched && sched.view === view) return sched;
  if (sched) { try { sched.stop(); } catch (_) {} }
  sched = { view, subs: new Set(), lastSig: "", running: true, handle: 0, pendingPasses: 0 };
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
  const fanout = () => { for (const fn of sched.subs) { try { fn(); } catch (_) {} } };
  const loop = () => {
    if (!sched.running) return;
    sched.handle = requestAnimationFrame(loop);
    sched.frame = (sched.frame | 0) + 1;
    if ((sched.frame & 1) && sched.pendingPasses <= 0) return;
    if (sched.subs.size === 0) return;
    const s = sig();
    if (s !== sched.lastSig) { sched.lastSig = s; fanout(); sched.pendingPasses = 1; }
    else if (sched.pendingPasses > 0) { sched.pendingPasses--; fanout(); }
  };
  sched.stop = () => {
    sched.running = false; cancelAnimationFrame(sched.handle);
    if (window[PILL_TICK_KEY] === sched) delete window[PILL_TICK_KEY];
  };
  sched.handle = requestAnimationFrame(loop);
  window[PILL_TICK_KEY] = sched;
  return sched;
}
pillTick = ensurePillTick();
const onTick = () => {
  const s = win[STATE_KEY];
  if (!s || !s.active) return;
  if (s.elementId) { renderStopPill(); renderBubble(); }
  else             { renderMicPill();  removeBubble(); }
};
pillTick.subs.add(onTick);
state.schedSub = onTick;
state.unsubScroll = api.onScrollChange?.(() => { pillTick.forceNext?.(); onTick(); });
if (typeof ResizeObserver === "function") {
  state.resizeObs = new ResizeObserver(() => { pillTick.forceNext?.(); onTick(); });
  state.resizeObs.observe(view.contentEl);
}

// ---------------------------------------------------------------------------
// Writing — coalesced via rAF. Append mode preserves baseText.
// ---------------------------------------------------------------------------
// Dedup overlapping word-suffix/prefix between consecutive session finals.
// Chrome auto-restarts SR on long silence; the new session's audio buffer
// can include the tail of the previous session, so the second session's
// transcript begins with words already finalised in the first. Stripping
// that overlap prevents "ye no why hi ye no why" repeats.
function dedupOverlap(prev, next) {
  if (!prev || !next) return next || "";
  const a = prev.split(/\s+/).filter(Boolean);
  const b = next.split(/\s+/).filter(Boolean);
  const max = Math.min(a.length, b.length);
  for (let k = max; k > 0; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (a[a.length - k + i].toLowerCase() !== b[i].toLowerCase()) { match = false; break; }
    }
    if (match) return b.slice(k).join(" ");
  }
  return next;
}
function getFinalText() {
  const s = win[STATE_KEY];
  if (!s) return "";
  // Concat session-final texts in sessionId order, deduping word overlap.
  const sids = Object.keys(s.sessionFinals || {})
    .map(Number).sort((a, b) => a - b);
  let acc = "";
  for (const sid of sids) {
    const t = (s.sessionFinals[sid] || "").trim();
    if (!t) continue;
    if (!acc) { acc = t; continue; }
    const tail = dedupOverlap(acc, t);
    if (tail) acc += " " + tail;
  }
  return acc.replace(/\s+/g, " ").trim();
}
// Soft text-wrap by character count. Excalidraw text elements only auto-wrap
// when bound to a container; bare text renders single-line. We insert \n
// breaks so the rendered text fills the placement box. originalText keeps
// the un-wrapped form (so future edits/transcripts re-wrap cleanly).
function wrapToWidth(text, widthPx, fontPx) {
  if (!text) return text;
  const approxCharW = Math.max(6, fontPx * 0.55);
  const maxChars = Math.max(8, Math.floor(widthPx / approxCharW));
  const out = [];
  for (const para of String(text).split("\n")) {
    if (para.length <= maxChars) { out.push(para); continue; }
    const toks = para.split(/(\s+)/);
    let line = "";
    for (const tok of toks) {
      if (!tok) continue;
      if ((line + tok).length > maxChars && line.trim().length) {
        out.push(line.replace(/\s+$/, ""));
        line = tok.replace(/^\s+/, "");
      } else {
        line += tok;
      }
    }
    if (line.trim().length) out.push(line);
  }
  return out.join("\n");
}
function combinedText() {
  const s = win[STATE_KEY];
  if (!s) return "";
  const base = (s.baseText || "").replace(/\s+$/, "");
  const finalT = getFinalText();
  const interimT = (s.sessionInterim || "").trim();
  const spoken = (finalT + (interimT ? " " + interimT : "")).trim();
  if (!base) return spoken;
  if (!spoken) return base;
  return base + (base.endsWith("\n") ? "" : " ") + spoken;
}
// Throttle element commits to WRITE_THROTTLE_MS minimum. Each commit is a
// full EA workbench round-trip (copy → mutate → refit → updateScene), which
// is heavy. At 60Hz that's ~10× more work than needed for visible smoothness.
function scheduleWrite() {
  const s = win[STATE_KEY];
  if (!s || !s.elementId) return;
  s.writeDirty = true;
  if (s.writeTimer) return;
  const now = performance.now();
  const elapsed = now - (s.lastWriteAt || 0);
  const delay = Math.max(0, WRITE_THROTTLE_MS - elapsed);
  s.writeTimer = setTimeout(async () => {
    const ss = win[STATE_KEY];
    if (!ss) return;
    ss.writeTimer = null;
    if (!ss.active || !ss.elementId || !ss.writeDirty) return;
    ss.writeDirty = false;
    ss.lastWriteAt = performance.now();
    const text = combinedText();
    try {
      const cur = getEl(ss.elementId);
      if (!cur) { softStop("element-gone"); return; }
      ea.reset();
      ea.copyViewElementsToEAforEditing([cur]);
      const eel = ea.getElement(ss.elementId);
      if (!eel) return;
      // Use the LOCKED elemBox so refits can't shrink the box.
      const box = ss.elemBox || { w: cur.width || WRAP_WIDTH, h: cur.height || 28, x: cur.x, y: cur.y };
      const wrapped = wrapToWidth(text, box.w, cur.fontSize || WRAP_FONT_SIZE);
      eel.text         = wrapped;
      eel.originalText = text;
      eel.rawText      = text;
      eel.autoResize   = false;
      eel.width        = box.w;
      eel.x            = box.x;
      eel.y            = box.y;
      // Skip refreshTextElementSize — it can override width.
      await ea.addElementsToView(false, false, false);
    } catch (err) {
      if (DEBUG) console.warn("Voice Text: stream-write failed", err);
    }
    // If more deltas arrived during the commit, re-arm.
    if (ss.writeDirty) scheduleWrite();
  }, delay);
}
function onTranscript(sessionFinal, sessionInterim, sessionId) {
  const s = win[STATE_KEY];
  if (!s || !s.active) { VLOG("onTranscript: drop-no-state"); return; }
  if (s.suppressed || !s.elementId) {
    VLOG("onTranscript: drop-suppressed", { suppressed: s.suppressed, hasEl: !!s.elementId, sessionId });
    s.sessionInterim = ""; return;
  }
  DLOG("onTranscript: accept", { sessionId, finalLen: (sessionFinal || "").length, interimLen: (sessionInterim || "").length });
  if (!s.gotFirstTranscript) {
    s.gotFirstTranscript = true;
    if (s.startupTimer) { clearTimeout(s.startupTimer); s.startupTimer = null; }
  }
  const finalT = (sessionFinal || "").replace(/\s+/g, " ").trim();
  const interimT = (sessionInterim || "").replace(/\s+/g, " ").trim();
  if (typeof sessionId === "number") {
    // REPLACE this session's final — never append. Growing/refining
    // emissions from Chrome supersede previous ones cleanly.
    if (finalT) s.sessionFinals[sessionId] = finalT;
    else        delete s.sessionFinals[sessionId];
    s.sessionInterim = interimT;
  } else {
    s.sessionInterim = interimT;
  }
  renderStopPill();
  renderBubble();
  scheduleWrite();
}
function onBridgeError(errStr) {
  if (errStr === "no-speech" || errStr === "aborted") return;
  if (errStr === "not-allowed" || errStr === "service-not-allowed") {
    new ea.obsidian.Notice("Voice Text: microphone permission denied in Chrome.", 4000);
    exitOverlay("perm-denied"); return;
  }
  if (errStr === "network") {
    new ea.obsidian.Notice(
      "Voice Text: bridge can't reach Google Speech. chromeBinary must be real Google Chrome.", 6000);
    exitOverlay("network"); return;
  }
  console.warn("Voice Text bridge error:", errStr);
}

// ---------------------------------------------------------------------------
// Bridge server + spawn.
// ---------------------------------------------------------------------------
function detectChrome() {
  if (CHROME_OVERRIDE) return CHROME_OVERRIDE;
  const plat = process.platform;
  let cands;
  if (plat === "linux") {
    cands = ["google-chrome-stable", "google-chrome", "google-chrome-beta", "google-chrome-unstable", "chrome"];
  } else if (plat === "darwin") {
    cands = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
    ];
  } else if (plat === "win32") {
    cands = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe`,
    ];
  } else { cands = ["google-chrome"]; }
  for (const c of cands) {
    if (c.includes("/") || c.includes("\\")) {
      try { if (fs_.existsSync(c)) return c; } catch (_) {}
    } else {
      try {
        const which = plat === "win32" ? "where" : "which";
        const out = child_process.execSync(`${which} ${c}`, { stdio: ["ignore","pipe","ignore"] })
          .toString().trim().split(/\r?\n/)[0];
        if (out) return out;
      } catch (_) {}
    }
  }
  return null;
}
function startServer() {
  return new Promise((resolve, reject) => {
    // Multiple Chrome bridges may be alive (zombies from prior crashes).
    // Each connects with its own bridgeToken (?bt=...). We track ONE
    // active bridgeToken; SSE connections from other bridges get a "die"
    // message and are dropped. /transcript from other bridges is silently
    // ignored. dictToken changes per dictation; /transcript must match
    // both to be processed.
    let activeBridgeToken = null;
    let activeDictToken   = null;
    const sseByBridge = new Map(); // bt → res (active live SSE)
    const pendingActiveCmds = [];  // queued for active bridge
    const qbt = (url) => {
      try { return new URL("http://x" + url).searchParams.get("bt") || ""; }
      catch (_) { return ""; }
    };
    function pushToActive(cmd) {
      const res = sseByBridge.get(activeBridgeToken);
      if (res) {
        try { res.write(`data: ${cmd}\n\n`); DLOG("server.pushCmd: sent", cmd); return; }
        catch (e) { DLOG("server.pushCmd: write-fail", e.message); sseByBridge.delete(activeBridgeToken); }
      }
      pendingActiveCmds.push(cmd);
      DLOG("server.pushCmd: queued", { cmd, pending: pendingActiveCmds.length });
    }
    const server = http_.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/bridge"))) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(BRIDGE_HTML.split(BRIDGE_HTML_DEBUG_PLACEHOLDER).join(DEBUG ? "true" : "false"));
        return;
      }
      if (req.method === "GET" && req.url.startsWith("/cmd")) {
        const bt = qbt(req.url);
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });
        try { res.write(`: hello\n\n`); } catch (_) {}
        if (bt !== activeBridgeToken) {
          // Stale Chrome — tell it to die.
          DLOG("server: SSE from stale bridge → die", { bt, active: activeBridgeToken });
          try { res.write(`data: die\n\n`); } catch (_) {}
          return;
        }
        sseByBridge.set(bt, res);
        DLOG("server: SSE connected (active)", { bt, pending: pendingActiveCmds.length });
        while (pendingActiveCmds.length) {
          const c = pendingActiveCmds.shift();
          try { res.write(`data: ${c}\n\n`); DLOG("server: SSE flush", c); } catch (_) {}
        }
        req.on("close", () => {
          if (sseByBridge.get(bt) === res) {
            sseByBridge.delete(bt);
            DLOG("server: SSE closed", { bt });
          }
        });
        return;
      }
      if (req.method === "POST" && req.url === "/transcript") {
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
          try {
            const d = JSON.parse(body);
            if (d.bridgeToken !== activeBridgeToken) {
              DLOG("server: /transcript drop-stale-bridge", { got: d.bridgeToken, active: activeBridgeToken });
            } else if (d.dictToken !== activeDictToken) {
              DLOG("server: /transcript drop-stale-dict", { got: d.dictToken, active: activeDictToken });
            } else {
              onTranscript(d.sessionFinal || "", d.sessionInterim || "", d.sessionId);
            }
          } catch (_) {}
          res.writeHead(204); res.end();
        });
        return;
      }
      if (req.method === "POST" && req.url.startsWith("/log")) {
        const bt = qbt(req.url);
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
          if (DEBUG) {
            try {
              const d = JSON.parse(body);
              const tag = (bt === activeBridgeToken) ? "" : "[stale]";
              console.log("[VoiceText/bridge]" + tag, d.msg, d.data || "");
            } catch (_) {}
          }
          res.writeHead(204); res.end();
        });
        return;
      }
      if (req.method === "POST" && req.url.startsWith("/error")) {
        const bt = qbt(req.url);
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
          if (bt === activeBridgeToken) onBridgeError((body || "").toString().trim());
          else VLOG("server: /error from stale bridge", { bt });
          res.writeHead(204); res.end();
        });
        return;
      }
      if (req.method === "POST" && req.url.startsWith("/ready")) {
        res.writeHead(204); res.end(); return;
      }
      res.writeHead(404); res.end();
    });
    server.pushCmd = pushToActive;
    server.setBridgeToken = (t) => {
      activeBridgeToken = t;
      // Kick all currently tracked SSEs that aren't the new active.
      for (const [bt, r] of sseByBridge) {
        if (bt !== t) {
          try { r.write(`data: die\n\n`); } catch (_) {}
          sseByBridge.delete(bt);
        }
      }
      DLOG("server.setBridgeToken", t);
    };
    server.setDictToken = (t) => { activeDictToken = t; DLOG("server.setDictToken", t); };
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}
// Pre-seed a Chrome user-data-dir with mic permission granted for our
// bridge origin. Eliminates the need for --use-fake-ui-for-media-stream
// (which triggers Chrome's yellow "unsupported command-line flag"
// warning bar) and prevents the mic permission prompt.
function preseedChromeProfile(userDataDir, origin) {
  const defaultDir = path_.join(userDataDir, "Default");
  try { fs_.mkdirSync(defaultDir, { recursive: true }); } catch (_) {}
  // Format: "origin,origin" → setting (1 = allow).
  const key = `${origin},*`;
  const prefs = {
    profile: {
      default_content_setting_values: { media_stream_mic: 1 },
      content_settings: {
        exceptions: {
          media_stream_mic: { [key]: { setting: 1 } }
        }
      }
    }
  };
  try {
    fs_.writeFileSync(path_.join(defaultDir, "Preferences"), JSON.stringify(prefs), "utf8");
  } catch (e) {
    console.warn("Voice Text: failed to seed Chrome Preferences:", e.message);
  }
  // "First Run" sentinel — skip Welcome wizard reliably.
  try { fs_.writeFileSync(path_.join(userDataDir, "First Run"), "", "utf8"); } catch (_) {}
}

// Try to hide the Chrome window post-spawn for window managers that
// ignore --window-position (tiling WMs like monadtall / i3 / sway / dwm).
// Best-effort: tries xdotool then wmctrl. Silent if neither exists.
function hideChromeWindow(titleSubstring) {
  // Re-attempt a few times because the window may not exist immediately.
  let tries = 0;
  const tick = () => {
    tries++;
    const xdoCmd = `xdotool search --name ${JSON.stringify(titleSubstring)} 2>/dev/null | head -n1`;
    child_process.exec(xdoCmd, (err, stdout) => {
      const winId = (stdout || "").trim().split(/\s+/)[0];
      if (winId) {
        // Try multiple hide strategies — any one succeeding is fine.
        child_process.exec(`xdotool windowminimize ${winId}`, () => {});
        child_process.exec(`xdotool windowunmap ${winId}`, () => {});
        child_process.exec(`wmctrl -i -r ${winId} -b add,hidden`, () => {});
        return;
      }
      if (tries < 10) setTimeout(tick, 300);
    });
  };
  setTimeout(tick, 200);
}

function killStaleBridges() {
  // Best-effort: kill any prior voice-bridge Chrome instances (from a
  // previous Obsidian crash, reload, or hot-replace). They keep posting
  // /transcript with stale tokens; safer to terminate them. Linux only.
  // pkill exits 1 when there's nothing to kill — treat that as success.
  if (process.platform !== "linux") return;
  child_process.exec(`pkill -f 'user-data-dir=.*voice-bridge-'`, () => {});
}
function spawnChrome(chromeBin, lang, bridgeToken) {
  const userDataDir = path_.join(os_.tmpdir(), `voice-bridge-${Date.now()}-${Math.floor(Math.random()*1e6)}`);
  try { fs_.mkdirSync(userDataDir, { recursive: true }); } catch (_) {}
  const origin = `http://127.0.0.1:${PORT}`;
  const url = `${origin}/bridge?lang=${encodeURIComponent(lang || LANG)}&token=${encodeURIComponent(bridgeToken)}`;
  preseedChromeProfile(userDataDir, origin);
  const args = [
    `--app=${url}`, `--user-data-dir=${userDataDir}`,
    "--window-size=1,1", "--window-position=-3000,-3000",
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run", "--no-default-browser-check",
    "--disable-features=TranslateUI,Translate,InfobarUiTimeUpdate",
    "--disable-sync", "--disable-background-networking",
    "--disable-extensions", "--disable-default-apps",
    "--disable-notifications", "--disable-popup-blocking",
    // The mic permission is now pre-granted via Preferences (see
    // preseedChromeProfile), so we no longer need
    // --use-fake-ui-for-media-stream (which causes Chrome's yellow
    // "unsupported command-line flag" warning bar).
  ];
  const child = child_process.spawn(chromeBin, args, { detached: false, stdio: "ignore" });
  child.on("error", (err) => {
    new ea.obsidian.Notice(`Voice Text: failed to launch Chrome (${err.message}).`, 5000);
    exitOverlay("chrome-spawn-fail");
  });
  child.on("exit", (code) => {
    const ss = win[STATE_KEY];
    if (ss && ss.active && ss.child === child) {
      new ea.obsidian.Notice(`Voice Text: Chrome exited unexpectedly (code ${code}).`, 4000);
      exitOverlay("chrome-exit");
    }
  });
  // Best-effort: hide the window on tiling WMs that ignore --window-position.
  // No-op on macOS/Windows or if xdotool/wmctrl aren't installed.
  if (process.platform === "linux") {
    hideChromeWindow("Voice Bridge");
  }
  return { child, userDataDir };
}
async function ensureBridge(lang) {
  const s = win[STATE_KEY];
  if (!s) return false;
  if (s.child && s.server) return true;
  if (s.chromeWarming) {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (s.child && s.server) return true;
      if (!s.active) return false;
    }
    return false;
  }
  s.chromeWarming = true;
  try {
    const chromeBin = detectChrome();
    if (!chromeBin) {
      new ea.obsidian.Notice(
        "Voice Text: Google Chrome not found. Install it (AUR: google-chrome) or set chromeBinary in settings.", 6000);
      exitOverlay("no-chrome"); return false;
    }
    // Kill any zombie Chromes left from prior crashes BEFORE we open the
    // port; they hold sockets and POST to /transcript with stale tokens.
    killStaleBridges();
    try { s.server = await startServer(); }
    catch (err) {
      new ea.obsidian.Notice(
        `Voice Text: port ${PORT} unavailable (${err.code || err.message}). Change bridgePort in settings.`, 6000);
      exitOverlay("server-fail"); return false;
    }
    s.bridgeToken = "br_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    s.server.setBridgeToken(s.bridgeToken);
    const { child, userDataDir } = spawnChrome(chromeBin, lang || s.currentLang || LANG, s.bridgeToken);
    s.child = child;
    s.userDataDir = userDataDir;
    return true;
  } finally {
    s.chromeWarming = false;
  }
}

// ---------------------------------------------------------------------------
// Start dictation on an existing element.
// ---------------------------------------------------------------------------
async function startDictation(elId) {
  const s = win[STATE_KEY];
  if (!s || !s.active) { VLOG("startDictation: no-state-or-inactive"); return; }
  if (s.elementId) { VLOG("startDictation: already-dictating", s.elementId); return; }
  const el = getEl(elId);
  if (!el || el.type !== "text") { VLOG("startDictation: bad-element", elId, el?.type); return; }
  VLOG("startDictation: begin", { elId, baseTextLen: (el.text || "").length, lastSeenSessionId: s.lastSeenSessionId, bridgeWarm: !!s.child });

  // Placement mode (if any) is no longer needed once dictation begins.
  if (s.placementMode) cancelPlacement("dictation-started");

  s.elementId   = elId;
  s.baseText    = el.text || "";
  s.sessionFinals = {};
  s.sessionInterim = "";
  s.suppressed  = false;
  s.gotFirstTranscript = false;
  // Lock the element's current box if not already set (mic-pill re-entry on
  // an existing text element).
  if (!s.elemBox || s.elemBox.x !== el.x || s.elemBox.y !== el.y) {
    s.elemBox = { x: el.x, y: el.y, w: el.width || WRAP_WIDTH, h: el.height || 28 };
  }
  DLOG("startDictation: elemBox", s.elemBox);

  removeMicPill();
  ensureStopPill();
  renderStopPill();
  try { pillTick?.forceNext?.(); } catch (_) {}

  s.startupTimer = setTimeout(() => {
    const ss = win[STATE_KEY];
    if (!ss || !ss.active || ss.gotFirstTranscript || !ss.elementId) return;
    new ea.obsidian.Notice("Voice Text: no audio received. Check Chrome mic / OS permissions.", 5000);
    softStop("startup-timeout");
  }, STARTUP_TIMEOUT_MS);

  const bridgeWasWarm = !!s.child;
  await ensureBridge();
  // Generate a fresh dictation token. Server only accepts transcripts
  // tagged with this token, so stale sessions / bridges are filtered
  // out structurally regardless of sessionId numbering.
  const dictToken = "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  s.dictToken = dictToken;
  try { s.server?.setDictToken?.(dictToken); } catch (_) {}
  VLOG("startDictation: bridge-ready", { wasWarm: bridgeWasWarm, bridgeToken: s.bridgeToken, dictToken });
  // Tell the bridge about the new dictation token. The bridge also stops
  // its current SR (clears ev.results) so the next emission carries only
  // new audio.
  try { s.server?.pushCmd?.("settoken:" + dictToken); VLOG("pushCmd: settoken", dictToken); }
  catch (e) { VLOG("pushCmd: fail", e.message); }
}

// ---------------------------------------------------------------------------
// Soft stop — commit + return to mic-pill mode. Chrome stays warm.
// ---------------------------------------------------------------------------
async function softStop(reason) {
  const s = win[STATE_KEY];
  if (!s || !s.active || !s.elementId) { VLOG("softStop: skip", reason); return; }
  VLOG("softStop: begin", reason);
  if (s.startupTimer) { clearTimeout(s.startupTimer); s.startupTimer = null; }
  if (s.writeTimer)   { clearTimeout(s.writeTimer);   s.writeTimer   = null; }

  const text = combinedText().trim();
  try {
    const cur = getEl(s.elementId);
    if (cur) {
      ea.reset();
      ea.copyViewElementsToEAforEditing([cur]);
      const eel = ea.getElement(s.elementId);
      if (eel) {
        const raw = text || cur.text || "";
        const box = s.elemBox || { w: cur.width || WRAP_WIDTH, x: cur.x, y: cur.y };
        eel.text         = wrapToWidth(raw, box.w, cur.fontSize || WRAP_FONT_SIZE);
        eel.originalText = raw;
        eel.rawText      = raw;
        eel.autoResize   = false;
        eel.width        = box.w;
        eel.x            = box.x;
        eel.y            = box.y;
        VLOG("softStop-commit", { w: box.w, rawLen: raw.length, x: box.x, y: box.y });
        await ea.addElementsToView(false, true, false);
      }
    }
  } catch (err) {
    console.warn("Voice Text: soft-stop commit failed", err);
  }

  s.elementId = null;
  s.baseText  = "";
  s.dictToken = null;
  s.elemBox   = null;
  try { s.server?.setDictToken?.(null); } catch (_) {}
  VLOG("softStop: end");
  s.sessionFinals = {};
  s.sessionInterim = "";
  s.suppressed = true;
  s.gotFirstTranscript = false;
  removeStopPill();
  removeBubble();
  closeLangPop();
  try { pillTick?.forceNext?.(); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Placement mode.
// ---------------------------------------------------------------------------
function enterPlacement() {
  const s = win[STATE_KEY];
  if (!s || !s.active) return;
  if (s.placementMode) return;
  s.placementMode = true;
  s.suppressed = true; // ignore any in-flight transcripts until element placed
  if (s.view?.contentEl) s.view.contentEl.style.cursor = "crosshair";
  mountBottomPill();
}
function cancelPlacement(reason) {
  const s = win[STATE_KEY];
  if (!s) return;
  s.placementMode = false;
  if (s.view?.contentEl) s.view.contentEl.style.cursor = s.prevCursor || "";
  removeBottomPill();
}

async function placeAndDictate(rect) {
  const s = win[STATE_KEY];
  if (!s || !s.active) return;
  let id = null;
  const elW = Math.max(40, rect.w || WRAP_WIDTH);
  const elH = Math.max(28, rect.h || 28);
  try {
    ea.reset();
    id = ea.addText(rect.x, rect.y, " ", {
      width: elW, height: elH, wrapAt: elW,
      autoResize: false, textAlign: "left", textVerticalAlign: "top",
    });
    VLOG("placeAndDictate: addText", { id, x: rect.x, y: rect.y, w: elW, h: elH });
    await ea.addElementsToView(false, true, false);
    // Defensive second pass: re-assert geometry. addText often sizes the
    // element to natural text width (~space-width) ignoring `width`.
    const cur = getEl(id);
    if (cur) {
      ea.reset();
      ea.copyViewElementsToEAforEditing([cur]);
      const eel = ea.getElement(id);
      if (eel) {
        eel.x = rect.x; eel.y = rect.y;
        eel.width = elW; eel.height = elH;
        eel.autoResize = false;
        await ea.addElementsToView(false, false, false);
      }
      const verify = getEl(id);
      DLOG("placeAndDictate: post-assert", { id, w: verify?.width, h: verify?.height, x: verify?.x, y: verify?.y });
    }
  } catch (err) {
    VLOG("placeAndDictate: addText-fail", err.message);
    console.error("Voice Text: addText failed", err);
    new ea.obsidian.Notice("Voice Text: failed to create text element.", 2500);
    return;
  }
  cancelPlacement("placed");
  // Lock the dragged box in state. All subsequent commits use elemBox.w/h
  // — never cur.width — so Excalidraw can't silently collapse the box
  // back to natural text width during streaming refits.
  s.elemBox = { x: rect.x, y: rect.y, w: elW, h: elH };
  await startDictation(id);
  const ss = win[STATE_KEY];
  if (ss) ss.baseText = "";
}

// ---------------------------------------------------------------------------
// Full overlay exit — kills Chrome + server + removes all DOM.
// ---------------------------------------------------------------------------
async function exitOverlay(reason) {
  const s = win[STATE_KEY];
  if (!s) return;
  s.active = false;
  if (s.startupTimer) { clearTimeout(s.startupTimer); s.startupTimer = null; }

  if (s.elementId) {
    const text = combinedText().trim();
    try {
      const cur = getEl(s.elementId);
      if (cur) {
        ea.reset();
        ea.copyViewElementsToEAforEditing([cur]);
        const eel = ea.getElement(s.elementId);
        if (eel) {
          const raw = text || cur.text || "";
          const box = s.elemBox || { w: cur.width || WRAP_WIDTH, x: cur.x, y: cur.y };
          eel.text         = wrapToWidth(raw, box.w, cur.fontSize || WRAP_FONT_SIZE);
          eel.originalText = raw;
          eel.rawText      = raw;
          eel.autoResize   = false;
          eel.width        = box.w;
          eel.x            = box.x;
          eel.y            = box.y;
          await ea.addElementsToView(false, true, false);
        }
      }
    } catch (err) {
      console.warn("Voice Text: final commit failed", err);
    }
  }

  try { s.cleanup && s.cleanup(); } catch (_) {}
  try { if (s.schedSub && pillTick) pillTick.subs.delete(s.schedSub); } catch (_) {}
  if (pillTick && pillTick.subs.size === 0) { try { pillTick.stop(); } catch (_) {} }
  try { if (typeof s.unsubScroll === "function") s.unsubScroll(); } catch (_) {}
  try { s.resizeObs?.disconnect(); } catch (_) {}

  if (s.child) {
    const c = s.child;
    s.child = null;
    try { c.removeAllListeners("exit"); } catch (_) {}
    try { c.kill("SIGTERM"); } catch (_) {}
    setTimeout(() => { try { c.kill("SIGKILL"); } catch (_) {} }, 1500);
  }
  if (s.server) { try { s.server.close(); } catch (_) {} s.server = null; }
  if (s.userDataDir && fs_?.rm) {
    fs_.rm(s.userDataDir, { recursive: true, force: true }, () => {});
  }

  removeMicPill();
  removeStopPill();
  removeBubble();
  closeLangPop();
  removeBottomPill();
  if (s.view?.contentEl) s.view.contentEl.style.cursor = s.prevCursor || "";
  try { delete s.view._voiceTextOverlayInstalled; } catch (_) {}

  delete win[STATE_KEY];
}

// ---------------------------------------------------------------------------
// Event wiring.
// ---------------------------------------------------------------------------
// Drag-to-box placement. mousedown starts a preview rect; mousemove updates
// width/height; mouseup creates a text element of those dims. If the user
// only clicked (< DRAG_THRESHOLD_PX movement), fall back to a single-line
// element of DEFAULT_WRAP_WIDTH starting at the click point.
function clientToScene(clientX, clientY) {
  const st = api.getAppState();
  const cRect = canvas.getBoundingClientRect();
  const z = st.zoom?.value || 1;
  // Use Excalidraw's own offsetLeft/offsetTop so placement matches what
  // the renderer paints. Fall back to bounding-rect for older builds.
  const offX = (typeof st.offsetLeft === "number") ? st.offsetLeft : cRect.left;
  const offY = (typeof st.offsetTop  === "number") ? st.offsetTop  : cRect.top;
  const out = {
    x: (clientX - offX) / z - st.scrollX,
    y: (clientY - offY) / z - st.scrollY,
    z, cRect,
  };
  DLOG("clientToScene", {
    clientX, clientY, offsetLeft: st.offsetLeft, offsetTop: st.offsetTop,
    cRectLeft: cRect.left, cRectTop: cRect.top, scrollX: st.scrollX, scrollY: st.scrollY,
    zoom: z, sceneX: out.x, sceneY: out.y,
  });
  return out;
}
function mountDragRect() {
  const s = win[STATE_KEY];
  if (!s || s.dragRectEl) return;
  const d = document.createElement("div");
  d.className = "voice-text-drag-rect";
  d.style.cssText =
    "position:fixed;pointer-events:none;border:1.5px dashed var(--interactive-accent,#7c4dff);" +
    "background:rgba(124,77,255,0.08);border-radius:3px;z-index:9999;display:none;";
  document.body.appendChild(d);
  s.dragRectEl = d;
}
function removeDragRect() {
  const s = win[STATE_KEY];
  if (!s?.dragRectEl) return;
  s.dragRectEl.parentNode?.removeChild(s.dragRectEl);
  s.dragRectEl = null;
}
const onCanvasPointerDown = (e) => {
  const s = win[STATE_KEY];
  if (!s || !s.active || !s.placementMode || s.elementId) return;
  if (e.button !== 0) return;
  // Defer one tick so Excalidraw selection updates first; if the press hit
  // an existing element, drop placement and let normal selection win.
  setTimeout(() => {
    const ss = win[STATE_KEY];
    if (!ss || !ss.active || !ss.placementMode || ss.elementId) return;
    const st = api.getAppState();
    const sel = Object.keys(st.selectedElementIds || {});
    if (sel.length > 0) { cancelPlacement("clicked-existing"); return; }
  }, 30);
  e.preventDefault(); e.stopPropagation();
  mountDragRect();
  s.drag = {
    startClientX: e.clientX, startClientY: e.clientY,
    startScene: clientToScene(e.clientX, e.clientY),
    moved: false,
  };
};
const onCanvasPointerMove = (e) => {
  const s = win[STATE_KEY];
  if (!s?.drag) return;
  const d = s.drag;
  const dx = e.clientX - d.startClientX;
  const dy = e.clientY - d.startClientY;
  if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
  d.moved = true;
  const left = Math.min(e.clientX, d.startClientX);
  const top  = Math.min(e.clientY, d.startClientY);
  const w    = Math.abs(dx);
  const h    = Math.abs(dy);
  if (s.dragRectEl) {
    const r = s.dragRectEl;
    r.style.display = "block";
    r.style.left = left + "px";
    r.style.top  = top  + "px";
    r.style.width  = w + "px";
    r.style.height = h + "px";
  }
};
const onCanvasPointerUp = (e) => {
  const s = win[STATE_KEY];
  if (!s?.drag) return;
  const d = s.drag;
  s.drag = null;
  removeDragRect();
  const ss = win[STATE_KEY];
  if (!ss || !ss.active || !ss.placementMode || ss.elementId) return;
  const endScene = clientToScene(e.clientX, e.clientY);
  const rect = d.moved
    ? {
        x: Math.min(d.startScene.x, endScene.x),
        y: Math.min(d.startScene.y, endScene.y),
        w: Math.abs(endScene.x - d.startScene.x),
        h: Math.abs(endScene.y - d.startScene.y),
      }
    : { x: d.startScene.x, y: d.startScene.y, w: WRAP_WIDTH, h: 0 };
  placeAndDictate(rect);
};

const onKey = (e) => {
  const s = win[STATE_KEY];
  if (!s || !s.active) return;
  if (e.key === "Escape") {
    if (s.langPopEl) { e.preventDefault(); e.stopPropagation(); closeLangPop(); return; }
    if (s.elementId)      { e.preventDefault(); e.stopPropagation(); softStop("esc"); }
    else if (s.placementMode) { e.preventDefault(); e.stopPropagation(); cancelPlacement("esc"); }
  }
};

const onDocPointerForPop = (e) => {
  const s = win[STATE_KEY];
  if (!s || !s.langPopEl) return;
  if (s.langPopEl.contains(e.target))   return;
  if (s.stopPillEl?.contains(e.target)) return;
  closeLangPop();
};
document.addEventListener("pointerdown", onDocPointerForPop, true);

canvas.addEventListener("pointerdown", onCanvasPointerDown, true);
window.addEventListener("pointermove", onCanvasPointerMove, true);
window.addEventListener("pointerup",   onCanvasPointerUp, true);
window.addEventListener("keydown", onKey, true);
state.cleanup = () => {
  canvas.removeEventListener("pointerdown", onCanvasPointerDown, true);
  window.removeEventListener("pointermove", onCanvasPointerMove, true);
  window.removeEventListener("pointerup",   onCanvasPointerUp, true);
  window.removeEventListener("keydown", onKey, true);
  document.removeEventListener("pointerdown", onDocPointerForPop, true);
  removeDragRect();
};

// ---------------------------------------------------------------------------
// Initial state — overlay installed, mic pill auto-tracks selection.
// Manual run also enters placement mode. Startup-template auto-fires (with
// skipPlacement flag) install only — no placement, no Notice.
// ---------------------------------------------------------------------------
if (!skipPlacement) {
  enterPlacement();
  new ea.obsidian.Notice(
    "Voice Text active. Click canvas to create + speak, or 🎤 above a selected text. Click icon again to cancel placement.",
    4000);
}
onTick();
/*
```
*/
