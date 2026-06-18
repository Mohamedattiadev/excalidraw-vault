<%*
// Auto-installs the Voice Text overlay on every Excalidraw view so the
// mic ("Voice") pill appears next to AI/Export on selected text without
// the user having to click the pinned 🎤 icon first.
//
// Pin "Voice Text" in Excalidraw scripts first, then register this file
// as a Templater Startup Template (Settings → Templater → Startup
// Templates).
//
// The window.__voiceTextSkipPlacement flag tells the script to install
// the overlay WITHOUT entering placement mode (which would pop the
// bottom pill + crosshair on every leaf change). Manual icon clicks
// don't set the flag, so placement mode still triggers as expected.
//
// view._voiceTextOverlayInstalled is set by the script on install; we
// check it to avoid re-firing on already-installed views.
const id = "obsidian-excalidraw-plugin:Voice Text";
const fire = () => {
  if (!app.commands.commands[id]) return;
  window.__voiceTextSkipPlacement = true;
  app.commands.executeCommandById(id);
};
const tryFireForActive = () => {
  const v = app.workspace.activeLeaf?.view;
  if (v?.getViewType?.() === "excalidraw" && !v._voiceTextOverlayInstalled) {
    setTimeout(fire, 250);
  }
};
app.workspace.onLayoutReady(tryFireForActive);
app.workspace.on("active-leaf-change", (leaf) => {
  if (leaf?.view?.getViewType?.() === "excalidraw" && !leaf.view._voiceTextOverlayInstalled) {
    setTimeout(fire, 200);
  }
});
%>
