import type { CrewProfile, RegionId, SeriesKey } from '../types';

export const regionNames: Record<RegionId, string> = {
  head_neck: 'Head & neck', chest: 'Chest & lungs', heart: 'Heart', spine: 'Lumbar spine',
  pelvis: 'Hip bones', left_arm: 'Left arm', right_arm: 'Right arm', left_leg: 'Left leg', right_leg: 'Right leg',
};

export const systemColors = { hip: '#E8BB72', spine: '#84A9FF', muscle: '#67D8D0', cardio: '#F28E87', neutral: '#A4B7C4' } as const;

export const regionColors: Record<RegionId, string> = {
  head_neck: systemColors.neutral, chest: systemColors.cardio, heart: systemColors.cardio,
  spine: systemColors.spine, pelvis: systemColors.hip,
  left_arm: systemColors.muscle, right_arm: systemColors.muscle,
  left_leg: systemColors.muscle, right_leg: systemColors.muscle,
};

export const metricInfo: Record<SeriesKey, {
  label: string; short: string; color: string; unit: string; precision: number;
  baseline: keyof CrewProfile['baseline']; region: RegionId;
}> = {
  hip_bmd_pct: { label: 'Total hip bone density', short: 'Hip BMD', color: systemColors.hip, unit: 'g/cm²', precision: 3, baseline: 'hip_bmd_g_cm2', region: 'pelvis' },
  spine_bmd_pct: { label: 'Lumbar spine bone density', short: 'Spine BMD', color: systemColors.spine, unit: 'g/cm²', precision: 3, baseline: 'spine_bmd_g_cm2', region: 'spine' },
  leg_muscle_pct: { label: 'Leg lean tissue', short: 'Leg lean tissue', color: systemColors.muscle, unit: 'kg', precision: 2, baseline: 'leg_lean_mass_kg', region: 'left_leg' },
  vo2max_pct: { label: 'Peak aerobic capacity', short: 'VO₂peak', color: systemColors.cardio, unit: 'mL/kg/min', precision: 1, baseline: 'vo2max_ml_kg_min', region: 'heart' },
};

export const regionMetrics: Partial<Record<RegionId, SeriesKey[]>> = {
  pelvis: ['hip_bmd_pct'], spine: ['spine_bmd_pct'],
  left_leg: ['leg_muscle_pct', 'hip_bmd_pct'], right_leg: ['leg_muscle_pct', 'hip_bmd_pct'],
  heart: ['vo2max_pct'], chest: ['vo2max_pct'],
};

export function signedChange(percentOfBaseline: number, digits = 1) {
  const delta = percentOfBaseline - 100;
  if (Math.abs(delta) < 0.5 * 10 ** -digits) return `${(0).toFixed(digits)}%`;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(digits)}%`;
}

export function baselineDescription(percentOfBaseline: number) {
  const delta = percentOfBaseline - 100;
  return Math.abs(delta) < 0.05 ? 'At preflight baseline' : `${Math.abs(delta).toFixed(1)}% ${delta > 0 ? 'above' : 'below'} preflight`;
}
