import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const url = new URL('../src/workspace.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module = { exports: {} };
new Function('module','exports','require',compiled.outputText)(module,module.exports,createRequire(url));
const { applyFlightRoutine, saveCrewProfile, createFlight, parseWorkspace, updateFlight } = module.exports;
const crew = { id:'crew-a', name:'Test crew', age:40, sex:'F', mass_kg:65, fitness:'high', role:'Engineer', baseline:{ hip_bmd_g_cm2:1.1, spine_bmd_g_cm2:1.2, leg_lean_mass_kg:18, vo2max_ml_kg_min:42 } };
const request = { crew, mission:{ destination:'ISS', duration_days:180, eva_days:[] }, injury:null, countermeasures:{ resistance_min_per_day:60, aerobic_min_per_day:60, protein_g_per_kg:1.2, calorie_pct:100, bisphosphonate:false } };

test('new flights start with recommendations and keep test routines separate from applied values',()=>{
  const flight = createFlight('Routine workflow',request);
  assert.equal(flight.routineMode,'recommended');
  assert.deepEqual(flight.alternative,request.countermeasures);
  let workspace = { version:1, astronauts:[crew], flights:[flight], activeFlightId:flight.id };
  const trial = {...request.countermeasures,resistance_min_per_day:30,protein_g_per_kg:1.6};
  workspace = updateFlight(workspace,flight.id,{alternative:trial});
  assert.deepEqual(workspace.flights[0].request.countermeasures,request.countermeasures);
  workspace = updateFlight(workspace,flight.id,{request:{...request,countermeasures:trial},routineMode:'manual',recommendationMedication:true,recommendationBudget:90,recommendationObjective:'bone'});
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)),workspace);
  assert.deepEqual(workspace.flights[0].request.countermeasures,trial);
  assert.equal(workspace.flights[0].routineMode,'manual');
  assert.equal(workspace.flights[0].recommendationBudget,90);
  assert.equal(workspace.flights[0].recommendationObjective,'bone');
  assert.equal(request.countermeasures.resistance_min_per_day,60);
  const legacy = {...flight}; delete legacy.routineMode; delete legacy.recommendationMedication;
  assert.equal(parseWorkspace(JSON.stringify({...workspace,flights:[legacy]})).flights[0].routineMode,undefined);
});

test('test search preferences never alter applied recommendation preferences',()=>{
  const flight = {...createFlight('Independent search',request),recommendationBudget:120,recommendationObjective:'balanced',recommendationMedication:false,recommendationKey:'applied-inputs'};
  const original = {version:1,astronauts:[crew],flights:[flight],activeFlightId:flight.id};
  const edited = updateFlight(original,flight.id,{testSearch:{budget:60,objective:'cardio',medication:true}});
  const restored = parseWorkspace(JSON.stringify(edited)).flights[0];
  assert.equal(restored.recommendationBudget,120);
  assert.equal(restored.recommendationObjective,'balanced');
  assert.equal(restored.recommendationMedication,false);
  assert.equal(restored.recommendationKey,'applied-inputs');
  assert.deepEqual(restored.request.countermeasures,request.countermeasures);
  assert.deepEqual(restored.testSearch,{budget:60,objective:'cardio',medication:true});
});

test('applying a recommendation initializes an untouched test and manual changes invalidate readiness',()=>{
  const flight = createFlight('Ready',request);
  let workspace = {version:1,astronauts:[crew],flights:[flight],activeFlightId:flight.id};
  const recommendation = {...request.countermeasures,protein_g_per_kg:1.6};
  workspace = applyFlightRoutine(workspace,flight.id,recommendation,'recommended','mission-inputs');
  assert.deepEqual(workspace.flights[0].alternative,recommendation);
  assert.equal(workspace.flights[0].recommendationKey,'mission-inputs');
  assert.equal(applyFlightRoutine(workspace,flight.id,recommendation,'recommended','mission-inputs'),workspace);
  const trial = {...recommendation,aerobic_min_per_day:30};
  workspace = updateFlight(workspace,flight.id,{alternative:trial});
  workspace = applyFlightRoutine(workspace,flight.id,{...recommendation,resistance_min_per_day:90},'recommended','updated-inputs');
  assert.deepEqual(workspace.flights[0].alternative,trial);
  workspace = applyFlightRoutine(workspace,flight.id,trial,'manual');
  assert.equal(workspace.flights[0].recommendationKey,undefined);
  assert.equal(workspace.flights[0].routineMode,'manual');
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)),JSON.parse(JSON.stringify(workspace)));
});

test('profile edits update inherited measurements and preserve flight-specific overrides',()=>{
  const inherited = createFlight('Inherited',request);
  const overridden = createFlight('Override',{ ...request, crew:{ ...crew, mass_kg:72, baseline:{ ...crew.baseline, hip_bmd_g_cm2:.85 } } });
  const original = { version:1, astronauts:[crew], flights:[inherited,overridden], activeFlightId:inherited.id };
  const before = structuredClone(original);
  const edited = { ...crew, name:'Updated crew', mass_kg:70, baseline:{ ...crew.baseline, hip_bmd_g_cm2:1.15, vo2max_ml_kg_min:45 } };
  const result = saveCrewProfile(original,edited);
  assert.equal(result.flights[0].request.crew.mass_kg,70);
  assert.equal(result.flights[0].request.crew.baseline.hip_bmd_g_cm2,1.15);
  assert.equal(result.flights[1].request.crew.mass_kg,72);
  assert.equal(result.flights[1].request.crew.baseline.hip_bmd_g_cm2,.85);
  assert.equal(result.flights[1].request.crew.baseline.vo2max_ml_kg_min,45);
  assert.ok(result.flights.every(f=>f.request.crew.name==='Updated crew'));
  assert.deepEqual(original,before);
  assert.deepEqual(parseWorkspace(JSON.stringify(result)),result);
});

test('adding a profile preserves existing flights and archive state',()=>{
  const flight = { ...createFlight('Archived',request), archived:true };
  const original = { version:1, astronauts:[crew], flights:[flight], activeFlightId:null };
  const result = saveCrewProfile(original,{...crew,id:'crew-b',name:'New crew'});
  assert.equal(result.astronauts.length,2);
  assert.equal(result.flights[0],flight);
  assert.equal(result.activeFlightId,null);
  assert.deepEqual(parseWorkspace(JSON.stringify(result)),result);
});

test('flight overrides survive profile convergence and subsequent divergence',()=>{
  const flight = createFlight('Legacy override',{...request,crew:{...crew,mass_kg:72}});
  let workspace = { version:1, astronauts:[crew], flights:[flight], activeFlightId:flight.id };
  workspace = saveCrewProfile(workspace,{...crew,mass_kg:72});
  workspace = parseWorkspace(JSON.stringify(workspace));
  workspace = saveCrewProfile(workspace,{...crew,mass_kg:75});
  assert.equal(workspace.flights[0].request.crew.mass_kg,72);
  assert.deepEqual(workspace.flights[0].crewOverrides,['mass_kg']);
});

test('editing flight measurements records overrides and changing crew resets them',()=>{
  const secondCrew = {...crew,id:'crew-b',mass_kg:80};
  const flight = createFlight('Flight',request);
  let workspace = { version:1, astronauts:[crew,secondCrew], flights:[flight], activeFlightId:flight.id };
  workspace = updateFlight(workspace,flight.id,{request:{...request,crew:{...crew,baseline:{...crew.baseline,leg_lean_mass_kg:21}}}});
  assert.deepEqual(workspace.flights[0].crewOverrides,['leg_lean_mass_kg']);
  workspace = updateFlight(workspace,flight.id,{request:{...request,crew:secondCrew}});
  assert.deepEqual(workspace.flights[0].crewOverrides,[]);
  workspace = saveCrewProfile(workspace,{...secondCrew,mass_kg:82});
  assert.equal(workspace.flights[0].request.crew.mass_kg,82);
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)),workspace);
});
