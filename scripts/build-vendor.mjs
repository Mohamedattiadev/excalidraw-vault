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

console.log('[vendor] done');
