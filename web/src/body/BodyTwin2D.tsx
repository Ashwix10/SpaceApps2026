import { useId } from 'react';
import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';

const shapes: {id: RegionId; path: string}[] = [
  {id:'head_neck',path:'M86 57 86 48Q78 42 78 29L76 29Q73 26 74 20L78 20Q78 5 89 3Q100-1 111 3Q122 7 122 20L126 20Q128 27 122 30Q122 42 114 48L114 57 127 66 112 78H88L73 66Z'},
  {id:'chest',path:'M86 57Q80 61 68 63Q55 64 50 79L61 105Q69 110 71 125L74 154 70 175Q83 188 100 187Q117 188 130 175L126 154 129 125Q131 110 139 105L150 79Q145 64 132 63Q120 61 114 57L109 69H91Z'},
  {id:'pelvis',path:'M70 174Q84 181 100 179Q116 181 130 174L134 193 129 220 109 229 100 215 91 229 71 220 66 193Z'},
  {id:'right_arm',path:'M63 65Q47 63 43 79L38 103 32 124Q27 139 26 153L21 173 16 185 12 189Q9 194 12 196L18 191 14 206Q13 210 16 210L21 198 19 213Q19 216 22 215L26 201 25 214Q26 217 29 214L31 201 32 211Q34 214 36 210L37 194 34 181 38 157Q46 146 47 132L54 110 65 91 69 77Z'},
  {id:'left_arm',path:'M137 65Q153 63 157 79L162 103 168 124Q173 139 174 153L179 173 184 185 188 189Q191 194 188 196L182 191 186 206Q187 210 184 210L179 198 181 213Q181 216 178 215L174 201 175 214Q174 217 171 214L169 201 168 211Q166 214 164 210L163 194 166 181 162 157Q154 146 153 132L146 110 135 91 131 77Z'},
  {id:'right_leg',path:'M70 209Q80 214 96 213L97 243Q97 263 91 286L90 298Q95 310 91 331L87 359 87 385 90 396Q92 404 86 408L68 410Q62 408 65 402L74 391 74 365 69 336Q64 315 70 298L67 276Q61 249 64 230Z'},
  {id:'left_leg',path:'M130 209Q120 214 104 213L103 243Q103 263 109 286L110 298Q105 310 109 331L113 359 113 385 110 396Q108 404 114 408L132 410Q138 408 135 402L126 391 126 365 131 336Q136 315 130 298L133 276Q139 249 136 230Z'},
  {id:'spine',path:'M98 82Q96 112 98 139L97 164Q100 171 103 164L102 139Q104 110 102 82Z'},
  {id:'heart',path:'M111 89C119 84 125 91 121 100L112 110 103 101C98 92 103 85 111 89Z'},
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
const label=(id:RegionId)=>id==='pelvis'?'Hips':id==='spine'?'Back':id.replaceAll('_',' ');

export function BodyTwin2D({regions,day,compareRegions,selectedRegion,injuredRegion,onRegionSelect,height=520}:BodyTwinProps) {
  const uid=useId().replace(/:/g,'');
  return <div className="twin-2d detailed-anatomy" style={{height}}>{(compareRegions?[regions,compareRegions]:[regions]).map((data,index)=>{
    const id=`anatomy-${uid}-${index}`;
    return <svg key={index} viewBox="0 0 200 430" role="group" aria-label={`${index?'New':'Current'} routine male reference illustration`}>
      <defs><linearGradient id={`${id}-shade`} x1="0" x2="1"><stop offset="0" stopColor="#151515" stopOpacity=".6"/><stop offset=".25" stopColor="#fff" stopOpacity=".2"/><stop offset=".48" stopColor="#fff" stopOpacity=".07"/><stop offset=".72" stopColor="#111" stopOpacity=".32"/><stop offset="1" stopColor="#050505" stopOpacity=".65"/></linearGradient><radialGradient id={`${id}-floor`}><stop stopColor="#ddd" stopOpacity=".14"/><stop offset="1" stopColor="#ddd" stopOpacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="418" rx="60" ry="7" fill={`url(#${id}-floor)`}/>
      {shapes.map(shape=><g key={shape.id} className={`anatomy-region region-${shape.id}`} role="button" tabIndex={0} aria-label={`${label(shape.id)}, change index ${Math.round((data[shape.id]?.[day]??1)*100)} out of 100`} aria-pressed={selectedRegion===shape.id}
        onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onRegionSelect?.(selectedRegion===shape.id?null:shape.id);}}} onClick={()=>onRegionSelect?.(selectedRegion===shape.id?null:shape.id)}>
        <title>{label(shape.id)}</title><path d={shape.path} fill={healthColor(data[shape.id]?.[day]??1)} stroke={selectedRegion===shape.id?'#fff':injuredRegion===shape.id?'#B87575':'#747474'} strokeWidth={selectedRegion===shape.id||injuredRegion===shape.id?1.7:.65} opacity={selectedRegion&&selectedRegion!==shape.id? .8:1}/>
        {!['heart','spine'].includes(shape.id)&&<path d={shape.path} fill={`url(#${id}-shade)`} pointerEvents="none"/>}
      </g>)}
      <g className="anatomy-lines" fill="none" stroke="#292929" strokeOpacity=".42" strokeWidth=".7" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">{details.map((d,i)=><path d={d} key={i}/>)}</g>
      <g fill="#252525" opacity=".72" pointerEvents="none"><ellipse cx="88" cy="26" rx="1.2" ry="1.5"/><ellipse cx="112" cy="26" rx="1.2" ry="1.5"/></g>
      <text x="100" y="429" textAnchor="middle" fill="#858585" fontSize="4" letterSpacing="1.2">MALE REFERENCE · ILLUSTRATIVE</text>
    </svg>;
  })}</div>;
}
