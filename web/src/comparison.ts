import type { CompareResponse, Countermeasures, SeriesKey } from './types';

const names: Record<SeriesKey, string> = {
  hip_bmd_pct: 'hip bone', spine_bmd_pct: 'back bone',
  leg_muscle_pct: 'leg lean tissue', vo2max_pct: 'cardio fitness',
};
/** Differences smaller than this (percentage points) round to zero at one decimal and are reported as unchanged. */
export const SAME = 0.05;

export type Delta = { key: SeriesKey; delta: number; direction: 'up' | 'down' | 'same' };

/** New-routine minus current-routine value at landing, per measure. Positive means the new routine keeps more. */
export function landingDeltas(comparison: CompareResponse): Delta[] {
  const day = comparison.baseline.landing_day;
  return (Object.keys(names) as SeriesKey[]).map(key => {
    const delta = comparison.alternative.series[key][day] - comparison.baseline.series[key][day];
    return { key, delta, direction: delta > SAME ? 'up' : delta < -SAME ? 'down' : 'same' };
  });
}

export function sameRoutine(a: Countermeasures, b: Countermeasures): boolean {
  return a.resistance_min_per_day === b.resistance_min_per_day && a.aerobic_min_per_day === b.aerobic_min_per_day
    && a.protein_g_per_kg === b.protein_g_per_kg && a.calorie_pct === b.calorie_pct && a.bisphosphonate === b.bisphosphonate;
}

const list = (items: Delta[]) => {
  const parts = items.map(d => `${names[d.key]} (${d.delta > 0 ? '+' : '−'}${Math.abs(d.delta).toFixed(1)})`);
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
};

export function comparisonSummary(comparison: CompareResponse, current?: Countermeasures, next?: Countermeasures): string {
  if (current && next && sameRoutine(current, next)) return 'The new routine is the same as the current one. Pick a different routine to compare.';
  const deltas = landingDeltas(comparison);
  const up = deltas.filter(d => d.direction === 'up').sort((a, b) => b.delta - a.delta);
  const down = deltas.filter(d => d.direction === 'down').sort((a, b) => a.delta - b.delta);
  if (!up.length && !down.length) return 'At landing, both routines give the same estimates to one decimal place.';
  const better = up.length ? `keeps more ${list(up)}` : '';
  const worse = down.length ? `keeps less ${list(down)}` : '';
  return `At landing, the new routine ${[better, worse].filter(Boolean).join(', but ')} points than the current one.`;
}
