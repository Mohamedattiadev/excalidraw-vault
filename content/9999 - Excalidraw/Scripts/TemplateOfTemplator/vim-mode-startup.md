<%*
// Auto-installs Vim Mode on every Excalidraw view.
// Pin "Vim Mode" in Excalidraw scripts first, then register this as a
// Templater Startup Template.
const id = "obsidian-excalidraw-plugin:Vim Mode";
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForActive = () => {
  if (app.workspace.activeLeaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 250);
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 200);
});
%>
