# Mohamed Attia — Study Vault

My CS study notes, drawn instead of typed, published as a site u can actually
draw on.

**Live:** https://mohamedattiadev.github.io/excalidraw-vault/
**The notes themselves:** https://github.com/Mohamedattiadev/my-study-summaries

This repo is not the notes. It is the machine that publishes them: Quartz v5, a
patched Excalidraw plugin, and a scene extractor that turns each drawing into a
real canvas on the page. The drawings live in the vault repo above.

---

## What it does

Every drawing page mounts a real Excalidraw canvas, not a picture of one. So u
can pan it, zoom it, and draw on top of it while u revise.

- **Ur edits are saved per canvas, in ur browser only** (`localStorage`). The
  vault stays clean, and nothing u draw is sent anywhere.
- **Second visit paints instantly.** A snapshot of the canvas is kept in
  IndexedDB and shown while the live one mounts behind it.
- **PDF export**, top right button, exports the canvas u are looking at
  including ur own edits.
- **Reset**, with a confirm box, wipes ur edits on that one canvas and gives u
  the original back.
- **A Service Worker** caches the assets, so repeat visits are near instant and
  it still opens offline.
- **The sidebar tree is static HTML**, plain `<details>` folders. No JS deciding
  what is open, so it cannot race and it cannot collapse on u.
- **Images are re-encoded at build time** to WebP at quality 75 and capped at
  900px, which takes about 75% off the page weight.
- Purple Obsidian-Excalidraw theme in light and dark, a progress overlay while
  the canvas mounts, Open Graph and Twitter Card meta on every page, and a
  visitor counter on the homepage.
- **The HTML & CSS 101 chapters carry a live playground**, on the page rather
  than a tab away. It is the one in
  [dev-101](https://github.com/Mohamedattiadev/dev-101), served from the same
  origin in an iframe, opened on that chapter's topic and following this site's
  light/dark toggle. There is still only one playground; its own pages keep
  working, because the GitHub READMEs cannot iframe anything.

The Excalidraw bundle is self hosted, built here with esbuild, with esm.sh and
skypack only as fallbacks. That is on purpose: a study page should not stop
working because a CDN did.

---

## Layout

```
content/                  the copy of the vault the build reads
  index.md                homepage
  404.md                  custom not-found page
  pdf.md                  frames a PDF from this site, opened with ?file=
  robots.txt
  01-Universite/          the graded subjects
    00-Drawings/          every canvas in one table
    01-Algorithms/
      index.md            subject overview, generated if it is missing
      Algorithms.excalidraw.md
    02-DesignPatterns/
    ...
  02-Personal/            not graded, authored here or synced by exception
    10-English/           exam revision, still synced from the vault
    11-Dev-101/           the dev-101 course, as markdown
  90-Assets/              images the drawings point at

scripts/
  sync-from-vault.mjs             pulls the canonical vault into content/
  build-vendor.mjs                esbuild: Excalidraw + React into public/vendor/
  build-excalidraw-viewer.mjs     scene extractor, HTML rewriter, author/SW/OG injection
  optimize-images.mjs             sharp, downscale to WebP
  excalidraw-extras.client.js     theme, zoombox, minimap, PDF, reset
  sw.js                           the Service Worker

plugins/
  playground-embed/       puts the dev-101 HTML & CSS playground on each chapter
                          page as a same-origin iframe. A local Quartz plugin,
                          listed in quartz.config.yaml by path.

.quartz/plugins/{explorer,obsidian-plugin-excalidraw}/dist/
  the two patched plugin builds are committed. CI reinstalls the rest.

.github/workflows/pages.yml       the GitHub Actions deploy
```

---

## Running it locally

```bash
fnm use 22         # node >= 22
npm ci
node scripts/install-plugins.mjs   # not `npx quartz plugin install`, see below
node scripts/build-vendor.mjs
npx quartz build
node scripts/build-excalidraw-viewer.mjs
node scripts/optimize-images.mjs        # optional, and slow
node scripts/serve-quartz.mjs 8080      # http://localhost:8080
```

Do not run `npx quartz plugin install` on its own. Two of the plugins are
committed here with local patches in their `dist/`, and a plain install
overwrites both. It does not tell u either: it prints "failed to update", exits
0, and the break only turns up later as

```
SyntaxError: does not provide an export named 'parseExcalidraw'
```

when the scene extractor imports the plugin that just got clobbered.
`scripts/install-plugins.mjs` snapshots those two, installs, and puts them back,
then checks the patch actually survived. CI runs the same script.

If u already hit it: `git checkout -- .quartz`.

## Pulling in new drawings

After editing drawings in the vault repo:

```bash
node scripts/sync-from-vault.mjs --prune --push
```

It renames vault filenames to clean slugs, drops assets nothing points at any
more, then commits and pushes, and CI deploys.

## Deploying

Push to `v5`. Actions runs `pages.yml`, builds, and publishes to GitHub Pages.

---

Built by **Mohamed Attia** · [@Mohamedattiadev](https://github.com/Mohamedattiadev)
On top of [Quartz v5](https://quartz.jzhao.xyz/) by jackyzha0.
