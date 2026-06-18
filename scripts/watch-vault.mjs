#!/usr/bin/env node
// Watch content/**/*.excalidraw.md (follows symlink to vault) and re-run scene extractor.
import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CONTENT = path.resolve('content');
let running = false;
let pending = false;

function build(reason) {
  if (running) { pending = true; return; }
  running = true;
  const t0 = Date.now();
  console.log(`[watch] rebuild scenes (${reason})`);
  const proc = spawn(process.execPath, ['scripts/build-excalidraw-viewer.mjs'], { stdio: 'inherit' });
  proc.on('exit', (code) => {
    running = false;
    console.log(`[watch] scenes done in ${Date.now() - t0}ms (exit ${code})`);
    if (pending) { pending = false; build('queued'); }
  });
}

const watcher = chokidar.watch([`${CONTENT}/**/*.excalidraw.md`, `${CONTENT}/**/*.md`], {
  followSymlinks: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 50 },
});

watcher.on('ready', () => console.log(`[watch] watching ${CONTENT}/**/*.excalidraw.md`));
watcher.on('add',    (p) => build(`add ${path.relative(CONTENT, p)}`));
watcher.on('change', (p) => build(`change ${path.relative(CONTENT, p)}`));
watcher.on('unlink', (p) => build(`unlink ${path.relative(CONTENT, p)}`));
watcher.on('error',  (err) => console.error('[watch] error', err));
