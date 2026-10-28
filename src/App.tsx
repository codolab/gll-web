import { useEffect, useState, type ComponentType } from 'react'
import { SECTIONS, CANVAS_W, CANVAS_H } from './canvas'
import { useReducedMotion } from './motion'
import Hero from './sections/Hero'
import Gradient from './sections/Gradient'
import Logos from './sections/Logos'
import Nav from './sections/Nav'
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
  nav: Nav,
  ribbons: Ribbons,
  programs: Programs,
  impact: Impact,
  meet: Meet,
  talent: Talent,
  community: Community,
  footer: Footer,
}

/**
 * The design exists only as a 1440-wide frame, so narrower viewports get the
 * whole canvas scaled down rather than a re-flowed layout we would have had to
 * invent. See gaps.md G-01: a responsive pass needs mobile frames.
 */
function useCanvasScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const measure = () => setScale(Math.min(1, document.documentElement.clientWidth / CANVAS_W))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return scale
}

/**
 * QA only. Figma renders an isolated node onto the page background rather
 * than its real backdrop, so a section that overlays another (the nav and
 * gradient over the hero) can never match a full-page capture.
 * `?isolate=<slug>` renders that one section on the bare canvas.
 */
const isolated = new URLSearchParams(window.location.search).get('isolate')

export default function App() {
  const scale = useCanvasScale()
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const shown = isolated ? SECTIONS.filter((s) => s.slug === isolated) : SECTIONS
  const backdrop = isolated ? shown[0]?.backdrop : undefined
  return (
    <main className="w-full overflow-x-hidden" data-motion={paused ? 'paused' : undefined}>
      {/* WCAG 2.2.2: the marquees run past 5s, so the first tab stop pauses them.
          Visible only on focus, so the design is untouched (motion-spec M-G5). */}
      {!reduced && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="fixed left-4 top-4 z-50 -translate-y-[calc(100%+24px)] rounded-full bg-white px-5 py-3 text-[16px] font-semibold text-ink shadow-lg focus:translate-y-0"
        >
          Pause moving content
        </button>
      )}
      <div className="relative mx-auto" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div
          data-canvas="root"
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-white"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, background: backdrop }}
        >
          {shown.map((s) => {
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
    </main>
  )
}
