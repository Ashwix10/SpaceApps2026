import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

async function load(relative) {
  const url = new URL(relative, import.meta.url);
  const bundle = await build({ entryPoints: [fileURLToPath(url)], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, logLevel: 'silent' });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(module, module.exports, createRequire(url));
  return module.exports;
}

const [{ applyMissionDestination, applyMissionDuration, missionPresets }, { activeInjuryAtDay }, { BodyTwin }, { changeAxis }] = await Promise.all([
  load('../src/MissionSettings.tsx'), load('../src/body/injury.ts'), load('../src/body/BodyTwin.tsx'), load('../src/ForecastCharts.tsx'),
]);
const fixture = JSON.parse(readFileSync(new URL('../../data/fixtures/forecast_example.json', import.meta.url), 'utf8'));
const crew = JSON.parse(readFileSync(new URL('../../data/crew_presets.json', import.meta.url), 'utf8'))[0];
const request = {
  crew, mission: { destination: 'ISS', duration_days: 180, eva_days: [0, 15, 90, 170] },
  injury: { type: 'ankle_sprain', severity: 2, day: 40, side: 'left' },
  countermeasures: { resistance_min_per_day: 60, aerobic_min_per_day: 60, protein_g_per_kg: 1.2, calorie_pct: 100, bisphosphonate: false },
};

test('destination changes apply explicit defaults and keep events within the new mission', () => {
  const original = structuredClone(request);
  const lunar = applyMissionDestination(request, 'MOON');
  assert.equal(lunar.mission.duration_days, 30);
  assert.deepEqual(lunar.mission.eva_days, [0, 15]);
  assert.equal(lunar.injury.day, 30);
  assert.deepEqual(lunar.crew, request.crew);
  assert.deepEqual(lunar.countermeasures, request.countermeasures);
  assert.equal(applyMissionDestination(lunar, 'MARS').mission.duration_days, 210);
  assert.equal(applyMissionDestination(lunar, 'ISS').mission.duration_days, 180);
  assert.deepEqual(request, original);
});

test('manual duration survives selecting the same destination; explicit presets can override it', () => {
  const manual = applyMissionDuration(request, 77);
  assert.strictEqual(applyMissionDestination(manual, 'ISS'), manual);
  const visit = missionPresets.find(preset => preset.id === 'iss-visit');
  const result = applyMissionDuration(manual, visit.days, visit.destination);
  assert.equal(result.mission.duration_days, 14);
  assert.deepEqual(result.mission.eva_days, [0]);
  assert.equal(result.injury.day, 14);
  assert.deepEqual(missionPresets.map(preset => preset.days), [14, 180, 30, 210]);
});

test('active injury timing includes onset, excludes disabled/future/healed scenarios and crosses landing', () => {
  assert.equal(activeInjuryAtDay(null, 180, 40), null);
  assert.equal(activeInjuryAtDay(request.injury, undefined, 40), null);
  assert.equal(activeInjuryAtDay(request.injury, 180, 39), null);
  assert.equal(activeInjuryAtDay(request.injury, 180, 40).region, 'left_leg');
  for (const [type, lastActiveDay] of [['ankle_sprain', 67], ['wrist_fracture', 98], ['lower_back_strain', 65], ['thigh_muscle_tear', 76]]) {
    const injury = { ...request.injury, type, side: type === 'lower_back_strain' ? null : 'right' };
    assert.ok(activeInjuryAtDay(injury, 180, lastActiveDay), `${type} remains active before healing completes`);
    assert.equal(activeInjuryAtDay(injury, 180, lastActiveDay + 1), null, `${type} marker ends with the modeled active interval`);
  }
  assert.ok(activeInjuryAtDay(request.injury, 45, 62));
  assert.equal(activeInjuryAtDay(request.injury, 45, 63), null);
});

test('rendered anatomy shows injury rings only during an enabled active scenario', () => {
  const props = { regions: fixture.regions, series: fixture.series, baseline: crew.baseline, injuredRegion: 'left_leg', landingDay: 180 };
  const render = (day, injury) => renderToStaticMarkup(React.createElement(BodyTwin, { ...props, day, injury }));
  assert.ok(!render(40, null).includes('anatomy-injury-ring'));
  assert.ok(!render(39, request.injury).includes('anatomy-injury-ring'));
  assert.ok(render(40, request.injury).includes('anatomy-injury-ring'));
  assert.ok(render(40, request.injury).includes('Active · onset day 40'));
  assert.ok(!render(68, request.injury).includes('anatomy-injury-ring'));
});

test('forecast axes include sensitivity bands and retain exact baseline and clean tick intervals', () => {
  assert.deepEqual(changeAxis(-2.2, 0), { domain: [-3, 0], ticks: [-3, -2, -1, 0] });
  assert.deepEqual(changeAxis(-.64, 0), { domain: [-.8, 0], ticks: [-.8, -.6, -.4, -.2, 0] });
  assert.deepEqual(changeAxis(-2.2, 2.3), { domain: [-4, 4], ticks: [-4, -2, 0, 2, 4] });
  for (const key of Object.keys(fixture.series)) {
    const low = Math.min(...fixture.bands[key].low) - 100;
    const high = Math.max(...fixture.bands[key].high) - 100;
    const axis = changeAxis(low, high);
    assert.ok(axis.domain[0] <= low + 1e-9 && axis.domain[1] >= high - 1e-9);
    assert.ok(axis.ticks.includes(0));
    if (high <= 0) assert.equal(axis.domain[1], 0);
  }
});
