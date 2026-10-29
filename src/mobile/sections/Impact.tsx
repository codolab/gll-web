import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from '../../motion'

/**
 * impact on mobile (MOBILE_SPEC.md section 7): the desktop 94:180 periwinkle band
 * restacked. "Global" over pill photo + "impact", then the three stats split by
 * the desktop hairlines (ink at 88%, node 94:191).
 */

const STATS = [
  { num: '10,000+', cap: 'Lithuanian professionals' },
  { num: '60+', cap: 'Countries represented' },
  { num: '10+', cap: 'programs for engagement to contribute to Lithuania' },
]

// M-09 count-up, as the canvas (src/sections/Impact.tsx): 0 to the value with the
// same en-US comma and suffix, once per load, starting at 40% of the stats in view.
const COUNT_MS = 1800
const COUNT_AT = 0.4
const TARGETS = STATS.map((s) => Number(s.num.replace(/\D/g, '')))
const SUFFIX = STATS.map((s) => s.num.replace(/^[\d,]+/, ''))
const en = new Intl.NumberFormat('en-US')

// Counts to show, or null for the final strings (always under reduced motion).
// Parked at 0 before paint, so stats already in view never flash the finals.
function useCountUp(el: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion()
  const [counts, setCounts] = useState<number[] | null>(null)
  const done = useRef(false)
  useLayoutEffect(() => {
    if (reduced || done.current || !el.current) {
      done.current = true
      setCounts(null)
      return
    }
    setCounts(TARGETS.map(() => 0))
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      if (entries[entries.length - 1].intersectionRatio < COUNT_AT) return
      io.disconnect()
      let t0 = -1
      const tick = (now: number) => {
        if (t0 < 0) t0 = now
        const t = Math.min(1, (now - t0) / COUNT_MS)
        if (t < 1) {
          const k = 1 - (1 - t) ** 3
          setCounts(TARGETS.map((v) => Math.round(v * k)))
          raf = requestAnimationFrame(tick)
        } else {
          done.current = true
          setCounts(null)
        }
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: COUNT_AT })
    io.observe(el.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [el, reduced])
  return counts
}

export default function MobileImpact() {
  const stats = useRef<HTMLUListElement>(null)
  const counts = useCountUp(stats)
  return (
    <section id="impact" data-section="impact" className="bg-periwinkle py-16 text-ink">
      <div className="mx-auto max-w-[680px] px-5">
        {/* 56/60 from 342px up; below that the em-sized line shrinks so pill + "impact" still fit. */}
        <h2 className="m-0 text-[length:min(56px,calc((100vw_-_40px)/5.4))] font-semibold leading-[1.0714] tracking-[-0.03125em]">
          <span className="block">Global</span>{' '}
          <span className="mt-[0.125em] flex items-center gap-[0.215em]">
            <img src="/assets/impact/pill.webp" alt="" className="h-[1.0357em] w-[1.857em] shrink-0" />
            <span>impact</span>
          </span>
        </h2>

        <ul ref={stats} role="list" className="m-0 mt-12 list-none p-0">
          {STATS.map((s, i) => (
            <li key={s.num} className={i ? 'mt-6 border-t border-ink/88 pt-6' : undefined}>
              <p data-stat={i} className="m-0 text-[40px] font-semibold leading-[46px] tracking-[-1.2px]">
                {/* While counting, assistive tech still reads the final value (M-G1). */}
                {counts ? (
                  <>
                    <span aria-hidden="true">{en.format(counts[i]) + SUFFIX[i]}</span>
                    <span className="sr-only">{s.num}</span>
                  </>
                ) : s.num}
              </p>
              <p className="m-0 mt-1.5 text-[15px] leading-[22px] tracking-[-0.125px]">{s.cap}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
