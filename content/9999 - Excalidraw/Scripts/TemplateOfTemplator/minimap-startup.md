<%*
// Auto-opens the Excalidraw Minimap on every Excalidraw view.
// Register: Settings -> Templater -> Startup Templates -> Add -> this file.
// Pin the Minimap script first so the command id resolves.
const id = "obsidian-excalidraw-plugin:Minimap";
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForActive = () => {
  if (app.workspace.activeLeaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 250);
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 200);
});
%>
