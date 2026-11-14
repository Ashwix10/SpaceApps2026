import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';

// Person 4's kickoff placeholder. Person 3 replaces this with the 3D body.
export function BodyTwin({ regions, day, compareRegions, injuredRegion, selectedRegion, onRegionSelect, height = 520 }: BodyTwinProps) {
  const ids: RegionId[] = ['head_neck', 'chest', 'heart', 'spine', 'pelvis', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
  return <div className="body-placeholder" style={{ minHeight: height }}>
    <span className="eyebrow">BODY TWIN · INTEGRATION VIEW</span>
    <h2>Nine regions. One shared forecast.</h2>
    <p>Region overview · 3D visualization is the next workstream.</p>
    <div className="regions">{ids.map(id => <button key={id} aria-pressed={selectedRegion === id}
      onClick={() => onRegionSelect?.(selectedRegion === id ? null : id)}
      style={{ borderColor: healthColor(regions[id][day] ?? 1) }}>
      <span>{id.replaceAll('_', ' ')}{injuredRegion === id ? ' · injury' : ''}</span>
      <strong>{((regions[id][day] ?? 1) * 100).toFixed(0)}%{compareRegions ? ` → ${((compareRegions[id][day] ?? 1) * 100).toFixed(0)}%` : ''}</strong>
    </button>)}</div>
    <small>Region health relative to preflight baseline</small>
  </div>;
}
