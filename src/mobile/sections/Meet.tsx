import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../motion'

/**
 * meet on mobile (MOBILE_SPEC.md section 8): the four desktop event cards (94:201)
 * in a native scroll-snap row. The browser does the swiping; the arrows only call
 * scrollTo. They stop at the ends instead of looping as the canvas does, because a
 * native row has real ends: a loop would rewind three cards in one long slide.
 */

const A = '/assets/meet'

type Card = { tag: string; filled?: boolean; title: string; photo: string }

const CARDS: Card[] = [
  { tag: 'New event', filled: true, title: 'Meet \nleaders', photo: `${A}/photo-leaders.webp` },
  { tag: 'ALL Events', title: 'Meaningful\nConnections', photo: `${A}/photo-connections.webp` },
  { tag: 'Programs', title: 'Grow\nYour Impact', photo: `${A}/photo-impact.webp` },
  { tag: 'Network', title: 'A Global\nCommunity', photo: `${A}/photo-community.webp` },
]
const N = CARDS.length
const label = (c: Card) => c.title.replace(/\s+/g, ' ').trim()

// Gutter that keeps the first card on the content edge: 20px, or wider once the
// 640px content column centres. Used as padding and as scroll padding.
const GUTTER = 'max(20px, calc((100% - 640px) / 2))'

// M-10: the photo zooms while the card holds keyboard focus (or a real hover).
const ZOOM = 'motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.06] motion-safe:group-has-focus-visible:scale-[1.06]'

/**
 * Desktop card geometry scaled to the card width: photo box 340x356, curve
 * (341x188) from y 250, so its top sits at 250/356 of the photo box and it
 * spills past the box onto the blush, as on the canvas.
 */
function EventCard({ c }: { c: Card }) {
  return (
    <article className="group relative h-full overflow-hidden rounded-2xl bg-blush">
      <div className="relative aspect-[340/356]">
        <div className="absolute inset-0 overflow-hidden">
          {/* w-full h-auto: the first photo is 340x381 with the curve baked in; the overlay covers it. */}
          <img src={c.photo} alt="" draggable={false} className={`absolute left-0 top-0 h-auto w-full max-w-none ${ZOOM}`} />
        </div>
        <img src={`${A}/curve.svg`} alt="" draggable={false} className="absolute left-0 top-[70.225%] h-auto w-[100.3%] max-w-none" />
      </div>
      <div className="relative px-4 pb-5 pt-2">
        <span
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold uppercase leading-4 ${c.filled ? 'bg-pink text-white' : 'text-ink ring-1 ring-inset ring-pink'}`}
        >
          {c.tag}
        </span>
        <h3 className="m-0 mt-2.5 whitespace-pre-line pr-14 text-[22px] font-semibold leading-7 tracking-[-0.66px] text-ink">
          {c.title}
        </h3>
      </div>
      <a
        href="#"
        aria-label={`Explore: ${label(c)}`}
        className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-pink-soft transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <img src={`${A}/arrow-card.svg`} alt="" className="size-6" />
      </a>
    </article>
  )
}

/** Resting positions of the row: scrollLeft of each, and the card it belongs to. */
type Stops = { at: number[]; card: number[] }
// Until the first measure (before paint): one stop per card.
const EVERY: Stops = { at: CARDS.map((_, i) => i), card: CARDS.map((_, i) => i) }

/**
 * Each card rests on the start edge, except where the row ends first: those clamp
 * to the end. A card already whole inside the window at the end stop (the third
 * card from 672px) is merged into it and loses its snap, since its own stop would
 * only nudge the row by the gutter. Any card the end stop cuts keeps its stop.
 */
function measure(el: HTMLElement): Stops {
  const items = el.children as HTMLCollectionOf<HTMLElement>
  const max = el.scrollWidth - el.clientWidth
  const stops: Stops = { at: [], card: [] }
  for (let i = 0; i < N; i++) {
    const x = Math.min(max, items[i].offsetLeft - items[0].offsetLeft)
    // offsetLeft - max: the card's left edge in the window at the end stop.
    if (i < N - 1 && items[i].offsetLeft - max >= 0) continue
    stops.at.push(x)
    stops.card.push(i)
  }
  return stops
}

export default function MobileMeet() {
  const reduced = useReducedMotion()
  const row = useRef<HTMLUListElement>(null)
  const [stops, setStops] = useState(EVERY)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('')
  /** Stop an arrow is sliding to, so a second press mid-slide counts from there. */
  const target = useRef<number | null>(null)
  const settle = useRef(0)
  const live = useRef(EVERY)

  const sync = useCallback(() => {
    const el = row.current
    if (!el) return
    const { at } = live.current
    let best = 0
    for (let i = 1; i < at.length; i++) if (Math.abs(at[i] - el.scrollLeft) < Math.abs(at[best] - el.scrollLeft)) best = i
    setIndex(best)
    if (target.current === best && Math.abs(at[best] - el.scrollLeft) < 2) target.current = null
  }, [])

  // Measured before paint, so a tablet never flashes four dots.
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const remeasure = () => {
      live.current = measure(el)
      setStops(live.current)
      sync()
    }
    remeasure()
    const onScroll = () => {
      sync()
      // A slide cut short (a finger takes over) must not leave a stale target.
      clearTimeout(settle.current)
      settle.current = window.setTimeout(() => (target.current = null), 160)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(remeasure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      clearTimeout(settle.current)
    }
  }, [sync])

  const last = stops.at.length - 1
  const go = (dir: 1 | -1) => {
    const el = row.current
    if (!el) return
    const from = target.current ?? index
    const to = Math.max(0, Math.min(last, from + dir))
    if (to === from) return
    target.current = to
    setStatus(`${to + 1} of ${last + 1}: ${label(CARDS[stops.card[to]])}`)
    el.scrollTo({ left: stops.at[to], behavior: reduced ? 'auto' : 'smooth' })
  }

  // Enabled arrows are the desktop's navy "next"; an arrow with nowhere to go takes
  // the desktop's pale "previous" look, so the rest state matches the canvas.
  const arrow = (dir: 1 | -1) => {
    const off = dir < 0 ? index === 0 : index === last
    return (
      <button
        type="button"
        aria-label={dir < 0 ? 'Previous events' : 'Next events'}
        aria-controls="meet-cards"
        aria-disabled={off || undefined}
        data-dir={dir < 0 ? 'prev' : 'next'}
        onClick={() => go(dir)}
        className={`grid size-11 place-items-center rounded-full motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${off ? 'cursor-default bg-[#e5e9f3]' : 'bg-navy hover:brightness-110'}`}
      >
        {/* nav-prev.svg is dark and nav-next.svg white: filters swap them to the state's colour. */}
        <img
          src={`${A}/nav-${dir < 0 ? 'prev' : 'next'}.svg`}
          alt=""
          className={`size-[21px] ${dir < 0 ? (off ? '' : 'brightness-0 invert') : off ? 'brightness-0' : ''}`}
        />
      </button>
    )
  }

  return (
    <section id="meet" data-section="meet" className="bg-white py-16">
      <div className="mx-auto max-w-[680px] px-5">
        <h2 className="m-0 text-balance text-[32px] font-semibold leading-[38px] tracking-[-0.6px] text-ink">
          Meet, greet and network!
        </h2>
      </div>

      <ul
        ref={row}
        id="meet-cards"
        role="list"
        aria-label="Events"
        style={{ paddingInline: GUTTER, scrollPaddingInline: GUTTER }}
        className="relative m-0 mt-12 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((c, i) => (
          <li key={c.title} className={`w-[min(78vw,320px)] shrink-0 ${stops.card.includes(i) ? 'snap-start snap-always' : 'snap-align-none'}`}>
            <EventCard c={c} />
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-6 flex max-w-[680px] items-center justify-between px-5">
        <div aria-hidden="true" className="-ml-1 flex">
          {stops.card.map((c, i) => (
            <span key={c} data-dot={i} data-active={i === index || undefined} className="grid size-4 place-items-center">
              <span className={`size-2 rounded-full motion-safe:transition-colors ${i === index ? 'bg-navy' : 'bg-periwinkle'}`} />
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {arrow(-1)}
          {arrow(1)}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
    </section>
  )
}
