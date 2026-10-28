/**
 * hero - Figma 94:85. Photo grid under a dark scrim, centred headline block.
 * M-01: each photo row slides on its own as a seamless loop, rows 1 and 3
 * rightward and row 2 leftward.
 */
import type { CSSProperties } from 'react'

// Grid geometry from 94:87's children, relative to the group's box (-115, -26).
const TILE = 299.7864990234375
const RADIUS = 22.306095123291016
const COLS = [0, 342.61328125, 685.22265625, 1027.828125, 1370.43359375]
const ROWS = [0, 342.609375, 685.2109375]
const DIRS = [1, -1, 1] as const
// One row repeats every five column pitches (1713.04), rounded to whole px: a
// moving layer whose origin and shift sit on the pixel grid draws its photos
// without resampling at rest and after each full period.
const PERIOD = Math.round((COLS[4] / 4) * 5)
const SPEED = 20 // px/s, [PROPOSED DEFAULT]

type Tile = { id: string; src?: string; color?: string }

function HeroTile({ tile, x, y, copy }: { tile: Tile; x: number; y: number; copy: boolean }) {
  const node = copy ? undefined : tile.id
  const style = { left: x, top: y, width: TILE, height: TILE }
  return tile.src ? (
    <img src={tile.src} alt="" aria-hidden={copy || undefined} className="absolute block max-w-none" style={style} data-node-id={node} />
  ) : (
    <div aria-hidden={copy || undefined} className="absolute" style={{ ...style, background: tile.color, borderRadius: RADIUS }} data-node-id={node} />
  )
}

/** The row's five tiles at their Figma x plus one period of copies on the side the row enters from. */
function HeroRow({ tiles, top, dir }: { tiles: Tile[]; top: number; dir: 1 | -1 }) {
  // Every left stays >= 0 (Blink truncates a fractional negative one) and the
  // track sits at the grid's whole-px origin; the row's fractional top goes on the tiles.
  const base = dir > 0 ? PERIOD : 0
  const style = { left: -base, '--marquee-shift': `${dir * PERIOD}px`, '--marquee-duration': `${PERIOD / SPEED}s` } as CSSProperties
  return (
    <div className="marquee absolute inset-y-0 w-full" style={style}>
      {tiles.map((t, i) => <HeroTile key={t.id} tile={t} x={COLS[i] + base} y={top} copy={false} />)}
      {tiles.map((t, i) => <HeroTile key={`c${t.id}`} tile={t} x={COLS[i] + base - dir * PERIOD} y={top} copy />)}
    </div>
  )
}

// 94:87 overhangs the canvas by 115 on the left and the rest of its width on the right.
const GRID_X = -115
const GRID_W = 1670.2200927734375

// Row-major, in Figma child order. Photos are Figma renders (crop and radius baked in).
const TILES: Tile[] = [
  { id: '94:88', color: '#ff3567' },
  { id: '94:89', src: '/assets/hero/cannes-podcast.webp' },
  { id: '94:90', src: '/assets/hero/8th-birthday.webp' },
  { id: '94:91', src: '/assets/hero/yolk-volley-360.webp' },
  { id: '94:92', src: '/assets/hero/best-leader-winner.webp' },
  { id: '94:93', src: '/assets/hero/jaqs-volleyball.webp' },
  { id: '94:94', src: '/assets/hero/photo-1778077500638.webp' },
  { id: '94:95', src: '/assets/hero/yolk-volley-308.webp' },
  { id: '94:96', src: '/assets/hero/cannes-pod-2.webp' },
  { id: '94:97', color: 'rgb(255 170 0 / 0.8)' },
  { id: '94:98', src: '/assets/hero/nyc-event.webp' },
  { id: '94:99', color: '#66b800' },
  { id: '94:100', src: '/assets/hero/first-jumpers.webp' },
  { id: '94:101', src: '/assets/hero/yolk-volley-274.webp' },
  { id: '94:102', src: '/assets/hero/yolk-volley-60.webp' },
]

export default function Hero() {
  return (
    <div className="relative size-full overflow-hidden rounded-b-[50px]" data-node-id="94:85">
      <div className="absolute inset-0 bg-[#0b1722]" data-node-id="94:86" />

      <div
        className="absolute"
        style={{ left: GRID_X, top: -26, width: GRID_W, height: 984.9974365234375 }}
        data-node-id="94:87"
      >
        {ROWS.map((top, r) => (
          <HeroRow key={top} tiles={TILES.slice(r * 5, r * 5 + 5)} top={top} dir={DIRS[r]} />
        ))}
      </div>

      <div className="absolute inset-0 bg-[rgb(8_22_35/0.71)]" data-node-id="94:103" />

      <div
        className="absolute"
        style={{ left: 214, top: 317, width: 1012.0790405273438, height: 431.83160400390625 }}
        data-node-id="94:104"
      >
        <div className="absolute left-0 top-0 h-[326px] w-full" data-node-id="94:105">
          <h1
            className="absolute left-0 top-0 m-0 flex h-[194px] w-full items-center justify-center text-center text-[88px] font-semibold leading-[96.58419799804688px] tracking-[-4.109965801239014px] text-white"
            data-node-id="94:106"
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
            style={{ left: 192.03955078125, top: 218 }}
            data-node-id="94:107"
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
          style={{ left: 395.03955078125, top: 382.51202392578125 }}
          data-node-id="94:108"
        >
          <span
            className="absolute left-[32px] flex h-[24px] w-[158px] justify-center whitespace-nowrap text-[16px] font-semibold uppercase leading-[24px] text-[#0b1722]"
            style={{ top: 12.6597900390626 }}
            data-node-id="94:109"
          >
            BECOME A MEMBER
          </span>
        </a>
      </div>
    </div>
  )
}
