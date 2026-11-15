import type { CompareResponse, SeriesKey } from './types';

const names: Record<SeriesKey, string> = {
  hip_bmd_pct: 'hip bone density', spine_bmd_pct: 'back bone density',
  leg_muscle_pct: 'leg lean tissue', vo2max_pct: 'cardio fitness',
};

export function comparisonSummary(comparison: CompareResponse): string {
  const day = comparison.baseline.landing_day;
  const differences = (Object.keys(names) as SeriesKey[]).map(key => ({ key,
    delta: comparison.alternative.series[key][day] - comparison.baseline.series[key][day] }));
  const strongest = differences.reduce((a, b) => Math.abs(a.delta) >= Math.abs(b.delta) ? a : b);
  if (Math.abs(strongest.delta) < 0.1) return 'At landing, these routines give similar estimates in this model.';
  const mixed = differences.some(item => item.delta >= 0.1) && differences.some(item => item.delta <= -0.1);
  return `At landing, the largest modeled difference is ${names[strongest.key]}: ${Math.abs(strongest.delta).toFixed(1)} points ${strongest.delta > 0 ? 'higher' : 'lower'} with the new routine.${mixed ? ' Other measures move in the opposite direction.' : ''}`;
}
