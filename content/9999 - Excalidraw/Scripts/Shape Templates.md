---
excalidraw-plugin: parsed
---

/*
Shape Templates — reusable stencil library for Excalidraw.

Reads template .json files from a vault folder, shows a floating picker panel,
inserts the chosen template at the next canvas click (or at canvas center).
Also saves the current selection as a new template.

First run bootstraps a starter pack into the templates folder if empty.
Each template file is a JSON array of raw Excalidraw element objects.

```javascript
*/

// ---------- constants ----------
const TEMPLATES_FOLDER = "9999 - Excalidraw/Templates";
const KEY = "Shape Templates config";
const PANEL_ID = "shape-templates-panel";
const STYLE_ID = "shape-templates-style";
const DEFAULTS = { anchor: "click", cat: "all", recent: [], favorites: [], sort: "name", density: "M", usage: {}, panelW: 248, panelH: null };
const CATEGORIES = ["all", "fav", "general", "process", "architecture", "uml", "diagrams", "security", "math", "devops", "webui", "brand", "icons", "library", "user"];
const CAT_LABEL = { all:"All", fav:"★", general:"Gen", process:"Proc", architecture:"Arch", uml:"UML", diagrams:"Diag", security:"Sec", math:"Math", devops:"DevOps", webui:"UI", brand:"Brand", icons:"Icons", library:"Lib", user:"Mine" };

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }
const Notice = ea.obsidian.Notice;
const vault = app.vault;

// Hoisted helpers reference these — must be `var` (TDZ trap on re-run).
var TEMPLATES = [];                 // [{name, path, elements, count}]
var ARMED = null;                   // currently armed template (waiting for canvas click)
var ARMED_HANDLER = null;           // cleanup fn

// ---------- icons ----------
var ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
var ICON_REFRESH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>`;
var ICON_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
var ICON_TARGET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
var ICON_CENTER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;
var ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
var ICON_X = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

// ---------- state ----------
let state = window.__shapeTemplatesState;
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
    persistTimer: null,
  };
  window.__shapeTemplatesState = state;
}
const cfg = state.cfg;

function persistSoon() {
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(async () => {
    if (state.dirty) {
      state.settings[KEY].value = { ...cfg };
      await ea.setScriptSettings(state.settings);
      state.dirty = false;
    }
  }, 400);
}

// ---------- shared float-panel z-index stack + modal-aware auto-hide ----------
const PANEL_Z_BASE = 50;
const PANEL_Z_MAX  = 70;
function stRaisePanel(el) {
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

// ---------- starter pack ----------
function rnd() { return Math.floor(Math.random() * 2 ** 31); }
function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
}
function baseEl(type, x, y, w, h, extra = {}) {
  return {
    id: uid(), type, x, y, width: w, height: h, angle: 0,
    strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid",
    roughness: 1, opacity: 100, groupIds: [], frameId: null,
    roundness: null, seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, boundElements: null, updated: Date.now(),
    link: null, locked: false, customData: null,
    ...extra,
  };
}
function textEl(x, y, w, h, text, extra = {}) {
  return baseEl("text", x, y, w, h, {
    text, originalText: text,
    fontSize: 20, fontFamily: 1,
    textAlign: "center", verticalAlign: "middle",
    baseline: 18, containerId: null, lineHeight: 1.25, autoResize: true,
    ...extra,
  });
}
function bindTextToContainer(container, txt) {
  const fs = txt.fontSize || 20;
  const approxW = Math.min(container.width - 16, Math.max(40, (txt.text || "").length * fs * 0.55));
  const approxH = fs * 1.25;
  txt.containerId = null;
  txt.x = container.x + (container.width - approxW) / 2;
  txt.y = container.y + (container.height - approxH) / 2;
  txt.width = approxW;
  txt.height = approxH;
  txt.textAlign = "center";
  txt.verticalAlign = "middle";
  txt.autoResize = true;
  const gid = uid();
  container.groupIds = (container.groupIds || []).concat([gid]);
  txt.groupIds       = (txt.groupIds       || []).concat([gid]);
}

// ---------- shape helpers ----------
const PAL = {
  primary: "#7c3aed", ink: "#1e293b", cool: "#0ea5e9", warm: "#f59e0b",
  good: "#10b981", bad: "#ef4444", muted: "#94a3b8",
  pink: "#ec4899", indigo: "#4f46e5", teal: "#14b8a6",
};

function H_box(x, y, w, h, opts = {}) {
  const c = opts.color || PAL.ink;
  const r = baseEl("rectangle", x, y, w, h, {
    strokeColor: c,
    backgroundColor: opts.fill || "transparent",
    fillStyle: opts.fillStyle || "solid",
    roughness: opts.roughness ?? 1,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    roundness: opts.sharp ? null : { type: 3 },
  });
  if (!opts.label) return [r];
  const t = textEl(x, y, w, h, opts.label, { fontSize: opts.fs || 16, strokeColor: c });
  bindTextToContainer(r, t);
  return [r, t];
}
function H_diamond(x, y, w, h, opts = {}) {
  const c = opts.color || PAL.warm;
  const d = baseEl("diamond", x, y, w, h, {
    strokeColor: c, backgroundColor: opts.fill || "transparent",
    fillStyle: opts.fillStyle || "solid", roughness: opts.roughness ?? 1,
  });
  if (!opts.label) return [d];
  const t = textEl(x, y, w, h, opts.label, { fontSize: opts.fs || 14, strokeColor: c });
  bindTextToContainer(d, t);
  return [d, t];
}
function H_ellipse(x, y, w, h, opts = {}) {
  const c = opts.color || PAL.cool;
  const e = baseEl("ellipse", x, y, w, h, {
    strokeColor: c, backgroundColor: opts.fill || "transparent",
    fillStyle: opts.fillStyle || "solid", roughness: opts.roughness ?? 1,
  });
  if (!opts.label) return [e];
  const t = textEl(x, y, w, h, opts.label, { fontSize: opts.fs || 14, strokeColor: c });
  bindTextToContainer(e, t);
  return [e, t];
}
function H_txt(x, y, str, opts = {}) {
  const fs = opts.fs || 16;
  const w = Math.max(40, str.length * fs * 0.6);
  const h = fs * 1.3 * (String(str).split("\n").length);
  return [textEl(x, y, w, h, str, {
    fontSize: fs, strokeColor: opts.color || PAL.ink,
    textAlign: opts.align || "left", verticalAlign: "top",
    autoResize: true, containerId: null,
  })];
}
function rectEdgePoint(rect, tx, ty) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const hw = rect.width / 2, hh = rect.height / 2;
  const t = Math.min(hw / (Math.abs(dx) || 1e-9), hh / (Math.abs(dy) || 1e-9));
  return [cx + dx * t, cy + dy * t];
}
function H_arrow(fromEl, toEl, opts = {}) {
  const fc = [fromEl.x + fromEl.width / 2, fromEl.y + fromEl.height / 2];
  const tc = [toEl.x + toEl.width / 2,     toEl.y + toEl.height / 2];
  const [ex1, ey1] = rectEdgePoint(fromEl, tc[0], tc[1]);
  const [ex2, ey2] = rectEdgePoint(toEl,   fc[0], fc[1]);
  const gap = opts.gap ?? 8;
  let dx = ex2 - ex1, dy = ey2 - ey1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const fx = ex1 + ux * gap, fy = ey1 + uy * gap;
  const tx = ex2 - ux * gap, ty = ey2 - uy * gap;
  dx = tx - fx; dy = ty - fy;
  const a = baseEl("arrow", fx, fy, dx, dy, {
    points: [[0, 0], [dx, dy]],
    strokeColor: opts.color || PAL.muted,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    startArrowhead: opts.startArrow || null,
    endArrowhead: opts.endArrow === undefined ? "arrow" : opts.endArrow,
    startBinding: { elementId: fromEl.id, focus: 0, gap: 4 },
    endBinding: { elementId: toEl.id, focus: 0, gap: 4 },
  });
  fromEl.boundElements = (fromEl.boundElements || []).concat([{ id: a.id, type: "arrow" }]);
  toEl.boundElements   = (toEl.boundElements   || []).concat([{ id: a.id, type: "arrow" }]);
  return [a];
}
function H_arrowXY(x1, y1, x2, y2, opts = {}) {
  const dx = x2 - x1, dy = y2 - y1;
  return [baseEl("arrow", x1, y1, dx, dy, {
    points: [[0, 0], [dx, dy]],
    strokeColor: opts.color || PAL.muted,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    startArrowhead: opts.startArrow || null,
    endArrowhead: opts.endArrow === undefined ? "arrow" : opts.endArrow,
    startBinding: null, endBinding: null,
  })];
}
function H_line(x, y, dx, dy, opts = {}) {
  return [baseEl("line", x, y, dx, dy, {
    points: [[0, 0], [dx, dy]],
    strokeColor: opts.color || PAL.muted,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    strokeWidth: opts.sw || 1.5,
  })];
}

// ---------- starters: existing ----------
function starterStickyNote() {
  const r = baseEl("rectangle", 0, 0, 180, 140, {
    backgroundColor: "#fff3a0", fillStyle: "solid",
    strokeColor: "#a39000", roundness: { type: 3 },
  });
  const t = textEl(0, 0, 180, 140, "Sticky note");
  bindTextToContainer(r, t);
  return [r, t];
}
function starterFlowchartNode() {
  const r = baseEl("rectangle", 0, 0, 200, 80, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2",
    roundness: { type: 3 },
  });
  const t = textEl(0, 0, 200, 80, "Process");
  bindTextToContainer(r, t);
  return [r, t];
}
function starterDecisionDiamond() {
  const d = baseEl("diamond", 0, 0, 220, 140, {
    backgroundColor: "#fff5f5", strokeColor: "#c92a2a",
  });
  const t = textEl(0, 0, 220, 140, "Decision?");
  bindTextToContainer(d, t);
  return [d, t];
}
function starterUMLClassBox() {
  const W = 220, H = 180;
  const box = baseEl("rectangle", 0, 0, W, H, {
    backgroundColor: "#f8f9fa", strokeColor: "#212529",
  });
  const div1 = baseEl("line", 0, 40, W, 0, {
    points: [[0, 0], [W, 0]],
    strokeColor: "#212529",
  });
  const div2 = baseEl("line", 0, 100, W, 0, {
    points: [[0, 0], [W, 0]],
    strokeColor: "#212529",
  });
  const t1 = textEl(0, 10, W, 24, "ClassName", { fontSize: 18 });
  const t2 = textEl(8, 48, W - 16, 48, "- field: Type", { fontSize: 14, textAlign: "left" });
  const t3 = textEl(8, 108, W - 16, 64, "+ method(): Ret", { fontSize: 14, textAlign: "left" });
  return [box, div1, div2, t1, t2, t3];
}
function starterCallout() {
  const r = baseEl("rectangle", 0, 0, 200, 90, {
    backgroundColor: "#fff9db", strokeColor: "#f08c00",
    roundness: { type: 3 },
  });
  const t = textEl(0, 0, 200, 90, "Note");
  bindTextToContainer(r, t);
  const arrow = baseEl("arrow", -120, 130, 110, -30, {
    points: [[0, 0], [110, -30]],
    strokeColor: "#f08c00", strokeWidth: 2,
    startArrowhead: null, endArrowhead: "arrow",
    startBinding: null, endBinding: null,
  });
  return [r, t, arrow];
}
function starterStartEndPill() {
  const e = baseEl("ellipse", 0, 0, 180, 70, {
    backgroundColor: "#d3f9d8", strokeColor: "#2f9e44",
  });
  const t = textEl(0, 0, 180, 70, "Start");
  bindTextToContainer(e, t);
  return [e, t];
}
function starterDatabaseCylinder() {
  const W = 160, H = 180;
  const topEll = baseEl("ellipse", 0, 0, W, 40, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2",
  });
  const body = baseEl("rectangle", 0, 20, W, H - 40, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2",
    strokeStyle: "solid",
  });
  const botEll = baseEl("ellipse", 0, H - 40, W, 40, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2",
  });
  const t = textEl(0, 60, W, 60, "DB", { fontSize: 24 });
  return [body, topEll, botEll, t];
}
function starterCloud() {
  const W = 220, H = 120;
  const c1 = baseEl("ellipse", 0,   30, 90,  80, { backgroundColor: "#f1f3f5", strokeColor: "#495057" });
  const c2 = baseEl("ellipse", 50,  0,  120, 90, { backgroundColor: "#f1f3f5", strokeColor: "#495057" });
  const c3 = baseEl("ellipse", 120, 20, 100, 90, { backgroundColor: "#f1f3f5", strokeColor: "#495057" });
  const c4 = baseEl("ellipse", 40,  50, 150, 70, { backgroundColor: "#f1f3f5", strokeColor: "#495057" });
  const t = textEl(40, 40, 150, 50, "Cloud");
  return [c1, c2, c3, c4, t];
}
function starterTwoStepFlow() {
  const a = baseEl("rectangle", 0, 0, 140, 70, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2", roundness: { type: 3 },
  });
  const at = textEl(0, 0, 140, 70, "Step 1");
  bindTextToContainer(a, at);
  const b = baseEl("rectangle", 200, 0, 140, 70, {
    backgroundColor: "#e7f5ff", strokeColor: "#1971c2", roundness: { type: 3 },
  });
  const bt = textEl(200, 0, 140, 70, "Step 2");
  bindTextToContainer(b, bt);
  const arr = baseEl("arrow", 140, 35, 60, 0, {
    points: [[0, 0], [60, 0]],
    strokeColor: "#1971c2",
    startArrowhead: null, endArrowhead: "arrow",
    startBinding: null, endBinding: null,
  });
  return [a, at, b, bt, arr];
}
function starterMindMapRoot() {
  const root = baseEl("ellipse", 100, 80, 160, 70, {
    backgroundColor: "#fff3bf", strokeColor: "#e67700",
  });
  const rt = textEl(100, 80, 160, 70, "Idea");
  bindTextToContainer(root, rt);
  const branches = [
    baseEl("arrow", 100, 115, -90, -60, { points:[[0,0],[-90,-60]], strokeColor: "#e67700", startArrowhead: null, endArrowhead: "arrow", startBinding: null, endBinding: null }),
    baseEl("arrow", 100, 115, -90,  60, { points:[[0,0],[-90, 60]], strokeColor: "#e67700", startArrowhead: null, endArrowhead: "arrow", startBinding: null, endBinding: null }),
    baseEl("arrow", 260, 115,  90, -60, { points:[[0,0],[ 90,-60]], strokeColor: "#e67700", startArrowhead: null, endArrowhead: "arrow", startBinding: null, endBinding: null }),
    baseEl("arrow", 260, 115,  90,  60, { points:[[0,0],[ 90, 60]], strokeColor: "#e67700", startArrowhead: null, endArrowhead: "arrow", startBinding: null, endBinding: null }),
  ];
  return [root, rt, ...branches];
}

// ---------- starters: new batch ----------

// architecture
function tplEventBus() {
  const pub = H_box(0, 100, 140, 60, { label: "Publisher", color: PAL.primary, fs: 14 });
  const bus = H_box(220, 100, 160, 60, { label: "Topic / Bus", color: PAL.ink, fill: "#f1f5f9", fs: 14 });
  const s1 = H_box(460, 0,   140, 60, { label: "Sub A", color: PAL.cool, fs: 14 });
  const s2 = H_box(460, 100, 140, 60, { label: "Sub B", color: PAL.cool, fs: 14 });
  const s3 = H_box(460, 200, 140, 60, { label: "Sub C", color: PAL.cool, fs: 14 });
  return [...pub, ...bus, ...s1, ...s2, ...s3,
    ...H_arrow(pub[0], bus[0]),
    ...H_arrow(bus[0], s1[0]),
    ...H_arrow(bus[0], s2[0]),
    ...H_arrow(bus[0], s3[0])];
}
function tplPubSub() {
  const prod = H_box(0, 100, 140, 60, { label: "Producer", color: PAL.primary, fs: 14 });
  const kafka = H_box(220, 80, 160, 100, { label: "Kafka", color: PAL.ink, fill: "#1e293b22", fs: 16 });
  const c1 = H_box(460, 0,   140, 60, { label: "Consumer 1", color: PAL.cool, fs: 13 });
  const c2 = H_box(460, 100, 140, 60, { label: "Consumer 2", color: PAL.cool, fs: 13 });
  const c3 = H_box(460, 200, 140, 60, { label: "Consumer 3", color: PAL.cool, fs: 13 });
  return [...prod, ...kafka, ...c1, ...c2, ...c3,
    ...H_arrow(prod[0], kafka[0]),
    ...H_arrow(kafka[0], c1[0]),
    ...H_arrow(kafka[0], c2[0]),
    ...H_arrow(kafka[0], c3[0])];
}
function tplServerless() {
  const gw = H_box(0, 100, 140, 60, { label: "API GW", color: PAL.primary, fs: 14 });
  const lam = H_box(200, 100, 140, 60, { label: "Lambda", color: PAL.warm, fs: 14 });
  const ddb = H_box(400, 0,   140, 60, { label: "DynamoDB", color: PAL.cool, fs: 13 });
  const s3  = H_box(400, 100, 140, 60, { label: "S3",        color: PAL.cool, fs: 13 });
  const sns = H_box(400, 200, 140, 60, { label: "SNS",       color: PAL.cool, fs: 13 });
  return [...gw, ...lam, ...ddb, ...s3, ...sns,
    ...H_arrow(gw[0], lam[0]),
    ...H_arrow(lam[0], ddb[0]),
    ...H_arrow(lam[0], s3[0]),
    ...H_arrow(lam[0], sns[0])];
}
function tplCDN() {
  const origin = H_box(0, 120, 140, 60, { label: "Origin", color: PAL.primary, fs: 14 });
  const e1 = H_box(220, 20,  120, 50, { label: "Edge 1", color: PAL.cool, fs: 13 });
  const e2 = H_box(220, 130, 120, 50, { label: "Edge 2", color: PAL.cool, fs: 13 });
  const e3 = H_box(220, 240, 120, 50, { label: "Edge 3", color: PAL.cool, fs: 13 });
  const u1 = H_box(420, 20,  120, 50, { label: "Users", color: PAL.good, fs: 13 });
  const u2 = H_box(420, 130, 120, 50, { label: "Users", color: PAL.good, fs: 13 });
  const u3 = H_box(420, 240, 120, 50, { label: "Users", color: PAL.good, fs: 13 });
  return [...origin, ...e1, ...e2, ...e3, ...u1, ...u2, ...u3,
    ...H_arrow(origin[0], e1[0]), ...H_arrow(origin[0], e2[0]), ...H_arrow(origin[0], e3[0]),
    ...H_arrow(e1[0], u1[0]), ...H_arrow(e2[0], u2[0]), ...H_arrow(e3[0], u3[0])];
}

// process
function tplBPMN() {
  const start = H_ellipse(0, 60, 60, 60, { label: "Start", color: PAL.good, fs: 12 });
  const task  = H_box(120, 60, 140, 60, { label: "Task", color: PAL.cool, fs: 14 });
  const gw    = H_diamond(320, 30, 120, 120, { label: "Gateway?", color: PAL.warm, fs: 13 });
  const endE  = H_ellipse(500, 60, 60, 60, { label: "End", color: PAL.bad, fs: 12 });
  endE[0].strokeWidth = 4;
  return [...start, ...task, ...gw, ...endE,
    ...H_arrow(start[0], task[0]),
    ...H_arrow(task[0], gw[0]),
    ...H_arrow(gw[0], endE[0])];
}
function tplSwimlane() {
  const W = 700, LH = 100;
  const out = [];
  const lanes = ["Customer", "Frontend", "Backend"];
  lanes.forEach((name, i) => {
    out.push(...H_box(0, i * LH, W, LH, { sharp: true, color: PAL.ink, fill: i % 2 ? "#f8fafc" : "transparent" }));
    out.push(...H_txt(8, i * LH + 8, name, { fs: 12, color: PAL.muted }));
  });
  const t1 = H_box(150, 20,  100, 50, { label: "Click", color: PAL.cool, fs: 12 });
  const t2 = H_box(300, 120, 100, 50, { label: "Validate", color: PAL.warm, fs: 12 });
  const t3 = H_box(500, 220, 100, 50, { label: "Save", color: PAL.good, fs: 12 });
  out.push(...t1, ...t2, ...t3,
    ...H_arrow(t1[0], t2[0]), ...H_arrow(t2[0], t3[0]));
  return out;
}
function tplUserJourney() {
  const stages = ["Discover","Sign up","Onboard","Use","Advocate"];
  const out = [];
  stages.forEach((s, i) => {
    out.push(...H_box(i * 130, 0, 120, 50, { label: s, color: PAL.primary, fs: 12 }));
  });
  const moods = ["Curious","Excited","Confused","Happy","Loyal"];
  moods.forEach((m, i) => {
    out.push(...H_txt(i * 130 + 10, 70, m, { fs: 12, color: PAL.muted }));
  });
  return out;
}

// security
function tplKillchain() {
  const steps = ["Recon","Weaponize","Deliver","Exploit","Install","C2","Actions"];
  const out = [];
  let prev = null;
  steps.forEach((s, i) => {
    const b = H_box(i * 130, 0, 120, 60, { label: s, color: PAL.bad, fs: 12 });
    out.push(...b);
    if (prev) out.push(...H_arrow(prev, b[0]));
    prev = b[0];
  });
  return out;
}
function tplZeroTrust() {
  const user = H_box(0, 100, 120, 60, { label: "User", color: PAL.primary, fs: 13 });
  const dev  = H_box(160, 100, 140, 60, { label: "Device check", color: PAL.warm, fs: 12 });
  const pol  = H_box(340, 100, 140, 60, { label: "Policy Engine", color: PAL.bad, fs: 12 });
  const res  = H_box(520, 100, 140, 60, { label: "Resource", color: PAL.good, fs: 13 });
  return [...user, ...dev, ...pol, ...res,
    ...H_arrow(user[0], dev[0]),
    ...H_arrow(dev[0], pol[0]),
    ...H_arrow(pol[0], res[0]),
    ...H_arrow(pol[0], dev[0], { dashed: true, color: PAL.muted })];
}

// math
function tplVenn2() {
  const a = H_ellipse(0,  0, 180, 180, { label: "A", color: PAL.cool, fill: "#0ea5e933", fillStyle: "solid", fs: 16 });
  const b = H_ellipse(120, 0, 180, 180, { label: "B", color: PAL.warm, fill: "#f59e0b33", fillStyle: "solid", fs: 16 });
  const t = H_txt(135, 80, "A∩B", { fs: 14, color: PAL.ink });
  return [...a, ...b, ...t];
}
function tplNumberLine() {
  const out = [];
  out.push(...H_arrowXY(0, 50, 440, 50, { color: PAL.ink, startArrow: "arrow", endArrow: "arrow" }));
  for (let i = -5; i <= 5; i++) {
    const x = 20 + (i + 5) * 40;
    out.push(...H_line(x, 45, 0, 10, { color: PAL.ink }));
    out.push(...H_txt(x - 5, 60, String(i), { fs: 11, color: PAL.ink }));
  }
  return out;
}
function tplMatrix2x2() {
  const out = [];
  out.push(...H_box(60,  60,  140, 100, { label: "Q1", color: PAL.ink }));
  out.push(...H_box(200, 60,  140, 100, { label: "Q2", color: PAL.ink }));
  out.push(...H_box(60,  160, 140, 100, { label: "Q3", color: PAL.ink }));
  out.push(...H_box(200, 160, 140, 100, { label: "Q4", color: PAL.ink }));
  out.push(...H_txt(120, 30, "Low ↔ High X", { fs: 12, color: PAL.muted }));
  out.push(...H_txt(0,   100, "Y", { fs: 12, color: PAL.muted }));
  return out;
}

// devops
function tplCICD() {
  const steps = ["Code", "Build", "Test", "Stage", "Prod"];
  const out = [];
  let prev = null;
  steps.forEach((s, i) => {
    const b = H_box(i * 140, 0, 120, 60, { label: s, color: PAL.indigo, fs: 14 });
    out.push(...b);
    if (prev) out.push(...H_arrow(prev, b[0]));
    prev = b[0];
  });
  return out;
}
function tplBlueGreen() {
  const lb = H_box(160, 0, 140, 60, { label: "Load Balancer", color: PAL.ink, fs: 13 });
  const blue  = H_box(0,   140, 160, 80, { label: "Blue env",  color: PAL.cool, fs: 14 });
  const green = H_box(300, 140, 160, 80, { label: "Green env", color: PAL.good, fs: 14 });
  const db = H_box(160, 280, 140, 60, { label: "Shared DB", color: PAL.warm, fs: 13 });
  return [...lb, ...blue, ...green, ...db,
    ...H_arrow(lb[0], blue[0]),
    ...H_arrow(lb[0], green[0]),
    ...H_arrow(blue[0], db[0]),
    ...H_arrow(green[0], db[0])];
}
function tplCanary() {
  const lb = H_box(160, 0, 140, 60, { label: "LB (split)", color: PAL.ink, fs: 13 });
  const stable = H_box(0,   140, 180, 80, { label: "Stable 90%", color: PAL.cool, fs: 13 });
  const canary = H_box(280, 140, 180, 80, { label: "Canary 10%", color: PAL.warm, fs: 13 });
  return [...lb, ...stable, ...canary,
    ...H_arrow(lb[0], stable[0]),
    ...H_arrow(lb[0], canary[0], { dashed: true })];
}

// webui
function tplDashboard() {
  const out = [];
  out.push(...H_box(0, 0, 120, 360, { color: PAL.ink, fill: "#1e293b15", label: "Sidebar", fs: 14 }));
  out.push(...H_box(120, 0, 480, 50, { color: PAL.ink, label: "Topbar", fs: 14 }));
  for (let i = 0; i < 4; i++) {
    out.push(...H_box(140 + i * 110, 70, 100, 70, { label: `KPI ${i+1}`, color: PAL.cool, fs: 12 }));
  }
  out.push(...H_box(140, 160, 280, 180, { label: "Chart", color: PAL.warm, fs: 14 }));
  out.push(...H_box(440, 160, 160, 180, { label: "Table", color: PAL.good, fs: 14 }));
  return out;
}
function tplLoginForm() {
  const out = [];
  out.push(...H_txt(110, 0, "Sign in", { fs: 22, color: PAL.ink }));
  out.push(...H_box(40,  50,  260, 40, { label: "Email",    color: PAL.muted, fs: 13 }));
  out.push(...H_box(40, 110,  260, 40, { label: "Password", color: PAL.muted, fs: 13 }));
  out.push(...H_box(40, 170,  260, 44, { label: "Sign in",  color: PAL.primary, fill: "#7c3aed22", fs: 15 }));
  out.push(...H_box(40, 230,  125, 40, { label: "Google",  color: PAL.bad, fs: 12 }));
  out.push(...H_box(175,230,  125, 40, { label: "GitHub",  color: PAL.ink, fs: 12 }));
  return out;
}
function tplModal() {
  const out = [];
  out.push(...H_box(0, 0, 360, 240, { color: PAL.muted, fill: "#94a3b822" }));
  out.push(...H_box(50, 30, 260, 180, { color: PAL.ink, label: "Modal", fs: 16 }));
  out.push(...H_box(160, 160, 60, 30, { label: "OK", color: PAL.primary, fs: 12 }));
  out.push(...H_box(230, 160, 70, 30, { label: "Cancel", color: PAL.muted, fs: 12 }));
  return out;
}

// diagrams
function tplOrgChart() {
  const ceo = H_box(280, 0, 120, 50, { label: "CEO", color: PAL.primary, fs: 14 });
  const vps = [
    H_box(80,  140, 130, 50, { label: "VP Eng",   color: PAL.cool, fs: 13 }),
    H_box(280, 140, 130, 50, { label: "VP Sales", color: PAL.cool, fs: 13 }),
    H_box(480, 140, 130, 50, { label: "VP Ops",   color: PAL.cool, fs: 13 }),
  ];
  const out = [...ceo, ...vps[0], ...vps[1], ...vps[2],
    ...H_arrow(ceo[0], vps[0][0], { endArrow: null }),
    ...H_arrow(ceo[0], vps[1][0], { endArrow: null }),
    ...H_arrow(ceo[0], vps[2][0], { endArrow: null })];
  vps.forEach((v) => {
    const cx = v[0].x + v[0].width / 2;
    const r1 = H_box(cx - 95, 270, 85, 40, { label: "Mgr A", color: PAL.muted, fs: 11 });
    const r2 = H_box(cx + 10, 270, 85, 40, { label: "Mgr B", color: PAL.muted, fs: 11 });
    out.push(...r1, ...r2,
      ...H_arrow(v[0], r1[0], { endArrow: null }),
      ...H_arrow(v[0], r2[0], { endArrow: null }));
  });
  return out;
}
function tplFishbone() {
  const out = [];
  out.push(...H_arrowXY(0, 150, 600, 150, { color: PAL.ink }));
  out.push(...H_txt(610, 140, "Effect", { fs: 14, color: PAL.bad }));
  const ribs = [["People",100,40],["Process",260,40],["Tools",100,260],["Env",260,260]];
  ribs.forEach(([name, x, y]) => {
    out.push(...H_arrowXY(x, y, x + 150, 150, { color: PAL.muted }));
    out.push(...H_txt(x - 30, y - 18, name, { fs: 13, color: PAL.ink }));
  });
  return out;
}
function tplCleanArch() {
  const cx = 200, cy = 200;
  const out = [];
  const layers = [
    [380, "Frameworks", PAL.muted],
    [280, "Adapters",   PAL.warm],
    [180, "UseCases",   PAL.cool],
    [80,  "Entities",   PAL.primary],
  ];
  for (const [size, label, color] of layers) {
    out.push(...H_box(cx - size/2, cy - size/2, size, size, { color, fill: color + "11" }));
    out.push(...H_txt(cx - size/2 + 8, cy - size/2 + 4, label, { fs: 12, color }));
  }
  return out;
}
function tplRoadmap() {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const colors = [PAL.cool, PAL.warm, PAL.good, PAL.primary];
  const out = [];
  quarters.forEach((q, i) => {
    out.push(...H_box(i * 160, 0, 150, 50, { label: q, color: colors[i], fs: 16 }));
    out.push(...H_box(i * 160, 70,  150, 50, { label: "Milestone", color: colors[i], fs: 12 }));
    out.push(...H_box(i * 160, 130, 150, 50, { label: "Milestone", color: colors[i], fs: 12 }));
  });
  return out;
}

// ---------- more functional templates (batch 2) ----------
function tplCQRS() {
  const cmd  = H_box(0,   0,   140, 60, { label: "Command", color: PAL.bad, fs: 13 });
  const qry  = H_box(0,   200, 140, 60, { label: "Query",   color: PAL.cool, fs: 13 });
  const wdb  = H_box(220, 0,   140, 60, { label: "Write DB", color: PAL.bad, fs: 13 });
  const evt  = H_box(220, 100, 140, 60, { label: "Event Store", color: PAL.warm, fs: 12 });
  const rdb  = H_box(220, 200, 140, 60, { label: "Read DB",  color: PAL.cool, fs: 13 });
  return [...cmd, ...qry, ...wdb, ...evt, ...rdb,
    ...H_arrow(cmd[0], wdb[0]),
    ...H_arrow(wdb[0], evt[0]),
    ...H_arrow(evt[0], rdb[0]),
    ...H_arrow(rdb[0], qry[0])];
}
function tplSaga() {
  const orch = H_box(200, 0, 160, 60, { label: "Orchestrator", color: PAL.primary, fs: 13 });
  const s1 = H_box(0,   140, 120, 50, { label: "Step 1", color: PAL.cool, fs: 12 });
  const s2 = H_box(140, 140, 120, 50, { label: "Step 2", color: PAL.cool, fs: 12 });
  const s3 = H_box(280, 140, 120, 50, { label: "Step 3", color: PAL.cool, fs: 12 });
  const s4 = H_box(420, 140, 120, 50, { label: "Step 4", color: PAL.cool, fs: 12 });
  const steps = [s1, s2, s3, s4];
  const out = [...orch, ...s1, ...s2, ...s3, ...s4];
  steps.forEach(s => out.push(...H_arrow(orch[0], s[0])));
  for (let i = 0; i < steps.length - 1; i++) out.push(...H_arrow(steps[i][0], steps[i+1][0]));
  const yBack = s1[0].y + s1[0].height + 30;
  const x1 = s4[0].x + 30;
  const x2 = s1[0].x + s1[0].width - 30;
  out.push(...H_arrowXY(x1, yBack, x2, yBack, { dashed: true, color: PAL.bad }));
  out.push(...H_txt(x1 - 80, yBack - 18, "compensate", { fs: 11, color: PAL.bad }));
  return out;
}
function tplLambdaArch() {
  const src = H_box(0, 100, 120, 60, { label: "Data Source", color: PAL.primary, fs: 12 });
  const batch = H_box(180, 0,   140, 60, { label: "Batch Layer", color: PAL.cool, fs: 12 });
  const speed = H_box(180, 100, 140, 60, { label: "Speed Layer", color: PAL.warm, fs: 12 });
  const serve = H_box(380, 50,  140, 60, { label: "Serving Layer", color: PAL.good, fs: 12 });
  return [...src, ...batch, ...speed, ...serve,
    ...H_arrow(src[0], batch[0]), ...H_arrow(src[0], speed[0]),
    ...H_arrow(batch[0], serve[0]), ...H_arrow(speed[0], serve[0])];
}
function tplActivityDiagram() {
  const start = H_ellipse(0,  0,  40, 40, { color: PAL.ink, fill: PAL.ink, fillStyle: "solid" });
  const act   = H_box(80, 0, 140, 50, { label: "Action", color: PAL.cool, fs: 13 });
  const diam  = H_diamond(260, -10, 100, 70, { label: "Check?", color: PAL.warm, fs: 11 });
  const b1    = H_box(400, -40, 120, 50, { label: "Yes path", color: PAL.good, fs: 11 });
  const b2    = H_box(400, 40,  120, 50, { label: "No path",  color: PAL.bad,  fs: 11 });
  const merge = H_diamond(560, -10, 70, 70, { color: PAL.ink });
  const endC1 = H_ellipse(680, 0, 40, 40, { color: PAL.ink, sw: 3 });
  const endC2 = H_ellipse(688, 8, 24, 24, { color: PAL.ink, fill: PAL.ink, fillStyle: "solid" });
  return [...start, ...act, ...diam, ...b1, ...b2, ...merge, ...endC1, ...endC2,
    ...H_arrow(start[0], act[0]),
    ...H_arrow(act[0], diam[0]),
    ...H_arrow(diam[0], b1[0]),
    ...H_arrow(diam[0], b2[0]),
    ...H_arrow(b1[0], merge[0]),
    ...H_arrow(b2[0], merge[0]),
    ...H_arrow(merge[0], endC1[0])];
}
function tplComponentDiagram() {
  const out = [];
  const comps = [["UI", PAL.primary], ["API", PAL.cool], ["DB", PAL.warm], ["Auth", PAL.good]];
  comps.forEach(([name, c], i) => {
    const x = (i % 2) * 220, y = Math.floor(i / 2) * 140;
    out.push(...H_box(x, y, 160, 80, { label: `«component»\n${name}`, color: c, fs: 12 }));
    out.push(baseEl("rectangle", x + 130, y + 12, 32, 20, {
      backgroundColor: "transparent", strokeColor: c, fillStyle: "hachure",
      roughness: 0, roundness: null,
    }));
  });
  return out;
}
function tplPackageDiagram() {
  return [
    ...H_box(0, 0, 300, 200, { color: PAL.muted, label: "outer", fs: 12, sharp: true }),
    ...H_box(20, 30, 130, 150, { color: PAL.cool, label: "pkg.a", fs: 12, sharp: true }),
    ...H_box(170, 30, 110, 150, { color: PAL.warm, label: "pkg.b", fs: 12, sharp: true }),
  ];
}
function tplObjectDiagram() {
  return [
    ...H_box(0, 0, 160, 80, { label: "u1: User\nname=Mo", color: PAL.cool, fs: 11 }),
    ...H_box(200, 0, 160, 80, { label: "o1: Order\nid=42", color: PAL.warm, fs: 11 }),
  ];
}
function tplValueChain() {
  const out = [];
  // primary activities row
  const prim = ["Inbound", "Operations", "Outbound", "Marketing", "Service"];
  prim.forEach((p, i) => {
    out.push(...H_box(i * 130, 100, 120, 50, { label: p, color: PAL.cool, fs: 11 }));
  });
  // support row
  const sup = ["Firm Infra", "HR", "Tech", "Procurement"];
  sup.forEach((s, i) => {
    out.push(...H_box(i * 150, 0, 140, 30, { label: s, color: PAL.muted, fs: 10, sharp: true }));
  });
  out.push(...H_arrowXY(670, 125, 720, 125, { color: PAL.good }));
  out.push(...H_txt(680, 100, "Margin", { fs: 11, color: PAL.good }));
  return out;
}
function tplPASTA() {
  const steps = ["Define Obj", "Tech Scope", "Decompose", "Threats", "Vulns", "Attack", "Risk Anal"];
  const out = [];
  let prev = null;
  steps.forEach((s, i) => {
    const b = H_box(i * 130, 0, 120, 60, { label: s, color: PAL.bad, fs: 11 });
    out.push(...b);
    if (prev) out.push(...H_arrow(prev, b[0]));
    prev = b[0];
  });
  out.push(...H_txt(0, 70, "PASTA — Process for Attack Simulation & Threat Analysis", { fs: 11, color: PAL.muted }));
  return out;
}
function tplPKIChain() {
  const root = H_box(0,   0, 160, 60, { label: "Root CA",       color: PAL.bad,  fs: 12 });
  const intr = H_box(0, 100, 160, 60, { label: "Intermediate",  color: PAL.warm, fs: 12 });
  const srv  = H_box(0, 200, 160, 60, { label: "Server cert",   color: PAL.cool, fs: 12 });
  const cli  = H_box(0, 300, 160, 60, { label: "Client",        color: PAL.good, fs: 12 });
  return [...root, ...intr, ...srv, ...cli,
    ...H_arrow(root[0], intr[0]),
    ...H_arrow(intr[0], srv[0]),
    ...H_arrow(srv[0], cli[0])];
}
function tplVenn3() {
  const a = H_ellipse(0,   0,   160, 160, { label: "A", color: PAL.cool, fill: "#0ea5e933", fs: 14 });
  const b = H_ellipse(100, 0,   160, 160, { label: "B", color: PAL.bad,  fill: "#ef444433", fs: 14 });
  const c = H_ellipse(50,  90,  160, 160, { label: "C", color: PAL.warm, fill: "#f59e0b33", fs: 14 });
  return [...a, ...b, ...c];
}
function tplSetBuilder() {
  return [
    ...H_box(0, 0, 360, 240, { color: PAL.ink, sharp: true, label: "U" }),
    ...H_ellipse(40,  60,  140, 140, { label: "A", color: PAL.cool, fs: 14 }),
    ...H_ellipse(180, 60,  140, 140, { label: "B", color: PAL.bad,  fs: 14 }),
    ...H_txt(0, 250, "{x ∈ U : P(x)}", { fs: 14, color: PAL.muted }),
  ];
}
function tplTrigCircle() {
  const ring = H_ellipse(0, 0, 200, 200, { color: PAL.ink });
  const xAxis = H_arrowXY(-20, 100, 220, 100, { color: PAL.muted, endArrow: "arrow" });
  const yAxis = H_arrowXY(100, 220, 100, -20, { color: PAL.muted, endArrow: "arrow" });
  const radius = H_arrowXY(100, 100, 175, 35, { color: PAL.bad });
  return [...ring, ...xAxis, ...yAxis, ...radius,
    ...H_txt(180, 35, "(cos, sin)", { fs: 11, color: PAL.bad })];
}
function tplGitOpsFlow() {
  const steps = [
    ["Dev",       PAL.primary],
    ["Git",       PAL.ink],
    ["CI",        PAL.cool],
    ["Registry",  PAL.warm],
    ["ArgoCD",    PAL.good],
    ["Cluster",   PAL.bad],
  ];
  const out = [];
  let prev = null;
  steps.forEach(([name, color], i) => {
    const b = H_box(i * 130, 0, 120, 60, { label: name, color, fs: 13 });
    out.push(...b);
    if (prev) out.push(...H_arrow(prev, b[0]));
    prev = b[0];
  });
  return out;
}
function tplLoggingStack() {
  const app = H_box(0,   0, 120, 60, { label: "App",     color: PAL.primary, fs: 13 });
  const fl  = H_box(160, 0, 120, 60, { label: "Fluentd", color: PAL.warm, fs: 13 });
  const es  = H_box(320, 0, 120, 60, { label: "ES",      color: PAL.cool, fs: 14 });
  const kb  = H_box(480, 0, 120, 60, { label: "Kibana",  color: PAL.good, fs: 13 });
  return [...app, ...fl, ...es, ...kb,
    ...H_arrow(app[0], fl[0]), ...H_arrow(fl[0], es[0]), ...H_arrow(es[0], kb[0])];
}
function tplTracing() {
  const req = H_box(0,   0, 100, 50, { label: "Request", color: PAL.primary, fs: 12 });
  const sa  = H_box(140, 0, 100, 50, { label: "Svc A",   color: PAL.cool, fs: 13 });
  const sb  = H_box(280, 0, 100, 50, { label: "Svc B",   color: PAL.warm, fs: 13 });
  const jc  = H_box(420, 0, 120, 50, { label: "Jaeger",  color: PAL.bad,  fs: 13 });
  const ui  = H_box(580, 0, 100, 50, { label: "UI",      color: PAL.good, fs: 14 });
  return [...req, ...sa, ...sb, ...jc, ...ui,
    ...H_arrow(req[0], sa[0]), ...H_arrow(sa[0], sb[0]),
    ...H_arrow(sa[0], jc[0], { dashed: true }),
    ...H_arrow(sb[0], jc[0], { dashed: true }),
    ...H_arrow(jc[0], ui[0])];
}
function tplOnionArch() {
  const cx = 150, cy = 150;
  const layers = [
    [300, "Infra",     PAL.muted],
    [240, "Adapters",  PAL.warm],
    [170, "App Svc",   PAL.cool],
    [100, "Domain",    PAL.primary],
  ];
  const out = [];
  for (const [size, label, color] of layers) {
    out.push(...H_ellipse(cx - size/2, cy - size/2, size, size, { color, fill: color + "11" }));
    out.push(...H_txt(cx - size/2 + 8, cy - size/2 + 4, label, { fs: 11, color }));
  }
  return out;
}
function tplFeatureGraph() {
  const flag = H_box(0, 100, 140, 60, { label: "Feature flag", color: PAL.warm, fs: 13 });
  const e1 = H_box(220, 0,   120, 50, { label: "Exp A", color: PAL.cool, fs: 13 });
  const e2 = H_box(220, 100, 120, 50, { label: "Exp B", color: PAL.cool, fs: 13 });
  const e3 = H_box(220, 200, 120, 50, { label: "Exp C", color: PAL.cool, fs: 13 });
  const m1 = H_box(420, 50,  120, 50, { label: "Metric 1", color: PAL.good, fs: 12 });
  const m2 = H_box(420, 150, 120, 50, { label: "Metric 2", color: PAL.good, fs: 12 });
  return [...flag, ...e1, ...e2, ...e3, ...m1, ...m2,
    ...H_arrow(flag[0], e1[0]), ...H_arrow(flag[0], e2[0]), ...H_arrow(flag[0], e3[0]),
    ...H_arrow(e1[0], m1[0]), ...H_arrow(e2[0], m1[0]),
    ...H_arrow(e2[0], m2[0]), ...H_arrow(e3[0], m2[0])];
}
function tplWhiteboard() {
  return [
    ...H_box(0,   0,   300, 200, { color: PAL.cool, sharp: true, label: "Notes",     fs: 13 }),
    ...H_box(320, 0,   300, 200, { color: PAL.warm, sharp: true, label: "Actions",   fs: 13 }),
    ...H_box(0,   220, 300, 200, { color: PAL.good, sharp: true, label: "Decisions", fs: 13 }),
    ...H_box(320, 220, 300, 200, { color: PAL.bad,  sharp: true, label: "Parking",   fs: 13 }),
  ];
}
function tplEisenhower() {
  return [
    ...H_box(0,   0,   200, 200, { color: PAL.bad,  label: "Urgent + Important\nDO",        fs: 13 }),
    ...H_box(220, 0,   200, 200, { color: PAL.warm, label: "Important\nSCHEDULE",          fs: 13 }),
    ...H_box(0,   220, 200, 200, { color: PAL.cool, label: "Urgent\nDELEGATE",             fs: 13 }),
    ...H_box(220, 220, 200, 200, { color: PAL.muted,label: "Neither\nDROP",                fs: 13 }),
  ];
}
function tplKanbanMini() {
  const cols = [["To do", PAL.muted], ["Doing", PAL.warm], ["Done", PAL.good]];
  const out = [];
  cols.forEach(([name, c], i) => {
    out.push(...H_box(i * 170, 0, 160, 50, { label: name, color: c, fs: 14 }));
    for (let r = 0; r < 3; r++) {
      out.push(...H_box(i * 170 + 8, 70 + r * 70, 144, 60, { label: "Card", color: c, fs: 11 }));
    }
  });
  return out;
}
function tplSWOTMini() {
  return [
    ...H_box(0,   0,   180, 140, { color: PAL.good, label: "Strengths",     fs: 14 }),
    ...H_box(200, 0,   180, 140, { color: PAL.bad,  label: "Weaknesses",    fs: 14 }),
    ...H_box(0,   160, 180, 140, { color: PAL.cool, label: "Opportunities", fs: 14 }),
    ...H_box(200, 160, 180, 140, { color: PAL.warm, label: "Threats",       fs: 14 }),
  ];
}
function tplTimeline() {
  const out = [];
  out.push(...H_arrowXY(0, 80, 600, 80, { color: PAL.ink }));
  const events = ["Idea", "MVP", "Launch", "v2", "Scale"];
  events.forEach((e, i) => {
    const x = 40 + i * 130;
    out.push(...H_line(x, 70, 0, 20, { color: PAL.ink }));
    out.push(...H_box(x - 50, 0, 100, 50, { label: e, color: PAL.primary, fs: 12 }));
    out.push(...H_txt(x - 18, 95, `t${i+1}`, { fs: 11, color: PAL.muted }));
  });
  return out;
}

// ---------- brand logo helpers ----------
function poly(points, opts = {}) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  let shifted = points.map(p => [p[0] - minX, p[1] - minY]);
  const wantFill = opts.fill && opts.fill !== "transparent";
  if (wantFill) {
    const first = shifted[0], last = shifted[shifted.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      shifted = [...shifted, [first[0], first[1]]];
    }
  }
  return baseEl("line", minX, minY, maxX - minX, maxY - minY, {
    points: shifted,
    strokeColor: opts.stroke || "#1e1e1e",
    backgroundColor: opts.fill || "transparent",
    fillStyle: wantFill ? "solid" : "hachure",
    roughness: opts.roughness ?? 0,
    strokeWidth: opts.sw || 2,
  });
}
function filledRect(x, y, w, h, color, opts = {}) {
  return baseEl("rectangle", x, y, w, h, {
    backgroundColor: color, strokeColor: opts.stroke || color,
    fillStyle: "solid", roughness: 0, strokeWidth: opts.sw || 1,
    roundness: opts.round === false ? null : (opts.round || { type: 3 }),
  });
}
function filledEllipse(x, y, w, h, color, opts = {}) {
  return baseEl("ellipse", x, y, w, h, {
    backgroundColor: color, strokeColor: opts.stroke || color,
    fillStyle: "solid", roughness: 0, strokeWidth: opts.sw || 1,
  });
}
function rotatedEllipse(x, y, w, h, color, angle, sw = 2) {
  return baseEl("ellipse", x, y, w, h, {
    backgroundColor: "transparent", strokeColor: color,
    fillStyle: "hachure", roughness: 0, strokeWidth: sw, angle,
  });
}

function tplAWS() {
  const r = filledRect(0, 0, 140, 90, "#FF9900", { round: { type: 3 } });
  const t = textEl(0, 5, 140, 50, "aws", { fontSize: 36, strokeColor: "#232F3E" });
  bindTextToContainer(r, t);
  const smile = baseEl("line", 25, 60, 90, 14, {
    points: [[0, 0], [25, 10], [50, 14], [75, 10], [90, 0]],
    strokeColor: "#232F3E", backgroundColor: "transparent",
    roughness: 0, strokeWidth: 4,
  });
  return [r, t, smile];
}
function tplGCP() {
  const a = 36;
  return [
    filledRect(0,   0,   a, a, "#4285F4", { round: false }),
    filledRect(a+4, 0,   a, a, "#EA4335", { round: false }),
    filledRect(0,   a+4, a, a, "#FBBC04", { round: false }),
    filledRect(a+4, a+4, a, a, "#34A853", { round: false }),
    textEl(0, a*2 + 12, a*2 + 4, 24, "Google Cloud", { fontSize: 13, strokeColor: "#4285F4" }),
  ];
}
function tplAzure() {
  const tri = poly([[60, 0], [110, 90], [10, 90]], { stroke: "#0078D4", fill: "#0078D4" });
  const inner = poly([[60, 32], [85, 80], [40, 80]], { stroke: "#ffffff", fill: "#ffffff" });
  return [tri, inner, textEl(0, 95, 120, 22, "Azure", { fontSize: 16, strokeColor: "#0078D4" })];
}
function tplDocker() {
  const out = [];
  const C = "#0DB7ED";
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(filledRect(c * 22, r * 22, 18, 18, C, { round: false }));
    }
  }
  out.push(filledRect(-8, 50, 90, 26, C, { round: { type: 3 } }));
  out.push(textEl(-8, 80, 90, 22, "Docker", { fontSize: 16, strokeColor: C }));
  return out;
}
function tplKubernetes() {
  const cx = 60, cy = 60, r = 55, pts = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI / 7) * i;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  pts.push(pts[0]);
  const hep = poly(pts, { stroke: "#326CE5", fill: "#326CE5" });
  const t = textEl(20, 45, 80, 30, "k8s", { fontSize: 22, strokeColor: "#ffffff" });
  return [hep, t];
}
function tplGitHub() {
  const c = filledEllipse(0, 0, 100, 100, "#24292F");
  const t = textEl(0, 0, 100, 100, "GH", { fontSize: 36, strokeColor: "#ffffff" });
  bindTextToContainer(c, t);
  return [c, t, textEl(0, 105, 100, 22, "GitHub", { fontSize: 14, strokeColor: "#24292F" })];
}
function tplGitLab() {
  const t1 = poly([[10, 30], [50, 30], [30, 85]], { stroke: "#E24329", fill: "#E24329" });
  const t2 = poly([[50, 30], [90, 30], [70, 85]], { stroke: "#FC6D26", fill: "#FC6D26" });
  const t3 = poly([[30, 85], [70, 85], [50, 30]], { stroke: "#FCA326", fill: "#FCA326" });
  return [t1, t2, t3, textEl(0, 90, 100, 22, "GitLab", { fontSize: 14, strokeColor: "#FC6D26" })];
}
function tplSlack() {
  const C = ["#36C5F0", "#2EB67D", "#ECB22E", "#E01E5A"];
  return [
    filledRect(30, 0,  18, 50, C[0]),
    filledRect(55, 25, 18, 50, C[1]),
    filledRect(0,  30, 50, 18, C[2]),
    filledRect(25, 55, 50, 18, C[3]),
    textEl(0, 85, 75, 22, "Slack", { fontSize: 14, strokeColor: "#4A154B" }),
  ];
}
function tplStripe() {
  const r = filledRect(0, 0, 130, 90, "#635BFF");
  const t = textEl(0, 0, 130, 90, "S", { fontSize: 60, strokeColor: "#ffffff" });
  bindTextToContainer(r, t);
  return [r, t, textEl(0, 95, 130, 22, "Stripe", { fontSize: 16, strokeColor: "#635BFF" })];
}
function tplVercel() {
  const tri = poly([[60, 0], [120, 90], [0, 90]], { stroke: "#000000", fill: "#000000" });
  return [tri, textEl(0, 95, 120, 26, "Vercel", { fontSize: 18, strokeColor: "#000000" })];
}
function tplPostgres() {
  const c = filledEllipse(0, 0, 100, 100, "#336791");
  const t = textEl(0, 0, 100, 100, "PG", { fontSize: 36, strokeColor: "#ffffff" });
  bindTextToContainer(c, t);
  return [c, t, textEl(0, 105, 100, 22, "Postgres", { fontSize: 13, strokeColor: "#336791" })];
}
function tplMongoDB() {
  const leaf = poly([[50, 0], [95, 40], [80, 90], [50, 110], [20, 90], [5, 40]],
    { stroke: "#1B5E20", fill: "#47A248" });
  const stem = baseEl("line", 50, 0, 0, 110, {
    points: [[0, 0], [0, 110]], strokeColor: "#1B5E20", strokeWidth: 2, roughness: 0,
  });
  return [leaf, stem, textEl(0, 115, 100, 22, "MongoDB", { fontSize: 13, strokeColor: "#47A248" })];
}
function tplRedis() {
  const top   = poly([[0, 30], [60, 0], [120, 30], [60, 60]], { stroke: "#A41E11", fill: "#DC382D" });
  const left  = poly([[0, 30], [60, 60], [60, 110], [0, 80]], { stroke: "#A41E11", fill: "#A41E11" });
  const right = poly([[60, 60], [120, 30], [120, 80], [60, 110]], { stroke: "#A41E11", fill: "#7C1E16" });
  return [top, left, right, textEl(0, 115, 120, 22, "Redis", { fontSize: 14, strokeColor: "#DC382D" })];
}
function tplReact() {
  const C = "#61DAFB";
  const center = filledEllipse(58, 58, 24, 24, C);
  return [
    rotatedEllipse(0, 50, 140, 60, C, 0),
    rotatedEllipse(0, 50, 140, 60, C, Math.PI / 3),
    rotatedEllipse(0, 50, 140, 60, C, -Math.PI / 3),
    center,
    textEl(0, 130, 140, 22, "React", { fontSize: 16, strokeColor: C }),
  ];
}
function tplVue() {
  const outer = poly([[0, 0], [120, 0], [60, 90]], { stroke: "#41B883", fill: "#41B883" });
  const inner = poly([[24, 0], [96, 0], [60, 56]], { stroke: "#34495E", fill: "#34495E" });
  return [outer, inner, textEl(0, 95, 120, 22, "Vue", { fontSize: 16, strokeColor: "#41B883" })];
}
function tplNode() {
  const cx = 60, cy = 50, w = 55, h = 45;
  const pts = [[cx-w, cy], [cx-w/2, cy-h], [cx+w/2, cy-h], [cx+w, cy], [cx+w/2, cy+h], [cx-w/2, cy+h]];
  pts.push(pts[0]);
  const hex = poly(pts, { stroke: "#339933", fill: "#339933" });
  return [hex,
    textEl(20, 35, 80, 30, "Node", { fontSize: 18, strokeColor: "#ffffff" }),
    textEl(0, 105, 120, 22, "Node.js", { fontSize: 13, strokeColor: "#339933" })];
}
function tplNginx() {
  const r = filledRect(0, 0, 100, 100, "#009639");
  const t = textEl(0, 0, 100, 100, "N", { fontSize: 60, strokeColor: "#ffffff" });
  bindTextToContainer(r, t);
  return [r, t, textEl(0, 105, 100, 22, "Nginx", { fontSize: 14, strokeColor: "#009639" })];
}
function tplLinux() {
  const head = filledEllipse(30, 0, 60, 50, "#000000");
  const eye1 = filledEllipse(45, 20, 8, 12, "#ffffff");
  const eye2 = filledEllipse(67, 20, 8, 12, "#ffffff");
  const beak = poly([[55, 32], [65, 32], [60, 42]], { stroke: "#FCC624", fill: "#FCC624" });
  const body = filledEllipse(10, 40, 100, 90, "#000000");
  const belly = filledEllipse(30, 65, 60, 55, "#ffffff");
  const foot1 = filledEllipse(15, 115, 30, 20, "#FCC624");
  const foot2 = filledEllipse(75, 115, 30, 20, "#FCC624");
  return [body, head, eye1, eye2, beak, belly, foot1, foot2,
    textEl(0, 140, 120, 22, "Linux", { fontSize: 14, strokeColor: "#000000" })];
}
function tplPython() {
  const top = filledRect(0,  0,  90, 50, "#3776AB");
  const bot = filledRect(10, 30, 90, 50, "#FFD43B");
  return [top, bot,
    filledEllipse(15, 8,  10, 10, "#ffffff"),
    filledEllipse(75, 55, 10, 10, "#3776AB"),
    textEl(0, 85, 100, 22, "Python", { fontSize: 14, strokeColor: "#3776AB" })];
}
function tplTypeScript() {
  const r = filledRect(0, 0, 100, 100, "#3178C6");
  const t = textEl(0, 0, 100, 100, "TS", { fontSize: 44, strokeColor: "#ffffff" });
  bindTextToContainer(r, t);
  return [r, t];
}
function tplOpenAI() {
  const cx = 50, cy = 50, w = 45, h = 40;
  const pts = [[cx-w, cy], [cx-w/2, cy-h], [cx+w/2, cy-h], [cx+w, cy], [cx+w/2, cy+h], [cx-w/2, cy+h]];
  pts.push(pts[0]);
  const hex = poly(pts, { stroke: "#10A37F", fill: "transparent", sw: 4 });
  return [hex, textEl(0, 105, 100, 22, "OpenAI", { fontSize: 14, strokeColor: "#10A37F" })];
}
function tplAnthropic() {
  const r = filledRect(0, 0, 100, 100, "#D97757");
  const t = textEl(0, 0, 100, 100, "*", { fontSize: 60, strokeColor: "#ffffff" });
  bindTextToContainer(r, t);
  return [r, t, textEl(0, 105, 100, 22, "Anthropic", { fontSize: 12, strokeColor: "#D97757" })];
}
function tplFigma() {
  const C1 = "#F24E1E", C2 = "#FF7262", C3 = "#A259FF", C4 = "#1ABCFE", C5 = "#0ACF83";
  return [
    filledEllipse(20, 0,  40, 40, C1),
    filledEllipse(20, 40, 40, 40, C5),
    filledEllipse(60, 0,  40, 40, C2),
    filledEllipse(60, 40, 40, 40, C3),
    filledEllipse(20, 80, 40, 40, C4),
    textEl(0, 125, 100, 22, "Figma", { fontSize: 14, strokeColor: "#F24E1E" }),
  ];
}
function tplCloudflare() {
  const cloud = poly([[0,30],[20,10],[60,0],[100,10],[120,30],[100,40],[20,40]],
    { stroke: "#F38020", fill: "#F38020" });
  return [cloud, textEl(0, 50, 120, 22, "Cloudflare", { fontSize: 13, strokeColor: "#F38020" })];
}

// ---------- icon helpers ----------
function tplIconPerson() {
  const head = baseEl("ellipse", 30, 0, 40, 40, { strokeColor: PAL.ink, backgroundColor: PAL.cool, fillStyle: "solid", roughness: 0 });
  const body = baseEl("rectangle", 10, 45, 80, 70, { strokeColor: PAL.ink, backgroundColor: PAL.cool, fillStyle: "solid", roughness: 0, roundness: { type: 3 } });
  return [head, body];
}
function tplIconHome() {
  const roof = baseEl("diamond", 0, 0, 120, 70, { strokeColor: PAL.bad, backgroundColor: PAL.bad, fillStyle: "solid", roughness: 0, strokeWidth: 2 });
  const body = baseEl("rectangle", 15, 50, 90, 70, { strokeColor: PAL.bad, backgroundColor: "#fff5f5", fillStyle: "solid", roughness: 0, strokeWidth: 2 });
  const door = baseEl("rectangle", 45, 80, 30, 40, { strokeColor: PAL.bad, backgroundColor: PAL.bad, fillStyle: "solid", roughness: 0 });
  return [roof, body, door];
}
function tplIconCheck() {
  const ring = baseEl("ellipse", 0, 0, 100, 100, { strokeColor: PAL.good, backgroundColor: PAL.good, fillStyle: "solid", roughness: 0, strokeWidth: 3 });
  const l1 = baseEl("line", 25, 50, 20, 20, { points:[[0,0],[20,20]], strokeColor: "#ffffff", strokeWidth: 5 });
  const l2 = baseEl("line", 45, 70, 30, -35, { points:[[0,0],[30,-35]], strokeColor: "#ffffff", strokeWidth: 5 });
  return [ring, l1, l2];
}
function tplIconInfo() {
  const ring = baseEl("ellipse", 0, 0, 100, 100, { strokeColor: PAL.cool, backgroundColor: PAL.cool, fillStyle: "solid", roughness: 0, strokeWidth: 3 });
  const t = textEl(30, 15, 40, 70, "i", { fontSize: 60, strokeColor: "#ffffff" });
  return [ring, t];
}
function tplIconWarning() {
  const d = baseEl("diamond", 0, 0, 120, 100, { strokeColor: PAL.warm, backgroundColor: PAL.warm, fillStyle: "solid", roughness: 0, strokeWidth: 2 });
  const t = textEl(0, 0, 120, 100, "!", { fontSize: 48, strokeColor: "#ffffff" });
  bindTextToContainer(d, t);
  return [d, t];
}
function tplIconHeart() {
  const left  = baseEl("ellipse", 0,  0, 60, 60, { strokeColor: PAL.bad, backgroundColor: PAL.bad, fillStyle: "solid", roughness: 0 });
  const right = baseEl("ellipse", 40, 0, 60, 60, { strokeColor: PAL.bad, backgroundColor: PAL.bad, fillStyle: "solid", roughness: 0 });
  const bot   = baseEl("diamond", 0, 25, 100, 80, { strokeColor: PAL.bad, backgroundColor: PAL.bad, fillStyle: "solid", roughness: 0 });
  return [left, right, bot];
}
function tplIconGear() {
  const teeth = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const tx = 50 + Math.cos(a) * 42 - 7;
    const ty = 50 + Math.sin(a) * 42 - 7;
    teeth.push(baseEl("rectangle", tx, ty, 14, 14, {
      backgroundColor: "#475569", strokeColor: "#475569",
      fillStyle: "solid", roughness: 0, angle: a,
    }));
  }
  return [...teeth,
    filledEllipse(8, 8, 84, 84, "#475569"),
    filledEllipse(35, 35, 30, 30, "#ffffff")];
}
function tplIconCalendar() {
  const body = filledRect(0, 10, 100, 90, "#ffffff", { stroke: "#1e293b", sw: 2 });
  const top  = filledRect(0, 0, 100, 25, "#ef4444", { stroke: "#ef4444" });
  const r1 = filledRect(15, -5, 8, 20, "#1e293b", { round: false });
  const r2 = filledRect(75, -5, 8, 20, "#1e293b", { round: false });
  const dots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    dots.push(filledEllipse(15 + c * 16, 38 + r * 18, 8, 8, "#94a3b8"));
  }
  return [body, top, r1, r2, ...dots];
}
function tplIconMail() {
  const body = filledRect(0, 0, 120, 80, "#0ea5e9", { stroke: "#0ea5e9" });
  const flap1 = baseEl("line", 0, 0, 60, 40, {
    points: [[0,0],[60,40]], strokeColor: "#ffffff", strokeWidth: 3, roughness: 0,
  });
  const flap2 = baseEl("line", 60, 40, 60, -40, {
    points: [[0,0],[60,-40]], strokeColor: "#ffffff", strokeWidth: 3, roughness: 0,
  });
  return [body, flap1, flap2];
}
function tplIconBell() {
  const top = filledEllipse(35, 0, 30, 20, "#94a3b8");
  const body = poly([[20, 10], [80, 10], [90, 80], [10, 80]], { stroke: "#f59e0b", fill: "#f59e0b" });
  const base = filledRect(10, 80, 80, 10, "#f59e0b");
  const clap = filledEllipse(40, 90, 20, 12, "#94a3b8");
  return [body, top, base, clap];
}
function tplIconLock() {
  const arc = baseEl("ellipse", 20, 0, 60, 60, {
    strokeColor: "#1e293b", backgroundColor: "transparent",
    fillStyle: "hachure", roughness: 0, strokeWidth: 6,
  });
  const body = filledRect(0, 40, 100, 70, "#f59e0b");
  const hole = filledEllipse(40, 60, 20, 20, "#1e293b");
  return [arc, body, hole];
}
function tplIconKey() {
  const head = filledEllipse(0, 20, 50, 50, "#f59e0b");
  const hole = filledEllipse(15, 35, 20, 20, "#ffffff");
  const stem = filledRect(45, 35, 70, 14, "#f59e0b", { round: false });
  const tooth1 = filledRect(100, 49, 8, 14, "#f59e0b", { round: false });
  const tooth2 = filledRect(85, 49, 8, 12, "#f59e0b", { round: false });
  return [head, hole, stem, tooth1, tooth2];
}
function tplIconFolder() {
  const tab = filledRect(0, 0, 50, 20, "#f59e0b", { round: false });
  const body = filledRect(0, 12, 110, 80, "#fbbf24");
  return [tab, body];
}
function tplIconFile() {
  const body = filledRect(0, 0, 80, 100, "#ffffff", { stroke: "#1e293b", sw: 2 });
  const corner = poly([[60, 0], [80, 20], [60, 20]], { stroke: "#1e293b", fill: "#cbd5e1" });
  const l1 = baseEl("line", 10, 40, 60, 0, { points:[[0,0],[60,0]], strokeColor: "#94a3b8", strokeWidth: 2, roughness: 0 });
  const l2 = baseEl("line", 10, 55, 60, 0, { points:[[0,0],[60,0]], strokeColor: "#94a3b8", strokeWidth: 2, roughness: 0 });
  const l3 = baseEl("line", 10, 70, 40, 0, { points:[[0,0],[40,0]], strokeColor: "#94a3b8", strokeWidth: 2, roughness: 0 });
  return [body, corner, l1, l2, l3];
}
function tplIconSearch() {
  const ring = baseEl("ellipse", 0, 0, 70, 70, {
    strokeColor: "#1e293b", backgroundColor: "transparent",
    fillStyle: "hachure", roughness: 0, strokeWidth: 6,
  });
  const handle = baseEl("line", 60, 60, 40, 40, {
    points: [[0,0],[40,40]], strokeColor: "#1e293b", strokeWidth: 8, roughness: 0,
  });
  return [ring, handle];
}
function tplIconTrash() {
  const lid = filledRect(0, 0, 100, 15, "#ef4444", { round: false });
  const handle = filledRect(35, -8, 30, 10, "#ef4444", { round: false });
  const body = poly([[10, 15], [90, 15], [82, 100], [18, 100]], { stroke: "#ef4444", fill: "#ef4444" });
  const l1 = baseEl("line", 35, 30, 0, 55, { points:[[0,0],[0,55]], strokeColor: "#ffffff", strokeWidth: 3, roughness: 0 });
  const l2 = baseEl("line", 50, 30, 0, 55, { points:[[0,0],[0,55]], strokeColor: "#ffffff", strokeWidth: 3, roughness: 0 });
  const l3 = baseEl("line", 65, 30, 0, 55, { points:[[0,0],[0,55]], strokeColor: "#ffffff", strokeWidth: 3, roughness: 0 });
  return [body, lid, handle, l1, l2, l3];
}
function tplIconEye() {
  const lens = poly([[0,40],[50,0],[100,40],[50,80]], { stroke: "#1e293b", fill: "#ffffff" });
  const pupil = filledEllipse(35, 25, 30, 30, "#0ea5e9");
  const center = filledEllipse(43, 33, 14, 14, "#1e293b");
  return [lens, pupil, center];
}
function tplIconCloud2() {
  const e1 = filledEllipse(0,  30, 60, 60, "#e0f2fe", { stroke: "#0ea5e9" });
  const e2 = filledEllipse(30, 0,  80, 70, "#e0f2fe", { stroke: "#0ea5e9" });
  const e3 = filledEllipse(80, 20, 60, 60, "#e0f2fe", { stroke: "#0ea5e9" });
  const e4 = filledEllipse(30, 40, 90, 50, "#e0f2fe", { stroke: "#0ea5e9" });
  return [e1, e2, e3, e4];
}
function tplIconClock() {
  const face = filledEllipse(0, 0, 100, 100, "#ffffff", { stroke: "#1e293b", sw: 3 });
  const hour = baseEl("line", 50, 50, 0, -25, { points:[[0,0],[0,-25]], strokeColor: "#1e293b", strokeWidth: 4, roughness: 0 });
  const min  = baseEl("line", 50, 50, 30, 0,  { points:[[0,0],[30,0]],  strokeColor: "#1e293b", strokeWidth: 3, roughness: 0 });
  const center = filledEllipse(45, 45, 10, 10, "#ef4444");
  return [face, hour, min, center];
}
function tplIconBolt() {
  const b = poly([[40,0],[10,55],[35,55],[20,100],[60,40],[35,40]],
    { stroke: "#f59e0b", fill: "#fbbf24" });
  return [b];
}
function tplIconChart() {
  return [
    filledRect(0,  40, 20, 60, "#0ea5e9"),
    filledRect(30, 20, 20, 80, "#7c3aed"),
    filledRect(60, 50, 20, 50, "#10b981"),
    filledRect(90, 10, 20, 90, "#f59e0b"),
  ];
}
function tplIconLocation() {
  const pin = poly([[40, 0],[80, 30],[40, 100],[0, 30]], { stroke: "#ef4444", fill: "#ef4444" });
  const dot = filledEllipse(28, 18, 24, 24, "#ffffff");
  return [pin, dot];
}
function tplIconShield() {
  const s = poly([[0,15],[50,0],[100,15],[90,70],[50,100],[10,70]],
    { stroke: "#10b981", fill: "#10b981" });
  const check1 = baseEl("line", 25, 50, 18, 18, { points:[[0,0],[18,18]], strokeColor: "#ffffff", strokeWidth: 5, roughness: 0 });
  const check2 = baseEl("line", 43, 68, 30, -35, { points:[[0,0],[30,-35]], strokeColor: "#ffffff", strokeWidth: 5, roughness: 0 });
  return [s, check1, check2];
}
function tplIconUser() {
  const head = filledEllipse(25, 0, 50, 50, "#7c3aed");
  const body = baseEl("rectangle", 0, 50, 100, 60, {
    backgroundColor: "#7c3aed", strokeColor: "#7c3aed",
    fillStyle: "solid", roughness: 0,
    roundness: { type: 3 },
  });
  return [body, head];
}
function tplIconBookmark() {
  const b = poly([[0,0],[60,0],[60,100],[30,75],[0,100]], { stroke: "#ef4444", fill: "#ef4444" });
  return [b];
}
function tplIconStar() {
  const out = [];
  const cx = 50, cy = 50, r = 45;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    const rr = i % 2 === 0 ? r : r * 0.4;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  pts.push(pts[0]);
  out.push(baseEl("line", cx, cy, 0, 0, {
    points: pts,
    strokeColor: PAL.warm, backgroundColor: PAL.warm, fillStyle: "solid",
    roughness: 0, strokeWidth: 2,
  }));
  return out;
}

// ---------- more functional templates ----------
function tplPricing() {
  const out = [];
  const tiers = [
    ["Basic", "$9", PAL.cool],
    ["Pro", "$29", PAL.primary],
    ["Team", "$99", PAL.warm],
  ];
  tiers.forEach(([name, price, c], i) => {
    out.push(...H_box(i * 180, 0, 160, 240, { color: c, fs: 14 }));
    out.push(...H_txt(i * 180 + 50, 12, name,  { fs: 18, color: c }));
    out.push(...H_txt(i * 180 + 50, 50, price, { fs: 24, color: c }));
    out.push(...H_txt(i * 180 + 12, 100, "• Feature 1", { fs: 11, color: PAL.ink }));
    out.push(...H_txt(i * 180 + 12, 120, "• Feature 2", { fs: 11, color: PAL.ink }));
    out.push(...H_txt(i * 180 + 12, 140, "• Feature 3", { fs: 11, color: PAL.ink }));
    out.push(...H_box(i * 180 + 30, 190, 100, 36, { label: "Choose", color: c, fs: 12 }));
  });
  return out;
}
function tplChatUI() {
  const out = [];
  out.push(...H_box(0, 0, 140, 360, { color: PAL.ink, fill: "#1e293b15", fs: 14, label: "Conversations" }));
  for (let i = 0; i < 4; i++) {
    out.push(...H_box(8, 50 + i * 60, 124, 50, { label: "User " + (i+1), color: PAL.muted, fs: 11 }));
  }
  out.push(...H_box(140, 0, 360, 300, { color: PAL.ink }));
  out.push(...H_txt(150, 10, "Messages", { fs: 12, color: PAL.muted }));
  out.push(...H_box(160, 40,  240, 50, { label: "Hi there!", color: PAL.cool, fs: 12 }));
  out.push(...H_box(240, 110, 240, 50, { label: "Hello :)", color: PAL.good, fs: 12 }));
  out.push(...H_box(140, 310, 320, 50, { color: PAL.muted, label: "Type a message", fs: 12 }));
  out.push(...H_box(470, 310, 30,  50, { label: "→", color: PAL.primary, fs: 18 }));
  return out;
}
function tplMobileFrame() {
  const out = [];
  out.push(...H_box(0, 0, 220, 440, { color: PAL.ink, fs: 14 }));
  out.push(...H_box(10, 10, 200, 24, { label: "9:41    📶 100%", color: PAL.ink, fs: 10 }));
  out.push(...H_box(10, 44, 200, 320, { color: PAL.muted, label: "Content", fs: 14 }));
  out.push(...H_box(10, 374, 200, 56, { color: PAL.ink, fs: 12 }));
  for (let i = 0; i < 4; i++) {
    out.push(...H_box(15 + i * 50, 384, 40, 36, { label: ["Home","Search","Cart","Me"][i], color: PAL.muted, fs: 9 }));
  }
  return out;
}
function tplSequenceDiagram() {
  const out = [];
  const actors = ["Client", "API", "DB"];
  const colors = [PAL.cool, PAL.primary, PAL.warm];
  actors.forEach((a, i) => {
    const x = i * 180;
    out.push(...H_box(x, 0, 100, 50, { label: a, color: colors[i], fs: 14 }));
    out.push(...H_line(x + 50, 50, 0, 360, { dashed: true, color: PAL.muted }));
  });
  out.push(...H_arrowXY(50, 100, 230, 100, { color: PAL.primary }));
  out.push(...H_txt(80, 80, "request", { fs: 11, color: PAL.primary }));
  out.push(...H_arrowXY(230, 180, 410, 180, { color: PAL.warm }));
  out.push(...H_txt(260, 160, "query", { fs: 11, color: PAL.warm }));
  out.push(...H_arrowXY(410, 260, 230, 260, { color: PAL.good }));
  out.push(...H_txt(270, 240, "rows", { fs: 11, color: PAL.good }));
  out.push(...H_arrowXY(230, 340, 50, 340, { color: PAL.good }));
  out.push(...H_txt(80, 320, "response", { fs: 11, color: PAL.good }));
  return out;
}
function tplTerraform() {
  const plan  = H_box(0,   60, 120, 60, { label: "plan",  color: PAL.indigo, fs: 14 });
  const apply = H_box(160, 60, 120, 60, { label: "apply", color: PAL.indigo, fs: 14 });
  const state = H_box(320, 0,  140, 50, { label: "state file", color: PAL.warm, fs: 12 });
  const prov  = H_box(320, 60, 140, 50, { label: "provider",   color: PAL.cool, fs: 12 });
  const r1 = H_box(500, 0,   120, 40, { label: "EC2", color: PAL.muted, fs: 12 });
  const r2 = H_box(500, 60,  120, 40, { label: "RDS", color: PAL.muted, fs: 12 });
  const r3 = H_box(500, 120, 120, 40, { label: "S3",  color: PAL.muted, fs: 12 });
  return [...plan, ...apply, ...state, ...prov, ...r1, ...r2, ...r3,
    ...H_arrow(plan[0], apply[0]),
    ...H_arrow(apply[0], state[0]),
    ...H_arrow(apply[0], prov[0]),
    ...H_arrow(prov[0], r1[0]),
    ...H_arrow(prov[0], r2[0]),
    ...H_arrow(prov[0], r3[0])];
}
function tplTableList() {
  const out = [];
  const W = 480, H = 36;
  out.push(...H_box(0, 0, W, H, { color: PAL.ink, fill: "#1e293b15", label: "ID  |  Name  |  Status", fs: 12 }));
  for (let i = 0; i < 5; i++) {
    out.push(...H_box(0, (i + 1) * H, W, H, { color: PAL.muted, label: `${i+1}  |  Row ${i+1}  |  OK`, fs: 11 }));
  }
  out.push(...H_box(0, 6 * H + 8, W, 32, { color: PAL.ink, label: "< Prev   1 2 3   Next >", fs: 11 }));
  return out;
}
function tplLandingPage() {
  const out = [];
  out.push(...H_box(0, 0,   600, 40, { color: PAL.ink, label: "Logo  Home About Pricing", fs: 12 }));
  out.push(...H_box(0, 50,  600, 140, { color: PAL.primary, label: "Hero: tagline\nSubheadline\n[ CTA ]", fs: 16 }));
  for (let i = 0; i < 3; i++) {
    out.push(...H_box(i * 200, 210, 180, 100, { label: `Feature ${i+1}`, color: PAL.cool, fs: 14 }));
  }
  out.push(...H_box(0, 330, 600, 80, { color: PAL.warm, label: "Testimonials", fs: 14 }));
  out.push(...H_box(0, 430, 600, 60, { color: PAL.good, label: "CTA banner", fs: 16 }));
  out.push(...H_box(0, 510, 600, 50, { color: PAL.ink, label: "Footer", fs: 12 }));
  return out;
}

const STARTERS = [
  { name: "Sticky Note",       cat: "general",      build: starterStickyNote },
  { name: "Callout w Arrow",   cat: "general",      build: starterCallout },
  { name: "Flowchart Node",    cat: "process",      build: starterFlowchartNode },
  { name: "Decision Diamond",  cat: "process",      build: starterDecisionDiamond },
  { name: "Start End Pill",    cat: "process",      build: starterStartEndPill },
  { name: "Two Step Flow",     cat: "process",      build: starterTwoStepFlow },
  { name: "BPMN Snippet",      cat: "process",      build: tplBPMN },
  { name: "Swimlane",          cat: "process",      build: tplSwimlane },
  { name: "User Journey",      cat: "process",      build: tplUserJourney },
  { name: "Database",          cat: "architecture", build: starterDatabaseCylinder },
  { name: "Cloud",             cat: "architecture", build: starterCloud },
  { name: "Event Bus",         cat: "architecture", build: tplEventBus },
  { name: "Pub Sub",           cat: "architecture", build: tplPubSub },
  { name: "Serverless",        cat: "architecture", build: tplServerless },
  { name: "CDN",               cat: "architecture", build: tplCDN },
  { name: "UML Class Box",     cat: "uml",          build: starterUMLClassBox },
  { name: "Mind Map Root",     cat: "diagrams",     build: starterMindMapRoot },
  { name: "Org Chart",         cat: "diagrams",     build: tplOrgChart },
  { name: "Fishbone",          cat: "diagrams",     build: tplFishbone },
  { name: "Clean Arch",        cat: "diagrams",     build: tplCleanArch },
  { name: "Roadmap",           cat: "diagrams",     build: tplRoadmap },
  { name: "Kill Chain",        cat: "security",     build: tplKillchain },
  { name: "Zero Trust",        cat: "security",     build: tplZeroTrust },
  { name: "Venn 2",            cat: "math",         build: tplVenn2 },
  { name: "Number Line",       cat: "math",         build: tplNumberLine },
  { name: "Matrix 2x2",        cat: "math",         build: tplMatrix2x2 },
  { name: "CI CD",             cat: "devops",       build: tplCICD },
  { name: "Blue Green",        cat: "devops",       build: tplBlueGreen },
  { name: "Canary",            cat: "devops",       build: tplCanary },
  { name: "Dashboard",         cat: "webui",        build: tplDashboard },
  { name: "Login Form",        cat: "webui",        build: tplLoginForm },
  { name: "Modal",             cat: "webui",        build: tplModal },
  { name: "Pricing",           cat: "webui",        build: tplPricing },
  { name: "Chat UI",           cat: "webui",        build: tplChatUI },
  { name: "Mobile Frame",      cat: "webui",        build: tplMobileFrame },
  { name: "Table List",        cat: "webui",        build: tplTableList },
  { name: "Landing Page",      cat: "webui",        build: tplLandingPage },
  { name: "Sequence Diagram",  cat: "uml",          build: tplSequenceDiagram },
  { name: "Terraform",         cat: "devops",       build: tplTerraform },
  { name: "AWS",               cat: "brand",        build: tplAWS },
  { name: "Google Cloud",      cat: "brand",        build: tplGCP },
  { name: "Azure",             cat: "brand",        build: tplAzure },
  { name: "Docker",            cat: "brand",        build: tplDocker },
  { name: "Kubernetes",        cat: "brand",        build: tplKubernetes },
  { name: "GitHub",            cat: "brand",        build: tplGitHub },
  { name: "GitLab",            cat: "brand",        build: tplGitLab },
  { name: "Slack",             cat: "brand",        build: tplSlack },
  { name: "Stripe",            cat: "brand",        build: tplStripe },
  { name: "Vercel",            cat: "brand",        build: tplVercel },
  { name: "Postgres",          cat: "brand",        build: tplPostgres },
  { name: "MongoDB",           cat: "brand",        build: tplMongoDB },
  { name: "Redis",             cat: "brand",        build: tplRedis },
  { name: "React",             cat: "brand",        build: tplReact },
  { name: "Node.js",           cat: "brand",        build: tplNode },
  { name: "Nginx",             cat: "brand",        build: tplNginx },
  { name: "Linux",             cat: "brand",        build: tplLinux },
  { name: "Vue",               cat: "brand",        build: tplVue },
  { name: "Python",            cat: "brand",        build: tplPython },
  { name: "TypeScript",        cat: "brand",        build: tplTypeScript },
  { name: "OpenAI",            cat: "brand",        build: tplOpenAI },
  { name: "Anthropic",         cat: "brand",        build: tplAnthropic },
  { name: "Figma",             cat: "brand",        build: tplFigma },
  { name: "Cloudflare",        cat: "brand",        build: tplCloudflare },
  { name: "Icon Person",       cat: "icons",        build: tplIconPerson },
  { name: "Icon Home",         cat: "icons",        build: tplIconHome },
  { name: "Icon Check",        cat: "icons",        build: tplIconCheck },
  { name: "Icon Info",         cat: "icons",        build: tplIconInfo },
  { name: "Icon Warning",      cat: "icons",        build: tplIconWarning },
  { name: "Icon Heart",        cat: "icons",        build: tplIconHeart },
  { name: "Icon Star",         cat: "icons",        build: tplIconStar },
  { name: "Icon Gear",         cat: "icons",        build: tplIconGear },
  { name: "Icon Calendar",     cat: "icons",        build: tplIconCalendar },
  { name: "Icon Mail",         cat: "icons",        build: tplIconMail },
  { name: "Icon Bell",         cat: "icons",        build: tplIconBell },
  { name: "Icon Lock",         cat: "icons",        build: tplIconLock },
  { name: "Icon Key",          cat: "icons",        build: tplIconKey },
  { name: "Icon Folder",       cat: "icons",        build: tplIconFolder },
  { name: "Icon File",         cat: "icons",        build: tplIconFile },
  { name: "Icon Search",       cat: "icons",        build: tplIconSearch },
  { name: "Icon Trash",        cat: "icons",        build: tplIconTrash },
  { name: "Icon Eye",          cat: "icons",        build: tplIconEye },
  { name: "Icon Cloud",        cat: "icons",        build: tplIconCloud2 },
  { name: "Icon Clock",        cat: "icons",        build: tplIconClock },
  { name: "Icon Bolt",         cat: "icons",        build: tplIconBolt },
  { name: "Icon Chart",        cat: "icons",        build: tplIconChart },
  { name: "Icon Location",     cat: "icons",        build: tplIconLocation },
  { name: "Icon Shield",       cat: "icons",        build: tplIconShield },
  { name: "Icon User",         cat: "icons",        build: tplIconUser },
  { name: "Icon Bookmark",     cat: "icons",        build: tplIconBookmark },
  { name: "CQRS",              cat: "architecture", build: tplCQRS },
  { name: "Saga",              cat: "architecture", build: tplSaga },
  { name: "Lambda Arch",       cat: "architecture", build: tplLambdaArch },
  { name: "Activity Diagram",  cat: "uml",          build: tplActivityDiagram },
  { name: "Component Diagram", cat: "uml",          build: tplComponentDiagram },
  { name: "Package Diagram",   cat: "uml",          build: tplPackageDiagram },
  { name: "Object Diagram",    cat: "uml",          build: tplObjectDiagram },
  { name: "Value Chain",       cat: "process",      build: tplValueChain },
  { name: "PASTA",             cat: "security",     build: tplPASTA },
  { name: "PKI Chain",         cat: "security",     build: tplPKIChain },
  { name: "Venn 3",            cat: "math",         build: tplVenn3 },
  { name: "Set Builder",       cat: "math",         build: tplSetBuilder },
  { name: "Trig Circle",       cat: "math",         build: tplTrigCircle },
  { name: "GitOps Flow",       cat: "devops",       build: tplGitOpsFlow },
  { name: "Logging Stack",     cat: "devops",       build: tplLoggingStack },
  { name: "Tracing",           cat: "devops",       build: tplTracing },
  { name: "Onion Arch",        cat: "diagrams",     build: tplOnionArch },
  { name: "Feature Graph",     cat: "diagrams",     build: tplFeatureGraph },
  { name: "Whiteboard",        cat: "diagrams",     build: tplWhiteboard },
  { name: "Eisenhower Matrix", cat: "general",      build: tplEisenhower },
  { name: "Kanban Mini",       cat: "process",      build: tplKanbanMini },
  { name: "SWOT Mini",         cat: "diagrams",     build: tplSWOTMini },
  { name: "Timeline",          cat: "diagrams",     build: tplTimeline },
];

// ---------- folder + files ----------
async function ensureTemplatesFolder() {
  try { await vault.createFolder(TEMPLATES_FOLDER); }
  catch (e) { /* already exists */ }
}

const STARTER_VERSION = 8;
const VERSION_PATH = `${TEMPLATES_FOLDER}/.starter-version`;

async function bootstrapStartersIfMissing() {
  await ensureTemplatesFolder();
  let installedVer = 0;
  const verFile = vault.getAbstractFileByPath(VERSION_PATH);
  if (verFile) {
    try { installedVer = parseInt(await vault.read(verFile), 10) || 0; } catch (e) {}
  }
  const overwrite = installedVer < STARTER_VERSION;
  let added = 0, updated = 0;
  for (const s of STARTERS) {
    const path = `${TEMPLATES_FOLDER}/${s.name}.json`;
    const existing = vault.getAbstractFileByPath(path);
    const json = JSON.stringify(s.build(), null, 2);
    try {
      if (!existing) { await vault.create(path, json); added++; }
      else if (overwrite) { await vault.modify(existing, json); updated++; }
    } catch (e) { console.warn("Starter write failed", path, e); }
  }
  try {
    const verStr = String(STARTER_VERSION);
    if (verFile) await vault.modify(verFile, verStr);
    else await vault.create(VERSION_PATH, verStr);
  } catch (e) {}
  if (added > 0 || updated > 0) {
    new Notice(`Starters: +${added} new, ${updated} updated`);
  }
}

async function walkFolder(folder, subCat) {
  if (!folder || !folder.children) return;
  const starterCat = new Map(STARTERS.map(s => [s.name, s.cat]));
  const items = [...folder.children].sort((a, b) => a.name.localeCompare(b.name));
  for (const f of items) {
    if (f.children) {
      await walkFolder(f, subCat || f.name.toLowerCase());
    } else if (f.path.endsWith(".json")) {
      try {
        const raw = await vault.read(f);
        const els = JSON.parse(raw);
        if (!Array.isArray(els) || els.length === 0) continue;
        const name = f.basename || f.name.replace(/\.json$/, "");
        TEMPLATES.push({
          name, path: f.path, elements: els, count: els.length, file: f,
          cat: subCat || starterCat.get(name) || "user",
        });
      } catch (e) { console.warn("Template load failed", f.path, e); }
    } else if (f.path.endsWith(".excalidrawlib")) {
      try {
        const raw = await vault.read(f);
        const data = JSON.parse(raw);
        const libItems = data?.libraryItems || data?.library || [];
        libItems.forEach((item, i) => {
          const els = item.elements || item;
          if (!Array.isArray(els) || els.length === 0) return;
          const name = item.name || `${f.basename} #${i + 1}`;
          TEMPLATES.push({
            name, path: `${f.path}#${i}`, elements: els, count: els.length,
            file: null, libraryFile: f, cat: subCat || "library",
          });
        });
      } catch (e) { console.warn("Lib load failed", f.path, e); }
    }
  }
}
async function loadTemplates() {
  TEMPLATES = [];
  const folder = vault.getAbstractFileByPath(TEMPLATES_FOLDER);
  if (!folder) return;
  await walkFolder(folder, null);
}

// ---------- thumbnail renderer ----------
var THUMB_CACHE = new Map();
function escapeXML(s) { return String(s).replace(/[<>&"']/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;", "'":"&apos;" })[c]); }

function renderThumb(elements, W = 92, H = 64, pad = 4) {
  if (!elements || !elements.length) return "";
  const bb = getBBox(elements);
  if (bb.w <= 0 || bb.h <= 0) return "";
  const scale = Math.min((W - pad * 2) / bb.w, (H - pad * 2) / bb.h);
  const dx = pad - bb.x * scale + (W - pad * 2 - bb.w * scale) / 2;
  const dy = pad - bb.y * scale + (H - pad * 2 - bb.h * scale) / 2;
  const sx = (x) => (x * scale + dx).toFixed(2);
  const sy = (y) => (y * scale + dy).toFixed(2);
  const ssz = (n) => Math.max(0.1, n * scale).toFixed(2);

  const parts = [];
  for (const el of elements) {
    if (el.isDeleted) continue;
    const stroke = el.strokeColor || "#1e1e1e";
    const fill = (el.backgroundColor && el.backgroundColor !== "transparent") ? el.backgroundColor : "none";
    const sw = Math.max(0.5, (el.strokeWidth || 1) * scale * 0.6);
    const x = parseFloat(sx(el.x)), y = parseFloat(sy(el.y));
    const w = parseFloat(ssz(el.width || 0)), h = parseFloat(ssz(el.height || 0));
    if (el.type === "rectangle") {
      const r = el.roundness ? Math.min(w, h) * 0.15 : 0;
      parts.push(`<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${r}' ry='${r}' fill='${fill}' stroke='${stroke}' stroke-width='${sw}'/>`);
    } else if (el.type === "ellipse") {
      const cx = x + w/2, cy = y + h/2;
      const xform = el.angle ? ` transform='rotate(${(el.angle * 180 / Math.PI).toFixed(1)} ${cx} ${cy})'` : "";
      parts.push(`<ellipse cx='${cx}' cy='${cy}' rx='${w/2}' ry='${h/2}' fill='${fill}' stroke='${stroke}' stroke-width='${sw}'${xform}/>`);
    } else if (el.type === "diamond") {
      const cx = x + w/2, cy = y + h/2;
      parts.push(`<polygon points='${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}' fill='${fill}' stroke='${stroke}' stroke-width='${sw}'/>`);
    } else if (el.type === "line" || el.type === "arrow") {
      const pts = (el.points || [[0,0],[el.width||0, el.height||0]])
        .map(p => `${(el.x + p[0]) * scale + dx},${(el.y + p[1]) * scale + dy}`)
        .join(" ");
      const filled = el.type === "line" && el.backgroundColor && el.backgroundColor !== "transparent";
      const tag = filled ? "polygon" : "polyline";
      const fillCol = filled ? el.backgroundColor : "none";
      const marker = el.type === "arrow" ? `marker-end='url(#stArrow)'` : "";
      parts.push(`<${tag} points='${pts}' fill='${fillCol}' stroke='${stroke}' stroke-width='${sw}' ${marker}/>`);
    } else if (el.type === "text") {
      if (el.containerId) continue;
      const fs = Math.max(4, (el.fontSize || 16) * scale);
      const tx = x + w/2, ty = y + h/2 + fs * 0.35;
      parts.push(`<text x='${tx}' y='${ty}' font-size='${fs.toFixed(1)}' fill='${stroke}' text-anchor='middle' font-family='sans-serif'>${escapeXML(el.text || "")}</text>`);
    } else if (el.type === "freedraw") {
      const pts = (el.points || []).map(p => `${(el.x + p[0]) * scale + dx},${(el.y + p[1]) * scale + dy}`).join(" ");
      if (pts) parts.push(`<polyline points='${pts}' fill='none' stroke='${stroke}' stroke-width='${sw}'/>`);
    }
  }
  const defs = `<defs><marker id='stArrow' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='5' markerHeight='5' orient='auto'><path d='M0,0 L10,5 L0,10 z' fill='currentColor'/></marker></defs>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>${defs}${parts.join("")}</svg>`;
}

function thumbDataURL(template) {
  if (THUMB_CACHE.has(template.path)) return THUMB_CACHE.get(template.path);
  const svg = renderThumb(template.elements);
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  THUMB_CACHE.set(template.path, url);
  return url;
}

// ---------- insert ----------
function getBBox(els) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    if (el.isDeleted) continue;
    const x = el.x, y = el.y;
    const w = el.width || 0, h = el.height || 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function regenIds(els) {
  const map = new Map();
  const groupMap = new Map();
  for (const el of els) {
    map.set(el.id, uid());
    for (const gid of (el.groupIds || [])) {
      if (!groupMap.has(gid)) groupMap.set(gid, uid());
    }
  }
  const out = els.map(el => {
    const copy = JSON.parse(JSON.stringify(el));
    copy.id = map.get(el.id);
    copy.seed = rnd();
    copy.version = 1;
    copy.versionNonce = rnd();
    copy.updated = Date.now();
    copy.frameId = null;
    if (Array.isArray(copy.boundElements)) {
      copy.boundElements = copy.boundElements
        .map(b => map.has(b.id) ? { ...b, id: map.get(b.id) } : null)
        .filter(Boolean);
    }
    if (copy.containerId && map.has(copy.containerId)) copy.containerId = map.get(copy.containerId);
    if (copy.startBinding && copy.startBinding.elementId && map.has(copy.startBinding.elementId)) {
      copy.startBinding = { ...copy.startBinding, elementId: map.get(copy.startBinding.elementId) };
    }
    if (copy.endBinding && copy.endBinding.elementId && map.has(copy.endBinding.elementId)) {
      copy.endBinding = { ...copy.endBinding, elementId: map.get(copy.endBinding.elementId) };
    }
    copy.groupIds = (el.groupIds || []).map(g => groupMap.get(g) || g);
    return copy;
  });
  return out;
}

function insertTemplateAt(template, sceneX, sceneY) {
  const fresh = regenIds(template.elements);
  const bb = getBBox(fresh);
  const dx = sceneX - (bb.x + bb.w / 2);
  const dy = sceneY - (bb.y + bb.h / 2);
  for (const el of fresh) {
    el.x = el.x + dx;
    el.y = el.y + dy;
  }
  const existing = api.getSceneElements() || [];
  api.updateScene({ elements: [...existing, ...fresh], commitToHistory: true });
  pushRecent(template.path);
  cfg.usage = cfg.usage || {};
  cfg.usage[template.path] = (cfg.usage[template.path] || 0) + 1;
  state.dirty = true; persistSoon();
}

function insertAtCenter(template) {
  const st = api.getAppState();
  const z = st.zoom?.value ?? 1;
  const cx = -st.scrollX + (st.width || 0) / (2 * z);
  const cy = -st.scrollY + (st.height || 0) / (2 * z);
  insertTemplateAt(template, cx, cy);
}

function disarm() {
  if (ARMED_HANDLER) {
    try { ARMED_HANDLER(); } catch (e) {}
    ARMED_HANDLER = null;
  }
  ARMED = null;
  refreshArmedBadge();
}

function armForClick(template) {
  disarm();
  ARMED = template;
  refreshArmedBadge();

  const canvasEl = view.contentEl.querySelector(".excalidraw__canvas.interactive")
                || view.contentEl.querySelector(".excalidraw__canvas")
                || view.contentEl.querySelector(".excalidraw");
  if (!canvasEl) {
    new Notice("Canvas not found — inserting at center");
    insertAtCenter(template);
    disarm();
    return;
  }
  const origCursor = canvasEl.style.cursor;
  canvasEl.style.cursor = "crosshair";

  const onClick = (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const st = api.getAppState();
    const z = st.zoom?.value ?? 1;
    const sceneX = (e.clientX - rect.left) / z - st.scrollX;
    const sceneY = (e.clientY - rect.top) / z - st.scrollY;
    insertTemplateAt(template, sceneX, sceneY);
    disarm();
  };
  const onKey = (e) => { if (e.key === "Escape") { disarm(); new Notice("Cancelled"); } };

  canvasEl.addEventListener("click", onClick, { once: true });
  window.addEventListener("keydown", onKey);

  ARMED_HANDLER = () => {
    canvasEl.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    canvasEl.style.cursor = origCursor;
  };
  new Notice(`Click canvas to place "${template.name}" (Esc to cancel)`);
}

// ---------- save selection ----------
async function saveSelectionAsTemplate() {
  const sel = ea.getViewSelectedElements();
  if (!sel || sel.length === 0) {
    new Notice("Select elements first");
    return;
  }
  const name = await promptName("Save template as", "MyShape");
  if (!name) return;
  const safe = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (!safe) { new Notice("Invalid name"); return; }
  const path = `${TEMPLATES_FOLDER}/${safe}.json`;

  // Normalise: translate so bbox top-left is at (0,0).
  const cloned = JSON.parse(JSON.stringify(sel));
  const bb = getBBox(cloned);
  for (const el of cloned) {
    el.x = el.x - bb.x;
    el.y = el.y - bb.y;
    el.frameId = null;
    el.groupIds = [];
  }

  await ensureTemplatesFolder();
  const existing = vault.getAbstractFileByPath(path);
  try {
    if (existing) {
      await vault.modify(existing, JSON.stringify(cloned, null, 2));
    } else {
      await vault.create(path, JSON.stringify(cloned, null, 2));
    }
  } catch (e) {
    new Notice(`Save failed: ${e.message || e}`);
    return;
  }
  new Notice(`Saved "${safe}" (${cloned.length} elements)`);
  await loadTemplates();
  rebuildList();
}

function promptName(title, def) {
  return new Promise((resolve) => {
    const M = ea.obsidian.Modal;
    const modal = new M(app);
    modal.titleEl.setText(title);
    const input = modal.contentEl.createEl("input", { type: "text", value: def || "" });
    input.style.width = "100%";
    input.style.padding = "6px 8px";
    input.style.marginBottom = "10px";
    const btnRow = modal.contentEl.createDiv();
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "8px";
    const cancel = btnRow.createEl("button", { text: "Cancel" });
    const ok = btnRow.createEl("button", { text: "Save", cls: "mod-cta" });
    let resolved = false;
    const finish = (v) => { if (resolved) return; resolved = true; modal.close(); resolve(v); };
    cancel.onclick = () => finish(null);
    ok.onclick = () => finish(input.value.trim());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); finish(input.value.trim()); }
      else if (e.key === "Escape") { e.preventDefault(); finish(null); }
    });
    modal.onClose = () => finish(null);
    modal.open();
    setTimeout(() => input.focus(), 0);
  });
}

async function duplicateTemplate(template) {
  if (!template?.file) return;
  const newName = await promptName("Duplicate as", `${template.name} (copy)`);
  if (!newName) return;
  const safe = newName.replace(/[\\/:*?"<>|]/g, "_").trim();
  const dir = template.file.parent?.path || TEMPLATES_FOLDER;
  const path = `${dir}/${safe}.json`;
  if (vault.getAbstractFileByPath(path)) { new Notice("Name exists"); return; }
  try { await vault.create(path, JSON.stringify(template.elements, null, 2)); }
  catch (e) { new Notice(`Duplicate failed: ${e.message || e}`); return; }
  new Notice(`Duplicated as "${safe}"`);
  THUMB_CACHE.clear();
  await loadTemplates();
  rebuildList();
}
async function renameTemplate(template) {
  if (!template?.file) return;
  const newName = await promptName("Rename to", template.name);
  if (!newName || newName === template.name) return;
  const safe = newName.replace(/[\\/:*?"<>|]/g, "_").trim();
  const dir = template.file.parent?.path || TEMPLATES_FOLDER;
  const newPath = `${dir}/${safe}.json`;
  if (vault.getAbstractFileByPath(newPath)) { new Notice("Name exists"); return; }
  try { await app.fileManager.renameFile(template.file, newPath); }
  catch (e) { new Notice(`Rename failed: ${e.message || e}`); return; }
  new Notice(`Renamed to "${safe}"`);
  THUMB_CACHE.clear();
  await loadTemplates();
  rebuildList();
}
async function deleteTemplate(template) {
  if (!template?.file) {
    new Notice("Cannot delete library item (delete the .excalidrawlib file directly)");
    return;
  }
  try { await vault.delete(template.file); }
  catch (e) { new Notice(`Delete failed: ${e.message || e}`); return; }
  new Notice(`Deleted "${template.name}"`);
  await loadTemplates();
  rebuildList();
}

// ---------- panel ----------
let panel = document.getElementById(PANEL_ID);
if (panel) {
  const hidden = panel.style.display === "none";
  panel.style.display = hidden ? "" : "none";
  if (hidden) stRaisePanel(panel);
  return;
}

if (!document.getElementById(STYLE_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_ID;
  styleTag.textContent = `
    #${PANEL_ID} {
      position: absolute; top: 80px; right: 16px;
      width: 248px; max-height: 75vh; display:flex; flex-direction:column;
      padding: 10px 10px 10px;
      box-sizing: border-box; overflow: hidden;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 10px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.28);
      z-index: 50; font-size: 12px;
      font-family: var(--font-interface);
    }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} .st-header {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:6px; margin-bottom:8px;
      border-bottom:1px solid var(--background-modifier-border);
      cursor: grab; user-select: none;
    }
    #${PANEL_ID} .st-title {
      font-weight:600; font-size:13px; display:flex; align-items:center; gap:5px;
    }
    #${PANEL_ID} .st-title svg { color: var(--text-accent); }
    #${PANEL_ID} .st-tools { display:flex; gap:2px; }
    #${PANEL_ID} .st-iconbtn {
      cursor:pointer; padding: 3px; border-radius: 4px;
      color: var(--text-muted); display:flex; align-items:center; justify-content:center;
      background: transparent; border: none;
    }
    #${PANEL_ID} .st-iconbtn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
    #${PANEL_ID} .st-iconbtn.is-cta { color: var(--interactive-accent); }
    #${PANEL_ID} .st-iconbtn svg { width:15px; height:15px; }

    #${PANEL_ID} .st-anchor {
      display:flex; gap:0; margin-bottom: 6px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 5px; overflow: hidden;
    }
    #${PANEL_ID} .st-anchor button {
      flex:1; padding: 3px 6px; font-size: 11px;
      background: transparent; border: none; cursor:pointer;
      color: var(--text-muted);
    }
    #${PANEL_ID} .st-anchor button.is-on {
      background: var(--background-modifier-hover); color: var(--text-normal); font-weight: 500;
    }

    #${PANEL_ID} .st-cats {
      display:flex; gap: 3px; margin-bottom: 7px;
      flex-wrap: wrap;
    }
    #${PANEL_ID} .st-cats button {
      padding: 2px 6px; font-size: 10px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 9px; cursor: pointer;
      color: var(--text-muted); white-space: nowrap;
      line-height: 1.4;
    }
    #${PANEL_ID} .st-cats button:hover { color: var(--text-normal); }
    #${PANEL_ID} .st-cats button.is-on {
      background: var(--interactive-accent); color: var(--text-on-accent);
      border-color: var(--interactive-accent);
    }

    #${PANEL_ID} .st-armed {
      display:none; padding: 5px 7px; margin-bottom: 7px;
      background: var(--interactive-accent); color: var(--text-on-accent);
      border-radius: 5px; font-size: 11px; text-align:center; cursor: pointer;
    }
    #${PANEL_ID} .st-armed.is-on { display:block; }

    #${PANEL_ID} .st-list {
      overflow-y: auto; overflow-x: hidden; flex: 1; min-height: 80px;
      display:grid; grid-template-columns: 1fr 1fr; gap: 5px;
      padding-right: 2px;
    }
    #${PANEL_ID} .st-chip {
      position: relative; min-width: 0;
      display:flex; flex-direction:column; align-items:stretch;
      padding: 4px; cursor:pointer;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      transition: transform 0.08s, border-color 0.1s;
    }
    #${PANEL_ID} .st-chip:hover { transform: scale(1.03); }
    #${PANEL_ID} .st-chip.is-armed {
      border-color: var(--interactive-accent);
      box-shadow: 0 0 0 1px var(--interactive-accent);
    }
    #${PANEL_ID} .st-thumb {
      width: 100%; aspect-ratio: 5 / 3;
      background: var(--background-primary);
      border-radius: 4px;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
    }
    #${PANEL_ID} .st-chip-name {
      margin-top: 3px; font-size: 10.5px;
      text-align: center; color: var(--text-normal);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #${PANEL_ID} .st-chip-del {
      position: absolute; top: 2px; right: 2px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px; padding: 2px;
      color: var(--text-muted); cursor: pointer;
      opacity: 0; transition: opacity 0.1s;
    }
    #${PANEL_ID} .st-chip:hover .st-chip-del { opacity: 1; }
    #${PANEL_ID} .st-chip-del:hover { color: var(--text-error); }
    #${PANEL_ID} .st-chip-del svg { width: 11px; height: 11px; display:block; }

    #${PANEL_ID} .st-empty {
      grid-column: 1 / -1;
      padding: 16px 6px; text-align:center;
      color: var(--text-muted); font-size: 11px;
    }

    #${PANEL_ID} .st-search-row {
      margin-bottom: 6px;
    }
    #${PANEL_ID} .st-search-row input {
      width: 100%; padding: 5px 8px; font-size: 12px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 5px; color: var(--text-normal);
      box-sizing: border-box;
    }
    #${PANEL_ID} .st-search-row input:focus {
      outline: none; border-color: var(--interactive-accent);
    }

    #${PANEL_ID} .st-recent-row {
      display:flex; align-items:center; gap: 4px; margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px dashed var(--background-modifier-border);
    }
    #${PANEL_ID} .st-recent-lbl {
      font-size: 9px; color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.5px; flex-shrink: 0; margin-right: 2px;
    }
    #${PANEL_ID} .st-recent-chip {
      width: 32px; height: 24px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px; cursor: pointer;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      transition: transform 0.08s;
    }
    #${PANEL_ID} .st-recent-chip:hover { transform: scale(1.1); }

    #${PANEL_ID} .st-chip-fav {
      position: absolute; top: 2px; left: 2px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px; padding: 1px 4px;
      color: var(--text-muted); cursor: pointer;
      opacity: 0; font-size: 11px; line-height: 1;
      transition: opacity 0.1s;
    }
    #${PANEL_ID} .st-chip:hover .st-chip-fav { opacity: 1; }
    #${PANEL_ID} .st-chip.is-fav .st-chip-fav { opacity: 1; color: #f59e0b; }
    #${PANEL_ID} .st-chip-fav:hover { color: #f59e0b; }

    #${PANEL_ID} .st-chip.is-dragging { opacity: 0.4; }

    .st-ctx-menu {
      position: absolute;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      z-index: 66; min-width: 140px;
      padding: 4px 0; font-size: 12px;
      font-family: var(--font-interface);
    }
    .st-ctx-item {
      padding: 5px 12px; cursor: pointer;
      color: var(--text-normal);
    }
    .st-ctx-item:hover { background: var(--background-modifier-hover); }

    .st-preview {
      position: absolute; z-index: 65;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px; padding: 8px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.4);
      pointer-events: none;
    }
    .st-preview svg { display: block; }
    .st-preview-name {
      margin-top: 6px; font-size: 12px; font-weight: 600;
      color: var(--text-normal); text-align: center;
      font-family: var(--font-interface);
    }

    #${PANEL_ID} .st-ctrl-row {
      display: flex; gap: 4px; align-items: center; margin-bottom: 6px;
    }
    #${PANEL_ID} .st-sort {
      flex: 1; padding: 3px 5px; font-size: 11px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px; color: var(--text-normal);
    }
    #${PANEL_ID} .st-density {
      display: flex; gap: 0;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px; overflow: hidden;
    }
    #${PANEL_ID} .st-density button {
      padding: 3px 7px; font-size: 10px;
      background: transparent; border: none; cursor: pointer;
      color: var(--text-muted); font-weight: 600;
    }
    #${PANEL_ID} .st-density button.is-on {
      background: var(--interactive-accent); color: var(--text-on-accent);
    }

    #${PANEL_ID}[data-density="S"] .st-list { grid-template-columns: repeat(3, 1fr); gap: 4px; }
    #${PANEL_ID}[data-density="S"] .st-thumb { aspect-ratio: 1 / 1; }
    #${PANEL_ID}[data-density="S"] .st-chip-name { font-size: 9px; }
    #${PANEL_ID}[data-density="S"] .st-chip { padding: 3px; }

    #${PANEL_ID}[data-density="L"] .st-list { grid-template-columns: 1fr; gap: 6px; }
    #${PANEL_ID}[data-density="L"] .st-thumb { aspect-ratio: 16 / 9; }
    #${PANEL_ID}[data-density="L"] .st-chip-name { font-size: 13px; }

    #${PANEL_ID} .st-resize {
      position: absolute; right: 2px; bottom: 2px;
      width: 14px; height: 14px; cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, var(--text-muted) 50%, var(--text-muted) 60%, transparent 60%, transparent 70%, var(--text-muted) 70%, var(--text-muted) 80%, transparent 80%);
      opacity: 0.4;
    }
    #${PANEL_ID} .st-resize:hover { opacity: 1; }
  `;
  document.head.appendChild(styleTag);
}

panel = document.createElement("div");
panel.id = PANEL_ID;
panel.classList.add("excali-floating-panel");
const _panelHost =
  view.contentEl.querySelector(".excalidraw") || view.contentEl;
if (_panelHost && getComputedStyle(_panelHost).position === "static") {
  _panelHost.style.position = "relative";
}
_panelHost.appendChild(panel);
stRaisePanel(panel);
panel.addEventListener("mousedown", () => stRaisePanel(panel), true);

// ---------- header ----------
const header = panel.createDiv({ cls: "st-header" });
const titleEl = header.createDiv({ cls: "st-title" });
titleEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="M3 14h7v7H3z"/><path d="M14 17l3.5-3.5L21 17l-3.5 3.5z"/></svg> Shapes`;
const tools = header.createDiv({ cls: "st-tools" });
const btnSave = tools.createEl("button", { cls: "st-iconbtn is-cta", attr: { title: "Save selection as template" } });
btnSave.innerHTML = ICON_PLUS;
btnSave.onclick = () => saveSelectionAsTemplate();
const btnAnchor = tools.createEl("button", { cls: "st-iconbtn" });
function updateAnchorBtn() {
  btnAnchor.innerHTML = cfg.anchor === "click" ? ICON_TARGET : ICON_CENTER;
  btnAnchor.title = cfg.anchor === "click"
    ? "Place mode: next click (toggle)"
    : "Place mode: canvas center (toggle)";
}
updateAnchorBtn();
btnAnchor.onclick = () => {
  cfg.anchor = cfg.anchor === "click" ? "center" : "click";
  updateAnchorBtn();
  state.dirty = true; persistSoon();
};
const btnRefresh = tools.createEl("button", { cls: "st-iconbtn", attr: { title: "Reload templates" } });
btnRefresh.innerHTML = ICON_REFRESH;
btnRefresh.onclick = async () => { THUMB_CACHE.clear(); await loadTemplates(); rebuildList(); new Notice("Reloaded"); };
const btnFolder = tools.createEl("button", { cls: "st-iconbtn", attr: { title: "Templates folder path" } });
btnFolder.innerHTML = ICON_FOLDER;
btnFolder.onclick = () => new Notice(`Folder: ${TEMPLATES_FOLDER}`);
const closeBtn = tools.createEl("button", { cls: "st-iconbtn", attr: { title: "Close" } });
closeBtn.innerHTML = ICON_X;
closeBtn.onclick = () => { disarm(); panel.style.display = "none"; };

// ---------- draggable ----------
(function makeDraggable() {
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    const r = panel.getBoundingClientRect();
    dragging = true; ox = e.clientX - r.left; oy = e.clientY - r.top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const hr = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const left = Math.max(m, Math.min(hr.width  - w - m, e.clientX - hr.left - ox));
    const top  = Math.max(m, Math.min(hr.height - h - m, e.clientY - hr.top  - oy));
    panel.style.setProperty("left",  `${left}px`, "important");
    panel.style.setProperty("top",   `${top}px`,  "important");
    panel.style.setProperty("right", "auto", "important");
  });
  window.addEventListener("mouseup", () => {
    if (dragging) { dragging = false; header.style.cursor = "grab"; }
  });
})();
(function clampOnResize() {
  const clamp = () => {
    const hr = _panelHost.getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight, m = 8;
    const cl = panel.offsetLeft, ct = panel.offsetTop;
    if (cl + w > hr.width  - m) panel.style.setProperty("left", `${Math.max(m, hr.width  - w - m)}px`, "important");
    if (ct + h > hr.height - m) panel.style.setProperty("top",  `${Math.max(m, hr.height - h - m)}px`, "important");
    if (cl < m) panel.style.setProperty("left", `${m}px`, "important");
    if (ct < m) panel.style.setProperty("top",  `${m}px`, "important");
  };
  window.addEventListener("resize", clamp);
})();

// ---------- search row ----------
const searchRow = panel.createDiv({ cls: "st-search-row" });
const searchInp = searchRow.createEl("input", { type: "text", attr: { placeholder: "Search shapes... (/)", spellcheck: "false" } });
searchInp.oninput = () => { SEARCH_Q = searchInp.value; applyFilter(); };
searchInp.onkeydown = (e) => {
  if (e.key === "Escape") { searchInp.value = ""; SEARCH_Q = ""; applyFilter(); }
  else if (e.key === "Enter") {
    e.preventDefault();
    const first = listEl.querySelector(".st-chip:not([style*='display: none'])");
    if (first) {
      const tpl = TEMPLATES.find(t => t.path === first.dataset.path);
      if (tpl) (cfg.anchor === "center" ? insertAtCenter : armForClick)(tpl);
    }
  }
};

// ---------- controls row (sort + density) ----------
const ctrlRow = panel.createDiv({ cls: "st-ctrl-row" });
const sortSel = ctrlRow.createEl("select", { cls: "st-sort", attr: { title: "Sort order" } });
sortSel.innerHTML = `
  <option value="name">A-Z</option>
  <option value="recent">Recent</option>
  <option value="popular">Popular</option>
  <option value="count">Element count</option>
`;
sortSel.value = cfg.sort || "name";
sortSel.onchange = () => { cfg.sort = sortSel.value; state.dirty = true; persistSoon(); rebuildList(); };
const densGroup = ctrlRow.createDiv({ cls: "st-density" });
const dBtns = {};
for (const d of ["S","M","L"]) {
  const b = densGroup.createEl("button", { text: d, attr: { title: `Density: ${d}` } });
  dBtns[d] = b;
  b.onclick = () => {
    cfg.density = d;
    panel.dataset.density = d;
    for (const k of Object.keys(dBtns)) dBtns[k].classList.toggle("is-on", k === d);
    state.dirty = true; persistSoon();
  };
  if (d === (cfg.density || "M")) b.classList.add("is-on");
}
panel.dataset.density = cfg.density || "M";

// ---------- recent row ----------
var recentRow = panel.createDiv({ cls: "st-recent-row" });

// ---------- category tabs ----------
const catBar = panel.createDiv({ cls: "st-cats" });
const catBtns = {};
for (const c of CATEGORIES) {
  const b = catBar.createEl("button", { text: CAT_LABEL[c] || c, attr: { title: c.charAt(0).toUpperCase() + c.slice(1) } });
  catBtns[c] = b;
  b.onclick = () => {
    cfg.cat = c;
    for (const k of Object.keys(catBtns)) catBtns[k].classList.toggle("is-on", k === c);
    state.dirty = true; persistSoon();
    applyFilter();
  };
  if (c === cfg.cat) b.classList.add("is-on");
}


// ---------- armed badge ----------
const armedBadge = panel.createDiv({ cls: "st-armed" });
armedBadge.onclick = () => { disarm(); new Notice("Cancelled"); };
function refreshArmedBadge() {
  if (ARMED) {
    armedBadge.classList.add("is-on");
    armedBadge.textContent = `Click canvas to place "${ARMED.name}" — click here to cancel`;
  } else {
    armedBadge.classList.remove("is-on");
  }
  // mark active chip
  for (const node of listEl.querySelectorAll(".st-chip")) {
    node.classList.toggle("is-armed", node.dataset.path === ARMED?.path);
  }
}

// ---------- list ----------
const listEl = panel.createDiv({ cls: "st-list" });

var SEARCH_Q = "";
var HOVER_TIMER = null;
var PREVIEW_EL = null;
var CTX_MENU = null;

function pushRecent(path) {
  cfg.recent = [path, ...(cfg.recent || []).filter(p => p !== path)].slice(0, 8);
  state.dirty = true; persistSoon();
  renderRecent();
}
function toggleFav(path) {
  const set = new Set(cfg.favorites || []);
  if (set.has(path)) set.delete(path); else set.add(path);
  cfg.favorites = [...set];
  state.dirty = true; persistSoon();
  applyFilter();
  renderRecent();
  for (const chip of listEl.querySelectorAll(".st-chip")) {
    chip.classList.toggle("is-fav", set.has(chip.dataset.path));
  }
}
function isFav(path) {
  return (cfg.favorites || []).includes(path);
}

function getSortedTemplates() {
  const sort = cfg.sort || "name";
  const list = [...TEMPLATES];
  if (sort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "recent") {
    const idx = new Map((cfg.recent || []).map((p, i) => [p, i]));
    list.sort((a, b) => (idx.get(a.path) ?? 1e9) - (idx.get(b.path) ?? 1e9));
  } else if (sort === "popular") {
    const u = cfg.usage || {};
    list.sort((a, b) => (u[b.path] || 0) - (u[a.path] || 0) || a.name.localeCompare(b.name));
  } else if (sort === "count") {
    list.sort((a, b) => a.count - b.count);
  }
  return list;
}

function rebuildList() {
  listEl.empty();
  if (!TEMPLATES.length) {
    const empty = listEl.createDiv({ cls: "st-empty" });
    empty.innerHTML = `No templates yet.<br>Use <b>+</b> to save current selection.`;
    return;
  }
  for (const tpl of getSortedTemplates()) {
    const chip = listEl.createDiv({
      cls: "st-chip" + (isFav(tpl.path) ? " is-fav" : ""),
      attr: { "data-path": tpl.path, "data-cat": tpl.cat, "data-name": tpl.name.toLowerCase(),
              title: `${tpl.name} — ${tpl.count} els  (right-click for menu, shift+click = center, drag to canvas)` },
    });
    chip.draggable = true;
    const thumb = chip.createDiv({ cls: "st-thumb" });
    thumb.style.backgroundImage = `url("${thumbDataURL(tpl)}")`;
    chip.createDiv({ cls: "st-chip-name", text: tpl.name });
    const fav = chip.createEl("button", { cls: "st-chip-fav", attr: { title: "Toggle favorite" } });
    fav.innerHTML = "★";
    fav.onclick = (e) => { e.stopPropagation(); toggleFav(tpl.path); };
    chip.onclick = (e) => {
      if (e.shiftKey) insertAtCenter(tpl);
      else if (cfg.anchor === "center") insertAtCenter(tpl);
      else armForClick(tpl);
    };
    chip.oncontextmenu = (e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY, tpl); };
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/x-shape-template", tpl.path);
      e.dataTransfer.effectAllowed = "copy";
      chip.classList.add("is-dragging");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("is-dragging"));
    chip.addEventListener("mouseenter", () => scheduleHoverPreview(tpl, chip));
    chip.addEventListener("mouseleave", () => cancelHoverPreview());
  }
  applyFilter();
}

function applyFilter() {
  const q = (SEARCH_Q || "").toLowerCase();
  const active = cfg.cat || "all";
  const favs = new Set(cfg.favorites || []);
  let shown = 0;
  for (const chip of listEl.querySelectorAll(".st-chip")) {
    const path = chip.dataset.path;
    const cat  = chip.dataset.cat;
    const name = chip.dataset.name;
    const catOk = active === "all"
      || (active === "fav" ? favs.has(path) : cat === active);
    const qOk = !q || name.includes(q);
    const show = catOk && qOk;
    chip.style.display = show ? "" : "none";
    if (show) shown++;
  }
  let empty = listEl.querySelector(".st-empty");
  if (shown === 0) {
    if (!empty) {
      empty = listEl.createDiv({ cls: "st-empty" });
    }
    empty.innerHTML = q
      ? `No matches for "${q}".`
      : (active === "fav" ? `No favorites yet. Click ★ on any chip to add.` : `No templates in "${CAT_LABEL[active] || active}".`);
    empty.style.display = "";
  } else if (empty) {
    empty.style.display = "none";
  }
}

function showContextMenu(x, y, tpl) {
  hideContextMenu();
  const menu = document.createElement("div");
  menu.className = "st-ctx-menu excali-floating-panel";
  // x/y are viewport coords (clientX/Y) → translate to host-relative.
  const _hr = _panelHost.getBoundingClientRect();
  menu.style.left = `${x - _hr.left}px`; menu.style.top = `${y - _hr.top}px`;
  const items = [
    [isFav(tpl.path) ? "Unfavorite" : "Favorite ★", () => toggleFav(tpl.path)],
    ["Insert at center", () => insertAtCenter(tpl)],
    ["Insert on click",  () => armForClick(tpl)],
  ];
  if (tpl.file) {
    items.push(["Duplicate", () => duplicateTemplate(tpl)]);
    items.push(["Rename", () => renameTemplate(tpl)]);
    items.push(["Open JSON", () => app.workspace.openLinkText(tpl.file.path, "", true)]);
    items.push(["Delete", () => deleteTemplate(tpl)]);
  }
  for (const [label, fn] of items) {
    const it = menu.createDiv({ cls: "st-ctx-item", text: label });
    it.onclick = () => { hideContextMenu(); fn(); };
  }
  _panelHost.appendChild(menu);
  CTX_MENU = menu;
  setTimeout(() => {
    const off = (ev) => {
      if (!menu.contains(ev.target)) { hideContextMenu(); document.removeEventListener("mousedown", off, true); }
    };
    document.addEventListener("mousedown", off, true);
  }, 0);
}
function hideContextMenu() { if (CTX_MENU) { CTX_MENU.remove(); CTX_MENU = null; } }

function scheduleHoverPreview(tpl, anchorEl) {
  cancelHoverPreview();
  HOVER_TIMER = setTimeout(() => showHoverPreview(tpl, anchorEl), 400);
}
function cancelHoverPreview() {
  if (HOVER_TIMER) clearTimeout(HOVER_TIMER);
  HOVER_TIMER = null;
  if (PREVIEW_EL) { PREVIEW_EL.remove(); PREVIEW_EL = null; }
}
function showHoverPreview(tpl, anchorEl) {
  const div = document.createElement("div");
  div.className = "st-preview excali-floating-panel";
  const svg = renderThumb(tpl.elements, 240, 180, 12);
  div.innerHTML = svg + `<div class='st-preview-name'>${tpl.name}</div>`;
  _panelHost.appendChild(div);
  const r = anchorEl.getBoundingClientRect();
  const hr = _panelHost.getBoundingClientRect();
  const pw = div.offsetWidth;
  const ph = div.offsetHeight;
  const margin = 8;
  // host-relative anchor coords
  const aLeft = r.left - hr.left, aRight = r.right - hr.left;
  const aTop = r.top - hr.top, aBottom = r.bottom - hr.top;
  let left = aLeft - pw - 10;
  if (left < margin) left = aRight + 10;
  if (left + pw > hr.width - margin) left = hr.width - pw - margin;
  if (left < margin) left = margin;
  let top = aTop + (aBottom - aTop) / 2 - ph / 2;
  if (top < margin) top = margin;
  if (top + ph > hr.height - margin) top = hr.height - ph - margin;
  div.style.left = `${left}px`;
  div.style.top  = `${top}px`;
  PREVIEW_EL = div;
}

function renderRecent() {
  if (!recentRow) return;
  recentRow.empty();
  const paths = (cfg.recent || []).slice(0, 6);
  if (!paths.length) { recentRow.style.display = "none"; return; }
  recentRow.style.display = "";
  recentRow.createDiv({ cls: "st-recent-lbl", text: "Recent" });
  for (const p of paths) {
    const tpl = TEMPLATES.find(t => t.path === p);
    if (!tpl) continue;
    const mini = recentRow.createDiv({ cls: "st-recent-chip", attr: { title: tpl.name } });
    mini.style.backgroundImage = `url("${thumbDataURL(tpl)}")`;
    mini.onclick = (e) => {
      if (e.shiftKey || cfg.anchor === "center") insertAtCenter(tpl);
      else armForClick(tpl);
    };
  }
}

// ---------- resize handle ----------
const resizeH = panel.createDiv({ cls: "st-resize", attr: { title: "Drag to resize" } });
(function makeResizable() {
  let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
  resizeH.addEventListener("mousedown", (e) => {
    resizing = true; sx = e.clientX; sy = e.clientY;
    sw = panel.offsetWidth; sh = panel.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const hr = _panelHost.getBoundingClientRect();
    const w = Math.max(190, Math.min(hr.width  - 20, sw + e.clientX - sx));
    const h = Math.max(220, Math.min(hr.height - 20, sh + e.clientY - sy));
    panel.style.setProperty("width",      `${w}px`, "important");
    panel.style.setProperty("max-height", `${h}px`, "important");
    cfg.panelW = w; cfg.panelH = h;
  });
  window.addEventListener("mouseup", () => {
    if (resizing) { resizing = false; state.dirty = true; persistSoon(); }
  });
})();
if (cfg.panelW) panel.style.setProperty("width", `${cfg.panelW}px`, "important");
if (cfg.panelH) panel.style.setProperty("max-height", `${cfg.panelH}px`, "important");

// ---------- global keyboard ----------
if (!window.__shapeTplKey) {
  window.__shapeTplKey = (e) => {
    const p = document.getElementById(PANEL_ID);
    if (!p || p.style.display === "none") return;
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      p.querySelector(".st-search-row input")?.focus();
    }
  };
  window.addEventListener("keydown", window.__shapeTplKey);
}

// ---------- drag-drop on canvas ----------
(function setupDrop() {
  const target = view.contentEl;
  if (!target) return;
  if (view._shapeTplDropHandlers) {
    const h = view._shapeTplDropHandlers;
    h.target.removeEventListener("dragover", h.onOver, true);
    h.target.removeEventListener("drop", h.onDrop, true);
  }
  const onOver = (e) => {
    if (e.dataTransfer?.types?.includes("text/x-shape-template")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
  };
  const onDrop = (e) => {
    const path = e.dataTransfer?.getData("text/x-shape-template");
    if (!path) return;
    e.preventDefault(); e.stopPropagation();
    const tpl = TEMPLATES.find(t => t.path === path);
    if (!tpl) return;
    const canvas = view.contentEl.querySelector(".excalidraw__canvas.interactive")
                || view.contentEl.querySelector(".excalidraw__canvas")
                || view.contentEl;
    const rect = canvas.getBoundingClientRect();
    const st = api.getAppState();
    const z = st.zoom?.value ?? 1;
    const sceneX = (e.clientX - rect.left) / z - st.scrollX;
    const sceneY = (e.clientY - rect.top)  / z - st.scrollY;
    insertTemplateAt(tpl, sceneX, sceneY);
  };
  target.addEventListener("dragover", onOver, true);
  target.addEventListener("drop", onDrop, true);
  view._shapeTplDropHandlers = { target, onOver, onDrop };
})();

// ---------- boot ----------
(async () => {
  await bootstrapStartersIfMissing();
  await loadTemplates();
  rebuildList();
  renderRecent();
  setTimeout(() => searchInp?.focus?.(), 50);
})();

/*
```
*/
