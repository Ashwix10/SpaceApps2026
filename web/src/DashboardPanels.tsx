import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompareResponse, Countermeasures, ForecastResponse, RegionId, SeriesKey } from './types';

export const tissueLabels: Record<SeriesKey, string> = {
  hip_bmd_pct: 'Hip bone', spine_bmd_pct: 'Spine bone', leg_muscle_pct: 'Leg muscle', vo2max_pct: 'Aerobic fitness',
};

export function PlanControls({ value, baseline, name, onChange }: {
  value: Countermeasures; baseline?: Countermeasures; name: string; onChange: (value: Countermeasures) => void;
}) {
  return <div className="plan-controls">{([
    ['resistance_min_per_day', 'Resistance', 'min/day', 0, 120, 5],
    ['aerobic_min_per_day', 'Aerobic', 'min/day', 0, 120, 5],
    ['protein_g_per_kg', 'Protein', 'g/kg', 0.8, 2, 0.1],
    ['calorie_pct', 'Calorie target', '%', 80, 110, 1],
  ] as const).map(([key, label, unit, min, max, step]) => <label key={key}>{label}<strong>{value[key]} {unit}</strong>
    <input aria-label={`${name} ${label}`} type="range" min={min} max={max} step={step} value={value[key]}
      onChange={e => onChange({ ...value, [key]: Number(e.target.value) })} />
    {baseline && <small>Current plan: {baseline[key]} {unit}</small>}
  </label>)}
    <label className="check"><input aria-label={`${name} Bone medication`} type="checkbox" checked={value.bisphosphonate}
      onChange={e => onChange({ ...value, bisphosphonate: e.target.checked })} /> Bone medication</label>
    {baseline && <small>Current plan: medication {baseline.bisphosphonate ? 'on' : 'off'}</small>}
  </div>;
}

const regionTissue: Record<RegionId, SeriesKey> = {
  pelvis: 'hip_bmd_pct', spine: 'spine_bmd_pct', left_leg: 'leg_muscle_pct', right_leg: 'leg_muscle_pct',
  left_arm: 'leg_muscle_pct', right_arm: 'leg_muscle_pct', chest: 'vo2max_pct', heart: 'vo2max_pct', head_neck: 'vo2max_pct',
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
        <CartesianGrid stroke="#23304A" vertical={false} /><XAxis dataKey="day" type="number" domain={[0, forecast.days.length - 1]} minTickGap={35} stroke="#8A97AD" />
        <YAxis domain={[50, 105]} stroke="#8A97AD" tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={{ background: '#121829', borderColor: '#23304A' }} labelFormatter={value => `Day ${value}`} />
        <Legend />
        <Area dataKey="currentBand" fill="#4FD1FF" fillOpacity={0.1} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
        {comparison && <Area dataKey="alternativeBand" fill="#F472B6" fillOpacity={0.08} stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />}
        <Line name="Current plan" dataKey="current" stroke="#4FD1FF" dot={false} strokeWidth={2} isAnimationActive={false} />
        {comparison && <Line name="New plan" dataKey="alternative" stroke="#F472B6" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />}
        <ReferenceLine x={forecast.landing_day} stroke="#8A97AD" strokeDasharray="3 4" label={{ value: 'Landing', fill: '#8A97AD', fontSize: 9, position: 'insideTopRight' }} />
        <ReferenceLine x={day} stroke="#FFFFFF" strokeOpacity={0.65} />
      </ComposedChart></ResponsiveContainer>
    </section>;
  })}</div>;
}
