import { useLayoutEffect, useState, type ComponentType, type CSSProperties } from 'react'
import { CANVASES } from './canvas'
import { CanvasSurfaceContext, useSurface, type CanvasSurface } from './surface'
import MobileApp from './mobile/MobileApp'
import { useReducedMotion } from './motion'
import Hero from './sections/Hero'
import Gradient from './sections/Gradient'
import Logos from './sections/Logos'
import StickyNav from './StickyNav'
import Ribbons from './sections/Ribbons'
import Programs from './sections/Programs'
import Impact from './sections/Impact'
import Meet from './sections/Meet'
import Talent from './sections/Talent'
import Community from './sections/Community'
import Footer from './sections/Footer'

const REGISTRY: Record<string, ComponentType> = {
  hero: Hero,
  gradient: Gradient,
  logos: Logos,
  ribbons: Ribbons,
  programs: Programs,
  impact: Impact,
  meet: Meet,
  talent: Talent,
  community: Community,
  footer: Footer,
}

/**
 * Fit the canvas to the window: scaled down when the window is narrower, at 1x
 * and centred when it is wider. `bleed` is how far the window reaches past each
 * canvas edge, in canvas px; full-width bands extend by it (var(--bleed)), so a
 * wide window shows no white margins. Measured before paint, after layout, so
 * a classic scrollbar is already accounted for.
 */
function useCanvasFit(width: number) {
  const [fit, setFit] = useState({ scale: 1, bleed: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const cw = document.documentElement.clientWidth
      const scale = Math.min(1, cw / width)
      setFit({ scale, bleed: Math.max(0, (cw / scale - width) / 2) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [width])
  return fit
}

/**
 * QA only. Figma renders an isolated node onto the page background rather
 * than its real backdrop, so a section that overlays another (the nav and
 * gradient over the hero) can never match a full-page capture.
 * `?isolate=<slug>` renders that one section on the bare canvas.
 */
const isolated = new URLSearchParams(window.location.search).get('isolate')

export default function App() {
  const surface = useSurface()
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  return (
    <main className="w-full overflow-x-clip" data-motion={paused ? 'paused' : undefined} data-surface={surface}>
      {/* WCAG 2.2.2: the marquees run past 5s, so the first tab stop pauses them.
          Visible only on focus, so the design is untouched (motion-spec M-G5). */}
      {!reduced && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="fixed left-4 top-4 z-50 -translate-y-[calc(100%+64px)] rounded-full bg-white px-5 py-3 text-[16px] font-semibold text-ink focus:translate-y-0 focus:shadow-lg"
        >
          Pause moving content
        </button>
      )}
      {surface === 'mobile' ? <MobileApp /> : <CanvasPage surface={surface} />}
    </main>
  )
}

function CanvasPage({ surface }: { surface: CanvasSurface }) {
  const canvas = CANVASES[surface]
  const { scale, bleed } = useCanvasFit(canvas.w)
  const shown = isolated ? canvas.sections.filter((s) => s.slug === isolated) : canvas.sections
  const backdrop = isolated ? shown[0]?.backdrop : undefined
  return (
    <CanvasSurfaceContext.Provider value={surface}>
      {(!isolated || isolated === 'nav') && <StickyNav canvas={canvas} scale={scale} />}
      <div className="relative mx-auto" style={{ width: canvas.w * scale, height: canvas.h * scale }}>
        {/* Clipped like the Figma frame. When the window is wider, left and right
            open up and the window clips instead (main), so what overhangs the frame
            fills the margin. Only then: a canvas painting past its edge rasterises
            the hard-light logo marks a shade differently (gaps.md G-11). */}
        <div
          data-canvas="root"
          className={`absolute left-0 top-0 origin-top-left overflow-y-clip ${bleed > 0 ? 'overflow-x-visible' : 'overflow-x-clip'} bg-white`}
          style={{ width: canvas.w, height: canvas.h, transform: `scale(${scale})`, background: backdrop, '--bleed': `${bleed}px` } as CSSProperties}
        >
          {/* The nav renders in StickyNav, outside the canvas, so it can stay on screen. */}
          {shown.filter((s) => s.slug !== 'nav').map((s) => {
            const Section = REGISTRY[s.slug]
            return (
              <div
                key={s.slug}
                id={s.slug}
                data-section={s.slug}
                data-node={s.node}
                className="absolute"
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
              >
                <Section />
              </div>
            )
          })}
        </div>
      </div>
    </CanvasSurfaceContext.Provider>
  )
}
