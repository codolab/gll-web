/** logos - Figma 94:111. Partner strip; the last logo overhangs 1440 and the canvas clips it. */
import type { CSSProperties } from 'react'

type Logo = { id: string; src: string; alt: string; x: number; y: number; w: number; h: number; hardLight?: boolean }

// Figma renders (filters baked). The two LF marks are HARD_LIGHT in Figma, so
// they blend against the white page here exactly as they do in the frame.
const LOGOS: Logo[] = [
  { id: '94:112', src: '/assets/logos/triniti.webp', alt: 'Triniti Services', x: 0, y: 22.965, w: 140.142, h: 57.997 },
  { id: '94:113', src: '/assets/logos/lf-1.webp', alt: 'Lietuvių Fondas, Lithuanian Foundation', x: 210.95, y: 7.708, w: 78.656, h: 88.511, hardLight: true },
  { id: '94:114', src: '/assets/logos/atviros-lietuvos-fondas.webp', alt: 'Atviros Lietuvos fondas', x: 360.415, y: 0, w: 129.908, h: 103.926 },
  { id: '94:115', src: '/assets/logos/jakulio-fondas.webp', alt: 'Mariaus Jakulio Jason fondas', x: 561.132, y: 23.558, w: 145.305, h: 56.811 },
  { id: '94:116', src: '/assets/logos/lf-2.webp', alt: 'Lietuvių Fondas, Lithuanian Foundation', x: 777.245, y: 7.708, w: 78.656, h: 88.511, hardLight: true },
  { id: '94:117', src: '/assets/logos/ilte.webp', alt: 'ILTE', x: 926.71, y: 21.162, w: 77.29, h: 61.602 },
  { id: '94:118', src: '/assets/logos/lithuania-travel.webp', alt: 'Lithuania Travel', x: 1074.809, y: 29, w: 167.057, h: 45.926 },
  { id: '94:119', src: '/assets/logos/baltic-amadeus.webp', alt: 'Baltic Amadeus', x: 1312.674, y: 29.081, w: 155.517, h: 45.764 },
]

// M-02 period: last right edge + the auto-layout gap (all seven are equal), on
// Blink's 1/64 px layout grid so every clone lands exactly one period away.
const GAP = 70.8085
const LAST = LOGOS[LOGOS.length - 1]
const PERIOD = Math.round((LAST.x + LAST.w + GAP) * 64) / 64
const SPEED = 30 // px/s, [PROPOSED DEFAULT]

const track = {
  width: PERIOD + LAST.x + LAST.w,
  '--marquee-shift': `${-PERIOD}px`,
  '--marquee-duration': `${PERIOD / SPEED}s`,
} as CSSProperties

/** One logo; a clone sits one period to the right, without node id or accessible name. */
function LogoImg({ l, clone = false }: { l: Logo; clone?: boolean }) {
  return (
    <img
      data-node-id={clone ? undefined : l.id}
      src={l.src}
      alt={clone ? '' : l.alt}
      aria-hidden={clone || undefined}
      draggable={false}
      className={`absolute max-w-none ${l.hardLight ? 'mix-blend-hard-light' : ''}`}
      style={{ left: l.x + (clone ? PERIOD : 0), top: l.y, width: l.w, height: l.h }}
    />
  )
}

export default function Logos() {
  return (
    <div className="group relative size-full" data-node-id="94:111">
      {/* The moving track is its own stacking context, so the hard-light marks
          blend against its backdrop: keep that white, like the page under it. */}
      <div
        className="marquee absolute left-0 top-0 h-full bg-white group-hover:[animation-play-state:paused]"
        style={track}
      >
        {LOGOS.map((l) => <LogoImg key={l.id} l={l} />)}
        {LOGOS.map((l) => <LogoImg key={`clone-${l.id}`} l={l} clone />)}
      </div>
    </div>
  )
}
