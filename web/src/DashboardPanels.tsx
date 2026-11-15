import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MissionNumberInput } from './MissionNumberInput';
import { canonicalOptimizationRequest, optimizeRoutine, routineObjectives } from './routineOptimizer';
import type { RoutineObjective, RoutineSearchProgress, RoutineSearchResult } from './routineOptimizer';
import type { Countermeasures, ForecastRequest, ForecastResponse, InjuryType, SeriesKey } from './types';
import './mission-visual.css';

export const tissueLabels: Record<SeriesKey, string> = {
  hip_bmd_pct: 'Hip density', spine_bmd_pct: 'Spine density', leg_muscle_pct: 'Leg lean tissue', vo2max_pct: 'Cardio',
};
const injurySearchNotes: Record<InjuryType, { label: string; effect: string }> = {
  ankle_sprain: { label: 'Ankle sprain', effect: 'Leg tissue affected' },
  thigh_muscle_tear: { label: 'Thigh muscle tear', effect: 'Leg tissue affected' },
  lower_back_strain: { label: 'Lower back strain', effect: 'Strength effectiveness reduced' },
  wrist_fracture: { label: 'Wrist fracture', effect: 'Local arm response only' },
};

function ExerciseGlyph({ aerobic = false }: { aerobic?: boolean }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">{aerobic ? <><circle cx="21" cy="5" r="3"/><path d="m16 12 5 5 6 1M8 11l8-2 4 6-8 8-7 2M13 19l6 4 1 7"/></> : <path d="M10 16h12M5 10v12M9 7v18M23 7v18M27 10v12M3 13v6M29 13v6"/>}</svg>;
}
function NutritionGlyph({ energy = false }: { energy?: boolean }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">{energy ? <path d="m18 3-11 16h8l-2 10 12-17h-9l2-9Z"/> : <><circle cx="8" cy="9" r="4"/><circle cx="24" cy="10" r="4"/><circle cx="16" cy="24" r="4"/><path d="m11 12 3 8m7-6-3 6M12 9h8"/></>}</svg>;
}
function RoutineDial({ resistance, aerobic }: { resistance: number; aerobic: number }) {
  const total = resistance + aerobic;
  return <div className={`routine-dial${total ? '' : ' is-empty'}`} style={{ '--strength-share': `${total ? resistance / total * 100 : 0}%` } as CSSProperties} aria-label={`${total} minutes per day`}><div><strong>{total}</strong><span>min / day</span></div></div>;
}

const routineControls = [
  { key: 'resistance_min_per_day', label: 'Strength', unit: 'min/day', min: 0, max: 120, step: 5, kind: 'strength', color: '#bcc5ff' },
  { key: 'aerobic_min_per_day', label: 'Cardio', unit: 'min/day', min: 0, max: 120, step: 5, kind: 'cardio', color: '#83c8cd' },
  { key: 'protein_g_per_kg', label: 'Protein', unit: 'g/kg/day', min: .8, max: 2, step: .1, kind: 'protein', color: '#c3c998' },
  { key: 'calorie_pct', label: 'Energy intake', unit: '% of need', min: 80, max: 110, step: 1, kind: 'energy', color: '#d6b998' },
] as const;

export function PlanControls({ value, baseline, name, onChange }: {
  value: Countermeasures; baseline?: Countermeasures; name: string; onChange: (value: Countermeasures) => void;
}) {
  const presets = [{ label: 'No exercise', strength: 0, cardio: 0 }, { label: '60 min', strength: 30, cardio: 30 }, { label: '120 min', strength: 60, cardio: 60 }, { label: '150 min', strength: 90, cardio: 60 }];
  return <div className="plan-controls plan-visual">
    <div className="routine-overview"><RoutineDial resistance={value.resistance_min_per_day} aerobic={value.aerobic_min_per_day}/><div className="routine-legend"><span><i/>{value.resistance_min_per_day} min strength</span><span><i/>{value.aerobic_min_per_day} min cardio</span>{baseline && <small>Applied: {baseline.resistance_min_per_day + baseline.aerobic_min_per_day} min / day</small>}</div></div>
    <div className="routine-presets" role="group" aria-label={`${name} exercise presets`}>{presets.map(preset => <button type="button" key={preset.label} aria-pressed={value.resistance_min_per_day === preset.strength && value.aerobic_min_per_day === preset.cardio} onClick={() => onChange({ ...value, resistance_min_per_day: preset.strength, aerobic_min_per_day: preset.cardio })}>{preset.label}</button>)}</div>
    <div className="routine-control-grid">{routineControls.map(control => <div className={`exercise-control control-${control.kind}`} key={control.key} style={{ '--mission-accent': control.color } as CSSProperties}>
      <div className="exercise-control-heading"><span>{control.kind === 'strength' || control.kind === 'cardio' ? <ExerciseGlyph aerobic={control.kind === 'cardio'}/> : <NutritionGlyph energy={control.kind === 'energy'}/>}<span>{control.label}</span></span><label><MissionNumberInput aria-label={`${name} ${control.label}`} min={control.min} max={control.max} step={control.step} value={value[control.key]} onCommit={number => onChange({ ...value, [control.key]: number })}/><small>{control.unit}</small></label></div>
      <input type="range" aria-label={`${name} ${control.label} slider`} aria-valuetext={`${value[control.key]} ${control.unit}`} min={control.min} max={control.max} step={control.step} value={value[control.key]} style={{ '--range-progress': `${(value[control.key] - control.min) / (control.max - control.min) * 100}%` } as CSSProperties} onChange={event => onChange({ ...value, [control.key]: Number(event.target.value) })}/><div className="exercise-endpoints"><span>{control.min}</span><span>{control.max} {control.unit}</span></div>
    </div>)}</div>
    <label className="medication-control"><span>Bone medication scenario</span><input aria-label={`${name} Bone medication`} type="checkbox" role="switch" checked={value.bisphosphonate} onChange={event => onChange({ ...value, bisphosphonate: event.target.checked })}/></label>
  </div>;
}

type ForecastRunner = (request: ForecastRequest) => Promise<ForecastResponse>;
const forecastCaches = new WeakMap<ForecastRunner, Map<string, { at: number; value: Promise<ForecastResponse> }>>();
function cachedRunner(forecast: ForecastRunner): ForecastRunner {
  let cache = forecastCaches.get(forecast);
  if (!cache) { cache = new Map(); forecastCaches.set(forecast, cache); }
  return request => {
    const key = JSON.stringify(request);
    const entry = cache.get(key);
    if (entry && Date.now() - entry.at < 60_000) return entry.value;
    const value = forecast(request).catch(error => { cache.delete(key); throw error; });
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
    return value;
  };
}

function RoutineFrontier({ result }: { result: RoutineSearchResult }) {
  const { budget, objective } = result;
  const upper = Math.ceil(Math.max(...result.ranking.map(candidate => candidate.score)) * 10) / 10;
  const lower = Math.min(Math.floor(Math.min(...result.ranking.map(candidate => candidate.score)) * 10) / 10, upper - .1);
  const x = (minutes: number) => 42 + minutes / Math.max(1, budget) * 264;
  const y = (score: number) => 116 - (score - lower) / (upper - lower) * 88;
  const bestAtTime = [...new Set(result.exerciseRanking.map(candidate => candidate.minutes))].sort((a, b) => a - b).map(minutes => result.exerciseRanking.find(candidate => candidate.minutes === minutes)!);
  let retained = -Infinity;
  const frontier = bestAtTime.filter(candidate => { if (candidate.score <= retained) return false; retained = candidate.score; return true; });
  const best = result.best;
  return <div className="optimizer-search-chart"><div className="optimizer-chart-heading"><span>Evaluated routines</span><span><i/>Exercise <i className="nutrition-key"/>Nutrition</span></div><svg className="optimizer-frontier" viewBox="0 0 320 150" role="img" aria-label={`${result.evaluated} evaluated routines. Horizontal axis: zero to ${budget} daily exercise minutes. Vertical axis: ${routineObjectives[objective].metric} at landing, from ${lower.toFixed(1)} to ${upper.toFixed(1)} percent of baseline. Selected routine: ${best.routine.resistance_min_per_day} minutes strength, ${best.routine.aerobic_min_per_day} minutes cardio, ${best.routine.protein_g_per_kg} grams protein per kilogram per day, ${best.routine.calorie_pct} percent energy need.`}>
    <text className="frontier-axis-name" x="42" y="14">{routineObjectives[objective].metric} (%)</text><path className="frontier-grid" d="M42 28H306M42 72H306M42 116H306"/><path className="frontier-axis" d="M42 24V120M306 24V120"/>
    <text x="34" y="32" textAnchor="end">{upper.toFixed(1)}</text><text x="34" y="76" textAnchor="end">{((upper + lower) / 2).toFixed(1)}</text><text x="34" y="120" textAnchor="end">{lower.toFixed(1)}</text>
    <path className="frontier-line" d={frontier.map((candidate, index) => `${index ? 'L' : 'M'}${x(candidate.minutes)},${y(candidate.score)}`).join(' ')}/>
    {result.ranking.map(candidate => <circle className={`frontier-point${candidate.stage === 'nutrition' ? ' frontier-nutrition' : ''}${candidate === best ? ' frontier-point-best' : ''}`} key={`${candidate.routine.resistance_min_per_day}-${candidate.routine.aerobic_min_per_day}-${candidate.routine.protein_g_per_kg}-${candidate.routine.calorie_pct}`} cx={x(candidate.minutes)} cy={y(candidate.score)} r={candidate === best ? 3.5 : 2.7}>
      <title>{candidate.routine.resistance_min_per_day} min strength + {candidate.routine.aerobic_min_per_day} min cardio · protein {candidate.routine.protein_g_per_kg} g/kg/day · energy {candidate.routine.calorie_pct}% · {candidate.score.toFixed(2)}% baseline retained{candidate === best ? ' · Selected' : ''}</title>
    </circle>)}
    <circle className="frontier-best-outline" cx={x(best.minutes)} cy={y(best.score)} r="6.5"/>
    <text x="42" y="141">0</text><text className="frontier-axis-name" x="174" y="141" textAnchor="middle">Exercise min/day</text><text x="306" y="141" textAnchor="end">{budget}</text>
  </svg><p className="optimizer-ranking-note">{routineObjectives[objective].description}</p></div>;
}

export interface RoutineOptimizerProps {
  request: ForecastRequest;
  forecast: ForecastRunner;
  onApply: (routine: Countermeasures) => void;
  appliedRoutine?: Countermeasures;
  onRecommendation?: (routine: Countermeasures, result: RoutineSearchResult) => void;
  onBusyChange?: (busy: boolean) => void;
  recommendationEnabled?: boolean;
  context?: 'flight' | 'compare';
  applyLabel?: string;
  appliedLabel?: string;
  budget?: number;
  objective?: RoutineObjective;
  onBudgetChange?: (budget: number) => void;
  onObjectiveChange?: (objective: RoutineObjective) => void;
  medicationScenario?: boolean;
  onMedicationScenarioChange?: (enabled: boolean) => void;
}

export function RoutineOptimizer({ request, forecast, onApply, appliedRoutine, onRecommendation, onBusyChange, recommendationEnabled = true, context = 'flight', applyLabel, appliedLabel, budget: controlledBudget, objective: controlledObjective, onBudgetChange, onObjectiveChange, medicationScenario: controlledMedication, onMedicationScenarioChange }: RoutineOptimizerProps) {
  const [localBudget, setLocalBudget] = useState(120);
  const [localObjective, setLocalObjective] = useState<RoutineObjective>('balanced');
  const [localMedication, setLocalMedication] = useState(false);
  const budget = controlledBudget ?? localBudget;
  const objective = controlledObjective ?? localObjective;
  const medicationScenario = controlledMedication ?? localMedication;
  const [result, setResult] = useState<RoutineSearchResult>();
  const [resultKey, setResultKey] = useState('');
  const [progress, setProgress] = useState<RoutineSearchProgress>({ stage: 'exercise', complete: 0, total: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const recommendationCallback = useRef(onRecommendation);
  recommendationCallback.current = onRecommendation;
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const wasEnabled = useRef(recommendationEnabled);
  const runner = useMemo(() => cachedRunner(forecast), [forecast]);
  const requestKey = JSON.stringify(canonicalOptimizationRequest(request, medicationScenario));
  const searchKey = `${requestKey}|${budget}|${objective}`;
  const validResult = resultKey === searchKey && status === 'ready';
  const updating = status === 'loading' || resultKey !== searchKey;
  const searching = status !== 'error' && !validResult;
  useEffect(() => { busyCallback.current?.(searching); }, [searching]);
  useEffect(() => () => { busyCallback.current?.(false); }, []);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setProgress({ stage: 'exercise', complete: 0, total: 0 }); setStatus('loading');
    const timer = window.setTimeout(() => {
      optimizeRoutine(JSON.parse(requestKey) as ForecastRequest, budget, objective, runner, next => { if (active) setProgress(next); }, abort.signal, medicationScenario)
        .then(next => { if (active) { setResult(next); setResultKey(`${requestKey}|${budget}|${objective}`); setStatus('ready'); recommendationCallback.current?.({ ...next.best.routine }, next); } })
        .catch(() => { if (active) setStatus('error'); });
    }, 450);
    return () => { active = false; abort.abort(); window.clearTimeout(timer); };
  }, [requestKey, budget, objective, runner, retry, medicationScenario]);
  useEffect(() => {
    if (recommendationEnabled && !wasEnabled.current && validResult && result) recommendationCallback.current?.({ ...result.best.routine }, result);
    wasEnabled.current = recommendationEnabled;
  }, [recommendationEnabled, validResult, result]);
  const destinationRoutine = appliedRoutine ?? request.countermeasures;
  const matchesDestination = !!result && (Object.keys(destinationRoutine) as (keyof Countermeasures)[]).every(key => result.best.routine[key] === destinationRoutine[key]);
  const action = applyLabel ?? (context === 'compare' ? 'Use in test' : 'Use recommendation');
  const alreadyApplied = appliedLabel ?? (context === 'compare' ? 'Already in test' : 'Applied recommendation');
  const progressFraction = progress.stage === 'exercise' ? progress.complete / Math.max(1, progress.total) * .8 : .8 + progress.complete / Math.max(1, progress.total) * .2;
  return <section className="routine-optimizer" aria-label="Routine recommendations"><div className="optimizer-heading"><span className="optimizer-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 17V7l8-4 8 4v10l-8 4-8-4Z"/><path d="m4 7 8 5 8-5M12 12v9M8 5l8 5"/></svg></span><div><h3>Recommended routine</h3><span>Exercise + nutrition · day {request.mission.duration_days}</span></div></div>
    <div className="optimizer-options"><label>Priority<select aria-label="Routine objective" value={objective} onChange={event => { const next = event.target.value as RoutineObjective; setLocalObjective(next); onObjectiveChange?.(next); }}>{(Object.keys(routineObjectives) as RoutineObjective[]).map(key => <option value={key} key={key}>{routineObjectives[key].label}</option>)}</select></label><label>Exercise time limit<select aria-label="Routine time budget" value={budget} onChange={event => { const next = Number(event.target.value); setLocalBudget(next); onBudgetChange?.(next); }}>{[30, 60, 90, 120, 150].map(minutes => <option key={minutes} value={minutes}>{minutes} min / day</option>)}</select></label></div>
    <label className="optimizer-medication"><span>Include bone medication scenario</span><input type="checkbox" role="switch" aria-label="Include medication in recommendation scenario" checked={medicationScenario} onChange={event => { const next = event.target.checked; setLocalMedication(next); onMedicationScenarioChange?.(next); }}/></label>
    {request.injury && <div className="optimizer-injury-note" aria-label="Injury scenario included in recommendation search"><span>{injurySearchNotes[request.injury.type].label} · day {request.injury.day}</span><small>{injurySearchNotes[request.injury.type].effect}</small></div>}
    <div className={`optimizer-result-stage${updating ? ' is-updating' : ''}`} aria-busy={status === 'loading'}>
      {result ? <div className="optimizer-result" aria-hidden={!validResult || undefined}>
        <div className="recommended-split"><div><ExerciseGlyph/><strong>{result.best.routine.resistance_min_per_day}<small>min/day</small></strong><span>Strength</span></div><span className="split-plus">+</span><div><ExerciseGlyph aerobic/><strong>{result.best.routine.aerobic_min_per_day}<small>min/day</small></strong><span>Cardio</span></div></div>
        <div className="recommended-nutrition"><div><NutritionGlyph/><span>Protein</span><strong>{result.best.routine.protein_g_per_kg.toFixed(1)}<small>g/kg/day</small></strong><small className="protein-total">{Math.round(result.crewMassKg * result.best.routine.protein_g_per_kg)} g/day</small></div><div><NutritionGlyph energy/><span>Energy</span><strong>{result.best.routine.calorie_pct}<small>% of need</small></strong></div></div>
        <div className="optimizer-outcomes-heading"><span>At landing</span><span>% of preflight baseline</span></div><div className="optimizer-outcomes">{(Object.keys(tissueLabels) as SeriesKey[]).map(key => <div key={key}><span>{tissueLabels[key]}</span><strong>{result.best.forecast.series[key][result.landingDay].toFixed(1)}<small>%</small></strong></div>)}</div>
        <RoutineFrontier result={result}/>
        <div className="optimizer-foot"><span>{result.exerciseRanking.length} exercise routines<br/>{result.nutritionRanking.length} nutrition checks</span><button type="button" className="optimizer-apply" disabled={!validResult || matchesDestination} onClick={() => onApply({ ...result.best.routine })}>{matchesDestination ? alreadyApplied : action}{!matchesDestination && <span aria-hidden="true">↗</span>}</button></div>
        <p className="optimizer-context">Routine response uses shared ISS parameters for every crew profile.</p>
      </div> : <div className="optimizer-result-skeleton" aria-hidden="true"><div/><div/><div/><div/></div>}
      {!validResult && <div className="optimizer-status-overlay" role={status === 'error' ? 'alert' : 'status'}><div>{status === 'error' ? <><strong>Recommendation unavailable</strong><button type="button" onClick={() => { forecastCaches.get(forecast)?.clear(); setRetry(previous => previous + 1); }}>Retry search</button></> : <><strong>{result ? 'Updating recommendation' : 'Finding a routine'}</strong><span>{progress.stage === 'exercise' ? 'Exercise search' : 'Nutrition checks'}{progress.total > 0 ? ` · ${progress.complete}/${progress.total}` : ''}</span><div className="optimizer-search-progress"><i style={{ width: `${Math.max(3, progressFraction * 100)}%` }}/></div></>}</div></div>}
    </div>
  </section>;
}
