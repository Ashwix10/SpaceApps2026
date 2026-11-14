import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';

const shapes: { id: RegionId; x: number; y: number; rx: number; ry: number }[] = [
  { id: 'head_neck', x: 100, y: 40, rx: 19, ry: 25 },
  { id: 'chest', x: 100, y: 110, rx: 33, ry: 43 },
  { id: 'pelvis', x: 100, y: 166, rx: 28, ry: 20 },
  { id: 'left_arm', x: 148, y: 125, rx: 11, ry: 51 }, { id: 'right_arm', x: 52, y: 125, rx: 11, ry: 51 },
  { id: 'left_leg', x: 118, y: 235, rx: 14, ry: 61 }, { id: 'right_leg', x: 82, y: 235, rx: 14, ry: 61 },
  { id: 'spine', x: 100, y: 120, rx: 4, ry: 34 }, { id: 'heart', x: 109, y: 105, rx: 7, ry: 9 },
];

export function BodyTwin2D({ regions, day, compareRegions, selectedRegion, injuredRegion, onRegionSelect, height = 520 }: BodyTwinProps) {
  return <div className="twin-2d" style={{ height }}>
    {(compareRegions ? [regions, compareRegions] : [regions]).map((data, index) => <svg key={index} viewBox="0 0 200 320" role="group" aria-label={`${index ? 'New' : 'Current'} plan body outline`}>
      {shapes.map(shape => <ellipse key={shape.id} cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry}
        fill={healthColor(data[shape.id]?.[day] ?? 1)} fillOpacity={shape.id === 'chest' ? 0.45 : 0.8}
        stroke={selectedRegion === shape.id ? '#FFFFFF' : injuredRegion === shape.id ? '#EF4444' : '#4FD1FF'}
        strokeWidth={selectedRegion === shape.id || injuredRegion === shape.id ? 3 : 0.7}
        onClick={() => onRegionSelect?.(selectedRegion === shape.id ? null : shape.id)}>
        <title>{shape.id.replaceAll('_', ' ')}: {Math.round((data[shape.id]?.[day] ?? 1) * 100)}%</title>
      </ellipse>)}
      <ellipse cx="100" cy="307" rx="65" ry="7" stroke="#4FD1FF" strokeOpacity="0.3" fill="none" />
    </svg>)}
  </div>;
}
