import type { CSSProperties, ReactNode } from 'react'

/** programs - Figma 94:156 (Programs, get involved). Boxes are relative to the parent node. */
const box = (left: number, top: number, width: number, height: number): CSSProperties => ({
  position: 'absolute',
  left,
  top,
  width,
  height,
})

// Card text styles, straight from the node JSON (Inter 600 14/20, 600 28/34, 400 17/25).
const num = 'm-0 text-[14px] font-semibold leading-[20px] text-white'
const title = 'm-0 text-[28px] font-semibold leading-[34px] text-white'
// Chrome rounds Inter's ascent/descent at 17px and sets the baseline 1px above Figma's; the
// padding drops the glyphs back onto it without moving the node box.
const body = 'm-0 whitespace-pre-wrap pt-[1px] text-[17px] font-normal leading-[25px] text-white'

type CardText = { id: string; top: number; height: number; className: string; children: ReactNode }

function Card(props: {
  id: string
  b: [number, number, number, number]
  label: string
  texts: CardText[]
  textWidth: number
}) {
  const [x, y, w, h] = props.b
  return (
    <article data-node-id={props.id} aria-label={props.label} className="overflow-hidden rounded-[20px] bg-navy" style={box(x, y, w, h)}>
      {props.texts.map((t) => (
        <p key={t.id} data-node-id={t.id} className={t.className} style={box(28, t.top, props.textWidth, t.height)}>
          {t.children}
        </p>
      ))}
    </article>
  )
}

export default function Programs() {
  return (
    <div className="relative size-full overflow-hidden bg-ink" data-node-id="94:156">
      <h2
        data-node-id="94:157"
        className="m-0 whitespace-pre-wrap text-center text-[56px] font-semibold leading-[72px] text-white"
        style={box(218, 114, 1004, 144)}
      >
        {'Sustained, proven, and notable ways\nto get involved'}
      </h2>

      <div data-node-id="94:158" style={box(84, 330, 1272, 1017)}>
        {/* BACKGROUND_BLUR 160 here only blurs the flat section fill behind an opaque photo, so it paints nothing. */}
        <div data-node-id="94:159" className="overflow-hidden rounded-[20.01px]" style={box(368, 0, 576, 672)}>
          <div data-node-id="94:160" className="overflow-hidden" style={box(0, 0, 576, 672)}>
            <img
              data-node-id="94:161"
              src="/assets/programs/photo.webp"
              alt="GLL event: a speaker shaking hands with a guest"
              className="block object-cover"
              style={box(0, 0, 576, 672)}
            />
            <div data-node-id="94:162" className="bg-ink opacity-[0.49]" style={box(-17, 0, 610, 707)} />
          </div>
          <div data-node-id="94:163" style={box(149, 242, 278, 188)}>
            {/* CSS also applies the tracking after the last glyph, which Figma does not; the padding re-centres. */}
            <p
              data-node-id="94:164"
              className="m-0 pr-[2.88px] text-center text-[64px] font-semibold leading-[76px] tracking-[-2.88px] text-white"
              style={box(0, 0, 278, 76)}
            >
              Programs
            </p>
            <a
              href="#"
              data-node-id="94:165"
              className="block rounded-[999px] bg-white no-underline"
              style={box(28, 132, 222, 56)}
            >
              <span
                data-node-id="94:166"
                className="block whitespace-nowrap text-center text-[16px] font-semibold leading-[24px] tracking-[-0.128px] text-ink"
                style={box(32, 16, 158, 24)}
              >
                SEE ALL PROGRAMS
              </span>
            </a>
          </div>
        </div>

        <Card
          id="94:167"
          b={[0, 0, 352, 296]}
          label="Business Advisors"
          textWidth={296}
          texts={[
            { id: '94:168', top: 28, height: 20, className: num, children: '01.' },
            { id: '94:169', top: 66, height: 34, className: title, children: 'Business Advisors' },
            {
              id: '94:170',
              top: 118,
              height: 150,
              className: body,
              children:
                'The program brings together the most successful and experienced diaspora professionals to advise growing Lithuanian companies, emerging innovators and entrepreneurs.',
            },
          ]}
        />

        {/* Card 02 wraps its text in an extra auto-layout frame (94:172) at the padding origin. */}
        <article data-node-id="94:171" aria-label="Global Lithuanian Awards" className="overflow-hidden rounded-[20px] bg-navy" style={box(960, 317, 312, 355)}>
          <div data-node-id="94:172" style={box(28, 28, 256, 299)}>
            <p data-node-id="94:173" className={num} style={box(0, 0, 256, 20)}>
              02.
            </p>
            <p data-node-id="94:174" className={title} style={box(0, 38, 256, 68)}>
              Global Lithuanian Awards
            </p>
            <p data-node-id="94:175" className={body} style={box(0, 124, 256, 175)}>
              {
                'December | Vilnius\n\nGlobal Lithuanian Awards | GLA acknowledges and rewards the remarkable achievements of Lithuanian diaspora professionals.'
              }
            </p>
          </div>
        </article>

        <Card
          id="94:176"
          b={[368, 696, 418, 321]}
          label="GLL Forum ’26"
          textWidth={362}
          texts={[
            { id: '94:177', top: 28, height: 20, className: num, children: '03.' },
            { id: '94:178', top: 66, height: 34, className: title, children: 'GLL Forum ’26' },
            {
              id: '94:179',
              top: 118,
              height: 175,
              className: body,
              children:
                'July | Vilnius\n\nEntrepreneurs, business executives, public policy experts, human rights activists, and alike meet for a sunny summer afternoon in Vilnius to exchange ideas, strengthen connections and build joined efforts.',
            },
          ]}
        />
      </div>
    </div>
  )
}
