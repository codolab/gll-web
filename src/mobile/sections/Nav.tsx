/**
 * nav on mobile (MOBILE_SPEC.md 1). A fixed 64px header: clear over the hero,
 * then an ink bar fades in once the hero has scrolled out from under it (the
 * desktop M-16, src/StickyNav.tsx). The menu button opens a full-screen ink
 * sheet, a modal dialog that repeats the header row with a close button in the
 * menu button's place: focus moves in and is held there, Escape and every link
 * close it, focus returns to the menu button, and the page behind stays put.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

const BAR_H = 64
const HERO_RADIUS = 32 // the hero's rounded bottom (Hero.tsx) uncovers white before its edge arrives
const SHEET_ID = 'mobile-menu'
// The desktop nav's links (94:132..94:136); CSS collapses their trailing spaces.
const LINKS = ['About ', 'Network', 'Programs ', 'Events ', 'Join us ']

/**
 * Whether the hero's bottom edge has scrolled up to `offset` px from the
 * viewport top, and whether a change should fade: not until the observer's
 * first report has painted, so a page reloaded mid-scroll shows its bar at once.
 * StickyNav's hook, which is private to the canvas.
 */
function useHeroPassed(offset: number) {
  const [passed, setPassed] = useState(false)
  const [live, setLive] = useState(false)
  useLayoutEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    setPassed(hero.getBoundingClientRect().bottom < offset)
    let first = true
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      setPassed(!entries[entries.length - 1].isIntersecting)
      if (first) raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setLive(true))))
      first = false
    }, { rootMargin: `${-offset}px 0px 0px 0px` })
    io.observe(hero)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [offset])
  return { passed, live }
}

const focusRing = 'outline-white focus-visible:outline-2 focus-visible:outline-offset-2'
const Bar = ({ className = '' }: { className?: string }) => <span className={`block h-[2px] w-[22px] rounded-full bg-white ${className}`} />

/** Logo, the pink "JOIN US" pill (94:137) and a 44px icon button, at the window's gutters at every width. */
function TopRow({ onLink, children }: { onLink?: () => void; children: ReactNode }) {
  return (
    <div className="relative flex h-16 w-full shrink-0 items-center justify-between px-5">
      <a href="#" onClick={onLink} className={`flex h-11 min-w-11 items-center rounded-[4px] ${focusRing}`}>
        <img src="/assets/nav/logo.svg" alt="Global Lithuanian Leaders" width={41} height={40} className="block h-10 w-auto" />
      </a>
      <div className="flex items-center gap-2">
        <a
          href="#"
          onClick={onLink}
          className={`flex h-11 items-center rounded-full bg-pink px-6 text-[14px] font-semibold uppercase leading-[20px] text-white ${focusRing}`}
        >
          join us
        </a>
        {children}
      </div>
    </div>
  )
}

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const { passed: solid, live } = useHeroPassed(BAR_H + HERO_RADIUS)

  useEffect(() => {
    // Read by index.css: focused controls scroll clear of the bar (WCAG 2.4.11).
    const root = document.documentElement
    root.style.setProperty('--nav-h', `${BAR_H}px`)
    return () => {
      root.style.removeProperty('--nav-h')
    }
  }, [])

  const close = () => {
    setOpen(false)
    button.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    sheet.current?.querySelector<HTMLElement>('nav a')?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /** Tab and Shift+Tab wrap inside the sheet. */
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !sheet.current) return
    const els = [...sheet.current.querySelectorAll<HTMLElement>('a[href], button')]
    const [first, last] = [els[0], els[els.length - 1]]
    const inside = sheet.current.contains(document.activeElement)
    if (e.shiftKey ? !inside || document.activeElement === first : !inside || document.activeElement === last) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
  }

  return (
    <header id="nav" data-section="nav" className="fixed inset-x-0 top-0 z-40 h-16">
      <div
        data-nav-bar={solid ? 'solid' : 'clear'}
        className={`absolute inset-0 bg-ink shadow-[0_8px_24px_rgb(11_23_34/0.18)] ${live ? 'transition-opacity duration-300 motion-reduce:transition-none' : ''} ${solid ? 'opacity-100' : 'opacity-0'}`}
      />
      <TopRow>
        <button
          ref={button}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls={SHEET_ID}
          onClick={() => setOpen(true)}
          className={`-mr-2.5 flex size-11 flex-col items-center justify-center gap-[5px] rounded-full ${focusRing}`}
        >
          <Bar />
          <Bar />
          <Bar />
        </button>
      </TopRow>

      <div
        ref={sheet}
        id={SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onKeyDown={trap}
        className={`fixed inset-0 z-50 flex-col overflow-y-auto overscroll-contain bg-ink text-white transition-[opacity,display] transition-discrete duration-200 motion-reduce:transition-none ${open ? 'flex opacity-100 starting:opacity-0' : 'pointer-events-none hidden opacity-0'}`}
      >
        <TopRow onLink={close}>
          <button type="button" aria-label="Close menu" onClick={close} className={`relative -mr-2.5 size-11 rounded-full ${focusRing}`}>
            <Bar className="absolute left-[11px] top-[21px] rotate-45" />
            <Bar className="absolute left-[11px] top-[21px] -rotate-45" />
          </button>
        </TopRow>
        <nav aria-label="Main" className="w-full px-5 pb-10 pt-6">
          <ul className="m-0 list-none p-0">
            {LINKS.map((text) => (
              <li key={text} className="border-b border-white/12">
                <a href="#" onClick={close} className={`flex h-14 items-center text-[28px] font-semibold leading-[36px] ${focusRing}`}>
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
