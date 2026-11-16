import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CrewProfile } from './types';
import type { Flight, Workspace } from './workspace';
import { Avatar, CrewPicker, crewPortraitIndex, DestinationVisual, Icon, OrbitPlanet, SpacecraftVisual } from './Visuals';

const destination = (flight: Flight) => flight.request.mission.destination === 'ISS' ? 'Space station' : flight.request.mission.destination === 'MOON' ? 'Moon' : 'Mars';
const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));

function IconButton({ label, icon, onClick, disabled = false, className = '', tooltip = true }: { label: string; icon: string; onClick: () => void; disabled?: boolean; className?: string; tooltip?: boolean }) {
  return <button type="button" className={`workspace-icon-button ${className}`} aria-label={label} data-tooltip={tooltip ? label : undefined} onClick={onClick} disabled={disabled}><Icon name={icon}/></button>;
}

export function WorkspaceHome({ workspace, ready, onCreate, onOpen, onRename, onArchive }: {
  workspace: Workspace; ready: boolean; onCreate: () => void; onOpen: (id: string) => void; onRename: (id: string) => void; onArchive: (id: string, archived: boolean) => void; onDirectory: () => void;
}) {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const active = workspace.flights.filter(flight => !flight.archived);
  const featured = active.find(flight => flight.id === workspace.activeFlightId) ?? [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const flights = workspace.flights.filter(flight => flight.archived === archived && `${flight.name} ${flight.request.crew.name} ${destination(flight)}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <section className="workspace-home" aria-labelledby="page-heading">
    <div className="workspace-toolbar">
      <h1 id="page-heading" tabIndex={-1}>Flights <span>{active.length}</span></h1>
      <div className="workspace-tools">
        <label className="flight-search"><Icon name="search" size={17}/><input type="search" aria-label="Search flights" placeholder="Find a flight" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <button className={`workspace-icon-button ${archived ? 'is-selected' : ''}`} aria-label={archived ? 'Show active flights' : 'Show archived flights'} aria-pressed={archived} data-tooltip={archived ? 'Active flights' : 'Archived flights'} onClick={() => setArchived(current => !current)}><Icon name={archived ? 'orbit' : 'archive'}/></button>
        {workspace.flights.length > 0 && <button className="button button-light new-flight-button" aria-label="New flight" disabled={!ready} onClick={onCreate}><Icon name="plus" size={18}/><span>New flight</span></button>}
      </div>
    </div>
    <div className={`orbit-workspace ${flights.length ? 'has-flights' : ''}`}>
      <div className="workspace-orbit-art" aria-hidden="true"><div className="workspace-orbit-path orbit-path-one"/><div className="workspace-orbit-path orbit-path-two"/><OrbitPlanet className="workspace-planet"/><OrbitPlanet destination="MARS" className="distant-planet distant-mars"/><OrbitPlanet destination="SATURN" className="distant-planet distant-saturn"/></div>
      <div className="spacecraft-focus"><SpacecraftVisual/>{featured && <section className="spacecraft-readout" aria-label="Selected flight details"><h2>{featured.name}</h2><dl><div><dt className="sr-only">Crew</dt><dd><Avatar profile={featured.request.crew}/><span>{featured.request.crew.name}</span></dd></div><div><dt className="sr-only">Destination</dt><dd><Icon name={featured.request.mission.destination === 'ISS' ? 'station' : 'planet'} size={17}/>{destination(featured)}</dd></div><div><dt className="sr-only">Duration</dt><dd><Icon name="clock" size={16}/>{featured.request.mission.duration_days} days</dd></div></dl></section>}</div>
      {archived && <h2 className="archive-heading">Archived flights</h2>}
      {flights.length ? <div className="flight-objects" aria-label={archived ? 'Archived flights' : 'Flights'}>{flights.map(flight => <article className={`flight-object ${workspace.activeFlightId === flight.id ? 'is-current' : ''}`} key={flight.id}>
        <div className="flight-object-actions"><IconButton label={`Rename ${flight.name}`} icon="edit" onClick={() => onRename(flight.id)}/><IconButton label={flight.archived ? `Restore ${flight.name}` : `Archive ${flight.name}`} icon={flight.archived ? 'restore' : 'archive'} onClick={() => onArchive(flight.id, !flight.archived)}/></div>
        <button className="flight-object-open" aria-label={flight.archived ? `Restore ${flight.name}` : `Open ${flight.name}`} onClick={() => flight.archived ? onArchive(flight.id, false) : onOpen(flight.id)}>
          <DestinationVisual destination={flight.request.mission.destination}/>
          <span className="flight-object-name">{flight.name}</span>
          <span className="flight-object-route">{destination(flight)}<span>{flight.request.mission.duration_days} days</span></span>
          <span className="flight-object-crew"><Avatar profile={flight.request.crew}/><span>{flight.request.crew.name}</span><Icon name={flight.archived ? 'restore' : 'arrow'} size={18}/></span>
        </button>
        <time className="flight-updated" dateTime={flight.updatedAt}>Updated {date(flight.updatedAt)}</time>
      </article>)}</div> : <div className="orbit-empty">
        {query || archived || workspace.flights.length > 0 ? <p>{query ? 'No matching flights' : archived ? 'No archived flights' : 'No active flights'}</p> : <button className="create-flight-object" disabled={!ready} onClick={onCreate}><span className="launch-object"><Icon name="rocket" size={42}/><span><Icon name="plus" size={15}/></span></span><span>New flight</span></button>}
      </div>}
    </div>
  </section>;
}

export function AstronautDirectory({ astronauts, flights, ready, onCreate, onSelect }: { astronauts: CrewProfile[]; flights: Flight[]; ready: boolean; onCreate: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const visible = astronauts.filter(person => `${person.name} ${person.role}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="crew-directory" aria-labelledby="page-heading">
    <div className="workspace-toolbar"><h1 id="page-heading" tabIndex={-1}>Crew <span>{astronauts.length}</span></h1><div className="workspace-tools"><label className="flight-search"><Icon name="search" size={17}/><input type="search" aria-label="Search astronauts" placeholder="Find crew" value={query} onChange={event => setQuery(event.target.value)}/></label><button className="button button-light" disabled={!ready} onClick={onCreate}><Icon name="plus" size={18}/>Add crew</button></div></div>
    <div className="astronaut-grid">{visible.map(person => {
      const flightCount = flights.filter(flight => flight.request.crew.id === person.id && !flight.archived).length;
      return <button className="astronaut-card" key={person.id} onClick={() => onSelect(person.id)}>
        <Avatar profile={person} className="crew-portrait"/>
        <span className="crew-card-info"><span className="profile-card-name">{person.name}</span><span className="profile-card-role">{person.role || 'Astronaut'}</span><span className="profile-card-bottom"><span><Icon name="orbit" size={15}/>{flightCount} {flightCount === 1 ? 'flight' : 'flights'}</span><Icon name="arrow" size={18}/></span></span>
      </button>;
    })}</div>
    {!visible.length && <p className="directory-empty">No matching crew.</p>}
  </section>;
}

export function WorkspaceDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="workspace-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><header><h2 id={titleId}>{title}</h2><IconButton label="Close dialog" icon="close" tooltip={false} onClick={onClose}/></header><div className="workspace-dialog-content">{children}</div></dialog>;
}

export function FlightForm({ astronauts, initial, preferredCrewId, onSave }: { astronauts: CrewProfile[]; initial?: Flight; preferredCrewId?: string; onSave: (name: string, crewId: string) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [crewId, setCrewId] = useState(preferredCrewId ?? initial?.request.crew.id ?? astronauts[0]?.id ?? '');
  const selected = astronauts.find(person => person.id === crewId);
  return <form className="flight-create-form" onSubmit={event => { event.preventDefault(); if (name.trim() && crewId) onSave(name.trim(), crewId); }}>
    {!initial && <div className="flight-creation-visual" aria-hidden="true">{selected && <Avatar profile={selected} className="creation-portrait"/>}<span className="creation-trajectory"><Icon name="rocket" size={28}/></span><OrbitPlanet/></div>}
    <label className="workspace-field">Flight name<input autoFocus required maxLength={80} placeholder="Name your flight" value={name} onChange={event => setName(event.target.value)}/></label>
    {!initial && <CrewPicker astronauts={astronauts} value={crewId} onChange={setCrewId}/>}
    <button className="button button-light full-width" type="submit" disabled={!name.trim() || !crewId}>{initial ? 'Save name' : 'Create flight'}<Icon name="arrow" size={18}/></button>
  </form>;
}

const measurements: { key: keyof CrewProfile['baseline']; label: string; unit: string; icon: string; min: number; max: number; step: number; color: string }[] = [
  { key: 'hip_bmd_g_cm2', label: 'Hip bone', unit: 'g/cm²', icon: 'bone', min: 0.6, max: 1.6, step: 0.01, color: '#f4b66e' },
  { key: 'spine_bmd_g_cm2', label: 'Spine bone', unit: 'g/cm²', icon: 'bone', min: 0.6, max: 1.7, step: 0.01, color: '#aaa0ed' },
  { key: 'leg_lean_mass_kg', label: 'Leg lean tissue', unit: 'kg', icon: 'muscle', min: 10, max: 30, step: 0.1, color: '#73dbeb' },
  { key: 'vo2max_ml_kg_min', label: 'Aerobic capacity', unit: 'ml/kg/min', icon: 'heart', min: 20, max: 65, step: 0.5, color: '#fb887d' },
];

function ProfileRange({ label, value, min, max, step, unit, icon, color = '#73dbeb', onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; icon: string; color?: string; onChange: (value: number) => void }) {
  const id = useId();
  const safeValue = Number.isFinite(value) ? value : min;
  // Widen the display range for existing profiles instead of clamping their saved values.
  const lower = Math.min(min, safeValue);
  const upper = Math.max(max, safeValue);
  const display = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(safeValue);
  return <label className="profile-slider" htmlFor={id} style={{ '--slider-fill': `${(safeValue - lower) / (upper - lower) * 100}%`, '--slider-color': color } as CSSProperties}>
    <span className="profile-slider-heading"><span><Icon name={icon} size={17}/>{label}</span><output htmlFor={id}>{display}<small>{unit}</small></output></span>
    <input id={id} type="range" aria-label={label} aria-valuetext={`${display} ${unit}`} value={safeValue} min={lower} max={upper} step={step} onChange={event => onChange(event.target.valueAsNumber)}/>
    <span className="profile-slider-limits" aria-hidden="true"><span>{lower}</span><span>{upper}</span></span>
  </label>;
}

export function ProfileForm({ astronauts, initial, onSave }: { astronauts: CrewProfile[]; initial?: CrewProfile; onSave: (profile: CrewProfile) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? 'Astronaut');
  const [templateId, setTemplateId] = useState(astronauts[0]?.id ?? '');
  const template = initial ?? astronauts.find(person => person.id === templateId);
  const [age, setAge] = useState(template?.age ?? 40);
  const [mass, setMass] = useState(template?.mass_kg ?? 70);
  const [baseline, setBaseline] = useState<CrewProfile['baseline']>(template?.baseline ?? { hip_bmd_g_cm2: 1, spine_bmd_g_cm2: 1, leg_lean_mass_kg: 18, vo2max_ml_kg_min: 40 });
  const valid = Boolean(template && name.trim() && Number.isInteger(age) && mass >= 1 && mass <= 500 && measurements.every(measurement => Number.isFinite(baseline[measurement.key]) && baseline[measurement.key] >= 0.001 && baseline[measurement.key] <= 1000));
  return <form className="profile-form" onSubmit={event => { event.preventDefault(); if (template && valid) onSave({ ...structuredClone(template), id: initial?.id ?? `crew_portrait_${crewPortraitIndex(template)}_${crypto.randomUUID()}`, name: name.trim(), role: role.trim() || 'Astronaut', age, mass_kg: mass, baseline: { ...baseline } }); }}>
    {!initial && <fieldset className="profile-template-picker"><legend>Starting profile</legend><div>{astronauts.map(person => <button type="button" key={person.id} aria-label={`Use ${person.name} template`} aria-pressed={templateId === person.id} onClick={() => { setTemplateId(person.id); setAge(person.age); setMass(person.mass_kg); setBaseline({ ...person.baseline }); }}><Avatar profile={person}/><span>{person.name.split(' ')[0]}</span>{templateId === person.id && <Icon name="check" size={15}/>}</button>)}</div></fieldset>}
    <div className="profile-name-fields"><label className="workspace-field">Name<input required autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Crew name"/></label><label className="workspace-field">Role<input maxLength={80} value={role} onChange={event => setRole(event.target.value)}/></label></div>
    <div className="profile-range-grid profile-body-ranges"><ProfileRange label="Age" value={age} min={18} max={90} step={1} unit="years" icon="astronauts" onChange={setAge}/><ProfileRange label="Mass" value={mass} min={40} max={130} step={0.5} unit="kg" icon="weight" onChange={setMass}/></div>
    <fieldset className="profile-baseline-ranges"><legend>Baseline measurements</legend><div className="profile-range-grid">{measurements.map(({ key, ...measurement }) => <ProfileRange key={key} {...measurement} value={baseline[key]} onChange={value => setBaseline(current => ({ ...current, [key]: value }))}/>)}</div></fieldset>
    <details className="profile-exact-values"><summary>Exact values<Icon name="chevron" size={15}/></summary><div className="profile-exact-grid"><label className="workspace-field">Age <span>years</span><input aria-label="Age exact value" required type="number" step={1} value={Number.isFinite(age) ? age : ''} onChange={event => setAge(event.target.valueAsNumber)}/></label><label className="workspace-field">Mass <span>kg</span><input aria-label="Mass exact value" required type="number" min={1} max={500} step="any" value={Number.isFinite(mass) ? mass : ''} onChange={event => setMass(event.target.valueAsNumber)}/></label>{measurements.map(measurement => <label className="workspace-field" key={measurement.key}>{measurement.label}<span>{measurement.unit}</span><input aria-label={`${measurement.label} exact value`} type="number" required min={0.001} max={1000} step="any" value={Number.isFinite(baseline[measurement.key]) ? baseline[measurement.key] : ''} onChange={event => setBaseline(current => ({ ...current, [measurement.key]: event.target.valueAsNumber }))}/></label>)}</div></details>
    <button type="submit" className="button button-light full-width" disabled={!valid}>{initial ? 'Save profile' : 'Add crew'}<Icon name="arrow" size={18}/></button>
  </form>;
}

export function ProfileDetails({ profile, flights, ready, onOpen, onNew, onEdit }: { profile: CrewProfile; flights: Flight[]; ready: boolean; onOpen: (id: string) => void; onNew: () => void; onEdit: () => void }) {
  const linked = flights.filter(flight => flight.request.crew.id === profile.id && !flight.archived);
  return <div className="profile-details">
    <div className="profile-detail"><Avatar profile={profile} className="profile-detail-portrait"/><div><h3>{profile.name}</h3><p>{profile.role}</p><span className="profile-bio-values">{profile.age} years<span>{profile.mass_kg} kg</span></span></div><IconButton label="Edit profile" icon="edit" tooltip={false} onClick={onEdit}/></div>
    <div className="profile-measurement-grid">{measurements.map(measurement => <div key={measurement.key}><Icon name={measurement.icon} size={19}/><span>{measurement.label}</span><strong>{profile.baseline[measurement.key]}<small>{measurement.unit}</small></strong></div>)}</div>
    <div className="profile-flights-heading"><h3>Flights</h3><button className="quiet-link" disabled={!ready} onClick={onNew}><Icon name="plus" size={17}/>New flight</button></div>
    {linked.length ? <div className="linked-flights">{linked.map(flight => <button key={flight.id} onClick={() => onOpen(flight.id)}><DestinationVisual destination={flight.request.mission.destination}/><span><strong>{flight.name}</strong><small>{destination(flight)} / {flight.request.mission.duration_days} days</small></span><Icon name="arrow" size={18}/></button>)}</div> : <p className="profile-no-flights">No flights</p>}
  </div>;
}
