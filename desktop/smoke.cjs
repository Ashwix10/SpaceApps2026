const assert = require('node:assert/strict');
const path = require('node:path');
const { launchBackend, request } = require('./launcher.cjs');

async function smoke() {
  delete process.env.ANTHROPIC_API_KEY; // Prove the offline template path without sending data anywhere.
  const backend = launchBackend({ root: path.resolve(__dirname, '..'), executable: process.env.ASTROTWIN_BACKEND_EXECUTABLE, onLog: text => process.stderr.write(text) });
  try {
    const { origin, token } = await backend.ready;
    const call = async (route, payload) => {
      const response = await request(origin, route, token, payload);
      assert.equal(response.status, 200, `${route}: ${response.body}`);
      console.log('PASS', route); return JSON.parse(response.body);
    };
    const ui = await request(origin, '/', token);
    assert.equal(ui.status, 200); assert.ok(ui.body.includes('id="root"'));
    assert.ok(ui.headers['content-security-policy'].includes("connect-src 'self'"));
    assert.equal((await request(origin, '/api/health', '')).status, 401);
    await call('/api/health'); await call('/api/crew'); await call('/api/injuries');
    const { demo } = await call('/api/defaults');
    const { alternative, ...input } = demo;
    const forecast = await call('/api/forecast', input);
    assert.equal(forecast.days.length, input.mission.duration_days + 91);
    const comparison = await call('/api/compare', { request: input, alternative });
    const explanation = await call('/api/explain', { forecast, comparison, crew_name: input.crew.name, audience: 'crew' });
    assert.equal(explanation.source, 'template');
    console.log('PASS: local UI, authenticated desktop host, all API routes, offline explanation');
  } finally {
    await backend.stop();
    assert.notEqual(backend.child.exitCode, null, 'Backend must stop with its launcher');
    console.log('PASS: backend shutdown');
  }
}
smoke().catch(error => { console.error(error); process.exitCode = 1; });
