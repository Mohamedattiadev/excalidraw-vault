#!/usr/bin/env node
// Sync .excalidraw.md + assets from the canonical vault (my-study-summaries) into content/.
// Usage: node scripts/sync-from-vault.mjs [--commit] [--push]
//
// Steps:
//   1. Pull latest from https://github.com/Mohamedattiadev/my-study-summaries into /tmp/vault-sync (clone or fetch)
//   2. Copy each top-level subject folder (00-Index .. 10-English) + 90-Assets into ./content/
//   3. Preserve the renamed canonical files (Algorithms.excalidraw.md etc) by matching original vault filenames
//   4. Optional: commit + push to v5

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const VAULT_REPO = 'https://github.com/Mohamedattiadev/my-study-summaries.git';
const VAULT_DIR = path.join('/tmp', 'vault-sync');
const CONTENT = path.resolve('content');

// Map of original vault filename -> canonical site filename
const RENAME_MAP = {
  '2- Algo.excalidraw.md':                                                              { dir: '01-Algorithms',           dest: 'Algorithms.excalidraw.md' },
  '1- DesignPattern.excalidraw.md':                                                      { dir: '02-DesignPatterns',       dest: 'Design-Patterns.excalidraw.md' },
  '000- xv6- workflow.excalidraw.md':                                                    { dir: '03-OS',                   dest: 'xv6-Workflow.excalidraw.md' },
  '4- OS.excalidraw.md':                                                                 { dir: '03-OS',                   dest: 'Operating-Systems.excalidraw.md' },
  '5- DB.excalidraw.md':                                                                 { dir: '04-Databases',            dest: 'Databases.excalidraw.md' },
  '6 - Computer Networking.excalidraw.md':                                               { dir: '05-Networking',           dest: 'Computer-Networking.excalidraw.md' },
  '3 - Data SCi..excalidraw.md':                                                         { dir: '06-DataScience-Mining',   dest: 'Data-Science.excalidraw.md' },
  '7- Data Mining.excalidraw.md':                                                        { dir: '06-DataScience-Mining',   dest: 'Data-Mining.excalidraw.md' },
  '8.2 - Software Architecture - (5-..).excalidraw.md':                                  { dir: '07-SoftwareArchitecture', dest: 'Software-Architecture.excalidraw.md' },
  '9- Scientific Computing.excalidraw.md':                                               { dir: '08-ScientificComputing',  dest: 'Scientific-Computing.excalidraw.md' },
  '10 - secure.excalidraw.md':                                                           { dir: '09-Security',             dest: 'Security.excalidraw.md' },
  '000 - prep eng.excalidraw.md':                                                        { dir: '10-English',              dest: 'Prep-Eng.excalidraw.md' },
};

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

// Files we never overwrite — we author rich subject index.md files; vault's are placeholders.
const PROTECTED_RE = /(^|\/)(index\.md|README\.md)$/i;

async function copyTree(srcRoot, dstRoot, relPath = '') {
  const ents = await fs.readdir(srcRoot, { withFileTypes: true });
  await fs.mkdir(dstRoot, { recursive: true });
  for (const e of ents) {
    const src = path.join(srcRoot, e.name);
    const dst = path.join(dstRoot, e.name);
    const rel = relPath ? `${relPath}/${e.name}` : e.name;
    if (e.isDirectory()) {
      // Skip vault internals
      if (['_cache', '_system', 'Collab', '.obsidian', '.trash', '9999 - Excalidraw', '999-Templates', 'English revision (prep. exam)'].includes(e.name)) continue;
      await copyTree(src, dst, rel);
    } else if (e.isFile()) {
      if (PROTECTED_RE.test(rel) && existsSync(dst)) {
        // Don't clobber our authored index.md / README.md
        continue;
      }
      await fs.copyFile(src, dst);
    }
  }
}

// Delete files in content/ that no longer exist in the vault (handles deletes + renames upstream).
async function prune(srcRoot, dstRoot, relPath = '') {
  const dstEnts = await fs.readdir(dstRoot, { withFileTypes: true });
  for (const e of dstEnts) {
    const dst = path.join(dstRoot, e.name);
    const src = path.join(srcRoot, e.name);
    const rel = relPath ? `${relPath}/${e.name}` : e.name;
    if (e.isDirectory()) {
      // Skip top-level dirs not present in vault (e.g. 00-Index removed, that's fine)
      if (existsSync(src)) await prune(src, dst, rel);
    } else if (e.isFile()) {
      if (PROTECTED_RE.test(rel)) continue;             // never delete our authored index.md
      if (rel.endsWith('.excalidraw.md')) continue;     // renamed files — we know about them via RENAME_MAP, skip prune
      if (!existsSync(src)) {
        await fs.rm(dst);
        console.log(`[sync] pruned stale ${rel}`);
      }
    }
  }
}

async function applyRenames() {
  for (const [origName, { dir, dest }] of Object.entries(RENAME_MAP)) {
    const folderPath = path.join(CONTENT, dir);
    if (!existsSync(folderPath)) continue;
    const origPath = path.join(folderPath, origName);
    const destPath = path.join(folderPath, dest);
    if (existsSync(origPath)) {
      await fs.rename(origPath, destPath);
      console.log(`[sync] renamed ${dir}/${origName} → ${dest}`);
    }
    // Prep Eng lives under nested folder in vault — find it
    if (origName === '000 - prep eng.excalidraw.md') {
      const nested = path.join(folderPath, 'English revision (prep. exam)', origName);
      if (existsSync(nested)) {
        await fs.rename(nested, destPath);
        const nestedDir = path.dirname(nested);
        try { await fs.rm(nestedDir, { recursive: true }); } catch {}
        console.log(`[sync] hoisted ${origName} out of "English revision (prep. exam)"`);
      }
    }
  }
}

async function pruneNoise() {
  // Drop the README that ships in the vault (we author our own).
  const drop = ['README.md', 'index.md', '00-Index/Index.md', '00-Index/0000- HOW TO RUN THE SUMMARY.excalidraw.md'];
  for (const f of drop) {
    const p = path.join(CONTENT, f);
    if (existsSync(p)) {
      await fs.rm(p);
      console.log(`[sync] removed ${f}`);
    }
  }
  // Drop empty 00-Index folder
  try {
    const idx = path.join(CONTENT, '00-Index');
    if (existsSync(idx) && (await fs.readdir(idx)).length === 0) await fs.rmdir(idx);
  } catch {}
}

const argv = process.argv.slice(2);
const doCommit = argv.includes('--commit') || argv.includes('--push');
const doPush = argv.includes('--push');

await ensureVault();
console.log(`[sync] copying tree → ${CONTENT}`);
await copyTree(VAULT_DIR, CONTENT);
await applyRenames();
await pruneNoise();
if (argv.includes('--prune')) {
  console.log('[sync] pruning files removed upstream (stale assets etc)…');
  await prune(VAULT_DIR, CONTENT);
}
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
