import type { Countermeasures, CrewProfile, ForecastRequest } from './types';

export const WORKSPACE_KEY = 'astrotwin.workspace.v1';
export interface Flight { id: string; name: string; createdAt: string; updatedAt: string; archived: boolean; request: ForecastRequest; alternative: Countermeasures }
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
    if (!record(f) || !text(f.id) || !text(f.name) || !text(f.createdAt) || !Number.isFinite(Date.parse(f.createdAt)) || !text(f.updatedAt) || !Number.isFinite(Date.parse(f.updatedAt)) || typeof f.archived !== 'boolean' || !validRequest(f.request) || !validRoutine(f.alternative)) throw new Error('Invalid saved flight');
  }
  const result = v as unknown as Workspace;
  const crewIds = new Set(result.astronauts.map(c=>c.id));
  const flightIds = new Set(result.flights.map(f=>f.id));
  if (crewIds.size !== result.astronauts.length || flightIds.size !== result.flights.length || result.flights.some(f=>!crewIds.has(f.request.crew.id)) || !(result.activeFlightId === null || (typeof result.activeFlightId === 'string' && result.flights.some(f=>f.id === result.activeFlightId && !f.archived)))) throw new Error('Invalid workspace links');
  return result;
}
export function createFlight(name: string, request: ForecastRequest, now = new Date().toISOString()): Flight {
  return { id: crypto.randomUUID(), name: name.trim().slice(0,80) || 'Untitled flight', createdAt: now, updatedAt: now, archived: false, request: structuredClone(request), alternative: { ...request.countermeasures, resistance_min_per_day:30, aerobic_min_per_day:30 } };
}
export function updateFlight(workspace: Workspace, id: string, change: Partial<Pick<Flight,'name'|'request'|'alternative'>>): Workspace {
  return { ...workspace, flights: workspace.flights.map(f=>f.id === id ? { ...f, ...change, updatedAt:new Date().toISOString() } : f) };
}
export function archiveFlight(workspace: Workspace, id: string, archived: boolean): Workspace {
  return { ...workspace, activeFlightId: archived && workspace.activeFlightId === id ? null : workspace.activeFlightId,
    flights: workspace.flights.map(f=>f.id === id ? { ...f, archived, updatedAt:new Date().toISOString() } : f) };
}
