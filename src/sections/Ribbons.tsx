/**
 * ribbons - Figma 94:139. Two clipped type rows ("Connect globally",
 * "Grow together"), each phrase light + semibold, split by coloured dots.
 * M-07: each row's content slides inside its clip box as a seamless loop.
 */
import type { CSSProperties } from 'react'

const ROW_Y = 37.1758 // dot top inside a 112px row (2280.1016 - 2242.9258)
const SPEED = 40 // px/s, [PROPOSED DEFAULT]

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

/** Originals at their Figma x plus one period of clones on the side the row
    enters from, so the visible span stays covered at every shift. */
function Marquee({ items, period: raw, dir }: { items: Item[]; period: number; dir: -1 | 1 }) {
  // On Blink's 1/64 px layout grid, every clone lands exactly one period away.
  const period = Math.round(raw * 64) / 64
  // Blink truncates a fractional left toward zero, which puts a negative one
  // 1/64 px off: keep every left >= 0 and move the track left instead.
  const base = dir > 0 ? period : 0
  const style = { left: -base, '--marquee-shift': `${dir * period}px`, '--marquee-duration': `${period / SPEED}s` } as CSSProperties
  return (
    <div className="marquee absolute inset-y-0 w-full group-hover:[animation-play-state:paused]" style={style}>
      {items.map((it, i) => renderItem(at(it, base), `o${i}`))}
      {items.filter((it) => it.x < period).map((it, i) => renderItem(at(clone(it), base - dir * period), `c${i}`))}
    </div>
  )
}

// The dot colours alternate (green/amber, pink/green), so a seamless repeat is
// two phrase units, not one: 2 x 780.649 and 2 x 688.649.
const CONNECT: Item[] = [
  { group: '94:141', node: '94:142', x: 0, fill: 'bg-green' },
  { node: '94:143', x: 69.649, w: 679, light: 'Connect ', bold: 'globally' },
  { group: '94:144', node: '94:145', x: 780.649, fill: 'bg-amber' },
  { node: '94:146', x: 850.298, w: 679, light: 'Connect ', bold: 'globally' },
]
const GROW: Item[] = [
  { node: '94:148', x: 0, w: 587, light: 'Grow ', bold: 'together' },
  { group: '94:149', node: '94:150', x: 619, fill: 'bg-pink' },
  { node: '94:151', x: 688.649, w: 587, light: 'Grow ', bold: 'together' },
  { group: '94:152', node: '94:153', x: 1307.649, fill: 'bg-green' },
  { node: '94:154', x: 1377.298, w: 587, light: 'Grow ', bold: 'together' },
]

export default function Ribbons() {
  return (
    <div className="group relative size-full" data-node-id="94:139">
      <div data-node-id="94:140" className="absolute left-0 top-0 h-[112px] overflow-hidden" style={{ width: 1529.298 }}>
        <Marquee items={CONNECT} period={2 * 780.649} dir={-1} />
      </div>
      <div data-node-id="94:147" className="absolute left-0 top-[128px] h-[112px] w-[2209px] overflow-hidden">
        <Marquee items={GROW} period={2 * 688.649} dir={1} />
      </div>
    </div>
  )
}
