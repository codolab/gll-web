import { useId, useRef, useState, type KeyboardEvent } from 'react'

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
// Figma keeps 30px of white between the photo and every shape (30.06 at the
// pill), so the extended loop takes that much off the photo with a white band,
// half a pixel short so its antialiased edge never touches the photo at rest.
const GAP = 29.5

const turn = ([x, y]: Pt, q: number): Pt => (q === 1 ? [-y, x] : q === -1 ? [y, -x] : q === 2 ? [-x, -y] : [x, y])
/** A Figma point moved with the loop that starts at `c`, turned `q` quarter turns (0 keeps it exact). */
const place = (p: Pt, c: Pt, q: number): Pt => {
  if (!q) return p
  const [x, y] = turn([p[0] - START[0], p[1] - START[1]], q)
  return [c[0] + x, c[1] + y]
}

// The photo (94:265): Figma's image fill at 2x its box (scripts/assets.mjs fill),
// clipped to the node's own vector, so the edge stays sharp at any density.
const PHOTO = { x: 108.398, y: 103.4, w: 504.147, h: 529.354 }
const BLOB =
  'M68.152 22.5161C100.651 -9.99506 122.75 -2.49247 146.149 33.77C200.746 108.796 298.242 105.045 358.039 30.0187C386.638 -11.2455 410.037 -6.24377 441.235 22.5161L482.833 65.0308C510.132 91.2898 511.432 122.551 485.433 147.559C446.435 188.823 442.535 238.841 442.535 278.854C441.235 367.635 387.938 432.658 298.242 436.409C226.745 438.91 183.847 463.918 148.748 506.433C125.349 535.193 95.4508 536.443 69.452 512.685L23.954 468.92C-5.94461 440.16 -8.54449 416.402 20.0542 385.141C82.4514 315.117 86.3512 227.587 29.1538 158.813C-0.744841 121.3 0.555101 98.7924 29.1538 67.5317L68.152 22.5161Z'
// 2 is the Figma frame; the other lines are placeholders from frame 94:84 (gaps.md G-06).
const LINES = ['Global minds. Lithuanian roots.', 'One community. Endless possibilities.', 'Your next chapter starts here.', 'Go further, together.']
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
const FRAME = { w: 653.499, h: 738.575 } // 94:264

// One line at a time: the old one fades out, then the new one fades in.
const LINE_ON = 'opacity-100 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:delay-150'
const LINE_OFF = 'invisible opacity-0 motion-safe:transition-[opacity,visibility] motion-safe:duration-150'
// The loop grows from the circle along its path while the previous one shrinks back [PROPOSED DEFAULT 0.4s].
const MORPH = 'motion-safe:transition-[stroke-dasharray,stroke-width] motion-safe:duration-400 motion-safe:ease-in-out'

const TAB = 'absolute z-[1] cursor-pointer appearance-none overflow-visible outline-hidden [-webkit-tap-highlight-color:transparent]'
const STEP: Record<string, (i: number) => number> = {
  ArrowRight: (i) => i + 1, ArrowDown: (i) => i + 1, ArrowLeft: (i) => i - 1, ArrowUp: (i) => i - 1, Home: () => 0, End: () => LINES.length - 1,
}

// The Figma "2" sits 6.8px below its loop's start; as a circle it centres like the others.
const Digit = ({ n, dy = 0 }: { n: Num; dy?: number }) => (
  <span
    data-node-id={n.id}
    className="absolute h-12 whitespace-nowrap text-left text-[56px] font-semibold leading-[48px] tracking-[-2px] text-white motion-safe:transition-transform motion-safe:duration-400 motion-safe:ease-in-out"
    style={{ left: n.x, top: n.y, width: n.w, transform: dy ? `translateY(${dy}px)` : undefined }}
  >
    {n.text}
  </span>
)

export default function Talent() {
  const uid = useId()
  const [active, setActive] = useState(REST)
  // While a tab holds focus it keeps the tab stop, so a hover elsewhere cannot move it.
  const [focused, setFocused] = useState<number | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  // Tabs with automatic activation: hover, focus, tap or arrow keys select.
  const tab = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { tabs.current[i] = el },
    type: 'button' as const,
    role: 'tab',
    id: `${uid}tab${i}`,
    'aria-selected': active === i,
    'aria-controls': `${uid}panel`,
    'aria-label': `${i + 1}: ${LINES[i]}`,
    tabIndex: (focused ?? active) === i ? 0 : -1,
    onPointerEnter: () => setActive(i),
    onFocus: () => {
      setFocused(i)
      setActive(i)
    },
    onBlur: () => setFocused(null),
    onClick: () => setActive(i),
  })
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.current.indexOf(e.target as HTMLButtonElement)
    const go = STEP[e.key]
    if (i < 0 || !go) return
    e.preventDefault()
    tabs.current[(go(i) + LINES.length) % LINES.length]?.focus()
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
        <Digit n={s.num} dy={on || s.q ? 0 : s.c[1] - (s.box.y + s.num.y + 24)} />
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
              <img
                data-node-id="94:265"
                src="/assets/talent/vilnius-photo.webp"
                alt="GLL community members gathered for a group portrait in Vilnius"
                draggable={false}
                className="absolute max-w-none"
                style={{ left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, height: PHOTO.h, clipPath: `path('${BLOB}')` }}
              />
              {/* The white band each loop takes off the photo: over the photo, under the tagline. */}
              <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible" style={{ width: FRAME.w, height: FRAME.h }}>
                {SHAPES.map((s, i) => (
                  <path
                    key={s.id}
                    d={s.path}
                    pathLength={1}
                    fill="none"
                    stroke="white"
                    strokeLinecap="round"
                    className={MORPH}
                    style={{ strokeDasharray: active === i ? '1 2' : '0 2', strokeWidth: active === i ? PILL_W + 2 * GAP : s.d }}
                  />
                ))}
              </svg>
              {/* pt-px: Chrome floors the negative half-leading (baseline 29) where Figma
                  rounds it (30); Figma's lines measure 1px lower on all three. */}
              {LINES.map((line, i) => (
                <p
                  key={line}
                  data-node-id={i === REST ? '94:274' : undefined}
                  className={`absolute m-0 pt-px text-[32px] font-semibold leading-[36px] tracking-[-0.64px] text-ink ${i === active ? LINE_ON : LINE_OFF}`}
                  style={{ left: 724, top: 514.074, width: 254, height: 108 }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
