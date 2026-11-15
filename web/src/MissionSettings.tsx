import { useEffect, useState } from 'react';
import type { CrewProfile, ForecastRequest, InjuryInfo, InjuryType } from './types';

export function MissionSettings({ value, crew, injuries, onChange }: {
  value: ForecastRequest; crew: CrewProfile[]; injuries: InjuryInfo[]; onChange: (value: ForecastRequest) => void;
}) {
  const [duration, setDuration] = useState(String(value.mission.duration_days));
  useEffect(() => setDuration(String(value.mission.duration_days)), [value.mission.duration_days]);
  function commitDuration() {
    const parsed = Number(duration);
    if (!duration.trim() || !Number.isFinite(parsed)) { setDuration(String(value.mission.duration_days)); return; }
    const days = Math.max(7, Math.min(900, Math.round(parsed)));
    setDuration(String(days));
    onChange({ ...value, mission: { ...value.mission, duration_days: days, eva_days: value.mission.eva_days.filter(d => d <= days) },
      injury: value.injury ? { ...value.injury, day: Math.min(value.injury.day, days) } : null });
  }
  return <div className="mission-settings">
    <p className="panel-intro">Choose a crew member and the mission you want to explore.</p>
    <label>Crew member<select aria-label="Crew member" value={value.crew.id} onChange={e => onChange({ ...value, crew: crew.find(c => c.id === e.target.value)! })}>
      {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <p className="field-note">Fictional crew profiles. These are not personal health predictions.</p>
    <label>Destination<select aria-label="Destination" value={value.mission.destination} onChange={e => onChange({ ...value, mission: { ...value.mission, destination: e.target.value as 'ISS' | 'MOON' | 'MARS' } })}>
      <option value="ISS">International Space Station</option><option value="MOON">Moon</option><option value="MARS">Mars</option></select></label>
    <label>Time in space<input aria-label="Mission length" type="number" min="7" max="900" step="1" value={duration} onChange={e => setDuration(e.target.value)} onBlur={commitDuration} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/></label>
    <p className="field-note mission-preset-note">Days from launch to landing. Choose 7–900 days.</p>
    <p className="field-note">All destinations use ISS-based rates. Moon/Mars surface gravity is not simulated.</p>
    <details><summary>Optional injury scenario{value.injury ? " · included" : ""}</summary><p className="field-note">An optional illustration. Injury severity and healing times are assumptions.</p>
    <label>Injury<select aria-label="Injury" value={value.injury?.type ?? ''} onChange={e => {
      const type = e.target.value as InjuryType;
      onChange({ ...value, injury: type ? { type, severity: 2, day: Math.min(40, value.mission.duration_days), side: type === 'lower_back_strain' ? null : 'left' } : null });
    }}><option value="">No injury</option>{injuries.map(i => <option key={i.type} value={i.type}>{i.label}</option>)}</select></label>
    {value.injury && <>
      <div className="field-pair"><label>Severity<select aria-label="Injury severity" value={value.injury.severity} onChange={e => onChange({ ...value, injury: { ...value.injury!, severity: Number(e.target.value) as 1 | 2 | 3 } })}>
        <option value="1">Mild</option><option value="2">Moderate</option><option value="3">Severe</option></select></label>
      {value.injury.type !== 'lower_back_strain' && <label>Side<select aria-label="Injury side" value={value.injury.side!} onChange={e => onChange({ ...value, injury: { ...value.injury!, side: e.target.value as 'left' | 'right' } })}>
        <option value="left">Left</option><option value="right">Right</option></select></label>}</div>
      <label>When it happens <strong>Day {value.injury.day}</strong><input aria-label="Injury day" type="range" min="0" max={value.mission.duration_days} value={value.injury.day}
        onChange={e => onChange({ ...value, injury: { ...value.injury!, day: Number(e.target.value) } })} /></label>
    </>}
    </details>
  </div>;
}
