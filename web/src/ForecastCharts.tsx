import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompareResponse, ForecastResponse, RegionId, SeriesKey } from './types';
import { tissueLabels } from './DashboardPanels';

const regionTissue: Partial<Record<RegionId, SeriesKey>> = {
  pelvis: 'hip_bmd_pct', spine: 'spine_bmd_pct', left_leg: 'leg_muscle_pct', right_leg: 'leg_muscle_pct',
  chest: 'vo2max_pct', heart: 'vo2max_pct',
};

export function ForecastCharts({ forecast, comparison, day, selected }: {
  forecast: ForecastResponse; comparison: CompareResponse | null; day: number; selected: RegionId | null;
}) {
  return <div className="forecast-charts">{(Object.entries(tissueLabels) as [SeriesKey, string][]).map(([key, label]) => {
    const rows = forecast.days.map((d, i) => ({ day: d, current: forecast.series[key][i],
      currentBand: [forecast.bands[key].low[i], forecast.bands[key].high[i]],
      alternative: comparison?.alternative.series[key][i],
      alternativeBand: comparison ? [comparison.alternative.bands[key].low[i], comparison.alternative.bands[key].high[i]] : undefined,
    }));
    const current = forecast.series[key][day];
    const other = comparison?.alternative.series[key][day];
    return <section key={key} className={`forecast-chart ${selected && regionTissue[selected] === key ? 'chart-selected' : ''}`} aria-label={`${label} forecast`}>
      <div className="section-title"><h3>{label}</h3><span>{current?.toFixed(2)}%{other !== undefined && <> → <b>{other.toFixed(2)}%</b></>}</span></div>
      <ResponsiveContainer width="100%" height={190}><ComposedChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#303033" vertical={false} /><XAxis dataKey="day" type="number" domain={[0, forecast.days.length - 1]} minTickGap={35} stroke="#7D7D83" />
        <YAxis domain={[0, 105]} stroke="#7D7D83" tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={{ background: '#171718', borderColor: '#303033' }} labelFormatter={value => `Day ${value}`} />
        <Legend />
        <Area dataKey="currentBand" fill="#E1E1E4" fillOpacity={0.1} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
        {comparison && <Area dataKey="alternativeBand" fill="#8A8A91" fillOpacity={0.08} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />}
        <Line name="Current routine" dataKey="current" stroke="#E1E1E4" dot={false} strokeWidth={2} isAnimationActive={false} />
        {comparison && <Line name="New routine" dataKey="alternative" stroke="#8A8A91" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />}
        <ReferenceLine x={forecast.landing_day} stroke="#7D7D83" strokeDasharray="3 4" label={{ value: 'Landing', fill: '#7D7D83', fontSize: 9, position: 'insideTopRight' }} />
        <ReferenceLine x={day} stroke="#FFFFFF" strokeOpacity={0.65} />
      </ComposedChart></ResponsiveContainer>
    </section>;
  })}</div>;
}
