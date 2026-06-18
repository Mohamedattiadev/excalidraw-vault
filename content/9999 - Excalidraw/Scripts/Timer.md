---
excalidraw-plugin: parsed
---

/*
Timer — Pomodoro / focus countdown for Excalidraw work sessions.

Features:
  - Draggable floating panel with big countdown.
  - Modes: 25/5, 50/10, 90/20 (ultradian), custom.
  - Day-budget progress bar (set target pomodoros/hours per day).
  - Streak counter — consecutive days hitting the daily budget.
  - Auto-pause on idle: 3.5min of zero canvas pointer activity pauses
    silently. Resume on first canvas event.
  - Canvas dim on break: the .static canvas fades to 30% during break
    interval to force step-away.
  - Stats persisted via ea.setScriptSettings (per-day pomodoro counts,
    last day, streak).

Re-running the script toggles the panel.

```javascript
*/
const PANEL_ID = "excali-timer-panel";
const STYLE_ID = "excali-timer-style";
const IDLE_MS = 3.5 * 60 * 1000;
const KEY = "Timer state";

const MODES = {
  "25/5":  { work: 25 * 60, rest: 5 * 60 },
  "50/10": { work: 50 * 60, rest: 10 * 60 },
  "90/20": { work: 90 * 60, rest: 20 * 60 },
};

// ---------- Persisted stats + settings ----------
const settings = ea.getScriptSettings() || {};
let dirty = false;
// Remove stale About entry from earlier versions.
if (settings["About"]) { delete settings["About"]; dirty = true; }
if (!settings["Daily target (pomodoros)"]) {
  settings["Daily target (pomodoros)"] = {
    value: 6,
    description: "Number of completed work intervals the day-budget bar treats as 100%."
  };
  dirty = true;
}
if (!settings[KEY]) {
  settings[KEY] = { value: { history: {}, lastDay: null, streak: 0 } };
  dirty = true;
}
if (dirty) await ea.setScriptSettings(settings);

const targetPomos = Math.max(1, parseInt(settings["Daily target (pomodoros)"].value, 10) || 6);
const stats = settings[KEY].value;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function yesterdayKey() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
async function persistStats() {
  settings[KEY].value = stats;
  await ea.setScriptSettings(settings);
}

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }

// ---------- shared float-panel z-index stack + modal-aware auto-hide ----------
const PANEL_Z_BASE = 50;
const PANEL_Z_MAX  = 70;
function cfRaisePanel(el) {
  if (!el) return;
  if (typeof window.__excaliPanelZ !== "number") window.__excaliPanelZ = PANEL_Z_BASE;
  window.__excaliPanelZ = window.__excaliPanelZ >= PANEL_Z_MAX ? PANEL_Z_BASE : window.__excaliPanelZ + 1;
  el.style.zIndex = String(window.__excaliPanelZ);
}
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

// ---------- toggle if open ----------
const existing = document.getElementById(PANEL_ID);
if (existing) {
  const hidden = existing.style.display === "none";
  existing.style.display = hidden ? "" : "none";
  if (hidden) cfRaisePanel(existing);
  return;
}

// ---------- per-session state cached on window ----------
let t = window.__excaliTimer;
if (!t) {
  t = {
    mode: "25/5",
    customWork: 25 * 60,
    customRest: 5 * 60,
    phase: "work",     // "work" | "rest"
    remaining: MODES["25/5"].work,
    running: false,
    rafTimer: null,
    lastTick: null,
    pausedReason: null,    // "idle" if auto-paused
    pomodoros: stats.history[todayKey()] || 0,
  };
  window.__excaliTimer = t;
}

// ---------- styles ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .excali-timer {
      position: absolute; top: 60px; right: 16px;
      width: 280px; padding: 14px 16px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.32);
      z-index: 50; font-family: var(--font-interface); font-size: 13px;
    }
    .excali-timer .et-header {
      display:flex; justify-content:space-between; align-items:center;
      padding-bottom:8px; margin-bottom:8px;
      border-bottom:1px solid var(--background-modifier-border);
      cursor: grab; user-select: none;
    }
    .excali-timer .et-header:active { cursor: grabbing; }
    .excali-timer .et-title { font-weight: 600; }
    .excali-timer .et-close { cursor: pointer; color: var(--text-muted); padding: 0 4px; }
    .excali-timer .et-close:hover { color: var(--text-normal); }
    .excali-timer .et-display {
      font-size: 52px; font-weight: 800; text-align: center;
      font-variant-numeric: tabular-nums;
      padding: 12px 0 4px;
      letter-spacing: -1px;
      cursor: pointer;
      transition: color 0.1s;
    }
    .excali-timer .et-display:hover { color: var(--interactive-accent); }
    .excali-timer .et-display-edit {
      font-size: 36px; font-weight: 700; text-align: center;
      width: 140px; margin: 12px auto 4px; display: block;
      padding: 6px 10px; border-radius: 8px;
      background: var(--background-secondary);
      border: 2px solid var(--interactive-accent);
      color: var(--text-normal); font-variant-numeric: tabular-nums;
    }
    .excali-timer .et-display-edit:focus { outline: none; }
    .excali-timer .et-phase {
      text-align: center; font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px;
    }
    .excali-timer .et-phase.is-rest { color: var(--text-success, #51cf66); }
    .excali-timer .et-row { display:flex; gap:6px; margin-bottom: 8px; }
    .excali-timer .et-row > button {
      flex:1; padding: 6px 10px; border-radius: 6px;
      background: var(--interactive-normal); color: var(--text-normal);
      border: 1px solid var(--background-modifier-border);
      cursor: pointer; font-size: 12px;
    }
    .excali-timer .et-row > button.is-accent {
      background: var(--interactive-accent); color: var(--text-on-accent); border-color: transparent;
    }
    .excali-timer .et-modes { display:flex; gap:4px; margin-bottom: 8px; }
    .excali-timer .et-modes > div {
      flex:1; padding: 4px; text-align: center; cursor: pointer;
      border-radius: 5px; font-size: 11px;
      background: var(--background-secondary); color: var(--text-muted);
    }
    .excali-timer .et-modes > div.is-active {
      background: var(--interactive-accent); color: var(--text-on-accent); font-weight: 600;
    }
    .excali-timer .et-bar-wrap {
      height: 6px; background: var(--background-secondary);
      border-radius: 3px; overflow: hidden; margin-bottom: 4px;
    }
    .excali-timer .et-bar {
      height: 100%; background: var(--interactive-accent);
      transition: width 0.2s;
    }
    .excali-timer .et-stats {
      display:flex; justify-content: space-between; font-size: 11px;
      color: var(--text-muted); padding-top: 4px;
      border-top: 1px dashed var(--background-modifier-border);
      margin-top: 6px;
    }
    .excali-timer .et-stats b { color: var(--text-normal); }
    .excali-timer .et-idle-tag {
      font-size: 10px; text-align: center; color: var(--text-warning, #ffa940);
      margin-top: -4px; margin-bottom: 6px;
      min-height: 12px;
    }
    .excali-canvas-break { transition: opacity 0.4s; opacity: 0.3 !important; }
    .excali-timer .et-row > button[data-act="lock"] {
      flex: 0 0 32px; padding: 6px; display:flex; align-items:center; justify-content:center;
    }
    .excali-timer .et-row > button[data-act="lock"].is-on {
      background: var(--text-error, #e74c3c); color: white; border-color: transparent;
    }
    /* When the timer focus-lock is engaged, this overlay sits ONLY
       over the Excalidraw canvas (parented to view.contentEl with
       position: absolute) so the rest of the Obsidian UI — left
       sidebar, ribbon, file tabs, developer console — stays
       interactive. The timer panel sits at a higher z-index so
       its buttons (incl. unlock) still receive their own clicks. */
    .excali-focus-overlay {
      position: absolute; inset: 0;
      z-index: 40;
      background: rgba(0,0,0,0.05);
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(s);
}

// ---------- panel ----------
const panel = document.createElement("div");
panel.id = PANEL_ID;
panel.className = "excali-timer excali-floating-panel";
panel.innerHTML = `
  <div class="et-header">
    <span class="et-title">⏱ Timer</span>
    <span class="et-close" title="Hide">✕</span>
  </div>
  <div class="et-display" data-display>25:00</div>
  <div class="et-phase" data-phase>Work</div>
  <div class="et-idle-tag" data-idle></div>
  <div class="et-modes">
    <div data-mode="25/5">25/5</div>
    <div data-mode="50/10">50/10</div>
    <div data-mode="90/20">90/20</div>
    <div data-mode="custom">⌨</div>
  </div>
  <div class="et-row">
    <button class="is-accent" data-act="toggle">Start</button>
    <button data-act="reset">Reset</button>
    <button data-act="skip">Skip</button>
    <button data-act="lock" title="Lock canvas — disables drawing while focused">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </button>
  </div>
  <div class="et-bar-wrap"><div class="et-bar" data-bar style="width: 0%"></div></div>
  <div class="et-stats">
    <span data-today-label>Today: <b data-pomos>0</b> / ${targetPomos}</span>
    <span>Streak: <b data-streak>${stats.streak}</b> 🔥</span>
  </div>
`;
const _panelHost =
  view.contentEl.querySelector(".excalidraw") || view.contentEl;
if (_panelHost && getComputedStyle(_panelHost).position === "static") {
  _panelHost.style.position = "relative";
}
_panelHost.appendChild(panel);
cfRaisePanel(panel);
panel.addEventListener("mousedown", () => cfRaisePanel(panel), true);

const displayEl = panel.querySelector("[data-display]");
const phaseEl   = panel.querySelector("[data-phase]");
const idleEl    = panel.querySelector("[data-idle]");
const barEl     = panel.querySelector("[data-bar]");
const pomosEl   = panel.querySelector("[data-pomos]");
const streakEl  = panel.querySelector("[data-streak]");

panel.querySelector(".et-close").onclick = () => { panel.style.display = "none"; };

// Click the time display -> inline edit. Accepts "MM:SS" or "MM" or "H:MM:SS".
displayEl.onclick = () => {
  if (t.running) pauseTimer("user");
  const input = document.createElement("input");
  input.type = "text"; input.className = "et-display-edit";
  input.value = fmt(t.remaining);
  displayEl.replaceWith(input);
  input.focus(); input.select();
  const commit = () => {
    const parts = input.value.trim().split(":").map(s => parseInt(s, 10));
    let secs = 0;
    if (parts.length === 1) secs = (parts[0] || 0) * 60;
    else if (parts.length === 2) secs = (parts[0] || 0) * 60 + (parts[1] || 0);
    else if (parts.length === 3) secs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    if (secs > 0) {
      t.remaining = secs;
      if (t.phase === "work") t.customWork = secs;
      else t.customRest = secs;
      t.mode = "custom";
      syncModes();
    }
    input.replaceWith(displayEl);
    render();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { input.replaceWith(displayEl); render(); }
  });
};

// drag header
(function () {
  let dragging = false, ox = 0, oy = 0;
  const header = panel.querySelector(".et-header");
  header.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("et-close")) return;
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
    panel.style.right = "auto";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
  window.addEventListener("resize", () => {
    const hr = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const cl = panel.offsetLeft, ct = panel.offsetTop;
    if (cl + w > hr.width  - m) panel.style.left = `${Math.max(m, hr.width  - w - m)}px`;
    if (ct + h > hr.height - m) panel.style.top  = `${Math.max(m, hr.height - h - m)}px`;
    if (cl < m) panel.style.left = `${m}px`;
    if (ct < m) panel.style.top  = `${m}px`;
  });
})();

// mode picker
panel.querySelectorAll("[data-mode]").forEach(el => {
  el.onclick = () => {
    const m = el.getAttribute("data-mode");
    if (m === "custom") { displayEl.click(); return; }
    t.mode = m;
    t.phase = "work";
    t.remaining = MODES[m].work;
    syncModes(); render();
  };
});
function syncModes() {
  panel.querySelectorAll("[data-mode]").forEach(el => {
    el.classList.toggle("is-active", el.getAttribute("data-mode") === t.mode);
  });
}
syncModes();

// actions
panel.querySelector('[data-act="toggle"]').onclick = () => {
  if (t.running) pauseTimer("user");
  else startTimer();
};
panel.querySelector('[data-act="reset"]').onclick = () => {
  t.phase = "work";
  t.remaining = MODES[t.mode]?.work || t.customWork;
  pauseTimer("user"); render();
};
panel.querySelector('[data-act="skip"]').onclick = () => {
  finishPhase();
};
const lockBtn = panel.querySelector('[data-act="lock"]');
let canvasLocked = false;
let lockOverlayEl = null;
function applyLock() {
  lockBtn.classList.toggle("is-on", canvasLocked);
  if (canvasLocked) {
    if (!lockOverlayEl) {
      lockOverlayEl = document.createElement("div");
      lockOverlayEl.className = "excali-focus-overlay";
      // Swallow every pointer / touch / wheel event that lands on the
      // overlay so drawing, panning, selection, and shape creation are
      // all blocked. The timer panel has a higher z-index so its buttons
      // still receive their own clicks.
      ["pointerdown","pointermove","pointerup","mousedown","mousemove",
       "mouseup","click","dblclick","wheel","touchstart","touchmove","touchend"]
        .forEach(ev => lockOverlayEl.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, true));
      // Parent to view.contentEl so the overlay is scoped to the
      // Excalidraw canvas only. Falls back to body if contentEl is
      // missing (popout closed etc.) — better to over-lock than to
      // leak a lingering overlay reference.
      const host = view?.contentEl || document.body;
      // Ensure the host can position absolute children. view.contentEl
      // is usually relative; nudge it if it isn't.
      const cs = window.getComputedStyle(host);
      if (cs.position === "static") host.style.position = "relative";
      host.appendChild(lockOverlayEl);
    }
  } else {
    if (lockOverlayEl) { lockOverlayEl.remove(); lockOverlayEl = null; }
  }
}
lockBtn.onclick = () => { canvasLocked = !canvasLocked; applyLock(); };

// ---------- idle tracking ----------
let lastActivity = Date.now();
const activityHandler = () => {
  lastActivity = Date.now();
  if (t.running === false && t.pausedReason === "idle") {
    t.pausedReason = null;
    startTimer();
  }
};
const canvasEl = view.contentEl.querySelector("canvas.interactive");
if (canvasEl) {
  canvasEl.addEventListener("pointerdown", activityHandler, true);
  canvasEl.addEventListener("pointermove", activityHandler, true);
}

// ---------- tick ----------
function startTimer() {
  if (t.running) return;
  t.running = true;
  t.lastTick = Date.now();
  applyBreakDim();
  panel.querySelector('[data-act="toggle"]').textContent = "Pause";
  loop();
}
function pauseTimer(reason) {
  t.running = false;
  if (t.rafTimer) { clearTimeout(t.rafTimer); t.rafTimer = null; }
  t.pausedReason = reason === "idle" ? "idle" : null;
  panel.querySelector('[data-act="toggle"]').textContent = "Start";
  applyBreakDim();
}
function loop() {
  if (!t.running) return;
  const now = Date.now();
  const dt = (now - t.lastTick) / 1000;
  t.lastTick = now;
  t.remaining = Math.max(0, t.remaining - dt);
  render();

  if (now - lastActivity > IDLE_MS && t.phase === "work") {
    pauseTimer("idle");
    return;
  }
  if (t.remaining <= 0) { finishPhase(); return; }
  t.rafTimer = setTimeout(loop, 250);
}
async function finishPhase() {
  const wasWork = t.phase === "work";
  if (t.rafTimer) { clearTimeout(t.rafTimer); t.rafTimer = null; }
  t.running = false;
  if (wasWork) {
    t.pomodoros++;
    const today = todayKey();
    stats.history[today] = (stats.history[today] || 0) + 1;
    // streak update only when crossing the daily target boundary
    if (stats.history[today] === targetPomos) {
      if (stats.lastDay === yesterdayKey()) stats.streak++;
      else if (stats.lastDay !== today) stats.streak = 1;
      stats.lastDay = today;
    }
    await persistStats();
    t.phase = "rest";
    t.remaining = MODES[t.mode]?.rest || t.customRest;
    notify(`Work done — break ${fmt(t.remaining)}`);
  } else {
    t.phase = "work";
    t.remaining = MODES[t.mode]?.work || t.customWork;
    notify(`Break done — back to work`);
  }
  startTimer();
}
function notify(msg) {
  try { new Notification("Timer", { body: msg }); } catch (_) {}
  new ea.obsidian.Notice(msg);
}

// ---------- canvas dim on break ----------
function applyBreakDim() {
  const statics = view.contentEl.querySelectorAll(".excalidraw__canvas.static");
  const on = t.running && t.phase === "rest";
  statics.forEach(c => c.classList.toggle("excali-canvas-break", on));
}

// ---------- render ----------
function fmt(seconds) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function render() {
  displayEl.textContent = fmt(t.remaining);
  phaseEl.textContent = t.phase === "work" ? "Work" : "Break";
  phaseEl.classList.toggle("is-rest", t.phase === "rest");
  idleEl.textContent = t.pausedReason === "idle" ? "⏸ Auto-paused (idle)" : "";
  const today = stats.history[todayKey()] || 0;
  t.pomodoros = today;
  pomosEl.textContent = today;
  streakEl.textContent = stats.streak;
  const pct = Math.min(100, (today / targetPomos) * 100);
  barEl.style.width = `${pct}%`;
  // Once the target is reached, drop the "/target" denominator and show a
  // check — chasing the target after hitting it (10/6) reads as nonsense.
  const todayLabel = panel.querySelector("[data-today-label]");
  if (todayLabel) {
    if (today >= targetPomos) {
      todayLabel.innerHTML = `Today: <b data-pomos>${today}</b> ✓`;
    } else {
      todayLabel.innerHTML = `Today: <b data-pomos>${today}</b> / ${targetPomos}`;
    }
  }
  applyBreakDim();
}
render();
/*
```
*/
