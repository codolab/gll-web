/**
 * M-16: the nav (Figma 94:120; wide 173:347) stays at the top of the viewport. It cannot
 * stick from inside the canvas, which is transformed and clipped, so it renders
 * in its own fixed layer with the canvas's scale and centring. At the top of
 * the page the layer is transparent and the nav sits exactly where the frame
 * has it; once the hero has scrolled out from under it, an ink bar fades in.
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import type { Canvas } from './canvas'
import { useCanvasSurface } from './surface'
import Nav from './sections/Nav'

// Desktop's hero rounds its bottom corners, which uncover white before its edge arrives; wide's band is square.
const HERO_RADIUS = { desktop: 50, wide: 0 }

/**
 * Whether the hero's bottom edge has scrolled up to `offset` px from the
 * viewport top, and whether a change should fade: not until the observer's
 * first report has painted, so a page reloaded mid-scroll shows its bar at once.
 */
function useHeroPassed(offset: number) {
  const [passed, setPassed] = useState(false)
  const [live, setLive] = useState(false)
  useLayoutEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const margin = Math.round(offset)
    setPassed(hero.getBoundingClientRect().bottom < margin)
    let first = true
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      setPassed(!entries[entries.length - 1].isIntersecting)
      if (first) raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setLive(true))))
      first = false
    }, { rootMargin: `${-margin}px 0px 0px 0px` })
    io.observe(hero)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [offset])
  return { passed, live }
}

export default function StickyNav({ canvas, scale }: { canvas: Canvas; scale: number }) {
  const NAV = canvas.sections.find((s) => s.slug === 'nav')!
  const height = (NAV.y + NAV.h) * scale
  const { passed: solid, live } = useHeroPassed(height + HERO_RADIUS[useCanvasSurface()] * scale)
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
        className={`absolute inset-0 bg-ink shadow-[0_8px_24px_rgb(11_23_34/0.18)] ${live ? 'transition-opacity duration-300 motion-reduce:transition-none' : ''} ${solid ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className="relative mx-auto h-full" style={{ width: canvas.w * scale }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: canvas.w, transform: `scale(${scale})` }}>
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
