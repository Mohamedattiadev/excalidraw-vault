#!/usr/bin/env node
// Makes the alias redirects work with a trailing slash too.
//
// The alias plugin emits one file per alias: `03-os.html`. Pages serves
// `/03-os` from it, but `/03-os/` looks for `03-os/index.html`, does not find
// it, and 404s. The trailing slash is the shape that matters here, because
// every internal link the site ever published had one, so that is what is
// sitting in people's bookmarks.
//
// So for each redirect stub `X.html` with no `X/` directory, write the same
// stub to `X/index.html`. The stub's URLs are relative and the copy sits one
// level deeper, so they get a `../` in front, otherwise `/03-os/` would send
// you to `/03-os/01-universite/03-os/`.
//
//   node scripts/alias-dir-redirects.mjs [publicDir]

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'public');
const IS_STUB = /<meta\s+http-equiv="refresh"/i;

// Only the attributes a stub actually carries. Absolute and protocol URLs are
// left alone: they do not care how deep the file is.
const URL_ATTR = /(\b(?:href|url)=)(["']?)(?!["']?(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#))([^"'>\s]+)(\2)/gi;

const deepen = (html) =>
  html.replace(URL_ATTR, (_m, attr, q, url, endq) =>
    `${attr}${q}${('../' + url).replace(/^\.\.\/\.\//, '../')}${endq}`);

let made = 0, skipped = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.isFile() || !e.name.endsWith('.html') || e.name === 'index.html') continue;

    const html = fs.readFileSync(p, 'utf8');
    if (!IS_STUB.test(html)) continue;               // a real page, not a redirect

    const asDir = p.slice(0, -'.html'.length);
    if (fs.existsSync(asDir)) { skipped++; continue; } // a real page already owns that path

    fs.mkdirSync(asDir, { recursive: true });
    fs.writeFileSync(path.join(asDir, 'index.html'), deepen(html));
    made++;
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`[aliases] ${ROOT} does not exist, run the build first`);
  process.exit(1);
}
walk(ROOT);
console.log(`[aliases] wrote ${made} trailing-slash redirect(s), skipped ${skipped} already served`);
if (made) {
  // Quartz cleans public/ by rmdir-ing what it emitted, and these directories
  // are not on that list, so the next build dies on ENOTEMPTY. CI never sees it
  // (fresh checkout, and this runs last), but a local rebuild does.
  console.log('[aliases] run this last. Wipe public/ before building again.');
}
