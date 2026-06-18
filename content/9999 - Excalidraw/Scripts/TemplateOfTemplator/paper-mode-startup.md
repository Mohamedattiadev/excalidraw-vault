<%*
// Auto-installs Paper Mode toolbar button on every Excalidraw view.
// Pin "Paper Mode" in Excalidraw scripts first, then register this as a
// Templater Startup Template.
//
// Paper Mode boot toggles open the panel if no panel exists. The script
// guards against re-toggle when state.sideOpen is already true, so re-
// firing on the same leaf is safe — but still WeakSet-guard to avoid
// unnecessary re-runs.
const id = "obsidian-excalidraw-plugin:Paper Mode";
const seen = (window.__paperModeStartupSeen ||= new WeakSet());
const fire = () => {
  if (!app.commands.commands[id]) return;
  // Signal to Paper Mode boot that this is an auto-startup invocation,
  // so it installs the toolbar button + MO without auto-opening the
  // side panel. User clicks the toolbar icon to open.
  window.__paperModeAutoStartup = true;
  app.commands.executeCommandById(id);
  setTimeout(() => { window.__paperModeAutoStartup = false; }, 1000);
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
