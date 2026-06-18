import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { load } from 'cheerio';
import sharp from 'sharp';

const PUBLIC = path.resolve('public');
const TILES_DIR = path.resolve('public/_tiles');
const TARGET_WIDTH = parseInt(process.env.TARGET_WIDTH || '6000', 10);
const TILE_SIZE = 256;

sharp.cache(false);
sharp.concurrency(1);

await fs.mkdir(TILES_DIR, { recursive: true });

const pattern = process.env.GLOB || `${PUBLIC}/**/*.excalidraw.html`;
const files = await glob(pattern);
console.log(`found ${files.length} excalidraw pages`);

let ok = 0, skip = 0, err = 0;

for (const file of files) {
  const rel = path.relative(PUBLIC, file);
  const slug = rel.replace(/\.html$/, '').replace(/[\/\\]/g, '__');
  const tileBase = path.join(TILES_DIR, slug);
  const dziPath = `${tileBase}.dzi`;

  try {
    const html = await fs.readFile(file, 'utf8');
    const $ = load(html, { xmlMode: false });
    const svgEl = $('.excalidraw-container svg').first();

    if (!svgEl.length) {
      console.log(`skip (no svg): ${rel}`);
      skip++;
      continue;
    }

    if (!svgEl.attr('xmlns')) svgEl.attr('xmlns', 'http://www.w3.org/2000/svg');
    const widthAttr = svgEl.attr('width');
    const heightAttr = svgEl.attr('height');
    const viewBox = svgEl.attr('viewBox');
    const isPct = (v) => typeof v === 'string' && v.endsWith('%');
    let intrinsicW = isPct(widthAttr) ? 0 : parseFloat(widthAttr || '0');
    let intrinsicH = isPct(heightAttr) ? 0 : parseFloat(heightAttr || '0');
    if ((!intrinsicW || !intrinsicH) && viewBox) {
      const [, , vw, vh] = viewBox.split(/\s+/).map(Number);
      intrinsicW = vw; intrinsicH = vh;
    }
    if (!intrinsicW || !intrinsicH) {
      console.log(`skip (no dims): ${rel}`);
      skip++;
      continue;
    }
    svgEl.attr('width', String(intrinsicW));
    svgEl.attr('height', String(intrinsicH));

    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + $.html(svgEl);

    const aspect = intrinsicH / intrinsicW;
    const targetW = Math.min(TARGET_WIDTH, Math.max(2000, Math.round(intrinsicW * 2)));
    const targetH = Math.round(targetW * aspect);

    console.log(`render ${rel} -> ${targetW}x${targetH}`);

    const pngBuffer = await sharp(Buffer.from(svgString), { density: 96, limitInputPixels: false, unlimited: true })
      .resize({ width: targetW, height: targetH, fit: 'fill', background: { r: 30, g: 30, b: 32 } })
      .png({ compressionLevel: 6 })
      .toBuffer({ resolveWithObject: false });

    await fs.rm(tileBase + '_files', { recursive: true, force: true });
    await fs.rm(dziPath, { force: true });

    await sharp(pngBuffer, { limitInputPixels: false })
      .tile({ size: TILE_SIZE, layout: 'dz', overlap: 1 })
      .toFile(tileBase);

    const dziUrl = `/_tiles/${slug}.dzi`;
    const filesUrl = `/_tiles/${slug}_files/`;
    const viewerId = `osd-${slug.slice(0, 30).replace(/[^a-z0-9-]/gi, '-')}`;

    svgEl.replaceWith(
      `<div id="${viewerId}" class="osd-viewer" data-dzi="${dziUrl}" data-files="${filesUrl}" style="width:100%;height:100%;background:#1e1e20;"></div>`
    );

    $('head').append(`
<link rel="stylesheet" href="/_tiles/osd-style.css" />
<script src="https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/openseadragon.min.js"></script>
`);
    $('body').append(`
<script>
(function(){
  function init(){
    if (typeof OpenSeadragon === 'undefined') return setTimeout(init, 50);
    var el = document.getElementById('${viewerId}');
    if (!el) return;
    if (el.dataset.osdInit) return; el.dataset.osdInit = '1';
    OpenSeadragon({
      element: el,
      tileSources: '${dziUrl}',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      maxZoomPixelRatio: 4,
      minZoomImageRatio: 0.5,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      animationTime: 0.3,
      springStiffness: 8
    });
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
</script>
`);

    await fs.writeFile(file, $.html());
    ok++;
  } catch (e) {
    console.error(`ERR ${rel}: ${e.message}`);
    err++;
  }
}

const cssPath = path.join(TILES_DIR, 'osd-style.css');
await fs.writeFile(cssPath, `
.osd-viewer { width: 100%; height: 100%; }
.openseadragon-canvas { outline: none; }
.excalidraw-container { background:#1e1e20 !important; }
`);

console.log(`\nresult: ok=${ok} skip=${skip} err=${err}`);
