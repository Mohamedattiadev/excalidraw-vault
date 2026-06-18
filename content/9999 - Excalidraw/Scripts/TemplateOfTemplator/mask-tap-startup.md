<%*
const id = "obsidian-excalidraw-plugin:Mask Tap Listener";
const fire = () => {
  if (app.commands.commands[id]) app.commands.executeCommandById(id);
};
const tryFireForActive = () => {
  const t = app.workspace.activeLeaf?.view?.getViewType?.();
  if (t === "excalidraw") setTimeout(fire, 200);
};
// Cover the leaf that is already active when Obsidian starts.
app.workspace.onLayoutReady(tryFireForActive);
// Cover every later view switch.
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw") setTimeout(fire, 150);
});
%>
