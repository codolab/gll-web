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
// Figma keeps about 32px of white between the photo and every shape (30 to 34.5
// along the pill), so the extended loop takes that much off the photo with a white band.
const GAP = 32

const turn = ([x, y]: Pt, q: number): Pt => (q === 1 ? [-y, x] : q === -1 ? [y, -x] : q === 2 ? [-x, -y] : [x, y])
/** A Figma point moved with the loop that starts at `c`, turned `q` quarter turns (0 keeps it exact). */
const place = (p: Pt, c: Pt, q: number): Pt => {
  if (!q) return p
  const [x, y] = turn([p[0] - START[0], p[1] - START[1]], q)
  return [c[0] + x, c[1] + y]
}

// The photo (94:265), one per number, clipped to a vector so the edge stays sharp at any
// density. Figma's own outline is cut round the 2 loop; this one gives every number the same
// notch and a petal between each pair, so only the selected loop cuts in (scripts/talent-mask.mjs).
const PHOTO = { x: 108.398, y: 103.4, w: 504.147, h: 529.354 }
// 2 is Figma's image fill; 1, 3 and 4 are the hero photos 94:93, 94:95 and 94:101 (gaps.md G-06),
// all baked at 2x this box by scripts/assets.mjs fill.
const PHOTOS = [
  { src: '/assets/talent/jaqs-volleyball.webp', alt: 'GLL members standing together for a group photo' },
  { src: '/assets/talent/vilnius-photo.webp', alt: 'GLL community members gathered for a group portrait in Vilnius' },
  { src: '/assets/talent/yolk-volley-308.webp', alt: 'GLL members taking a group selfie at an event' },
  { src: '/assets/talent/yolk-volley-274.webp', alt: 'GLL members networking at a reception' },
]
// Fetched with the page, so a photo is there the first time its number is chosen.
for (const p of PHOTOS) new Image().src = p.src
const BLOB =
  'M68.152 22.516C100.651 -9.995 122.75 -2.492 146.149 33.77C200.746 108.796 298.242 105.045 358.039 30.019C386.638 -11.245 410.037 -6.244 441.235 22.516C455.101 36.688 468.967 50.859 482.833 65.031C510.132 91.29 507.59 118.221 487.376 132.931C412.35 187.528 416.101 285.024 491.127 344.821C508.174 358.408 511.238 406.123 481.276 444.382C467.571 462.64 453.866 480.899 440.161 499.157C406.438 539.348 392.579 530.828 368.861 498.236C314.264 423.21 216.768 426.961 156.971 501.987C133.572 530.747 95.451 536.443 69.452 512.685C54.286 498.097 39.12 483.508 23.954 468.92C-5.945 440.16 -8.544 416.402 20.054 385.141C82.451 315.117 86.351 227.587 29.154 158.813C-0.745 121.3 0.555 98.792 29.154 67.532C42.153 52.526 55.153 37.521 68.152 22.516Z'
// Where each loop's band meets the next number's notch, the corner is rounded to RHO, as Figma
// draws it after 2, instead of left as a spike of photo: a white ring round CORNERS' centre,
// clipped to FILLS, whose inner edge closes in from the third value (in RHO) to RHO with the
// band, so the spike is trimmed from its tip as the band arrives (scripts/talent-mask.mjs).
const FILLS = [
  'M399.91 179.91L391.46 329.67L541.39 333.99L653.54 342.19L609 180.36L593.88 165L579.4 151.17L565.36 138.81L551.55 127.84L537.76 118.2L523.8 109.82L509.46 102.62L494.53 96.54L478.82 91.5L462.11 87.45L444.21 84.3L424.91 81.99L405.52 80.54Z',
  'M500.64 502.13L392.94 397.73L383.61 547.44L371.4 659.4L619.5 511.9L610.56 525.76L600.33 539.53L588.75 553.42L575.73 567.64L572.11 571.41Z',
  'M227.45 521.21L325.46 407.66L176.7 388.4L71.84 367.84L120.47 556L135.7 571.6L150.26 585.65L162.41 596.56Z',
  'M172.15 332.16L321.97 339.48L340.83 190.67L360.4 79.4L175.24 116.91L159.64 132.14L145.59 146.7L133.01 160.8L121.84 174.63L112.01 188.41L103.44 202.33L96.06 216.6L89.82 231.43L84.63 247.01L80.43 263.55L77.16 281.26L74.73 300.34L73.08 321L72.73 327.31Z',
]
const CORNERS = [[391.46, 329.67, 2.19], [392.94, 397.73, 5.52], [325.46, 407.66, 3.93], [321.97, 339.48, 4.87]]
const RHO = 150
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
// A new photo fades in over whatever shows, in the loop's time [PROPOSED DEFAULT]; --fade is in index.css.
const FADE = 'opacity-(--fade) starting:[--fade:0] motion-safe:transition-[--fade] motion-safe:duration-400 motion-safe:ease-in-out'

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
  const clip = uid.replace(/\W/g, '')
  const [active, setActive] = useState(REST)
  // Photos in the order chosen, each over the last, so however fast the numbers change no white
  // shows through and nothing pops; the ones under a photo go once it is in. Going back to a
  // photo still in the stack fades the ones over it back out instead, as the bands reverse.
  const [layers, setLayers] = useState<{ key: number; i: number; out?: boolean }[]>([{ key: 0, i: REST }])
  const reduced = useReducedMotion()
  const select = (i: number) => {
    setActive(i)
    setLayers((l) => {
      const j = l.map((x) => x.i).lastIndexOf(i), key = l[l.length - 1].key + 1
      if (reduced) return l[l.length - 1].i === i ? l : [{ key, i }]
      if (j < 0) return [...l, { key, i }]
      if (j === l.length - 1 && !l[j].out) return l
      return l.map((x, k) => (k > j ? { ...x, out: true } : k === j ? { ...x, out: false } : x))
    })
  }
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
              {/* One clip for all the layers, so the edge never changes while they stack. */}
              <div data-node-id="94:265" className="absolute" style={{ left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, height: PHOTO.h, clipPath: `path('${BLOB}')` }}>
                {layers.map((l, k, all) => (
                  <img
                    key={l.key}
                    src={PHOTOS[l.i].src}
                    alt={all.map((x) => !x.out).lastIndexOf(true) === k ? PHOTOS[l.i].alt : ''}
                    draggable={false}
                    className={`absolute left-0 top-0 size-full ${l.key ? FADE : ''} ${l.out ? '[--fade:0]' : ''}`}
                    onTransitionEnd={() => setLayers((all) => {
                      const k = all.findIndex((x) => x.key === l.key)
                      return k < 0 ? all : all[k].out ? all.filter((_, m) => m !== k) : all.slice(k)
                    })}
                  />
                ))}
              </div>
              {/* The white band each loop takes off the photo: over the photo, under the tagline. */}
              <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible" style={{ width: FRAME.w, height: FRAME.h }}>
                <defs>
                  {FILLS.map((d, i) => (
                    <clipPath key={d} id={`${clip}fill${i}`}>
                      <path d={d} />
                    </clipPath>
                  ))}
                </defs>
                {SHAPES.map((s, i) => (
                  <g key={s.id}>
                    <path
                      d={s.path}
                      pathLength={1}
                      fill="none"
                      stroke="white"
                      strokeLinecap="round"
                      className={MORPH}
                      style={{ strokeDasharray: active === i ? '1 2' : '0 2', strokeWidth: active === i ? PILL_W + 2 * GAP : s.d }}
                    />
                    {/* Stroke width, like the band, not a transform: Chrome runs transforms off the
                        main thread, where the ring could get a frame ahead of the band. */}
                    <g clipPath={`url(#${clip}fill${i})`}>
                      <circle
                        cx={CORNERS[i][0]}
                        cy={CORNERS[i][1]}
                        r={RHO * CORNERS[i][2]}
                        fill="none"
                        stroke="white"
                        className={MORPH}
                        style={{ strokeWidth: active === i ? 2 * RHO * (CORNERS[i][2] - 1) : 0 }}
                      />
                    </g>
                  </g>
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
