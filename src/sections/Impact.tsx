import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useReducedMotion } from '../motion'
import { useCanvasSurface, type CanvasSurface } from '../surface'

/**
 * impact - Figma 94:180 (desktop) and 173:411 (wide). Periwinkle band: "Global
 * [photo pill] impact" headline on the left, three stats split by hairlines on
 * the right. The frame starts 2px left of the canvas, so x here is box.x + 2.
 */

// hug: the caption is an auto-width Figma text, so it must never wrap.
// Captions get 1px top padding: Chromium puts a 24/30 baseline at
// round(ascent) + floor(half-leading) = 23px, Figma rounds 23.72 to 24, and
// Chromium snaps text to whole CSS px, so 1px is the step that closes it.
type Stat = { num: string; numW: number; cap: string; capW: number; hug: boolean; y: number; h: number }

const STATS: Stat[] = [
  { num: '10,000+', numW: 248, cap: 'Lithuanian professionals', capW: 270, hug: true, y: 0, h: 114 },
  { num: '60+', numW: 124, cap: 'Countries represented', capW: 250, hug: true, y: 163, h: 114 },
  { num: '10+', numW: 113, cap: 'programs for engagement to contribute to Lithuania', capW: 464, hug: false, y: 326, h: 144 },
]

// Hairlines: ink at 88% opacity, 1px, between the stat groups.
const RULE_Y = [138, 301]

/**
 * Node ids and the two x offsets that differ per canvas: wide moves the content
 * frame +101 but its heading only +5 (heading x is relative to the content frame).
 * stats: [group, number, caption] per stat; rules top to bottom.
 */
type Geo = {
  root: string; div: string; divX: number; heading: string; headingX: number
  global: string; row: string; pill: string; word: string; list: string
  stats: [string, string, string][]; rules: string[]
}

const GEO: Record<CanvasSurface, Geo> = {
  desktop: {
    root: '94:180', div: '94:181', divX: 64, heading: '94:182', headingX: 0,
    global: '94:183', row: '94:184', pill: '94:185', word: '94:186', list: '94:187',
    stats: [['94:188', '94:189', '94:190'], ['94:192', '94:193', '94:194'], ['94:196', '94:197', '94:198']],
    rules: ['94:191', '94:195'],
  },
  wide: {
    root: '173:411', div: '173:412', divX: 165, heading: '173:413', headingX: -96,
    global: '173:414', row: '173:415', pill: '173:416', word: '173:417', list: '173:418',
    stats: [['173:419', '173:420', '173:421'], ['173:423', '173:424', '173:425'], ['173:427', '173:428', '173:429']],
    rules: ['173:422', '173:426'],
  },
}

// A window wider than the canvas reaches past it by --bleed (App.tsx); the band fill follows.
const bleed: CSSProperties = { left: 'calc(-1 * var(--bleed, 0px))', right: 'calc(-1 * var(--bleed, 0px))' }

// M-09 count-up: 0 to the value with the same en-US comma and suffix, once per load.
const COUNT_MS = 1800
const COUNT_AT = 0.4
const TARGETS = STATS.map((s) => Number(s.num.replace(/\D/g, '')))
const SUFFIX = STATS.map((s) => s.num.replace(/^[\d,]+/, ''))
const en = new Intl.NumberFormat('en-US')

// Counts to show, or null for the final strings (rest frame; always under reduced
// motion). Parked at 0 before paint, so a section in view never flashes the finals.
function useCountUp(el: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion()
  const [counts, setCounts] = useState<number[] | null>(null)
  const done = useRef(false)
  useLayoutEffect(() => {
    if (reduced || done.current || !el.current) {
      done.current = true
      setCounts(null)
      return
    }
    setCounts(TARGETS.map(() => 0))
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      if (entries[entries.length - 1].intersectionRatio < COUNT_AT) return
      io.disconnect()
      let t0 = -1
      const tick = (now: number) => {
        if (t0 < 0) t0 = now
        const t = Math.min(1, (now - t0) / COUNT_MS)
        if (t < 1) {
          const k = 1 - (1 - t) ** 3
          setCounts(TARGETS.map((v) => Math.round(v * k)))
          raf = requestAnimationFrame(tick)
        } else {
          done.current = true
          setCounts(null)
        }
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: COUNT_AT })
    io.observe(el.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [el, reduced])
  return counts
}

const headline = 'm-0 absolute text-[96px] font-semibold leading-[108px] tracking-[-3px] whitespace-pre text-ink'

export default function Impact() {
  const g = GEO[useCanvasSurface()]
  const root = useRef<HTMLDivElement>(null)
  const counts = useCountUp(root)
  return (
    <div ref={root} className="relative size-full" data-node-id={g.root}>
      <div className="absolute inset-y-0 bg-periwinkle" style={bleed} />
      <div data-node-id={g.div} className="absolute top-[88px] w-[1312px]" style={{ left: g.divX, height: 485.5625 }}>
        <div data-node-id={g.heading} className="absolute h-[236px] w-[752px]" style={{ left: g.headingX, top: 124.781 }}>
          <h2 className="m-0 font-[inherit]">
            <span data-node-id={g.global} className={`${headline} left-0 top-0 block h-[108px] w-[282px]`}>
              Global
            </span>
            <span data-node-id={g.row} className="absolute left-0 top-[120px] block h-[116px] w-[536px] overflow-hidden">
              <img
                data-node-id={g.pill}
                src="/assets/impact/pill.webp"
                alt=""
                className="absolute left-0 top-0 h-[116px] w-[208px]"
              />
              <span data-node-id={g.word} className={`${headline} left-[232px] top-[4px] block h-[108px] w-[304px]`}>
                impact
              </span>
            </span>
          </h2>
        </div>
        <div data-node-id={g.list} className="absolute h-[470px] w-[464px]" style={{ left: 848, top: 7.781 }}>
          {STATS.map((s, i) => (
            <div key={g.stats[i][0]} data-node-id={g.stats[i][0]} className="absolute left-0 w-[464px]" style={{ top: s.y, height: s.h }}>
              <p
                data-node-id={g.stats[i][1]}
                className="absolute left-0 top-0 m-0 h-[76px] whitespace-pre text-[64px] font-semibold leading-[76px] tracking-[-2px] text-ink"
                style={{ width: s.numW }}
              >
                {/* While counting, assistive tech still reads the final value (M-G1). */}
                {counts ? (
                  <>
                    <span aria-hidden="true">{en.format(counts[i]) + SUFFIX[i]}</span>
                    <span className="sr-only">{s.num}</span>
                  </>
                ) : s.num}
              </p>
              <p
                data-node-id={g.stats[i][2]}
                className={`absolute left-0 top-[84px] m-0 pt-px ${s.hug ? 'whitespace-pre' : ''} text-[24px] font-normal leading-[30px] tracking-[-0.2px] text-ink`}
                style={{ width: s.capW, height: s.h - 84 }}
              >
                {s.cap}
              </p>
            </div>
          ))}
          {g.rules.map((id, i) => (
            <div key={id} data-node-id={id} className="absolute left-0 h-px w-[464px] bg-ink/88" style={{ top: RULE_Y[i] }} />
          ))}
        </div>
      </div>
    </div>
  )
}
