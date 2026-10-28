import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useReducedMotion } from '../motion'

/** talent - Figma 94:935. Heading, blob photo with four numbered shapes, tagline. */

type Pt = readonly [number, number]
type Box = { x: number; y: number; w: number; h: number }
type Num = { id: string; text: string; x: number; y: number; w: number }

// The Figma "2" (94:269) is one cubic drawn as a 135px round-capped
// stroke; here in 94:264 coordinates. A circle is the same stroke at zero length,
// so every number owns this path turned by quarter turns to start at its circle:
// the selected one extends along it, the rest stay circles (motion-spec M-04).
const PILL: Pt[] = [[653.540625, 342.1872], [653.540625, 469.5455], [632.103625, 514.9415], [550.140325, 593.1215]]
const PILL_W = 135.065
const START = PILL[0]

const turn = ([x, y]: Pt, q: number): Pt => (q === 1 ? [-y, x] : q === -1 ? [y, -x] : q === 2 ? [-x, -y] : [x, y])
/** A Figma point moved with the loop that starts at `c`, turned `q` quarter turns (0 keeps it exact). */
const place = (p: Pt, c: Pt, q: number): Pt => {
  if (!q) return p
  const [x, y] = turn([p[0] - START[0], p[1] - START[1]], q)
  return [c[0] + x, c[1] + y]
}
const boxOf = (a: Pt, b: Pt): Box => ({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) })

// The photo blob turns with the loop too, so it always leaves room for it. 2 is
// the Figma frame; 1, 3 and 4 are placeholders baked by scripts/talent-photos.mjs.
const PHOTO: Pt[] = [[108.398, 103.4], [612.545, 632.754]]
const STATES = [
  { src: '/assets/talent/members-group.webp', alt: 'GLL members standing together for a group photo', line: 'Global minds. Lithuanian roots.' },
  { src: '/assets/talent/vilnius-portrait.webp', alt: 'GLL community members gathered for a group portrait in Vilnius', line: 'One community. Endless possibilities.' },
  { src: '/assets/talent/members-selfie.webp', alt: 'GLL members taking a group selfie at an event', line: 'Your next chapter starts here.' },
  { src: '/assets/talent/members-networking.webp', alt: 'GLL members networking at a reception', line: 'Go further, together.' },
]
const REST = 1 // the Figma frame shows 2 extended

// Node boxes are Figma's: the circles' ELLIPSE boxes and the pill's path box,
// (550.148, 342.189) written on Chrome's 1/64 px layout grid, where it lands anyway.
// Each number sits relative to its box (whole px, so nesting moves nothing).
const PILL_BOX: Box = { x: 35209 / 64, y: 21900 / 64, w: 103.35, h: 250.813 }
const SHAPES = [
  { id: '94:266', color: '#66b800', d: 158.806, q: -1, box: { x: 281, y: 0, w: 158.806, h: 158.806 }, num: { id: '94:270', text: '1', x: 66, y: 55, w: 27 } },
  // As a circle, 2 takes the size of 1 and 3 [PROPOSED DEFAULT]: Figma never draws it as one.
  { id: '94:269', color: '#ffb400', d: 158.806, q: 0, box: PILL_BOX, num: { id: '94:271', text: '2', x: 636 - PILL_BOX.x, y: 325 - PILL_BOX.y, w: 35 } },
  { id: '94:268', color: '#ff4c77', d: 158.806, q: 1, box: { x: 292, y: 580, w: 158.806, h: 158.806 }, num: { id: '94:272', text: '3', x: 61, y: 55, w: 37 } },
  { id: '94:267', color: '#05325b', d: 143.682, q: 2, box: { x: 0, y: 296, w: 143.682, h: 143.682 }, num: { id: '94:273', text: '4', x: 53, y: 48, w: 38 } },
].map((s) => {
  const c: Pt = s.q ? [s.box.x + s.d / 2, s.box.y + s.d / 2] : START
  const [m, c1, c2, e] = PILL.map((p) => place(p, c, s.q))
  return { ...s, c, path: `M${m} C${c1} ${c2} ${e}` }
})
const PHOTOS = STATES.map((s, i) => ({ ...s, box: boxOf(...(PHOTO.map((p) => place(p, SHAPES[i].c, SHAPES[i].q)) as [Pt, Pt])) }))
const FRAME = { w: 653.499, h: 738.575 } // 94:264

// Only the incoming photo fades, on top; the last fully shown one stays opaque
// under it until that fade ends, so the blob never thins. The rest hide at once.
const PHOTO_IN = 'z-[2] opacity-100 motion-safe:transition-opacity motion-safe:duration-300'
const PHOTO_UNDER = 'z-[1] opacity-100'
const PHOTO_OFF = 'invisible z-0 opacity-0'
const LINE_FADE = 'motion-safe:transition-[opacity,visibility] motion-safe:duration-300'
// The loop grows from the circle along its path while the previous one shrinks back [PROPOSED DEFAULT 0.4s].
const MORPH = 'motion-safe:transition-[stroke-dasharray,stroke-width] motion-safe:duration-400 motion-safe:ease-in-out'

const TAB = 'absolute z-[1] cursor-pointer appearance-none overflow-visible outline-hidden [-webkit-tap-highlight-color:transparent]'
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
  const [active, setActive] = useState(REST)
  const [settled, setSettled] = useState(REST)
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
  // The button keeps its Figma box; the shape is drawn in 94:264 coordinates. The
  // button ignores the pointer: only the shape's own outline takes it.
  const shape = (s: (typeof SHAPES)[number], i: number) => {
    const on = active === i
    const w = on ? PILL_W : s.d
    const stroke = (grow: number, className: string, color?: string) => (
      <path
        d={s.path}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        className={`${className} ${MORPH}`}
        // pathLength 1: a dash of 0 is a circle at the start, 1 the whole loop. The gap
        // outruns the path, or the next dash would draw a second circle at its end.
        style={{ strokeDasharray: on ? '1 2' : '0 2', strokeWidth: w + grow }}
      />
    )
    return (
      <button
        key={s.id}
        {...tab(i)}
        data-node-id={s.id}
        className={`${TAB} group pointer-events-none`}
        style={{ left: s.box.x, top: s.box.y, width: s.box.w, height: s.box.h }}
      >
        <svg aria-hidden="true" className="absolute overflow-visible" style={{ left: -s.box.x, top: -s.box.y, width: FRAME.w, height: FRAME.h }}>
          {/* Focus ring: 2px of ink 3px out, like an outline; drawn always so it morphs in step. */}
          {stroke(10, 'invisible stroke-ink group-focus-visible:visible')}
          {stroke(6, 'invisible stroke-white group-focus-visible:visible')}
          {stroke(0, '', s.color)}
          {on ? (
            <path d={s.path} fill="none" stroke="transparent" strokeWidth={PILL_W} strokeLinecap="round" pointerEvents="visibleStroke" />
          ) : (
            <circle cx={s.c[0]} cy={s.c[1]} r={s.d / 2} fill="transparent" pointerEvents="visibleFill" />
          )}
        </svg>
        <Digit n={s.num} />
      </button>
    )
  }

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
              {SHAPES.map(shape)}
            </div>

            <div role="tabpanel" id={`${uid}panel`} aria-labelledby={`${uid}tab${active}`} className="absolute left-0 top-0">
              {/* isolate: the photos' z-order stays below the tabs. */}
              <div className="absolute left-0 top-0 isolate">
                {PHOTOS.map((s, i) => (
                  <img
                    key={s.src}
                    data-node-id={i === REST ? '94:265' : undefined}
                    src={s.src}
                    alt={s.alt}
                    draggable={false}
                    onTransitionEnd={(e) => e.propertyName === 'opacity' && i === active && setSettled(i)}
                    className={`absolute max-w-none ${i === active ? PHOTO_IN : i === under ? PHOTO_UNDER : PHOTO_OFF}`}
                    style={{ left: s.box.x, top: s.box.y, width: s.box.w, height: s.box.h }}
                  />
                ))}
              </div>
              {/* pt-px: Chrome floors the negative half-leading (baseline 29) where Figma
                  rounds it (30); Figma's lines measure 1px lower on all three. */}
              {STATES.map((s, i) => (
                <p
                  key={s.line}
                  data-node-id={i === REST ? '94:274' : undefined}
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
