/**
 * ribbons - Figma 94:139 (wide 173:366). Two clipped type rows ("Connect
 * globally", "Grow together"), each phrase light + semibold, split by coloured
 * dots. M-07: each row's content slides inside its clip box as a seamless loop.
 */
import type { CSSProperties } from 'react'
import { CANVASES } from '../canvas'
import { useCanvasSurface, type CanvasSurface } from '../surface'

const ROW_Y = 37.1758 // dot top inside a 112px row (2280.1016 - 2242.9258)
const SPEED = 40 // px/s, [PROPOSED DEFAULT]
const WINDOW_MAX = 2560 // widest window the rows fill edge to edge (canvas bleed)

type Dot = { node?: string; group?: string; x: number; fill: string }
type Phrase = { node?: string; x: number; w: number; light: string; bold: string }
type Item = Dot | Phrase

function RibbonDot({ node, group, x, fill }: Dot) {
  // Each vector is a plain circle, but its SVG export draws it at 38px. A
  // clip-path is not pixel-snapped (border-radius is: 37.649 became 37 x 38),
  // so an oversized fill clipped to the exact ellipse keeps the true rim.
  return (
    <div data-node-id={group} className="absolute" style={{ left: x, top: ROW_Y, width: 37.649, height: 37.648 }}>
      <div data-node-id={node} className="absolute inset-0">
        <div className={`absolute -inset-[2px] ${fill} [clip-path:ellipse(18.8245px_18.824px_at_50%_50%)]`} />
      </div>
    </div>
  )
}

function RibbonPhrase({ node, x, w, light, bold }: Phrase) {
  return (
    <p
      data-node-id={node}
      aria-hidden={!node || undefined}
      className="absolute top-0 m-0 h-[112px] whitespace-pre text-[88px] font-light leading-[112px] tracking-[-2px] text-ink"
      style={{ left: x, width: w }}
    >
      {light}
      <span className="font-semibold">{bold}</span>
    </p>
  )
}

const renderItem = (it: Item, key: string) =>
  'fill' in it ? <RibbonDot key={key} {...it} /> : <RibbonPhrase key={key} {...it} />

const at = (it: Item, dx: number): Item => ({ ...it, x: it.x + dx })
const clone = (it: Item): Item => ({ ...it, node: undefined, group: undefined })
const width = (it: Item) => ('w' in it ? it.w : 37.649)

type Row = { node: string; w: number; items: Item[]; period: number; dir: -1 | 1 }

/**
 * Originals at their Figma x plus every whole repeat, one period apart, that
 * enters the widest window at some shift, so the visible span stays covered all
 * through the loop. `span` is that window in row px. Whole repeats: a trimmed
 * one leaving a phrase as the track's first box made the dots' edges rasterise
 * a shade differently one period on.
 */
function Marquee({ row, span: [lo, hi] }: { row: Row; span: [number, number] }) {
  const { items, dir } = row
  // On Blink's 1/64 px layout grid, every clone lands exactly one period away.
  const period = Math.round(row.period * 64) / 64
  const unit = items.filter((it) => it.x < period)
  const clones: Item[] = []
  for (let k = -3; k <= 3; k++) {
    const seen = unit.some((it) => {
      const x = it.x + k * period, w = width(it)
      return dir < 0 ? x + w > lo && x < hi + period : x + w + period > lo && x < hi
    })
    if (!seen) continue
    for (const it of unit) {
      const x = it.x + k * period
      if (!items.some((o) => Math.abs(o.x - x) < 0.01)) clones.push(at(clone(it), k * period))
    }
  }
  // Blink truncates a fractional left toward zero, which puts a negative one
  // 1/64 px off: keep every left >= 0 and move the track left instead, by whole
  // px so every left keeps its fraction (and how Blink rounds it).
  const base = Math.ceil(Math.max(0, ...clones.map((c) => -c.x)))
  const style = { left: -base, '--marquee-shift': `${dir * period}px`, '--marquee-duration': `${period / SPEED}s` } as CSSProperties
  return (
    <div className="marquee absolute inset-y-0 w-full group-hover:[animation-play-state:paused]" style={style}>
      {items.map((it, i) => renderItem(at(it, base), `o${i}`))}
      {clones.map((it, i) => renderItem(at(it, base), `c${i}`))}
    </div>
  )
}

const connect = (node: string | undefined, x: number): Phrase => ({ node, x, w: 679, light: 'Connect ', bold: 'globally' })
const grow = (node: string | undefined, x: number): Phrase => ({ node, x, w: 587, light: 'Grow ', bold: 'together' })

// A seamless repeat spans the dot colour cycle: two phrase units (dot, phrase
// and gaps: 780.649 and 688.649) on desktop (green/amber, pink/green), three on
// wide's first row (green/pink/amber).
const ROWS: Record<CanvasSurface, { root: string; rows: [Row, Row] }> = {
  desktop: {
    root: '94:139',
    rows: [
      {
        node: '94:140', w: 1529.298, period: 2 * 780.649, dir: -1,
        items: [
          { group: '94:141', node: '94:142', x: 0, fill: 'bg-green' },
          connect('94:143', 69.649),
          { group: '94:144', node: '94:145', x: 780.649, fill: 'bg-amber' },
          connect('94:146', 850.298),
        ],
      },
      {
        node: '94:147', w: 2209, period: 2 * 688.649, dir: 1,
        items: [
          grow('94:148', 0),
          { group: '94:149', node: '94:150', x: 619, fill: 'bg-pink' },
          grow('94:151', 688.649),
          { group: '94:152', node: '94:153', x: 1307.649, fill: 'bg-green' },
          grow('94:154', 1377.298),
        ],
      },
    ],
  },
  wide: {
    root: '173:366',
    rows: [
      {
        node: '173:367', w: 2309.947, period: 3 * 780.649, dir: -1,
        items: [
          { group: '173:368', node: '173:369', x: 0, fill: 'bg-green' },
          connect('173:370', 69.649),
          { group: '173:371', node: '173:372', x: 780.649, fill: 'bg-pink' },
          connect('173:373', 850.298),
          { group: '173:374', node: '173:375', x: 1561.298, fill: 'bg-amber' },
          connect('173:376', 1630.947),
        ],
      },
      {
        node: '173:377', w: 2209, period: 2 * 688.649, dir: 1,
        items: [
          grow('173:378', 0),
          { group: '173:379', node: '173:380', x: 619, fill: 'bg-pink' },
          grow('173:381', 688.649),
          { group: '173:382', node: '173:383', x: 1307.649, fill: 'bg-green' },
          grow('173:384', 1377.298),
        ],
      },
    ],
  },
}

export default function Ribbons() {
  const surface = useCanvasSurface()
  const { root, rows } = ROWS[surface]
  const canvas = CANVASES[surface]
  const bleed = (WINDOW_MAX - canvas.w) / 2
  const sx = canvas.sections.find((s) => s.slug === 'ribbons')?.x ?? 0
  const span: [number, number] = [-bleed - sx, canvas.w + bleed - sx]
  // Figma clips each row to its box, which reaches past both canvas edges: the
  // canvas (or, when wider, the window) clips it sideways, so a bleed fills.
  return (
    <div className="group relative size-full" data-node-id={root}>
      {rows.map((row, i) => (
        <div key={row.node} data-node-id={row.node} className="absolute left-0 h-[112px] overflow-x-visible overflow-y-clip" style={{ top: i * 128, width: row.w }}>
          <Marquee row={row} span={span} />
        </div>
      ))}
    </div>
  )
}
