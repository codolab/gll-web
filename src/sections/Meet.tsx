import { useRef } from 'react'

/** meet - Figma 94:199. Heading plus the four-card events carousel (94:201). */

const A = '/assets/meet'
const STEP = 352.043 // card pitch: 340.043 card + 12 gap

type Card = {
  id: string
  x: number
  y: number
  /** Figma-rendered photo (filters baked). Frames 94:231/94:203 bake their curve too. */
  photo: { id: string; src: string; x: number; w: number; h: number }
  /** Separate "Editorial curve" vector laid over a bare photo rectangle. */
  curve?: { id: string; x: number }
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
    badge: { id: '94:234', textId: '94:235', label: 'New event', x: 18.023, y: 364, w: 124, h: 30, ty: 7, filled: true },
    title: { id: '94:236', text: 'Meet \nleaders', x: 18, y: 404 },
    cta: { id: '94:237', iconId: '94:238', x: 281.668 },
  },
  {
    id: '94:202', x: 352.043, y: 0,
    photo: { id: '94:203', src: `${A}/photo-connections.webp`, x: 0, w: 340.4, h: 356 },
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

/** Chrome snaps a fractional `left` to a whole pixel; a translate keeps the fraction. */
const subpx = (x: number) => {
  const left = Math.floor(x)
  return { left, transform: x === left ? undefined : `translateX(${+(x - left).toFixed(3)}px)` }
}

function EventCard({ c }: { c: Card }) {
  const { badge, title } = c
  const text = (
    <>
      <span
        data-node-id={badge.id}
        className={`absolute overflow-hidden rounded-full ${badge.filled ? 'bg-pink' : 'ring-1 ring-inset ring-pink'}`}
        style={{ left: badge.x, top: badge.y, width: badge.w, height: badge.h }}
      >
        <span
          data-node-id={badge.textId}
          className={`absolute whitespace-nowrap text-[17px] font-semibold uppercase leading-4 ${badge.filled ? 'text-white' : 'text-ink'}`}
          style={{ left: 11, top: badge.ty }}
        >
          {badge.label}
        </span>
      </span>
      {/* pt-px: Chrome floors this baseline to 29px, Figma sets it at 30px. */}
      <h3
        data-node-id={title.id}
        className="absolute m-0 w-[304.4px] whitespace-pre pt-px text-[32px] font-semibold leading-9 tracking-[-0.96px] text-ink"
        style={{ left: title.x, top: title.y, height: 72 }}
      >
        {title.text}
      </h3>
    </>
  )
  return (
    <article
      data-node-id={c.id}
      className="absolute h-[512px] w-[340.043px] overflow-hidden rounded-2xl bg-blush"
      style={{ left: c.x, top: c.y }}
    >
      <div data-node-id={c.photo.id} className="absolute top-0" style={{ ...subpx(c.photo.x), width: c.photo.w, height: c.photo.h }}>
        {/* Figma exports a 340.4 box as 681 px with a part-covered last column; draw it 1:1. */}
        <img src={c.photo.src} alt="" className="absolute left-0 top-0 h-full max-w-none" style={{ width: Math.ceil(c.photo.w * 2) / 2 }} />
      </div>
      {c.curve && (
        <img
          data-node-id={c.curve.id}
          src={`${A}/curve.svg`}
          alt=""
          className="absolute top-[250px] h-[188px] w-[341px] max-w-none"
          style={subpx(c.curve.x)}
        />
      )}
      {c.content ? (
        <div
          data-node-id={c.content.id}
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
        data-node-id={c.cta.id}
        className="absolute top-[454px] size-[46px] rounded-full bg-pink-soft transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        style={{ left: c.cta.x }}
      >
        <img data-node-id={c.cta.iconId} src={`${A}/arrow-card.svg`} alt="" className="absolute left-[11px] top-[11px] size-6" />
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
  const track = useRef<HTMLDivElement>(null)
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * STEP, behavior: 'smooth' })
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
        {/* Real carousel track; at the 1440 canvas all four cards fit, so it rests at scrollLeft 0. */}
        <div ref={track} className="absolute left-0 top-0 h-[513px] w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
          {CARDS.map((c) => (
            <EventCard key={c.id} c={c} />
          ))}
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
            <button type="button" aria-label="Previous events" onClick={() => scroll(-1)} data-node-id="94:257" className={`${navBtn} left-0 bg-[#e5e9f3]`}>
              <img data-node-id="94:258" src={`${A}/nav-prev.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
            <button type="button" aria-label="Next events" onClick={() => scroll(1)} data-node-id="94:253" className={`${navBtn} left-[70.352px] bg-navy`}>
              <img data-node-id="94:254" src={`${A}/nav-next.svg`} alt="" className="absolute left-[15.768px] top-[15.769px] size-[29.111px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
