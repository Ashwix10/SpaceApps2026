import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

// Execute these pure TypeScript modules on the contract's Node 20 runtime.
function load(relative) {
  const url = new URL(relative, import.meta.url);
  const result = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', result.outputText)(module, module.exports, createRequire(url));
  return module.exports;
}

const { mockDefaults, mockForecast } = load('../src/mocks/index.ts');
const { healthColor, theme } = load('../src/theme.ts');
for (const duration of [7, 180, 900]) {
  test(`mock forecast covers all days and regions for ${duration}-day mission`, () => {
    const input = { ...mockDefaults.demo, mission: { destination: 'ISS', duration_days: duration, eva_days: [] }, injury: null };
    const output = mockForecast(input);
    const n = duration + 91;
    assert.deepEqual(output.days, Array.from({ length: n }, (_, i) => i));
    assert.equal(output.landing_day, duration);
    assert.deepEqual(Object.keys(output.regions).sort(), ['head_neck', 'chest', 'heart', 'spine', 'pelvis', 'left_arm', 'right_arm', 'left_leg', 'right_leg'].sort());
    for (const values of Object.values(output.series)) {
      assert.equal(values.length, n);
      assert.ok(values.every(x => x === 100));
    }
    for (const values of Object.values(output.regions)) {
      assert.equal(values.length, n);
      assert.ok(values.every(x => x === 1));
    }
    for (const band of Object.values(output.bands)) {
      assert.equal(band.low.length, n);
      assert.equal(band.high.length, n);
    }
    assert.equal(output.events.at(-1).day, duration);
    // A changed output must not corrupt another response or the original request.
    output.series.hip_bmd_pct[0] = 0;
    assert.equal(mockForecast(input).series.hip_bmd_pct[0], 100);
  });
}

test('demo injury and spacewalk events remain in chronological order', () => {
  const output = mockForecast(mockDefaults.demo);
  assert.deepEqual(output.events.map(e => [e.day, e.type]), [[0, 'launch'], [40, 'injury'], [60, 'eva'], [120, 'eva'], [180, 'landing']]);
});

test('shared body colors match contract thresholds and clamp outliers', () => {
  assert.equal(healthColor(1).toUpperCase(), theme.healthy);
  assert.equal(healthColor(0.85).toUpperCase(), theme.warning);
  assert.equal(healthColor(0.75).toUpperCase(), theme.danger);
  assert.equal(healthColor(-1).toUpperCase(), theme.danger);
  assert.equal(healthColor(2).toUpperCase(), theme.healthy);
});
