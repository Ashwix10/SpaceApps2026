import { BufferAttribute, BufferGeometry, MeshBasicMaterial } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import type { RegionId } from '../types';

type Point = [number, number, number];
type Form = { center: Point; radius: Point; end?: Point; tip?: number; blend: number; cut?: boolean };
const forms: Form[] = [];
function oval(center: Point, radius: Point, blend = 0.035, cut = false) { forms.push({ center, radius, blend, cut }); }
function limb(center: Point, end: Point, radius: number, tip: number, blend = 0.035) {
  forms.push({ center, end, radius: [radius, radius, radius], tip, blend });
}

// Sculpting volumes form one connected surface. These are illustration proportions,
// not a reconstruction from a person's measurements or a clinical anatomy mesh.
oval([0, 2.945, 0], [0.175, 0.215, 0.164]);
oval([0, 2.80, 0.018], [0.137, 0.132, 0.137], 0.045);
oval([0, 2.715, 0.038], [0.09, 0.055, 0.092], 0.028);
limb([0, 2.77, -0.015], [0, 2.48, -0.015], 0.091, 0.105, 0.05);
oval([0, 2.94, 0.148], [0.028, 0.065, 0.045], 0.016);
oval([0, 2.892, 0.187], [0.035, 0.029, 0.048], 0.012);
oval([0, 2.831, 0.139], [0.061, 0.014, 0.019], 0.01);
oval([0, 2.814, 0.147], [0.054, 0.012, 0.016], 0.008);
oval([0, 2.823, 0.153], [0.05, 0.004, 0.013], 0.003, true);
for (const side of [-1, 1]) {
  oval([side * 0.174, 2.93, -0.008], [0.027, 0.052, 0.033], 0.012);
  oval([side * 0.07, 2.97, 0.13], [0.065, 0.023, 0.037], 0.016);
  oval([side * 0.075, 2.943, 0.147], [0.044, 0.014, 0.028], 0.008, true);
}
// Ribcage, abdomen, waist and hips overlap and are smoothly joined.
oval([0, 2.24, -0.015], [0.335, 0.325, 0.19], 0.07);
oval([0, 2.39, -0.025], [0.365, 0.16, 0.16], 0.065);
oval([0, 1.98, 0.015], [0.256, 0.235, 0.162], 0.065);
oval([0, 1.83, 0.012], [0.237, 0.20, 0.153], 0.06);
oval([0, 1.64, -0.01], [0.29, 0.22, 0.182], 0.06);
for (const side of [-1, 1]) {
  limb([side * 0.1, 2.52, -0.025], [side * 0.345, 2.39, -0.025], 0.083, 0.095, 0.05);
  oval([side * 0.142, 2.235, 0.09], [0.169, 0.15, 0.098], 0.05);
  oval([side * 0.14, 1.59, -0.105], [0.16, 0.17, 0.135], 0.055);
  // A relaxed stance: rounded deltoids connect into tapered upper arms and forearms.
  oval([side * 0.387, 2.35, -0.015], [0.132, 0.166, 0.135], 0.04);
  limb([side * 0.407, 2.29, -0.01], [side * 0.498, 1.975, 0.005], 0.108, 0.077, 0.035);
  oval([side * 0.495, 1.974, 0.005], [0.08, 0.085, 0.08], 0.025);
  limb([side * 0.5, 1.966, 0.012], [side * 0.553, 1.52, 0.055], 0.088, 0.048, 0.025);
  oval([side * 0.554, 1.515, 0.057], [0.05, 0.065, 0.045], 0.018);
  oval([side * 0.559, 1.401, 0.059], [0.066, 0.105, 0.035], 0.018);
  limb([side * 0.519, 1.423, 0.071], [side * 0.487, 1.335, 0.105], 0.026, 0.02, 0.014);
  for (let finger = 0; finger < 4; finger++) {
    const x = side * (0.513 + finger * 0.03);
    const endY = [1.23, 1.205, 1.22, 1.25][finger];
    limb([x, 1.345, 0.065], [x + side * 0.005, endY, 0.072], 0.021, 0.016, 0.006);
  }
  // Thighs merge into the pelvis; knees, calves and ankles remain connected.
  limb([side * 0.158, 1.565, -0.007], [side * 0.181, 0.88, 0.018], 0.145, 0.085, 0.045);
  oval([side * 0.18, 0.875, 0.036], [0.09, 0.09, 0.085], 0.022);
  limb([side * 0.182, 0.86, 0.015], [side * 0.177, 0.19, 0.005], 0.083, 0.052, 0.035);
  oval([side * 0.18, 0.54, -0.015], [0.098, 0.23, 0.095], 0.03);
  oval([side * 0.177, 0.20, 0.002], [0.057, 0.09, 0.061], 0.022);
  oval([side * 0.178, 0.088, 0.07], [0.072, 0.075, 0.127], 0.022);
  oval([side * 0.179, 0.069, 0.183], [0.092, 0.055, 0.145], 0.02);
}

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

let cached: BufferGeometry | undefined;
export function humanGeometry(): BufferGeometry {
  if (cached) return cached;
  const resolution = 112;
  const extent = 1.75;
  const centerY = 1.57;
  const material = new MeshBasicMaterial();
  const marching = new MarchingCubes(resolution, material, false, false, 80000);
  marching.isolation = 0;
  marching.field.fill(-1);
  const step = 2 * extent / resolution;
  const grid = (position: number, axis: number) => (position - (axis === 1 ? centerY : 0) + extent) / step;
  // Visit only each sculpting volume's neighborhood, not every shape at every voxel.
  for (const form of forms) {
    const minRadius = Math.min(...form.radius);
    const padding = form.blend * (Math.max(...form.radius) / minRadius) + step * 2;
    const lower = form.center.map((v, axis) => Math.max(1, Math.floor(grid(Math.min(v, form.end?.[axis] ?? v) - form.radius[axis] - padding, axis))));
    const upper = form.center.map((v, axis) => Math.min(resolution - 2, Math.ceil(grid(Math.max(v, form.end?.[axis] ?? v) + form.radius[axis] + padding, axis))));
    const direction = form.end?.map((v, i) => v - form.center[i]);
    const lengthSquared = direction?.reduce((sum, v) => sum + v * v, 0) ?? 1;
    for (let iz = lower[2]; iz <= upper[2]; iz++) for (let iy = lower[1]; iy <= upper[1]; iy++) for (let ix = lower[0]; ix <= upper[0]; ix++) {
      const p = [ix * step - extent - form.center[0], iy * step - extent + centerY - form.center[1], iz * step - extent - form.center[2]];
      let distance: number;
      if (direction) {
        const t = Math.min(1, Math.max(0, p.reduce((sum, v, i) => sum + v * direction[i], 0) / lengthSquared));
        distance = Math.hypot(...p.map((v, i) => v - direction[i] * t)) - (form.radius[0] + ((form.tip ?? form.radius[0]) - form.radius[0]) * t);
      } else distance = (Math.hypot(...p.map((v, i) => v / form.radius[i])) - 1) * minRadius;
      const index = iz * resolution * resolution + iy * resolution + ix;
      const old = marching.field[index];
      const next = -distance;
      if (form.cut) marching.field[index] = Math.min(old, -next);
      else {
        const h = Math.max(form.blend - Math.abs(old - next), 0) / form.blend;
        marching.field[index] = Math.max(old, next) + h * h * form.blend * 0.25;
      }
    }
  }
  marching.update();
  const positions = marching.positionArray.slice(0, marching.count * 3);
  const normals = marching.normalArray.slice(0, marching.count * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= extent; positions[i + 1] = positions[i + 1] * extent + centerY; positions[i + 2] *= extent;
  }
  cached = new BufferGeometry();
  cached.setAttribute('position', new BufferAttribute(positions, 3));
  cached.setAttribute('normal', new BufferAttribute(normals, 3));
  cached.computeBoundingSphere();
  marching.geometry.dispose(); material.dispose();
  return cached;
}
