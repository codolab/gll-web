import type { CSSProperties, ElementType, ReactNode } from 'react'

/** community - Figma 94:276. Every box is the node's canvas box minus its parent's origin. */

const A = '/assets/community'

const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: x, top: y, width: w, height: h })

/** M-13: hovering a "Join us" block nudges its arrow right; each arrow adds its own keyboard-focus trigger. */
const NUDGE = 'motion-safe:transition-transform motion-safe:duration-250 motion-safe:ease-out motion-safe:group-hover:translate-x-[6px]'

type TextProps = {
  id: string
  as?: ElementType
  at: [number, number, number, number]
  size: number
  weight: number
  lh: number
  ls?: number
  /**
   * Blink puts the baseline at round(ascent) + floor(half-leading); Figma rounds
   * the exact baseline. Where that leaves the text 1px high (measured), pad it down.
   */
  lowerBaseline?: boolean
  className?: string
  children: ReactNode
}

function Text({ id, as: Tag = 'p', at, size, weight, lh, ls = 0, lowerBaseline, className = '', children }: TextProps) {
  return (
    <Tag
      data-node-id={id}
      className={`absolute m-0 whitespace-pre-line ${className}`}
      style={{
        ...box(...at),
        fontSize: size, fontWeight: weight, lineHeight: `${lh}px`, letterSpacing: ls,
        paddingTop: lowerBaseline ? 1 : undefined,
      }}
    >
      {children}
    </Tag>
  )
}

export default function Community() {
  return (
    <div className="relative size-full bg-periwinkle text-ink" data-node-id="94:276">
      <Text id="94:279" as="h2" at={[64, 88, 816, 186]} size={80} weight={600} lh={93} ls={-2}>
        {'Global minds.\nLithuanian roots.'}
      </Text>
      <Text id="94:280" at={[880, 88, 496, 120]} size={32} weight={400} lh={40} lowerBaseline>
        Meet your people. Share your experience. Help shape Lithuania’s future.
      </Text>

      {/* Bento: everything below is relative to 94:281 at (64, 330). */}
      <div data-node-id="94:281" className="absolute overflow-hidden" style={box(64, 330, 976, 648)}>
        <a
          href="#"
          data-node-id="94:282"
          className="group absolute block overflow-hidden bg-green text-ink"
          style={{ ...box(0, 0, 272, 264), borderRadius: '24px 132px 132px 24px' }}
        >
          <Text id="94:283" at={[28, 28, 200, 14]} size={12} weight={600} lh={14}>
            BUILD WITH US
          </Text>
          <Text id="94:284" at={[28, 86, 210, 74]} size={32} weight={600} lh={37}>
            {'Partner\nwith us'}
          </Text>
          <img data-node-id="94:285" src={`${A}/arrow-partner.svg`} alt="" className={`absolute ${NUDGE} motion-safe:group-focus-visible:translate-x-[6px]`} style={box(28, 204, 32, 32)} />
        </a>

        <img
          data-node-id="94:287"
          src={`${A}/conversations.webp`}
          alt="GLL members in conversation at an event"
          className="absolute rounded-[24px]"
          style={box(288, 0, 408, 264)}
        />

        <div data-node-id="94:288" className="absolute rounded-full bg-navy" style={box(712, 0, 264, 264)} />

        <div
          data-node-id="94:289"
          className="absolute overflow-hidden bg-pink-soft"
          style={{ ...box(0, 280, 976, 368), borderRadius: '24px 184px 184px 24px' }}
        >
          <Text id="94:291" at={[36, 97.5, 420, 107]} size={92} weight={600} lh={107} ls={-2}>
            10,000+
          </Text>
          <Text id="94:292" at={[36, 216.5, 420, 54]} size={23} weight={400} lh={27} lowerBaseline>
            {'Lithuanian professionals.\nOne global community.'}
          </Text>
          <Text id="94:295" as="h3" at={[500, 89, 380, 78]} size={34} weight={500} lh={39}>
            {'Your next chapter\nstarts here.'}
          </Text>
          <a
            href="#"
            data-node-id="94:296"
            className="absolute flex items-center justify-center rounded-full bg-ink text-white"
            style={box(500, 223, 219, 56)}
          >
            <span
              data-node-id="94:297"
              className="whitespace-nowrap text-center"
              style={{ width: 155, height: 24, fontSize: 16, fontWeight: 500, lineHeight: '24px', letterSpacing: -0.128 }}
            >
              BECOME A MEMBER
            </span>
          </a>
        </div>

        <Text id="94:298" at={[754, 94.51, 179, 74]} size={32} weight={600} lh={37} className="text-center text-white">
          Go further, together.
        </Text>
      </div>

      <img
        data-node-id="94:299"
        src={`${A}/members-flag.webp`}
        alt="GLL members holding the Lithuanian flag"
        className="absolute"
        style={{ ...box(1056, 330, 320, 360), borderRadius: '24px 160px 24px 24px' }}
      />

      <div
        data-node-id="94:300"
        className="group absolute overflow-hidden bg-white"
        style={{ ...box(1056, 706, 320, 272), borderRadius: '24px 136px 24px 24px' }}
      >
        <Text id="94:301" at={[28, 28, 250, 14]} size={12} weight={600} lh={14}>
          MAKE A DIFFERENCE
        </Text>
        <Text id="94:302" as="h3" at={[28, 92, 264, 70]} size={30} weight={600} lh={35}>
          {'Support our\ncommunity'}
        </Text>
        <a href="#" data-node-id="94:303" className="absolute block text-ink" style={box(28, 212, 264, 32)}>
          <Text id="94:304" as="span" at={[0, 6.5, 160, 19]} size={16} weight={600} lh={19}>
            Support us
          </Text>
          <img data-node-id="94:305" src={`${A}/arrow-support.svg`} alt="" className={`absolute ${NUDGE} motion-safe:group-has-focus-visible:translate-x-[6px]`} style={box(232, 0, 32, 32)} />
        </a>
      </div>
    </div>
  )
}
