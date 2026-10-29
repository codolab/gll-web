import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useCanvasSurface, type CanvasSurface } from '../surface'

/**
 * community - Figma 94:276 (desktop) and 173:1456 (wide). Every box is the
 * node's canvas box minus its parent's origin. The wide bento is the desktop
 * one re-proportioned (about 1.1524x, fractional type sizes), not shifted.
 */

const A = '/assets/community'

type Box = [number, number, number, number]
/** A text node: box, size, line height, tracking, and the baseline fix below. */
type Txt = { id: string; at: Box; size: number; lh: number; ls?: number; lower?: number }
type Shape = { id: string; at: Box; r?: string }

type Geo = {
  root: string
  headline: Txt; invitation: Txt
  bento: Shape
  partner: Shape; partnerKicker: Txt; partnerTitle: Txt; partnerArrow: Shape
  conversations: Shape & { src: string }
  ellipse: Shape
  member: Shape; number: Txt; numberNote: Txt; chapter: Txt; cta: Shape; ctaLabel: Txt
  further: Txt
  flag: Shape & { src: string }
  support: Shape; supportKicker: Txt; supportTitle: Txt; supportLink: Shape; supportLabel: Txt; supportArrow: Shape
}

const GEO: Record<CanvasSurface, Geo> = {
  desktop: {
    root: '94:276',
    headline: { id: '94:279', at: [64, 88, 816, 186], size: 80, lh: 93, ls: -2 },
    invitation: { id: '94:280', at: [880, 88, 496, 120], size: 32, lh: 40, lower: 1 },
    // Everything below up to `flag` is relative to the bento.
    bento: { id: '94:281', at: [64, 330, 976, 648] },
    partner: { id: '94:282', at: [0, 0, 272, 264], r: '24px 132px 132px 24px' },
    partnerKicker: { id: '94:283', at: [28, 28, 200, 14], size: 12, lh: 14 },
    partnerTitle: { id: '94:284', at: [28, 86, 210, 74], size: 32, lh: 37 },
    partnerArrow: { id: '94:285', at: [28, 204, 32, 32] },
    conversations: { id: '94:287', at: [288, 0, 408, 264], r: '24px', src: 'conversations.webp' },
    ellipse: { id: '94:288', at: [712, 0, 264, 264] },
    member: { id: '94:289', at: [0, 280, 976, 368], r: '24px 184px 184px 24px' },
    number: { id: '94:291', at: [36, 97.5, 420, 107], size: 92, lh: 107, ls: -2 },
    numberNote: { id: '94:292', at: [36, 216.5, 420, 54], size: 23, lh: 27, lower: 1 },
    chapter: { id: '94:295', at: [500, 89, 380, 78], size: 34, lh: 39 },
    cta: { id: '94:296', at: [500, 223, 219, 56] },
    ctaLabel: { id: '94:297', at: [0, 0, 155, 24], size: 16, lh: 24, ls: -0.128 },
    further: { id: '94:298', at: [754, 94.51, 179, 74], size: 32, lh: 37 },
    flag: { id: '94:299', at: [1056, 330, 320, 360], r: '24px 160px 24px 24px', src: 'members-flag.webp' },
    support: { id: '94:300', at: [1056, 706, 320, 272], r: '24px 136px 24px 24px' },
    supportKicker: { id: '94:301', at: [28, 28, 250, 14], size: 12, lh: 14 },
    supportTitle: { id: '94:302', at: [28, 92, 264, 70], size: 30, lh: 35 },
    supportLink: { id: '94:303', at: [28, 212, 264, 32] },
    supportLabel: { id: '94:304', at: [0, 6.5, 160, 19], size: 16, lh: 19 },
    supportArrow: { id: '94:305', at: [232, 0, 32, 32] },
  },
  wide: {
    root: '173:1456',
    headline: { id: '173:1460', at: [64, 88.2998, 816, 186], size: 80, lh: 93, ls: -2 },
    invitation: { id: '173:1461', at: [1004.3901, 88.2998, 571.6097, 120], size: 32, lh: 40, lower: 1 },
    bento: { id: '173:1463', at: [64, 330.2998, 1124.7805, 746.7805] },
    partner: { id: '173:1464', at: [0, 0, 313.4634, 304.2439], r: '27.6585px 152.1219px 152.1219px 27.6585px' },
    partnerKicker: { id: '173:1465', at: [32.2683, 32.2681, 230.4878, 17], size: 13.8293, lh: 16.1341 },
    partnerTitle: { id: '173:1466', at: [32.2683, 99.1831, 242.0122, 86], size: 36.878, lh: 42.6402, lower: 0.5 },
    partnerArrow: { id: '173:1467', at: [32.2683, 235.0977, 36.878, 36.878] },
    conversations: { id: '173:1469', at: [331.9023, 0, 470.1951, 304.2439], r: '27.6585px', src: 'wide-conversations.webp' },
    ellipse: { id: '173:1470', at: [820.5366, 0, 304.2439, 304.2439] },
    member: { id: '173:1471', at: [0, 322.6831, 1124.7805, 424.0976], r: '27.6585px 212.0488px 212.0488px 27.6585px' },
    number: { id: '173:1473', at: [41.4878, 111.6343, 484.0244, 124], size: 106.0244, lh: 123.311, ls: -2.3049 },
    numberNote: { id: '173:1474', at: [41.4878, 249.4634, 484.0244, 63], size: 26.5061, lh: 31.1159 },
    chapter: { id: '173:1477', at: [576.2195, 102.3418, 437.9268, 90], size: 39.1829, lh: 44.9451, lower: 1 },
    cta: { id: '173:1478', at: [576.2195, 256.8784, 252.7561, 64.8781] },
    ctaLabel: { id: '173:1479', at: [0, 0, 179, 28], size: 18.439, lh: 27.6585, ls: -0.1475, lower: 1 },
    further: { id: '173:1480', at: [868.939, 108.9233, 206.2866, 86], size: 36.878, lh: 42.6402, lower: 1 },
    flag: { id: '173:1481', at: [1207.2197, 330.2998, 368.7805, 414.8781], r: '27.6585px 184.3902px 27.6585px 27.6585px', src: 'wide-members-flag.webp' },
    support: { id: '173:1482', at: [1207.2197, 763.6167, 368.7805, 313.4634], r: '27.6585px 156.7317px 27.6585px 27.6585px' },
    supportKicker: { id: '173:1483', at: [32.2681, 32.2681, 288.1097, 17], size: 13.8293, lh: 16.1341 },
    supportTitle: { id: '173:1484', at: [32.2681, 106.2925, 304.2439, 81], size: 34.5732, lh: 40.3354, lower: 1 },
    supportLink: { id: '173:1485', at: [32.2681, 244.3169, 304.2439, 36.878] },
    supportLabel: { id: '173:1486', at: [0, 7.439, 184.3902, 22], size: 18.439, lh: 21.8963, lower: 1 },
    supportArrow: { id: '173:1487', at: [267.3657, 0, 36.878, 36.878] },
  },
}

const box = ([x, y, w, h]: Box): CSSProperties => ({ left: x, top: y, width: w, height: h })
const shape = (s: Shape): CSSProperties => ({ ...box(s.at), borderRadius: s.r })

/** The band's fill reaches past the canvas edges into a wider window (App's --bleed); content stays put. */
const BLEED: CSSProperties = { left: 'calc(-1 * var(--bleed, 0px))', right: 'calc(-1 * var(--bleed, 0px))' }

/** M-13: hovering a "Join us" block nudges its arrow right; each arrow adds its own keyboard-focus trigger. */
const NUDGE = 'motion-safe:transition-transform motion-safe:duration-250 motion-safe:ease-out motion-safe:group-hover:translate-x-[6px]'

type TextProps = { t: Txt; as?: ElementType; weight: number; className?: string; children: ReactNode }

/**
 * `lower`: Blink puts the baseline at round(ascent) + floor(half-leading) and paints
 * each line at a whole px; Figma keeps the exact baseline. Where that leaves the text
 * high (measured), pad it down. 173:1466 takes 0.5 so both of its lines round nearest.
 */
function Text({ t, as: Tag = 'p', weight, className = '', children }: TextProps) {
  return (
    <Tag
      data-node-id={t.id}
      className={`absolute m-0 whitespace-pre-line ${className}`}
      style={{
        ...box(t.at),
        fontSize: t.size, fontWeight: weight, lineHeight: `${t.lh}px`, letterSpacing: t.ls ?? 0,
        paddingTop: t.lower,
      }}
    >
      {children}
    </Tag>
  )
}

export default function Community() {
  const g = GEO[useCanvasSurface()]
  return (
    <div className="relative size-full text-ink" data-node-id={g.root}>
      <div aria-hidden className="absolute inset-y-0 bg-periwinkle" style={BLEED} />
      <Text t={g.headline} as="h2" weight={600}>
        {'Global minds.\nLithuanian roots.'}
      </Text>
      <Text t={g.invitation} weight={400}>
        Meet your people. Share your experience. Help shape Lithuania’s future.
      </Text>

      <div data-node-id={g.bento.id} className="absolute overflow-hidden" style={box(g.bento.at)}>
        <a href="#" data-node-id={g.partner.id} className="group absolute block overflow-hidden bg-green text-ink" style={shape(g.partner)}>
          <Text t={g.partnerKicker} weight={600}>
            BUILD WITH US
          </Text>
          <Text t={g.partnerTitle} weight={600}>
            {'Partner\nwith us'}
          </Text>
          <img data-node-id={g.partnerArrow.id} src={`${A}/arrow-partner.svg`} alt="" className={`absolute ${NUDGE} motion-safe:group-focus-visible:translate-x-[6px]`} style={box(g.partnerArrow.at)} />
        </a>

        <img
          data-node-id={g.conversations.id}
          src={`${A}/${g.conversations.src}`}
          alt="GLL members in conversation at an event"
          className="absolute"
          style={shape(g.conversations)}
        />

        <div data-node-id={g.ellipse.id} className="absolute rounded-full bg-navy" style={box(g.ellipse.at)} />

        <div data-node-id={g.member.id} className="absolute overflow-hidden bg-pink-soft" style={shape(g.member)}>
          <Text t={g.number} weight={600}>
            10,000+
          </Text>
          <Text t={g.numberNote} weight={400}>
            {'Lithuanian professionals.\nOne global community.'}
          </Text>
          <Text t={g.chapter} as="h3" weight={500}>
            {'Your next chapter\nstarts here.'}
          </Text>
          <a href="#" data-node-id={g.cta.id} className="absolute flex items-center justify-center rounded-full bg-ink text-white" style={box(g.cta.at)}>
            <span
              data-node-id={g.ctaLabel.id}
              className="whitespace-nowrap text-center"
              style={{
                width: g.ctaLabel.at[2], height: g.ctaLabel.at[3],
                fontSize: g.ctaLabel.size, fontWeight: 500, lineHeight: `${g.ctaLabel.lh}px`, letterSpacing: g.ctaLabel.ls,
                paddingTop: g.ctaLabel.lower,
              }}
            >
              BECOME A MEMBER
            </span>
          </a>
        </div>

        <Text t={g.further} weight={600} className="text-center text-white">
          Go further, together.
        </Text>
      </div>

      <img
        data-node-id={g.flag.id}
        src={`${A}/${g.flag.src}`}
        alt="GLL members holding the Lithuanian flag"
        className="absolute"
        style={shape(g.flag)}
      />

      <div data-node-id={g.support.id} className="absolute overflow-hidden bg-white" style={shape(g.support)}>
        <Text t={g.supportKicker} weight={600}>
          MAKE A DIFFERENCE
        </Text>
        <Text t={g.supportTitle} as="h3" weight={600}>
          {'Support our\ncommunity'}
        </Text>
        <a href="#" data-node-id={g.supportLink.id} className="group absolute block text-ink" style={box(g.supportLink.at)}>
          <Text t={g.supportLabel} as="span" weight={600}>
            Support us
          </Text>
          <img data-node-id={g.supportArrow.id} src={`${A}/arrow-support.svg`} alt="" className={`absolute ${NUDGE} motion-safe:group-focus-visible:translate-x-[6px]`} style={box(g.supportArrow.at)} />
        </a>
      </div>
    </div>
  )
}
