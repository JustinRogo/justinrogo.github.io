import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { vendorUpdates } from './build-site.mjs';
import { buildSanitizer } from './build-sanitizer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(root, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await buildSanitizer();
const { default: handler } = await import('../api/updates.mjs');
await vendorUpdates();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf' };
const port = Number(process.env.PORT || 4388);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/__updates-review') {
      const width = Math.max(320, Math.min(1440, Number(url.searchParams.get('width')) || 390));
      const height = Math.max(500, Math.min(5000, Number(url.searchParams.get('height')) || 3000));
      const target = url.searchParams.get('widget') === '1' ? '/updates/embed?preview=1' : '/updates?preview=1';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><title>Updates responsive review</title><style>body{margin:0;background:#dce3ec}iframe{display:block;border:0;width:${width}px;height:${height}px}</style></head><body><iframe title="Updates at ${width} pixels" src="${target}"></iframe></body></html>`);
      return;
    }
    if (['/api/updates', '/updates/feed.xml'].includes(url.pathname)) {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 150000) { res.writeHead(413); res.end('Request too large'); return; }
      }
      req.body = raw || undefined;
      req.query = Object.fromEntries(url.searchParams);
      if (url.pathname === '/updates/feed.xml') req.query.action = 'feed';
      res.status = code => { res.statusCode = code; return res; };
      res.json = body => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); return res; };
      res.send = body => { res.end(body); return res; };
      await handler(req, res);
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const routes = { '/updates': '/Pages/Updates/index.html', '/updates/': '/Pages/Updates/index.html', '/updates/embed': '/Pages/Updates/embed.html' };
    let pathname = decodeURIComponent(routes[url.pathname] || url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const parts = pathname.split('/').filter(Boolean);
    const allowedRoots = ['assets', 'data', 'Maps', 'Pages', 'favicon.svg', 'index.html', 'main.js', 'style.css'];
    if (!allowedRoots.includes(parts[0]) || parts.some(part => part.startsWith('.') || part === 'node_modules') || /\.(md|sql|mjs|bak)$/i.test(pathname)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    let filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const content = await readFile(filename);
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (filename === path.join(root, 'Pages/Updates/embed.html')) res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://uconn.atlassian.net");
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    res.statusCode = error.code === 'ENOENT' ? 404 : 500;
    res.end(error.code === 'ENOENT' ? 'Not found' : 'Could not serve this request');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/updates?preview=1`));
