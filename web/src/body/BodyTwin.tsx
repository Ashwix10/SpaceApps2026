import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';
import { BodyScene } from './BodyScene';
import { BodyTwin2D } from './BodyTwin2D';
import './body.css';

const ids: RegionId[] = ['head_neck', 'chest', 'heart', 'spine', 'pelvis', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
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
  return <div className="body-legend"><div /><span>Before mission</span><span>Some change</span><span>More change</span></div>;
}

export function BodyTwin(props: BodyTwinProps) {
  const { regions, day, compareRegions, selectedRegion, onRegionSelect, height = 520 } = props;
  const [hovered, setHovered] = useState<RegionId | null>(null);
  const [use2D, setUse2D] = useState(() => !supportsWebGL());
  const focused = hovered ?? selectedRegion;
  const fallback = <BodyTwin2D {...props} height={height} />;
  return <div className="body-twin">
    <div className="twin-heading"><span className="eyebrow">Day {day}</span>
      <button className="view-toggle" onClick={() => setUse2D(value => !value)}>{use2D ? '3D view' : '2D view'}</button></div>
    {compareRegions && <div className="twin-plan-labels"><span>Current routine</span><span>New routine</span></div>}
    <div className="twin-canvas" style={{ height }}>
      {use2D ? fallback : <RenderBoundary fallback={fallback}><Canvas camera={{ position: [0, 1.65, 5.9], fov: 36 }}
        dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} fallback={fallback}
        onPointerMissed={() => onRegionSelect?.(null)}
        onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setUse2D(true); }, { once: true })}>
        <BodyScene {...props} onHover={setHovered} />
      </Canvas></RenderBoundary>}
      <div className="twin-tooltip" aria-live="polite">{focused ? <>{(focused === 'pelvis' ? 'Hips' : focused === 'spine' ? 'Back' : focused.replaceAll('_', ' '))} <strong>{Math.round((regions[focused]?.[day] ?? 1) * 100)}/100</strong>
        {compareRegions && <> / new routine <strong>{Math.round((compareRegions[focused]?.[day] ?? 1) * 100)}/100</strong></>}</> : use2D ? 'Select a body area for a closer look' : 'Drag to rotate · Scroll to zoom'}</div>
    </div>
    <details className="body-area-menu"><summary>Body areas & color key</summary><BodyLegend />
    <div className="regions body-region-controls" aria-label="Select a body region">{ids.map(id => <button key={id}
      aria-pressed={selectedRegion === id} style={{ borderColor: healthColor(regions[id]?.[day] ?? 1) }}
      onClick={() => onRegionSelect?.(selectedRegion === id ? null : id)}>{id.replaceAll('_', ' ')}</button>)}</div>
    <small className="twin-note">Colors and scores show an illustrative change index, not measured tissue percentages.</small></details>
  </div>;
}
