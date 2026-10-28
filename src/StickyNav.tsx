/**
 * M-16: the nav (Figma 94:120) stays at the top of the viewport. It cannot
 * stick from inside the canvas, which is transformed and clipped, so it renders
 * in its own fixed layer with the canvas's scale and centring. At the top of
 * the page the layer is transparent and the nav sits exactly where the frame
 * has it; once the hero has scrolled out from under it, an ink bar fades in.
 */
import { useEffect, useState } from 'react'
import { CANVAS_W, SECTIONS } from './canvas'
import Nav from './sections/Nav'

const NAV = SECTIONS.find((s) => s.slug === 'nav')!
const HERO_RADIUS = 50 // the hero's rounded bottom corners uncover white before its edge arrives

/** True once the hero's bottom edge has scrolled up to `offset` px from the viewport top. */
function useHeroPassed(offset: number) {
  const [passed, setPassed] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const io = new IntersectionObserver((entries) => setPassed(!entries[entries.length - 1].isIntersecting), {
      rootMargin: `${-Math.round(offset)}px 0px 0px 0px`,
    })
    io.observe(hero)
    return () => io.disconnect()
  }, [offset])
  return passed
}

export default function StickyNav({ scale }: { scale: number }) {
  const height = (NAV.y + NAV.h) * scale
  const solid = useHeroPassed(height + HERO_RADIUS * scale)
  useEffect(() => {
    // Read by index.css: focused controls scroll clear of the bar (WCAG 2.4.11).
    const root = document.documentElement
    root.style.setProperty('--nav-h', `${Math.ceil(height)}px`) // scrolling lands on whole px
    return () => {
      root.style.removeProperty('--nav-h')
    }
  }, [height])
  return (
    <header className="fixed inset-x-0 top-0 z-40" style={{ height }}>
      <div
        data-nav-bar={solid ? 'solid' : 'clear'}
        className={`absolute inset-0 bg-ink shadow-[0_8px_24px_rgb(11_23_34/0.18)] transition-opacity duration-300 motion-reduce:transition-none ${solid ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className="relative mx-auto h-full" style={{ width: CANVAS_W * scale }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: CANVAS_W, transform: `scale(${scale})` }}>
          <div
            id="nav"
            data-section="nav"
            data-node={NAV.node}
            className="absolute"
            style={{ left: NAV.x, top: NAV.y, width: NAV.w, height: NAV.h }}
          >
            <Nav />
          </div>
        </div>
      </div>
    </header>
  )
}
