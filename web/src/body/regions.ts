import type { RegionId } from '../types';

export const surfaceRegions: RegionId[] = ['head_neck', 'chest', 'heart', 'spine', 'pelvis', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
export function regionAt(x: number, y: number, z: number): RegionId {
  if (y > 2.57) return 'head_neck';
  if (Math.abs(x) > 0.345 && y > 1.16) return x > 0 ? 'left_arm' : 'right_arm';
  if (y < 1.53) return x > 0 ? 'left_leg' : 'right_leg';
  if (y < 1.79) return 'pelvis';
  if (z < -0.11 && Math.abs(x) < 0.085 && y < 2.46) return 'spine';
  if (z > 0.13 && ((x - 0.12) / 0.065) ** 2 + ((y - 2.22) / 0.095) ** 2 < 1) return 'heart';
  return 'chest';
}
