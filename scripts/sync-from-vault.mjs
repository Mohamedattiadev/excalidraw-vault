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
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const VAULT_REPO = 'https://github.com/Mohamedattiadev/my-study-summaries.git';
const VAULT_DIR = path.join('/tmp', 'vault-sync');
const CONTENT = path.resolve('content');

// Anything matching is excluded from the copy entirely.
const SKIP_DIRS = new Set([
  '_cache', '_system', 'Collab', '.obsidian', '.git', '.trash',
  '9999 - Excalidraw', '999-Templates', '00-Index',
  // Authored here, not in the vault. The sync must never generate into it or prune it.
  '11-Dev-101',
]);
const PROTECTED_RE = /(^|\/)(index\.md|README\.md)$/i;          // we author these
const SUBJECT_DIR_RE = /^\d{1,2}[-._ ]/;                         // 01-Algo, 02-DesignPatterns, …
// Asset folders look like subject folders (numeric prefix) but should NOT get an auto-generated index.md.
const ASSET_LIKE_NAMES = new Set(['90-Assets', '99-Assets', '999-Templates']);

function prettifyLabel(raw) {
  let s = String(raw)
    .replace(/\.excalidraw\.md$/i, '')
    .replace(/\.excalidraw$/i, '')
    .replace(/\.md$/i, '')
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
  // Strip both `.excalidraw.md` and bare `.md` from input; output is always `.excalidraw.md`.
  const stripped = rawFilename.replace(/\.excalidraw\.md$/i, '').replace(/\.md$/i, '');
  const label = prettifyLabel(stripped);
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

async function isExcalidrawMd(fp) {
  if (fp.endsWith('.excalidraw.md')) return true;
  if (!fp.endsWith('.md')) return false;
  try {
    const head = await fs.readFile(fp, 'utf8');
    return /^excalidraw-plugin:\s*\S/m.test(head.slice(0, 2048));
  } catch { return false; }
}

async function collectExcalidrawSources(srcDir, relPath = []) {
  // Returns { src, subjectDir, filename } for every excalidraw md inside a numbered subject folder.
  // Vault may use either `.excalidraw.md` OR plain `.md` with `excalidraw-plugin:` frontmatter.
  const out = [];
  const ents = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const next = path.join(srcDir, e.name);
    const nextRel = [...relPath, e.name];
    if (e.isDirectory()) {
      out.push(...(await collectExcalidrawSources(next, nextRel)));
    } else if (e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md') {
      const top = nextRel[0];
      if (!SUBJECT_DIR_RE.test(top)) continue;
      if (!(await isExcalidrawMd(next))) continue;
      out.push({ src: next, subjectDir: top, filename: e.name, segments: nextRel });
    }
  }
  return out;
}

// Match a vault .excalidraw.md to an existing canonical content file (so URLs/wikilinks stay stable).
function initialsOf(label) {
  // "Operating Systems" → "os", "Design Patterns" → "dp", "Databases" → "d"
  return label.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toLowerCase();
}
function findExistingTarget(subjectDir, vaultFilename) {
  const dir = path.join(CONTENT, subjectDir);
  if (!existsSync(dir)) return null;
  const vaultLabel = prettifyLabel(vaultFilename).toLowerCase();
  const vaultInitials = initialsOf(vaultLabel);
  let bestMatch = null;
  try {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.excalidraw.md')) continue;
      const contentLabel = prettifyLabel(f).toLowerCase();
      if (contentLabel === vaultLabel) return f;
      if (contentLabel.startsWith(vaultLabel) || vaultLabel.startsWith(contentLabel)) bestMatch = f;
      // Acronym match — "OS" → "Operating Systems", "DP" → "Design Patterns"
      const contentInitials = initialsOf(contentLabel);
      if (vaultLabel.length >= 2 && vaultLabel.length <= 4 && (vaultLabel === contentInitials || vaultLabel === contentInitials + (contentLabel.split(' ').pop() || '').slice(0, 1))) {
        bestMatch = f;
      }
      // Reverse acronym — "Databases" content with "DB" vault: first 2 letters of single-word content
      if (vaultLabel.length === 2 && contentLabel.split(/\s+/).length === 1) {
        const first2 = contentLabel.replace(/[aeiou]/g, '').slice(0, 2);
        if (first2 === vaultLabel) bestMatch = f;  // "db" === "db" (Databases consonants)
      }
    }
  } catch {}
  return bestMatch;
}

async function syncExcalidrawFiles() {
  const sources = await collectExcalidrawSources(VAULT_DIR);

  // Group vault files by subject so we can match 1:1 when there's exactly one of each.
  const bySubject = new Map();
  for (const s of sources) {
    if (!bySubject.has(s.subjectDir)) bySubject.set(s.subjectDir, []);
    bySubject.get(s.subjectDir).push(s);
  }

  const claimed = new Set();
  for (const [subjectDir, list] of bySubject) {
    const dstDir = path.join(CONTENT, subjectDir);
    await fs.mkdir(dstDir, { recursive: true });

    // Existing canonical files in this subject
    let existingFiles = [];
    try { existingFiles = readdirSync(dstDir).filter((f) => f.endsWith('.excalidraw.md')); } catch {}

    // Special-case: exactly one vault file + exactly one existing canonical → direct match (handles short names like OS, DB).
    if (list.length === 1 && existingFiles.length === 1) {
      const v = list[0];
      const dstName = existingFiles[0];
      await fs.copyFile(v.src, path.join(dstDir, dstName));
      claimed.add(`${subjectDir}/${dstName}`);
      console.log(`[sync] match ${subjectDir}/${v.filename} → ${dstName} (1:1)`);
      continue;
    }

    // Otherwise: per-file label matching, fall back to canonical name.
    for (const { src, filename } of list) {
      const existing = findExistingTarget(subjectDir, filename);
      const dstName = existing || canonicalFilename(filename);
      await fs.copyFile(src, path.join(dstDir, dstName));
      claimed.add(`${subjectDir}/${dstName}`);
      if (existing) console.log(`[sync] match ${subjectDir}/${filename} → ${existing}`);
      else          console.log(`[sync] NEW   ${subjectDir}/${filename} → ${dstName}`);
    }
  }
  return claimed;
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
    if (SKIP_DIRS.has(e.name) || ASSET_LIKE_NAMES.has(e.name)) continue;
    const idx = path.join(CONTENT, e.name, 'index.md');
    if (existsSync(idx)) continue;
    const title = prettifyLabel(e.name);
    const body = `---\ntitle: ${title}\n---\n\n# ${title}\n\nDrawings in this folder are listed in the sidebar.\n`;
    await fs.writeFile(idx, body);
    console.log(`[sync] generated placeholder index for ${e.name}`);
  }
}

async function pruneStale(canonicalSet, vaultLabelsBySubject) {
  // Only delete content files that no vault file in the same subject could plausibly claim.
  const ents = await fs.readdir(CONTENT, { withFileTypes: true });
  for (const e of ents) {
    if (!e.isDirectory() || !SUBJECT_DIR_RE.test(e.name)) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const subDir = path.join(CONTENT, e.name);
    const inner = await fs.readdir(subDir, { withFileTypes: true });
    const vaultLabels = (vaultLabelsBySubject.get(e.name) || []).map((s) => s.toLowerCase());
    for (const f of inner) {
      if (!f.isFile() || !f.name.endsWith('.excalidraw.md')) continue;
      const key = `${e.name}/${f.name}`;
      if (canonicalSet.has(key)) continue;
      const contentLabel = prettifyLabel(f.name).toLowerCase();
      const contentInitials = initialsOf(contentLabel);
      const overlaps = vaultLabels.some((vl) =>
        vl === contentLabel ||
        vl.includes(contentLabel) || contentLabel.includes(vl) ||
        vl === contentInitials ||
        contentLabel.replace(/[aeiou]/g, '').slice(0, 2) === vl
      );
      if (overlaps) continue;
      await fs.rm(path.join(subDir, f.name));
      console.log(`[sync] pruned stale ${key}`);
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

// Collect vault labels per subject for safer pruning.
const vaultLabelsBySubject = new Map();
{
  const all = await collectExcalidrawSources(VAULT_DIR);
  for (const s of all) {
    if (!vaultLabelsBySubject.has(s.subjectDir)) vaultLabelsBySubject.set(s.subjectDir, []);
    vaultLabelsBySubject.get(s.subjectDir).push(prettifyLabel(s.filename));
  }
}

await syncAssets();
await ensureSubjectIndexes();
if (doPrune) await pruneStale(canonical, vaultLabelsBySubject);
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
