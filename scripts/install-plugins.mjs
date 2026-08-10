#!/usr/bin/env node
// Installs the Quartz plugins without losing the two patched ones.
//
// `npx quartz plugin install` re-fetches every plugin in quartz.config.yaml.
// Two of them are committed here with local patches in their dist/, so a plain
// install overwrites the patch. The failure is not obvious either: the install
// prints "failed to update" and exits 0, and the break only shows up later as
//
//   SyntaxError: does not provide an export named 'parseExcalidraw'
//
// when build-excalidraw-viewer.mjs imports the plugin it just clobbered.
//
// So: snapshot the patched dirs, install, put them back. This is what
// .github/workflows/pages.yml does, and it calls this script so local and CI
// cannot drift apart again.
//
//   node scripts/install-plugins.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Committed with local patches in dist/. Anything listed here survives install.
const PATCHED = ['explorer', 'obsidian-plugin-excalidraw'];
const PLUGINS = path.resolve('.quartz/plugins');

// Cheap guard against a silent re-break: the symbol the viewer build needs.
const CANARY = {
  'obsidian-plugin-excalidraw': ['dist/index.js', 'parseExcalidraw'],
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}`);
}

const snapshot = fs.mkdtempSync(path.join(os.tmpdir(), 'quartz-plugin-patch-'));
const saved = [];

for (const name of PATCHED) {
  const dir = path.join(PLUGINS, name);
  if (!fs.existsSync(dir)) {
    console.warn(`[plugins] ${name} is not checked out, skipping`);
    continue;
  }

  // Seed a git HEAD BEFORE snapshotting, so the snapshot carries the .git too.
  // This is load-bearing and the order matters. A plugin dir with a git repo in
  // it is one the fetcher refuses to overwrite ("failed to update"), and it is
  // not only `plugin install` that re-fetches: `npx quartz build` does it again
  // later. Restoring a dir without .git therefore looks fine here and gets
  // clobbered two steps afterwards, which is exactly how the deploy broke once.
  if (!fs.existsSync(path.join(dir, '.git'))) {
    for (const args of [['init', '-q'], ['config', 'user.email', 'ci@local'],
                        ['config', 'user.name', 'ci'], ['add', '-A'],
                        ['commit', '-q', '-m', 'snapshot', '--allow-empty']]) {
      run('git', args, { cwd: dir });
    }
  }

  fs.cpSync(dir, path.join(snapshot, name), { recursive: true });
  saved.push(name);
}
console.log(`[plugins] snapshotted ${saved.join(', ')} to ${snapshot}`);

run('npx', ['quartz', 'plugin', 'install']);

for (const name of saved) {
  const dir = path.join(PLUGINS, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(path.join(snapshot, name), dir, { recursive: true });
  console.log(`[plugins] restored ${name}`);
}
fs.rmSync(snapshot, { recursive: true, force: true });

let failed = false;
for (const name of saved) {
  // Without this the patch survives the install and dies during `quartz build`.
  if (!fs.existsSync(path.join(PLUGINS, name, '.git'))) {
    console.error(`[plugins] ${name} has no .git, a later build would overwrite it`);
    failed = true;
  }
}
for (const [name, [file, symbol]] of Object.entries(CANARY)) {
  if (!saved.includes(name)) continue;
  const p = path.join(PLUGINS, name, file);
  if (!fs.existsSync(p) || !fs.readFileSync(p, 'utf8').includes(symbol)) {
    console.error(`[plugins] ${name}/${file} is missing "${symbol}" after restore`);
    failed = true;
  }
}
if (failed) {
  console.error('[plugins] the patched build did not survive. Run: git checkout -- .quartz');
  process.exit(1);
}
console.log('[plugins] done, patches intact');
