export const theme = {
  bg: '#0B0F1A', panel: '#121829', border: '#23304A', text: '#E6EDF7',
  muted: '#8A97AD', accent: '#4FD1FF', healthy: '#3B82F6', warning: '#F59E0B', danger: '#EF4444',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
} as const;
// Named exports make the shared tokens convenient for Person 3.
export const { bg, panel, border, text, muted, accent, healthy, warning, danger } = theme;
export const colors = theme;
export function healthColor(h: number): string {
  const value = Number.isFinite(h) ? Math.min(1, Math.max(0, h)) : 1;
  const [from, to, t] = value >= 0.85
    ? [theme.warning, theme.healthy, (value - 0.85) / 0.15]
    : [theme.danger, theme.warning, Math.max(0, (value - 0.75) / 0.1)];
  const rgb = [1, 3, 5].map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t));
  return `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
export default theme;
