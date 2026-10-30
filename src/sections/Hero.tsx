/**
 * hero - Figma 94:85; wide: loose layers in 173:310 under a synthetic root.
 * Photo grid under a dark scrim, centred headline block.
 * M-01: each photo row slides on its own as a seamless loop, rows 1 and 3
 * rightward and row 2 leftward.
 */
import type { CSSProperties } from 'react'
import { useCanvasSurface, WIDE_MIN, WINDOW_MAX, type CanvasSurface } from '../surface'

type Tile = { id: string; src?: string; color?: string }

// Row-major, in Figma child order; the colour tiles sit in the same cells on both frames.
const LOOKS = [
  '#ff3567', 'cannes-podcast', '8th-birthday', 'yolk-volley-360', 'best-leader-winner',
  'jaqs-volleyball', 'photo-1778077500638', 'yolk-volley-308', 'cannes-pod-2', 'rgb(255 170 0 / 0.8)',
  'nyc-event', '#66b800', 'first-jumpers', 'yolk-volley-274', 'yolk-volley-60',
]
const tiles = (ns: number, first: number, prefix: string): Tile[] => LOOKS.map((look, i) => {
  const id = `${ns}:${first + i}`
  return /^(#|rgb)/.test(look) ? { id, color: look } : { id, src: `/assets/hero/${prefix}${look}.webp` }
})

/**
 * Per-surface geometry, from the node JSON. Tile columns and rows are relative
 * to the grid origin (`grid`, whole px; desktop's is group 94:87, wide has no group).
 * Photos are Figma renders of each tile (crop and radius baked in).
 */
const LAYOUT = {
  desktop: {
    w: 1440,
    // The widest window this canvas gets (wider is wide). More clones than that
    // re-rasterise the moving rows differently from main's.
    maxWindow: WIDE_MIN,
    root: '94:85', ink: '94:86', scrim: '94:103',
    grid: { id: '94:87', x: -115, y: -26, w: 1670.2200927734375, h: 984.9974365234375 },
    tileW: 299.7864990234375, tileH: 299.7864990234375,
    cols: [0, 342.61328125, 685.22265625, 1027.828125, 1370.43359375],
    rows: [0, 342.609375, 685.2109375],
    rounded: true, // the frame's 50px bottom corners
    tiles: tiles(94, 88, ''),
    copy: { id: '94:104', x: 214, y: 317, w: 1012.0790405273438, h: 431.83160400390625 },
    block: '94:105', title: { id: '94:106', x: 0, w: 1012.0790405273438 }, lede: { id: '94:107', x: 192.03955078125 },
    cta: { id: '94:108', x: 395.03955078125, top: 382.51202392578125 }, label: { id: '94:109', top: 12.6597900390626 },
  },
  wide: {
    w: 1640,
    maxWindow: WINDOW_MAX,
    root: 'wide:hero', ink: '173:312', scrim: '173:329',
    grid: { id: undefined, x: -131, y: -26, w: 1902.2228393554688, h: 984.9974365234375 },
    tileW: 341.42352294921875, tileH: 299.7864990234375,
    cols: [0.02783203125, 390.226318359375, 780.420166015625, 1170.60986328125, 1560.79931640625],
    rows: [0, 342.609375, 685.2109375],
    rounded: false, // Rectangle 15 is square
    tiles: tiles(173, 314, 'wide-'),
    copy: { id: '173:330', x: 243.7041015625, y: 317.04541015625, w: 1152.592041015625, h: 431.7417907714844 },
    block: '173:331', title: { id: '173:332', x: 36.2958984375, w: 1080 }, lede: { id: '173:333', x: 262.2958984375 },
    cta: { id: '173:334', x: 465.2958984375, top: 382.51202392578125 }, label: { id: '173:335', top: 12.6597900390626 },
  },
}
type Layout = (typeof LAYOUT)[CanvasSurface]

const RADIUS = 22.306095123291016
const DIRS = [1, -1, 1] as const
const SPEED = 20 // px/s, [PROPOSED DEFAULT]

function HeroTile({ tile, x, y, w, h, copy }: { tile: Tile; x: number; y: number; w: number; h: number; copy: boolean }) {
  const node = copy ? undefined : tile.id
  const style = { left: x, top: y, width: w, height: h }
  return tile.src ? (
    <img src={tile.src} alt="" aria-hidden={copy || undefined} className="absolute block max-w-none" style={style} data-node-id={node} />
  ) : (
    <div aria-hidden={copy || undefined} className="absolute" style={{ ...style, background: tile.color, borderRadius: RADIUS }} data-node-id={node} />
  )
}

/**
 * One row: its five tiles at their Figma x, plus copies (tile n is column n mod 5,
 * shifted by whole periods) wherever the row is visible during one period of travel.
 */
function HeroRow({ L, r, dir }: { L: Layout; r: number; dir: 1 | -1 }) {
  // A row repeats every five column pitches, rounded to whole px: a moving layer
  // whose origin and shift sit on the pixel grid draws its photos without
  // resampling at rest and after each full period.
  const period = Math.round(((L.cols[4] - L.cols[0]) / 4) * 5)
  const reach = (L.maxWindow - L.w) / 2
  const lo = -L.grid.x - reach - (dir > 0 ? period : 0)
  const hi = L.w - L.grid.x + reach + (dir < 0 ? period : 0)
  const at = (n: number) => L.cols[((n % 5) + 5) % 5] + Math.floor(n / 5) * period
  const shown: number[] = []
  for (let n = Math.floor((lo - L.tileW) / period) * 5; at(n) < hi; n++) if (at(n) + L.tileW > lo) shown.push(n)
  // Every left stays >= 0 (Blink truncates a fractional negative one) and the
  // track sits at the grid's whole-px origin; the row's fractional top goes on the tiles.
  const base = Math.max(0, -Math.floor(shown[0] / 5)) * period
  const row = L.tiles.slice(r * 5, r * 5 + 5)
  const top = L.rows[r]
  const style = { left: -base, '--marquee-shift': `${dir * period}px`, '--marquee-duration': `${period / SPEED}s` } as CSSProperties
  return (
    <div className="marquee absolute inset-y-0 w-full" style={style}>
      {row.map((t, i) => <HeroTile key={t.id} tile={t} x={L.cols[i] + base} y={top} w={L.tileW} h={L.tileH} copy={false} />)}
      {shown.filter((n) => n < 0 || n > 4).map((n) => (
        <HeroTile key={n} tile={row[((n % 5) + 5) % 5]} x={at(n) + base} y={top} w={L.tileW} h={L.tileH} copy />
      ))}
    </div>
  )
}

// A full-width band reaches past the frame edges into a wider window (CONVENTIONS "Bleed").
const BAND = { left: 'calc(-1 * var(--bleed, 0px))', right: 'calc(-1 * var(--bleed, 0px))' }

export default function Hero() {
  const L = LAYOUT[useCanvasSurface()]
  return (
    <div className="relative size-full" data-node-id={L.root}>
      {/* The band clips the rows like the Figma frame, widened by the bleed: in a wider
          window its fills, rows and (desktop) rounded bottom corners reach the window edges. */}
      <div className={`absolute inset-y-0 overflow-hidden ${L.rounded ? 'rounded-b-[50px]' : ''}`} style={BAND} data-hero-frame="">
        <div className="absolute inset-0 bg-[#0b1722]" data-node-id={L.ink} />

        <div
          className="absolute"
          style={{ left: `calc(var(--bleed, 0px) + ${L.grid.x}px)`, top: L.grid.y, width: L.grid.w, height: L.grid.h }}
          data-node-id={L.grid.id}
          data-hero-rows=""
        >
          {L.rows.map((top, r) => (
            <HeroRow key={top} L={L} r={r} dir={DIRS[r]} />
          ))}
        </div>

        <div className="absolute inset-0 bg-[rgb(8_22_35/0.71)]" data-node-id={L.scrim} />
      </div>

      <div
        className="absolute"
        style={{ left: L.copy.x, top: L.copy.y, width: L.copy.w, height: L.copy.h }}
        data-node-id={L.copy.id}
      >
        <div className="absolute left-0 top-0 h-[326px] w-full" data-node-id={L.block}>
          <h1
            className="absolute top-0 m-0 flex h-[194px] items-center justify-center text-center text-[88px] font-semibold leading-[96.58419799804688px] tracking-[-4.109965801239014px] text-white"
            style={{ left: L.title.x, width: L.title.w }}
            data-node-id={L.title.id}
          >
            {/* Figma tracks between glyphs only; CSS also tracks after the last one.
                An inline end margin lands on the final line only and cancels it,
                without splitting the run (which would drop the "ow" kern). */}
            <span>
              <span className="mr-[4.109965801239014px]">Empowering leaders shaping tomorrow</span>
            </span>
          </h1>
          <p
            className="absolute m-0 h-[108px] w-[628px] text-center text-[24px] font-normal leading-[36px] text-white"
            style={{ left: L.lede.x, top: 218 }}
            data-node-id={L.lede.id}
          >
            {/* Chromium's baseline is round(ascent) + floor(half-leading) = 26; Figma
                rounds the exact 26.73 to 27. Measured 1px high without this. */}
            <span className="relative top-px">
              Network of 10.000+ global Lithuanian professionals from 60+ countries and 28 clubs contributing to the prosperity of Lithuania.
            </span>
          </p>
        </div>

        <a
          href="#"
          className="absolute block h-[49.31958770751953px] w-[222px] rounded-[138.7113494873047px] bg-white"
          style={{ left: L.cta.x, top: L.cta.top }}
          data-node-id={L.cta.id}
        >
          <span
            className="absolute left-[32px] flex h-[24px] w-[158px] justify-center whitespace-nowrap text-[16px] font-semibold uppercase leading-[24px] text-[#0b1722]"
            style={{ top: L.label.top }}
            data-node-id={L.label.id}
          >
            BECOME A MEMBER
          </span>
        </a>
      </div>
    </div>
  )
}
