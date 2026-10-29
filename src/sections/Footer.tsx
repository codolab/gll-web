import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useCanvasSurface, type CanvasSurface } from '../surface'

/**
 * footer - Figma 94:307 (desktop) and group 173:524 around frame 173:557 (wide).
 * Every box is the node's canvas box minus its parent's origin. The wide
 * footer is the desktop one widened: the card, brand row and nav stretch to
 * 1512 and the columns spread; everything else keeps its desktop offset.
 */

const A = '/assets/footer'

type Geo = {
  root: string
  /** Wide only: the frame inside the 173:524 group, the same box. */
  frame?: string
  /** Frame width, and the inner width of the card, brand row and nav. */
  width: number
  inner: number
  photo: string
  /** Column x on the canvas (Figma), and each column's width. */
  cols: number[]
  colW: number
}

const GEO: Record<CanvasSurface, Geo> = {
  desktop: { root: '94:307', width: 1440, inner: 1312, photo: 'newsletter-photo.webp', cols: [64, 334.4, 604.8, 875.2, 1145.6], colW: 230.4 },
  wide: { root: '173:524', frame: '173:557', width: 1640, inner: 1512, photo: 'wide-newsletter-photo.webp', cols: [64, 374.4, 684.8, 995.2, 1305.6], colW: 270.4 },
}

/** Frame 173:557 is a copy of 94:307 and every node kept its order: 94:n is 173:(n + 250) (checked for all 62). */
const nodeId = (surface: CanvasSurface) => (desktop: string) =>
  surface === 'wide' ? `173:${Number(desktop.slice(3)) + 250}` : desktop

/** The band's fill and its full-width rule reach past the canvas edges into a wider window (App's --bleed). */
const BLEED: CSSProperties = { left: 'calc(-1 * var(--bleed, 0px))', right: 'calc(-1 * var(--bleed, 0px))' }

const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: x, top: y, width: w, height: h })

type TextProps = {
  id: string
  as?: ElementType
  at: [number, number, number, number]
  size: number
  weight: number
  lh: number
  ls?: number
  href?: string
  /** Figma auto-width text: its box is hug-tight, so never let it wrap. */
  nowrap?: boolean
  className?: string
  children: ReactNode
}

function Text({ id, as: Tag = 'p', at, size, weight, lh, ls = 0, href, nowrap, className = '', children }: TextProps) {
  return (
    <Tag
      href={href}
      data-node-id={id}
      className={`absolute m-0 ${nowrap ? 'whitespace-pre' : 'whitespace-pre-line'} ${className}`}
      style={{ ...box(...at), fontSize: size, fontWeight: weight, lineHeight: `${lh}px`, letterSpacing: ls }}
    >
      {children}
    </Tag>
  )
}

type Column = { id: string; heading: [string, string, number]; links: [string, string, number][] }

// Each label's Figma width; rows sit at 0, 46, 88 and 130 inside a column.
const COLUMNS: Column[] = [
  { id: '94:346', heading: ['94:347', 'About', 60], links: [['94:348', 'Team', 44], ['94:349', 'Strategy & Reports', 153], ['94:350', 'Contacts', 73]] },
  { id: '94:351', heading: ['94:352', 'Network', 83], links: [['94:353', 'Patrons & Members', 158], ['94:354', 'Professional Clubs', 149], ['94:355', 'Partners', 69]] },
  { id: '94:356', heading: ['94:357', 'Programs', 94], links: [] },
  { id: '94:358', heading: ['94:359', 'Events', 66], links: [] },
  { id: '94:360', heading: ['94:361', 'Join us', 69], links: [['94:362', 'Partner with us', 123], ['94:363', 'Become a member', 151], ['94:364', 'Support us!', 93]] },
]

export default function Footer() {
  const surface = useCanvasSurface()
  const g = GEO[surface]
  const id = nodeId(surface)
  return (
    <div role="contentinfo" className="relative size-full text-white" data-node-id={g.root}>
      <div aria-hidden className="absolute inset-y-0 bg-ink" style={BLEED} />
      <div className="absolute inset-0" data-node-id={g.frame}>
        {/* Newsletter card; children are relative to 94:308 at (64, 64). */}
        <div data-node-id={id('94:308')} className="absolute overflow-hidden rounded-[28px]" style={box(64, 64, g.inner, 520)}>
          <img data-node-id={id('94:309')} src={`${A}/${g.photo}`} alt="" className="absolute" style={box(0, 0, g.inner, 520)} />
          {/* Second fill of 94:309: ink at 61% over the photo. */}
          <div className="absolute inset-0 bg-ink/61" />

          <Text id={id('94:312')} as="h2" at={[56, 130.5, 600, 65]} size={48} weight={600} lh={65} ls={-1.3}>
            Ways to engage
          </Text>
          <Text id={id('94:313')} at={[56, 219.5, 570, 90]} size={22} weight={400} lh={30}>
            Subscribe to our newsletter today and be the first to know about our events as well as to receive our monthly digest.
          </Text>
          <a
            href="#"
            data-node-id={id('94:315')}
            className="absolute rounded-[28px] bg-[#ff466d] text-white"
            style={box(56, 333.5, 164, 56)}
          >
            <Text id={id('94:316')} as="span" at={[12, 18, 140, 20]} size={15} weight={600} lh={20} className="text-center">
              EVENTS
            </Text>
          </a>
          <a
            href="#"
            data-node-id={id('94:317')}
            className="absolute rounded-[28px] border border-white text-white"
            style={box(236, 333.5, 186, 56)}
          >
            {/* The 1px inside stroke takes border space, so the label sits 1px nearer the corner. */}
            <Text id={id('94:318')} as="span" at={[11, 17, 162, 20]} size={15} weight={600} lh={20} className="text-center">
              PROGRAMS
            </Text>
          </a>

          <Text id={id('94:320')} as="h3" at={[728, 179, 528, 82]} size={30} weight={600} lh={41}>
            {'Subscribe to our\nnewsletter'}
          </Text>
          <form
            data-node-id={id('94:321')}
            className="absolute overflow-hidden rounded-[30px] bg-white"
            style={box(728, 281, 528, 60)}
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              data-node-id={id('94:322')}
              type="email"
              name="email"
              aria-label="Email"
              placeholder="Enter your email"
              className="absolute m-0 border-0 bg-transparent pl-6 text-ink outline-offset-[-3px] placeholder:text-ink placeholder:opacity-100"
              style={{ ...box(0, 0, 344, 60), fontSize: 17, fontWeight: 400, lineHeight: '23px' }}
            />
            <button
              type="button"
              data-node-id={id('94:324')}
              className="absolute m-0 cursor-pointer border-0 bg-[#ff466d] p-0 text-white"
              style={box(344, 0, 184, 60)}
            >
              <Text id={id('94:325')} as="span" at={[12, 20, 160, 20]} size={15} weight={600} lh={20} className="text-center">
                SUBSCRIBE
              </Text>
            </button>
          </form>
        </div>

        {/* Navigation block; children are relative to 94:326 at (0, 600). */}
        <div data-node-id={id('94:326')} className="absolute bg-ink" style={box(0, 600, g.width, 471)}>
          <div data-node-id={id('94:327')} className="absolute border-b border-white/14" style={box(64, 40, g.inner, 104)}>
            <a href="#" aria-label="Global Lithuanian Leaders" data-node-id={id('94:329')} className="absolute" style={box(0, 0.69, 75, 74.62)}>
              {/* Figma pads the SVG export to whole pixels (76x75) from the group origin, so it keeps its natural size. */}
              <img src={`${A}/logo.svg`} alt="" className="absolute left-0 top-0 max-w-none" width={76} height={75} />
            </a>
            <a href="#" aria-label="Facebook" data-node-id={id('94:339')} className="absolute" style={box(g.inner - 52, 28, 20, 20)}>
              <img src={`${A}/facebook.svg`} alt="" className="size-full" />
            </a>
            <a href="#" aria-label="LinkedIn" data-node-id={id('94:341')} className="absolute" style={box(g.inner - 20, 28, 20, 20)}>
              <img src={`${A}/linkedin.svg`} alt="" className="size-full" />
            </a>
          </div>

          <nav data-node-id={id('94:345')} aria-label="Footer" className="absolute" style={box(64, 184, g.inner, 158)}>
            {COLUMNS.map((c, i) => (
              <div key={c.id} data-node-id={id(c.id)} className="absolute top-0" style={box(g.cols[i] - 64, 0, g.colW, c.links.length ? 158 : 32)}>
                <Text id={id(c.heading[0])} as="a" href="#" at={[0, 0, c.heading[2], 32]} size={20} weight={600} lh={32} nowrap>
                  {c.heading[1]}
                </Text>
                {c.links.map(([link, label, w], j) => (
                  <Text key={link} id={id(link)} as="a" href="#" at={[0, 46 + 42 * j, w, 28]} size={17} weight={400} lh={28} nowrap>
                    {label}
                  </Text>
                ))}
              </div>
            ))}
          </nav>

          <div data-node-id={id('94:365')} className="absolute" style={box(0, 390, g.width, 81)}>
            {/* Its 1px top stroke, drawn as a fill so it can run to the window edges. */}
            <div aria-hidden className="absolute top-0 h-px bg-white/14" style={BLEED} />
            <Text id={id('94:368')} at={[64, 31, 341, 20]} size={13} weight={400} lh={20} nowrap>
              Global Lithuanian Leaders © {new Date().getFullYear()} | All Rights Reserved
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
