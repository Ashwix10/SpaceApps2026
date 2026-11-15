import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const url = new URL('../src/routineOptimizer.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module = { exports: {} };
new Function('module', 'exports', 'require', compiled.outputText)(module, module.exports, createRequire(url));
const { canonicalOptimizationRequest, buildRoutineCandidates, buildNutritionCandidates, landingObjective, optimizeRoutine } = module.exports;
const routine = { resistance_min_per_day: 60, aerobic_min_per_day: 60, protein_g_per_kg: 1.3, calorie_pct: 95, bisphosphonate: true };
const request = { crew: { id: 'test', mass_kg: 70 }, mission: { destination: 'MOON', duration_days: 7, eva_days: [] }, injury: { type: 'ankle_sprain', severity: 2, day: 3, side: 'left' }, countermeasures: routine };
function response(values, landing = 7) {
  const keys = ['hip_bmd_pct', 'spine_bmd_pct', 'leg_muscle_pct', 'vo2max_pct'];
  return { landing_day: landing, series: Object.fromEntries(keys.map((key, index) => [key, [...Array(landing).fill(100), values[index]]])), meta: { model_version: 'test', params_version: 'test' } };
}

test('manual exercise, nutrition and medication never change the canonical recommendation request', () => {
  const changed = { ...request, countermeasures: { resistance_min_per_day: 0, aerobic_min_per_day: 120, protein_g_per_kg: 2, calorie_pct: 80, bisphosphonate: false } };
  assert.equal(JSON.stringify(canonicalOptimizationRequest(request)), JSON.stringify(canonicalOptimizationRequest(changed)));
  assert.deepEqual(canonicalOptimizationRequest(request).crew, request.crew);
  assert.deepEqual(canonicalOptimizationRequest(request).mission, request.mission);
  assert.deepEqual(canonicalOptimizationRequest(request).injury, request.injury);
  assert.equal(canonicalOptimizationRequest(request).countermeasures.bisphosphonate, false);
  assert.equal(canonicalOptimizationRequest(request, true).countermeasures.bisphosphonate, true);
  const copy = canonicalOptimizationRequest(request);
  copy.mission.eva_days.push(3);
  assert.deepEqual(request.mission.eva_days, []);
});

test('exercise and nutrition candidates respect budgets, model saturation and the explicit medication constraint', () => {
  for (const budget of [0, 30, 60, 90, 120, 150]) {
    const candidates = buildRoutineCandidates(budget);
    assert.ok(candidates.length > 0 && candidates.length <= 35);
    for (const candidate of candidates) {
      assert.ok(candidate.resistance_min_per_day + candidate.aerobic_min_per_day <= budget);
      assert.ok(candidate.resistance_min_per_day <= 90);
      assert.ok(candidate.aerobic_min_per_day <= 60);
      assert.equal(candidate.protein_g_per_kg, 1.6);
      assert.equal(candidate.calorie_pct, 100);
      assert.equal(candidate.bisphosphonate, false);
    }
  }
  const exercise = buildRoutineCandidates(150, true).at(-1);
  const nutrition = buildNutritionCandidates(exercise);
  assert.equal(nutrition.length, 9);
  assert.deepEqual([...new Set(nutrition.map(candidate => candidate.protein_g_per_kg))], [.8, 1.2, 1.6]);
  assert.deepEqual([...new Set(nutrition.map(candidate => candidate.calorie_pct))], [80, 90, 100]);
  for (const candidate of nutrition) {
    assert.equal(candidate.resistance_min_per_day, exercise.resistance_min_per_day);
    assert.equal(candidate.aerobic_min_per_day, exercise.aerobic_min_per_day);
    assert.equal(candidate.bisphosphonate, true);
  }
  assert.throws(() => buildRoutineCandidates(-1));
  assert.throws(() => buildRoutineCandidates(NaN));
});

test('search uses actual landing responses, holds mission fixed, and finishes exercise before nutrition', async () => {
  let inflight = 0;
  let peak = 0;
  const calls = [];
  const stages = [];
  const original = structuredClone(request);
  const run = async candidate => {
    assert.deepEqual(candidate.crew, original.crew);
    assert.deepEqual(candidate.mission, original.mission);
    assert.deepEqual(candidate.injury, original.injury);
    calls.push(candidate.countermeasures);
    peak = Math.max(peak, ++inflight);
    await new Promise(resolve => setTimeout(resolve, 1));
    inflight--;
    const { resistance_min_per_day: strength, aerobic_min_per_day: cardio, protein_g_per_kg: protein, calorie_pct: calories } = candidate.countermeasures;
    return response([80 + strength / 10 + calories / 10, 80 + strength / 10 + calories / 10, 90 + protein * 2, 90 + cardio / 10]);
  };
  const bone = await optimizeRoutine(request, 60, 'bone', run, progress => stages.push(progress.stage));
  assert.equal(bone.best.routine.resistance_min_per_day, 60);
  assert.equal(bone.best.routine.aerobic_min_per_day, 0);
  assert.equal(bone.best.routine.protein_g_per_kg, 1.6);
  assert.equal(bone.best.routine.calorie_pct, 100);
  assert.ok(calls.length <= 43);
  assert.equal(bone.evaluated, calls.length);
  assert.equal(bone.nutritionRanking.length, 9);
  assert.equal(stages.lastIndexOf('exercise') < stages.indexOf('nutrition'), true);
  assert.ok(peak <= 4);
  assert.deepEqual(request, original);
  const cardio = await optimizeRoutine(request, 60, 'cardio', run);
  assert.equal(cardio.best.routine.resistance_min_per_day, 0);
  assert.equal(cardio.best.routine.aerobic_min_per_day, 60);
  assert.equal(cardio.best.routine.calorie_pct, 100, 'cardio ties must not choose an energy deficit that worsens bone outcomes');
  assert.equal(landingObjective(response([90, 94, 98, 86]), 'balanced'), 92);
});

test('manual edits leave the evaluated candidate sequence and selected recommendation unchanged', async () => {
  const evaluatedA = [];
  const evaluatedB = [];
  const run = list => async candidate => { list.push(candidate.countermeasures); return response([95, 95, 95, 95]); };
  const a = await optimizeRoutine(request, 120, 'balanced', run(evaluatedA));
  const b = await optimizeRoutine({ ...request, countermeasures: { ...routine, resistance_min_per_day: 120, aerobic_min_per_day: 0, protein_g_per_kg: .8, calorie_pct: 110, bisphosphonate: false } }, 120, 'balanced', run(evaluatedB));
  assert.deepEqual(evaluatedA, evaluatedB);
  assert.deepEqual(a.best.routine, b.best.routine);
  assert.equal(a.best.routine.calorie_pct, 100);
  assert.equal(a.best.routine.protein_g_per_kg, 1.2);
  assert.equal(a.best.minutes, 0);
});

test('failed, invalid and mixed-version searches never return partial recommendations', async () => {
  await assert.rejects(optimizeRoutine(request, 30, 'bone', async () => { throw new Error('Service unavailable'); }), /unavailable/);
  await assert.rejects(optimizeRoutine(request, 30, 'bone', async () => response([100, 100, 100, 100], 8)), /different landing day/);
  let index = 0;
  await assert.rejects(optimizeRoutine(request, 30, 'bone', async () => ({ ...response([100, 100, 100, 100]), meta: { model_version: `model-${index++}`, params_version: 'test' } })), /model changed/);
  assert.throws(() => landingObjective(response([NaN, 90, 90, 90]), 'balanced'), /no valid landing result/);
});

test('cancellation during flight stops dispatch and suppresses the nutrition stage', async () => {
  const abort = new AbortController();
  let calls = 0;
  const pending = [];
  const task = optimizeRoutine(request, 150, 'balanced', () => { calls++; return new Promise(resolve => pending.push(resolve)); }, undefined, abort.signal);
  assert.equal(calls, 4);
  abort.abort();
  pending.forEach(resolve => resolve(response([100, 100, 100, 100])));
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(calls, 4);
  await assert.rejects(optimizeRoutine(request, 60, 'bone', async () => { calls++; return response([100, 100, 100, 100]); }, undefined, abort.signal), { name: 'AbortError' });
  assert.equal(calls, 4);
});
