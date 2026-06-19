// Pulls every link out of an Excalidraw canvas, fetches the page title for each,
// trims it to ~3 words, and prints a markdown table of:  | short title | [Go to link](url) |
import fs from 'node:fs/promises';
import { parseExcalidraw } from '../.quartz/plugins/obsidian-plugin-excalidraw/dist/index.js';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/extract-canvas-links.mjs <file.excalidraw.md>'); process.exit(1); }

const content = await fs.readFile(file, 'utf8');
const data = parseExcalidraw(content, file);
const elements = data.elements || [];

const seen = new Set();
const urls = [];
for (const e of elements) {
  if (!e.link || !/^https?:\/\//.test(e.link)) continue;
  if (seen.has(e.link)) continue;
  seen.add(e.link);
  urls.push(e.link);
}

async function fetchTitle(url) {
  // YouTube → use oEmbed (fast, no HTML scrape).
  if (/youtube\.com|youtu\.be/.test(url)) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (r.ok) {
        const j = await r.json();
        if (j.title) return j.title;
      }
    } catch {}
  }
  // PDF → use filename.
  if (/\.pdf(\?|$)/i.test(url)) {
    try { return decodeURIComponent(url.split('/').pop().split('?')[0]); } catch {}
  }
  // Everything else → fetch HTML, parse <title>.
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) return url;
    const html = await r.text();
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) return m[1].trim();
  } catch {}
  return url;
}

function shorten(title) {
  if (!title) return '(link)';
  // Strip site suffixes like " - YouTube" / " | Site".
  let t = title.replace(/\s*[-|·–—]\s*(YouTube|Notion|GitHub|Wikipedia)\s*$/i, '').trim();
  // Drop emoji-style symbols, then collapse whitespace.
  t = t.replace(/[#"`]/g, '').replace(/\s+/g, ' ').trim();
  // Strip leading numbering / bracket tags so the 3-word window catches real words: "1.8.1 Asymptotic ..." → "Asymptotic ...", "[New] Matrix ..." → "Matrix ...".
  t = t.replace(/^(?:\[[^\]]+\]\s*|[\d.]+\s+)+/, '').trim();
  let words = t.split(' ').filter(Boolean).slice(0, 3);
  // Drop trailing conjunctions / dangling fragments so we don't end on "and", "of", etc.
  while (words.length && /^(and|or|of|the|in|to|for|by|with|on|as|a|an|is|that|this|using|big|little|part)$/i.test(words[words.length - 1])) words.pop();
  // Strip trailing punctuation noise like "-", ":", "|", "(...".
  let out = words.join(' ').replace(/[\s\-:|·–—,]+$/g, '').trim();
  // If we cut into an open paren, kill the dangling one.
  if ((out.match(/\(/g) || []).length > (out.match(/\)/g) || []).length) out = out.replace(/\([^)]*$/, '').trim();
  return out || '(link)';
}

console.log('| Topic | Resource |');
console.log('| ----- | -------- |');
for (const url of urls) {
  const raw = await fetchTitle(url);
  const short = shorten(raw);
  // Markdown-safe pipe.
  const safe = short.replace(/\|/g, '\\|');
  console.log(`| ${safe} | [Go to link](${url}) |`);
}
