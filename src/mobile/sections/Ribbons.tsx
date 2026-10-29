import type { CSSProperties } from 'react'

/**
 * ribbons on mobile (MOBILE_SPEC.md 5). The desktop rows (94:140, 94:147) at
 * half size: 44/56 type, 8px apart, the same dots. M-07: "Connect globally"
 * slides left and "Grow together" right at 40 px/s, seamless loops.
 */

const SPEED = 40 // px/s, as desktop M-07
const GAP = 16 // phrase-to-dot spacing, desktop 32 halved
const DOT = 19 // desktop 37.65 halved, whole px so every period is whole px
// Desktop row x of the first item (-19) halved, so the rest frame reads like the frame.
const START = -9.5
// Enough repeat units that a 1023px window stays covered at every shift.
const UNITS = 3

type Row = { light: string; bold: string; width: number; dots: [string, string]; dotFirst: boolean; dir: -1 | 1 }

// The dot colours alternate, so a repeat unit is two phrases (desktop Ribbons.tsx).
// Phrase widths are the desktop text boxes (679, 587) halved.
const ROWS: Row[] = [
  { light: 'Connect ', bold: 'globally', width: 339.5, dots: ['bg-green', 'bg-amber'], dotFirst: true, dir: -1 },
  { light: 'Grow ', bold: 'together', width: 293.5, dots: ['bg-pink', 'bg-green'], dotFirst: false, dir: 1 },
]

const period = (r: Row) => 2 * (r.width + DOT + 2 * GAP)

function Phrase({ row, live }: { row: Row; live: boolean }) {
  return (
    <p
      aria-hidden={live ? undefined : true}
      className="m-0 shrink-0 whitespace-pre text-[44px] font-light leading-[56px] tracking-[-1px] text-ink"
      style={{ width: row.width }}
    >
      {row.light}
      <span className="font-semibold">{row.bold}</span>
    </p>
  )
}

const Dot = ({ fill }: { fill: string }) => <span aria-hidden="true" className={`block shrink-0 rounded-full ${fill}`} style={{ width: DOT, height: DOT }} />

function Unit({ row, first }: { row: Row; first: boolean }) {
  // Dot and phrase pairs; the gap after the last item is padding, so units butt seamlessly.
  const pair = (k: number) =>
    row.dotFirst
      ? [<Dot key={`d${k}`} fill={row.dots[k]} />, <Phrase key={`p${k}`} row={row} live={first && k === 0} />]
      : [<Phrase key={`p${k}`} row={row} live={first && k === 0} />, <Dot key={`d${k}`} fill={row.dots[k]} />]
  return (
    <div aria-hidden={first ? undefined : true} className="flex shrink-0 items-center pr-4" style={{ gap: GAP }}>
      {pair(0)}
      {pair(1)}
    </div>
  )
}

function Marquee({ row }: { row: Row }) {
  const p = period(row)
  // A rightward row starts one period to the left and slides back to its rest place.
  const units = Array.from({ length: UNITS }, (_, i) => i)
  const first = row.dir > 0 ? 1 : 0
  const style = {
    left: START - (row.dir > 0 ? p : 0),
    '--marquee-shift': `${row.dir * p}px`,
    '--marquee-duration': `${p / SPEED}s`,
  } as CSSProperties
  return (
    <div className="relative h-14 overflow-hidden">
      <div data-ribbon-track={row.dir < 0 ? 'left' : 'right'} className="marquee absolute top-0 flex w-max group-hover:[animation-play-state:paused]" style={style}>
        {units.map((i) => (
          <Unit key={i} row={row} first={i === first} />
        ))}
      </div>
    </div>
  )
}

export default function MobileRibbons() {
  return (
    <section id="ribbons" data-section="ribbons" className="group flex flex-col gap-2 bg-white py-16">
      {ROWS.map((r) => (
        <Marquee key={r.bold} row={r} />
      ))}
    </section>
  )
}
