/**
 * logos on mobile (MOBILE_SPEC.md 3). The desktop partner strip (94:111) at 60%,
 * one marquee row drifting left at 30 px/s (M-02); a hovering mouse pauses it
 * (M-03), touch does not.
 */
import type { CSSProperties } from 'react'

const SCALE = 0.6
const SPEED = 30 // px/s, as the desktop strip
const SETS = 3 // the strip and two clones cover a 1023px window at every shift
// The strip starts at the gutter, as the desktop one does at its 24: under the
// scaled gap (42.5), so the clone that slides in from the left never shows a seam.
const LEFT = 20

type Logo = { src: string; alt: string; x: number; y: number; w: number; h: number; hardLight?: boolean }

// The desktop boxes (src/sections/Logos.tsx), unscaled. The LF marks are HARD_LIGHT in Figma.
const LOGOS: Logo[] = [
  { src: 'triniti', alt: 'Triniti Services', x: 0, y: 22.965, w: 140.142, h: 57.997 },
  { src: 'lf-1', alt: 'Lietuvių Fondas, Lithuanian Foundation', x: 210.95, y: 7.708, w: 78.656, h: 88.511, hardLight: true },
  { src: 'atviros-lietuvos-fondas', alt: 'Atviros Lietuvos fondas', x: 360.415, y: 0, w: 129.908, h: 103.926 },
  { src: 'jakulio-fondas', alt: 'Mariaus Jakulio Jason fondas', x: 561.132, y: 23.558, w: 145.305, h: 56.811 },
  { src: 'lf-2', alt: 'Lietuvių Fondas, Lithuanian Foundation', x: 777.245, y: 7.708, w: 78.656, h: 88.511, hardLight: true },
  { src: 'ilte', alt: 'ILTE', x: 926.71, y: 21.162, w: 77.29, h: 61.602 },
  { src: 'lithuania-travel', alt: 'Lithuania Travel', x: 1074.809, y: 29, w: 167.057, h: 45.926 },
  { src: 'baltic-amadeus', alt: 'Baltic Amadeus', x: 1312.674, y: 29.081, w: 155.517, h: 45.764 },
]
const GAP = 70.8085
const HEIGHT = 103.926 * SCALE
const LAST = LOGOS[LOGOS.length - 1]
// Last right edge plus the gap, on Blink's 1/64 px layout grid so every clone lands exactly one period on.
const PERIOD = Math.round((LAST.x + LAST.w + GAP) * SCALE * 64) / 64

const track = {
  marginLeft: LEFT,
  width: PERIOD * SETS,
  height: HEIGHT,
  '--marquee-shift': `${-PERIOD}px`,
  '--marquee-duration': `${PERIOD / SPEED}s`,
} as CSSProperties

export default function MobileLogos() {
  return (
    <section id="logos" data-section="logos" className="group relative overflow-x-clip bg-white py-7">
      {/* The moving track is its own stacking context, so the hard-light marks
          blend against its backdrop: keep that white, like the page under it. */}
      <div className="marquee relative bg-white group-hover:[animation-play-state:paused]" style={track}>
        {Array.from({ length: SETS }, (_, s) => LOGOS.map((l) => {
          const clone = s > 0
          return (
            <img
              key={`${s}-${l.src}`}
              src={`/assets/logos/${l.src}.webp`}
              alt={clone ? '' : l.alt}
              aria-hidden={clone || undefined}
              draggable={false}
              className={`absolute block max-w-none ${l.hardLight ? 'mix-blend-hard-light' : ''}`}
              style={{ left: s * PERIOD + l.x * SCALE, top: l.y * SCALE, width: l.w * SCALE, height: l.h * SCALE }}
            />
          )
        }))}
      </div>
    </section>
  )
}
