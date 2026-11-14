import crew from '../../../data/crew_presets.json';
import type { Defaults, ForecastRequest, ForecastResponse, RegionId } from '../types';

export const mockCrew = crew;
export const mockDefaults: Defaults = {
  countermeasures: { resistance_min_per_day: 60, aerobic_min_per_day: 60, protein_g_per_kg: 1.2, calorie_pct: 100, bisphosphonate: false },
  mission: { destination: 'ISS', duration_days: 180, eva_days: [60, 120] },
  demo: {
    crew: crew[0] as Defaults['demo']['crew'],
    mission: { destination: 'ISS', duration_days: 180, eva_days: [60, 120] },
    injury: { type: 'ankle_sprain', severity: 2, day: 40, side: 'left' },
    countermeasures: { resistance_min_per_day: 60, aerobic_min_per_day: 60, protein_g_per_kg: 1.2, calorie_pct: 100, bisphosphonate: false },
    alternative: { resistance_min_per_day: 90, aerobic_min_per_day: 45, protein_g_per_kg: 1.6, calorie_pct: 100, bisphosphonate: true },
  },
};

// Deliberately flat, like the Python stub. This verifies wiring, not physiology.
export function mockForecast(request: ForecastRequest): ForecastResponse {
  const n = request.mission.duration_days + 91;
  const flat = () => Array<number>(n).fill(100);
  const keys = ['hip_bmd_pct', 'spine_bmd_pct', 'leg_muscle_pct', 'vo2max_pct'] as const;
  const ids: RegionId[] = ['head_neck', 'chest', 'heart', 'spine', 'pelvis', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
  const risk = () => ({ level: 'green' as const, score: 0, reason: 'Mock stub: no physiological model is running.' });
  const events: ForecastResponse['events'] = [{ day: 0, type: 'launch', label: 'Launch' },
    ...request.mission.eva_days.map(day => ({ day, type: 'eva' as const, label: 'Spacewalk' })),
    { day: request.mission.duration_days, type: 'landing', label: 'Landing' }];
  if (request.injury) events.push({ day: request.injury.day, type: 'injury', label: request.injury.type.replaceAll('_', ' ') });
  return {
    days: Array.from({ length: n }, (_, i) => i), landing_day: request.mission.duration_days,
    series: Object.fromEntries(keys.map(k => [k, flat()])) as ForecastResponse['series'],
    bands: Object.fromEntries(keys.map(k => [k, { low: flat(), high: flat() }])) as ForecastResponse['bands'],
    regions: Object.fromEntries(ids.map(k => [k, Array<number>(n).fill(1)])) as ForecastResponse['regions'],
    risks: { fracture: risk(), eva_fitness: risk(), landing_fitness: risk() },
    events: events.sort((a, b) => a.day - b.day), meta: { model_version: '0.0-mock', params_version: '0.1-placeholder' },
  };
}
