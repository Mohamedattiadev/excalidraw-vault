# MY STUDYING EXCALI — site

Personal CS study vault published as an interactive site.

**Live:** https://mohamedattiadev.github.io/excalidraw-vault/
**Canonical vault (source notes):** https://github.com/Mohamedattiadev/my-study-summaries

This repo is the **publishing pipeline** (Quartz v5 + patched Excalidraw plugin + scene extractor). The notes themselves live in the canonical vault above.

## Features

- **Native Excalidraw canvas** on every drawing page — pan, zoom, draw, edit
- **Per-canvas localStorage edits** — your changes saved to your browser only; vault source stays clean
- **Snapshot cache (IndexedDB)** — second visit to any canvas paints instantly behind the mount spinner
- **High-quality PDF export** (top-right button, jsPDF + Excalidraw exportToCanvas)
- **Reset button** with confirm modal — wipe local edits for a single canvas, restore original
- **Service Worker** for offline + instant repeat-visit loads
- **Static sidebar tree** — no JS race conditions, native `<details>` collapse
- **Purple Obsidian-Excalidraw theme** in light + dark
- **Self-hosted Excalidraw bundle** (esbuild) with esm.sh + skypack fallbacks
- **Image optimization** at build — every embed re-encoded to WebP@75, max 900px (~75% size reduction)
- **Progress overlay** during mount (0% → 100% with stage labels)
- **Open Graph + Twitter Card** meta on every page
- **Visitor counter** (hits.sh, badge on homepage)

## Layout

```
content/                  — copy of the vault used by build
  index.md                — homepage
  404.md                  — custom not-found page
  robots.txt
  01-Algorithms/
    index.md              — subject overview (auto-generated if missing)
    Algorithms.excalidraw.md
  02-DesignPatterns/
  03-OS/
  04-Databases/
  …
  90-Assets/              — pasted images referenced by drawings

scripts/
  sync-from-vault.mjs     — zero-touch pull from canonical vault repo
  build-vendor.mjs        — esbuild bundles Excalidraw + React → public/vendor/
  build-excalidraw-viewer.mjs  — scene extractor + HTML rewriter + author/SW/OG injection
  optimize-images.mjs     — sharp downscale to WebP
  excalidraw-extras.client.js  — theme/zoombox/minimap/PDF/reset extras
  sw.js                   — Service Worker

.quartz/plugins/{explorer,obsidian-plugin-excalidraw}/dist/
  patched plugin dists committed (other plugins re-installed in CI)

.github/workflows/pages.yml  — GitHub Actions deploy
```

## Develop locally

```bash
fnm use 22         # node >= 22
npm ci
npx quartz plugin install
node scripts/build-vendor.mjs
npx quartz build
node scripts/build-excalidraw-viewer.mjs
node scripts/optimize-images.mjs        # optional, slow
node scripts/serve-quartz.mjs 8080      # http://localhost:8080
```

## Sync from vault

After editing drawings in the canonical vault repo:

```bash
node scripts/sync-from-vault.mjs --prune --push
```

Auto-renames vault filenames to clean slugs, drops stale assets, commits + pushes → CI deploys.

## Deploy

Push to `v5` → GitHub Actions runs `pages.yml` → builds + publishes to GitHub Pages.

---

Built by **Mohamed Attia** · [@Mohamedattiadev](https://github.com/Mohamedattiadev)
On top of [Quartz v5](https://quartz.jzhao.xyz/) by jackyzha0.
