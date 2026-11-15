import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Avatar, CrewPicker } from './Visuals';
import { MissionNumberInput } from './MissionNumberInput';
import type { CrewProfile, ForecastRequest, InjuryInfo, InjuryType, Mission } from './types';
import './mission-visual.css';
import './destination-planner.css';

export const missionPresets = [
  { id: 'iss-visit', label: 'ISS visit', destination: 'ISS', days: 14 },
  { id: 'iss-expedition', label: 'ISS expedition', destination: 'ISS', days: 180 },
  { id: 'lunar-visit', label: 'Lunar visit', destination: 'MOON', days: 30 },
  { id: 'mars-transit', label: 'Mars transit', destination: 'MARS', days: 210 },
] as const;

export const destinationDurations: Record<Mission['destination'], number> = { ISS: 180, MOON: 30, MARS: 210 };

export function applyMissionDuration(value: ForecastRequest, days: number, destination = value.mission.destination): ForecastRequest {
  const duration = Math.max(7, Math.min(900, Math.round(days)));
  return { ...value, mission: { ...value.mission, destination, duration_days: duration, eva_days: value.mission.eva_days.filter(day => day <= duration) }, injury: value.injury ? { ...value.injury, day: Math.min(value.injury.day, duration) } : null };
}

export function applyMissionDestination(value: ForecastRequest, destination: Mission['destination']): ForecastRequest {
  return destination === value.mission.destination ? value : applyMissionDuration(value, destinationDurations[destination], destination);
}

const destinations: { id: Mission['destination']; label: string; detail: string; x: number; y: number }[] = [
  { id: 'ISS', label: 'ISS', detail: 'Low Earth orbit', x: 29, y: 35 },
  { id: 'MOON', label: 'Moon', detail: 'Lunar scenario', x: 57, y: 66 },
  { id: 'MARS', label: 'Mars', detail: 'Mars scenario', x: 84, y: 30 },
];

function Station() {
  return <svg viewBox="0 0 72 50" fill="none" aria-hidden="true"><path d="M7 17h58M7 33h58M27 25h18" stroke="currentColor" strokeWidth="2"/><path d="M6 8h16v32H6zM50 8h16v32H50z" fill="currentColor" fillOpacity=".12" stroke="currentColor"/><path d="M14 8v32M58 8v32M6 16h16M6 24h16M6 32h16M50 16h16M50 24h16M50 32h16" stroke="currentColor" strokeOpacity=".5"/><path d="M31 18h10v15H31zM35 12h3v6M33 33v7h6v-7" fill="currentColor" fillOpacity=".7" stroke="currentColor"/></svg>;
}
function Spacecraft() {
  return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M8 28 15 8l3-4 3 4 7 20-10-5-10 5Z" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="1.5"/><path d="M18 23v7M15 29l3 3 3-3M15 8h6M15.5 15h5" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

export function DestinationPlanner({ value, crew, onChange }: { value: Mission['destination']; crew?: CrewProfile; onChange: (destination: Mission['destination']) => void }) {
  const scene = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [routeVersion, setRouteVersion] = useState(0);
  const active = destinations.find(destination => destination.id === value)!;
  const ship = drag ?? { x: active.x - 7, y: active.y + 12 };
  const routeTarget = drag ?? active;
  const dropTarget = drag ? destinations.reduce((a, b) => Math.hypot(a.x - drag.x, a.y - drag.y) <= Math.hypot(b.x - drag.x, b.y - drag.y) ? a : b) : null;
  function choose(destination: Mission['destination']) { setRouteVersion(version => version + 1); onChange(destination); }
  function point(event: PointerEvent<HTMLButtonElement>) {
    const rect = scene.current!.getBoundingClientRect();
    return { x: Math.max(4, Math.min(96, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(7, Math.min(89, (event.clientY - rect.top) / rect.height * 100)) };
  }
  return <section className="destination-planner" aria-label="Destination planner">
    <div className="mission-block-heading"><span>Destination</span><span className="mission-value">{active.detail}</span></div>
    <div className={`destination-scene${drag ? ' is-dragging' : ''}`} ref={scene}>
      <svg className="destination-orbits" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="10" cy="67" rx="30" ry="44"/><ellipse cx="10" cy="67" rx="58" ry="64"/><ellipse cx="10" cy="67" rx="87" ry="83"/><path key={`${value}-${routeVersion}`} className="destination-route" pathLength="1" d={`M 10,67 Q 29,6 ${routeTarget.x},${routeTarget.y}`}/><path d="M0 91H100" className="destination-gridline"/></svg>
      <div className="departure-earth" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="m28 12 16 4 3 12-8 5 9 9-4 12-9 2 2 13 9 5-1 16-10-13-6-24-13-8-3-16ZM67 9 61 25l8 9-6 11 12 7 10-7 7 12-4 13-14 11-4 10-13-13 4-18-10-8 2-15-9-13Z"/></svg></div><span className="earth-caption">Earth</span>
      {destinations.map(destination => <button key={destination.id} type="button" className={`destination-node destination-${destination.id.toLowerCase()}${destination.id === value ? ' is-selected' : ''}${dropTarget?.id === destination.id ? ' is-drop-target' : ''}`} style={{ left: `${destination.x}%`, top: `${destination.y}%` }} aria-label={`Destination ${destination.label}`} aria-pressed={destination.id === value} onClick={() => choose(destination.id)}>
        <span className="destination-object">{destination.id === 'ISS' ? <Station/> : <span className={`destination-planet planet-${destination.id.toLowerCase()}`}/>}</span><span className="destination-label">{destination.label}</span>
      </button>)}
      <button type="button" className="route-spacecraft" style={{ left: `${ship.x}%`, top: `${ship.y}%` }} aria-label={`Spacecraft${crew ? ` carrying ${crew.name}` : ''}: drag to a destination, or use left and right arrow keys`} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setDrag(point(event)); }} onPointerMove={event => { if (drag) setDrag(point(event)); }} onPointerCancel={() => setDrag(null)} onPointerUp={event => {
        if (!drag) return;
        const target = point(event);
        const nearest = destinations.reduce((a, b) => Math.hypot(a.x - target.x, a.y - target.y) <= Math.hypot(b.x - target.x, b.y - target.y) ? a : b);
        choose(nearest.id); setDrag(null);
      }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(destinations[(destinations.indexOf(active) + (event.key === 'ArrowLeft' ? 2 : 1)) % 3].id); } if (event.key === 'Escape') setDrag(null); }}><Spacecraft/>{crew && <Avatar profile={crew} className="spacecraft-passenger"/>}</button>
      <span className="destination-instruction">Drag spacecraft or select destination</span>
    </div>
  </section>;
}

const baselineFields = [
  { key: 'hip_bmd_g_cm2', label: 'Hip density', unit: 'g/cm²', min: .1, max: 3, step: .01, icon: 'bone', color: '#f4b66e' },
  { key: 'spine_bmd_g_cm2', label: 'Spine density', unit: 'g/cm²', min: .1, max: 3, step: .01, icon: 'spine', color: '#aaa0ed' },
  { key: 'leg_lean_mass_kg', label: 'Leg lean tissue', unit: 'kg', min: 1, max: 80, step: .1, icon: 'leg', color: '#73dbeb' },
  { key: 'vo2max_ml_kg_min', label: 'VO₂peak', unit: 'mL/kg/min', min: 5, max: 100, step: 1, icon: 'heart', color: '#fb887d' },
] as const;

function MetricGlyph({ icon }: { icon: string }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">{icon === 'heart' ? <><path d="M16 27 5 16C-1 8 10 1 16 9 22 1 33 8 27 16Z"/><path d="M3 16h7l3-5 4 10 3-5h9"/></> : icon === 'spine' ? <><path d="M17 3c-6 8 6 16 0 26"/>{[5,11,17,23].map((y, i) => <rect key={y} x={i % 2 ? 11 : 13} y={y} width="8" height="4" rx="1"/>)}</> : icon === 'leg' ? <><path d="m13 3-2 11 4 5-4 10h11l-3-4 3-10-4-12M12 14l9 1"/></> : <><path d="m11 11 10 10c7-2 10 5 5 7-3 2-6-1-5-4L10 13c-6 2-10-4-6-7 3-2 6-1 7 5Z"/></>}</svg>;
}

export function BaselineInputs({ value, onChange }: { value: CrewProfile; onChange: (crew: CrewProfile) => void }) {
  return <section className="baseline-inputs" aria-label="Preflight baseline">
    <div className="mission-block-heading"><span>Preflight baseline</span><span className="mission-value">100% reference</span></div>
    <div className="baseline-grid">{baselineFields.map(field => <div className="baseline-tile" key={field.key} role="group" aria-label={field.label} style={{ '--mission-accent': field.color, '--range-progress': `${(value.baseline[field.key] - field.min) / (field.max - field.min) * 100}%` } as CSSProperties}>
      <MetricGlyph icon={field.icon}/><span>{field.label}</span><div><MissionNumberInput aria-label={`Baseline ${field.label}`} min={field.min} max={field.max} step={field.step} value={value.baseline[field.key]} onCommit={number => onChange({ ...value, baseline: { ...value.baseline, [field.key]: number } })}/><small>{field.unit}</small></div>
      <input className="baseline-slider" type="range" aria-label={`Adjust baseline ${field.label}`} aria-valuetext={`${value.baseline[field.key]} ${field.unit}`} min={field.min} max={field.max} step={field.step} value={value.baseline[field.key]} onChange={event => onChange({ ...value, baseline: { ...value.baseline, [field.key]: Number(event.target.value) } })}/>
    </div>)}</div>
    <details className="profile-input-details"><summary>Profile data <span>{value.age} yr · {value.mass_kg} kg</span></summary><div className="profile-data-grid">
      <div className="profile-data-number" role="group" aria-label="Crew age" style={{ '--range-progress': `${(value.age - 18) / 82 * 100}%` } as CSSProperties}><span>Age</span><div className="input-unit"><MissionNumberInput aria-label="Crew age" min={18} max={100} value={value.age} onCommit={number => onChange({ ...value, age: number })}/><span>yr</span></div><input type="range" aria-label="Adjust crew age" aria-valuetext={`${value.age} years`} min="18" max="100" step="1" value={value.age} onChange={event => onChange({ ...value, age: Number(event.target.value) })}/></div>
      <div className="profile-data-number" role="group" aria-label="Crew mass" style={{ '--mission-accent': '#83c8cd', '--range-progress': `${(value.mass_kg - 30) / 220 * 100}%` } as CSSProperties}><span>Mass</span><div className="input-unit"><MissionNumberInput aria-label="Crew mass" min={30} max={250} step={.1} value={value.mass_kg} onCommit={number => onChange({ ...value, mass_kg: number })}/><span>kg</span></div><input type="range" aria-label="Adjust crew mass" aria-valuetext={`${value.mass_kg} kilograms`} min="30" max="250" step=".1" value={value.mass_kg} onChange={event => onChange({ ...value, mass_kg: Number(event.target.value) })}/></div>
      <label>Sex<select aria-label="Crew sex" value={value.sex} onChange={event => onChange({ ...value, sex: event.target.value as CrewProfile['sex'] })}><option value="F">Female</option><option value="M">Male</option></select></label>
      <label>Fitness<select aria-label="Crew fitness" value={value.fitness} onChange={event => onChange({ ...value, fitness: event.target.value as CrewProfile['fitness'] })}><option value="low">Low</option><option value="average">Average</option><option value="high">High</option></select></label>
    </div></details>
  </section>;
}

const injurySymbols: Record<InjuryType, string> = { ankle_sprain: 'Ankle', wrist_fracture: 'Wrist', lower_back_strain: 'Back', thigh_muscle_tear: 'Thigh' };
function InjuryGlyph({ type }: { type: InjuryType }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">{type === 'ankle_sprain' ? <path d="m19 5-2 21-9 5c-2 1-1 4 1 4h22v-5l-6-5-1-20"/> : type === 'wrist_fracture' ? <path d="m15 35-2-13-6-6c-2-3 1-4 3-2l5 4V7c0-3 4-3 4 0v9-11c0-3 4-3 4 0v11-9c0-3 4-3 4 0v11-6c0-3 4-3 4 0v12l-5 11"/> : type === 'lower_back_strain' ? <><path d="m10 5 3 10-3 10-4 9M30 5l-3 10 3 10 4 9M20 5v28"/>{[9,15,21,27].map(y => <path key={y} d={`M16 ${y}h8`}/>)}</> : <path d="m13 4-5 14 6 8-3 10M28 4l-1 15-5 9 3 8M8 18l19 1M14 26l8 2"/>}<circle cx={type === 'wrist_fracture' ? 20 : type === 'ankle_sprain' ? 22 : 20} cy={type === 'wrist_fracture' ? 27 : type === 'ankle_sprain' ? 25 : 20} r="5" className="injury-target"/></svg>;
}

export function MissionSettings({ value, crew, injuries, onChange }: {
  value: ForecastRequest; crew: CrewProfile[]; injuries: InjuryInfo[]; onChange: (value: ForecastRequest) => void;
}) {
  const [duration, setDuration] = useState(String(value.mission.duration_days));
  const durationId = useId();
  useEffect(() => setDuration(String(value.mission.duration_days)), [value.mission.duration_days]);
  function changeDuration(days: number) {
    setDuration(String(days));
    onChange(applyMissionDuration(value, days));
  }
  function commitDuration() {
    const parsed = Number(duration);
    if (!duration.trim() || !Number.isFinite(parsed)) { setDuration(String(value.mission.duration_days)); return; }
    changeDuration(Math.max(7, Math.min(900, Math.round(parsed))));
  }
  function chooseInjury(type: InjuryType | null) {
    if (!type) { onChange({ ...value, injury: null }); return; }
    onChange({ ...value, injury: { type, severity: value.injury?.severity ?? 2, day: value.injury?.day ?? Math.min(40, value.mission.duration_days), side: type === 'lower_back_strain' ? null : value.injury?.side ?? 'left' } });
  }
  return <div className="mission-settings mission-visual">
    <DestinationPlanner value={value.mission.destination} crew={value.crew} onChange={destination => { const next = applyMissionDestination(value, destination); if (next !== value) onChange(next); }}/>
    <section className="mission-preset-section" aria-label="Mission presets"><div className="mission-block-heading"><span>Mission preset</span><span className="mission-value">Editable duration</span></div><div className="mission-preset-grid">{missionPresets.map(preset => <button type="button" key={preset.id} aria-pressed={value.mission.destination === preset.destination && value.mission.duration_days === preset.days} onClick={() => onChange(applyMissionDuration(value, preset.days, preset.destination))}><span>{preset.label}</span><strong>{preset.days}<small>d</small></strong></button>)}</div></section>
    <section className="mission-duration"><div className="mission-block-heading"><label htmlFor={durationId}>Duration</label><div className="duration-number"><input id={durationId} aria-label="Mission length" type="number" min="7" max="900" step="1" value={duration} onChange={event => setDuration(event.target.value)} onBlur={commitDuration} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/><span>days</span></div></div>
      <input aria-label="Mission duration slider" type="range" min="7" max="900" value={value.mission.duration_days} style={{ '--range-progress': `${(value.mission.duration_days - 7) / 893 * 100}%` } as CSSProperties} onChange={event => changeDuration(Number(event.target.value))}/><div className="duration-presets">{[30, 90, 180, 365].map(days => <button type="button" key={days} aria-pressed={value.mission.duration_days === days} onClick={() => changeDuration(days)}>{days}<span>d</span></button>)}<span>7–900 days</span></div>
    </section>
    <section className="mission-crew"><CrewPicker astronauts={crew} value={value.crew.id} onChange={id => { const selected = crew.find(person => person.id === id); if (selected) onChange({ ...value, crew: selected }); }} label="Crew"/></section>
    <BaselineInputs value={value.crew} onChange={profile => onChange({ ...value, crew: profile })}/>
    <section className={`injury-scenario${value.injury ? ' is-active' : ''}`} aria-label="Injury scenario"><div className="mission-block-heading"><span>Injury scenario</span><button type="button" className="scenario-toggle" role="switch" aria-label="Include injury scenario" aria-checked={!!value.injury} onClick={() => chooseInjury(value.injury ? null : 'ankle_sprain')}><span/></button></div>
      <div className="injury-grid">{(Object.keys(injurySymbols) as InjuryType[]).map(type => <button type="button" key={type} className="injury-choice" aria-pressed={value.injury?.type === type} aria-label={injuries.find(injury => injury.type === type)?.label ?? type.replaceAll('_', ' ')} onClick={() => chooseInjury(value.injury?.type === type ? null : type)}><InjuryGlyph type={type}/><span>{injurySymbols[type]}</span></button>)}</div>
      {value.injury && <div className="injury-controls"><div className="injury-selection-name">{injuries.find(injury => injury.type === value.injury?.type)?.label ?? value.injury.type.replaceAll('_', ' ')}</div><div className="injury-control-row"><fieldset className="segmented-control"><legend>Severity</legend>{([1, 2, 3] as const).map(severity => <button type="button" key={severity} aria-label={`${['Mild', 'Moderate', 'Severe'][severity - 1]} injury`} aria-pressed={value.injury?.severity === severity} onClick={() => onChange({ ...value, injury: { ...value.injury!, severity } })}>{['Mild', 'Moderate', 'Severe'][severity - 1]}</button>)}</fieldset>
      {value.injury.type !== 'lower_back_strain' && <fieldset className="segmented-control injury-side"><legend>Side</legend>{(['left', 'right'] as const).map(side => <button type="button" key={side} aria-label={`Injury ${side} side`} aria-pressed={value.injury?.side === side} onClick={() => onChange({ ...value, injury: { ...value.injury!, side } })}>{side === 'left' ? 'L' : 'R'}</button>)}</fieldset>}</div>
      <label className="injury-day-label">Onset <span>Day {value.injury.day}</span><input aria-label="Injury day" type="range" min="0" max={value.mission.duration_days} value={value.injury.day} onChange={event => onChange({ ...value, injury: { ...value.injury!, day: Number(event.target.value) } })}/></label></div>}
    </section>
  </div>;
}
