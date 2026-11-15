import { Component, Suspense, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { BodyTwinProps, CrewProfile, ForecastResponse, Injury, RegionId } from '../types';
import { BodyScene } from './BodyScene';
import { BodyTwin2D } from './BodyTwin2D';
import { baselineDescription, metricInfo, regionColors, regionMetrics, regionNames, signedChange, systemColors } from './metrics';
import { activeInjuryAtDay } from './injury';
import './body.css';

export type BodyTwinComponentProps = BodyTwinProps & {
  series?: ForecastResponse['series'];
  compareSeries?: ForecastResponse['series'];
  baseline?: CrewProfile['baseline'];
  onRegionHover?: (id: RegionId | null) => void;
  injury?: Injury | null;
  landingDay?: number;
};

const ids = Object.keys(regionNames) as RegionId[];
let webglAvailable: boolean | undefined;
function supportsWebGL() {
  if (webglAvailable !== undefined) return webglAvailable;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    webglAvailable = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { webglAvailable = false; }
  return webglAvailable;
}

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function BodyLegend() {
  return <div className="body-legend" aria-label="Anatomy color key">
    {([['Hip bone', systemColors.hip], ['Spine', systemColors.spine], ['Muscle', systemColors.muscle], ['Cardio', systemColors.cardio]] as const).map(([label, color]) =>
      <span key={label}><i style={{ background: color }} />{label}</span>)}
  </div>;
}

function RegionCard({ region, day, regions, series, compareSeries, baseline }: BodyTwinComponentProps & { region: RegionId }) {
  const metrics = regionMetrics[region] ?? [];
  const availableMetrics = metrics.filter(key => Number.isFinite(series?.[key]?.[day]));
  const index = regions[region]?.[day];
  return <aside className="body-region-card" style={{ '--region-color': regionColors[region] } as CSSProperties} aria-live="polite" aria-atomic="true">
    <div className="region-card-title"><i /><strong>{regionNames[region]}</strong><span>Day {day}</span></div>
    {availableMetrics.map(key => {
      const info = metricInfo[key];
      const value = series![key][day];
      const base = baseline?.[info.baseline];
      const alternative = compareSeries?.[key]?.[day];
      return <div className="region-metric" key={key}>
        <span>{info.short}</span>
        <div><strong>{base === undefined ? signedChange(value) : (base * value / 100).toFixed(info.precision)}</strong><small>{base === undefined ? 'from baseline' : info.unit}</small></div>
        <p>{baselineDescription(value)}</p>
        {base !== undefined && <small className="region-baseline">Preflight {base.toFixed(info.precision)} {info.unit}</small>}
        {alternative !== undefined && <small className="region-alternative">Test routine {signedChange(alternative)} from baseline</small>}
      </div>;
    })}
    {!availableMetrics.length && <div className="region-metric region-index">
      {region === 'head_neck' ? <><strong>Reference anatomy</strong><p>No head or neck measurement in this model</p></> : <><span>Regional display index</span><div><strong>{Number.isFinite(index) ? Math.round(index * 100) : 'N/A'}</strong><small>/ 100</small></div><p>Preflight index 100</p><small>Composite model signal</small></>}
    </div>}
  </aside>;
}

export function BodyTwin(props: BodyTwinComponentProps) {
  const { compareRegions, selectedRegion, onRegionSelect, onRegionHover, height = 520 } = props;
  const [hovered, setHovered] = useState<RegionId | null>(null);
  const [use2D, setUse2D] = useState(true);
  const focused = hovered ?? selectedRegion;
  const activeInjury = activeInjuryAtDay(props.injury, props.landingDay, props.day);
  const displayProps = { ...props, injuredRegion: activeInjury?.region ?? null };
  function hover(id: RegionId | null) { setHovered(id); onRegionHover?.(id); }
  const fallback = <BodyTwin2D {...displayProps} activeInjury={activeInjury} hoveredRegion={hovered} onHover={hover} height={height} />;
  return <div className={`body-twin ${use2D ? 'is-anatomy-view' : 'is-3d-view'} ${compareRegions ? 'body-twin-comparison' : ''} ${focused ? 'has-focused-region' : ''}`}>
    <div className="twin-heading"><div className="body-view-switch" aria-label="Body view"><button aria-pressed={use2D} onClick={() => { setUse2D(true); hover(null); }}>Anatomy</button><button aria-pressed={!use2D} onClick={() => { if (supportsWebGL()) setUse2D(false); hover(null); }}>3D</button></div></div>
    {compareRegions && <div className="twin-plan-labels"><span>Applied routine</span><span>Test routine</span></div>}
    <div className="twin-canvas" style={{ height }}>
      <div className="twin-model-viewport">{use2D ? fallback : <RenderBoundary fallback={fallback}><Suspense fallback={<div className="body-mesh-loading">{fallback}<span role="status">Loading 3D anatomy</span></div>}><Canvas camera={{ position: [0, 1.65, 5.9], fov: 36 }}
        dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} fallback={fallback}
        onPointerMissed={() => onRegionSelect?.(null)}
        onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setUse2D(true); }, { once: true })}>
        <BodyScene {...displayProps} activeInjury={activeInjury} onHover={hover} />
      </Canvas></Suspense></RenderBoundary>}</div>
      {focused && <RegionCard {...props} region={focused} />}
      <div className="body-interaction-hint">{use2D ? 'Hover or select a region' : 'Drag to rotate · Scroll to zoom'}</div>
    </div>
    <BodyLegend />
    {activeInjury && <div className="body-injury-status" role="status"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v5m0 2v1"/></svg><span>{activeInjury.label}</span><small>Active · onset day {activeInjury.day}</small></div>}
    {!use2D && <label className="body-region-picker"><span>Region</span><select aria-label="Select a body region" value={selectedRegion ?? ''} onChange={event => onRegionSelect?.(event.target.value ? event.target.value as RegionId : null)}><option value="">Select a region</option>{ids.map(id => <option key={id} value={id}>{regionNames[id]}</option>)}</select></label>}
  </div>;
}
