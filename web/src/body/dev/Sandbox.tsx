import { BodyTwin } from '../BodyTwin';
import fixture from '../../../../data/fixtures/forecast_example.json';
import type { ForecastResponse, RegionId } from '../../types';
import { useEffect, useState } from 'react';

export function Sandbox() {
  const [day, setDay] = useState(40);
  const [compare, setCompare] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<RegionId | null>(null);
  const forecast = fixture as ForecastResponse;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setDay(d => (d + 1) % forecast.days.length), 120);
    return () => clearInterval(timer);
  }, [playing, forecast.days.length]);
  const alternative = Object.fromEntries(Object.entries(forecast.regions).map(([id, values]) => [id, values.map(v => Math.min(1, v + 0.07))])) as ForecastResponse['regions'];
  return <main style={{ maxWidth: 950 }}><h1>BodyTwin sandbox</h1><p>Local forecast fixture. The comparison adds 0.07 to region health for visual inspection only.</p>
    <button onClick={() => setPlaying(v => !v)}>{playing ? 'Pause' : 'Play'}</button>
    <label><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} /> Compare bodies</label>
    <BodyTwin regions={forecast.regions} day={day} compareRegions={compare ? alternative : null}
      injuredRegion={day >= 40 ? 'left_leg' : null} selectedRegion={selected} onRegionSelect={setSelected} />
    <label>Day {day}<input type="range" min="0" max={forecast.days.length - 1} value={day} onChange={e => setDay(Number(e.target.value))} /></label>
  </main>;
}
