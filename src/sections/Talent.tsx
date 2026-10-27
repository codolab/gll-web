/** talent - Figma 94:935. Heading, blob photo with four numbered shapes, tagline. */
type Circle = { id: string; x: number; y: number; d: number; color: string }
type Num = { id: string; text: string; x: number; y: number; w: number }

// Plain ELLIPSE nodes, so CSS circles. Coordinates are relative to 94:264.
const CIRCLES: Circle[] = [
  { id: '94:266', x: 281, y: 0, d: 158.806, color: '#66b800' },
  { id: '94:267', x: 0, y: 296, d: 143.682, color: '#05325b' },
  { id: '94:268', x: 292, y: 580, d: 158.806, color: '#ff4c77' },
]

const NUMBERS: Num[] = [
  { id: '94:270', text: '1', x: 347, y: 55, w: 27 },
  { id: '94:271', text: '2', x: 636, y: 325, w: 35 },
  { id: '94:272', text: '3', x: 353, y: 635, w: 37 },
  { id: '94:273', text: '4', x: 53, y: 344, w: 38 },
]

export default function Talent() {
  return (
    <div className="relative size-full" data-node-id="94:935">
      <h2
        data-node-id="94:261"
        className="absolute left-0 top-0 m-0 h-[72px] w-[744px] whitespace-nowrap text-center text-[56px] font-semibold leading-[72px] tracking-normal text-ink"
      >
        A world of Lithuanian talent
      </h2>

      <div data-node-id="94:262" className="absolute" style={{ left: 14, top: 128, width: 978, height: 739 }}>
        <div data-node-id="94:263" className="absolute left-0 top-0" style={{ width: 717, height: 739 }}>
          <div data-node-id="94:264" className="absolute left-0 top-0" style={{ width: 653.499, height: 738.575 }}>
            <img
              data-node-id="94:265"
              src="/assets/talent/vilnius-portrait.webp"
              alt="GLL community members gathered for a group portrait in Vilnius"
              draggable={false}
              className="absolute max-w-none"
              style={{ left: 108.398, top: 103.4, width: 504.147, height: 529.354 }}
            />
            {CIRCLES.map((c) => (
              <div
                key={c.id}
                data-node-id={c.id}
                className="absolute rounded-full"
                style={{ left: c.x, top: c.y, width: c.d, height: c.d, background: c.color }}
              />
            ))}
            {/* A round-capped 135px stroke: the SVG spans the stroke, the box is the path. */}
            <div data-node-id="94:269" className="absolute" style={{ left: 550.148, top: 342.189, width: 103.35, height: 250.813 }}>
              <img
                src="/assets/talent/pill.svg"
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{ left: -67.533, top: -67.533, width: 239, height: 386 }}
              />
            </div>
            {NUMBERS.map((n) => (
              <span
                key={n.id}
                data-node-id={n.id}
                className="absolute h-12 whitespace-nowrap text-[56px] font-semibold leading-[48px] tracking-[-2px] text-white"
                style={{ left: n.x, top: n.y, width: n.w }}
              >
                {n.text}
              </span>
            ))}
          </div>
        </div>
        {/* pt-px: Chrome floors the negative half-leading (baseline 29) where Figma
            rounds it (30); Figma's lines measure 1px lower on all three. */}
        <p
          data-node-id="94:274"
          className="absolute m-0 pt-px text-[32px] font-semibold leading-[36px] tracking-[-0.64px] text-ink"
          style={{ left: 724, top: 514.074, width: 254, height: 108 }}
        >
          One community. Endless possibilities.
        </p>
      </div>
    </div>
  )
}
