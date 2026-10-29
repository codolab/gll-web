import { useLayoutEffect, useRef, useState } from 'react'

/**
 * talent on mobile (MOBILE_SPEC.md 4). The desktop rest frame of group 94:264,
 * static: the same coordinates in one fixed box, scaled to the content width.
 * The numbers are decoration here, not tabs: states 2-4 have no content (G-06).
 */

// The group is 653.5 wide, but the loop's round cap reaches x 721.6 and circle 3
// ends at y 738.8: the box holds everything that paints, so the figure centres.
const FIG = { w: 722, h: 739 }

type Shape = { x: number; y: number; d: number; color: string; n: string; nx: number; ny: number; nw: number }

// Coordinates relative to 94:264, each digit relative to its circle (desktop Talent.tsx).
const CIRCLES: Shape[] = [
  { x: 281, y: 0, d: 158.806, color: 'bg-green', n: '1', nx: 66, ny: 55, nw: 27 },
  { x: 292, y: 580, d: 158.806, color: 'bg-pink', n: '3', nx: 61, ny: 55, nw: 37 },
  { x: 0, y: 296, d: 143.682, color: 'bg-navy', n: '4', nx: 53, ny: 48, nw: 38 },
]
const PILL = { x: 35209 / 64, y: 21900 / 64 }
const LOOP = { x: PILL.x - 67.533, y: PILL.y - 67.533, w: 239, h: 386 }
const PHOTO = { x: 108.398, y: 103.4, w: 504.147, h: 529.354 }

const digit = 'absolute h-12 whitespace-nowrap text-[56px] font-semibold leading-[48px] tracking-[-2px] text-white'

export default function MobileTalent() {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  // Measured before the first paint, then on every resize; the frame's aspect-ratio
  // reserves the height, so the scale never moves anything around it.
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / FIG.w)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section id="talent" data-section="talent" className="bg-white px-5 pt-16">
      <div className="mx-auto max-w-[640px]">
        <h2 className="m-0 text-balance text-center text-[32px] font-semibold leading-[38px] tracking-[-0.6px] text-ink">
          A world of Lithuanian talent
        </h2>

        <div ref={frame} data-talent="figure" className="relative mx-auto mt-12 w-full max-w-[480px]" style={{ aspectRatio: `${FIG.w} / ${FIG.h}` }}>
          <div
            data-talent="box"
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: FIG.w, height: FIG.h, transform: `scale(${scale})` }}
          >
            <img
              src="/assets/mobile/talent/vilnius-portrait.webp"
              alt="GLL community members gathered for a group portrait in Vilnius"
              draggable={false}
              className="absolute max-w-none"
              style={{ left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, height: PHOTO.h }}
            />
            <div aria-hidden="true">
              {CIRCLES.map((c) => (
                <div key={c.n} className={`absolute rounded-full ${c.color}`} style={{ left: c.x, top: c.y, width: c.d, height: c.d }}>
                  <span className={digit} style={{ left: c.nx, top: c.ny, width: c.nw }}>
                    {c.n}
                  </span>
                </div>
              ))}
              <img
                src="/assets/mobile/talent/pill.svg"
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{ left: LOOP.x, top: LOOP.y, width: LOOP.w, height: LOOP.h }}
              />
              <span className={digit} style={{ left: 636, top: 325, width: 35 }}>
                2
              </span>
            </div>
          </div>
        </div>

        {/* Two lines at every width, as the phone width sets it; one line at 640 trails off.
            The figure stops at 480 on tablets, and the tagline keeps to its left edge. */}
        <div className="mx-auto max-w-[480px]">
          <p className="m-0 mt-8 max-w-[260px] text-balance text-[22px] font-semibold leading-[28px] tracking-[-0.44px] text-ink">
            One community. Endless possibilities.
          </p>
        </div>
      </div>
    </section>
  )
}
