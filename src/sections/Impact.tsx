/**
 * impact - Figma 94:180. Periwinkle band: "Global [photo pill] impact"
 * headline on the left, three stats split by hairlines on the right.
 * The frame overhangs the canvas by 2px each side, so x here is box.x + 2.
 */

// hug: the caption is an auto-width Figma text, so it must never wrap.
// Captions get 1px top padding: Chromium puts a 24/30 baseline at
// round(ascent) + floor(half-leading) = 23px, Figma rounds 23.72 to 24, and
// Chromium snaps text to whole CSS px, so 1px is the step that closes it.
type Stat = { group: string; num: string; numNode: string; numW: number; cap: string; capNode: string; capW: number; hug: boolean; y: number; h: number }

const STATS: Stat[] = [
  { group: '94:188', numNode: '94:189', num: '10,000+', numW: 248, capNode: '94:190', cap: 'Lithuanian professionals', capW: 270, hug: true, y: 0, h: 114 },
  { group: '94:192', numNode: '94:193', num: '60+', numW: 124, capNode: '94:194', cap: 'Countries represented', capW: 250, hug: true, y: 163, h: 114 },
  { group: '94:196', numNode: '94:197', num: '10+', numW: 113, capNode: '94:198', cap: 'programs for engagement to contribute to Lithuania', capW: 464, hug: false, y: 326, h: 144 },
]

// Hairlines: ink at 88% opacity, 1px, between the stat groups.
const RULES = [
  { node: '94:191', y: 138 },
  { node: '94:195', y: 301 },
]

const headline = 'm-0 absolute text-[96px] font-semibold leading-[108px] tracking-[-3px] whitespace-pre text-ink'

export default function Impact() {
  return (
    <div className="relative size-full bg-periwinkle" data-node-id="94:180">
      <div data-node-id="94:181" className="absolute left-[64px] top-[88px] w-[1312px]" style={{ height: 485.5625 }}>
        <div data-node-id="94:182" className="absolute left-0 h-[236px] w-[752px]" style={{ top: 124.781 }}>
          <h2 className="m-0 font-[inherit]">
            <span data-node-id="94:183" className={`${headline} left-0 top-0 block h-[108px] w-[282px]`}>
              Global
            </span>
            <span data-node-id="94:184" className="absolute left-0 top-[120px] block h-[116px] w-[536px] overflow-hidden">
              <img
                data-node-id="94:185"
                src="/assets/impact/pill.webp"
                alt=""
                className="absolute left-0 top-0 h-[116px] w-[208px]"
              />
              <span data-node-id="94:186" className={`${headline} left-[232px] top-[4px] block h-[108px] w-[304px]`}>
                impact
              </span>
            </span>
          </h2>
        </div>
        <div data-node-id="94:187" className="absolute h-[470px] w-[464px]" style={{ left: 848, top: 7.781 }}>
          {STATS.map((s) => (
            <div key={s.group} data-node-id={s.group} className="absolute left-0 w-[464px]" style={{ top: s.y, height: s.h }}>
              <p
                data-node-id={s.numNode}
                className="absolute left-0 top-0 m-0 h-[76px] whitespace-pre text-[64px] font-semibold leading-[76px] tracking-[-2px] text-ink"
                style={{ width: s.numW }}
              >
                {s.num}
              </p>
              <p
                data-node-id={s.capNode}
                className={`absolute left-0 top-[84px] m-0 pt-px ${s.hug ? 'whitespace-pre' : ''} text-[24px] font-normal leading-[30px] tracking-[-0.2px] text-ink`}
                style={{ width: s.capW, height: s.h - 84 }}
              >
                {s.cap}
              </p>
            </div>
          ))}
          {RULES.map((r) => (
            <div key={r.node} data-node-id={r.node} className="absolute left-0 h-px w-[464px] bg-ink/88" style={{ top: r.y }} />
          ))}
        </div>
      </div>
    </div>
  )
}
