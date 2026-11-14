const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { createInterface } = require('node:readline');

function pythonCommand(root) {
  if (process.env.ASTROTWIN_PYTHON) return process.env.ASTROTWIN_PYTHON;
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(python)) throw new Error('Python environment missing. Follow README desktop setup first, or set ASTROTWIN_PYTHON.');
  return python;
}

function request(origin, route, token, payload) {
  return new Promise((resolve, reject) => {
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const req = http.request(new URL(route, origin), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-AstroTwin-Session': token, ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }) },
      timeout: 10000,
    }, res => {
      let text = '';
      res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text, headers: res.headers }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Local backend request timed out')));
    req.on('error', reject); req.end(body);
  });
}

function launchBackend({ root, resourcesPath, packaged = false, executable, timeoutMs = 30000, onLog = () => {}, onUnexpectedExit = () => {} }) {
  const token = randomBytes(32).toString('hex');
  const command = executable || (packaged ? path.join(resourcesPath, 'backend', process.platform === 'win32' ? 'astrotwin-backend.exe' : 'astrotwin-backend') : pythonCommand(root));
  const args = executable || packaged ? [] : ['-u', path.join(root, 'desktop', 'backend.py')];
  const child = spawn(command, args, { cwd: packaged ? resourcesPath : root, windowsHide: true,
    env: { ...process.env, ASTROTWIN_DESKTOP_TOKEN: token, PYTHONUNBUFFERED: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stopping = false;
  let settled = false;
  let origin;
  let lastLog = '';
  const exited = new Promise(resolve => { child.once('exit', resolve); child.once('error', resolve); });
  child.stdin.on('error', () => {});
  child.stderr.on('data', bytes => { lastLog = (lastLog + bytes.toString()).slice(-6000); onLog(bytes.toString()); });
  let rejectReady;
  let readyTimer;
  const ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    readyTimer = setTimeout(() => reject(new Error(`Local backend did not start within ${timeoutMs / 1000}s. ${lastLog}`)), timeoutMs);
    const lines = createInterface({ input: child.stdout });
    lines.on('line', async line => {
      let message;
      try { message = JSON.parse(line); } catch { onLog(line); return; }
      if (message.event !== 'ready' || !Number.isInteger(message.port) || message.port < 1 || message.port > 65535 || origin) return;
      origin = `http://127.0.0.1:${message.port}`;
      while (!stopping && !settled) {
        try {
          const response = await request(origin, '/api/health', token);
          if (!stopping && !settled && response.status === 200 && JSON.parse(response.body).status === 'ok') {
            settled = true; clearTimeout(readyTimer); resolve({ origin, token }); return;
          }
        } catch { /* Socket announcement can precede lifespan startup. */ }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
    const fail = error => { settled = true; clearTimeout(readyTimer); reject(error); };
    child.once('error', fail);
    child.once('exit', code => {
      if (!settled) fail(new Error(`Backend exited (${code}). ${lastLog}`));
      else if (!stopping) onUnexpectedExit(code);
    });
  });
  let stopPromise;
  function stop() {
    if (stopPromise) return stopPromise;
    stopping = true;
    clearTimeout(readyTimer);
    if (!settled) { settled = true; rejectReady(new Error('Backend startup cancelled')); }
    stopPromise = (async () => {
      if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
      child.stdin.end('shutdown\n');
      const exitedNormally = await Promise.race([exited.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 5000).unref())]);
      if (!exitedNormally) {
        if (process.platform === 'win32') {
          await new Promise(resolve => {
            const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
            killer.once('exit', resolve); killer.once('error', resolve);
          });
        } else child.kill('SIGKILL');
        await exited;
      }
    })();
    return stopPromise;
  }
  ready.catch(() => { stop().catch(onLog); });
  return { ready, stop, child };
}

module.exports = { launchBackend, pythonCommand, request };
