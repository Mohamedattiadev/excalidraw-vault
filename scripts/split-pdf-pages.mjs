#!/usr/bin/env node
// Rewrites a PDF so each page carries only its own content.
//
// Cutting a big sheet into pages with an online tool usually does it the cheap
// way: one content stream, eighteen crop boxes over it. The file then looks
// paginated and behaves like the single enormous sheet it still is — every page
// draws the whole poster and clips it, so the viewer decodes all 837 images of
// this vault's architecture notes eighteen times over, and no page can be shown
// before the whole file has arrived. Measured in the browser, page one took
// 4.1s to draw that way and 0.26s after this script; page nine, 2.5s and 0.01s.
//
// pdftocairo re-renders one page at a time and keeps only what that page marks,
// so the output is genuinely eighteen pages. It stays vector: the ink is still
// ink, and zooming still sharpens.
//
//   node scripts/split-pdf-pages.mjs "content/.../notes.pdf"
//
// Needs poppler (pdftocairo, pdfunite, pdfinfo), which is `poppler-utils` on
// Debian and `poppler` on Arch. The file is replaced in place once every page
// has been written, so an interrupted run leaves the original alone.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/split-pdf-pages.mjs <file.pdf>');
  process.exit(1);
}

const info = async (file) => {
  const { stdout } = await run('pdfinfo', [file]);
  const pages = Number(/^Pages:\s*(\d+)/m.exec(stdout)?.[1]);
  if (!Number.isFinite(pages)) throw new Error(`could not read a page count from ${file}`);
  return pages;
};

const bytes = async (file) => (await fs.stat(file)).size;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

const pages = await info(src);
const before = await bytes(src);
console.log(`${path.basename(src)}: ${pages} pages, ${mb(before)}`);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfsplit-'));
try {
  const parts = [];
  for (let n = 1; n <= pages; n++) {
    // Zero-padded, because the parts are handed to pdfunite in this order and a
    // plain glob would file page 10 between 1 and 2.
    const out = path.join(tmp, `${String(n).padStart(4, '0')}.pdf`);
    await run('pdftocairo', ['-pdf', '-f', String(n), '-l', String(n), src, out]);
    parts.push(out);
    process.stdout.write(`\r  page ${n}/${pages}`);
  }
  process.stdout.write('\n');

  const joined = path.join(tmp, 'joined.pdf');
  await run('pdfunite', [...parts, joined]);

  // A page lost along the way would be silently shipped, so it is checked
  // before the original is given up.
  const got = await info(joined);
  if (got !== pages) throw new Error(`ended up with ${got} pages, expected ${pages}`);

  await fs.copyFile(joined, src);
  console.log(`rewritten: ${pages} pages, ${mb(before)} -> ${mb(await bytes(src))}`);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
