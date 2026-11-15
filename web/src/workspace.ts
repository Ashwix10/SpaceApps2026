import type { Countermeasures, CrewProfile, ForecastRequest } from './types';
import type { RoutineObjective } from './routineOptimizer';

export const WORKSPACE_KEY = 'astrotwin.workspace.v1';
const crewFields = ['age', 'sex', 'mass_kg', 'fitness', 'hip_bmd_g_cm2', 'spine_bmd_g_cm2', 'leg_lean_mass_kg', 'vo2max_ml_kg_min'] as const;
type CrewOverride = typeof crewFields[number];
export type RoutineMode = 'recommended' | 'manual';
export interface RecommendationSettings { budget: number; objective: RoutineObjective; medication: boolean }
export interface Flight { id: string; name: string; createdAt: string; updatedAt: string; archived: boolean; request: ForecastRequest; alternative: Countermeasures; crewOverrides?: CrewOverride[]; routineMode?: RoutineMode; recommendationMedication?: boolean; recommendationBudget?: number; recommendationObjective?: RoutineObjective; recommendationKey?: string; testSearch?: RecommendationSettings }
export interface Workspace { version: 1; astronauts: CrewProfile[]; flights: Flight[]; activeFlightId: string | null }
export const emptyWorkspace = (): Workspace => ({ version: 1, astronauts: [], flights: [], activeFlightId: null });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const bounded = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function validCrew(v: unknown): v is CrewProfile {
  return record(v) && text(v.id) && text(v.name) && typeof v.role === 'string' && Number.isInteger(v.age) && ['M','F'].includes(String(v.sex)) && bounded(v.mass_kg, 1, 500) && ['low','average','high'].includes(String(v.fitness)) && record(v.baseline) && ['hip_bmd_g_cm2','spine_bmd_g_cm2','leg_lean_mass_kg','vo2max_ml_kg_min'].every(k => bounded((v.baseline as Record<string, unknown>)[k], 0.001, 1000));
}
function validRoutine(v: unknown): v is Countermeasures {
  return record(v) && bounded(v.resistance_min_per_day,0,120) && bounded(v.aerobic_min_per_day,0,120) && bounded(v.protein_g_per_kg,.8,2) && bounded(v.calorie_pct,80,110) && typeof v.bisphosphonate === 'boolean';
}
function validRequest(v: unknown): v is ForecastRequest {
  if (!record(v) || !validCrew(v.crew) || !validRoutine(v.countermeasures) || !record(v.mission)) return false;
  const m = v.mission;
  if (!['ISS','MOON','MARS'].includes(String(m.destination)) || !Number.isInteger(m.duration_days) || !bounded(m.duration_days,7,900) || !Array.isArray(m.eva_days) || !m.eva_days.every(day => Number.isInteger(day) && bounded(day,0,m.duration_days as number))) return false;
  if (v.injury === null) return true;
  return record(v.injury) && ['ankle_sprain','wrist_fracture','lower_back_strain','thigh_muscle_tear'].includes(String(v.injury.type)) && [1,2,3].includes(Number(v.injury.severity)) && Number.isInteger(v.injury.day) && bounded(v.injury.day,0,m.duration_days) && (v.injury.type === 'lower_back_strain' ? v.injury.side === null : ['left','right'].includes(String(v.injury.side)));
}
export function parseWorkspace(raw: string | null): Workspace {
  if (raw === null) return emptyWorkspace();
  const v: unknown = JSON.parse(raw);
  if (!record(v) || v.version !== 1 || !Array.isArray(v.astronauts) || !v.astronauts.every(validCrew) || !Array.isArray(v.flights)) throw new Error('Unrecognized workspace');
  for (const f of v.flights) {
    if (record(f) && ((f.recommendationKey !== undefined && typeof f.recommendationKey !== 'string') || (f.testSearch !== undefined && (!record(f.testSearch) || typeof f.testSearch.budget !== 'number' || ![30,60,90,120,150].includes(f.testSearch.budget) || !['balanced','bone','cardio','lean'].includes(String(f.testSearch.objective)) || typeof f.testSearch.medication !== 'boolean')))) throw new Error('Invalid recommendation state');
    if (record(f) && ((f.routineMode !== undefined && !['recommended','manual'].includes(String(f.routineMode))) || (f.recommendationMedication !== undefined && typeof f.recommendationMedication !== 'boolean'))) throw new Error('Invalid routine settings');
    if (record(f) && ((f.recommendationBudget !== undefined && (typeof f.recommendationBudget !== 'number' || ![30,60,90,120,150].includes(f.recommendationBudget))) || (f.recommendationObjective !== undefined && !['balanced','bone','cardio','lean'].includes(String(f.recommendationObjective))))) throw new Error('Invalid recommendation settings');
    if (!record(f) || !text(f.id) || !text(f.name) || !text(f.createdAt) || !Number.isFinite(Date.parse(f.createdAt)) || !text(f.updatedAt) || !Number.isFinite(Date.parse(f.updatedAt)) || typeof f.archived !== 'boolean' || !validRequest(f.request) || !validRoutine(f.alternative) || (f.crewOverrides !== undefined && (!Array.isArray(f.crewOverrides) || !f.crewOverrides.every(key => crewFields.includes(key as CrewOverride))))) throw new Error('Invalid saved flight');
  }
  const result = v as unknown as Workspace;
  const crewIds = new Set(result.astronauts.map(c=>c.id));
  const flightIds = new Set(result.flights.map(f=>f.id));
  if (crewIds.size !== result.astronauts.length || flightIds.size !== result.flights.length || result.flights.some(f=>!crewIds.has(f.request.crew.id)) || !(result.activeFlightId === null || (typeof result.activeFlightId === 'string' && result.flights.some(f=>f.id === result.activeFlightId && !f.archived)))) throw new Error('Invalid workspace links');
  return result;
}
export function createFlight(name: string, request: ForecastRequest, now = new Date().toISOString()): Flight {
  return { id: crypto.randomUUID(), name: name.trim().slice(0,80) || 'Untitled flight', createdAt: now, updatedAt: now, archived: false, request: structuredClone(request), alternative: { ...request.countermeasures }, routineMode: 'recommended', recommendationMedication: false };
}
export function updateFlight(workspace: Workspace, id: string, change: Partial<Pick<Flight,'name'|'request'|'alternative'|'routineMode'|'recommendationMedication'|'recommendationBudget'|'recommendationObjective'|'recommendationKey'|'testSearch'>>): Workspace {
  return { ...workspace, flights: workspace.flights.map(f=>{
    if (f.id !== id) return f;
    let overrides = f.crewOverrides;
    if (change.request) {
      if (change.request.crew.id !== f.request.crew.id) overrides = [];
      else {
        const inherited = workspace.astronauts.find(person => person.id === f.request.crew.id);
        const fields = new Set<CrewOverride>(overrides ?? (inherited ? changedCrewFields(inherited, f.request.crew) : []));
        changedCrewFields(f.request.crew, change.request.crew).forEach(key => fields.add(key));
        overrides = [...fields];
      }
    }
    return { ...f, ...change, ...(overrides ? { crewOverrides: overrides } : {}), updatedAt:new Date().toISOString() };
  }) };
}
function crewValue(crew: CrewProfile, key: CrewOverride) {
  return key in crew.baseline ? crew.baseline[key as keyof CrewProfile['baseline']] : crew[key as 'age'|'sex'|'mass_kg'|'fitness'];
}
/** Apply a routine without changing an independently edited comparison. */
export function applyFlightRoutine(workspace: Workspace, id: string, routine: Countermeasures, mode: RoutineMode, recommendationKey?: string): Workspace {
  const flight = workspace.flights.find(item => item.id === id);
  if (!flight) return workspace;
  const matches = (a: Countermeasures, b: Countermeasures) => (Object.keys(a) as (keyof Countermeasures)[]).every(key => a[key] === b[key]);
  const key = mode === 'recommended' ? recommendationKey : undefined;
  if (flight.routineMode === mode && matches(flight.request.countermeasures,routine) && flight.recommendationKey === key) return workspace;
  const inheritTest = mode === 'recommended' && matches(flight.alternative,flight.request.countermeasures);
  return updateFlight(workspace,id,{request:{...flight.request,countermeasures:{...routine}},routineMode:mode,recommendationKey:key,...(inheritTest ? {alternative:{...routine}} : {})});
}
function changedCrewFields(before: CrewProfile, after: CrewProfile): CrewOverride[] {
  return crewFields.filter(key => crewValue(before,key) !== crewValue(after,key));
}
/** Update inherited profile values without discarding measurements overridden for a flight. */
export function saveCrewProfile(workspace: Workspace, profile: CrewProfile): Workspace {
  const previous = workspace.astronauts.find(person => person.id === profile.id);
  return {
    ...workspace,
    astronauts: previous ? workspace.astronauts.map(person => person.id === profile.id ? profile : person) : [...workspace.astronauts, profile],
    flights: workspace.flights.map(flight => {
      if (!previous || flight.request.crew.id !== profile.id) return flight;
      const current = flight.request.crew;
      const overrides = new Set<CrewOverride>(flight.crewOverrides ?? changedCrewFields(previous,current));
      const baseline = { ...current.baseline };
      for (const key of Object.keys(baseline) as (keyof CrewProfile['baseline'])[]) {
        if (!overrides.has(key)) baseline[key] = profile.baseline[key];
      }
      const crew: CrewProfile = {
        ...current, name: profile.name, role: profile.role, baseline,
        age: !overrides.has('age') ? profile.age : current.age,
        mass_kg: !overrides.has('mass_kg') ? profile.mass_kg : current.mass_kg,
        sex: !overrides.has('sex') ? profile.sex : current.sex,
        fitness: !overrides.has('fitness') ? profile.fitness : current.fitness,
      };
      return { ...flight, request: { ...flight.request, crew }, crewOverrides: [...overrides], updatedAt: new Date().toISOString() };
    }),
  };
}
export function archiveFlight(workspace: Workspace, id: string, archived: boolean): Workspace {
  return { ...workspace, activeFlightId: archived && workspace.activeFlightId === id ? null : workspace.activeFlightId,
    flights: workspace.flights.map(f=>f.id === id ? { ...f, archived, updatedAt:new Date().toISOString() } : f) };
}
