import { useRef, useState, useSyncExternalStore, type DragEvent, type MouseEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { useReducedMotion } from '../motion'

/** meet - Figma 94:199. Heading plus the four-card events carousel (94:201). */

const A = '/assets/meet'
const STEP = 352.043 // card pitch: 340.043 card + 12 gap
const SWIPE = 40 // px of horizontal touch or pen travel that steps one card

type Card = {
  id: string
  x: number
  y: number
  /** Figma-rendered photo (filters baked). Frames 94:231/94:203 bake their curve too. */
  photo: { id: string; src: string; x: number; w: number; h: number }
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

const CARDS: Card[] = [
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
]
const N = CARDS.length
const mod = (i: number) => ((i % N) + N) % N

/** Chrome snaps a fractional `left` to a whole pixel; a translate keeps the fraction. */
const subpx = (x: number) => {
  const left = Math.floor(x)
  return { left, transform: x === left ? undefined : `translateX(${+(x - left).toFixed(3)}px)` }
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

function EventCard({ c, left, clone }: { c: Card; left: number; clone: boolean }) {
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
      {...(clone ? CLONE : {})}
      className="group absolute h-[512px] w-[340.043px] overflow-hidden rounded-2xl bg-blush"
      style={{ left, top: c.y }}
    >
      <div data-node-id={id(c.photo.id)} className="absolute top-0 overflow-hidden" style={{ ...subpx(c.photo.x), width: c.photo.w, height: c.photo.h }}>
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
        className="absolute top-[454px] size-[46px] rounded-full bg-pink-soft transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        style={{ left: c.cta.x }}
      >
        <img data-node-id={id(c.cta.iconId)} src={`${A}/arrow-card.svg`} alt="" className="absolute left-[11px] top-[11px] size-6" />
      </a>
    </article>
  )
}

const DOTS = [
  { id: '94:246', x: 0, color: 'bg-navy' },
  { id: '94:247', x: 24, color: 'bg-periwinkle' },
  { id: '94:248', x: 48, color: 'bg-periwinkle' },
]

export default function Meet() {
  const reduced = useReducedMotion()
  const zoomed = useSyncExternalStore(subscribeZoom, isZoomed)
  /** The real card in the first slot; the others follow it round the loop. */
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const swiped = useRef(false)

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
    // The copies either side cover four slots; a burst beyond that skips the excess at once.
    const from = Math.max(-N * STEP, Math.min(N * STEP, x + dir * STEP))
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

  return (
    <div className="relative size-full" data-node-id="94:199">
      {/* pr-px: Chromium also tracks after the last glyph, which shifts the centred line 0.5px right. */}
      <h2
        data-node-id="94:200"
        className="absolute left-1 top-0 m-0 h-16 w-[1392px] pr-px text-center text-[56px] font-semibold leading-16 tracking-[-1px] text-ink"
      >
        Meet, greet and network!
      </h2>

      <div data-node-id="94:201" className="absolute left-0 top-[136px] h-[608.16px] w-[1396.172px]">
        <div
          className={`absolute left-0 top-0 h-[513px] w-full overflow-hidden ${zoomed ? 'touch-auto' : 'touch-pan-y touch-pinch-zoom'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          onDragStart={onDragStart}
          onClickCapture={onClickCapture}
        >
          <div ref={track} className="absolute inset-0">
            {/* Slot order in the DOM, so Tab and screen readers follow the cards left to right. */}
            {[-1, 0, 1].flatMap((copy) =>
              CARDS.map((_, s) => {
                const c = CARDS[mod(s + index)]
                return <EventCard key={`${copy}:${c.id}`} c={c} left={CARDS[s].x + copy * N * STEP} clone={copy !== 0} />
              }),
            )}
          </div>
        </div>

        <div data-node-id="94:239" className="absolute left-1 top-[547.512px] h-[60.648px] w-[1392px] overflow-hidden">
          <div data-node-id="94:240" className="absolute left-0 top-[5.324px] h-[50px] w-14 overflow-hidden">
            <div data-node-id="94:242" aria-hidden="true" className="absolute -left-1 top-[17px] h-4 w-16">
              {DOTS.map((d) => (
                <span key={d.id} data-node-id={d.id} className="absolute top-0 size-4" style={{ left: d.x }}>
                  <span data-node-id={`I${d.id};11754:1418`} className={`absolute left-1 top-1 size-2 rounded-full ${d.color}`} />
                </span>
              ))}
            </div>
          </div>

          {/* Figma names these the other way round; wired by the arrow each one shows. */}
          <div data-node-id="94:252" className="absolute left-[1261px] top-0 h-[60.648px] w-[131px] overflow-hidden">
            <button type="button" aria-label="Previous events" onClick={() => step(-1)} data-node-id="94:257" className={`${navBtn} left-0 bg-[#e5e9f3]`}>
              <img data-node-id="94:258" src={`${A}/nav-prev.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
            <button type="button" aria-label="Next events" onClick={() => step(1)} data-node-id="94:253" className={`${navBtn} left-[70.352px] bg-navy`}>
              <img data-node-id="94:254" src={`${A}/nav-next.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
