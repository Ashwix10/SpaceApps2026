export type Page = 'home' | 'astronauts' | 'mission' | 'explore' | 'compare' | 'research';
export const pages: Page[] = ['home', 'astronauts', 'mission', 'explore', 'compare', 'research'];
export function pageFromHash(hash: string): Page {
  const path = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
  return pages.includes(path as Page) ? path as Page : 'home';
}
export const pageHref = (page: Page) => page === 'home' ? '#/' : `#/${page}`;
