import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

/** Keep incomplete numeric edits local; submit a bounded value on blur or Enter. */
export function MissionNumberInput({ value, onCommit, min, max, step = 1, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'> & {
  value: number; onCommit: (value: number) => void; min: number; max: number; step?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const canceled = useRef(false);
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    if (canceled.current) { canceled.current = false; return; }
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = Number(Math.max(min, Math.min(max, Math.round(parsed / step) * step)).toFixed(6));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  }
  return <input {...props} type="number" min={min} max={max} step={step} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { canceled.current = true; setDraft(String(value)); event.currentTarget.blur(); } }}/>
}
