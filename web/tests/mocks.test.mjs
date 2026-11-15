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

const { comparisonSummary } = load('../src/comparison.ts');
test('comparison summary uses landing, preserves direction and names tradeoffs', () => {
  const baseline = mockForecast(mockDefaults.demo);
  const alternative = structuredClone(baseline);
  const landing = baseline.landing_day;
  alternative.series.hip_bmd_pct[landing] += 2;
  alternative.series.vo2max_pct[landing] -= 3;
  const summary = comparisonSummary({ baseline, alternative });
  assert.match(summary, /keeps more hip bone \(\+2\.0\)/);
  assert.match(summary, /keeps less cardio fitness \(−3\.0\)/);
  assert.match(comparisonSummary({ baseline, alternative: baseline }), /same estimates/);
  const plan = mockDefaults.demo.countermeasures;
  assert.match(comparisonSummary({ baseline, alternative }, plan, { ...plan }), /same as the current one/);
});

const { emptyWorkspace, createFlight, updateFlight, archiveFlight, parseWorkspace } = load('../src/workspace.ts');
test('saved flights keep independent settings through reopening, archive and restore', () => {
  const seed = structuredClone(mockDefaults.demo);
  delete seed.alternative;
  const first = createFlight('Station research', seed);
  const second = createFlight('Second mission', seed);
  let workspace = { ...emptyWorkspace(), astronauts: [seed.crew], flights: [first, second], activeFlightId: first.id };
  workspace = updateFlight(workspace, first.id, { request: { ...first.request, mission: { ...first.request.mission, duration_days: 150 } } });
  workspace = parseWorkspace(JSON.stringify(workspace));
  assert.equal(workspace.flights[0].request.mission.duration_days, 150);
  assert.equal(workspace.flights[1].request.mission.duration_days, 180);
  assert.equal(seed.mission.duration_days, 180);
  workspace = archiveFlight(workspace, first.id, true);
  assert.equal(workspace.activeFlightId, null);
  workspace = archiveFlight(workspace, first.id, false);
  assert.equal(workspace.flights[0].archived, false);
  assert.equal(workspace.flights[0].request.mission.duration_days, 150);
  assert.equal(workspace.flights[0].alternative.protein_g_per_kg, seed.countermeasures.protein_g_per_kg);
});
test('damaged or unsupported saved workspaces are rejected instead of silently replaced', () => {
  assert.throws(() => parseWorkspace('{broken'));
  assert.throws(() => parseWorkspace(JSON.stringify({ ...emptyWorkspace(), version: 99 })));
  assert.throws(() => parseWorkspace(JSON.stringify({ ...emptyWorkspace(), activeFlightId: 'missing' })));
  assert.deepEqual(parseWorkspace(null), emptyWorkspace());
});
