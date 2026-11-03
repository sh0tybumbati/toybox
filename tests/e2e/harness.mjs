// A tiny end-to-end harness: static server + headless Chromium driven over the
// DevTools protocol (no dependencies). Used by `npm run e2e`.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
export const wait = ms => new Promise(r => setTimeout(r, ms));

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome']) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export async function launch({ width = 960, height = 600, touch = false } = {}) {
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chromium/Chrome found (set CHROME=/path/to/chrome)');
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const port = 9300 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'toybox-e2e-'));
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch (e) { /* not up yet */ }
    if (!target) await wait(250);
  }
  if (!target) throw new Error('Chromium did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });

  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const text = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      if (!/GL Driver|GPU stall|swiftshader|WebGL/i.test(text)) errors.push(`console.error: ${text}`);
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });

  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}\n${expression}`);
    return r.result && r.result.value;
  };

  const api = {
    errors, ev, send, url,
    async open(query = '') {
      await send('Page.navigate', { url: url + query });
      for (let i = 0; i < 80; i++) {
        if (await ev("!!(window.__toybox && __toybox.scene.isActive('Room'))").catch(() => false)) { await wait(300); return; }
        await wait(250);
      }
      throw new Error('the room scene never started');
    },
    async clearSave() {
      await ev("new Promise(r => { const q = indexedDB.deleteDatabase('toybox'); q.onsuccess = q.onerror = q.onblocked = () => r(1); })");
      await ev('localStorage.clear()');
    },
    room: expr => ev(`(r => { ${expr} })(__toybox.scene.getScene('Room'))`),
    async shot(file) { fs.writeFileSync(file, Buffer.from((await send('Page.captureScreenshot')).data, 'base64')); },

    // Mouse
    mouse: (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }),
    async click(x, y, after = 400) {
      await api.mouse('mouseMoved', x, y); await api.mouse('mousePressed', x, y); await api.mouse('mouseReleased', x, y); await wait(after);
    },
    async drag(x0, y0, x1, y1, after = 500) {
      await api.mouse('mouseMoved', x0, y0); await api.mouse('mousePressed', x0, y0);
      for (let i = 1; i <= 12; i++) { await api.mouse('mouseMoved', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await wait(16); }
      await wait(120); await api.mouse('mouseReleased', x1, y1); await wait(after);
    },

    // Touch
    touch: (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] }),
    async tap(x, y, after = 400) { await api.touch('touchStart', x, y); await wait(40); await api.touch('touchEnd', x, y); await wait(after); },
    async touchDrag(x0, y0, x1, y1, after = 500) {
      await api.touch('touchStart', x0, y0);
      for (let i = 1; i <= 12; i++) { await api.touch('touchMove', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await wait(16); }
      await wait(120); await api.touch('touchEnd', x1, y1); await wait(after);
    },

    async close() {
      try { ws.close(); } catch (e) { /* ignore */ }
      proc.kill('SIGKILL');
      server.close();
      fs.rmSync(profile, { recursive: true, force: true });
    },
  };
  return api;
}
