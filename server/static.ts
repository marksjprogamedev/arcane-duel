import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
};

/** Serves the built client (dist/client). Rejects paths that escape `root`. */
export function createStaticHandler(root: string, version: string) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (pathname === '/version') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      res.end(version);
      return;
    }
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.join(root, rel);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const cache = rel === 'index.html' ? 'no-store' : 'public, max-age=31536000, immutable';
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': cache,
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(file).pipe(res);
    });
  };
}
