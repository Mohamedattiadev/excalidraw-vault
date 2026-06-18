# MY STUDYING EXCALI — site

Personal CS study vault published as an interactive site.

**Live:** https://mohamedattiadev.github.io/excalidraw-vault/
**Canonical vault (source notes):** https://github.com/Mohamedattiadev/my-study-summaries

This repo is the **publishing pipeline** (Quartz v5 + patched Excalidraw plugin + scene extractor). The notes themselves live in the canonical vault above. Edits in the live site save per-drawing to your browser's `localStorage`; the static deploy stays clean.

## What's here

- `content/` — copy of the vault used by the build (Excalidraw `.md` files + per-subject `index.md`)
- `scripts/build-excalidraw-viewer.mjs` — scene extractor: parses each `.excalidraw.md`, writes `public/_scenes/<slug>.json`, rewrites each `*.excalidraw.html` to mount native `@excalidraw/excalidraw@0.18.0` and injects a static sidebar tree
- `scripts/excalidraw-extras.client.js` — theme toggle, zoombox, minimap, robust sidebar toggle
- `.quartz/plugins/{explorer,obsidian-plugin-excalidraw}/` — patched plugin dists (sort by slug, prettified labels, frontmatter detection)
- `.github/workflows/pages.yml` — GitHub Actions deploy

## Build locally

```bash
fnm use 22         # or nvm/asdf — node >= 22
npm ci
npx quartz plugin install
npx quartz build
node scripts/build-excalidraw-viewer.mjs
node scripts/serve-quartz.mjs 8080   # http://localhost:8080
```

## Deploy

Push to `v5` → GitHub Actions builds + publishes to Pages.

---

Built on [Quartz v5](https://quartz.jzhao.xyz/) by jackyzha0.
