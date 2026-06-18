<%*
// Auto-installs the Hello Toolbar Demo (idea #11 proof-of-concept) on
// every Excalidraw view. Inline button + dropdown item in the native
// top toolbar.
//
// Pin "Hello Toolbar Demo" in Excalidraw scripts first, then register
// this file as a Templater Startup Template.
const id = "obsidian-excalidraw-plugin:Hello Toolbar Demo";
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForActive = () => {
  const v = app.workspace.activeLeaf?.view;
  if (v?.getViewType?.() === "excalidraw" && !v._helloToolbarInstalled) {
    setTimeout(fire, 250);
  }
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw" && !leaf.view._helloToolbarInstalled) {
    setTimeout(fire, 200);
  }
});
%>
