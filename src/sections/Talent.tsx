import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useReducedMotion } from '../motion'

/** talent - Figma 94:935. Heading, blob photo with four numbered shapes, tagline. */

// The shapes are tabs (motion-spec M-04..M-06); 1 is the Figma frame, 2-4 are
// placeholders: hero tiles 94:93, 94:95, 94:101 in 94:265's blob alpha, lines from 94:84.
const STATES = [
  { src: '/assets/talent/vilnius-portrait.webp', alt: 'GLL community members gathered for a group portrait in Vilnius', line: 'One community. Endless possibilities.' },
  { src: '/assets/talent/members-group.webp', alt: 'GLL members standing together for a group photo', line: 'Global minds. Lithuanian roots.' },
  { src: '/assets/talent/members-selfie.webp', alt: 'GLL members taking a group selfie at an event', line: 'Your next chapter starts here.' },
  { src: '/assets/talent/members-networking.webp', alt: 'GLL members networking at a reception', line: 'Go further, together.' },
]

type Num = { id: string; text: string; x: number; y: number; w: number }
type Circle = { state: number; id: string; x: number; y: number; d: number; color: string; num: Num }

// Plain ELLIPSE nodes, so CSS circles. Coordinates are relative to 94:264,
// each number relative to its circle (all whole px, so nesting moves nothing).
const CIRCLES: Circle[] = [
  { state: 0, id: '94:266', x: 281, y: 0, d: 158.806, color: '#66b800', num: { id: '94:270', text: '1', x: 66, y: 55, w: 27 } },
  { state: 2, id: '94:268', x: 292, y: 580, d: 158.806, color: '#ff4c77', num: { id: '94:272', text: '3', x: 61, y: 55, w: 37 } },
  { state: 3, id: '94:267', x: 0, y: 296, d: 143.682, color: '#05325b', num: { id: '94:273', text: '4', x: 53, y: 48, w: 38 } },
]

// The pill box (550.148, 342.189) written on Chrome's 1/64 px layout grid, which
// is where it lands anyway, so the nested "2" sums back to exactly (636, 325).
const PILL = { x: 35209 / 64, y: 21900 / 64, w: 103.35, h: 250.813 }
const PILL_NUM: Num = { id: '94:271', text: '2', x: 636 - PILL.x, y: 325 - PILL.y, w: 35 }
// pill.svg's own stroke, reused unpainted as the exact hit area and, wider, as the focus ring.
const PILL_D = 'M170.933 67.5327C170.933 194.891 149.496 240.287 67.5327 318.467'
const PILL_W = 135.065

const PHOTO = { left: 108.398, top: 103.4, width: 504.147, height: 529.354 }
// Only the incoming photo fades, on top; the last fully shown one stays opaque
// under it until that fade ends, so the blob never thins. The rest hide at once.
const PHOTO_IN = 'z-[2] opacity-100 motion-safe:transition-opacity motion-safe:duration-300'
const PHOTO_UNDER = 'z-[1] opacity-100'
const PHOTO_OFF = 'invisible z-0 opacity-0'
const LINE_FADE = 'motion-safe:transition-[opacity,visibility] motion-safe:duration-300'

const TAB = 'absolute z-[1] cursor-pointer appearance-none overflow-visible [-webkit-tap-highlight-color:transparent]'
const RING = 'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink'
const STEP: Record<string, (i: number) => number> = {
  ArrowRight: (i) => i + 1, ArrowDown: (i) => i + 1, ArrowLeft: (i) => i - 1, ArrowUp: (i) => i - 1, Home: () => 0, End: () => STATES.length - 1,
}

const Digit = ({ n }: { n: Num }) => (
  <span
    data-node-id={n.id}
    className="absolute h-12 whitespace-nowrap text-left text-[56px] font-semibold leading-[48px] tracking-[-2px] text-white"
    style={{ left: n.x, top: n.y, width: n.w }}
  >
    {n.text}
  </span>
)

export default function Talent() {
  const uid = useId()
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const [settled, setSettled] = useState(0)
  // While a tab holds focus it keeps the tab stop, so a hover elsewhere cannot move it.
  const [focused, setFocused] = useState<number | null>(null)
  const under = reduced ? active : settled
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  // No transitionend fires under reduced motion, so settle with the selection.
  const select = (i: number) => {
    setActive(i)
    if (reduced) setSettled(i)
  }

  // Tabs with automatic activation: hover, focus, tap or arrow keys select.
  const tab = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { tabs.current[i] = el },
    type: 'button' as const,
    role: 'tab',
    id: `${uid}tab${i}`,
    'aria-selected': active === i,
    'aria-controls': `${uid}panel`,
    'aria-label': `${i + 1}: ${STATES[i].line}`,
    tabIndex: (focused ?? active) === i ? 0 : -1,
    onPointerEnter: () => select(i),
    onFocus: () => {
      setFocused(i)
      select(i)
    },
    onBlur: () => setFocused(null),
    onClick: () => select(i),
  })
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.current.indexOf(e.target as HTMLButtonElement)
    const go = STEP[e.key]
    if (i < 0 || !go) return
    e.preventDefault()
    tabs.current[(go(i) + STATES.length) % STATES.length]?.focus()
  }
  const circle = (c: Circle) => (
    <button
      key={c.id}
      {...tab(c.state)}
      data-node-id={c.id}
      className={`${TAB} ${RING} rounded-full`}
      style={{ left: c.x, top: c.y, width: c.d, height: c.d, background: c.color }}
    >
      <Digit n={c.num} />
    </button>
  )

  return (
    <div className="relative size-full" data-node-id="94:935">
      <h2
        id={`${uid}title`}
        data-node-id="94:261"
        className="absolute left-0 top-0 m-0 h-[72px] w-[744px] whitespace-nowrap text-center text-[56px] font-semibold leading-[72px] tracking-normal text-ink"
      >
        A world of Lithuanian talent
      </h2>

      <div data-node-id="94:262" className="absolute" style={{ left: 14, top: 128, width: 978, height: 739 }}>
        <div data-node-id="94:263" className="absolute left-0 top-0" style={{ width: 717, height: 739 }}>
          {/* 94:262, 94:263 and 94:264 share one origin, so the tagline can sit in the
              tab panel here. isolate: the tabs' z-[1] lifts them over the panel only. */}
          <div data-node-id="94:264" className="absolute left-0 top-0 isolate" style={{ width: 653.499, height: 738.575 }}>
            {/* Zero-size wrappers: roles without a box, so nothing moves or paints. */}
            <div role="tablist" aria-labelledby={`${uid}title`} onKeyDown={onKeyDown} className="absolute left-0 top-0">
              {circle(CIRCLES[0])}
              {/* A round-capped 135px stroke: the img spans the stroke, the box is the path.
                  The button ignores the pointer; only the unpainted stroke path takes it. */}
              <button
                {...tab(1)}
                data-node-id="94:269"
                className={`${TAB} group pointer-events-none outline-hidden`}
                style={{ left: PILL.x, top: PILL.y, width: PILL.w, height: PILL.h }}
              >
                <svg aria-hidden="true" viewBox="0 0 239 386" className="absolute overflow-visible" style={{ left: -67.533, top: -67.533, width: 239, height: 386 }}>
                  <path d={PILL_D} strokeWidth={PILL_W + 10} strokeLinecap="round" className="hidden fill-none stroke-ink group-focus-visible:inline" />
                  <path d={PILL_D} strokeWidth={PILL_W + 6} strokeLinecap="round" className="hidden fill-none stroke-white group-focus-visible:inline" />
                  <path d={PILL_D} strokeWidth={PILL_W} strokeLinecap="round" fill="none" stroke="transparent" pointerEvents="visibleStroke" />
                </svg>
                <img
                  src="/assets/talent/pill.svg"
                  alt=""
                  draggable={false}
                  className="absolute max-w-none"
                  style={{ left: -67.533, top: -67.533, width: 239, height: 386 }}
                />
                <Digit n={PILL_NUM} />
              </button>
              {CIRCLES.slice(1).map(circle)}
            </div>

            <div role="tabpanel" id={`${uid}panel`} aria-labelledby={`${uid}tab${active}`} className="absolute left-0 top-0">
              {/* isolate: the photos' z-order stays below the tabs. */}
              <div className="absolute isolate" style={PHOTO}>
                {STATES.map((s, i) => (
                  <img
                    key={s.src}
                    data-node-id={i === 0 ? '94:265' : undefined}
                    src={s.src}
                    alt={s.alt}
                    draggable={false}
                    onTransitionEnd={(e) => e.propertyName === 'opacity' && i === active && setSettled(i)}
                    className={`absolute left-0 top-0 max-w-none ${i === active ? PHOTO_IN : i === under ? PHOTO_UNDER : PHOTO_OFF}`}
                    style={{ width: PHOTO.width, height: PHOTO.height }}
                  />
                ))}
              </div>
              {/* pt-px: Chrome floors the negative half-leading (baseline 29) where Figma
                  rounds it (30); Figma's lines measure 1px lower on all three. */}
              {STATES.map((s, i) => (
                <p
                  key={s.line}
                  data-node-id={i === 0 ? '94:274' : undefined}
                  className={`absolute m-0 pt-px text-[32px] font-semibold leading-[36px] tracking-[-0.64px] text-ink ${LINE_FADE} ${i === active ? 'opacity-100' : 'invisible opacity-0'}`}
                  style={{ left: 724, top: 514.074, width: 254, height: 108 }}
                >
                  {s.line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
