# TemplateOfTemplator/

Templater "startup" files. Each is a Templater template that runs once on Obsidian open to seed config / register hotkeys / mount UI for a paired Excalidraw script.

## Convention

`<script-name>-startup.md` matches `../Scripts/<Script Name>.md`.

Example pairs:
- `ai-edit-startup.md` ↔ `Scripts/AI Edit.md`
- `voice-text-startup.md` ↔ `Scripts/Voice Text.md`

## Install

`../install.sh` copies these → `<vault>/<Templater templates folder>/`.

Templater templates folder is read from your Templater plugin settings.

## Usage

1. Open Obsidian after install.
2. Templater → "Insert template" → pick the startup template.
3. Run once. Sets up settings, frontmatter, hotkeys, or whatever the paired script needs.

Some templates are designed to auto-run via Templater's "Startup templates" config. Check each file's header for instructions.
