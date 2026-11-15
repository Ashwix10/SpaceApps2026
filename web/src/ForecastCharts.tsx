import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CSSProperties } from 'react';
import type { CompareResponse, ForecastResponse, RegionId, SeriesKey } from './types';
import { metricInfo, regionMetrics, signedChange } from './body/metrics';
import './research.css';

export function changeAxis(minimum: number, maximum: number): { domain: [number, number]; ticks: number[] } {
  const clean = (value: number) => Number(value.toFixed(10));
  let low = clean(Math.min(0, minimum));
  const high = clean(Math.max(0, maximum));
  if (low === high) low = -1;
  const targetStep = (high - low) / 4;
  const power = 10 ** Math.floor(Math.log10(targetStep));
  const step = clean(([1, 2, 5, 10].find(value => value * power >= targetStep) ?? 10) * power);
  const floor = clean(Math.floor(low / step) * step);
  const ceiling = clean(Math.ceil(high / step) * step);
  return {
    domain: [floor, ceiling],
    ticks: Array.from({ length: Math.round((ceiling - floor) / step) + 1 }, (_, index) => clean(floor + index * step)),
  };
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { dataKey?: string | number; value?: unknown; name?: string; color?: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const values = payload.filter(item => item.dataKey === 'current' || item.dataKey === 'alternative');
  return <div className="forecast-tooltip"><strong>Day {label}</strong>{values.map(item => <div key={String(item.dataKey)}><i style={{ background: item.color }} /><span>{item.name}</span><b>{typeof item.value === 'number' ? signedChange(item.value + 100) : ''}</b></div>)}<small>Change from preflight baseline</small></div>;
}

export function ForecastCharts({ forecast, comparison, day, selected }: {
  forecast: ForecastResponse; comparison: CompareResponse | null; day: number; selected: RegionId | null;
}) {
  const lastDay = forecast.days.at(-1) ?? 0;
  const injuryEvents = forecast.events.filter(event => event.type === 'injury');
  return <div className="forecast-chart-group"><div className="forecast-chart-key"><span><i className="key-line" />Applied routine</span>{comparison && <span><i className="key-line key-dashed" />Test routine</span>}<span><i className="key-band" />Sensitivity range</span>{injuryEvents.map(event => <span key={`${event.day}-${event.label}`} className="forecast-injury-key"><i />{event.label} · day {event.day}</span>)}<span className="forecast-unit-note">Change from preflight baseline (%)</span></div><div className="forecast-charts">{(Object.keys(metricInfo) as SeriesKey[]).map(key => {
    const info = metricInfo[key];
    const rows = forecast.days.map((d, i) => ({ day: d, current: forecast.series[key][i] - 100,
      currentBand: [forecast.bands[key].low[i] - 100, forecast.bands[key].high[i] - 100],
      alternative: comparison ? comparison.alternative.series[key][i] - 100 : undefined,
      alternativeBand: comparison ? [comparison.alternative.bands[key].low[i] - 100, comparison.alternative.bands[key].high[i] - 100] : undefined,
    }));
    const current = forecast.series[key][day];
    const other = comparison?.alternative.series[key][day];
    const minimum = Math.min(...forecast.bands[key].low, ...forecast.series[key], ...(comparison?.alternative.bands[key].low ?? []), ...(comparison?.alternative.series[key] ?? [])) - 100;
    const maximum = Math.max(...forecast.bands[key].high, ...forecast.series[key], ...(comparison?.alternative.bands[key].high ?? []), ...(comparison?.alternative.series[key] ?? [])) - 100;
    const axis = changeAxis(minimum, maximum);
    return <section key={key} className={`forecast-chart ${selected && regionMetrics[selected]?.includes(key) ? 'chart-selected' : ''}`} style={{ '--metric-color': info.color } as CSSProperties} aria-label={`${info.label} forecast, change from baseline in percent`}>
      <div className="forecast-chart-heading"><div><i /><h3>{info.short}</h3></div><span>{signedChange(current)}{other !== undefined && <> <span aria-hidden="true">→</span> <b>{signedChange(other)}</b></>}</span></div>
      <div className="forecast-chart-caption"><span>Change from baseline (%)</span><span>Day {day}</span></div>
      <ResponsiveContainer width="100%" height={310}><ComposedChart data={rows} margin={{ top: 18, right: 23, left: 6, bottom: 15 }}>
        <CartesianGrid stroke="#8FB3B51C" vertical={false} />
        <XAxis dataKey="day" type="number" domain={[0, lastDay]} minTickGap={36} tickLine={false} axisLine={{ stroke: '#8FB3B533' }} stroke="#A5BCC2" tick={{ fontSize: 12 }} height={43} tickFormatter={value => `${value}`} label={{ value: 'Mission day', position: 'insideBottom', offset: -3, fill: '#91ADB4', fontSize: 11 }} />
        <YAxis domain={axis.domain} ticks={axis.ticks} interval={0} allowDataOverflow width={52} stroke="#A5BCC2" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={value => `${value}%`} />
        <ReferenceArea x1={forecast.landing_day} x2={lastDay} fill="#91B6B4" fillOpacity={.035} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#B4CECE66', strokeDasharray: '3 3' }} />
        <Area dataKey="currentBand" fill={info.color} fillOpacity={.11} stroke="none" tooltipType="none" isAnimationActive={false} />
        {comparison && <Area dataKey="alternativeBand" fill="#DDEEE6" fillOpacity={.05} stroke="none" tooltipType="none" isAnimationActive={false} />}
        <ReferenceLine y={0} stroke="#BAD0C95C" strokeDasharray="3 3" label={{ value: '0% baseline', position: 'insideTopRight', fill: '#A4BFBB', fontSize: 11 }} />
        <Line name="Applied routine" dataKey="current" stroke={info.color} dot={false} activeDot={{ r: 4, stroke: '#0D1C21', strokeWidth: 2 }} strokeWidth={2.3} isAnimationActive={false} />
        {comparison && <Line name="Test routine" dataKey="alternative" stroke="#DDEEE6" strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} strokeWidth={1.8} isAnimationActive={false} />}
        <ReferenceLine x={forecast.landing_day} stroke="#96B3B26B" strokeDasharray="3 4" label={{ value: 'Landing', fill: '#A4BFBB', fontSize: 11, position: 'insideBottomRight' }} />
        {injuryEvents.map(event => <ReferenceLine key={`${event.day}-${event.label}`} x={event.day} stroke="#EFAD82" strokeWidth={1.3} strokeDasharray="4 4" label={{ value: `Injury · D${event.day}`, fill: '#EFC39D', fontSize: 10, position: event.day < lastDay * .12 ? 'insideBottomRight' : 'insideBottomLeft' }} />)}
        <ReferenceLine x={day} stroke="#D5EAE3" strokeOpacity={.48} />
      </ComposedChart></ResponsiveContainer>
    </section>;
  })}</div></div>;
}
