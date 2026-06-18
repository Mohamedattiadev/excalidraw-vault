#!/usr/bin/env node
// Downscale + recompress every image in public/_files/ to WebP (max 1200px wide).
// Updates each scene JSON in public/_scenes/ so file refs point at the new .webp + image/webp mimeType.

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

const FILES_DIR  = path.resolve('public/_files');
const SCENES_DIR = path.resolve('public/_scenes');
const MAX_WIDTH  = 1200;
const WEBP_QUALITY = 80;

const IMG_EXT = /\.(png|jpe?g|webp)$/i;

if (!existsSync(FILES_DIR)) {
  console.log('[opt] no public/_files dir, skipping');
  process.exit(0);
}

const files = await fs.readdir(FILES_DIR);
const imgFiles = files.filter((f) => IMG_EXT.test(f));
console.log(`[opt] processing ${imgFiles.length} images (target: webp ≤${MAX_WIDTH}px @ q${WEBP_QUALITY})`);

// hash → { oldName, newName }
const mapping = {};
let bytesBefore = 0, bytesAfter = 0;

for (const name of imgFiles) {
  const inPath = path.join(FILES_DIR, name);
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  const outName = base + '.webp';
  const outPath = path.join(FILES_DIR, outName);
  try {
    const st = await fs.stat(inPath);
    bytesBefore += st.size;
    // Already webp + small enough? Skip re-encode.
    if (ext.toLowerCase() === '.webp') {
      const meta = await sharp(inPath).metadata();
      if (!meta.width || meta.width <= MAX_WIDTH) {
        bytesAfter += st.size;
        mapping[base] = { oldName: name, newName: name };
        continue;
      }
    }
    await sharp(inPath, { failOn: 'none' })
      .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(outPath);
    if (outName !== name) await fs.rm(inPath);
    bytesAfter += (await fs.stat(outPath)).size;
    mapping[base] = { oldName: name, newName: outName };
  } catch (err) {
    console.warn(`[opt] skip ${name}: ${err.message}`);
    mapping[base] = { oldName: name, newName: name };
  }
}

console.log(`[opt] size: ${(bytesBefore / 1024 / 1024).toFixed(1)}MB → ${(bytesAfter / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - bytesAfter / bytesBefore) * 100)}% smaller)`);

// Update scene JSON files
if (existsSync(SCENES_DIR)) {
  const sceneFiles = await glob(`${SCENES_DIR}/*.json`);
  let patched = 0;
  for (const sf of sceneFiles) {
    if (path.basename(sf) === 'index.json') continue;
    try {
      const scene = JSON.parse(await fs.readFile(sf, 'utf8'));
      let touched = false;
      if (scene.files) {
        for (const [id, file] of Object.entries(scene.files)) {
          if (!file || typeof file.dataURL !== 'string') continue;
          // Match /_files/HASH.ext
          const m = file.dataURL.match(/\/_files\/([^./]+)(\.[A-Za-z0-9]+)/);
          if (!m) continue;
          const hash = m[1];
          const info = mapping[hash];
          if (!info) continue;
          if (info.newName !== info.oldName) {
            file.dataURL = `/_files/${info.newName}`;
            file.mimeType = 'image/webp';
            touched = true;
          }
        }
      }
      if (touched) {
        await fs.writeFile(sf, JSON.stringify(scene));
        patched++;
      }
    } catch (err) {
      console.warn(`[opt] scene patch failed ${path.basename(sf)}: ${err.message}`);
    }
  }
  console.log(`[opt] patched ${patched} scene JSON files`);
}

console.log('[opt] done.');
