import { createContext, useContext, useSyncExternalStore } from 'react'

/**
 * Which composition the viewport gets. `desktop` and `wide` are the Figma
 * frames 94:84 (1440) and 173:310 (1640), each a fixed canvas; `mobile` has no
 * frame yet and is a flow layout (MOBILE_SPEC.md, gaps.md G-01). Wide takes
 * over halfway between the two frame widths, so neither canvas is ever more
 * than 100px narrower than the window it fills.
 */
export type Surface = 'mobile' | 'desktop' | 'wide'
export type CanvasSurface = Exclude<Surface, 'mobile'>

export const MOBILE_MAX = 1023
export const WIDE_MIN = 1540
/** The widest window the canvases fill edge to edge; wider, the composition stops here, centred (gaps.md G-11). */
export const WINDOW_MAX = 2560

/** QA only: `?surface=` pins a composition whatever the viewport (scripts/harness.mjs). */
const pinned = new URLSearchParams(window.location.search).get('surface')
const PINNED: Surface | null = pinned === 'mobile' || pinned === 'desktop' || pinned === 'wide' ? pinned : null

const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
const wide = window.matchMedia(`(min-width: ${WIDE_MIN}px)`)
const subscribe = (onChange: () => void) => {
  mobile.addEventListener('change', onChange)
  wide.addEventListener('change', onChange)
  return () => {
    mobile.removeEventListener('change', onChange)
    wide.removeEventListener('change', onChange)
  }
}
const read = (): Surface => PINNED ?? (mobile.matches ? 'mobile' : wide.matches ? 'wide' : 'desktop')

export const useSurface = () => useSyncExternalStore(subscribe, read)

/** The canvas a section renders into; section components pick their geometry by it. */
export const CanvasSurfaceContext = createContext<CanvasSurface>('desktop')
export const useCanvasSurface = () => useContext(CanvasSurfaceContext)
