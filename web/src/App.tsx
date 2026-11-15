import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from './Visuals';
import { PlanControls } from './DashboardPanels';
import { createApi } from './api';
import { SciencePanel } from './SciencePanel';
import { comparisonSummary } from './comparison';
import { MissionSettings } from './MissionSettings';
import { useWorkspace } from './useWorkspace';
import { archiveFlight, createFlight, updateFlight } from './workspace';
import { AstronautDirectory, FlightForm, ProfileDetails, ProfileForm, WorkspaceDialog, WorkspaceHome } from './WorkspaceUI';
import { pageFromHash, pageHref } from './navigation';
import type { Page } from './navigation';
import type { CompareResponse, Countermeasures, CrewProfile, Defaults, ForecastRequest, ForecastResponse, HealthResponse, InjuryInfo, RegionId, SeriesKey } from './types';
import './dashboard.css';
import './workspace.css';

const BodyTwin = lazy(() => import('./body').then(m => ({ default: m.BodyTwin })));
const ForecastCharts = lazy(() => import('./ForecastCharts').then(m => ({ default: m.ForecastCharts })));
const titles: Record<Page, string> = { home: 'Workspace', astronauts: 'Astronauts', mission: 'Flight setup', explore: 'Body view', compare: 'Compare routines', research: 'Research & sources' };
const names: Record<SeriesKey, string> = { hip_bmd_pct: 'Hip bone', spine_bmd_pct: 'Back bone', leg_muscle_pct: 'Leg lean tissue', vo2max_pct: 'Cardio fitness' };

function Brand() {
  return <a className="brand" href={pageHref('home')} aria-label="AstroTwin home"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="9" stroke="currentColor"/><ellipse cx="16" cy="16" rx="15" ry="5.5" transform="rotate(-38 16 16)" stroke="currentColor"/></svg><span>AstroTwin<span className="brand-dot">.</span></span></a>;
}
function Arrow() { return <Icon name="arrow" size={16}/>; }
function PageFrame({ page, children }: { page: Page; children: ReactNode }) {
  const reduce = useReducedMotion();
  return <motion.main id="main-content" className={`page page-${page}`} initial={{ opacity: 0, y: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -7 }} transition={{ duration: reduce ? 0 : .24, ease: [.22, 1, .36, 1] }}
    onAnimationComplete={() => document.getElementById('page-heading')?.focus({ preventScroll: true })}>{children}</motion.main>;
}
function Intro({ number, title, children, aside }: { number: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return <header className="page-intro"><div><p className="kicker"><span>{number}</span> Flight workspace</p><h1 id="page-heading" tabIndex={-1}>{title}</h1><p className="page-description">{children}</p></div>{aside && <div className="intro-aside">{aside}</div>}</header>;
}
function BodyLoading() { return <div className="body-loading" role="status"><span className="loading-ring"/>Preparing the human model</div>; }
function Loading() { return <div className="page-loading" role="status"><span className="loading-ring"/><p>Preparing your mission…</p></div>; }

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash(location.hash));
  const { workspace, setWorkspace, storageError } = useWorkspace();
  const [dialog, setDialog] = useState<{ kind:'new-flight'|'rename-flight'|'new-profile'|'edit-profile'|'profile'; id?:string; crewId?:string } | null>(null);
  const activeFlight = workspace.flights.find(f=>f.id === workspace.activeFlightId && !f.archived);
  const input = activeFlight?.request;
  const alternative = activeFlight?.alternative;
  const crew = workspace.astronauts;
  function setInput(value:ForecastRequest) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{request:value})); }
  function setAlternative(value: Countermeasures | ((previous:Countermeasures | undefined)=>Countermeasures | undefined)) {
    if(!activeFlight) return;
    setWorkspace(previous=>{const current=previous.flights.find(f=>f.id===activeFlight.id);const next=typeof value === 'function' ? value(current?.alternative) : value;return next ? updateFlight(previous,activeFlight.id,{alternative:next}) : previous;});
  }
  function openFlight(id:string) {
    setForecast(undefined);setComparison(null);setDay(0);setSelected(null);setPlaying(false);setError('');setDialog(null);
    setWorkspace(previous=>({...previous,activeFlightId:id}));location.hash=pageHref('mission');
  }
  function saveProfile(profile:CrewProfile) {
    setWorkspace(previous=>({...previous,astronauts:previous.astronauts.some(c=>c.id===profile.id) ? previous.astronauts.map(c=>c.id===profile.id ? profile : c) : [...previous.astronauts,profile],
      flights:previous.flights.map(f=>f.request.crew.id===profile.id ? {...f,request:{...f.request,crew:{...f.request.crew,name:profile.name,role:profile.role}}} : f)}));
    setDialog({kind:'profile',id:profile.id});
  }
  const [retry, setRetry] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const mocks = import.meta.env.VITE_USE_MOCKS === 'true';
  const api = useMemo(() => createApi(mocks), [mocks]);
  const [injuries, setInjuries] = useState<InjuryInfo[]>([]);
  const [defaults, setDefaults] = useState<Defaults>();
  const [health, setHealth] = useState<HealthResponse>();
  const [forecast, setForecast] = useState<ForecastResponse>();
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<RegionId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const comparing = page === 'compare';

  useEffect(() => {
    const change = () => { const next = pageFromHash(location.hash); setPage(next); setPlaying(false); setChartsOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { document.title = `${titles[page]} — AstroTwin`; }, [page]);
  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    Promise.all([api.health(), api.crew(), api.injuries(), api.defaults()]).then(([h, c, i, d]) => {
      if (!active) return;
      setHealth(h); setInjuries(i); setDefaults(d);
      setWorkspace(previous=>previous.astronauts.length ? previous : {...previous,astronauts:c});
    }).catch(() => { if (active) setError('We could not connect to the mission service. Make sure AstroTwin is running, then try again.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api, retry, setWorkspace]);
  useEffect(() => {
    if (!input || !defaults || !alternative) return;
    let active = true;
    setBusy(true); setError('');
    const timer = setTimeout(() => {
      const request = comparing ? api.compare({ request: input, alternative }) : api.forecast(input);
      request.then(result => {
        if (!active) return;
        if ('baseline' in result) { setForecast(result.baseline); setComparison(result); }
        else { setForecast(result); }
        setDay(d => Math.min(d, input.mission.duration_days + 90));
      }).catch(() => { if (active) { setError('We could not update this mission. Your settings are kept here. Try again.'); setForecast(undefined); setComparison(null); } })
        .finally(() => { if (active) setBusy(false); });
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [api, input, alternative, defaults, comparing, refresh]);
  useEffect(() => {
    if (!playing || !forecast || busy || page !== 'explore') return;
    const end = forecast.days.length - 1;
    if (day >= end) { setPlaying(false); return; }
    const timer = setTimeout(() => setDay(Math.min(end, day + speed)), 1000);
    return () => clearTimeout(timer);
  }, [playing, day, speed, busy, forecast, page]);

  const landing = forecast?.landing_day ?? 180;
  const dayLabel = day === 0 ? 'Launch day' : day > landing ? `${day - landing} days after landing` : `Day ${day}`;
  const injury: RegionId | null = !input?.injury || day < input.injury.day ? null : input.injury.type === 'lower_back_strain' ? 'spine' : `${input.injury.side}_${input.injury.type === 'wrist_fracture' ? 'arm' : 'leg'}` as RegionId;
  const scope = input?.mission.destination !== 'ISS' && input ? 'Moon and Mars use the same ISS-based model. Surface gravity is not simulated.' : input && (input.mission.duration_days < 120 || input.mission.duration_days > 210) ? 'This duration goes beyond the model’s typical long-duration ISS reference.' : '';
  const connectionError = error && page !== 'research' ? <div className="error-notice" role="alert"><div><strong>Let’s try that again.</strong><p>{error}</p></div><button className="button button-outline" onClick={() => defaults ? setRefresh(v => v + 1) : setRetry(v => v + 1)}>Retry</button></div> : null;
  const additionalChanges = input && alternative && (input.countermeasures.protein_g_per_kg !== alternative.protein_g_per_kg || input.countermeasures.calorie_pct !== alternative.calorie_pct || input.countermeasures.bisphosphonate !== alternative.bisphosphonate);
  const dialogFlight = workspace.flights.find(f=>f.id===dialog?.id);
  const dialogProfile = crew.find(c=>c.id===dialog?.id);
  const ready = Boolean(defaults && crew.length);
  const noFlight = <div className="workspace-empty no-flight"><h2>Choose a flight to begin.</h2><p>Open a saved flight or create a new one from your workspace.</p><a className="button button-outline" href={pageHref('home')}>Go to workspace <Arrow/></a></div>;

  return <div className="workspace-shell">
    <aside className="app-sidebar"><Brand/><div className="sidebar-section"><span>WORKSPACE</span><nav aria-label="Workspace navigation">{(['home','astronauts','research'] as Page[]).map(route=><a key={route} href={pageHref(route)} aria-current={page===route ? 'page' : undefined}><Icon name={route}/>{titles[route]}</a>)}</nav></div>
      {activeFlight && <div className="sidebar-section current-flight-section"><span>CURRENT FLIGHT</span><strong>{activeFlight.name}</strong><nav aria-label="Flight navigation">{(['mission','explore','compare'] as Page[]).map(route=><a key={route} href={pageHref(route)} aria-current={page===route ? 'page' : undefined}><Icon name={route}/>{titles[route]}</a>)}</nav></div>}
      <div className="sidebar-mission-note"><Icon name="orbit" size={24}/><strong>Made for discovery.</strong><p>Human health,<br/>beyond Earth.</p><a href="#/research">Explore the science <Icon name="arrow" size={14}/></a></div><div className="sidebar-bottom"><span className="workspace-monogram">AT</span><div><strong>Local workspace</strong><span>{storageError ? 'Session only' : 'Saved on this browser'}</span></div></div>
    </aside><div className="site workbench">
    <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.querySelector<HTMLElement>('main h1')?.focus();}}>Skip to content</a>
    <header className="workbench-header"><div><a href={pageHref('home')}>Workspace</a><span>/</span>{activeFlight && ['mission','explore','compare'].includes(page) && <><strong>{activeFlight.name}</strong><span>/</span></>}<strong>{page==='home' ? 'Overview' : titles[page]}</strong></div><span className="save-state"><i/>{storageError ? 'Not saved' : 'Saved locally'}</span></header>
    {storageError && <div className="storage-notice" role="alert">{storageError}</div>}
    <AnimatePresence mode="wait" initial={false}><PageFrame key={page} page={page}>
      {page === 'home' && <>{connectionError}<WorkspaceHome workspace={workspace} ready={ready} onCreate={()=>setDialog({kind:'new-flight'})} onOpen={openFlight} onRename={id=>setDialog({kind:'rename-flight',id})} onArchive={(id,archived)=>setWorkspace(previous=>archiveFlight(previous,id,archived))} onDirectory={()=>{location.hash=pageHref('astronauts');}}/></>}
      {page === 'astronauts' && <>{connectionError}<AstronautDirectory astronauts={crew} flights={workspace.flights} ready={ready} onCreate={()=>setDialog({kind:'new-profile'})} onSelect={id=>setDialog({kind:'profile',id})}/></>}
      {page === 'mission' && <><Intro number="01" title="Flight setup." aside={<span className="quiet-tag">Your starting point</span>}>Choose the flight details and daily routine.</Intro>{connectionError}
        {input ? <><div className="mission-layout"><section className="surface mission-form"><div className="section-heading"><span className="section-number">01 / THE FLIGHT</span><h2>Where are we going?</h2></div><MissionSettings value={input} crew={crew} injuries={injuries} onChange={setInput}/></section>
          <section className="surface routine-form"><div className="section-heading"><span className="section-number">02 / THE ROUTINE</span><h2>Keep it moving.</h2><p>Choose an exercise scenario.</p></div><PlanControls value={input.countermeasures} name="Current routine" onChange={value => { setInput({ ...input, countermeasures: value }); setAlternative(previous => previous ? { ...previous, protein_g_per_kg: value.protein_g_per_kg, calorie_pct: value.calorie_pct, bisphosphonate: value.bisphosphonate } : previous); }}/></section></div>
          <div className="page-actions"><p>Fictional crew. Published research. Clearly labeled estimates.</p><a className="button button-light" href={pageHref('explore')}>See the mission <Arrow/></a></div></> : !input ? noFlight : !error && <Loading/>}
      </>}
      {page === 'explore' && <><Intro number="02" title="Body view." aside={<a className="quiet-link" href={pageHref('mission')}>Edit mission <Arrow/></a>}>From the first day in space to the return home.</Intro>{connectionError}
        {input && forecast ? <><div className={`explore-layout ${busy ? 'is-updating' : ''}`} aria-busy={busy}><aside className="readings"><div className="readings-heading"><span className="section-number">{dayLabel.toUpperCase()}</span><p>100% is the preflight level.</p></div>{(Object.keys(names) as SeriesKey[]).map((key, i) => <div className="reading" key={key}><div><span className="reading-index">0{i+1}</span><span>{names[key]}</span></div><strong>{forecast.series[key][day].toFixed(1)}<small>%</small></strong><div className="reading-rule"><i style={{width:`${Math.min(100,forecast.series[key][day])}%`}}/></div></div>)}<p className="reading-footnote">Model estimates, not live measurements.</p></aside>
          <section className="body-stage" aria-label="Interactive body"><div className="stage-topline"><span className="section-number">HUMAN REFERENCE</span><span>{busy ? 'Updating…' : day > landing ? 'Back on Earth' : 'In flight'}</span></div><Suspense fallback={<BodyLoading/>}><BodyTwin regions={forecast.regions} day={day} height={530} selectedRegion={selected} injuredRegion={injury} onRegionSelect={setSelected}/></Suspense></section></div>
          <section className="timeline" aria-label="Mission timeline"><button className="timeline-play" aria-label={playing ? 'Pause timeline' : 'Play timeline'} disabled={busy} onClick={() => { if(day >= forecast.days.length-1) setDay(0); setPlaying(v=>!v); }}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button><div className="timeline-core"><div className="timeline-meta"><strong>{dayLabel}</strong><span>{day <= landing ? `${landing} days in space` : 'Recovery on Earth'}</span></div><input aria-label="Mission day" type="range" min="0" max={forecast.days.length-1} value={day} disabled={busy} onChange={e=>{setDay(Number(e.target.value));setPlaying(false);}}/><div className="timeline-endpoints"><span>Launch</span><span>Landing · {landing} days</span><span>+90 days</span></div></div><label className="speed-control"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="4">4×</option><option value="16">16×</option></select></label></section>
          <div className="page-actions"><p>{scope || 'Color illustrates modeled change; the body is a generic reference.'}</p><a className="button button-outline" href={pageHref('compare')}>Compare routines <Arrow/></a></div></> : !input ? noFlight : !error && <Loading/>}
      </>}
      {page === 'compare' && <><Intro number="03" title="Compare routines.">Change the routine. Keep everything else in view.</Intro>{connectionError}
        {input && alternative && forecast && comparison ? <><div className="comparison-layout"><aside className="surface compare-controls"><span className="section-number">THE NEW ROUTINE</span><h2>A different daily rhythm.</h2><p className="current-routine">Current: {input.countermeasures.resistance_min_per_day + input.countermeasures.aerobic_min_per_day} minutes a day</p><PlanControls value={alternative} name="New routine" onChange={setAlternative}/></aside><section className={`comparison-result ${busy ? 'is-updating' : ''}`} aria-label="Routine comparison" aria-busy={busy}><div className="comparison-heading"><span className="section-number">AT LANDING / DAY {landing}</span><h2>{busy ? 'Updating the comparison…' : comparisonSummary(comparison)}</h2><p>Points use the scale where preflight is 100. Routine effects are model assumptions.{additionalChanges && " This comparison also changes food or medication; see Exact settings."}</p></div><div className="comparison-body"><Suspense fallback={<BodyLoading/>}><BodyTwin regions={comparison.baseline.regions} compareRegions={comparison.alternative.regions} day={landing} height={365} selectedRegion={selected} onRegionSelect={setSelected}/></Suspense></div><div className="comparison-measures">{(Object.keys(names) as SeriesKey[]).map(key=><div key={key}><span>{names[key]}</span><p>{comparison.baseline.series[key][landing].toFixed(1)}<small>%</small><span className="metric-arrow" aria-label="compared with">→</span><strong>{comparison.alternative.series[key][landing].toFixed(1)}<small>%</small></strong></p></div>)}</div></section></div>
          <details className="chart-disclosure" open={chartsOpen} onToggle={e=>setChartsOpen(e.currentTarget.open)}><summary><span>Look closer</span><span className="disclosure-subtitle">Changes through the mission</span><span className="disclosure-plus" aria-hidden="true">+</span></summary>{chartsOpen && <div className="chart-content"><Suspense fallback={<p role="status">Loading the charts…</p>}><ForecastCharts forecast={comparison.baseline} comparison={comparison} day={landing} selected={selected}/></Suspense><p className="field-note">Shaded bands show a sensitivity range, not statistical confidence. Leg lean tissue is not muscle strength.</p></div>}</details>
          <div className="page-actions"><p>{scope || 'Same mission and crew. Exercise is a scenario, not a prescription.'}</p><a className="quiet-link" href={pageHref('research')}>See what supports the estimates <Arrow/></a></div></> : !input ? noFlight : !error && <Loading/>}
      </>}
      {page === 'research' && <><Intro number="04" title="Research & sources." aside={<span className="quiet-tag">Sources, not promises</span>}>What is measured. What is modeled. What is still unknown.</Intro><div className="research-layout"><aside className="research-aside"><span className="section-number">OUR APPROACH</span><h2>Keep the evidence visible.</h2><p>Published human measurements anchor four rates. The daily curves remain a simplified educational model.</p><div className="research-note"><span className="live-dot"/><span>Independent project.<br/>No NASA endorsement implied.</span></div></aside><div className="research-content"><SciencePanel activeParamsVersion={health?.params_version}/><details className="asset-credit"><summary>About the human model</summary><p>The reference body uses MakeHuman’s CC0 base mesh, adapted for local rendering. It is a generic illustration, not an astronaut scan or a clinical reconstruction.</p><a href="https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md" target="_blank" rel="noopener noreferrer">MakeHuman source & license ↗</a></details></div></div></>}
    </PageFrame></AnimatePresence>
    {dialog && <WorkspaceDialog title={dialog.kind==='new-flight' ? 'New flight' : dialog.kind==='rename-flight' ? 'Rename flight' : dialog.kind==='new-profile' ? 'Add astronaut' : dialog.kind==='edit-profile' ? 'Edit astronaut' : 'Astronaut profile'} onClose={()=>setDialog(null)}>
      {(dialog.kind==='new-flight' || dialog.kind==='rename-flight') && <FlightForm astronauts={crew} initial={dialog.kind==='rename-flight' ? dialogFlight : undefined} preferredCrewId={dialog.crewId} onSave={(name,crewId)=>{
        if(dialog.kind==='rename-flight' && dialogFlight){setWorkspace(previous=>updateFlight(previous,dialogFlight.id,{name}));setDialog(null);return;}
        const astronaut=crew.find(c=>c.id===crewId);if(!defaults || !astronaut)return;
        const {alternative:_,...seed}=defaults.demo;
        const flight=createFlight(name,{...structuredClone(seed),crew:structuredClone(astronaut),injury:null});
        setWorkspace(previous=>({...previous,flights:[...previous.flights,flight],activeFlightId:flight.id}));setForecast(undefined);setComparison(null);setDay(0);setSelected(null);setDialog(null);location.hash=pageHref('mission');
      }}/> }
      {(dialog.kind==='new-profile' || dialog.kind==='edit-profile') && <ProfileForm astronauts={crew} initial={dialog.kind==='edit-profile' ? dialogProfile : undefined} onSave={saveProfile}/>}
      {dialog.kind==='profile' && dialogProfile && <ProfileDetails profile={dialogProfile} flights={workspace.flights} ready={ready} onOpen={openFlight} onNew={()=>setDialog({kind:'new-flight',crewId:dialogProfile.id})} onEdit={()=>setDialog({kind:'edit-profile',id:dialogProfile.id})}/>}
    </WorkspaceDialog>}
    <footer className="site-footer"><span>AstroTwin / Human health beyond Earth</span><span>{mocks ? 'Sample curves · Not research measurements' : 'Educational simulation · Not clinically validated'}</span>{page !== 'home' && page !== 'research' && <span className="service-state" role="status">{busy ? 'Updating' : error ? 'Connection interrupted' : health ? 'Ready' : 'Connecting'}</span>}</footer>
  </div></div>;
}
