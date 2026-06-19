// Pulls clickable links out of an Excalidraw canvas and groups each one under the nearest big-font heading.
// Output: markdown rows ready to paste into the overview.
import fs from 'node:fs/promises';
import { parseExcalidraw } from '../.quartz/plugins/obsidian-plugin-excalidraw/dist/index.js';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/extract-canvas-links.mjs <file.excalidraw.md>'); process.exit(1); }
const content = await fs.readFile(file, 'utf8');
const data = parseExcalidraw(content, file);
const elements = data.elements || [];

const JUNK = /^(NOTE:?|note:?|ex:?|EX:?|EXAMPLE:?|example:?|important:?|imp:?|in short:?|sum:?|solu:?|solution:?|after midterm|important !!|FINAL|SUMMARY|SUM UP|SUM|res:?|result|output|the book|big trap|need to know|in detail|FULL SUM\. in short|important :|watch these videos|(\d+\s*[)\-:.]\s*)?step \d+|FInal exam question :?|Final exam question:?|final exam question|note :|note:|recap|later|Question from the book|summary from the book|REAL CASES|IN short :|IN SHORT :|PART \d+:|Part \d+:|part \d+:|chp\s?\d+:?|ch\.?\s?\d+|Lec\.?\s?\d+|after MID TERM|SUM:|in short|SUM:1->5|SUM:6-7)$/i;
const headings = elements.filter((e) => {
  if (e.type !== 'text') return false;
  const t = (e.text || '').trim();
  if (!t || t.length < 3 || t.includes('\n')) return false;
  if ((e.fontSize || 0) < 32) return false;
  if (JUNK.test(t)) return false;
  if (/^TIME\s*COMPL/i.test(t)) return false;
  if (/^[\d\s.,:;\-+=*/()\[\]{}<>?!]+$/.test(t)) return false;
  if (/^ex\s*[:.]?/i.test(t)) return false;
  if (/^solu\s*[:.]?/i.test(t)) return false;
  if (/^[CcM]\s*\[/i.test(t)) return false; // formulas like C[i,j], M[i,j]
  if (/=/.test(t)) return false; // anything with '=' is most likely formula/assignment
  if (/^\([^)]*\)$/.test(t)) return false; // pure parenthesized tuples like (0,1,1,0)
  return true;
});
const links = elements.filter((e) => e.link && /^https?:\/\//.test(e.link));

function center(e) {
  return { x: (e.x || 0) + (e.width || 0) / 2, y: (e.y || 0) + (e.height || 0) / 2 };
}

const byLabel = new Map();
const seen = new Set();
for (const lnk of links) {
  if (seen.has(lnk.link)) continue;
  seen.add(lnk.link);
  const lc = center(lnk);
  let best = null;
  let bestScore = Infinity;
  for (const h of headings) {
    const hc = center(h);
    const d = Math.hypot(hc.x - lc.x, hc.y - lc.y);
    // Penalize tiny headings, reward bigger ones so a far-away true section heading beats a nearby junk label.
    const score = d / Math.max(1, (h.fontSize || 20) / 30);
    if (score < bestScore) { bestScore = score; best = h; }
  }
  const label = best ? best.text.trim() : '(misc)';
  if (!byLabel.has(label)) byLabel.set(label, []);
  byLabel.get(label).push(lnk.link);
}

console.log('| Topic | Resources |');
console.log('| --- | --- |');
for (const [label, urls] of byLabel) {
  const cell = urls.map((u, i) => `[${urls.length > 1 ? `video ${i + 1}` : 'video'}](${u})`).join(', ');
  console.log(`| ${label} | ${cell} |`);
}
