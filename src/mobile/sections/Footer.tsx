/**
 * footer on mobile (MOBILE_SPEC.md section 10): the newsletter card (94:308)
 * full width, then the logo row, the five link columns and the copyright.
 * No backend: SUBSCRIBE is a plain button, links are "#" (gaps.md G-03).
 */

const A = '/assets/footer'

const COLUMNS: [string, string[]][] = [
  ['About', ['Team', 'Strategy & Reports', 'Contacts']],
  ['Network', ['Patrons & Members', 'Professional Clubs', 'Partners']],
  ['Programs', []],
  ['Events', []],
  ['Join us', ['Partner with us', 'Become a member', 'Support us!']],
]

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
const PILL = `inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold leading-5 text-white ${FOCUS}`

export default function MobileFooter() {
  return (
    <section id="footer" data-section="footer" role="contentinfo" className="bg-ink text-white">
      {/* The card sits inset by the gutter on three sides, as the desktop card does by its 64px. */}
      <div className="mx-auto box-content max-w-[640px] px-5 pt-5 sm:pt-10 md:pt-16">
        <div data-card="newsletter" className="relative overflow-hidden rounded-2xl">
          {/* A portrait-friendly crop of the desktop photo's source, centred on the tower. */}
          <img
            src="/assets/mobile/footer/newsletter.webp"
            alt=""
            className="absolute inset-0 size-full object-cover object-[64%_50%]"
          />
          <div className="absolute inset-0 bg-ink/61" />

          <div className="relative px-6 py-8 max-[359px]:px-5">
            <h2 className="m-0 text-[clamp(28px,9.6vw,32px)] font-semibold leading-10 tracking-[-0.8px]">Ways to engage</h2>
            <p className="m-0 mt-3 max-w-[520px] text-[15px] leading-[22px]">
              Subscribe to our newsletter today and be the first to know about our events as well as to receive our monthly digest.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#" className={`${PILL} bg-[#ff466d] max-[359px]:px-5`}>EVENTS</a>
              <a href="#" className={`${PILL} border border-white max-[359px]:px-5`}>PROGRAMS</a>
            </div>

            <h3 className="m-0 mt-10 whitespace-pre-line text-[22px] font-semibold leading-7">{'Subscribe to our\nnewsletter'}</h3>
            <form className="mt-4 flex max-w-[440px] flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">Email</label>
              {/* 16px keeps iOS Safari from zooming the page when the field takes focus. */}
              <input
                id="footer-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                className="h-12 w-full rounded-full border-0 bg-white px-6 text-[16px] leading-[22px] text-ink placeholder:text-ink placeholder:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              />
              <button type="button" className={`${PILL} h-12 w-full cursor-pointer border-0 bg-[#ff466d]`}>
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-b border-white/14 pb-8">
          <a href="#" aria-label="Global Lithuanian Leaders" className={`block rounded-sm ${FOCUS}`}>
            <img src={`${A}/logo.svg`} alt="" width={57} height={56} className="block h-14 w-auto" />
          </a>
          {/* Icons stay 20px as drawn; their 44px targets reach into the gutter so the glyphs align to it. */}
          <div className="-mr-3 flex">
            <a href="#" aria-label="Facebook" className={`flex size-11 items-center justify-center rounded-full ${FOCUS}`}>
              <img src={`${A}/facebook.svg`} alt="" width={20} height={20} />
            </a>
            <a href="#" aria-label="LinkedIn" className={`flex size-11 items-center justify-center rounded-full ${FOCUS}`}>
              <img src={`${A}/linkedin.svg`} alt="" width={20} height={20} />
            </a>
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-4 gap-y-6 pb-10 pt-6">
          {COLUMNS.map(([heading, links]) => (
            <div key={heading}>
              <a href="#" className={`flex min-h-11 items-center text-[17px] font-semibold leading-6 ${FOCUS}`}>{heading}</a>
              {links.length > 0 && (
                <ul className="m-0 list-none p-0">
                  {links.map((label) => (
                    <li key={label}>
                      <a href="#" className={`flex min-h-11 items-center py-[5px] text-[15px] leading-[22px] ${FOCUS}`}>{label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/14">
        <p className="m-0 mx-auto box-content max-w-[640px] px-5 py-6 text-[12px] leading-[18px]">
          Global Lithuanian Leaders © {new Date().getFullYear()} | All Rights Reserved
        </p>
      </div>
    </section>
  )
}
