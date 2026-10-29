/**
 * programs on mobile (MOBILE_SPEC.md 6). Ink band: the heading, the "Programs"
 * photo card, then the three navy program cards stacked in their number order.
 * Copy is the desktop's (94:156); each card's "meta | place" line is split from
 * its body so the blank line between them becomes spacing.
 */

type Program = { n: string; title: string; meta?: string; body: string }

const PROGRAMS: Program[] = [
  {
    n: '01.',
    title: 'Business Advisors',
    body: 'The program brings together the most successful and experienced diaspora professionals to advise growing Lithuanian companies, emerging innovators and entrepreneurs.',
  },
  {
    n: '02.',
    title: 'Global Lithuanian Awards',
    meta: 'December | Vilnius',
    body: 'Global Lithuanian Awards | GLA acknowledges and rewards the remarkable achievements of Lithuanian diaspora professionals.',
  },
  {
    n: '03.',
    title: 'GLL Forum ’26',
    meta: 'July | Vilnius',
    body: 'Entrepreneurs, business executives, public policy experts, human rights activists, and alike meet for a sunny summer afternoon in Vilnius to exchange ideas, strengthen connections and build joined efforts.',
  },
]

const text = 'm-0 text-white'

function Card({ p }: { p: Program }) {
  return (
    <article className="rounded-2xl bg-navy p-6">
      <p className={`${text} text-[12px] font-semibold leading-4`}>{p.n}</p>
      <h3 className={`${text} mt-3 text-[22px] font-semibold leading-7 tracking-[-0.22px]`}>{p.title}</h3>
      {p.meta && <p className={`${text} mt-3 text-[15px] leading-[22px]`}>{p.meta}</p>}
      <p className={`${text} text-[15px] leading-[22px] ${p.meta ? 'mt-[22px]' : 'mt-3'}`}>{p.body}</p>
    </article>
  )
}

export default function MobilePrograms() {
  return (
    <section id="programs" data-section="programs" className="bg-ink px-5 py-16">
      <div className="mx-auto max-w-[640px]">
        <h2 className="m-0 whitespace-pre-line text-balance text-center text-[32px] font-semibold leading-[38px] tracking-[-0.6px] text-white">
          {'Sustained, proven, and notable ways\nto get involved'}
        </h2>

        <div className="relative mt-12 aspect-[4/5] overflow-hidden rounded-2xl bg-navy sm:aspect-[4/3]">
          <img
            src="/assets/programs/photo.webp"
            alt="GLL event: a speaker shaking hands with a guest"
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          {/* Rectangle 94:162: ink at 49% over the photo, as desktop. */}
          <div className="absolute inset-0 bg-ink opacity-[0.49]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-5">
            <p className="m-0 text-center text-[44px] font-semibold leading-[48px] tracking-[-0.045em] text-white">Programs</p>
            <a
              href="#"
              className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-semibold leading-5 text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              SEE ALL PROGRAMS
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {PROGRAMS.map((p) => (
            <Card key={p.n} p={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
