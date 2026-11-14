import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createApi } from './api';
import { BodyTwin } from './body';
import type { CompareResponse, CrewProfile, Defaults, ForecastRequest, ForecastResponse, HealthResponse, InjuryInfo, InjuryType, RegionId, SeriesKey } from './types';

const labels: Record<SeriesKey, string> = { hip_bmd_pct: 'Hip bone', spine_bmd_pct: 'Spine bone', leg_muscle_pct: 'Leg muscle', vo2max_pct: 'Aerobic fitness' };
const colors = ['#4FD1FF', '#A78BFA', '#34D399', '#F59E0B'];

export function App() {
  const [mocks, setMocks] = useState(import.meta.env.VITE_USE_MOCKS === 'true');
  const api = useMemo(() => createApi(mocks), [mocks]);
  const [retry, setRetry] = useState(0);
  const [crew, setCrew] = useState<CrewProfile[]>([]);
  const [injuries, setInjuries] = useState<InjuryInfo[]>([]);
  const [defaults, setDefaults] = useState<Defaults>();
  const [health, setHealth] = useState<HealthResponse>();
  const [input, setInput] = useState<ForecastRequest>();
  const [forecast, setForecast] = useState<ForecastResponse>();
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<RegionId | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    let active = true;
    setBusy(true); setError(''); setHealth(undefined); setInput(undefined); setForecast(undefined); setComparison(null); setNote('');
    Promise.all([api.health(), api.crew(), api.injuries(), api.defaults()]).then(([h, c, i, d]) => {
      if (!active) return;
      setHealth(h); setCrew(c); setInjuries(i); setDefaults(d);
      const { alternative: _, ...request } = d.demo;
      setInput(request); setDay(0);
    }).catch(e => { if (active) setError(`Cannot connect: ${e.message}. Start the API, retry, or select mock mode.`); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api, retry]);

  useEffect(() => {
    if (!input || !defaults) return;
    let active = true;
    setBusy(true); setError(''); setNote('');
    const timer = setTimeout(() => {
      const task = compare ? api.compare({ request: input, alternative: defaults.demo.alternative }) : api.forecast(input);
      task.then(result => {
        if (!active) return;
        if ('baseline' in result) { setForecast(result.baseline); setComparison(result); }
        else { setForecast(result); setComparison(null); }
        setDay(d => Math.min(d, input.mission.duration_days + 90));
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [api, input, defaults, compare]);

  const rows = forecast?.days.map((d, i) => ({ day: d, ...Object.fromEntries(Object.keys(labels).map(k => [k, forecast.series[k as SeriesKey][i]])),
    alternative: comparison?.alternative.series.leg_muscle_pct[i] }));
  const injuredRegion: RegionId | null = !input?.injury ? null : input.injury.type === 'lower_back_strain' ? 'spine' :
    `${input.injury.side}_${input.injury.type === 'wrist_fracture' ? 'arm' : 'leg'}` as RegionId;

  return <main>
    <header><div><span className="eyebrow">ASTROTWIN / MISSION HEALTH</span><h1>Your crew. Their next horizon.</h1></div>
      <label className="mode"><input type="checkbox" checked={mocks} onChange={e => setMocks(e.target.checked)} /> Mock mode</label></header>
    <div className="notice"><span className="dot" /> {mocks ? 'LOCAL MOCKS' : health ? 'API CONNECTED' : 'API DISCONNECTED'} · {health?.model_version ?? 'Waiting for server'}
      <span>Development parameters · Not clinically validated</span></div>
    {error && <div role="alert" className="error">{error} <button onClick={() => setRetry(x => x + 1)}>Retry connection</button></div>}
    {busy && <p role="status">Loading forecast…</p>}
    {input && <>
      <div className="layout"><aside className="panel"><span className="eyebrow">01 / MISSION SETUP</span><h2>Crew & mission</h2>
        <label>Crew member<select value={input.crew.id} onChange={e => setInput({ ...input, crew: crew.find(c => c.id === e.target.value)! })}>{crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <p>{input.crew.role} · Age {input.crew.age} · {input.crew.mass_kg} kg</p>
        <label>Destination<select value={input.mission.destination} onChange={e => setInput({ ...input, mission: { ...input.mission, destination: e.target.value as 'ISS' | 'MOON' | 'MARS' } })}><option>ISS</option><option>MOON</option><option>MARS</option></select></label>
        <label>Mission length · {input.mission.duration_days} days<input type="range" min="7" max="900" value={input.mission.duration_days} onChange={e => {
          const duration = Number(e.target.value);
          setInput({ ...input, mission: { ...input.mission, duration_days: duration, eva_days: defaults!.mission.eva_days.filter(d => d <= duration) }, injury: input.injury ? { ...input.injury, day: Math.min(input.injury.day, duration) } : null });
        }} /></label>
        <h2>In-flight injury</h2><label>Injury type<select value={input.injury?.type ?? ''} onChange={e => {
          const type = e.target.value as InjuryType;
          setInput({ ...input, injury: type ? { type, severity: 2, day: Math.min(40, input.mission.duration_days), side: type === 'lower_back_strain' ? null : 'left' } : null });
        }}><option value="">None</option>{injuries.map(i => <option value={i.type} key={i.type}>{i.label}</option>)}</select></label>
        {input.injury && <><label>Severity<select value={input.injury.severity} onChange={e => setInput({ ...input, injury: { ...input.injury!, severity: Number(e.target.value) as 1 | 2 | 3 } })}><option value="1">Mild</option><option value="2">Moderate</option><option value="3">Severe</option></select></label>
          {input.injury.type !== 'lower_back_strain' && <label>Side<select value={input.injury.side!} onChange={e => setInput({ ...input, injury: { ...input.injury!, side: e.target.value as 'left' | 'right' } })}><option value="left">Left</option><option value="right">Right</option></select></label>}
          <label>Injury day · {input.injury.day}<input type="range" min="0" max={input.mission.duration_days} value={input.injury.day} onChange={e => setInput({ ...input, injury: { ...input.injury!, day: Number(e.target.value) } })} /></label></>}
      </aside>
      <section className="panel center">{forecast ? <BodyTwin regions={forecast.regions} day={day} compareRegions={comparison?.alternative.regions} injuredRegion={injuredRegion} selectedRegion={selected} onRegionSelect={setSelected} /> : <p>Waiting for the first forecast.</p>}</section>
      <aside className="panel"><span className="eyebrow">02 / COUNTERMEASURES</span><h2>Daily plan</h2>
        {([
          ['resistance_min_per_day', 'Resistance · min', 0, 120, 5], ['aerobic_min_per_day', 'Aerobic · min', 0, 120, 5],
          ['protein_g_per_kg', 'Protein · g/kg', 0.8, 2, 0.1], ['calorie_pct', 'Calorie target · %', 80, 110, 1],
        ] as const).map(([key, label, min, max, step]) => <label key={key}>{label}<strong>{input.countermeasures[key]}</strong><input type="range" min={min} max={max} step={step} value={input.countermeasures[key]} onChange={e => setInput({ ...input, countermeasures: { ...input.countermeasures, [key]: Number(e.target.value) } })} /></label>)}
        <label className="check"><input type="checkbox" checked={input.countermeasures.bisphosphonate} onChange={e => setInput({ ...input, countermeasures: { ...input.countermeasures, bisphosphonate: e.target.checked } })} /> Bone medication</label>
        <label className="check"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} /> Compare with demo alternative</label>
        {compare && <small>Alternative: 90 min resistance, 45 min aerobic, 1.6 g/kg protein, 100% calories, medication on. Compare the projected trade-offs; better bone retention may come with lower aerobic fitness.</small>}
        <h2>Mission risk</h2>{forecast && Object.entries(forecast.risks).map(([key, risk]) => <div className={`risk ${risk.level}`} key={key}><strong>{key.replaceAll('_', ' ')} · {risk.score}/100</strong><small>{risk.reason}</small></div>)}
      </aside></div>
      {forecast && <section className="panel timeline"><div className="section-title"><h2>Mission timeline</h2><strong>Day {day} / {forecast.days.length - 1}</strong></div>
        <input aria-label="Mission day" type="range" min="0" max={forecast.days.length - 1} value={day} onChange={e => setDay(Number(e.target.value))} />
        <div className="events">{forecast.events.map((event, i) => <button key={i} onClick={() => setDay(event.day)}>{event.label} · D{event.day}</button>)}</div>
        <div className="metrics">{Object.entries(labels).map(([key, label]) => <div key={key}><span>{label}</span><strong>{forecast.series[key as SeriesKey][day]}<small>%</small></strong></div>)}</div>
        <ResponsiveContainer width="100%" height={230}><LineChart data={rows}><CartesianGrid stroke="#23304A" vertical={false} /><XAxis dataKey="day" minTickGap={40} stroke="#8A97AD" /><YAxis domain={[60, 105]} stroke="#8A97AD" /><Tooltip contentStyle={{ background: '#121829', borderColor: '#23304A' }} /><Legend />
          {Object.entries(labels).map(([key, name], i) => <Line key={key} name={name} dataKey={key} stroke={colors[i]} dot={false} isAnimationActive={false} />)}
          {comparison && <Line name="Alternative leg muscle" dataKey="alternative" stroke="#F472B6" strokeDasharray="5 5" dot={false} isAnimationActive={false} />}
        </LineChart></ResponsiveContainer>
        <button disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const result = await api.explain({ forecast, comparison, crew_name: input.crew.name, audience: 'crew' }); setNote(`${result.text} (${result.source})`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Explain forecast</button>
        {note && <p role="status">{note}</p>}
      </section>}
    </>}
    <footer>AstroTwin · Development simulation · Not for clinical decisions · <a href="?sandbox=body">Body developer sandbox</a></footer>
  </main>;
}
