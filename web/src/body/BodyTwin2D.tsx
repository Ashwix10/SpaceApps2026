import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';

const shapes: { id: RegionId; path: string }[] = [
  { id: 'head_neck', path: 'M88 59 L88 50 C77 40 80 14 91 10 C114 3 126 30 112 50 L112 59 L122 66 L78 66 Z' },
  { id: 'chest', path: 'M78 62 Q65 65 65 79 L74 110 L77 139 L123 139 L126 110 L135 79 Q135 65 122 62 L111 65 L89 65 Z' },
  { id: 'pelvis', path: 'M77 137 L123 137 Q130 150 125 171 L103 181 L100 168 L97 181 L75 171 Q70 150 77 137 Z' },
  { id: 'right_arm', path: 'M66 67 Q56 70 54 86 L48 116 L44 150 L40 166 Q39 175 45 179 Q52 181 54 170 L54 158 L59 125 L67 103 L73 78 Z' },
  { id: 'left_arm', path: 'M134 67 Q144 70 146 86 L152 116 L156 150 L160 166 Q161 175 155 179 Q148 181 146 170 L146 158 L141 125 L133 103 L127 78 Z' },
  { id: 'right_leg', path: 'M75 167 L98 168 L97 217 Q99 229 96 240 L92 281 L94 294 Q96 302 87 303 L74 303 Q69 301 74 293 L79 282 L76 246 Q70 231 73 217 Z' },
  { id: 'left_leg', path: 'M102 168 L125 167 L127 217 Q130 231 124 246 L121 282 L126 293 Q131 301 126 303 L113 303 Q104 302 106 294 L108 281 L104 240 Q101 229 103 217 Z' },
  { id: 'spine', path: 'M97 77 L103 77 L104 138 L96 138 Z' },
  { id: 'heart', path: 'M107 85 C116 80 123 92 109 103 C96 96 98 82 107 85 Z' },
];
const label = (id: RegionId) => id === 'pelvis' ? 'Hips' : id === 'spine' ? 'Back' : id.replaceAll('_', ' ');

export function BodyTwin2D({ regions, day, compareRegions, selectedRegion, injuredRegion, onRegionSelect, height = 520 }: BodyTwinProps) {
  return <div className="twin-2d" style={{ height }}>
    {(compareRegions ? [regions, compareRegions] : [regions]).map((data, index) => <svg key={index} viewBox="0 0 200 320" role="group" aria-label={`${index ? 'New' : 'Current'} routine body outline`}>
      {shapes.map(shape => <path key={shape.id} d={shape.path} role="button" tabIndex={0}
        aria-label={`${label(shape.id)}, change index ${Math.round((data[shape.id]?.[day] ?? 1) * 100)} out of 100`}
        aria-pressed={selectedRegion === shape.id}
        fill={healthColor(data[shape.id]?.[day] ?? 1)}
        stroke={selectedRegion === shape.id ? '#FFFFFF' : injuredRegion === shape.id ? '#B87575' : '#646468'}
        strokeWidth={selectedRegion === shape.id || injuredRegion === shape.id ? 2 : 0.5}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRegionSelect?.(selectedRegion === shape.id ? null : shape.id); } }}
        onClick={() => onRegionSelect?.(selectedRegion === shape.id ? null : shape.id)}>
        <title>{label(shape.id)}</title>
      </path>)}
      <ellipse cx="100" cy="310" rx="53" ry="4" stroke="#8A8A8D" strokeOpacity="0.3" fill="none" />
    </svg>)}
  </div>;
}
