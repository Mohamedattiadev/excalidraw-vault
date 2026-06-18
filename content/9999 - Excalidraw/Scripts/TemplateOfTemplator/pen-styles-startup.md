<%*
// Auto-installs Pen Styles toolbar button on every Excalidraw view.
// Pin "Pen Styles" in Excalidraw scripts first, then register this as a
// Templater Startup Template.
//
// Sets window.__penStylesAutoStartup before firing so Pen Styles script
// installs toolbar button + MO but does NOT auto-open the panel — user
// clicks toolbar icon to open. Manual invocation still toggles normally.
const id = "obsidian-excalidraw-plugin:Pen Styles";
const seen = (window.__penStylesStartupSeen ||= new WeakSet());
const fire = () => {
  if (!app.commands.commands[id]) return;
  window.__penStylesAutoStartup = true;
  app.commands.executeCommandById(id);
  setTimeout(() => { window.__penStylesAutoStartup = false; }, 1000);
};
const tryFireForLeaf = (leaf) => {
  if (leaf?.view?.getViewType?.() !== "excalidraw") return;
  if (seen.has(leaf)) return;
  seen.add(leaf);
  setTimeout(fire, 250);
};
app.workspace.onLayoutReady(() => tryFireForLeaf(app.workspace.activeLeaf));
app.workspace.on("active-leaf-change", tryFireForLeaf);
%>
