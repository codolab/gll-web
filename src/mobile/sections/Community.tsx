import type { CSSProperties } from 'react'

/**
 * community on mobile (MOBILE_SPEC.md section 9): the desktop bento 94:281 as a
 * two-column grid. Each card keeps its desktop shape; a round side is always
 * half the card's height, as on desktop, so heights are set, not content-driven.
 */

const A = '/assets/community'
const M = '/assets/mobile/community'

/** Custom properties for an inline style. */
const vars = (v: Record<string, string>) => v as CSSProperties

/** Corner radii (TL TR BR BL) where the round side is half of a height held in `h`. */
const round = (h: string, tl: string, tr: string, br: string, bl: string) =>
  [tl, tr, br, bl].map((r) => (r === 'half' ? `calc(var(${h}) / 2)` : r)).join(' ')

/** M-13 on mobile: the arrow nudges on hover (pointer devices only), keyboard focus and press. */
const NUDGE =
  'motion-safe:transition-transform motion-safe:duration-250 motion-safe:ease-out ' +
  'motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1 motion-safe:group-active:translate-x-1'

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

/** Card titles: 22/28 on phones; desktop-sized cards on a tablet (bento 576px and up) take 28/34. */
const TITLE = 'text-[22px] leading-7 @xl:text-[28px] @xl:leading-[34px]'

export default function MobileCommunity() {
  return (
    <section id="community" data-section="community" className="bg-periwinkle text-ink">
      <div className="mx-auto box-content max-w-[640px] px-5 py-16">
        {/* 40px below 356px would break "Lithuanian roots." onto a third line; scale it to keep the desktop's two. */}
        <h2 className="m-0 whitespace-pre-line text-[clamp(34px,11.25vw,40px)] font-semibold leading-[1.1] tracking-[-1.2px]">
          {'Global minds.\nLithuanian roots.'}
        </h2>
        <p className="m-0 mt-4 text-[17px] leading-[26px]">
          Meet your people. Share your experience. Help shape Lithuania’s future.
        </p>

        {/* col: one grid column; h1: the first row, never shorter than its copy needs. */}
        <div className="@container mt-12">
          <div
            className="grid grid-cols-2 gap-3 [--hp:312px] [--hw:208px] @xl:[--hp:248px]"
            style={vars({ '--col': 'calc((100cqw - 12px) / 2)', '--h1': 'max(176px, calc(var(--col) * 0.84))' })}
          >
            {/* In a bento under 320px the round side would clip "BUILD WITH US", so the copy moves in and down. */}
            <a
              href="#"
              data-card="partner"
              className={`group flex flex-col justify-between bg-green p-5 text-ink @max-xs:px-4 @max-xs:pt-7 @xl:p-7 ${FOCUS}`}
              style={{ height: 'var(--h1)', borderRadius: round('--h1', '16px', 'half', 'half', '16px') }}
            >
              <span className="text-[12px] font-semibold leading-4">BUILD WITH US</span>
              <span className={`whitespace-pre-line font-semibold ${TITLE}`}>{'Partner\nwith us'}</span>
              <img data-arrow="partner" src={`${A}/arrow-partner.svg`} alt="" width={28} height={28} className={`size-7 @xl:size-8 ${NUDGE}`} />
            </a>

            {/* The source photo carries the round left side as alpha; the crop keeps it whole. */}
            <img
              data-card="conversations"
              src={`${M}/conversations.webp`}
              alt="GLL members in conversation at an event"
              className="w-full rounded-r-2xl object-cover object-left"
              style={{ height: 'var(--h1)' }}
            />

            <div data-card="together" className="flex aspect-square items-center justify-center rounded-full bg-navy text-white">
              <p className={`m-0 max-w-[7em] text-center font-semibold ${TITLE} @max-xs:text-[20px] @max-xs:leading-[26px]`}>Go further, together.</p>
            </div>

            <img
              data-card="flag"
              src={`${M}/members-flag.webp`}
              alt="GLL members holding the Lithuanian flag"
              className="aspect-square w-full object-cover"
              style={{ borderRadius: '16px 50% 16px 16px' }}
            />

            <div
              data-card="member"
              className="col-span-2 flex flex-col justify-center gap-6 bg-pink-soft px-6 @xl:flex-row @xl:items-center @xl:justify-start @xl:gap-12 @xl:px-10"
              style={{ height: 'var(--hp)', borderRadius: round('--hp', '16px', 'half', 'half', '16px') }}
            >
              <div className="@xl:shrink-0">
                {/* Narrow cards: 56px would run the "+" into the round end. */}
                <p className="m-0 text-[56px] font-semibold leading-[60px] tracking-[-1.75px] @max-xs:text-[50px] @max-xs:leading-[54px] @max-xs:tracking-[-1.5px]">10,000+</p>
                <p className="m-0 mt-1 whitespace-pre-line text-[15px] leading-[22px]">
                  {'Lithuanian professionals.\nOne global community.'}
                </p>
              </div>
              <div>
                <h3 className={`m-0 whitespace-pre-line font-medium ${TITLE}`}>{'Your next chapter\nstarts here.'}</h3>
                <a
                  href="#"
                  className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-semibold leading-5 text-white ${FOCUS}`}
                >
                  BECOME A MEMBER
                </a>
              </div>
            </div>

            <div
              data-card="support"
              className="col-span-2 flex flex-col justify-between bg-white px-6 pb-3 pt-6 @xl:px-7 @xl:pt-7"
              style={{ height: 'var(--hw)', borderRadius: round('--hw', '16px', 'half', '16px', '16px') }}
            >
              <p className="m-0 text-[12px] font-semibold leading-4">MAKE A DIFFERENCE</p>
              <h3 className={`m-0 whitespace-pre-line font-semibold ${TITLE}`}>{'Support our\ncommunity'}</h3>
              <a href="#" className={`group flex h-11 items-center justify-between rounded-lg text-ink ${FOCUS}`}>
                <span className="text-[15px] font-semibold leading-[22px]">Support us</span>
                <img data-arrow="support" src={`${A}/arrow-support.svg`} alt="" width={28} height={28} className={`size-7 @xl:size-8 ${NUDGE}`} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
