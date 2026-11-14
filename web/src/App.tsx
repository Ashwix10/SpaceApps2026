import { useEffect, useMemo, useRef, useState } from 'react';
import { ForecastCharts, PlanControls, tissueLabels } from './DashboardPanels';
import './dashboard.css';
import { createApi } from './api';
import { BodyTwin } from './body';
import type { CompareResponse, Countermeasures, CrewProfile, Defaults, ForecastRequest, ForecastResponse, HealthResponse, InjuryInfo, InjuryType, RegionId, SeriesKey } from './types';

const labels = tissueLabels;
const demoSteps = [
  ['Meet the crew', 'Start at preflight baseline with the standard daily plan.'],
  ['Time in microgravity', 'Watch the timeline advance before the injury.'],
  ['Day 40: ankle sprain', 'The affected leg changes while the rest of the body follows the same forecast.'],
  ['Compare the plans', 'Inspect bone and muscle retention alongside the aerobic-fitness trade-off at landing.'],
  ['Recovery on Earth', 'Move sixty days beyond landing to inspect recovery toward baseline.'],
  ['Planning without the ground', 'The Mars scenario illustrates local, offline planning; destination-specific rates are not yet modeled.'],
];

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
  const [alternative, setAlternative] = useState<Countermeasures>();
  const [editing, setEditing] = useState<'current' | 'alternative'>('current');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [audience, setAudience] = useState<'crew' | 'surgeon'>('crew');
  const [explaining, setExplaining] = useState(false);
  const explanationGeneration = useRef(0);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoRun, setDemoRun] = useState(0);
  const [demoComplete, setDemoComplete] = useState(false);

  useEffect(() => {
    let active = true;
    setBusy(true); setError(''); setHealth(undefined); setInput(undefined); setForecast(undefined); setComparison(null); setNote('');
    Promise.all([api.health(), api.crew(), api.injuries(), api.defaults()]).then(([h, c, i, d]) => {
      if (!active) return;
      setHealth(h); setCrew(c); setInjuries(i); setDefaults(d);
      const { alternative: _, ...request } = d.demo;
      setInput(request); setAlternative(structuredClone(d.demo.alternative)); setDay(0);
      setCompare(false); setPlaying(false); setDemoStep(null); setDemoComplete(false); setEditing('current');
    }).catch(e => { if (active) setError(`Cannot connect: ${e.message}. Start the API, retry, or select mock mode.`); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api, retry]);

  useEffect(() => {
    if (!input || !defaults || !alternative) return;
    let active = true;
    setBusy(true); setError(''); setNote('');
    const timer = setTimeout(() => {
      const task = compare ? api.compare({ request: input, alternative }) : api.forecast(input);
      task.then(result => {
        if (!active) return;
        if ('baseline' in result) { setForecast(result.baseline); setComparison(result); }
        else { setForecast(result); setComparison(null); }
        setDay(d => Math.min(d, input.mission.duration_days + 90));
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [api, input, defaults, compare, alternative]);

  useEffect(() => {
    explanationGeneration.current++;
    setNote(''); setExplaining(false);
  }, [input, alternative, compare, audience, api]);

  useEffect(() => {
    if (!playing || !forecast || busy) return;
    const end = forecast.days.length - 1;
    if (day >= end) { setPlaying(false); return; }
    const timer = setTimeout(() => setDay(Math.min(end, day + speed)), 1000);
    return () => clearTimeout(timer);
  }, [playing, speed, forecast, busy, day]);

  useEffect(() => {
    if (demoStep === null || !defaults) return;
    const { alternative: nextPlan, ...seed } = structuredClone(defaults.demo);
    setPlaying(false);
    if (demoStep === 0) {
      setInput({ ...seed, injury: null }); setAlternative(nextPlan); setCompare(false); setDay(0); setSpeed(1); setSelected(null); setEditing('current');
    } else if (demoStep === 1) { setDay(35); setPlaying(true); }
    else if (demoStep === 2) { setInput(seed); setDay(seed.injury?.day ?? 40); }
    else if (demoStep === 3) { setCompare(true); setEditing('alternative'); setDay(seed.mission.duration_days); }
    else if (demoStep === 4) setDay(seed.mission.duration_days + 60);
    else setInput(previous => previous ? { ...previous, mission: { ...previous.mission, destination: 'MARS' } } : previous);
  }, [demoStep, demoRun, defaults]);

  useEffect(() => {
    if (demoStep === null || busy) return;
    const timer = setTimeout(() => {
      if (demoStep < demoSteps.length - 1) setDemoStep(demoStep + 1);
      else { setDemoStep(null); setDemoComplete(true); setPlaying(false); }
    }, 4000);
    return () => clearTimeout(timer);
  }, [demoStep, busy, demoRun]);

  function interruptDemo(event: { target: EventTarget | null }) {
    if (demoStep !== null && !(event.target instanceof Element && event.target.closest('[data-demo-control]'))) {
      setDemoStep(null); setPlaying(false);
    }
  }
  const shownComparison = compare ? comparison : null;
  const injuredRegion: RegionId | null = !input?.injury ? null : input.injury.type === 'lower_back_strain' ? 'spine' :
    `${input.injury.side}_${input.injury.type === 'wrist_fracture' ? 'arm' : 'leg'}` as RegionId;

  return <main onClick={interruptDemo} onKeyDown={interruptDemo}>
    <header><div><span className="eyebrow">ASTROTWIN / MISSION HEALTH</span><h1>Your crew. Their next horizon.</h1></div>
      <div className="dashboard-actions"><button data-demo-control disabled={!defaults || (busy && demoStep === null)} onClick={() => {
        if (demoStep !== null) { setDemoStep(null); setPlaying(false); }
        else { setDemoComplete(false); setDemoRun(v => v + 1); setDemoStep(0); }
      }}>{demoStep === null ? 'Run demo' : 'Stop demo'}</button>
      <label className="mode"><input type="checkbox" checked={mocks} onChange={e => setMocks(e.target.checked)} /> Mock mode</label></div></header>
    <div className="notice"><span className="dot" /> {mocks ? 'LOCAL MOCKS' : health ? 'API CONNECTED' : 'API DISCONNECTED'} · {health?.model_version ?? 'Waiting for server'}
      <span>Development parameters · Not clinically validated</span></div>
    {error && <div role="alert" className="error">{error} <button onClick={() => setRetry(x => x + 1)}>Retry connection</button></div>}
    <p className="forecast-updating" role="status">{busy ? 'Updating forecast…' : forecast ? 'Forecast ready' : 'Connecting to local engine…'}</p>
    {(demoStep !== null || demoComplete) && <div className="demo-banner" role="status"><div>
      <strong>{demoStep !== null ? `${demoStep + 1} / ${demoSteps.length} · ${demoSteps[demoStep][0]}` : 'Demo complete'}</strong>
      <p>{demoStep !== null ? demoSteps[demoStep][1] : 'Explore the controls to inspect your own scenario.'}</p>
    </div><small>{demoStep !== null ? 'Any manual interaction stops the demo' : 'Local simulation'}</small></div>}
    {input && <>
      <div className="layout"><aside className="panel"><span className="eyebrow">01 / MISSION SETUP</span><h2>Crew & mission</h2>
        <label>Crew member<select value={input.crew.id} onChange={e => setInput({ ...input, crew: crew.find(c => c.id === e.target.value)! })}>{crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <p>{input.crew.role} · Age {input.crew.age} · {input.crew.mass_kg} kg</p>
        <label>Destination<select value={input.mission.destination} onChange={e => setInput({ ...input, mission: { ...input.mission, destination: e.target.value as 'ISS' | 'MOON' | 'MARS' } })}><option>ISS</option><option>MOON</option><option>MARS</option></select></label>
        <label>Mission length · {input.mission.duration_days} days<input type="range" min="7" max="900" value={input.mission.duration_days} onChange={e => {
          const duration = Number(e.target.value);
          setInput({ ...input, mission: { ...input.mission, duration_days: duration, eva_days: defaults!.mission.eva_days.filter(d => d <= duration) }, injury: input.injury ? { ...input.injury, day: Math.min(input.injury.day, duration) } : null });
        }} /></label>
        <small className="scenario-note">{input.mission.destination === 'MARS' ? 'Mars: delayed-communication scenario. Forecasts run locally.' : input.mission.destination === 'MOON' ? 'Moon mission scenario.' : 'ISS mission scenario.'} Destination-specific gravity effects are not yet modeled.</small>
        <h2>In-flight injury</h2><label>Injury type<select value={input.injury?.type ?? ''} onChange={e => {
          const type = e.target.value as InjuryType;
          setInput({ ...input, injury: type ? { type, severity: 2, day: Math.min(40, input.mission.duration_days), side: type === 'lower_back_strain' ? null : 'left' } : null });
        }}><option value="">None</option>{injuries.map(i => <option value={i.type} key={i.type}>{i.label}</option>)}</select></label>
        {input.injury && <><label>Severity<select value={input.injury.severity} onChange={e => setInput({ ...input, injury: { ...input.injury!, severity: Number(e.target.value) as 1 | 2 | 3 } })}><option value="1">Mild</option><option value="2">Moderate</option><option value="3">Severe</option></select></label>
          {input.injury.type !== 'lower_back_strain' && <label>Side<select value={input.injury.side!} onChange={e => setInput({ ...input, injury: { ...input.injury!, side: e.target.value as 'left' | 'right' } })}><option value="left">Left</option><option value="right">Right</option></select></label>}
          <label>Injury day · {input.injury.day}<input type="range" min="0" max={input.mission.duration_days} value={input.injury.day} onChange={e => setInput({ ...input, injury: { ...input.injury!, day: Number(e.target.value) } })} /></label></>}
      </aside>
      <section className="panel center">{forecast ? <BodyTwin regions={forecast.regions} day={day} compareRegions={shownComparison?.alternative.regions} injuredRegion={input.injury && day >= input.injury.day ? injuredRegion : null} selectedRegion={selected} onRegionSelect={setSelected} /> : <p>Waiting for the first forecast.</p>}</section>
      <aside className="panel"><span className="eyebrow">02 / COUNTERMEASURES</span><h2>Daily plan</h2>
        <label className="check"><input type="checkbox" checked={compare} onChange={e => { setCompare(e.target.checked); setEditing(e.target.checked ? 'alternative' : 'current'); }} /> Compare plans</label>
        <div className="plan-tabs" role="group" aria-label="Plan to edit"><button aria-pressed={editing === 'current'} onClick={() => setEditing('current')}>Current plan</button>
          <button disabled={!compare} aria-pressed={editing === 'alternative'} onClick={() => setEditing('alternative')}>New plan</button></div>
        {alternative && <PlanControls value={editing === 'alternative' && compare ? alternative : input.countermeasures}
          baseline={editing === 'alternative' && compare ? input.countermeasures : undefined} name={editing === 'alternative' && compare ? 'New plan' : 'Current plan'}
          onChange={value => editing === 'alternative' && compare ? setAlternative(value) : setInput({ ...input, countermeasures: value })} />}
        <div className="dashboard-actions">{compare && <button onClick={() => setAlternative({ ...input.countermeasures })}>Copy current plan</button>}
          <button onClick={() => { setInput({ ...input, countermeasures: { ...defaults!.countermeasures } }); setAlternative({ ...defaults!.demo.alternative }); }}>Reset plans</button></div>
        {compare && <small>Compare retention and fitness together; changing exercise balance can improve one outcome while worsening another.</small>}
        <h2>Mission risk</h2>{forecast && Object.entries(forecast.risks).map(([key, risk]) => {
          const other = shownComparison?.alternative.risks[key as keyof ForecastResponse['risks']];
          const change = other ? other.score - risk.score : 0;
          return <div className={`risk ${risk.level}`} key={key}><strong>{key.replaceAll('_', ' ')} · {risk.level} · {risk.score}/100</strong><small>{risk.reason}</small>
            {other && <span className="risk-change">New plan: <b>{other.level} · {other.score}/100</b> ({change > 0 ? '+' : ''}{change} risk points)</span>}</div>;
        })}
      </aside></div>
      {forecast && <section className="panel timeline"><div className="section-title"><h2>Mission timeline</h2>
        <div className="playback-controls"><button disabled={busy} onClick={() => { if (day >= forecast.days.length - 1) setDay(0); setPlaying(v => !v); }}>{playing ? 'Pause' : 'Play'}</button>
          <select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1x</option><option value="4">4x</option><option value="16">16x</option></select>
          <strong>{day <= forecast.landing_day ? `Day ${day} of ${forecast.landing_day}` : `Day ${day - forecast.landing_day} after landing`}</strong></div></div>
        <input aria-label="Mission day" type="range" min="0" max={forecast.days.length - 1} value={day} disabled={busy} onChange={e => { setDay(Number(e.target.value)); setPlaying(false); }} />
        <div className="events">{forecast.events.map((event, i) => <button key={i} onClick={() => { setDay(event.day); setPlaying(false); }}>{event.label} · D{event.day}</button>)}</div>
        <div className="metrics">{Object.entries(labels).map(([key, label]) => <div key={key}><span>{label}</span><strong>{forecast.series[key as SeriesKey][day]}<small>%</small></strong>
          {shownComparison && <small>New plan: {shownComparison.alternative.series[key as SeriesKey][day]}%</small>}</div>)}</div>
        {selected && <p className="selected-region-note">Selected: {selected.replaceAll('_', ' ')} · Related tissue chart highlighted. Global tissue curves do not include the full local injury dip.</p>}
        <ForecastCharts forecast={forecast} comparison={shownComparison} day={day} selected={selected} />
        <small>Shaded envelopes show the model's illustrative uncertainty range; these are not calibrated confidence intervals.</small>
        <div className="explanation-card"><div className="dashboard-actions"><label>Audience<select aria-label="Explanation audience" value={audience} onChange={e => setAudience(e.target.value as 'crew' | 'surgeon')}><option value="crew">Crew</option><option value="surgeon">Surgeon</option></select></label>
          <button disabled={busy || explaining} onClick={async () => {
            const generation = explanationGeneration.current;
            setExplaining(true); setError('');
            try { const result = await api.explain({ forecast, comparison: shownComparison, crew_name: input.crew.name, audience }); if (generation === explanationGeneration.current) setNote(`${result.text} (${result.source})`); }
            catch (e) { if (generation === explanationGeneration.current) setError((e as Error).message); }
            finally { if (generation === explanationGeneration.current) setExplaining(false); }
          }}>{explaining ? 'Explaining…' : 'Explain forecast'}</button></div>
          {note && <p role="status">{note}</p>}
        </div>
      </section>}
    </>}
    <footer>AstroTwin · Development simulation · Not for clinical decisions · <a href="?sandbox=body">Body developer sandbox</a></footer>
  </main>;
}
