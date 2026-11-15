import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CrewProfile } from './types';

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    astronauts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
    research: 'M12 5v16 M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
    mission: 'M12 3v18 M3 12h18 M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
    explore: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M5 10l7 2 7-2 M12 12v4 M8 22l4-6 4 6',
    compare: 'M6 3v18 M18 3v18 M3 7h6 M15 17h6 M6 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    plus: 'M12 5v14 M5 12h14',
    orbit: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M3 18c-5-5 13-20 18-12S8 26 3 18',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
    rocket: 'M14 4c3-2 6-2 6-2s0 3-2 6l-8 9-5-5 9-8 M6 11l-4 1 1-5 6-1 M11 18l1 4 5-1 1-6 M5 16l-3 6 6-3 M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    station: 'M10 8h4v8h-4z M3 5h4v14H3z M17 5h4v14h-4z M7 12h3 M14 12h3 M12 3v5 M12 16v5 M3 10h4 M3 14h4 M17 10h4 M17 14h4',
    moon: 'M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5',
    planet: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M3 17c-7-1 16-17 19-12s-16 15-19 12',
    archive: 'M4 8h16v12H4z M3 3h18v5H3z M9 12h6',
    restore: 'M3 10a9 9 0 1 1 1 7 M3 4v6h6',
    edit: 'M14 5l5 5 M4 20l4-1 12-12a2 2 0 0 0-4-4L4 15z',
    close: 'M6 6l12 12 M18 6 6 18',
    check: 'M5 12l4 4L19 6',
    chevron: 'M6 9l6 6 6-6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7v.2',
    weight: 'M5 8h14l2 13H3z M9 8V5a3 3 0 0 1 6 0v3',
    heart: 'M20.5 4.6a5.5 5.5 0 0 0-7.8 0L12 5.3l-.7-.7a5.5 5.5 0 0 0-7.8 7.8L12 21l8.5-8.6a5.5 5.5 0 0 0 0-7.8',
    bone: 'M6 4a3 3 0 1 0-4 4l3 3 6 6a3 3 0 1 0 5 5 3 3 0 1 0 5-5l-6-6-3-3a3 3 0 1 0-6-4',
    muscle: 'M6 16l3-5 3 1 2-4-2-3 3-2 4 4-1 6 3 4c-2 4-8 5-12 4l-5-2z',
    sliders: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.orbit}/></svg>;
}

/** Static layers keep the surrounding space inexpensive to render. */
export function SpaceBackdrop() {
  return <div className="space-backdrop" aria-hidden="true"><div className="space-starfield"/><div className="space-horizon"/></div>;
}

/** Decorative destination artwork; it does not represent a flight's location. */
export function OrbitPlanet({ destination = 'ISS', className = '' }: { destination?: string; className?: string }) {
  const kind = destination.toLowerCase();
  return <div className={`orbit-planet orbit-planet-${kind} ${className}`} aria-hidden="true">
    {kind === 'iss' || kind === 'earth' ? <img src="/images/earth.png" alt="" draggable={false} decoding="async"/> : <>{kind === 'saturn' && <span className="planet-rings"/>}<span className="planet-surface"/><span className="planet-terminator"/></>}
  </div>;
}

/** A decorative crew transport, drawn as vector geometry rather than another canvas. */
export function SpacecraftVisual() {
  const id = useId().replace(/:/g, '');
  return <svg className="spacecraft-visual" viewBox="0 0 800 560" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-hull`} x1="-25" y1="-65" x2="-12" y2="67" gradientUnits="userSpaceOnUse"><stop stopColor="#e5edf1"/><stop offset=".23" stopColor="#afbfc9"/><stop offset=".53" stopColor="#6e8b9e"/><stop offset=".77" stopColor="#294559"/><stop offset="1" stopColor="#101e30"/></linearGradient>
      <linearGradient id={`${id}-capsule`} x1="131" y1="-61" x2="169" y2="62" gradientUnits="userSpaceOnUse"><stop stopColor="#e4e9e9"/><stop offset=".28" stopColor="#b9c8cc"/><stop offset=".58" stopColor="#7595a3"/><stop offset="1" stopColor="#213d51"/></linearGradient>
      <linearGradient id={`${id}-panels`} x1="-220" y1="-200" x2="100" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#27577a"/><stop offset=".5" stopColor="#122942"/><stop offset="1" stopColor="#193f5e"/></linearGradient>
      <linearGradient id={`${id}-engine`} x1="-266" y1="0" x2="-188" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#73dbeb" stopOpacity="0"/><stop offset=".75" stopColor="#73dbeb" stopOpacity=".12"/><stop offset="1" stopColor="#b6eff7" stopOpacity=".65"/></linearGradient>
      <pattern id={`${id}-cells`} width="22" height="24" patternUnits="userSpaceOnUse" patternTransform="skewX(16)"><path d="M0 0h22v24H0z" stroke="#72a1be" strokeOpacity=".55" strokeWidth=".7"/><path d="M3 3h16v18H3z" stroke="#67c0d2" strokeOpacity=".15" strokeWidth=".5"/></pattern>
    </defs>
    <g transform="translate(412 245) rotate(-24)" strokeLinejoin="round">
      <path d="M-202-24-300-40-326 0-300 40-202 24Z" fill={`url(#${id}-engine)`}/>
      <path d="M-102-43v-105M-102 44v109" stroke="#34536b" strokeWidth="12"/><path d="M-103-45v-103M-103 46v103" stroke="#93bac9" strokeWidth="3"/>
      <path d="M-246-211H68l31 104h-314Z" fill="#0a1424" stroke="#547f9c" strokeWidth="3"/>
      <path d="M-240-205H63l27 92h-303Z" fill={`url(#${id}-panels)`}/><path d="M-240-205H63l27 92h-303Z" fill={`url(#${id}-cells)`}/>
      <path d="M-135-209-104-109M-30-209 1-109" stroke="#9aabb8" strokeWidth="3"/><path d="M-246-211H68" stroke="#a6c5d6" strokeWidth="2"/>
      <path d="M-215 108H99L68 212h-314Z" fill="#0a1424" stroke="#547f9c" strokeWidth="3"/>
      <path d="M-212 114H90L63 206h-303Z" fill={`url(#${id}-panels)`}/><path d="M-212 114H90L63 206h-303Z" fill={`url(#${id}-cells)`}/>
      <path d="M-104 110-135 210M1 110-30 210" stroke="#9aabb8" strokeWidth="3"/><path d="M-246 212H68" stroke="#8cabbf" strokeWidth="2"/>
      <path d="M-188-31-218-41-218 41-188 31" fill="#152737" stroke="#779bad" strokeWidth="1.5"/><ellipse cx="-217" cy="0" rx="7" ry="41" fill="#0b1726" stroke="#81bdcd"/><ellipse cx="-219" cy="0" rx="3" ry="28" fill="#6fcedb" fillOpacity=".65"/>
      <path d="M-180-49H-123V49H-180c-18-16-18-82 0-98Z" fill={`url(#${id}-hull)`} stroke="#91adbd" strokeWidth="1.5"/>
      <path d="M-147-57H73v114h-220c-22-22-22-92 0-114Z" fill={`url(#${id}-hull)`} stroke="#9db8c7" strokeWidth="1.4"/>
      <path d="M-132-56V56M-119-56V56M-65-56V56M-52-56V56M39-56V56" stroke="#233b50" strokeOpacity=".8" strokeWidth="2"/>
      <path d="M-128-52V49M-61-52V49M43-52V49" stroke="#c5d8e1" strokeOpacity=".5"/>
      <path d="M-132-42H36M-132 40H36" stroke="#abc9d6" strokeOpacity=".5"/>
      <path d="M-44-38H24v76h-68Z" fill="#243e53" stroke="#a2becb"/><path d="M-36-29h52v58h-52Z" fill="#11293d" stroke="#6f96ad"/><path d="M-30-22H10M-30-13H10M-30-4H10M-30 5H10M-30 14H10M-30 23H10" stroke="#89b6c8" strokeOpacity=".5"/>
      <path d="M52-64h25v128H52Z" fill="#172e43" stroke="#a2becb" strokeWidth="1.5"/><path d="M59-62V62M70-62V62" stroke="#8eb5c6"/>
      <path d="M78-62c55 2 99 18 137 48 8 6 8 22 0 28-38 30-82 46-137 48Z" fill={`url(#${id}-capsule)`} stroke="#bfd5dc" strokeWidth="1.5"/>
      <path d="M83-51c45 2 85 16 116 36M83 52c46-2 86-16 115-36" stroke="#5b7a8d" strokeWidth="1.5"/>
      <path d="M113-39c27 3 52 11 72 25l-36 3-35-9Z" fill="#0c2235" stroke="#7bacbd" strokeWidth="1.2"/><path d="m132-34 7 21m10-16 8 17m8-10 7 10" stroke="#aac8cf" strokeWidth="2"/>
      <path d="M122-33l7 12M145-28l6 11M166-21l5 7" stroke="#7be0ec" strokeOpacity=".65" strokeWidth="2"/>
      <path d="M110 18h48l-5 17-43 7Z" fill="#324f60" stroke="#93b0bc"/><path d="M117 25h30" stroke="#a3c6cf" strokeWidth="2"/>
      <path d="M216-15h21v30h-21Z" fill="#38566b" stroke="#afc5d1"/><ellipse cx="238" cy="0" rx="7" ry="15" fill="#102235" stroke="#b9d1da"/><ellipse cx="240" cy="0" rx="3" ry="8" fill="#4b8192"/>
      <path d="M-162-55v-15h25v17M-162 55v15h25V53" fill="#152d40" stroke="#7c9eaf"/><path d="M-163-70h27M-163 70h27" stroke="#ddb78c" strokeWidth="4"/>
      <path d="M-80-58v-22l21-12M-77-58v-20l19-10" stroke="#9cbcc9" strokeWidth="1.5"/><path d="M-69-101c8-4 20 5 22 15-12 4-24-3-22-15Z" fill="#536f7e" stroke="#b8ced3"/>
      <path d="M87-61 94-77h13l-2 22M87 61l7 16h13l-2-22" fill="#415d6d" stroke="#b6c9cc"/><path d="M94-77h13M94 77h13" stroke="#e4bb8c" strokeWidth="3"/>
      <path d="M-93-42h18v7h-18Z" fill="#daae7c"/><path d="M-93-27h18M-93-20h18" stroke="#b9cdd5" strokeWidth="2"/>
    </g>
  </svg>;
}

export function OrbitalVisual() { return <div className="orbital-visual"><OrbitPlanet/></div>; }

export function DestinationVisual({ destination }: { destination: string }) {
  return <div className={`destination-visual destination-${destination.toLowerCase()}`} aria-hidden="true"><OrbitPlanet destination={destination}/><Icon name={destination === 'ISS' ? 'station' : destination === 'MOON' ? 'moon' : 'planet'} size={22}/></div>;
}

export function crewPortraitIndex(profile: CrewProfile) {
  const presets: Record<string, number> = { crew_maya: 0, crew_luis: 1, crew_avery: 2, crew_sam: 3 };
  const savedPortrait = /^crew_portrait_([0-3])_/.exec(profile.id);
  if (savedPortrait) return Number(savedPortrait[1]);
  const variant = Array.from(profile.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
  return presets[profile.id] ?? (profile.sex === 'F' ? variant * 2 : variant * 2 + 1);
}

export function Avatar({ profile, className = '' }: { profile: CrewProfile; className?: string }) {
  return <span className={`crew-avatar portrait-${crewPortraitIndex(profile)} ${className}`} aria-hidden="true"/>;
}

export function CrewPicker({ astronauts, value, onChange, label = 'Crew' }: { astronauts: CrewProfile[]; value: string; onChange: (id: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = astronauts.find(person => person.id === value);
  const visible = astronauts.filter(person => `${person.name} ${person.role}`.toLowerCase().includes(query.toLowerCase()));
  const choose = (id: string) => { onChange(id); setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useEffect(() => { if (open) choices.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' }); }, [activeIndex, open, query]);
  return <div className="crew-picker" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (event.target !== search.current) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
    if (event.key === 'Enter') { event.preventDefault(); if (visible[activeIndex]) choose(visible[activeIndex].id); }
  }}>
    <span className="crew-picker-label" id={`${id}-label`}>{label}</span>
    <button className="crew-picker-trigger" type="button" ref={trigger} aria-labelledby={`${id}-label ${id}-selection`} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => { setOpen(current => !current); setQuery(''); setActiveIndex(Math.max(0, astronauts.findIndex(person => person.id === value))); }}>
      {selected ? <><Avatar profile={selected}/><span id={`${id}-selection`}><strong>{selected.name}</strong><small>{selected.role}</small></span></> : <span id={`${id}-selection`}>Choose crew</span>}<Icon name="chevron" size={16}/>
    </button>
    {open && <div className="crew-picker-options" id={`${id}-options`}>
      <label className="crew-picker-search"><Icon name="search" size={17}/><input ref={search} type="search" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Search crew" aria-label="Search crew" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={visible[activeIndex] ? `${id}-choice-${activeIndex}` : undefined} aria-autocomplete="list"/></label>
      <div className="crew-picker-list" ref={choices} role="listbox" id={`${id}-list`} aria-label="Crew choices">{visible.map((person, index) => <button type="button" role="option" tabIndex={-1} key={person.id} id={`${id}-choice-${index}`} className={activeIndex === index ? 'is-highlighted' : ''} aria-selected={person.id === value} onClick={() => choose(person.id)}><Avatar profile={person}/><span><strong>{person.name}</strong><small>{person.role}</small></span>{person.id === value && <Icon name="check" size={17}/>}</button>)}</div>{!visible.length && <p className="crew-search-empty" role="status">No matching crew.</p>}
    </div>}
  </div>;
}

export function StaggerStyle(index: number): CSSProperties { return { '--order': index } as CSSProperties; }
