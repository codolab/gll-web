/** logos - Figma 94:111 (wide 173:337). Partner strip; the last logo overhangs the frame and the canvas clips it. */
import type { CSSProperties } from 'react'
import { CANVASES } from '../canvas'
import { useCanvasSurface, type CanvasSurface } from '../surface'

type Mark = { src: string; alt: string; y: number; w: number; h: number; hardLight?: boolean }
type Logo = Mark & { id: string; x: number }

// Figma renders (filters baked). The two LF marks are HARD_LIGHT in Figma, so
// they blend against the white page here exactly as they do in the frame. Each
// wide logo is the same image, filter and size as its desktop one.
const LF_ALT = 'Lietuvių Fondas, Lithuanian Foundation'
const TRINITI: Mark = { src: '/assets/logos/triniti.webp', alt: 'Triniti Services', y: 22.965, w: 140.142, h: 57.997 }
const LF_1: Mark = { src: '/assets/logos/lf-1.webp', alt: LF_ALT, y: 7.708, w: 78.656, h: 88.511, hardLight: true }
const LF_2: Mark = { ...LF_1, src: '/assets/logos/lf-2.webp' }
const ATVIROS: Mark = { src: '/assets/logos/atviros-lietuvos-fondas.webp', alt: 'Atviros Lietuvos fondas', y: 0, w: 129.908, h: 103.926 }
const JAKULIO: Mark = { src: '/assets/logos/jakulio-fondas.webp', alt: 'Mariaus Jakulio Jason fondas', y: 23.558, w: 145.305, h: 56.811 }
const ILTE: Mark = { src: '/assets/logos/ilte.webp', alt: 'ILTE', y: 21.162, w: 77.29, h: 61.602 }
const TRAVEL: Mark = { src: '/assets/logos/lithuania-travel.webp', alt: 'Lithuania Travel', y: 29, w: 167.057, h: 45.926 }
const AMADEUS: Mark = { src: '/assets/logos/baltic-amadeus.webp', alt: 'Baltic Amadeus', y: 29.081, w: 155.517, h: 45.764 }

const STRIPS: Record<CanvasSurface, { id: string; logos: Logo[] }> = {
  desktop: {
    id: '94:111',
    logos: [
      { id: '94:112', x: 0, ...TRINITI },
      { id: '94:113', x: 210.95, ...LF_1 },
      { id: '94:114', x: 360.415, ...ATVIROS },
      { id: '94:115', x: 561.132, ...JAKULIO },
      { id: '94:116', x: 777.245, ...LF_2 },
      { id: '94:117', x: 926.71, ...ILTE },
      { id: '94:118', x: 1074.809, ...TRAVEL },
      { id: '94:119', x: 1312.674, ...AMADEUS },
    ],
  },
  // Nine logos, Lithuania Travel twice, in the wide frame's own order.
  wide: {
    id: '173:337',
    logos: [
      { id: '173:338', x: 0, ...TRINITI },
      { id: '173:339', x: 210.95, ...LF_1 },
      { id: '173:340', x: 360.415, ...ATVIROS },
      { id: '173:341', x: 561.132, ...TRAVEL },
      { id: '173:342', x: 798.997, ...LF_2 },
      { id: '173:343', x: 948.462, ...ILTE },
      { id: '173:344', x: 1096.561, ...JAKULIO },
      { id: '173:345', x: 1312.674, ...TRAVEL },
      { id: '173:346', x: 1550.539, ...AMADEUS },
    ],
  },
}

const GAP = 70.8085 // the auto-layout spacing, equal between all logos
const SPEED = 30 // px/s, [PROPOSED DEFAULT]
const WINDOW_MAX = 2560 // widest window the track fills edge to edge (canvas bleed)

/**
 * The strip repeated every period, leftward: originals plus every clone that
 * enters the widest window at some shift, all at left >= 0 (Blink truncates a
 * fractional negative left toward zero) on a track moved left by `base`, whole
 * px so every left keeps its fraction.
 */
function layout(surface: CanvasSurface) {
  const { logos } = STRIPS[surface]
  const last = logos[logos.length - 1]
  // Last right edge + gap, on whole px: each clone then lands exactly one period away and
  // rasterises at its original's sub-pixel phase, so the raster logos do not resample at the wrap.
  const period = Math.round(last.x + last.w + GAP)
  const canvas = CANVASES[surface]
  const bleed = (WINDOW_MAX - canvas.w) / 2
  const sx = canvas.sections.find((s) => s.slug === 'logos')?.x ?? 0
  const [lo, hi] = [-bleed - sx, canvas.w + bleed - sx]
  const clones: Logo[] = []
  for (let k = -2; k <= 3; k++) {
    if (k === 0) continue
    for (const l of logos) {
      const x = l.x + k * period
      if (x + l.w > lo && x < hi + period) clones.push({ ...l, x })
    }
  }
  const base = Math.ceil(Math.max(0, ...clones.map((c) => -c.x)))
  const right = Math.max(...[...logos, ...clones].map((l) => l.x + l.w))
  return { logos, clones, base, period, width: base + right }
}
const LAYOUTS = { desktop: layout('desktop'), wide: layout('wide') }

/** One logo; a clone carries no node id and no accessible name. */
function LogoImg({ l, base, clone = false }: { l: Logo; base: number; clone?: boolean }) {
  return (
    <img
      data-node-id={clone ? undefined : l.id}
      src={l.src}
      alt={clone ? '' : l.alt}
      aria-hidden={clone || undefined}
      draggable={false}
      className={`absolute max-w-none ${l.hardLight ? 'mix-blend-hard-light' : ''}`}
      style={{ left: l.x + base, top: l.y, width: l.w, height: l.h }}
    />
  )
}

export default function Logos() {
  const surface = useCanvasSurface()
  const { logos, clones, base, period, width } = LAYOUTS[surface]
  const track = {
    left: -base,
    width,
    '--marquee-shift': `${-period}px`,
    '--marquee-duration': `${period / SPEED}s`,
  } as CSSProperties
  return (
    <div className="group relative size-full" data-node-id={STRIPS[surface].id}>
      {/* The moving track is its own stacking context, so the hard-light marks
          blend against its backdrop: keep that white, like the page under it. */}
      <div className="marquee absolute top-0 h-full bg-white group-hover:[animation-play-state:paused]" style={track}>
        {logos.map((l) => <LogoImg key={l.id} l={l} base={base} />)}
        {clones.map((l) => <LogoImg key={`clone-${l.x}`} l={l} base={base} clone />)}
      </div>
    </div>
  )
}
