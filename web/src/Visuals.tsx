import type { CSSProperties } from 'react';

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    astronauts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
    research: 'M12 5v16 M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
    mission: 'M12 3v18 M3 12h18 M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
    explore: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M5 10l7 2 7-2 M12 12v4 M8 22l4-6 4 6',
    compare: 'M6 3v18 M18 3v18 M3 7h6 M15 17h6 M6 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    plus: 'M12 5v14 M5 12h14',
    orbit: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M3 18c-5-5 13-20 18-12S8 26 3 18',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.orbit}/></svg>;
}

/** Decorative orbital illustration. No measurements or live tracking implied. */
export function OrbitalVisual() {
  return <div className="orbital-visual" aria-hidden="true">
    <div className="space-stars"/>
    <div className="orbital-grid"/>
    <div className="planet-halo"/>
    <div className="orbital-planet"><div className="planet-land"/><div className="planet-shadow"/></div>
    <div className="orbital-ring ring-a"><i/></div><div className="orbital-ring ring-b"/><div className="orbital-ring ring-c"/>
    <div className="orbit-coordinate">HUMAN HEALTH / BEYOND EARTH</div>
    <div className="orbit-label"><span/><div>Explore what changes.<small>Understand what matters.</small></div></div>
    <span className="orbit-cross cross-one">+</span><span className="orbit-cross cross-two">+</span>
  </div>;
}

export function DestinationVisual({ destination }: { destination: string }) {
  return <div className={`destination-visual destination-${destination.toLowerCase()}`} aria-hidden="true"><div className="destination-planet"/><span className="destination-path"/><Icon name="orbit" size={21}/></div>;
}

export function StaggerStyle(index: number): CSSProperties { return { '--order': index } as CSSProperties; }
