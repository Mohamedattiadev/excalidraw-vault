---
excalidraw-plugin: parsed
---

/*
AI Edit — Gemini-powered context-aware edit of the selected text element.

UX:
  - Select exactly one text element on the canvas.
  - A small ✨ "AI" button appears above the selection.
  - Click → tiny inline input field appears next to the button.
  - Type your instruction + Enter.
  - Gemini reads the element's current text + your instruction +
    decides whether to REPLACE the text or APPEND to it. The element's
    text is updated in place (or extended) — no popups, no new tab.
  - Esc or click outside closes the input.

Settings exposed in Excalidraw -> Settings for installed Scripts:
  - About
  - Gemini API key (free key from https://aistudio.google.com/apikey)
  - Model (gemini-2.5-flash / gemini-2.5-pro / gemini-2.0-flash)

Pair with a Templater startup template so the overlay auto-installs on
every Excalidraw view (same pattern as Mask Tap Listener / Minimap).

```javascript
*/
const OVERLAY_ID_PREFIX = "excali-ai-edit-overlay-";
const STYLE_ID = "excali-ai-edit-style";

// ---------- model catalog (free + fast) ----------
// Listed roughly by speed. Provider tag drives endpoint + auth.
// OpenRouter free tier: append `:free` to model id (no charge on free models).
// Groq free tier: very low latency, generous free quota per day.
const MODELS = [
  // Gemini (https://ai.google.dev/gemini-api/docs/models)
  { id: "gemini-2.5-flash",                       label: "Gemini 2.5 Flash",                provider: "gemini" },
  { id: "gemini-2.0-flash",                       label: "Gemini 2.0 Flash",                provider: "gemini" },
  { id: "gemini-2.0-flash-lite",                  label: "Gemini 2.0 Flash Lite",           provider: "gemini" },
  { id: "gemini-2.5-pro",                         label: "Gemini 2.5 Pro (smart)",          provider: "gemini" },
  // Groq (https://console.groq.com/docs/models) — fastest free inference
  { id: "llama-3.1-8b-instant",                   label: "Groq · Llama 3.1 8B (instant)",   provider: "groq" },
  { id: "llama-3.3-70b-versatile",                label: "Groq · Llama 3.3 70B",            provider: "groq" },
  { id: "gemma2-9b-it",                           label: "Groq · Gemma 2 9B",               provider: "groq" },
  { id: "deepseek-r1-distill-llama-70b",          label: "Groq · DeepSeek R1 Distill 70B",  provider: "groq" },
  // OpenRouter (https://openrouter.ai/models?max_price=0) — verified free
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "OR · Llama 3.3 70B (free)",       provider: "openrouter" },
  { id: "meta-llama/llama-3.1-8b-instruct:free",  label: "OR · Llama 3.1 8B (free)",        provider: "openrouter" },
  { id: "google/gemma-2-9b-it:free",              label: "OR · Gemma 2 9B (free)",          provider: "openrouter" },
  { id: "mistralai/mistral-7b-instruct:free",     label: "OR · Mistral 7B (free)",          provider: "openrouter" },
  { id: "deepseek/deepseek-r1:free",              label: "OR · DeepSeek R1 (free)",         provider: "openrouter" },
  { id: "qwen/qwen-2.5-72b-instruct:free",        label: "OR · Qwen 2.5 72B (free)",        provider: "openrouter" },
];

// ---------- settings ----------
const settings = ea.getScriptSettings() || {};
let dirty = false;
// Remove stale About entry from earlier versions.
if (settings["About"]) { delete settings["About"]; dirty = true; }
if (!settings["Gemini API key"]) {
  settings["Gemini API key"] = {
    value: "",
    description: "Free key at https://aistudio.google.com/apikey. Stored locally."
  };
  dirty = true;
}
if (!settings["OpenRouter API key"]) {
  settings["OpenRouter API key"] = {
    value: "",
    description: "Free key at https://openrouter.ai/keys. Stored locally."
  };
  dirty = true;
}
if (!settings["Groq API key"]) {
  settings["Groq API key"] = {
    value: "",
    description: "Free key at https://console.groq.com/keys. Stored locally."
  };
  dirty = true;
}
// Remove the obsolete single-model setting (was a valueset dropdown of
// only Gemini models). Settings UI: leaving it would show stale options.
if (settings["Model"] && Array.isArray(settings["Model"]?.valueset)) {
  delete settings["Model"];
  dirty = true;
}
// Remember the user's last picked model in the popup.
if (!settings["Last model"]) {
  settings["Last model"] = {
    value: "gemini-2.5-flash",
    description: "Auto-updated to whatever you last picked in the AI popup."
  };
  dirty = true;
}
if (dirty) await ea.setScriptSettings(settings);

const KEYS = {
  gemini:     String(settings["Gemini API key"]?.value || "").trim(),
  openrouter: String(settings["OpenRouter API key"]?.value || "").trim(),
  groq:       String(settings["Groq API key"]?.value || "").trim(),
};
let currentModelId = String(settings["Last model"]?.value || "gemini-2.5-flash").trim();
if (!MODELS.find(m => m.id === currentModelId)) currentModelId = MODELS[0].id;

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }
const api = ea.getExcalidrawAPI();
if (!api) { new ea.obsidian.Notice("Excalidraw API unavailable"); return; }

// ---------- one overlay per view (cleanup prior) ----------
const overlayId = OVERLAY_ID_PREFIX + (view.leaf?.id || "default");
const prior = view._aiEditOverlay;
if (prior && prior.cleanup) prior.cleanup();
document.getElementById(overlayId)?.remove();

// ---------- styles (one-time) ----------
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .ai-edit-btn {
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
    .ai-edit-btn::before {
      content: "✦";
      font-size: 12px;
      color: var(--interactive-accent);
      line-height: 1;
    }
    .ai-edit-btn:hover {
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border-color: var(--interactive-accent);
      transform: translateY(-1px);
    }
    .ai-edit-btn:hover::before { color: var(--text-on-accent); }
    .ai-edit-popup {
      position: fixed; z-index: 2001;
      display: flex; flex-direction: column; gap: 6px;
      padding: 8px 10px; border-radius: 12px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      font-family: var(--font-interface);
      backdrop-filter: blur(6px);
      min-width: 360px;
    }
    .ai-edit-popup .ai-row { display: flex; align-items: center; gap: 6px; }
    .ai-edit-popup select.ai-model {
      flex: 1; padding: 4px 8px; font-size: 11px;
      background: var(--background-secondary); color: var(--text-normal);
      border: 1px solid var(--background-modifier-border); border-radius: 6px;
      outline: none; font-family: var(--font-interface);
    }
    .ai-edit-popup .ai-tag {
      font-size: 9px; padding: 2px 5px; border-radius: 4px;
      background: var(--background-modifier-hover); color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;
    }
    .ai-edit-popup input {
      width: 280px; padding: 6px 10px; font-size: 12.5px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px; outline: none; background: var(--background-secondary);
      color: var(--text-normal);
    }
    .ai-edit-popup input:focus { border-color: var(--interactive-accent); }
    .ai-edit-popup .ai-send {
      padding: 6px 10px; border-radius: 8px; cursor: pointer;
      background: linear-gradient(135deg, #7c3aed, #db2777);
      color: white; font-size: 11px; font-weight: 700; border: none;
    }
    .ai-edit-popup .ai-spin {
      width: 16px; height: 16px; border: 2px solid var(--text-faint);
      border-top-color: var(--interactive-accent); border-radius: 50%;
      animation: ai-spin 0.8s linear infinite; margin: 0 4px;
    }
    @keyframes ai-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

// ---------- overlay state ----------
let btn = null, popup = null, currentEl = null, isLoading = false;

function clearOverlay() {
  if (btn)   { btn.remove();   btn = null; }
  if (popup) { popup.remove(); popup = null; }
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

function renderForElement(el) {
  if (!el) { clearOverlay(); currentEl = null; return; }
  // only text-like elements
  if (el.type !== "text") { clearOverlay(); currentEl = null; return; }
  // Hide on zoom-out: if element on-screen width < 60px the pill would
  // dwarf the element. User can zoom in to access.
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  if ((el.width || 0) * zoom < 60) { clearOverlay(); currentEl = null; return; }
  currentEl = el;
  const topLeft = sceneToScreen(el.x + (el.width || 0) / 2, el.y);
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "ai-edit-btn";
    btn.textContent = "AI";
    btn.title = "Edit with Gemini";
    document.body.appendChild(btn);
    btn.onclick = (e) => { e.stopPropagation(); openPrompt(); };
    // Forward wheel events to the canvas so scroll-zoom keeps working
    // while the cursor hovers the pill.
    btn.addEventListener("wheel", (e) => {
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
  // Layout: [TeX] [AI] [Export] centered above the element. Each pill
  // is owned by a different script; measure live widths each tick so we
  // shift to make room when the others appear / disappear.
  const AI_W   = btn?.offsetWidth || 52;
  const GAP    = 6;
  const voicePill = document.querySelector(".voice-text-mic-pill, .voice-text-stop");
  const voiceW    = voicePill ? voicePill.offsetWidth : 0;
  const texPill   = document.querySelector(".excali-tex-pill");
  const texW      = texPill ? texPill.offsetWidth : 0;
  // Resize Pills (− / +) sit in their own slot between TeX and AI. Treat
  // the pair as one block: MINUS + GAP + PLUS, then a GAP to the AI slot.
  const minusPill = document.querySelector(".excali-resize-minus");
  const plusPill  = document.querySelector(".excali-resize-plus");
  const resizeW   = (minusPill ? minusPill.offsetWidth : 0)
                  + (plusPill  ? plusPill.offsetWidth  : 0)
                  + ((minusPill && plusPill) ? GAP : 0);
  const groupPill = document.querySelector(".excali-group-pill");
  const grpW      = groupPill ? groupPill.offsetWidth : 0;
  const exportBar = document.querySelector(".excali-export-bar");
  const exportW   = exportBar ? exportBar.offsetWidth : 0;
  const groupW    = (voiceW ? voiceW + GAP : 0) + (texW ? texW + GAP : 0) + (resizeW ? resizeW + GAP : 0) + AI_W + (grpW ? GAP + grpW : 0) + (exportW ? GAP + exportW : 0);
  const groupLeft = topLeft.x - groupW / 2;
  let leftPx = groupLeft + (voiceW ? voiceW + GAP : 0) + (texW ? texW + GAP : 0) + (resizeW ? resizeW + GAP : 0);
  let topPx  = topLeft.y - 34;
  // Hide the pill entirely when the element's anchor point is off the
  // Excalidraw canvas viewport. Clamping kept the pill stuck at the
  // edge while the element was scrolled away, which looked broken.
  const canvas = view.contentEl.querySelector("canvas.interactive");
  const cRect  = canvas ? canvas.getBoundingClientRect() : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
  const elRightPx = sceneToScreen(el.x + (el.width || 0), el.y).x;
  const elBottomPx = sceneToScreen(el.x, el.y + (el.height || 0)).y;
  if (topLeft.y > cRect.bottom || elBottomPx < cRect.top ||
      elRightPx < cRect.left   || topLeft.x > cRect.right) {
    clearOverlay(); currentEl = null; return;
  }
  if (topPx < cRect.top + 6) topPx = cRect.top + 6;
  if (leftPx < cRect.left + 6) leftPx = cRect.left + 6;
  const maxLeft = (cRect.right || window.innerWidth) - groupW - 6;
  if (leftPx > maxLeft) leftPx = maxLeft;
  btn.style.left = `${leftPx}px`;
  btn.style.top  = `${topPx}px`;
  if (popup) positionPopup();
}

function openPrompt() {
  if (popup) { popup.querySelector("input").focus(); return; }
  popup = document.createElement("div");
  popup.className = "ai-edit-popup";
  const modelOptions = MODELS
    .map(m => `<option value="${m.id}" ${m.id === currentModelId ? "selected" : ""}>${m.label}</option>`)
    .join("");
  popup.innerHTML = `
    <div class="ai-row" data-input-row>
      <input type="text" placeholder="Edit with AI… (summarize / fix typos / translate / expand)" />
      <button class="ai-send" type="button">Send</button>
    </div>
    <div class="ai-row">
      <span class="ai-tag" data-provider>${(MODELS.find(m=>m.id===currentModelId)||MODELS[0]).provider}</span>
      <select class="ai-model" title="Model — switch if quota is hit">${modelOptions}</select>
    </div>
  `;
  document.body.appendChild(popup);
  positionPopup();
  const input = popup.querySelector("input");
  const sendBtn = popup.querySelector(".ai-send");
  const sel = popup.querySelector("select.ai-model");
  const tag = popup.querySelector("[data-provider]");
  sel.onchange = async () => {
    currentModelId = sel.value;
    tag.textContent = (MODELS.find(m=>m.id===currentModelId)||MODELS[0]).provider;
    const s = ea.getScriptSettings() || {};
    if (s["Last model"]) { s["Last model"].value = currentModelId; await ea.setScriptSettings(s); }
  };
  input.focus();
  const submit = async () => {
    const prompt = input.value.trim();
    if (!prompt) return;
    const model = MODELS.find(m => m.id === currentModelId) || MODELS[0];
    const k = KEYS[model.provider];
    if (!k) {
      new ea.obsidian.Notice(`Set ${model.provider} API key in Excalidraw → Settings → AI Edit`);
      return;
    }
    await runEdit(prompt);
  };
  sendBtn.onclick = submit;
  input.addEventListener("keydown", async (ev) => {
    if (ev.key === "Escape") { closePrompt(); return; }
    if (ev.key === "Enter") { ev.preventDefault(); await submit(); }
  });
  document.addEventListener("mousedown", outsideClick, true);
}
function outsideClick(e) {
  if (!popup) return;
  if (popup.contains(e.target) || (btn && btn.contains(e.target))) return;
  closePrompt();
}
function closePrompt() {
  if (popup) { popup.remove(); popup = null; }
  document.removeEventListener("mousedown", outsideClick, true);
}
function positionPopup() {
  if (!popup || !btn) return;
  const br = btn.getBoundingClientRect();
  popup.style.left = `${br.right + 6}px`;
  popup.style.top  = `${br.top - 4}px`;
}

// ---------- Multi-provider call ----------
const SYSTEM_PROMPT =
  "You are an AI text editor for a sticky-note inside a drawing app. " +
  "You see the CURRENT TEXT of one note and the USER INSTRUCTION. " +
  "Treat the instruction as a TASK to perform on the text, not as " +
  "verbatim content. Examples:\n" +
  "  CURRENT='' / INSTRUCTION='write 3 lines about cats' -> generate 3 lines.\n" +
  "  CURRENT='hello' / INSTRUCTION='translate to French' -> 'bonjour'.\n" +
  "  CURRENT='draft' / INSTRUCTION='fix typos' -> corrected text.\n" +
  "  CURRENT='note' / INSTRUCTION='add an example' -> note + example (use append).\n" +
  "  CURRENT='long essay' / INSTRUCTION='summarize' -> short version (use replace).\n" +
  "Decide REPLACE (overwrite) vs APPEND (add to existing). If the " +
  "instruction is vague (one or two words like 'random' or 'expand'), " +
  "interpret it generously and produce useful content rather than " +
  "echoing the instruction back.\n\n" +
  "Output ONLY valid JSON, no markdown fences, no preamble:\n" +
  '{"action":"replace"|"append","text":"the new text content"}\n' +
  "Plain text inside the text field. Keep responses concise.";

function buildUserContent(currentText, userPrompt) {
  return `CURRENT TEXT:\n"""${currentText}"""\n\nUSER INSTRUCTION:\n${userPrompt}`;
}

// Uses Obsidian's requestUrl (Node net stack) instead of browser fetch.
// Bypasses browser-side CORS and works in environments where direct
// browser fetch to googleapis.com / openrouter.ai is blocked
// (ERR_ADDRESS_UNREACHABLE in Electron's fetch but reachable from Node).
async function httpJson({ url, method = "POST", headers = {}, body }) {
  const reqUrl = ea.obsidian.requestUrl;
  if (typeof reqUrl !== "function") {
    // Fallback to fetch when requestUrl isn't available.
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = null; }
    return { status: res.status, ok: res.ok, text, data };
  }
  const res = await reqUrl({
    url, method, headers, body, throw: false, contentType: headers["Content-Type"] || "application/json"
  });
  return { status: res.status, ok: res.status >= 200 && res.status < 300, text: res.text || "", data: res.json };
}

async function callGemini(modelId, key, currentText, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserContent(currentText, userPrompt)}` }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
  };
  const res = await httpJson({ url, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${res.text}`);
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callOpenAICompatible(endpoint, modelId, key, currentText, userPrompt) {
  const body = {
    model: modelId,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: buildUserContent(currentText, userPrompt) }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  };
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  };
  if (endpoint.includes("openrouter")) {
    headers["HTTP-Referer"] = "https://obsidian.md";
    headers["X-Title"] = "Excalidraw AI Edit";
  }
  const res = await httpJson({ url: endpoint, headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${endpoint.includes("groq") ? "Groq" : "OpenRouter"} ${res.status}: ${res.text}`);
  return res.data?.choices?.[0]?.message?.content;
}

async function callAI(modelMeta, currentText, userPrompt) {
  const key = KEYS[modelMeta.provider];
  if (!key) throw new Error(`No API key set for ${modelMeta.provider}`);
  let raw;
  if (modelMeta.provider === "gemini") {
    raw = await callGemini(modelMeta.id, key, currentText, userPrompt);
  } else if (modelMeta.provider === "openrouter") {
    raw = await callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", modelMeta.id, key, currentText, userPrompt);
  } else if (modelMeta.provider === "groq") {
    raw = await callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", modelMeta.id, key, currentText, userPrompt);
  } else {
    throw new Error(`Unknown provider ${modelMeta.provider}`);
  }
  if (!raw) throw new Error("Empty AI response");
  // Strip code fences if the model emitted them despite instructions.
  raw = String(raw).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(raw); }
  catch (_) { return { action: "replace", text: raw }; }
}

async function runEdit(userPrompt) {
  if (!currentEl) return;
  isLoading = true;
  const input = popup.querySelector("input");
  const sendBtn = popup.querySelector(".ai-send");
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  const spin = document.createElement("div");
  spin.className = "ai-spin";
  // Insert the spinner inside the input row (input is no longer a direct
  // child of popup since the layout grew a second row for the model picker).
  const inputRow = popup.querySelector("[data-input-row]") || popup;
  inputRow.insertBefore(spin, input);
  try {
    const elNow = (api.getSceneElements() || []).find(e => e.id === currentEl.id) || currentEl;
    const currentText = elNow.originalText || elNow.text || "";
    const modelMeta = MODELS.find(m => m.id === currentModelId) || MODELS[0];
    const out = await callAI(modelMeta, currentText, userPrompt);
    const nextText = (out.action === "append" && currentText)
      ? (currentText + "\n" + out.text)
      : out.text;

    // Use EA workbench so the plugin's text-binding cache (the
    // source the in-place editor re-reads on dblclick / click) is
    // updated, and refreshTextElementSize recomputes width/height
    // with Excalidraw's own font metrics — fixes the previous
    // "text reverts on click" + "bbox mismatch" bugs.
    ea.copyViewElementsToEAforEditing([elNow]);
    const eel = ea.getElement(currentEl.id);
    if (eel) {
      eel.text         = nextText;
      eel.originalText = nextText;
      eel.rawText      = nextText;
      // Preserve original element width and force autoResize=false so
      // Excalidraw word-wraps long AI replies to fit the existing box
      // (instead of growing the element into one giant single line).
      // refreshTextElementSize then recomputes height-only for the
      // wrapped lines.
      eel.autoResize   = false;
      if (elNow.width) eel.width = elNow.width;
      try { ea.refreshTextElementSize(currentEl.id); } catch (_) {}
    }
    // addElementsToView(repositionToCursor=false, save=true,
    // newElementsOnTop=false) commits the modified element back and
    // persists the .md file. shouldRestoreElements defaults true
    // which restores binding indices Excalidraw needs.
    await ea.addElementsToView(false, true, false);
    closePrompt();
    new ea.obsidian.Notice(`AI ${out.action === "append" ? "appended" : "replaced"} text`);
  } catch (e) {
    console.error("[AI Edit] failed", e);
    const msg = String(e.message || e);
    const meta = MODELS.find(m => m.id === currentModelId);
    let hint = "";
    if (/UNREACHABLE|ENOTFOUND|DNS|getaddrinfo/i.test(msg) && meta) {
      const altProv = meta.provider === "gemini"
        ? (MODELS.find(m => m.provider === "groq") || MODELS.find(m => m.provider === "openrouter"))
        : (MODELS.find(m => m.provider === "gemini"));
      if (altProv) hint = ` Try switching to "${altProv.label}" (provider: ${altProv.provider}).`;
    }
    new ea.obsidian.Notice(`AI Edit: ${msg}.${hint}`, 8000);
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    spin.remove();
  } finally {
    isLoading = false;
  }
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
  if (!isViewLive()) { clearOverlay(); closePrompt(); currentEl = null; return; }
  const st = api.getAppState();
  const ids = Object.keys(st.selectedElementIds || {});
  if (ids.length !== 1) { clearOverlay(); currentEl = null; return; }
  const el = (api.getSceneElements() || []).find(e => e.id === ids[0]);
  if (!el || el.type !== "text") { clearOverlay(); currentEl = null; return; }
  renderForElement(el);
}
// Subscribe to the shared pill-tick scheduler so all three pill scripts
// (AI Edit / Export Element / LaTeX Canvas) share ONE rAF loop per
// view instead of three. The scheduler also short-circuits when the
// selection + zoom + scroll signature is unchanged from the last tick,
// so a steady canvas costs near-zero CPU.
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
      // Include each selected element's xywh so element drags fire a
      // refresh. Without this, dragging an element doesn't change the
      // selection id, zoom or scroll — and the pill froze in place.
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
    // 30Hz throttle: skip every other frame unless a pass is pending.
    if ((sched.frame & 1) && sched.pendingPasses <= 0) return;
    if (sched.subs.size === 0) return;
    const s = sig();
    if (s !== sched.lastSig) {
      sched.lastSig = s;
      // Two passes per change so each pill can read the others' final
      // offsetWidth after the first pass commits new DOM. Without this
      // two pills overlapped on the frame they all repositioned at once.
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

view._aiEditOverlay = {
  cleanup: () => {
    pillTick.subs.delete(refresh);
    if (pillTick.subs.size === 0) { try { pillTick.stop(); } catch (_) {} }
    try { if (typeof unsubScroll === "function") unsubScroll(); } catch (_) {}
    try { ro?.disconnect(); } catch (_) {}
    clearOverlay();
    closePrompt();
    view._aiEditOverlay = null;
  }
};
refresh();
/*
```
*/
