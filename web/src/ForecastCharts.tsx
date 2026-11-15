import { useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, ErrorBar, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import sprint from '../../data/research/sprint_control.json';
import moore from '../../data/research/moore_2014_vo2.json';
import type { CompareResponse, ForecastResponse, RegionId, SeriesKey } from './types';
import { tissueLabels } from './DashboardPanels';
import { chart } from './theme';

const regionTissue: Partial<Record<RegionId, SeriesKey>> = {
  pelvis: 'hip_bmd_pct', spine: 'spine_bmd_pct', left_leg: 'leg_muscle_pct', right_leg: 'leg_muscle_pct',
  chest: 'vo2max_pct', heart: 'vo2max_pct',
};

/** NASA Sprint study (English et al. 2020) postflight group mean as % of preflight, with ±1 SE of the postflight mean. */
const sprintPoints = Object.fromEntries(sprint.outcomes.map(o => [`${o.key}_pct`, {
  offset: o.fit_offset_days, pct: 100 * o.post_mean / o.pre_mean, se: 100 * o.post_se / o.pre_mean,
}])) as Partial<Record<SeriesKey, { offset: number; pct: number; se: number }>>;

export function ForecastCharts({ forecast, comparison, day, selected }: {
  forecast: ForecastResponse; comparison: CompareResponse | null; day: number; selected: RegionId | null;
}) {
  // Let the page paint first; the four charts are built a moment later.
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 120); return () => clearTimeout(t); }, []);
  if (!ready) return <p className="chart-loading" role="status">Drawing the charts…</p>;
  return <div className="forecast-charts">{(Object.entries(tissueLabels) as [SeriesKey, string][]).map(([key, label]) => {
    const point = sprintPoints[key];
    const nasaDay = point ? Math.min(forecast.landing_day + point.offset, forecast.days.length - 1) : -1;
    const mooreDay = key === moore.series && moore.day <= forecast.landing_day ? moore.day : -1;
    // Plot about 120 points per chart (always keeping landing, the NASA points and the last day) to keep rendering fast.
    const step = Math.max(1, Math.ceil(forecast.days.length / 120));
    const keep = (i: number) => i % step === 0 || i === forecast.landing_day || i === nasaDay || i === mooreDay || i === forecast.days.length - 1;
    const rows = forecast.days.filter((_, i) => keep(i)).map(i => ({ day: i, current: forecast.series[key][i],
      currentBand: [forecast.bands[key].low[i], forecast.bands[key].high[i]],
      alternative: comparison?.alternative.series[key][i],
      alternativeBand: comparison ? [comparison.alternative.bands[key].low[i], comparison.alternative.bands[key].high[i]] : undefined,
      nasa: point && i === nasaDay ? +point.pct.toFixed(2) : undefined,
      nasaError: point && i === nasaDay ? +point.se.toFixed(2) : undefined,
      challenge: i === mooreDay ? moore.observed_pct : undefined,
      challengeError: i === mooreDay ? [moore.observed_pct - moore.reported_95_ci_pct[0], moore.reported_95_ci_pct[1] - moore.observed_pct] : undefined,
    }));
    const lows = [...forecast.bands[key].low, ...(comparison?.alternative.bands[key].low ?? []),
      point ? point.pct - point.se : 100, mooreDay >= 0 ? moore.reported_95_ci_pct[0] : 100];
    const floor = Math.max(0, Math.floor(Math.min(...lows) - 1));
    const current = forecast.series[key][day];
    const other = comparison?.alternative.series[key][day];
    return <section key={key} className={`forecast-chart ${selected && regionTissue[selected] === key ? 'chart-selected' : ''}`} aria-label={`${label} forecast`}>
      <div className="section-title"><h3>{label}</h3><span>{current?.toFixed(2)}%{other !== undefined && <> → <b>{other.toFixed(2)}%</b></>}</span></div>
      <ResponsiveContainer width="100%" height={200}><ComposedChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`band-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chart.current} stopOpacity={0.28} /><stop offset="100%" stopColor={chart.current} stopOpacity={0.04} /></linearGradient>
        </defs>
        <CartesianGrid stroke={chart.grid} vertical={false} /><XAxis dataKey="day" type="number" domain={[0, forecast.days.length - 1]} minTickGap={35} stroke={chart.axis} tick={{ fontSize: 10 }} />
        <YAxis domain={[floor, 101]} allowDataOverflow stroke={chart.axis} tick={{ fontSize: 10 }} tickCount={5} tickFormatter={v => `${Math.round(v)}%`} />
        <Tooltip contentStyle={{ background: chart.tooltip, borderColor: '#262626', borderRadius: 10 }} labelFormatter={value => `Day ${value}`} />
        <Legend />
        <Area dataKey="currentBand" fill={`url(#band-${key})`} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
        {comparison && <Area dataKey="alternativeBand" fill={chart.alternative} fillOpacity={0.1} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />}
        <Line name="Current routine" dataKey="current" stroke={chart.current} dot={false} strokeWidth={2.2} isAnimationActive={false} />
        {comparison && <Line name="New routine" dataKey="alternative" stroke={chart.alternative} strokeDasharray="5 4" dot={false} strokeWidth={2.2} isAnimationActive={false} />}
        {point && <Scatter name="NASA astronauts (Sprint, n=17)" dataKey="nasa" fill={chart.nasa} shape="diamond" isAnimationActive={false}>
          <ErrorBar dataKey="nasaError" direction="y" width={6} stroke={chart.nasa} strokeWidth={1.4} />
        </Scatter>}
        {mooreDay >= 0 && <Scatter name="NASA early-flight cohort (Moore 2014)" dataKey="challenge" fill={chart.challenge} shape="circle" isAnimationActive={false}>
          <ErrorBar dataKey="challengeError" direction="y" width={6} stroke={chart.challenge} strokeWidth={1.4} />
        </Scatter>}
        <ReferenceLine x={forecast.landing_day} stroke={chart.axis} strokeDasharray="3 4" label={{ value: 'Landing', fill: chart.axis, fontSize: 9, position: 'insideTopRight' }} />
        <ReferenceLine x={day} stroke="#FFFFFF" strokeOpacity={0.65} />
      </ComposedChart></ResponsiveContainer>
    </section>;
  })}
    <p className="chart-data-note">◆ White diamonds: NASA Sprint study group averages (17 ISS astronauts, 165-day missions, English et al. 2020), ±1 SE, plotted at the same days after landing. ● Orange: a separate early-flight NASA cohort (Moore 2014, 95% CI) that the smooth model does not reproduce.</p>
  </div>;
}
