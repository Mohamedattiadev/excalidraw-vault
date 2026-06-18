#!/usr/bin/env node
// Static server: serves public/ with auto-fallback to <path>.html and <path>/index.html.
// Handles Quartz's extensionless slugs and .excalidraw slugs that need .excalidraw.html.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const PORT = Number(process.argv[2]) || 8080;
const ROOT = path.resolve('public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

function tryFile(fp) {
  try {
    const st = fs.statSync(fp);
    if (st.isFile()) return fp;
  } catch {}
  return null;
}

function resolveFile(reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const clean = decoded.replace(/\/+/g, '/').replace(/\/$/, '');
  const base = path.normalize(path.join(ROOT, clean));
  if (!base.startsWith(ROOT)) return null;

  const exact = tryFile(base);
  if (exact) return exact;

  const withHtml = tryFile(base + '.html');
  if (withHtml) return withHtml;

  const asIndex = tryFile(path.join(base, 'index.html'));
  if (asIndex) return asIndex;

  return null;
}

const server = http.createServer((req, res) => {
  const reqPath = url.parse(req.url).pathname || '/';
  const start = Date.now();

  if (reqPath === '/') {
    const root = tryFile(path.join(ROOT, 'index.html'));
    if (root) return stream(root, res, req, start, reqPath);
  }

  const fp = resolveFile(reqPath);
  if (!fp) {
    const fb = tryFile(path.join(ROOT, '404.html'));
    if (fb) return stream(fb, res, req, start, reqPath, 404);
    return send(res, 404, 'Not Found');
  }
  return stream(fp, res, req, start, reqPath);
});

function stream(fp, res, req, start, reqPath, status = 200) {
  const ext = path.extname(fp).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const st = fs.statSync(fp);
  res.writeHead(status, {
    'Content-Type': mime,
    'Content-Length': st.size,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(fp).pipe(res);
  res.on('finish', () => {
    console.log(`${status} ${reqPath} -> ${path.relative(ROOT, fp)} (${Date.now() - start}ms)`);
  });
}

server.listen(PORT, () => {
  console.log(`serve-quartz: http://localhost:${PORT}  (root=${ROOT})`);
});
