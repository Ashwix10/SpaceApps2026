const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { once } = require('node:events');
const { launchBackend, request } = require('../launcher.cjs');
const root = path.resolve(__dirname, '../..');

test('desktop host serves UI and API only to its session, then releases its port', async () => {
  const backend = launchBackend({ root });
  let origin;
  try {
    const ready = await backend.ready;
    origin = ready.origin;
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal((await request(origin, '/api/health', '')).status, 401);
    assert.equal((await request(origin, '/api/health', 'wrong-session')).status, 401);
    const health = await request(origin, '/api/health', ready.token);
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).status, 'ok');
    const ui = await request(origin, '/', ready.token);
    assert.equal(ui.status, 200);
    assert.match(ui.body, /id="root"/);
    assert.match(ui.headers['content-security-policy'], /connect-src 'self'/);
    assert.equal(ui.headers['x-content-type-options'], 'nosniff');
  } finally { await backend.stop(); }
  assert.notEqual(backend.child.exitCode, null);
  await assert.rejects(request(origin, '/api/health', 'closed'));
});

test('closing the parent pipe stops the backend after a parent crash', async () => {
  const backend = launchBackend({ root });
  try {
    await backend.ready;
    const exited = once(backend.child, 'exit');
    backend.child.stdin.destroy();
    await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Orphan backend survived parent disconnect')), 4000).unref())]);
    assert.equal(backend.child.exitCode, 0);
  } finally { await backend.stop(); }
});

test('a missing backend executable produces a startup failure', async () => {
  const backend = launchBackend({ root, executable: path.join(root, 'desktop', 'does-not-exist.exe') });
  await assert.rejects(backend.ready, /ENOENT/);
  await backend.stop();
});

test('cancelling startup is safe and repeated stop calls share cleanup', async () => {
  const backend = launchBackend({ root });
  const rejected = assert.rejects(backend.ready, /cancelled/);
  const first = backend.stop();
  assert.equal(backend.stop(), first);
  await Promise.all([first, rejected]);
  assert.notEqual(backend.child.exitCode, null);
});
