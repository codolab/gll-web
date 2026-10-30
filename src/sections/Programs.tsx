import type { CSSProperties, ReactNode } from 'react'
import { useCanvasSurface, type CanvasSurface } from '../surface'

/** programs - Figma 94:156 (desktop) and 173:386 (wide). Boxes are relative to the parent node. */
const box = (left: number, top: number, width: number, height: number): CSSProperties => ({
  position: 'absolute',
  left,
  top,
  width,
  height,
})

type Box = [number, number, number, number]
type Placed = { id: string; b: Box }

/**
 * Both frames draw the same cards at the same offsets inside the card group; only
 * the heading and group placement differ. Wide adds a group (173:387) around them
 * and sits 0.9px higher in its band, so its boxes come from the wide JSON as is.
 */
type Geo = {
  root: string
  outer?: Placed
  heading: Placed
  grid: Placed
  /** block, container, image, scrim, copy frame, title, button, button label */
  photo: [string, string, string, string, string, string, string, string]
  /** card, then its texts; card 02 has its auto-layout frame second */
  cards: [[string, string, string, string], [string, string, string, string, string], [string, string, string, string]]
}

const GEO: Record<CanvasSurface, Geo> = {
  desktop: {
    root: '94:156',
    heading: { id: '94:157', b: [218, 114, 1004, 144] },
    grid: { id: '94:158', b: [84, 330, 1272, 1017] },
    photo: ['94:159', '94:160', '94:161', '94:162', '94:163', '94:164', '94:165', '94:166'],
    cards: [
      ['94:167', '94:168', '94:169', '94:170'],
      ['94:171', '94:172', '94:173', '94:174', '94:175'],
      ['94:176', '94:177', '94:178', '94:179'],
    ],
  },
  wide: {
    root: '173:386',
    outer: { id: '173:387', b: [184, 113.10009765625, 1272, 1233] },
    heading: { id: '173:388', b: [134, 0, 1004, 144] },
    grid: { id: '173:389', b: [0, 216, 1272, 1017] },
    photo: ['173:394', '173:395', '173:396', '173:397', '173:398', '173:399', '173:400', '173:401'],
    cards: [
      ['173:390', '173:391', '173:392', '173:393'],
      ['173:402', '173:403', '173:404', '173:405', '173:406'],
      ['173:407', '173:408', '173:409', '173:410'],
    ],
  },
}

// A window wider than the canvas reaches past it by --bleed (App.tsx); the band fill follows.
const bleed: CSSProperties = { left: 'calc(-1 * var(--bleed, 0px))', right: 'calc(-1 * var(--bleed, 0px))' }

// Card text styles, straight from the node JSON (Inter 600 14/20, 600 28/34, 400 17/25).
const num = 'm-0 text-[14px] font-semibold leading-[20px] text-white'
const title = 'm-0 text-[28px] font-semibold leading-[34px] text-white'
// Chrome rounds Inter's ascent/descent at 17px and sets the baseline 1px above Figma's; the
// padding drops the glyphs back onto it without moving the node box.
const body = 'm-0 whitespace-pre-wrap pt-[1px] text-[17px] font-normal leading-[25px] text-white'

type CardText = { id: string; top: number; height: number; className: string; children: ReactNode }

// M-08: a hovered card lifts 6px. Under reduced motion no rule applies, so nothing moves.
const card =
  'relative size-full overflow-hidden rounded-[20px] bg-navy motion-safe:transition-transform motion-safe:duration-250 motion-safe:ease-out motion-safe:group-hover:-translate-y-[6px]'

/** The card's box. It stays put and takes the hover, so a lifted card never slides out from under the pointer. */
function Lift({ b, children }: { b: Box; children: ReactNode }) {
  return (
    <div className="group" style={box(...b)}>
      {children}
    </div>
  )
}

function Card(props: {
  id: string
  b: Box
  label: string
  texts: CardText[]
  textWidth: number
}) {
  return (
    <Lift b={props.b}>
      <article data-node-id={props.id} aria-label={props.label} className={card}>
        {props.texts.map((t) => (
          <p key={t.id} data-node-id={t.id} className={t.className} style={box(28, t.top, props.textWidth, t.height)}>
            {t.children}
          </p>
        ))}
      </article>
    </Lift>
  )
}

export default function Programs() {
  const g = GEO[useCanvasSurface()]
  const [block, container, img, scrim, cta, ctaTitle, button, buttonLabel] = g.photo
  const [c1, c2, c3] = g.cards
  const content = (
    <>
      <h2
        data-node-id={g.heading.id}
        className="m-0 whitespace-pre-wrap text-center text-[56px] font-semibold leading-[72px] text-white"
        style={box(...g.heading.b)}
      >
        {'Sustained, proven, and notable ways\nto get involved'}
      </h2>

      <div data-node-id={g.grid.id} style={box(...g.grid.b)}>
        {/* BACKGROUND_BLUR 160 here only blurs the flat section fill behind an opaque photo, so it paints nothing. */}
        <div data-node-id={block} className="overflow-hidden rounded-[20.01px]" style={box(368, 0, 576, 672)}>
          <div data-node-id={container} className="overflow-hidden" style={box(0, 0, 576, 672)}>
            <img
              data-node-id={img}
              src="/assets/programs/photo.webp"
              alt="GLL event: a speaker shaking hands with a guest"
              className="block object-cover"
              style={box(0, 0, 576, 672)}
            />
            <div data-node-id={scrim} className="bg-ink opacity-[0.49]" style={box(-17, 0, 610, 707)} />
          </div>
          <div data-node-id={cta} style={box(149, 242, 278, 188)}>
            {/* CSS also applies the tracking after the last glyph, which Figma does not; the padding re-centres. */}
            <p
              data-node-id={ctaTitle}
              className="m-0 pr-[2.88px] text-center text-[64px] font-semibold leading-[76px] tracking-[-2.88px] text-white"
              style={box(0, 0, 278, 76)}
            >
              Programs
            </p>
            <a
              href="#"
              data-node-id={button}
              className="block rounded-[999px] bg-white no-underline"
              style={box(28, 132, 222, 56)}
            >
              <span
                data-node-id={buttonLabel}
                className="block whitespace-nowrap text-center text-[16px] font-semibold leading-[24px] tracking-[-0.128px] text-ink"
                style={box(32, 16, 158, 24)}
              >
                SEE ALL PROGRAMS
              </span>
            </a>
          </div>
        </div>

        <Card
          id={c1[0]}
          b={[0, 0, 352, 296]}
          label="Business Advisors"
          textWidth={296}
          texts={[
            { id: c1[1], top: 28, height: 20, className: num, children: '01.' },
            { id: c1[2], top: 66, height: 34, className: title, children: 'Business Advisors' },
            {
              id: c1[3],
              top: 118,
              height: 150,
              className: body,
              children:
                'The program brings together the most successful and experienced diaspora professionals to advise growing Lithuanian companies, emerging innovators and entrepreneurs.',
            },
          ]}
        />

        {/* Card 02 wraps its text in an extra auto-layout frame at the padding origin. */}
        <Lift b={[960, 317, 312, 355]}>
          <article data-node-id={c2[0]} aria-label="Global Lithuanian Awards" className={card}>
            <div data-node-id={c2[1]} style={box(28, 28, 256, 299)}>
              <p data-node-id={c2[2]} className={num} style={box(0, 0, 256, 20)}>
                02.
              </p>
              <p data-node-id={c2[3]} className={title} style={box(0, 38, 256, 68)}>
                Global Lithuanian Awards
              </p>
              <p data-node-id={c2[4]} className={body} style={box(0, 124, 256, 175)}>
                {
                  'December | Vilnius\n\nGlobal Lithuanian Awards | GLA acknowledges and rewards the remarkable achievements of Lithuanian diaspora professionals.'
                }
              </p>
            </div>
          </article>
        </Lift>

        <Card
          id={c3[0]}
          b={[368, 696, 418, 321]}
          label="GLL Forum ’26"
          textWidth={362}
          texts={[
            { id: c3[1], top: 28, height: 20, className: num, children: '03.' },
            { id: c3[2], top: 66, height: 34, className: title, children: 'GLL Forum ’26' },
            {
              id: c3[3],
              top: 118,
              height: 175,
              className: body,
              children:
                'July | Vilnius\n\nEntrepreneurs, business executives, public policy experts, human rights activists, and alike meet for a sunny summer afternoon in Vilnius to exchange ideas, strengthen connections and build joined efforts.',
            },
          ]}
        />
      </div>
    </>
  )
  return (
    <div className="relative size-full" data-node-id={g.root}>
      <div className="absolute inset-y-0 bg-ink" style={bleed} />
      {/* The frame clips its content (clipsContent); the band fill above stays outside that clip. */}
      <div className="absolute inset-0 overflow-hidden">
        {g.outer ? (
          <div data-node-id={g.outer.id} style={box(...g.outer.b)}>
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
