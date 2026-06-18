<%*
// Auto-installs the Resize Pills overlay on every Excalidraw view so the
// [−] / [+] pills appear next to TeX / AI on selected text or image
// elements without the user having to run the script manually.
//
// Pin "Resize Pills" in Excalidraw scripts first, then register this file
// as a Templater Startup Template (Settings → Templater → Startup
// Templates). Same pattern as voice-text-startup / latex-canvas-startup.
//
// view._resizePillsInstalled is set by the script on install; we check
// it to avoid re-firing on already-installed views.
const id = "obsidian-excalidraw-plugin:Resize Pills";
const fire = () => { if (app.commands.commands[id]) app.commands.executeCommandById(id); };
const tryFireForActive = () => {
  const v = app.workspace.activeLeaf?.view;
  if (v?.getViewType?.() === "excalidraw" && !v._resizePillsInstalled) {
    setTimeout(fire, 250);
  }
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw" && !leaf.view._resizePillsInstalled) {
    setTimeout(fire, 200);
  }
});
%>
