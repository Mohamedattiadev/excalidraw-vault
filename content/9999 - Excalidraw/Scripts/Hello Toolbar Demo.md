---
excalidraw-plugin: parsed
---

/*
Hello Toolbar Demo — proof-of-concept for idea #11 (Top Toolbar
Injection). Mounts a single custom dropdown-trigger into the native
Excalidraw top toolbar. Clicking it opens a popover styled exactly
like the built-in "More tools" dropdown.

Markup mirrors Excalidraw's own .dropdown-menu-container / .dropdown
-menu-button / .dropdown-menu / .Island.dropdown-menu-container chain
so the popover inherits background, shadow, padding, hover, theming,
and zen-mode transition for free. A MutationObserver re-injects when
Excalidraw re-renders the toolbar (theme switch, view reopen).

Pair with `TemplateOfTemplator/hello-toolbar-demo-startup.md` so this
auto-installs on every Excalidraw view.

```javascript
*/
const STYLE_ID    = "excali-hello-toolbar-style";
const WRAP_ID     = "excali-hello-toolbar-wrap";
const TRIGGER_ID  = "excali-hello-toolbar-trigger";
const MENU_ID     = "excali-hello-toolbar-menu";
const DIVIDER_ID  = "excali-hello-toolbar-divider";

// Demo entries — each rendered as a native dropdown-menu-item. Easy
// place to add more demos later: push another { key, label, shortcut,
// badge? } and the popover picks it up on next open.
const DEMO_ITEMS = [
  { key: "hi",    label: "Say hi",             shortcut: "1", badge: null },
  { key: "hello", label: "Say hello",          shortcut: "2", badge: null },
  { key: "salam", label: "Say salam (Arabic)", shortcut: "3", badge: "AR" },
];

const view = ea.targetView;
if (!view) { new ea.obsidian.Notice("No active Excalidraw view"); return; }

const prior = view._helloToolbarOverlay;
if (prior && prior.cleanup) prior.cleanup();

// ---------- styles ----------
// Excalidraw's .dropdown-menu has no built-in show/hide. Native
// behaviour relies on conditional rendering in React. We control it
// with an `[data-open]` attribute on the wrapper.
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    #${WRAP_ID} > #${MENU_ID} { display: none; }
    #${WRAP_ID}[data-open="1"] > #${MENU_ID} { display: block; }
  `;
  document.head.appendChild(s);
}

// ---------- shared click handler ----------
function sayHi(variant) {
  const phrase =
    variant === "hello" ? "hello ati"
  : variant === "salam" ? "السلام عليكم يا عاطي"
  : "hi ati";
  new ea.obsidian.Notice(phrase, 1800);
}

// ---------- native-style menu item factory ----------
// Byte-matches the markup used by Frame / Web Embed / Laser entries
// inside the More-tools popover.
function buildMenuItem(def, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dropdown-menu-item dropdown-menu-item-base";

  const icon = document.createElement("div");
  icon.className = "dropdown-menu-item__icon";
  icon.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="var(--icon-fill-color)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M18 11V6a2 2 0 0 0-4 0"></path><path d="M14 10V4a2 2 0 0 0-4 0v2"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></g></svg>`;

  const text = document.createElement("div");
  text.className = "dropdown-menu-item__text";
  const span = document.createElement("span");
  span.style.cssText = "text-overflow: ellipsis; overflow: hidden; white-space: nowrap;";
  span.textContent = def.label;
  if (def.badge) {
    const badge = document.createElement("div");
    badge.className = "DropDownMenuItemBadge";
    badge.style.cssText = "display: inline-flex; margin-left: auto; padding: 2px 4px; border-radius: 6px; font-size: 9px; font-family: Cascadia, monospace; border: 1.5px solid white; background: var(--color-promo); color: var(--color-surface-lowest);";
    badge.textContent = def.badge;
    span.appendChild(badge);
  }
  text.appendChild(span);

  btn.appendChild(icon);
  btn.appendChild(text);

  if (def.shortcut) {
    const sc = document.createElement("div");
    sc.className = "dropdown-menu-item__shortcut";
    sc.textContent = def.shortcut;
    btn.appendChild(sc);
  }

  btn.onclick = (e) => { e.stopPropagation(); onClick?.(); };
  return btn;
}

// ---------- dropdown trigger + popover ----------
// Full markup chain:
//   <div class="dropdown-menu-container" style="display:contents">
//     <button class="dropdown-menu-button App-toolbar__extra-tools-trigger zen-mode-transition" ...>
//       <svg .../>
//     </button>
//     <div class="dropdown-menu App-toolbar__extra-tools-dropdown" data-testid="dropdown-menu">
//       <div class="Island dropdown-menu-container" style="--padding: 2; z-index: 2;">
//         items...
//       </div>
//     </div>
//   </div>
// Visibility is toggled by setting [data-open="1"] on the wrapper.
function buildWrapper() {
  const wrap = document.createElement("div");
  wrap.id = WRAP_ID;
  wrap.className = "dropdown-menu-container";
  wrap.style.display = "contents";

  // Trigger button — copies the "More tools" button markup so it
  // sizes / hovers / theme-switches like a native trigger.
  const trigger = document.createElement("button");
  trigger.id = TRIGGER_ID;
  trigger.type = "button";
  trigger.className = "dropdown-menu-button App-toolbar__extra-tools-trigger zen-mode-transition";
  trigger.title = "Hello Toolbar Demo — click to open";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("data-testid", "hello-toolbar-trigger");
  trigger.innerHTML = `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="var(--icon-fill-color)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M18 11V6a2 2 0 0 0-4 0"></path><path d="M14 10V4a2 2 0 0 0-4 0v2"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></g></svg>`;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = wrap.getAttribute("data-open") === "1";
    if (open) {
      wrap.removeAttribute("data-open");
      document.removeEventListener("mousedown", outsideClick, true);
      document.removeEventListener("keydown", escKey, true);
    } else {
      wrap.setAttribute("data-open", "1");
      // Defer so this click doesn't immediately match outside-click.
      setTimeout(() => {
        document.addEventListener("mousedown", outsideClick, true);
        document.addEventListener("keydown", escKey, true);
      }, 0);
    }
  });

  // Popover — exact native classes + nested Island.
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.className = "dropdown-menu App-toolbar__extra-tools-dropdown";
  menu.setAttribute("data-testid", "dropdown-menu");

  const island = document.createElement("div");
  island.className = "Island dropdown-menu-container";
  island.style.setProperty("--padding", "2");
  island.style.zIndex = "2";

  for (const item of DEMO_ITEMS) {
    island.appendChild(buildMenuItem(item, () => {
      sayHi(item.key);
      closeMenu();
    }));
  }
  menu.appendChild(island);

  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  function closeMenu() {
    wrap.removeAttribute("data-open");
    document.removeEventListener("mousedown", outsideClick, true);
    document.removeEventListener("keydown", escKey, true);
  }
  function outsideClick(e) {
    if (wrap.contains(e.target)) return;
    closeMenu();
  }
  function escKey(e) { if (e.key === "Escape") closeMenu(); }

  wrap._closeMenu = closeMenu;
  return wrap;
}

function buildDivider() {
  const d = document.createElement("div");
  d.id = DIVIDER_ID;
  d.className = "App-toolbar__divider";
  return d;
}

// ---------- inject / re-inject ----------
function injectAll() {
  const toolbar = view.contentEl.querySelector(".App-toolbar");
  if (!toolbar) return false;
  if (toolbar.querySelector("#" + WRAP_ID)) return true;
  toolbar.appendChild(buildDivider());
  toolbar.appendChild(buildWrapper());
  return true;
}

injectAll();

// MutationObserver — re-inject on toolbar re-render (theme switch,
// view reopen). Cheap idempotent check via querySelector.
const mo = new MutationObserver(() => { injectAll(); });
mo.observe(view.contentEl, { childList: true, subtree: true });

view._helloToolbarOverlay = {
  cleanup: () => {
    try { mo.disconnect(); } catch (_) {}
    const wrap = document.getElementById(WRAP_ID);
    if (wrap?._closeMenu) wrap._closeMenu();
    wrap?.remove();
    document.getElementById(DIVIDER_ID)?.remove();
    view._helloToolbarOverlay = null;
    view._helloToolbarInstalled = false;
  }
};
view._helloToolbarInstalled = true;
new ea.obsidian.Notice("Hello Toolbar Demo installed — wave icon added to the top toolbar", 2400);
/*
```
*/
