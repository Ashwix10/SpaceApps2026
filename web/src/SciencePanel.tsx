import { useState } from 'react';
import type { CSSProperties } from 'react';
import study from '../../data/research/sprint_control.json';
import observations from '../../data/nasa_observations.json';
import evidence from '../../data/evidence.json';
import methodologyUrl from '../../docs/science.md?url';
import { BodyTwin2D } from './body/BodyTwin2D';
import { metricInfo, regionColors, regionNames, signedChange } from './body/metrics';
import type { RegionId, SeriesKey } from './types';
import './research.css';

const keys: SeriesKey[] = ['hip_bmd_pct', 'spine_bmd_pct', 'leg_muscle_pct', 'vo2max_pct'];
const regionToMetric: Partial<Record<RegionId, SeriesKey>> = { pelvis: 'hip_bmd_pct', spine: 'spine_bmd_pct', left_leg: 'leg_muscle_pct', right_leg: 'leg_muscle_pct', chest: 'vo2max_pct', heart: 'vo2max_pct' };
const anatomyReference = Object.fromEntries(Object.keys(regionNames).map(region => [region, [1]])) as Record<RegionId, number[]>;
const sourceLabels: Record<string, [string, string]> = {
  nasa_bone: ['Bone changes', 'NASA human research'], nasa_muscle: ['Muscle health', 'NASA human research'],
  nasa_exercise: ['Exercise & recovery', 'NASA technical brief'], nasa_fracture: ['Fracture research', 'NASA research roadmap'],
  multisystem_2023: ['Multisystem outcomes', 'Scott et al. · 2023'], moore_2014: ['In-flight aerobic capacity', 'Moore et al. · 2014'],
};

function dayWindow(days: number[]) { return days[0] === days[1] ? `${days[0]}` : `${days[0]}–${days[1]}`; }

function MeasuredChart({ metric }: { metric: SeriesKey }) {
  const item = study.outcomes[keys.indexOf(metric)];
  const info = metricInfo[metric];
  const minimum = Math.min(item.pre_mean - item.pre_se, item.post_mean - item.post_se);
  const maximum = Math.max(item.pre_mean + item.pre_se, item.post_mean + item.post_se);
  const targetStep = (maximum - minimum) / 4;
  const power = 10 ** Math.floor(Math.log10(targetStep));
  const step = ([1, 2, 5, 10].find(candidate => candidate * power >= targetStep) ?? 10) * power;
  const low = Math.floor(minimum / step) * step;
  const high = Math.ceil(maximum / step) * step;
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => low + step * index);
  const position = (value: number) => 98 + (value - low) / (high - low) * 468;
  const tickDigits = Math.max(0, -Math.floor(Math.log10(step)));
  const points = [{ label: 'Preflight', value: item.pre_mean, se: item.pre_se, y: 62 }, { label: 'Postflight', value: item.post_mean, se: item.post_se, y: 133 }];
  return <svg className="measured-chart" viewBox="0 0 620 222" role="img" aria-label={`${info.label}: preflight ${item.pre_mean}, standard error ${item.pre_se}; postflight ${item.post_mean}, standard error ${item.post_se}; ${info.unit}`}>
    <text x="98" y="18" className="measured-axis-title">{info.unit}</text>
    {ticks.map(tick => <g key={tick}><line x1={position(tick)} x2={position(tick)} y1="32" y2="172" className="measured-grid" /><text x={position(tick)} y="195" textAnchor="middle" className="measured-axis-tick">{tick.toFixed(tickDigits)}</text></g>)}
    <line x1="98" x2="566" y1="172" y2="172" className="measured-axis" />
    {points.map((point, index) => <g key={point.label} className="measured-point"><title>{`${point.label}: ${point.value} ± ${point.se} ${info.unit} (SE)`}</title>
      <text x="80" y={point.y + 4} textAnchor="end" className="measured-row-label">{point.label}</text>
      <line x1={position(point.value - point.se)} x2={position(point.value + point.se)} y1={point.y} y2={point.y} stroke={info.color} strokeWidth="3" opacity={index ? 1 : .48} />
      {[point.value - point.se, point.value + point.se].map(value => <line key={value} x1={position(value)} x2={position(value)} y1={point.y - 9} y2={point.y + 9} stroke={info.color} strokeWidth="2" opacity={index ? 1 : .48} />)}
      <circle cx={position(point.value)} cy={point.y} r="7" fill={index ? info.color : '#11242A'} stroke={info.color} strokeWidth="2.5" />
    </g>)}
    <text x="332" y="218" textAnchor="middle" className="measured-axis-title">Group mean with ±1 standard error</text>
  </svg>;
}

export function SciencePanel({ activeParamsVersion }: { activeParamsVersion?: string }) {
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('pelvis');
  const metric = regionToMetric[selectedRegion];
  const info = metric ? metricInfo[metric] : null;
  const item = metric ? study.outcomes[keys.indexOf(metric)] : null;
  const change = item ? signedChange(item.post_mean / item.pre_mean * 100, 2) : null;
  return <section className="science-panel" aria-label="Research explorer">
    <header className="study-header"><div><h2>NASA Sprint study</h2><span className="study-subtitle">English et al. · {study.year} · Standard ISS exercise group</span></div><a className="research-paper-link" href={study.url} target="_blank" rel="noopener noreferrer">Read paper <span aria-hidden="true">↗</span></a></header>
    <div className="study-stats"><div><strong>{study.population.n}</strong><span>participants</span></div><div><strong>{study.population.mission_days_mean}<small> ± {study.population.mission_days_sd}</small></strong><span>mission days · mean ± SD</span></div><div className="study-cohort"><span>CON group</span><b>ARED · T2 · CEVIS</b><small>Standard ISS exercise</small></div></div>
    <div className="research-metric-selector" aria-label="Research measurement">{keys.map(key => <button key={key} aria-pressed={metric === key} onClick={() => setSelectedRegion(metricInfo[key].region)} style={{ '--metric-color': metricInfo[key].color } as CSSProperties}><i /><span>{metricInfo[key].short}</span></button>)}</div>
    <div className="research-evidence-lab" style={{ '--metric-color': regionColors[selectedRegion] } as CSSProperties}>
      <div className="research-anatomy"><span className="research-kicker">Select a body area</span><BodyTwin2D regions={anatomyReference} day={0} height={365} selectedRegion={selectedRegion} onRegionSelect={region => { if (region) setSelectedRegion(region); }} /><div className="research-anatomy-label"><i />{regionNames[selectedRegion]}</div></div>
      {metric && info && item ? <div className="research-measurement"><div className="research-measurement-heading"><div><h3>{info.label}</h3></div><div className="research-change"><strong>{change}</strong><span>ratio of group means</span></div></div>
        <div className="measurement-values"><div><span>Before flight</span><strong>{item.pre_mean.toFixed(info.precision)} <small>{info.unit}</small></strong><small>± {item.pre_se.toFixed(info.precision)} SE</small></div><span aria-hidden="true" className="measurement-arrow">→</span><div><span>After flight</span><strong>{item.post_mean.toFixed(info.precision)} <small>{info.unit}</small></strong><small>± {item.post_se.toFixed(info.precision)} SE</small></div></div>
        <MeasuredChart metric={metric} />
        <div className="measurement-timing"><span>Postflight test</span><b>R+{dayWindow(item.postflight_days)} days</b><span>Table {item.table}</span></div>
        {metric === 'leg_muscle_pct' && <div className="measurement-context">DXA lean tissue · Time effect not significant, P = 0.40</div>}
        {metric === 'vo2max_pct' && <div className="measurement-context">Relative peak oxygen uptake · VO₂peak</div>}
      </div> : <div className="research-no-measurement" role="status"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h32v28H8zM14 30l7-8 6 4 8-11"/><path d="M12 40 38 8"/></svg><h3>{regionNames[selectedRegion]}</h3><p>No {selectedRegion === 'head_neck' ? 'head or neck' : 'arm'} measurement in this dataset</p><button type="button" onClick={() => setSelectedRegion('left_leg')}>View leg lean tissue <span aria-hidden="true">→</span></button></div>}
    </div>
    <div className="research-provenance"><a href={methodologyUrl} target="_blank" rel="noopener noreferrer">Methodology ↗</a></div>
    <details className="research-data-table"><summary>All measured values</summary><div className="science-table"><table><thead><tr><th>Measurement</th><th>Preflight mean</th><th>Postflight mean</th><th>Postflight test</th></tr></thead><tbody>{study.outcomes.map((outcome, index) => <tr key={outcome.key}><th scope="row">{metricInfo[keys[index]].label}</th><td>{outcome.pre_mean} ± {outcome.pre_se} {metricInfo[keys[index]].unit}</td><td>{outcome.post_mean} ± {outcome.post_se} {metricInfo[keys[index]].unit}</td><td>R+{dayWindow(outcome.postflight_days)} days</td></tr>)}</tbody></table></div><p>Mean ± SE. Percentage change is calculated from the two group means; it is not the mean paired individual change.</p></details>
    <div className="research-source-heading"><h3>Related research</h3></div>
    <div className="research-source-grid">{evidence.sources.filter(source => source.id !== 'sprint_2020').map(source => { const label = sourceLabels[source.id] ?? [source.title, 'Research source']; return <a key={source.id} className="research-source-card" href={source.url} target="_blank" rel="noopener noreferrer"><span>{label[1]}</span><strong>{label[0]}</strong><i aria-hidden="true">↗</i></a>; })}</div>
    {activeParamsVersion && activeParamsVersion !== evidence.params_version && <p className="research-version-alert" role="alert">Active parameters differ from this source review</p>}
    <p className="research-attribution">{study.authors} ({study.year}) · Tables 1 & 4, CON columns · Numeric transcription unchanged; chart and percentages adapted · <a href={study.license_url} target="_blank" rel="noopener noreferrer">{study.license}</a></p>
  </section>;
}

export function NASAObservations() {
  return <div className="research-facts">{observations.observations.map(item => <a className="research-fact" key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"><strong>{item.range.join('–')}{item.unit}</strong><span>{item.label}</span><small>NASA summary ↗</small></a>)}</div>;
}
