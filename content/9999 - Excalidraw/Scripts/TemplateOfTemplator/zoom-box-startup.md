<%*
// Auto-installs Zoom Box on every Excalidraw view.
// Pin "Zoom Box" in Excalidraw scripts first, then register this as a
// Templater Startup Template.
//
// Zoom Box toggles uninstall on re-run, so track fired leaves in a
// WeakSet to never fire twice on the same leaf (which would uninstall
// the toolbar trigger instead of showing it).
const id = "obsidian-excalidraw-plugin:Zoom Box";
const seen = (window.__zoomBoxStartupSeen ||= new WeakSet());
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForLeaf = (leaf) => {
  if (leaf?.view?.getViewType?.() !== "excalidraw") return;
  if (seen.has(leaf)) return;
  seen.add(leaf);
  setTimeout(fire, 250);
};
app.workspace.onLayoutReady(() => tryFireForLeaf(app.workspace.activeLeaf));
app.workspace.on("active-leaf-change", tryFireForLeaf);
%>
