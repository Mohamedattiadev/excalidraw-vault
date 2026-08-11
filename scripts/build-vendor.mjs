#!/usr/bin/env node
// Bundles Excalidraw + React into public/vendor/excalidraw.bundle.js
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('public/vendor');
await fs.mkdir(OUT, { recursive: true });

await build({
  entryPoints: ['scripts/excalidraw-vendor-entry.js'],
  bundle: true,
  format: 'esm',
  outfile: path.join(OUT, 'excalidraw.bundle.js'),
  minify: true,
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.IS_PREACT': '"false"' },
  loader: { '.js': 'jsx' },
  jsx: 'automatic',
  legalComments: 'none',
  logLevel: 'info',
});

// Copy Excalidraw CSS too (we previously pulled from jsdelivr).
try {
  const cssSrc = path.resolve('node_modules/@excalidraw/excalidraw/dist/prod/index.css');
  await fs.copyFile(cssSrc, path.join(OUT, 'excalidraw.css'));
  console.log('[vendor] css copied');
} catch (err) { console.warn('[vendor] css copy failed', err.message); }

// Copy fonts directory referenced by excalidraw.css (woff2 etc.).
async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const ents = await fs.readdir(src, { withFileTypes: true });
  for (const e of ents) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else if (e.isFile()) await fs.copyFile(s, d);
  }
}
try {
  const fontsSrc = path.resolve('node_modules/@excalidraw/excalidraw/dist/prod/fonts');
  await copyDir(fontsSrc, path.join(OUT, 'fonts'));
  console.log('[vendor] fonts copied');
} catch (err) { console.warn('[vendor] fonts copy failed', err.message); }

// pdf.js, for the /pdf page. Copied rather than pulled from a CDN so the viewer
// keeps working offline (the service worker caches same-origin assets) and does
// not break the day a CDN changes a path. The worker is a separate file because
// pdf.js parses documents off the main thread.
try {
  const PDFJS = path.resolve('node_modules/pdfjs-dist');
  const dst = path.join(OUT, 'pdfjs');
  await fs.mkdir(dst, { recursive: true });
  for (const f of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs']) {
    await fs.copyFile(path.join(PDFJS, f), path.join(dst, path.basename(f)));
  }
  // Fonts the spec says a viewer must supply itself, and the CJK encoding
  // tables. Without them such a document renders with wrong metrics or not at
  // all, and pdf.js only fetches the few files a document actually asks for.
  await copyDir(path.join(PDFJS, 'standard_fonts'), path.join(dst, 'standard_fonts'));
  await copyDir(path.join(PDFJS, 'cmaps'), path.join(dst, 'cmaps'));
  await fs.copyFile(path.resolve('scripts/pdf-viewer.client.js'), path.join(OUT, 'pdf-viewer.js'));
  await fs.copyFile(path.resolve('scripts/pdf-viewer.client.css'), path.join(OUT, 'pdf-viewer.css'));
  console.log('[vendor] pdf.js + viewer copied');
} catch (err) { console.warn('[vendor] pdf.js copy failed', err.message); }

console.log('[vendor] done');
