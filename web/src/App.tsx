import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Avatar, Icon, SpaceBackdrop } from './Visuals';
import { PlanControls, RoutineOptimizer } from './DashboardPanels';
import { createApi } from './api';
import { SciencePanel } from './SciencePanel';
import { MissionSettings } from './MissionSettings';
import { useWorkspace } from './useWorkspace';
import { applyFlightRoutine, archiveFlight, createFlight, saveCrewProfile, updateFlight } from './workspace';
import type { RecommendationSettings, RoutineMode } from './workspace';
import type { RoutineObjective } from './routineOptimizer';
import { AstronautDirectory, FlightForm, ProfileDetails, ProfileForm, WorkspaceDialog, WorkspaceHome } from './WorkspaceUI';
import { pageFromHash, pageHref } from './navigation';
import type { Page } from './navigation';
import type { CompareResponse, Countermeasures, CrewProfile, Defaults, ForecastRequest, ForecastResponse, HealthResponse, InjuryInfo, RegionId, SeriesKey } from './types';
import './dashboard.css';
import './workspace.css';

const BodyTwin = lazy(() => import('./body').then(m => ({ default: m.BodyTwin })));
const ForecastCharts = lazy(() => import('./ForecastCharts').then(m => ({ default: m.ForecastCharts })));
const titles: Record<Page, string> = { home: 'Flights', astronauts: 'Crew', mission: 'Flight', explore: 'Body', compare: 'Routines', research: 'Research' };
const metrics: { key: SeriesKey; label: string; region: RegionId; baseline: keyof CrewProfile['baseline']; unit: string; precision: number; color: string }[] = [
  { key: 'hip_bmd_pct', label: 'Hip density', region: 'pelvis', baseline: 'hip_bmd_g_cm2', unit: 'g/cm²', precision: 3, color: '#f4b66e' },
  { key: 'spine_bmd_pct', label: 'Spine density', region: 'spine', baseline: 'spine_bmd_g_cm2', unit: 'g/cm²', precision: 3, color: '#aaa0ed' },
  { key: 'leg_muscle_pct', label: 'Leg lean mass', region: 'left_leg', baseline: 'leg_lean_mass_kg', unit: 'kg', precision: 2, color: '#73dbeb' },
  { key: 'vo2max_pct', label: 'VO₂peak', region: 'heart', baseline: 'vo2max_ml_kg_min', unit: 'mL/kg/min', precision: 1, color: '#fb887d' },
];
const changeLabel = (value: number) => Math.abs(value) < .05 ? '0.0%' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

function Brand() {
  return <a className="brand rail-brand" href={pageHref('home')} aria-label="AstroTwin home" data-tooltip="AstroTwin"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 24 16 7l9 17M11 18h10" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="16" cy="17" rx="14" ry="5" transform="rotate(-30 16 17)" stroke="currentColor" strokeOpacity=".45"/></svg></a>;
}
function PageFrame({ page, children }: { page: Page; children: ReactNode }) {
  const reduce = useReducedMotion();
  return <motion.main id="main-content" tabIndex={-1} className={`page page-${page}`} initial={{ opacity: reduce ? 1 : .5, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, transition: { duration: 0 } }} transition={{ duration: reduce ? 0 : .22, ease: [.22, 1, .36, 1] }}>{children}</motion.main>;
}
function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="page-title"><h1 id="page-heading" tabIndex={-1}>{title}</h1>{children}</header>;
}
function Loading({ body = false }: { body?: boolean }) {
  return <div className={`loading-scene ${body ? 'loading-body' : ''}`} role="status" aria-label="Loading simulation"><div className="loading-orbit"><span/><span/><span/></div><div className="loading-scan"/><span className="sr-only">Loading</span></div>;
}
function RoutineSummary({ routine, label }: { routine: Countermeasures; label: string }) {
  return <div className="routine-summary" aria-label={label}><span><strong>{routine.resistance_min_per_day}</strong> min strength</span><span><strong>{routine.aerobic_min_per_day}</strong> min cardio</span><span><strong>{routine.protein_g_per_kg.toFixed(1)}</strong> g/kg protein</span><span><strong>{routine.calorie_pct}%</strong> energy</span><span>Bone medication <strong>{routine.bisphosphonate ? 'On' : 'Off'}</strong></span></div>;
}
function Timeline({ forecast, day, playing, speed, busy, onDay, onPlay, onSpeed }: {
  forecast: ForecastResponse; day: number; playing: boolean; speed: number; busy: boolean;
  onDay: (day: number) => void; onPlay: () => void; onSpeed: (speed: number) => void;
}) {
  const end = forecast.days.length - 1;
  const landing = forecast.landing_day;
  const landingPercent = landing / end * 100;
  const phase = day === 0 ? 'Launch' : day === landing ? 'Landing' : day > landing ? 'Recovery' : 'In flight';
  return <section className="mission-timeline" aria-label="Mission timeline">
    <div className="timeline-controls"><button className="timeline-play" aria-label={playing ? 'Pause timeline' : 'Play timeline'} data-tooltip={playing ? 'Pause' : 'Play'} disabled={busy} onClick={onPlay}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="3"/> : <path d="m8 5 11 7-11 7Z" fill="currentColor"/>}</svg></button><div><strong>{phase}</strong><span>{day > landing ? `Day +${day - landing}` : `Day ${day}`}</span></div><div className="playback-speeds" aria-label="Playback speed">{[1,4,16].map(v=><button key={v} aria-label={`${v} times speed`} aria-pressed={speed===v} onClick={()=>onSpeed(v)}>{v}×</button>)}</div></div>
    <div className="timeline-track" style={{'--landing':`${landingPercent}%`, '--progress':`${day/end*100}%`} as CSSProperties}>
      <div className="timeline-phase-labels"><span style={{width:`${landingPercent}%`}}>Flight</span><span>Recovery</span></div>
      <div className="timeline-slider"><div className="timeline-phases"/><div className="landing-marker"/>{forecast.events.filter(e=>e.type==='injury'||e.type==='eva').map((e,i)=><button className={`timeline-event event-${e.type}`} key={`${e.type}-${i}`} style={{left:`${e.day/end*100}%`}} aria-label={`${e.label}, day ${e.day}`} title={`${e.label} · day ${e.day}`} onClick={()=>onDay(e.day)}/>) }
        <input aria-label="Mission day" aria-valuetext={`${phase}, day ${day > landing ? `plus ${day-landing}` : day}`} type="range" min={0} max={end} value={day} disabled={busy} onChange={e=>onDay(Number(e.target.value))}/>
      </div>
      <div className="timeline-landmarks"><button onClick={()=>onDay(0)}>Launch <span>0</span></button><button style={{left:`${landingPercent}%`}} onClick={()=>onDay(landing)}>Landing <span>{landing}</span></button><button onClick={()=>onDay(end)}>Recovery <span>+90</span></button></div>
    </div>
  </section>;
}

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash(location.hash));
  const { workspace, setWorkspace, storageError } = useWorkspace();
  const [dialog, setDialog] = useState<{ kind:'new-flight'|'rename-flight'|'new-profile'|'edit-profile'|'profile'; id?:string; crewId?:string } | null>(null);
  const activeFlight = workspace.flights.find(f=>f.id === workspace.activeFlightId && !f.archived);
  const input = activeFlight?.request;
  const alternative = activeFlight?.alternative;
  const crew = workspace.astronauts;
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
  const [hovered, setHovered] = useState<RegionId | null>(null);
  const [metricHover, setMetricHover] = useState<RegionId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const forecastCache = useRef(new Map<string, ForecastResponse | CompareResponse>());
  const comparing = page === 'compare';
  const needsForecast = page === 'explore' || comparing;
  const routineMode = activeFlight?.routineMode ?? 'manual';
  const medicationScenario = activeFlight?.recommendationMedication ?? false;
  const recommendationBudget = activeFlight?.recommendationBudget ?? 120;
  const recommendationObjective = activeFlight?.recommendationObjective ?? 'balanced';
  const recommendationKey = JSON.stringify({crew:input?.crew,mission:input?.mission,injury:input?.injury,budget:recommendationBudget,objective:recommendationObjective,medication:medicationScenario});
  const routineNeedsRecommendation = !!input && routineMode === 'recommended' && activeFlight?.recommendationKey !== recommendationKey;
  const testSearch = activeFlight?.testSearch ?? {budget:recommendationBudget,objective:recommendationObjective,medication:medicationScenario};
  const sameRoutine = !!input && !!alternative && (Object.keys(input.countermeasures) as (keyof Countermeasures)[]).every(key => input.countermeasures[key] === alternative[key]);

  function setInput(value: ForecastRequest) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{request:value})); }
  function setAlternative(value: Countermeasures) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{alternative:value})); }
  function applyRoutine(value: Countermeasures, mode: RoutineMode) {
    if (!activeFlight) return;
    setWorkspace(previous=>applyFlightRoutine(previous,activeFlight.id,value,mode,recommendationKey));
  }
  function setRoutineMode(mode: RoutineMode) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{routineMode:mode})); }
  function setMedicationScenario(value: boolean) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{recommendationMedication:value})); }
  function setRecommendationBudget(value: number) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{recommendationBudget:value})); }
  function setRecommendationObjective(value: RoutineObjective) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{recommendationObjective:value})); }
  function setTestSearch(change: Partial<RecommendationSettings>) { if(activeFlight) setWorkspace(previous=>updateFlight(previous,activeFlight.id,{testSearch:{...testSearch,...change}})); }
  function openFlight(id:string) {
    setForecast(undefined); setComparison(null); setDay(0); setSelected(null); setPlaying(false); setError(''); setDialog(null);
    setWorkspace(previous=>({...previous,activeFlightId:id})); location.hash=pageHref('mission');
  }
  function saveProfile(profile:CrewProfile) {
    setWorkspace(previous=>saveCrewProfile(previous,profile));
    setDialog({kind:'profile',id:profile.id});
  }
  useEffect(() => {
    const change = () => { setPage(pageFromHash(location.hash)); setPlaying(false); setMetricHover(null); setHovered(null); window.scrollTo(0,0); };
    window.addEventListener('hashchange',change); return ()=>window.removeEventListener('hashchange',change);
  },[]);
  useEffect(()=>{ document.title = `${titles[page]} | AstroTwin`; },[page]);
  useEffect(()=>{ if(routineNeedsRecommendation && (page==='explore'||page==='compare')) location.hash=pageHref('mission'); },[routineNeedsRecommendation,page]);
  useEffect(()=>{
    let active=true; setError('');
    Promise.all([api.health(),api.crew(),api.injuries(),api.defaults()]).then(([h,c,i,d])=>{
      if(!active)return; setHealth(h);setInjuries(i);setDefaults(d);
      setWorkspace(previous=>previous.astronauts.length ? previous : {...previous,astronauts:c});
    }).catch(()=>{if(active)setError('Simulation service unavailable');});
    return ()=>{active=false;};
  },[api,retry,setWorkspace]);
  useEffect(()=>{
    if(!input || !defaults || !alternative || !needsForecast) {setBusy(false);return;}
    let active=true;
    const key=JSON.stringify(comparing ? {input,alternative} : input);
    const apply=(result:ForecastResponse|CompareResponse)=>{
      if(!active)return;
      if('baseline' in result){setForecast(result.baseline);setComparison(result);}else {setForecast(result);setComparison(null);}
      setDay(d=>Math.min(d,input.mission.duration_days+90));setBusy(false);
    };
    const cached=forecastCache.current.get(key);setError('');
    if(cached){apply(cached);return;}
    setBusy(true);
    const timer=setTimeout(()=>{
      const request=comparing ? api.compare({request:input,alternative}) : api.forecast(input);
      request.then(result=>{
        if(forecastCache.current.size>16)forecastCache.current.clear();
        forecastCache.current.set(key,result);apply(result);
      }).catch(()=>{if(active){setError('Could not update the simulation');setForecast(undefined);setComparison(null);setBusy(false);}});
    },180);
    return ()=>{active=false;clearTimeout(timer);};
  },[api,input,alternative,defaults,comparing,needsForecast,refresh]);
  useEffect(()=>{
    if(!playing || !forecast || busy || page!=='explore')return;
    const end=forecast.days.length-1;
    if(day>=end){setPlaying(false);return;}
    const timer=setTimeout(()=>setDay(d=>Math.min(end,d+1)),1000/speed);
    return ()=>clearTimeout(timer);
  },[playing,day,speed,busy,forecast,page]);

  const landing=forecast?.landing_day ?? input?.mission.duration_days ?? 180;
  const safeDay=forecast ? Math.min(day,forecast.days.length-1) : 0;
  const injury:RegionId|null=!input?.injury || safeDay<input.injury.day ? null : input.injury.type==='lower_back_strain' ? 'spine' : `${input.injury.side}_${input.injury.type==='wrist_fracture' ? 'arm' : 'leg'}` as RegionId;
  const dialogFlight=workspace.flights.find(f=>f.id===dialog?.id);
  const dialogProfile=crew.find(c=>c.id===dialog?.id);
  const ready=Boolean(defaults&&crew.length);
  const isFlightPage=['mission','explore','compare'].includes(page);
  const noFlight=<div className="no-flight"><Icon name="orbit" size={72}/><button className="button button-light" disabled={!ready} onClick={()=>setDialog({kind:'new-flight'})}><Icon name="plus" size={18}/>Create flight</button></div>;
  const connectionError=error&&page!=='research' ? <div className="error-notice" role="alert"><span>{error}</span><button className="button button-outline" onClick={()=>{if(defaults){forecastCache.current.clear();setRefresh(v=>v+1);}else setRetry(v=>v+1);}}>Retry</button></div> : null;
  const highlighted=metricHover??hovered??selected;

  return <div className="workspace-shell"><SpaceBackdrop/>
    <aside className="app-sidebar"><Brand/><nav className="rail-navigation" aria-label="Workspace navigation">{(['home','astronauts','research'] as Page[]).map(route=><a key={route} href={pageHref(route)} aria-label={titles[route]} data-tooltip={titles[route]} aria-current={page===route ? 'page' : undefined}><Icon name={route} size={21}/><span className="rail-label">{titles[route]}</span></a>)}</nav>
      {activeFlight&&<nav className="rail-navigation flight-navigation" aria-label="Flight navigation">{(['mission','explore','compare'] as Page[]).map(route=><a key={route} href={pageHref(route)} aria-label={titles[route]} data-tooltip={titles[route]} aria-current={page===route ? 'page' : undefined}><Icon name={route} size={21}/><span className="rail-label">{titles[route]}</span></a>)}</nav>}
      <span className="rail-wordmark" aria-hidden="true">ASTROTWIN</span>
    </aside>
    <div className="site workbench"><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>Skip to content</a>
      <header className="workbench-header"><a className="wordmark" href={pageHref('home')}>AstroTwin</a>{activeFlight&&isFlightPage&&<span className="active-flight-name">{activeFlight.name}</span>}{activeFlight&&isFlightPage&&<button className="header-crew" aria-label={`View ${input?.crew.name}`} title={input?.crew.name} onClick={()=>setDialog({kind:'profile',id:input?.crew.id})}><Avatar profile={input!.crew}/></button>}</header>
      {storageError&&<div className="storage-notice" role="alert">{storageError}</div>}
      <AnimatePresence mode="sync" initial={false}><PageFrame key={page} page={page}>
        {connectionError}
        {page==='home'&&<WorkspaceHome workspace={workspace} ready={ready} onCreate={()=>setDialog({kind:'new-flight'})} onOpen={openFlight} onRename={id=>setDialog({kind:'rename-flight',id})} onArchive={(id,archived)=>setWorkspace(previous=>archiveFlight(previous,id,archived))} onDirectory={()=>{location.hash=pageHref('astronauts');}}/>}
        {page==='astronauts'&&<AstronautDirectory astronauts={crew} flights={workspace.flights} ready={ready} onCreate={()=>setDialog({kind:'new-profile'})} onSelect={id=>setDialog({kind:'profile',id})}/>}
        {page==='mission'&&<><PageTitle title="Flight">{input&&<a className="button button-light" href={pageHref('explore')} aria-disabled={routineNeedsRecommendation} onClick={event=>{if(routineNeedsRecommendation)event.preventDefault();}}>{routineNeedsRecommendation?'Preparing routine':'Simulate'}<Icon name="arrow" size={17}/></a>}</PageTitle>{input ? <div className="mission-layout"><section className="mission-form"><MissionSettings value={input} crew={crew} injuries={injuries} onChange={setInput}/></section><aside className="routine-form"><div className="routine-mode"><h2>Flight routine</h2><div role="group" aria-label="Flight routine mode"><button aria-pressed={routineMode==='recommended'} onClick={()=>setRoutineMode('recommended')}>Recommended</button><button aria-pressed={routineMode==='manual'} onClick={()=>setRoutineMode('manual')}>Manual override</button></div><p>{routineMode==='recommended'?'Recommendations are applied to this flight':'Your settings are used in the simulation'}</p></div><RoutineOptimizer request={input} forecast={api.forecast} context="flight" recommendationEnabled={routineMode==='recommended'} budget={recommendationBudget} objective={recommendationObjective} onBudgetChange={setRecommendationBudget} onObjectiveChange={setRecommendationObjective} medicationScenario={medicationScenario} onMedicationScenarioChange={setMedicationScenario} onRecommendation={routine=>{if(routineMode==='recommended')applyRoutine(routine,'recommended');}} onApply={routine=>applyRoutine(routine,'recommended')}/>{routineMode==='manual'&&<section className="routine-editor"><h2>Manual override</h2><PlanControls value={input.countermeasures} name="Applied routine" onChange={value=>applyRoutine(value,'manual')}/></section>}<div className="applied-routine-status"><span>Applied to flight</span><RoutineSummary routine={input.countermeasures} label="Applied flight settings"/><a href={pageHref('compare')}>Compare another routine<Icon name="arrow" size={15}/></a></div></aside></div> : noFlight}</>}
        {page==='explore'&&<><PageTitle title="Body">{input&&<div className="view-context"><span>{input.mission.destination==='MOON'?'Moon':input.mission.destination==='MARS'?'Mars':'ISS'}</span><span>{input.crew.name}</span><a className="icon-button" href={pageHref('mission')} aria-label="Edit flight" data-tooltip="Edit flight"><Icon name="mission"/></a></div>}</PageTitle>
          {input&&forecast ? <><div className="explore-layout" aria-busy={busy}><aside className="readings"><div className="readings-heading"><span>Measurements</span><span>Day {safeDay}</span></div>{metrics.map(m=>{const pct=forecast.series[m.key][safeDay];const baseline=input.crew.baseline[m.baseline];const active=highlighted===m.region||(m.key==='leg_muscle_pct'&&highlighted==='right_leg')||(m.key==='vo2max_pct'&&highlighted==='chest');return <button className={`reading ${active?'reading-active':''}`} key={m.key} style={{'--metric':m.color} as CSSProperties} aria-pressed={selected===m.region} onMouseEnter={()=>setMetricHover(m.region)} onMouseLeave={()=>setMetricHover(null)} onFocus={()=>setMetricHover(m.region)} onBlur={()=>setMetricHover(null)} onClick={()=>setSelected(selected===m.region?null:m.region)}><span className="reading-name">{m.label}<Icon name="arrow" size={12}/></span><span className="reading-value">{(baseline*pct/100).toFixed(m.precision)}<small>{m.unit}</small></span><span className="reading-change">{changeLabel(pct-100)}<span>from baseline</span></span><svg className="reading-spark" viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true"><path d={forecast.series[m.key].filter((_,i)=>i%Math.max(1,Math.floor(forecast.days.length/60))===0).map((p,i,a)=>`${i?'L':'M'}${i/(a.length-1)*200},${2+(100-p)/35*22}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1={safeDay/(forecast.days.length-1)*200} x2={safeDay/(forecast.days.length-1)*200} y1="0" y2="26" stroke="currentColor" opacity=".5"/></svg></button>;})}
            <div className="flight-flags"><h2>Mission indicators</h2>{([{key:'fracture',label:'Bone'},{key:'eva_fitness',label:'EVA'},{key:'landing_fitness',label:'Fitness'}] as const).map(({key,label})=><div key={key} className={`flight-flag flag-${forecast.risks[key].level}`} title={forecast.risks[key].reason}><span>{label}</span><strong>{forecast.risks[key].level==='green'?'Stable':forecast.risks[key].level==='yellow'?'Watch':'Reduced'}</strong></div>)}</div>
          </aside><section className="body-stage" aria-label="Interactive body"><div className="stage-topline"><span>{safeDay>landing?'Recovery':safeDay===landing?'Landing':'In flight'}</span>{busy&&<span className="update-indicator" role="status">Updating</span>}</div><Suspense fallback={<Loading body/>}><BodyTwin regions={forecast.regions} series={forecast.series} baseline={input.crew.baseline} day={safeDay} height={440} selectedRegion={metricHover??selected} injuredRegion={injury} injury={input.injury} landingDay={forecast.landing_day} onRegionSelect={setSelected} onRegionHover={setHovered}/></Suspense></section></div>
          <Timeline forecast={forecast} day={safeDay} playing={playing} speed={speed} busy={busy} onDay={d=>{setDay(d);setPlaying(false);}} onPlay={()=>{if(day>=forecast.days.length-1)setDay(0);setPlaying(v=>!v);}} onSpeed={setSpeed}/><section className="graphs-section"><h2>Mission outcomes</h2><Suspense fallback={<Loading/>}><ForecastCharts forecast={forecast} comparison={null} day={safeDay} selected={selected}/></Suspense></section></> : !input ? noFlight : !error&&<Loading body/>}
        </>}
        {page==='compare'&&<><PageTitle title="Compare routines"><span className="view-context">Landing · day {landing}</span></PageTitle>{input&&alternative ? <><div className="comparison-workflow"><section><h2>Applied to flight</h2><RoutineSummary routine={input.countermeasures} label="Applied routine settings"/></section><section><h2>Test routine <span>{sameRoutine?'Same as applied':'Not applied'}</span></h2><RoutineSummary routine={alternative} label="Test routine settings"/><div className="comparison-actions"><button className="button button-light" disabled={sameRoutine} onClick={()=>applyRoutine(alternative,'manual')}>{sameRoutine?'Applied to flight':'Apply test to flight'}<Icon name="check" size={15}/></button><button className="quiet-link" disabled={sameRoutine} onClick={()=>setAlternative({...input.countermeasures})}>Reset test</button></div></section></div><div className="comparison-layout"><aside className="compare-controls"><RoutineOptimizer request={input} forecast={api.forecast} context="compare" budget={testSearch.budget} objective={testSearch.objective} onBudgetChange={budget=>setTestSearch({budget})} onObjectiveChange={objective=>setTestSearch({objective})} medicationScenario={testSearch.medication} onMedicationScenarioChange={medication=>setTestSearch({medication})} appliedRoutine={alternative} onApply={setAlternative}/><section className="routine-editor"><h2>Edit test routine</h2><PlanControls value={alternative} name="Test routine" onChange={setAlternative}/></section></aside><section className="comparison-result" aria-label="Routine comparison" aria-busy={busy}>{forecast&&comparison ? <><div className="comparison-status">{busy&&<span className="update-indicator" role="status">Updating comparison</span>}</div><div className="comparison-body"><Suspense fallback={<Loading body/>}><BodyTwin regions={comparison.baseline.regions} compareRegions={comparison.alternative.regions} series={comparison.baseline.series} compareSeries={comparison.alternative.series} baseline={input.crew.baseline} injury={input.injury} landingDay={comparison.baseline.landing_day} day={landing} height={440} selectedRegion={selected} onRegionSelect={setSelected}/></Suspense></div><div className="comparison-measures">{metrics.map(m=>{const base=comparison.baseline.series[m.key][landing];const next=comparison.alternative.series[m.key][landing];const amount=input.crew.baseline[m.baseline];return <button key={m.key} style={{'--metric':m.color} as CSSProperties} onClick={()=>setSelected(m.region)}><span>{m.label}</span><div><span>{(amount*base/100).toFixed(m.precision)}</span><span aria-hidden="true">→</span><strong>{(amount*next/100).toFixed(m.precision)}</strong></div><small>{m.unit}</small><em>{next-base>0?'+':''}{(next-base).toFixed(2)} pp</em></button>;})}</div></> : !error&&<Loading body/>}</section></div>{comparison&&<section className="graphs-section"><h2>Applied and test outcomes</h2><Suspense fallback={<Loading/>}><ForecastCharts forecast={comparison.baseline} comparison={comparison} day={landing} selected={selected}/></Suspense></section>}</> : noFlight}</>}
        {page==='research'&&<><PageTitle title="Research"/><SciencePanel activeParamsVersion={health?.params_version}/></>}
      </PageFrame></AnimatePresence>
      {dialog&&<WorkspaceDialog title={dialog.kind==='new-flight'?'Create flight':dialog.kind==='rename-flight'?'Rename flight':dialog.kind==='new-profile'?'Add astronaut':dialog.kind==='edit-profile'?'Edit astronaut':'Astronaut'} onClose={()=>setDialog(null)}>
        {(dialog.kind==='new-flight'||dialog.kind==='rename-flight')&&<FlightForm astronauts={crew} initial={dialog.kind==='rename-flight'?dialogFlight:undefined} preferredCrewId={dialog.crewId} onSave={(name,crewId)=>{
          if(dialog.kind==='rename-flight'&&dialogFlight){setWorkspace(previous=>updateFlight(previous,dialogFlight.id,{name}));setDialog(null);return;}
          const astronaut=crew.find(c=>c.id===crewId);if(!defaults||!astronaut)return;
          const {alternative:_,...seed}=defaults.demo;
          const flight=createFlight(name,{...structuredClone(seed),crew:structuredClone(astronaut),injury:null});
          setWorkspace(previous=>({...previous,flights:[...previous.flights,flight],activeFlightId:flight.id}));setForecast(undefined);setComparison(null);setDay(0);setSelected(null);setDialog(null);location.hash=pageHref('mission');
        }}/>}
        {(dialog.kind==='new-profile'||dialog.kind==='edit-profile')&&<ProfileForm astronauts={crew} initial={dialog.kind==='edit-profile'?dialogProfile:undefined} onSave={saveProfile}/>}
        {dialog.kind==='profile'&&dialogProfile&&<ProfileDetails profile={dialogProfile} flights={workspace.flights} ready={ready} onOpen={openFlight} onNew={()=>setDialog({kind:'new-flight',crewId:dialogProfile.id})} onEdit={()=>setDialog({kind:'edit-profile',id:dialogProfile.id})}/>}
      </WorkspaceDialog>}
    </div>
  </div>;
}
