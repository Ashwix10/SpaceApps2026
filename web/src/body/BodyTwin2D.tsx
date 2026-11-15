import { useId, useState } from 'react';
import type { BodyTwinProps, RegionId } from '../types';
import { regionColors, regionNames, systemColors } from './metrics';
import { injuryPoint2D } from './injury';
import type { ActiveInjury } from './injury';
import './body.css';

const shapes: {id: RegionId; path: string}[] = [
  {id:'head_neck',path:'M86 57 86 48Q78 42 78 29L76 29Q73 26 74 20L78 20Q78 5 89 3Q100-1 111 3Q122 7 122 20L126 20Q128 27 122 30Q122 42 114 48L114 57 127 66 112 78H88L73 66Z'},
  {id:'chest',path:'M86 57Q80 61 68 63Q55 64 50 79L61 105Q69 110 71 125L74 154 70 175Q83 188 100 187Q117 188 130 175L126 154 129 125Q131 110 139 105L150 79Q145 64 132 63Q120 61 114 57L109 69H91Z'},
  {id:'pelvis',path:'M70 174Q84 181 100 179Q116 181 130 174L134 193 129 220 109 229 100 215 91 229 71 220 66 193Z'},
  {id:'right_arm',path:'M63 65Q47 63 43 79L38 103 32 124Q27 139 26 153L21 173 16 185 12 189Q9 194 12 196L18 191 14 206Q13 210 16 210L21 198 19 213Q19 216 22 215L26 201 25 214Q26 217 29 214L31 201 32 211Q34 214 36 210L37 194 34 181 38 157Q46 146 47 132L54 110 65 91 69 77Z'},
  {id:'left_arm',path:'M137 65Q153 63 157 79L162 103 168 124Q173 139 174 153L179 173 184 185 188 189Q191 194 188 196L182 191 186 206Q187 210 184 210L179 198 181 213Q181 216 178 215L174 201 175 214Q174 217 171 214L169 201 168 211Q166 214 164 210L163 194 166 181 162 157Q154 146 153 132L146 110 135 91 131 77Z'},
  {id:'right_leg',path:'M70 209Q80 214 96 213L97 243Q97 263 91 286L90 298Q95 310 91 331L87 359 87 385 90 396Q92 404 86 408L68 410Q62 408 65 402L74 391 74 365 69 336Q64 315 70 298L67 276Q61 249 64 230Z'},
  {id:'left_leg',path:'M130 209Q120 214 104 213L103 243Q103 263 109 286L110 298Q105 310 109 331L113 359 113 385 110 396Q108 404 114 408L132 410Q138 408 135 402L126 391 126 365 131 336Q136 315 130 298L133 276Q139 249 136 230Z'},
  {id:'spine',path:'M96 108Q94 128 96 149L94 168Q100 176 106 168L104 149Q106 128 104 108Z'},
  {id:'heart',path:'M106 93C109 86 117 87 120 92C125 98 120 112 111 119C106 113 101 109 100 103C99 98 102 94 106 93Z'},
];
const details = [
  'M82 22Q88 19 94 22M106 22Q112 19 118 22M83 26Q88 23 93 26M107 26Q112 23 117 26M99 24 96 34Q100 37 104 34M92 41Q100 44 108 41M95 45Q100 46 105 45M79 31 83 36M121 31 117 36M82 16Q100 10 118 16',
  'M88 49 92 62M112 49 108 62M78 65 93 74M122 65 107 74M100 70 100 81',
  'M65 79Q77 73 94 81M106 81Q123 73 135 79M64 92Q74 108 94 103M106 103Q126 108 136 92M97 80 97 103M103 80 103 103M76 112 84 122M124 112 116 122M77 124 84 134M123 124 116 134',
  'M90 111Q100 108 110 111M88 124Q100 120 112 124M88 137Q100 133 112 137M90 150Q100 147 110 150M100 113 100 153M86 111Q81 132 89 155M114 111Q119 132 111 155M98 160Q100 163 102 160M77 158 83 174M123 158 117 174M74 181 91 200M126 181 109 200',
  'M54 72Q45 82 48 95M57 89Q57 104 47 119M43 103 38 123M34 128Q29 144 31 153M43 132Q40 148 34 159M30 160 25 179M25 183 29 193M21 188 24 197',
  'M146 72Q155 82 152 95M143 89Q143 104 153 119M157 103 162 123M166 128Q171 144 169 153M157 132Q160 148 166 159M170 160 175 179M175 183 171 193M179 188 176 197',
  'M76 223Q71 246 77 272L81 286M89 225Q93 250 84 281M72 288Q80 282 88 288L87 300Q80 305 73 300ZM75 311Q68 329 78 351M85 310 81 359 81 385M75 394 84 395M69 403 83 402',
  'M124 223Q129 246 123 272L119 286M111 225Q107 250 116 281M128 288Q120 282 112 288L113 300Q120 305 127 300ZM125 311Q132 329 122 351M115 310 119 359 119 385M125 394 116 395M131 403 117 402',
];
function Interior({ region }: { region: RegionId }) {
  if (region === 'chest') return <g pointerEvents="none">
    <path d="M96 71V82M104 71V82M100 74V90M100 84 88 95M100 84 113 94" fill="none" stroke="#D4DEDF" strokeWidth="2.3" strokeLinecap="round" opacity=".7" />
    <path d="M89 81C78 78 69 90 69 107C70 121 80 132 94 126L96 91Z" fill="#F28E87" fillOpacity=".4" stroke="#F7ABA4" strokeWidth=".8" />
    <path d="M111 81C122 78 131 90 131 107C130 121 120 132 106 126L104 91Z" fill="#F28E87" fillOpacity=".4" stroke="#F7ABA4" strokeWidth=".8" />
    <path d="M88 91 82 102 76 108M83 101 87 113M112 91 119 103 124 110M117 101 113 113" fill="none" stroke="#FFD6CD" strokeWidth=".7" opacity=".65" />
    <path d="M73 85Q100 96 127 85M70 94Q100 107 130 94M70 104Q100 117 130 104M73 114Q100 127 127 114M79 125Q100 136 121 125" fill="none" stroke="#CFD3CB" strokeWidth="1" opacity=".24" />
    <path d="M87 137Q80 143 85 150L96 151M113 137Q120 143 115 150L104 151M87 155Q84 162 91 168M113 155Q116 162 109 168" fill="none" stroke={systemColors.muscle} strokeWidth="2.4" opacity=".4" />
  </g>;
  if (region === 'pelvis') return <g pointerEvents="none" fill={systemColors.hip} stroke="#FFE1A7" strokeWidth=".7">
    <path d="M94 183C87 181 77 176 73 180C66 187 73 201 83 203L91 210L97 200Z" fillOpacity=".8" />
    <path d="M106 183C113 181 123 176 127 180C134 187 127 201 117 203L109 210L103 200Z" fillOpacity=".8" />
    <path d="M94 179 106 179 110 194 100 208 90 194Z" fillOpacity=".5" />
    <ellipse cx="85" cy="201" rx="5" ry="7" fill="#182B2C" /><ellipse cx="115" cy="201" rx="5" ry="7" fill="#182B2C" />
    <path d="M80 207 78 221M120 207 122 221" strokeWidth="5" strokeLinecap="round" />
  </g>;
  if (region === 'spine') return <g pointerEvents="none" stroke="#CDDCFF" fill={systemColors.spine} strokeWidth=".7">
    {[112, 120, 128, 136, 144, 152, 160, 168].map((y, index) => <path key={y} d={`M${96 - index * .12} ${y}Q100 ${y - 2} ${104 + index * .12} ${y}L105 ${y + 4}Q100 ${y + 6} 95 ${y + 4}Z`} />)}
  </g>;
  if (region === 'heart') return <g pointerEvents="none" fill="none" strokeLinecap="round"><path d="M106 94Q103 85 108 80M112 93Q112 83 118 85M113 96Q120 91 124 93" stroke="#FFC0B7" strokeWidth="2.5" /><path d="M108 97 108 107 113 113M108 102 116 102" stroke="#FFD9D2" strokeWidth=".7" opacity=".75" /></g>;
  if (region === 'left_leg' || region === 'right_leg') {
    const mirror = region === 'left_leg';
    return <g pointerEvents="none" transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
      <path d="M72 223Q65 249 76 278Q83 271 84 244L87 221Z" fill={systemColors.muscle} fillOpacity=".54" /><path d="M89 221Q98 246 87 280L83 269Z" fill={systemColors.muscle} fillOpacity=".34" />
      <path d="M74 306Q65 328 78 354L83 316Z" fill={systemColors.muscle} fillOpacity=".48" /><path d="M86 307Q91 331 83 354L81 330Z" fill={systemColors.muscle} fillOpacity=".3" />
      <path d="M80 226 81 282M79 306 80 382" stroke={systemColors.hip} strokeWidth="2" strokeLinecap="round" opacity=".65" />
      <ellipse cx="80" cy="294" rx="5" ry="6" fill={systemColors.hip} fillOpacity=".78" stroke="#FFE1A7" strokeWidth=".7" />
      <path d="M77 232 75 258M81 235 78 269M76 315 74 334M80 316 78 342" fill="none" stroke="#BCFFEE" strokeWidth=".5" opacity=".5" />
    </g>;
  }
  if (region === 'left_arm' || region === 'right_arm') return <g pointerEvents="none" transform={region === 'left_arm' ? 'translate(200 0) scale(-1 1)' : undefined}>
    <path d="M52 79Q43 94 43 114Q53 105 59 89Z" fill={systemColors.muscle} fillOpacity=".55" /><path d="M38 129Q27 144 29 163Q38 154 42 137Z" fill={systemColors.muscle} fillOpacity=".5" />
    <path d="M53 84 42 123 31 174" fill="none" stroke={systemColors.hip} strokeWidth="1.6" strokeLinecap="round" opacity=".6" /><circle cx="42" cy="123" r="2.5" fill={systemColors.hip} fillOpacity=".7" />
  </g>;
  return null;
}

export type BodyTwin2DProps = BodyTwinProps & { onHover?: (id: RegionId | null) => void; hoveredRegion?: RegionId | null; activeInjury?: ActiveInjury | null };

export function BodyTwin2D({ regions, day, compareRegions, selectedRegion, onRegionSelect, onHover, hoveredRegion, activeInjury, height = 520 }: BodyTwin2DProps) {
  const uid = useId().replace(/:/g, '');
  const [localHover, setLocalHover] = useState<RegionId | null>(null);
  const focus = hoveredRegion ?? localHover ?? selectedRegion;
  const injuryPoint = activeInjury ? injuryPoint2D(activeInjury) : null;
  function hover(region: RegionId | null) { setLocalHover(region); onHover?.(region); }
  return <div className="twin-2d detailed-anatomy" style={{ height }}>{(compareRegions ? [regions, compareRegions] : [regions]).map((data, index) => {
    const id = `anatomy-${uid}-${index}`;
    return <svg key={index} viewBox="-10 0 220 430" role="group" aria-label={`${index ? 'Test' : 'Applied'} routine interactive anatomy`}>
      <defs>
        <linearGradient id={`${id}-shade`} x1="0" x2="1"><stop offset="0" stopColor="#061419" stopOpacity=".4" /><stop offset=".32" stopColor="#BFEAE4" stopOpacity=".14" /><stop offset=".55" stopColor="#BFEAE4" stopOpacity=".02" /><stop offset="1" stopColor="#061419" stopOpacity=".4" /></linearGradient>
        <radialGradient id={`${id}-floor`}><stop stopColor={systemColors.muscle} stopOpacity=".23" /><stop offset="1" stopColor={systemColors.muscle} stopOpacity="0" /></radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <g className="anatomy-guides" fill="none" stroke="#8AB6C0" strokeWidth=".4" pointerEvents="none"><ellipse cx="100" cy="211" rx="99" ry="197" opacity=".1" /><path d="M100 0V411" strokeDasharray="2 5" opacity=".18" /><path d="M4 100H196M4 190H196M24 294H176" strokeDasharray="1 5" opacity=".15" /></g>
      <ellipse cx="100" cy="417" rx="71" ry="8" fill={`url(#${id}-floor)`} />
      {shapes.map(shape => {
        const active = focus === shape.id;
        const organ = shape.id === 'heart' || shape.id === 'spine';
        const color = regionColors[shape.id];
        const signal = Math.max(0, Math.min(1, data[shape.id]?.[day] ?? 1));
        return <g key={shape.id} className={`anatomy-region region-${shape.id} ${active ? 'is-focused' : ''}`} role="button" tabIndex={0} aria-label={regionNames[shape.id]} aria-pressed={selectedRegion === shape.id}
          onPointerEnter={() => hover(shape.id)} onPointerLeave={() => hover(null)} onFocus={() => hover(shape.id)} onBlur={() => hover(null)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRegionSelect?.(selectedRegion === shape.id ? null : shape.id); } }} onClick={() => onRegionSelect?.(selectedRegion === shape.id ? null : shape.id)}>
          <title>{regionNames[shape.id]}</title>
          {active && <path d={shape.path} fill={color} stroke={color} strokeWidth="4" opacity=".33" filter={`url(#${id}-glow)`} pointerEvents="none" />}
          <path className="anatomy-surface" d={shape.path} fill={color} fillOpacity={organ ? .72 : active ? .42 : .12 + signal * .13} stroke={active ? '#F4FFFC' : color} strokeOpacity={active ? 1 : .62} strokeWidth={active ? 1.3 : .65} />
          {!organ && <path d={shape.path} fill={`url(#${id}-shade)`} pointerEvents="none" />}
          <Interior region={shape.id} />
        </g>;
      })}
      <g className="anatomy-lines" fill="none" stroke="#C4EDE5" strokeOpacity=".3" strokeWidth=".55" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">{details.map((d, i) => <path d={d} key={i} />)}</g>
      <g fill="#C4EDE5" opacity=".5" pointerEvents="none"><ellipse cx="88" cy="26" rx="1.1" ry="1.4" /><ellipse cx="112" cy="26" rx="1.1" ry="1.4" /></g>
      {activeInjury && injuryPoint && <g className="anatomy-injury-ring" transform={`translate(${injuryPoint.x} ${injuryPoint.y})`} pointerEvents="none" role="img" aria-label={`${activeInjury.label}, active injury from day ${activeInjury.day}`}><title>{`${activeInjury.label} · onset day ${activeInjury.day}`}</title><circle r="13" fill="#1A1716" fillOpacity=".45" stroke="#FFC18D" strokeWidth="1.5"/><circle r="9" fill="none" stroke="#F18E80" strokeWidth="1" strokeDasharray="2.5 2"/><path d="M0-5V2M0 5V6" stroke="#FFE3BE" strokeWidth="1.8" strokeLinecap="round"/></g>}
      <text x="100" y="429" textAnchor="middle" fill="#839CA5" fontSize="4.3" letterSpacing="1.2">ANTERIOR VIEW</text>
    </svg>;
  })}</div>;
}
