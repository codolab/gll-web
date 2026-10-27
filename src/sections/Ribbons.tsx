/**
 * ribbons - Figma 94:139. Two clipped type rows ("Connect globally",
 * "Grow together"), each phrase light + semibold, split by coloured dots.
 * Static for now; the rows may become marquees later.
 */

const ROW_Y = 37.1758 // dot top inside a 112px row (2280.1016 - 2242.9258)

type Dot = { node: string; group: string; x: number; fill: string }
type Phrase = { node: string; x: number; w: number; light: string; bold: string }

function RibbonDot({ node, group, x, fill }: Dot) {
  // Each vector is a plain circle, but its SVG export draws it at 38px. A
  // clip-path is not pixel-snapped (border-radius is: 37.649 became 37 x 38),
  // so an oversized fill clipped to the exact ellipse keeps the true rim.
  return (
    <div data-node-id={group} className="absolute" style={{ left: x, top: ROW_Y, width: 37.649, height: 37.648 }}>
      <div data-node-id={node} className="absolute inset-0">
        <div className={`absolute -inset-[2px] ${fill} [clip-path:ellipse(18.8245px_18.824px_at_50%_50%)]`} />
      </div>
    </div>
  )
}

function RibbonPhrase({ node, x, w, light, bold }: Phrase) {
  return (
    <p
      data-node-id={node}
      className="absolute top-0 m-0 h-[112px] whitespace-pre text-[88px] font-light leading-[112px] tracking-[-2px] text-ink"
      style={{ left: x, width: w }}
    >
      {light}
      <span className="font-semibold">{bold}</span>
    </p>
  )
}

export default function Ribbons() {
  return (
    <div className="relative size-full" data-node-id="94:139">
      <div data-node-id="94:140" className="absolute left-0 top-0 h-[112px] overflow-hidden" style={{ width: 1529.298 }}>
        <RibbonDot group="94:141" node="94:142" x={0} fill="bg-green" />
        <RibbonPhrase node="94:143" x={69.649} w={679} light="Connect " bold="globally" />
        <RibbonDot group="94:144" node="94:145" x={780.649} fill="bg-amber" />
        <RibbonPhrase node="94:146" x={850.298} w={679} light="Connect " bold="globally" />
      </div>
      <div data-node-id="94:147" className="absolute left-0 top-[128px] h-[112px] w-[2209px] overflow-hidden">
        <RibbonPhrase node="94:148" x={0} w={587} light="Grow " bold="together" />
        <RibbonDot group="94:149" node="94:150" x={619} fill="bg-pink" />
        <RibbonPhrase node="94:151" x={688.649} w={587} light="Grow " bold="together" />
        <RibbonDot group="94:152" node="94:153" x={1307.649} fill="bg-green" />
        <RibbonPhrase node="94:154" x={1377.298} w={587} light="Grow " bold="together" />
      </div>
    </div>
  )
}
