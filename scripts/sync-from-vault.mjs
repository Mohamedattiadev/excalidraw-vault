#!/usr/bin/env node
// Zero-touch sync: pulls the canonical vault (my-study-summaries) and rebuilds content/.
// Auto-renames every .excalidraw.md to a clean canonical filename, flattens single-drawing
// subfolders, generates a placeholder index.md for any new subject, and prunes deletions.
//
// Usage:
//   node scripts/sync-from-vault.mjs              # copy only
//   node scripts/sync-from-vault.mjs --commit     # + commit
//   node scripts/sync-from-vault.mjs --push       # + commit + push (triggers Pages deploy)
//   node scripts/sync-from-vault.mjs --prune      # also delete files removed upstream

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const VAULT_REPO = 'https://github.com/Mohamedattiadev/my-study-summaries.git';
const VAULT_DIR = path.join('/tmp', 'vault-sync');
const CONTENT = path.resolve('content');

// Anything matching is excluded from the copy entirely.
const SKIP_DIRS = new Set([
  '_cache', '_system', 'Collab', '.obsidian', '.git', '.trash',
  '9999 - Excalidraw', '999-Templates',
]);
const PROTECTED_RE = /(^|\/)(index\.md|README\.md)$/i;          // we author these
const SUBJECT_DIR_RE = /^\d{1,2}[-._ ]/;                         // 01-Algo, 02-DesignPatterns, …

function prettifyLabel(raw) {
  let s = String(raw)
    .replace(/\.excalidraw\.md$/i, '')
    .replace(/\.excalidraw$/i, '')
    .replace(/^\s*\d+(\.\d+)?\s*[-._)]?\s*/, '')
    .replace(/\(\s*\d+[^)]*\)/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) s = String(raw);
  return s.split(' ').map((w) =>
    /^[A-Z]{2,}$/.test(w) ? w : (w[0] ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w),
  ).join(' ');
}
function canonicalFilename(rawFilename) {
  const label = prettifyLabel(rawFilename);
  return label.replace(/\s+/g, '-') + '.excalidraw.md';
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.status}`);
  return r;
}

async function ensureVault() {
  if (existsSync(path.join(VAULT_DIR, '.git'))) {
    console.log(`[sync] fetching latest vault…`);
    run('git', ['-C', VAULT_DIR, 'fetch', '--depth=1', 'origin']);
    run('git', ['-C', VAULT_DIR, 'reset', '--hard', 'origin/HEAD']);
  } else {
    console.log(`[sync] cloning vault…`);
    run('git', ['clone', '--depth=1', VAULT_REPO, VAULT_DIR]);
  }
}

async function collectExcalidrawSources(srcDir, relPath = []) {
  // Returns array of { src, subjectDir, fileRelInSubject } only for .excalidraw.md files inside a top-level subject.
  const out = [];
  const ents = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const next = path.join(srcDir, e.name);
    const nextRel = [...relPath, e.name];
    if (e.isDirectory()) {
      out.push(...(await collectExcalidrawSources(next, nextRel)));
    } else if (e.isFile() && e.name.endsWith('.excalidraw.md')) {
      // Top-level subject is the first segment; only include if it matches subject pattern.
      const top = nextRel[0];
      if (!SUBJECT_DIR_RE.test(top)) continue;
      out.push({ src: next, subjectDir: top, filename: e.name, segments: nextRel });
    }
  }
  return out;
}

async function syncExcalidrawFiles() {
  const sources = await collectExcalidrawSources(VAULT_DIR);
  const canonical = new Set();   // canonical paths we created — used by prune to know what's still valid
  for (const { src, subjectDir, filename } of sources) {
    const dstDir = path.join(CONTENT, subjectDir);
    await fs.mkdir(dstDir, { recursive: true });
    const dstName = canonicalFilename(filename);
    const dst = path.join(dstDir, dstName);
    await fs.copyFile(src, dst);
    canonical.add(`${subjectDir}/${dstName}`);
    if (filename !== dstName) console.log(`[sync] ${subjectDir}/${filename} → ${dstName}`);
  }
  return canonical;
}

async function syncAssets() {
  // Copy any image folder/file referenced by drawings: simplest = copy 90-Assets verbatim (no rename).
  const assetSrc = path.join(VAULT_DIR, '90-Assets');
  if (!existsSync(assetSrc)) return;
  const assetDst = path.join(CONTENT, '90-Assets');
  await copyDirRaw(assetSrc, assetDst);
}
async function copyDirRaw(srcDir, dstDir) {
  await fs.mkdir(dstDir, { recursive: true });
  const ents = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const s = path.join(srcDir, e.name);
    const d = path.join(dstDir, e.name);
    if (e.isDirectory()) await copyDirRaw(s, d);
    else if (e.isFile()) await fs.copyFile(s, d);
  }
}

async function ensureSubjectIndexes() {
  // For every top-level subject folder, make sure index.md exists. If missing, generate a placeholder.
  const ents = await fs.readdir(CONTENT, { withFileTypes: true });
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    if (!SUBJECT_DIR_RE.test(e.name)) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const idx = path.join(CONTENT, e.name, 'index.md');
    if (existsSync(idx)) continue;
    const title = prettifyLabel(e.name);
    const body = `---\ntitle: ${title}\n---\n\n# ${title}\n\nDrawings in this folder are listed in the sidebar.\n`;
    await fs.writeFile(idx, body);
    console.log(`[sync] generated placeholder index for ${e.name}`);
  }
}

async function pruneStale(canonicalSet) {
  // Walk content/, remove any .excalidraw.md no longer represented in canonicalSet.
  const ents = await fs.readdir(CONTENT, { withFileTypes: true });
  for (const e of ents) {
    if (!e.isDirectory() || !SUBJECT_DIR_RE.test(e.name)) continue;
    const subDir = path.join(CONTENT, e.name);
    const inner = await fs.readdir(subDir, { withFileTypes: true });
    for (const f of inner) {
      if (!f.isFile() || !f.name.endsWith('.excalidraw.md')) continue;
      const key = `${e.name}/${f.name}`;
      if (!canonicalSet.has(key)) {
        await fs.rm(path.join(subDir, f.name));
        console.log(`[sync] pruned stale ${key}`);
      }
    }
  }
}

const argv = process.argv.slice(2);
const doCommit = argv.includes('--commit') || argv.includes('--push');
const doPush = argv.includes('--push');
const doPrune = argv.includes('--prune');

await ensureVault();
console.log(`[sync] syncing drawings → ${CONTENT}`);
const canonical = await syncExcalidrawFiles();
await syncAssets();
await ensureSubjectIndexes();
if (doPrune) await pruneStale(canonical);
console.log('[sync] done.');

if (doCommit) {
  run('git', ['add', '-A', 'content/']);
  const r = spawnSync('git', ['diff', '--cached', '--quiet']);
  if (r.status === 0) {
    console.log('[sync] no changes to commit.');
  } else {
    run('git', ['commit', '-m', 'sync: pull latest from canonical vault']);
    if (doPush) run('git', ['push', 'origin', 'v5']);
  }
}
