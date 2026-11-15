import params from '../../../data/params.json';
import injuries from '../../../data/injuries.json';
import type { Injury, RegionId } from '../types';

export type ActiveInjury = Injury & { region: RegionId; label: string };

/** Mirror the existing model's active interval; this is scenario timing, not a clinical recovery estimate. */
export function activeInjuryAtDay(injury: Injury | null | undefined, landingDay: number | undefined, day: number): ActiveInjury | null {
  if (!injury || landingDay === undefined || day < injury.day) return null;
  const setting = params.injury[injury.type];
  const healingDays = setting.healing_days[injury.severity - 1];
  let healing = 0;
  for (let current = injury.day + 1; current <= day && healing < 1; current++) {
    healing = Math.min(1, healing + 1 / (healingDays * (current <= landingDay ? setting.microgravity_slowdown : 1)));
  }
  if (healing >= 1) return null;
  const region: RegionId = injury.type === 'lower_back_strain' ? 'spine' : `${injury.side ?? 'left'}_${injury.type === 'wrist_fracture' ? 'arm' : 'leg'}`;
  return { ...injury, region, label: injuries.find(item => item.type === injury.type)?.label ?? injury.type.replaceAll('_', ' ') };
}

export function injuryPoint2D(injury: ActiveInjury) {
  const left = injury.side === 'left';
  if (injury.type === 'ankle_sprain') return { x: left ? 119 : 81, y: 380 };
  if (injury.type === 'wrist_fracture') return { x: left ? 170 : 30, y: 179 };
  if (injury.type === 'thigh_muscle_tear') return { x: left ? 121 : 79, y: 252 };
  return { x: 100, y: 151 };
}
