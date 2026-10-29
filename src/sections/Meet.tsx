import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type MouseEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { useReducedMotion } from '../motion'
import { useCanvasSurface, type CanvasSurface } from '../surface'

/** meet - Figma 94:199 (desktop) / 173:430 (wide). Heading plus the events carousel (94:201 / 173:1359). */

const A = '/assets/meet'
const SWIPE = 40 // px of horizontal touch or pen travel that steps one card

type Card = {
  id: string
  x: number
  y: number
  /** Figma-rendered photo (filters baked). Frames 94:231/94:203 bake their curve too. `y` only where it is off the card's top. */
  photo: { id: string; src: string; x: number; y?: number; w: number; h: number }
  /**
   * "Editorial curve" over the photo. With an id it is the separate vector; without, it repeats
   * the curve baked into the photo and shows only while the photo zooms, so the curve stays put.
   */
  curve: { id?: string; x: number }
  /** "Card content" clip frame at (0, 356); the first card has none. */
  content?: { id: string; h: number }
  badge: { id: string; textId: string; label: string; x: number; y: number; w: number; h: number; ty: number; filled?: boolean }
  title: { id: string; text: string; x: number; y: number }
  cta: { id: string; iconId: string; x: number }
}

type Layout = {
  root: string
  heading: { id: string; left: number }
  group: { id: string; w: number; h: number }
  /** The real cards at rest; each one's `x` is its slot in the group. */
  cards: Card[]
  /** Slot pitch: card + 12 gap. The loop repeats every cards.length * step. */
  step: number
  /** How many cards a burst may slide in one go; the copies either side must still fill the window. */
  reach: number
  /** Width of the track's clip box, when it is not the group's. */
  clipW?: string
  /** A card the file leaves under the row, outside the carousel group: drawn where it lies, covered, inert. */
  under?: { card: Card; left: number }
  /** Whether the last slot overhangs the frame: its link leaves the Tab order while the window cuts it off. */
  peek?: boolean
  controls: {
    id: string; top: number; w: number; pagination: string; dots: string; dot: [string, string, string]
    nav: { id: string; left: number }; prev: [string, string]; next: [string, string]
    /**
     * Chrome drops the fractions of the pagination's top (5.324) and the next button's left
     * (70.352): dots paint 0.65px high, the button 0.4px left. Wide holds them in a translate;
     * desktop keeps the render it was approved with.
     */
    keepFractions?: boolean
  }
}

const DESKTOP: Layout = {
  root: '94:199',
  heading: { id: '94:200', left: 4 },
  group: { id: '94:201', w: 1396.172, h: 608.16 },
  step: 352.043,
  reach: 4,
  cards: [
    {
      id: '94:230', x: 0, y: 0,
      photo: { id: '94:231', src: `${A}/photo-leaders.webp`, x: 0.5, w: 340, h: 381 },
      curve: { x: 0.043 },
      badge: { id: '94:234', textId: '94:235', label: 'New event', x: 18.023, y: 364, w: 124, h: 30, ty: 7, filled: true },
      title: { id: '94:236', text: 'Meet \nleaders', x: 18, y: 404 },
      cta: { id: '94:237', iconId: '94:238', x: 281.668 },
    },
    {
      id: '94:202', x: 352.043, y: 0,
      photo: { id: '94:203', src: `${A}/photo-connections.webp`, x: 0, w: 340.4, h: 356 },
      // Measured off the baked render: its curve sits 0.5px left of where 94:205's box says.
      curve: { x: -0.5 },
      content: { id: '94:206', h: 120 },
      badge: { id: '94:207', textId: '94:208', label: 'ALL Events', x: 18, y: 8, w: 126, h: 26, ty: 5 },
      title: { id: '94:209', text: 'Meaningful\nConnections', x: 18, y: 48 },
      cta: { id: '94:210', iconId: '94:211', x: 282 },
    },
    {
      id: '94:212', x: 704.086, y: 0,
      photo: { id: '94:213', src: `${A}/photo-impact.webp`, x: 0, w: 340.4, h: 356 },
      curve: { id: '94:214', x: -0.652 },
      content: { id: '94:215', h: 124 },
      badge: { id: '94:216', textId: '94:217', label: 'Programs', x: 18, y: 8, w: 120, h: 30, ty: 7 },
      title: { id: '94:218', text: 'Grow\nYour Impact', x: 18, y: 52 },
      cta: { id: '94:219', iconId: '94:220', x: 282 },
    },
    {
      id: '94:221', x: 1056.129, y: 1,
      photo: { id: '94:222', src: `${A}/photo-community.webp`, x: 0, w: 340.4, h: 356 },
      curve: { id: '94:223', x: -0.305 },
      content: { id: '94:224', h: 124 },
      badge: { id: '94:225', textId: '94:226', label: 'Network', x: 18, y: 8, w: 109, h: 30, ty: 7 },
      title: { id: '94:227', text: 'A Global\nCommunity', x: 18, y: 52 },
      cta: { id: '94:228', iconId: '94:229', x: 281.668 },
    },
  ],
  controls: {
    id: '94:239', top: 547.512, w: 1392, pagination: '94:240', dots: '94:242', dot: ['94:246', '94:247', '94:248'],
    // Figma names these the other way round; wired by the arrow each one shows.
    nav: { id: '94:252', left: 1261 }, prev: ['94:257', '94:258'], next: ['94:253', '94:254'],
  },
}

// Wide cards are the desktop cards' twins (same geometry inside), except that both Impact
// photos sit 17.1px left of and 0.4px below their card's corner, leaving a blush strip.
// impactW/communityW: the node ids run on from the card's, 173:442..173:450 for impactW(442).
const [LEADERS, CONNECTIONS, IMPACT, COMMUNITY] = DESKTOP.cards
const IMPACT_PHOTO = { x: -17.1, y: 0.4 }
const impactW = (id: number, x: number): Card => ({
  ...IMPACT, id: `173:${id}`, x,
  photo: { ...IMPACT.photo, id: `173:${id + 1}`, ...IMPACT_PHOTO },
  curve: { id: `173:${id + 2}`, x: -0.652 },
  content: { id: `173:${id + 3}`, h: 124 },
  badge: { ...IMPACT.badge, id: `173:${id + 4}`, textId: `173:${id + 5}` },
  title: { ...IMPACT.title, id: `173:${id + 6}` },
  cta: { ...IMPACT.cta, id: `173:${id + 7}`, iconId: `173:${id + 8}` },
})
const communityW = (id: number, x: number, y: number): Card => ({
  ...COMMUNITY, id: `173:${id}`, x, y,
  photo: { ...COMMUNITY.photo, id: `173:${id + 1}` },
  curve: { id: `173:${id + 2}`, x: -0.305 },
  content: { id: `173:${id + 3}`, h: 124 },
  badge: { ...COMMUNITY.badge, id: `173:${id + 4}`, textId: `173:${id + 5}` },
  title: { ...COMMUNITY.title, id: `173:${id + 6}` },
  cta: { ...COMMUNITY.cta, id: `173:${id + 7}`, iconId: `173:${id + 8}` },
})

const WIDE: Layout = {
  root: '173:430',
  heading: { id: '173:431', left: 60 },
  group: { id: '173:1359', w: 1748.043, h: 608.048 },
  step: 352,
  // Four, as on desktop: a five-card burst would start its slide with the 2560 window's right margin bare.
  reach: 4,
  // The row runs off the frame's right edge, so the clip ends at the window's (App's --bleed).
  clipW: 'calc(1576px + var(--bleed, 0px))',
  peek: true,
  // Figma draws five slots for the four events: Grow Your Impact twice (173:442, 173:451).
  cards: [
    {
      ...LEADERS, id: '173:478',
      photo: { ...LEADERS.photo, id: '173:479' },
      badge: { ...LEADERS.badge, id: '173:482', textId: '173:483' },
      title: { ...LEADERS.title, id: '173:484' },
      cta: { ...LEADERS.cta, id: '173:485', iconId: '173:486' },
    },
    {
      ...CONNECTIONS, id: '173:432', x: 352,
      photo: { ...CONNECTIONS.photo, id: '173:433' },
      content: { id: '173:436', h: 120 },
      badge: { ...CONNECTIONS.badge, id: '173:437', textId: '173:438' },
      title: { ...CONNECTIONS.title, id: '173:439' },
      cta: { ...CONNECTIONS.cta, id: '173:440', iconId: '173:441' },
    },
    impactW(442, 704.1),
    communityW(469, 1056, 1.4),
    impactW(451, 1408),
  ],
  // The desktop Network card left in place (1076.1 on the frame), painted before the group: its
  // 12px between slots 3 and 4 and the rounded corners there show it.
  under: { card: communityW(460, 0, 137), left: 1012.1 },
  controls: {
    id: '173:487', top: 547.4, w: 1592, pagination: '173:488', dots: '173:490', dot: ['173:494', '173:495', '173:496'],
    nav: { id: '173:500', left: 1461 }, prev: ['173:505', '173:506'], next: ['173:501', '173:502'], keepFractions: true,
  },
}

const LAYOUTS: Record<CanvasSurface, Layout> = { desktop: DESKTOP, wide: WIDE }

/** Chrome snaps a fractional `left`/`top` to a whole pixel; a translate keeps the fraction. */
const subpx = (x: number, y?: number) => {
  const left = Math.floor(x)
  const top = y === undefined ? undefined : Math.floor(y)
  const dx = +(x - left).toFixed(3)
  const dy = y === undefined ? 0 : +(y - Math.floor(y)).toFixed(3)
  return { left, top, transform: dy ? `translate(${dx}px, ${dy}px)` : dx ? `translateX(${dx}px)` : undefined }
}

// M-10: the photo zooms inside its box while the card is hovered or holds keyboard focus.
const ZOOM = 'motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.06] motion-safe:group-has-focus-visible:scale-[1.06]'
// Visibility flips to visible at once and back only when the 0.5s zoom-out has finished.
const DURING_ZOOM = 'invisible motion-safe:transition-[visibility] motion-safe:duration-500 motion-safe:group-hover:visible motion-safe:group-has-focus-visible:visible'
const CLONE = { 'aria-hidden': 'true', inert: '' } as Record<string, string>

// Phones show the canvas at ~0.27 (G-01), so people pinch-zoom; zoomed, a drag pans the page, not the cards.
const subscribeZoom = (onChange: () => void) => {
  const v = window.visualViewport
  v?.addEventListener('resize', onChange)
  return () => v?.removeEventListener('resize', onChange)
}
const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01

/** `clone` drops the node ids; `covered` (a card Figma leaves under the row) keeps them. Both are inert. */
function EventCard({ c, left, clone, covered, untabbable }: { c: Card; left: number; clone: boolean; covered?: boolean; untabbable?: boolean }) {
  const { badge, title } = c
  const id = (node: string) => (clone ? undefined : node)
  const text = (
    <>
      <span
        data-node-id={id(badge.id)}
        className={`absolute overflow-hidden rounded-full ${badge.filled ? 'bg-pink' : 'ring-1 ring-inset ring-pink'}`}
        style={{ left: badge.x, top: badge.y, width: badge.w, height: badge.h }}
      >
        <span
          data-node-id={id(badge.textId)}
          className={`absolute whitespace-nowrap text-[17px] font-semibold uppercase leading-4 ${badge.filled ? 'text-white' : 'text-ink'}`}
          style={{ left: 11, top: badge.ty }}
        >
          {badge.label}
        </span>
      </span>
      {/* pt-px: Chrome floors this baseline to 29px, Figma sets it at 30px. */}
      <h3
        data-node-id={id(title.id)}
        className="absolute m-0 w-[304.4px] whitespace-pre pt-px text-[32px] font-semibold leading-9 tracking-[-0.96px] text-ink"
        style={{ left: title.x, top: title.y, height: 72 }}
      >
        {title.text}
      </h3>
    </>
  )
  return (
    <article
      data-node-id={id(c.id)}
      {...(clone || covered ? CLONE : {})}
      className="group absolute h-[512px] w-[340.043px] overflow-hidden rounded-2xl bg-blush"
      style={{ left, top: c.y }}
    >
      <div data-node-id={id(c.photo.id)} className="absolute top-0 overflow-hidden" style={{ ...subpx(c.photo.x, c.photo.y), width: c.photo.w, height: c.photo.h }}>
        {/* Figma exports a 340.4 box as 681 px with a part-covered last column; draw it 1:1. */}
        <img src={c.photo.src} alt="" className={`absolute left-0 top-0 h-full max-w-none ${ZOOM}`} style={{ width: Math.ceil(c.photo.w * 2) / 2 }} />
      </div>
      <img
        data-node-id={c.curve.id && id(c.curve.id)}
        src={`${A}/curve.svg`}
        alt=""
        className={`absolute top-[250px] h-[188px] w-[341px] max-w-none ${c.curve.id ? '' : DURING_ZOOM}`}
        style={subpx(c.curve.x)}
      />
      {c.content ? (
        <div
          data-node-id={id(c.content.id)}
          className="absolute left-0 top-[356px] w-[340.4px] overflow-hidden"
          style={{ height: c.content.h }}
        >
          {text}
        </div>
      ) : (
        text
      )}
      <a
        href="#"
        aria-label={`Explore: ${title.text.replace(/\s+/g, ' ').trim()}`}
        data-node-id={id(c.cta.id)}
        tabIndex={untabbable ? -1 : undefined}
        className="absolute top-[454px] size-[46px] rounded-full bg-pink-soft transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        style={{ left: c.cta.x }}
      >
        <img data-node-id={id(c.cta.iconId)} src={`${A}/arrow-card.svg`} alt="" className="absolute left-[11px] top-[11px] size-6" />
      </a>
    </article>
  )
}

const DOT_COLORS = ['bg-navy', 'bg-periwinkle', 'bg-periwinkle']

export default function Meet() {
  const L = LAYOUTS[useCanvasSurface()]
  const { cards, step: STEP } = L
  const N = cards.length
  const mod = (i: number) => ((i % N) + N) % N
  const reduced = useReducedMotion()
  const zoomed = useSyncExternalStore(subscribeZoom, isZoomed)
  /** The real card in the first slot; the others follow it round the loop. */
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const swiped = useRef(false)

  // A link the window cuts off would take focus out of sight (or scroll the page sideways to
  // it), so the last slot's link is tabbable only once the window shows it and its focus ring.
  const peekProbe = useRef<HTMLDivElement>(null)
  const [peekShown, setPeekShown] = useState(false)
  useEffect(() => {
    const el = peekProbe.current
    if (!el) return
    // The huge vertical margin leaves only the sideways clip (canvas or window edge) to count.
    const io = new IntersectionObserver(([e]) => setPeekShown(e.intersectionRatio >= 0.99), { rootMargin: '100000px 0px', threshold: 0.99 })
    io.observe(el)
    return () => io.disconnect()
  }, [L])

  // Each step re-slots the cards at once and slides the track from where it shows them now to
  // rest, so a click mid-slide carries on from there and none is lost.
  const step = (dir: 1 | -1) => {
    const el = track.current
    if (reduced || !el) {
      setIndex((i) => mod(i + dir))
      return
    }
    const x = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
    el.getAnimations().forEach((a) => a.cancel())
    flushSync(() => setIndex((i) => mod(i + dir)))
    // The copies either side keep the window filled up to `reach` cards; a burst beyond that skips the excess at once.
    const max = L.reach * STEP
    const from = Math.max(-max, Math.min(max, x + dir * STEP))
    el.animate([{ transform: `translateX(${from}px)` }, { transform: 'none' }], { duration: 500, easing: 'ease' })
  }

  const onPointerDown = (e: PointerEvent) => {
    swiped.current = false
    // Not a swipe: a mouse, a second finger (a pinch starting), or a zoomed page, which pans.
    const swipeable = e.pointerType !== 'mouse' && e.isPrimary && !isZoomed()
    swipe.current = swipeable ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null
  }
  const onPointerMove = (e: PointerEvent) => {
    const s = swipe.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(e.clientY - s.y)) return
    swipe.current = null
    swiped.current = true
    step(dx < 0 ? 1 : -1)
  }
  const endSwipe = () => (swipe.current = null)
  // A pen on a photo or link would start a native drag and stop the pointer events mid-swipe.
  const onDragStart = (e: DragEvent) => swipe.current && e.preventDefault()
  // A swipe that began on a card link must not follow it; keyboard clicks (detail 0) always pass.
  const onClickCapture = (e: MouseEvent) => {
    if (!swiped.current || !e.detail) return
    swiped.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  const navBtn = 'absolute top-0 size-[60.648px] rounded-full transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
  const { controls: k } = L
  const last = cards[N - 1]

  return (
    <div className="relative size-full" data-node-id={L.root}>
      {/* pr-px: Chromium also tracks after the last glyph, which shifts the centred line 0.5px right. */}
      <h2
        data-node-id={L.heading.id}
        className="absolute top-0 m-0 h-16 w-[1392px] pr-px text-center text-[56px] font-semibold leading-16 tracking-[-1px] text-ink"
        style={{ left: L.heading.left }}
      >
        Meet, greet and network!
      </h2>

      {L.under && <EventCard c={L.under.card} left={L.under.left} clone={false} covered />}

      <div data-node-id={L.group.id} className="absolute left-0 top-[136px]" style={{ width: L.group.w, height: L.group.h }}>
        {/* overflow-clip, not hidden: a clip that cannot scroll, so focus never shifts the track. */}
        <div
          className={`absolute left-0 top-0 h-[513px] w-full overflow-clip ${zoomed ? 'touch-auto' : 'touch-pan-y touch-pinch-zoom'}`}
          style={{ width: L.clipW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          onDragStart={onDragStart}
          onClickCapture={onClickCapture}
        >
          {L.peek && (
            <div ref={peekProbe} className="pointer-events-none absolute top-[450px] size-[54px]" style={{ left: last.x + 278 }} />
          )}
          <div ref={track} className="absolute inset-0">
            {/* Slot order in the DOM, so Tab and screen readers follow the cards left to right. */}
            {[-1, 0, 1].flatMap((copy) =>
              cards.map((_, s) => {
                const c = cards[mod(s + index)]
                return (
                  <EventCard
                    key={`${copy}:${c.id}`}
                    c={c}
                    left={cards[s].x + copy * N * STEP}
                    clone={copy !== 0}
                    untabbable={L.peek && copy === 0 && s === N - 1 && !peekShown}
                  />
                )
              }),
            )}
          </div>
        </div>

        <div data-node-id={k.id} className="absolute h-[60.648px] overflow-hidden" style={{ left: 4, top: k.top, width: k.w }}>
          <div data-node-id={k.pagination} className="absolute left-0 top-[5.324px] h-[50px] w-14 overflow-hidden" style={k.keepFractions ? subpx(0, 5.324) : undefined}>
            <div data-node-id={k.dots} aria-hidden="true" className="absolute -left-1 top-[17px] h-4 w-16">
              {k.dot.map((d, i) => (
                <span key={d} data-node-id={d} className="absolute top-0 size-4" style={{ left: i * 24 }}>
                  <span data-node-id={`I${d};11754:1418`} className={`absolute left-1 top-1 size-2 rounded-full ${DOT_COLORS[i]}`} />
                </span>
              ))}
            </div>
          </div>

          <div data-node-id={k.nav.id} className="absolute top-0 h-[60.648px] w-[131px] overflow-hidden" style={{ left: k.nav.left }}>
            <button type="button" aria-label="Previous events" onClick={() => step(-1)} data-node-id={k.prev[0]} className={`${navBtn} left-0 bg-[#e5e9f3]`}>
              <img data-node-id={k.prev[1]} src={`${A}/nav-prev.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
            <button type="button" aria-label="Next events" onClick={() => step(1)} data-node-id={k.next[0]} className={`${navBtn} left-[70.352px] bg-navy`} style={k.keepFractions ? subpx(70.352) : undefined}>
              <img data-node-id={k.next[1]} src={`${A}/nav-next.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
