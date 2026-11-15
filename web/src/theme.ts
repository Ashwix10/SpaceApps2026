export const theme = {
  bg: '#0C0C0D', panel: '#141415', border: '#2A2A2C', text: '#F1F1F1',
  muted: '#929294', accent: '#F1F1F1', healthy: '#DADADA', warning: '#B49B70', danger: '#B87575',
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
