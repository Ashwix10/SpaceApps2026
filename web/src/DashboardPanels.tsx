import type { Countermeasures, SeriesKey } from './types';

export const tissueLabels: Record<SeriesKey, string> = {
  hip_bmd_pct: 'Hip bone density', spine_bmd_pct: 'Back bone density', leg_muscle_pct: 'Leg lean tissue', vo2max_pct: 'Cardio fitness',
};

export function PlanControls({ value, baseline, name, onChange }: {
  value: Countermeasures; baseline?: Countermeasures; name: string; onChange: (value: Countermeasures) => void;
}) {
  const choices = [
    { label: 'No exercise', minutes: 0, detail: '0 minutes a day' },
    { label: 'Short routine', minutes: 30, detail: '1 hour a day' },
    { label: 'Full routine', minutes: 60, detail: '2 hours a day' },
    { label: 'Extended routine', minutes: 90, detail: '3 hours a day' },
  ];
  const matched = choices.some(c => value.resistance_min_per_day === c.minutes && value.aerobic_min_per_day === c.minutes);
  return <div className="plan-controls">
    <fieldset className="routine-choices"><legend>Daily exercise</legend>{choices.map(choice => <label className="routine-choice" key={choice.label}>
      <input type="radio" name={`${name}-exercise`} checked={value.resistance_min_per_day === choice.minutes && value.aerobic_min_per_day === choice.minutes}
        onChange={() => onChange({ ...value, resistance_min_per_day: choice.minutes, aerobic_min_per_day: choice.minutes })} />
      <span><b>{choice.label}</b><small>{choice.detail}</small></span>
    </label>)}</fieldset>
    {!matched && <p className="field-note">Custom exercise: {value.resistance_min_per_day + value.aerobic_min_per_day} minutes a day.</p>}
    {baseline && <p className="field-note">Current routine: {baseline.resistance_min_per_day + baseline.aerobic_min_per_day} minutes a day.</p>}
    <p className="field-note">Equal parts strength and cardio. Food and medication stay unchanged.</p>
    {value.bisphosphonate && <p className="field-note">This scenario also includes bone medication.</p>}
    <details className="detail-section" key={name}><summary>Exact settings</summary>
      {([
        ['resistance_min_per_day', 'Strength training', 'minutes a day', 0, 120, 5],
        ['aerobic_min_per_day', 'Cardio', 'minutes a day', 0, 120, 5],
        ['protein_g_per_kg', 'Protein', 'grams per kg of body weight', 0.8, 2, 0.1],
        ['calorie_pct', 'Food intake', '% of daily energy needs', 80, 110, 1],
      ] as const).map(([key, label, unit, min, max, step]) => <label key={key}>{label}
        <input aria-label={`${name} ${label}`} type="number" min={min} max={max} step={step} value={value[key]}
          onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n) && n >= min && n <= max) onChange({ ...value, [key]: n }); }} />
        <small>{unit}</small>
      </label>)}
      <label className="check"><input aria-label={`${name} Bone medication`} type="checkbox" checked={value.bisphosphonate}
        onChange={e => onChange({ ...value, bisphosphonate: e.target.checked })} /> Include bone medication</label>
      <p className="field-note">Research scenarios only. Exercise splits, food settings and medication effects are model assumptions, not NASA prescriptions.</p>
    </details>
  </div>;
}
