<%*
// Auto-installs the Export Element selection overlay on every Excalidraw view.
// Pin "Export Element" in Excalidraw scripts first, then register this as a
// Templater Startup Template.
const id = "obsidian-excalidraw-plugin:Export Element";
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForActive = () => {
  if (app.workspace.activeLeaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 250);
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 200);
});
%>
