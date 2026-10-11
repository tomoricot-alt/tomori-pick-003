// dist/ を GitHub Pages と同じ /tomori-pick-003/ 配下で配信する簡易サーバー
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const BASE = '/tomori-pick-003';
const ROOT = new URL('../dist', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.ico': 'image/x-icon', '.json': 'application/json', '.png': 'image/png' };

export function serve(port = 4173) {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!p.startsWith(BASE)) { res.writeHead(404); return res.end('not found'); }
    p = p.slice(BASE.length) || '/';
    if (p.endsWith('/')) p += 'index.html';
    try {
      const data = await readFile(join(ROOT, normalize(p)));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(data);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve(Number(process.env.PORT) || 4173);
  console.log(`http://localhost:${process.env.PORT || 4173}${BASE}/`);
}
