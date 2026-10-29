/**
 * hero on mobile (MOBILE_SPEC.md 2). The desktop collage (94:85) as three rows
 * of tiles drifting right, left, right at 20 px/s (M-01) behind the 71% scrim,
 * with the desktop copy centred over it.
 */
import type { CSSProperties } from 'react'

// Three rows fill the band at its 760 cap (3 x 244 + 2 x 16), square like the
// desktop tiles, radius in the desktop's proportion (22.3 of 300).
const TILE = 244
const GAP = 16
const PITCH = TILE + GAP
const PERIOD = PITCH * 5 // one row of five tiles, whole px
const SPEED = 20 // px/s, as the desktop rows
const DIRS = [1, -1, 1] as const

type Tile = { src?: string; color?: string }

// The desktop rows in Figma order (94:88..94:102).
const ROWS: Tile[][] = [
  [{ color: '#ff3567' }, { src: 'cannes-podcast' }, { src: '8th-birthday' }, { src: 'yolk-volley-360' }, { src: 'best-leader-winner' }],
  [{ src: 'jaqs-volleyball' }, { src: 'photo-1778077500638' }, { src: 'yolk-volley-308' }, { src: 'cannes-pod-2' }, { color: 'rgb(255 170 0 / 0.8)' }],
  [{ src: 'nyc-event' }, { color: '#66b800' }, { src: 'first-jumpers' }, { src: 'yolk-volley-274' }, { src: 'yolk-volley-60' }],
]

/**
 * One row: the five tiles and one period of clones on the side the row enters
 * from. The middle tile rests on the band's centre line, as on the desktop, and
 * two periods cover any window up to 1394px wide at every shift.
 */
function HeroRow({ tiles, dir }: { tiles: Tile[]; dir: 1 | -1 }) {
  const home = dir > 0 ? 1 : 0
  const style = {
    left: `calc(50% - ${TILE / 2 + 2 * PITCH + home * PERIOD}px)`,
    width: PERIOD * 2,
    height: TILE,
    '--marquee-shift': `${dir * PERIOD}px`,
    '--marquee-duration': `${PERIOD / SPEED}s`,
  } as CSSProperties
  return (
    <div className="marquee relative" style={style}>
      {[0, 1].map((s) => tiles.map((t, i) => (
        <div
          key={`${s}-${i}`}
          aria-hidden={s !== home || undefined}
          className="absolute top-0 overflow-hidden rounded-[18px]"
          style={{ left: s * PERIOD + i * PITCH, width: TILE, height: TILE, background: t.color }}
        >
          {t.src && <img src={`/assets/hero/${t.src}.webp`} alt="" draggable={false} className="block size-full" />}
        </div>
      )))}
    </div>
  )
}

export default function MobileHero() {
  return (
    <section
      id="hero"
      data-section="hero"
      className="relative h-[100svh] max-h-[760px] min-h-[640px] overflow-hidden rounded-b-[32px] bg-ink"
    >
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col" style={{ gap: GAP }}>
        {ROWS.map((tiles, r) => <HeroRow key={r} tiles={tiles} dir={DIRS[r]} />)}
      </div>
      <div className="absolute inset-0 bg-[rgb(8_22_35/0.71)]" />
      {/* The desktop's top gradient (94:110), so the clear nav reads over the photos. */}
      <div className="absolute inset-x-0 top-0 h-[160px] bg-linear-to-b from-ink to-ink/0" />

      <div className="relative mx-auto flex max-w-[680px] flex-col items-center px-5 pt-[112px] text-center text-white">
        <h1 className="m-0 text-balance text-[44px] font-semibold leading-[46px] tracking-[-1.8px]">Empowering leaders shaping tomorrow</h1>
        <p className="m-0 mt-4 text-pretty text-[17px] leading-[26px]">
          Network of 10.000+ global Lithuanian professionals from 60+ countries and 28 clubs contributing to the prosperity of Lithuania.
        </p>
        <a
          href="#"
          className="mt-8 flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-semibold uppercase leading-[20px] text-ink outline-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          BECOME A MEMBER
        </a>
      </div>
    </section>
  )
}
