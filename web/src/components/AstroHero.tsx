import { useEffect, useState } from 'react';
import { OrbitalHeroSection } from '@/components/ui/orbital-hero-section';

/** True while the viewport is narrow. Drives the layout swap below. */
function useNarrow(query = '(max-width: 767px)') {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setNarrow(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, [query]);
  return narrow;
}

/**
 * Home hero. The Sun sits off to the right, a veil darkens the left edge for the copy,
 * and on narrow screens the art drops low with the copy above it.
 */
export function AstroHero({ ready, onCreate }: { ready: boolean; onCreate: () => void }) {
  const narrow = useNarrow();
  return <section className="astro-hero relative w-full overflow-hidden rounded-2xl min-h-[560px] md:min-h-[600px]" aria-label="AstroTwin">
    <OrbitalHeroSection
      focus={narrow ? [0.5, 0.86] : [0.74, 0.42]}
      scrim={narrow ? 'top' : 'left'}
      scrimStrength={narrow ? 0.94 : 0.92}
      viewRadius={narrow ? 2.1 : 3.1}
      lead={narrow ? 0.05 : 0.12}
      glow={narrow ? 0.5 : 1}
      className="absolute inset-0"
    >
      <div className="flex h-full min-h-[560px] items-start px-6 pt-12 sm:px-10 md:min-h-[600px] md:items-center md:pt-0 lg:px-16">
        <div className="max-w-[34rem]">
          <p className="astro-hero-kicker">Astronaut health digital twin</p>
          <h1 id="page-heading" tabIndex={-1} className="astro-hero-title">Forecast the body<br />before you decide</h1>
          <p className="astro-hero-copy">
            A sprained ankle on day 40 of a 180-day mission. AstroTwin forecasts bone, muscle and fitness
            through landing, lets you compare two plans, and checks every curve against measurements from
            17 ISS astronauts in NASA’s Sprint study.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
            <button type="button" className="astro-pill astro-pill-solid" disabled={!ready} onClick={onCreate}>Create a flight</button>
            <a className="astro-pill astro-pill-ghost" href="#/research">See the NASA data</a>
          </div>
        </div>
      </div>
    </OrbitalHeroSection>
  </section>;
}
