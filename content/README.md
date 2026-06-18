# Study Summaries — Obsidian + Excalidraw Vault

Personal CS study summaries: visual notes, diagrams, and book chapters built in
Obsidian with the Excalidraw plugin. Optimized for revision and visual memory
rather than exhaustive textbook coverage.

> Notes evolve over time. Treat as a living document, not a textbook.

---

## 📂 Vault Structure

| Folder                     | Contents                                            |
| -------------------------- | --------------------------------------------------- |
| `00-Index/`                | Master `Index.md`, readme, how-to-run notes         |
| `01-Algorithms/`           | Algorithms & complexity                             |
| `02-DesignPatterns/`       | OOP design patterns                                 |
| `03-OS/`                   | Operating systems, xv6 workflow                     |
| `04-Databases/`            | DBMS, SQL, transactions                             |
| `05-Networking/`           | Computer networks                                   |
| `06-DataScience-Mining/`   | Data science + data mining                          |
| `07-SoftwareArchitecture/` | Software architecture chapters + PDFs               |
| `08-ScientificComputing/`  | Numerical methods                                   |
| `09-Security/`             | Security topics                                     |
| `10-English/`              | English exam revision                               |
| `90-Assets/`               | Images: `Images-Eng/`, `Images-Summary/`, `Pasted/` |
| `999-Templates/`           | Templater note templates                            |
| `9999 - Excalidraw/`       | All `.excalidraw.md` drawings + drawing templates   |
| `_cache/`                  | bookmode / latex caches *(gitignored)*              |
| `_system/`                 | livesync + collab runtime *(gitignored)*            |

Sidebar uses **Doom One** colors (see `.obsidian/snippets/ColoredSidebar.css`)
plus Lucide folder icons via `obsidian-icon-folder`.

---

## 🚀 Quick Start

```bash
git clone <repo-url> "MY STUDING EXCALI"
```

1. Open Obsidian → **Open folder as vault** → pick the cloned folder.
2. Enable community plugins when Obsidian asks (Restricted Mode → off).
3. Restart. Sidebar should show colored folder names + Lucide icons.
4. **Livesync setup (optional)** — `.obsidian/plugins/obsidian-livesync/data.json`
   is gitignored (contains secrets). Configure it locally from the plugin's
   settings panel.
5. **First launch auto-pins Excalidraw scripts.** A Templater startup template
   (`9999 - Excalidraw/Scripts/TemplateOfTemplator/excalidraw-bootstrap.md`)
   detects an empty pin list, writes the 8 recommended pins + correct
   `scriptFolderPath` into Excalidraw's `data.json`, then hot-reloads the
   plugin. You should see a `Excalidraw: recommended scripts pinned ✓` notice.
   - Optional: add your own AI API keys (OpenAI / Gemini / Groq / OpenRouter)
     in Excalidraw settings → AI providers.

---

## 🧩 Plugins Included

- `obsidian-excalidraw-plugin` — drawings
- `excalidraw-zoom-wide` — wide-zoom canvas tweak (custom)
- `obsidian-icon-folder` — Lucide icons in file tree
- `templater-obsidian` — note templates
- `obsidian-livesync` — multi-device sync *(needs local secrets)*
- `slide-remote`, `video-share` — presentation utilities

CSS theme: **Things** + custom snippets (`ColoredSidebar`, `GeneralTweaks`,
`notebookbg`, `highlighters`).

---

## 📝 Conventions

- Topic folders use `NN-Name/` numeric prefix → fixes sidebar order.
- Each folder *should* contain an `0000 - <Topic> Index.md` (TODO across most).
- Wikilinks reference notes by filename only (Obsidian resolves path).
- Images live under `90-Assets/`; embed with `![[Pasted Image …png]]`.

---

## 🛠 Running the Summary

See [[90-Assets/Images-Summary/HOW TO RUN THE SUMMARY OBSIDIAN.svg]] for the original walkthrough.

<p align="center">
  <img
    src="90-Assets/Images-Summary/HOW TO RUN THE SUMMARY OBSIDIAN.svg"
    width="700"
  >
</p>

---

## ⚠️ Disclaimer

Personal learning notes. Not official documentation. May contain errors,
opinionated simplifications, or in-progress sections.
