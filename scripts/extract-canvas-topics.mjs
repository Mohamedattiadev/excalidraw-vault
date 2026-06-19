// Quick local helper to surface likely topic / section headings from an Excalidraw canvas.
// Heuristic: short text elements (3..60 chars, no newline), grouped by fontSize bucket,
// printed largest-first so you can pick real headings off the top.
import fs from 'node:fs/promises';
import { parseExcalidraw } from '../.quartz/plugins/obsidian-plugin-excalidraw/dist/index.js';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/extract-canvas-topics.mjs <file.excalidraw.md>'); process.exit(1); }
const content = await fs.readFile(file, 'utf8');
const data = parseExcalidraw(content, file);
const txt = (data.elements || []).filter((e) => e.type === 'text');

const grouped = new Map();
for (const e of txt) {
  const t = (e.text || '').trim();
  if (!t) continue;
  if (t.includes('\n')) continue;
  if (t.length < 3 || t.length > 60) continue;
  if (/^[\d\s.,:;\-+=*/()\[\]{}<>?!]+$/.test(t)) continue; // pure punctuation/number
  const k = Math.round((e.fontSize || 20) / 4) * 4;
  if (!grouped.has(k)) grouped.set(k, new Map());
  const m = grouped.get(k);
  m.set(t, (m.get(t) || 0) + 1);
}
const keys = [...grouped.keys()].sort((a, b) => b - a);
for (const k of keys) {
  console.log(`\n== fontSize ~${k} ==`);
  const entries = [...grouped.get(k).entries()].sort((a, b) => b[1] - a[1]);
  for (const [t, n] of entries.slice(0, 60)) console.log(`  (${n}) ${t}`);
}
