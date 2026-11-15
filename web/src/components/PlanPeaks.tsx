import { useEffect, useMemo, useRef, useState } from 'react';
import { PeakChart } from '@/components/ui/peak-chart';
import type { CompareResponse, ForecastResponse, SeriesKey } from '../types';

const MEASURES: Record<string, SeriesKey> = {
  'Hip bone': 'hip_bmd_pct', 'Back bone': 'spine_bmd_pct', 'Leg tissue': 'leg_muscle_pct', 'Cardio': 'vo2max_pct',
};
const STEP = 5; // days between plotted points

/** Loss from the preflight baseline (100 − %), sampled every STEP days, with the last day always included. */
function lossSeries(forecast: ForecastResponse, key: SeriesKey) {
  const values = forecast.series[key];
  const days: number[] = [];
  for (let d = 0; d < values.length; d += STEP) days.push(d);
  if (days.at(-1) !== values.length - 1) days.push(values.length - 1);
  if (!days.includes(forecast.landing_day)) { days.push(forecast.landing_day); days.sort((a, b) => a - b); }
  const landing = forecast.landing_day;
  return {
    data: days.map(d => +(100 - values[d]).toFixed(2)),
    labels: days.map(d => d === landing ? `Landing · day ${d}` : d > landing ? `${d - landing} days after landing` : `Day ${d}`),
    atLanding: 100 - values[landing],
  };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Two Peak Chart cards: how much of one measure each routine loses through the mission, on a shared scale. */
export function PlanPeaks({ comparison }: { comparison: CompareResponse }) {
  const [measure, setMeasure] = useState('Hip bone');
  const [ref, width] = useWidth();
  const key = MEASURES[measure];
  const current = useMemo(() => lossSeries(comparison.baseline, key), [comparison, key]);
  const next = useMemo(() => lossSeries(comparison.alternative, key), [comparison, key]);
  const top = Math.max(...current.data, ...next.data, 0.5);
  const domain: [number, number] = [0, Math.ceil(top * 1.05 * 10) / 10];
  const stacked = width < 620;
  const cardWidth = Math.round(Math.max(220, Math.min(360, stacked ? width - 40 : (width - 80) / 2)));
  const diff = next.atLanding - current.atLanding;
  const diffText = Math.abs(diff) < 0.05 ? 'same as current' : `${Math.abs(diff).toFixed(1)} points ${diff < 0 ? 'less' : 'more'} than current`;
  const shared = { periods: Object.keys(MEASURES), period: measure, onPeriodChange: setMeasure, domain, decimals: 1, valueSuffix: '%',
    trend: 'down' as const, width: cardWidth, formatValue: (v: number) => `${v.toFixed(1)}% lost`, font: 'Inter, "Segoe UI", system-ui, sans-serif' };

  return <section className="plan-peaks" aria-label="Loss through the mission for each routine">
    <div className="plan-peaks-heading">
      <span className="section-number">WORST POINT</span>
      <h2>How much each routine loses.</h2>
      <p>The line is the loss from preflight over the mission and 90 days of recovery; the dot sits on the worst day. Both cards share one scale. Use the menu on either card to switch measures.</p>
    </div>
    <div ref={ref} className="plan-peaks-cards" style={{ flexDirection: stacked ? 'column' : 'row' }}>
      <PeakChart {...shared} data={current.data} labels={current.labels} value={+current.atLanding.toFixed(1)}
        title={`${measure} lost by landing`} caption="Current routine" updatedText="Current" />
      <PeakChart {...shared} accent="#FFC65A" data={next.data} labels={next.labels} value={+next.atLanding.toFixed(1)}
        title={`${measure} lost by landing`} caption={`New routine · ${diffText}`} updatedText="New" />
    </div>
  </section>;
}
