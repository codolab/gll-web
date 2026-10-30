// hero (MOBILE_SPEC.md 2, motion-spec M-01): three rows of the desktop tiles drift right,
// left, right at 20 px/s as seamless loops that keep the window covered at every shift (390
// and 1023 wide) and fill the band; the page's pause control (M-G5) stops them; clones are
// hidden; the copy is the desktop's. `reduced`: no animation, no transform.
// Shared with logos.mjs: `marquee` (speed, coverage, seam) and `pauseCheck`.
import { sample, speed, secs, settle } from '../motion/_marquee.mjs'

const ROWS = [{ n: 1, speed: 20 }, { n: 2, speed: -20 }, { n: 3, speed: 20 }]
const GAP = 16 // tile spacing: the widest empty run a row may show
const PAUSE = 'main > button[aria-pressed]'
const ok = (p) => p.then(() => true, () => false)
const track = (t, n) => `${t.section} .marquee:nth-of-type(${n})`

/**
 * One track's geometry, read in a single frame with its live shift taken out:
 * the widest empty run of the window over one full period (exact: the run is
 * piecewise linear in the shift and peaks where a box edge crosses a window
 * edge, so those shifts are all checked), and the seam (what the window shows
 * one period on is what it shows at rest).
 */
export const marquee = (page, sel) => page.$eval(sel, (el) => {
  const vw = document.documentElement.clientWidth
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
  const period = parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift'))
  const items = [...el.children].map((n) => {
    const r = n.getBoundingClientRect()
    return { l: r.left - m, r: r.right - m, key: n.querySelector('img')?.getAttribute('src') ?? n.getAttribute('src') ?? getComputedStyle(n).backgroundColor }
  }).sort((a, b) => a.l - b.l)
  const run = (d) => {
    let edge = 0, max = 0
    for (const { l, r } of items) { if (l + d > edge) max = Math.max(max, Math.min(l + d, vw) - edge); edge = Math.max(edge, r + d) }
    return Math.max(max, vw - edge)
  }
  const ds = [0, period, ...items.flatMap((i) => [-i.l, -i.r, vw - i.l, vw - i.r])].filter((d) => d * Math.sign(period) >= 0 && Math.abs(d) <= Math.abs(period))
  let worst = { run: -1, d: 0 }
  for (const d of ds) { const r = run(d); if (r > worst.run) worst = { run: r, d } }
  const seen = (d) => items.filter((i) => i.r + d > 0 && i.l + d < vw).map((i) => ({ key: i.key, x: i.l + d }))
  const [at0, at1] = [seen(0), seen(period)]
  const seam = at0.length === at1.length && at0.every((i, k) => i.key === at1[k].key && Math.abs(i.x - at1[k].x) < 0.05)
  return { vw, period, ...worst, n: ds.length, seam, shown: at0.length }
})

/** M-G5: the page's pause button stops every listed track and starts them again at their speeds. */
export async function pauseCheck(page, t, tracks) {
  const all = () => Promise.all(tracks.map(([s]) => sample(page, s)))
  const sel = tracks.map(([s]) => s).join(', ')
  await page.$eval(PAUSE, (el) => el.click())
  const flag = await page.$eval('main', (m) => m.dataset.motion)
  const held = await ok(settle(page, sel, 'paused'))
  const h0 = await all()
  await t.sleep(500)
  const h1 = await all()
  await page.$eval(PAUSE, (el) => el.click())
  const freed = await ok(settle(page, sel, 'running'))
  const f0 = await all()
  await t.sleep(500)
  const f1 = await all()
  t.check('M-G5', flag === 'paused' && held && freed && tracks.every(([, v], i) => h1[i].x === h0[i].x && Math.abs(speed(f0[i], f1[i]) - v) < 2),
    `pause button: main[data-motion=${flag}], tracks report paused: ${held}, running again: ${freed}; ${tracks.map(([, v], i) => `track ${i + 1} held ${(h1[i].x - h0[i].x).toFixed(3)}px over ${secs(h0[i], h1[i])}s, resumed ${speed(f0[i], f1[i]).toFixed(2)} px/s (want ${v})`).join('; ')}`)
}

export default async function (page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const n = await page.$$eval(`${t.section} .marquee`, (els) => els.length)
  t.check('M-01', n === 3, `${n} marquee rows in the hero`)

  const a = await Promise.all(ROWS.map((r) => sample(page, track(t, r.n))))
  await t.sleep(1000)
  const b = await Promise.all(ROWS.map((r) => sample(page, track(t, r.n))))
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    t.check('M-01', Math.abs(v - r.speed) < 2, `row ${r.n}: ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px over ${secs(a[i], b[i])}s = ${v.toFixed(2)} px/s (want ${r.speed}, ${r.speed > 0 ? 'rightward' : 'leftward'})`)
  }

  await pauseCheck(page, t, ROWS.map((r) => [track(t, r.n), r.speed]))

  // Coverage and seam at the phone width and at the widest mobile window.
  const wide = await t.browser.newContext({ viewport: { width: 1023, height: 900 }, hasTouch: true, isMobile: true })
  const p2 = await wide.newPage()
  await p2.goto(t.url, { waitUntil: 'networkidle' })
  for (const [label, p] of [['390', page], ['1023', p2]]) {
    for (const r of ROWS) {
      const g = await marquee(p, track(t, r.n))
      t.check('M-01', g.run <= GAP + 0.5 && g.seam && Math.sign(g.period) === Math.sign(r.speed),
        `${label}px row ${r.n}: widest empty run over one ${g.period}px period ${g.run.toFixed(2)}px at shift ${g.d.toFixed(2)} (${g.n} edge-crossing shifts, tile gap ${GAP}); one period on shows the same ${g.shown} tiles at the same x: ${g.seam}`)
    }
  }
  await wide.close()

  // The rows fill the band top to bottom (MOBILE_SPEC "fill the band"), behind the 71% scrim.
  const fill = await page.$eval(t.section, (sec) => {
    const s = sec.getBoundingClientRect()
    const rows = [...sec.querySelectorAll('.marquee')].map((r) => r.getBoundingClientRect())
    const gaps = rows.slice(1).map((r, i) => r.top - rows[i].bottom)
    const scrim = [...sec.children].find((c) => getComputedStyle(c).backgroundColor.startsWith('rgba(8, 22, 35, 0.71'))
    return { top: rows[0].top - s.top, bottom: s.bottom - rows[rows.length - 1].bottom, gaps, h: s.height, scrim: !!scrim }
  })
  t.check('M-01', fill.top <= 0 && fill.bottom <= 0 && fill.gaps.every((g) => g <= GAP + 0.5) && fill.scrim,
    `band ${fill.h}px: rows start ${fill.top.toFixed(1)}px from its top, end ${(-fill.bottom).toFixed(1)}px past its bottom, ${fill.gaps.map((g) => g.toFixed(1)).join(' / ')}px apart; ink-deep 71% scrim over them: ${fill.scrim}`)

  // M-G3: one set of 15 tiles is live, the 15 clones are hidden and hold nothing focusable.
  const tiles = await page.$$eval(`${t.section} .marquee > *`, (els) => els.map((e) => ({ hidden: e.getAttribute('aria-hidden') === 'true', focusable: e.querySelectorAll('a,button,input,[tabindex]').length, alt: e.querySelector('img')?.getAttribute('alt') })))
  const clones = tiles.filter((x) => x.hidden)
  t.check('M-G3', tiles.length === 30 && clones.length === 15 && tiles.every((x) => !x.focusable && (x.alt === undefined || x.alt === '')),
    `${tiles.length} tiles, ${clones.length} aria-hidden clones; none focusable; photos decorative (alt=""): ${tiles.every((x) => x.alt === undefined || x.alt === '')}`)

  // The desktop copy, character for character, at the spec's sizes.
  const copy = await page.$eval(t.section, (s) => {
    const f = (el) => { const c = getComputedStyle(el); return `${c.fontSize}/${c.lineHeight}` }
    const h = s.querySelector('h1'), p = s.querySelector('p'), a = s.querySelector('a')
    return { h: h.textContent, p: p.textContent, a: a.textContent, hf: f(h), pf: f(p), ah: a.getBoundingClientRect().height }
  })
  const COPY = ['Empowering leaders shaping tomorrow', 'Network of 10.000+ global Lithuanian professionals from 60+ countries and 28 clubs contributing to the prosperity of Lithuania.', 'BECOME A MEMBER']
  t.check('copy', copy.h === COPY[0] && copy.p.trim() === COPY[1] && copy.a.trim() === COPY[2] && copy.hf === '44px/46px' && copy.pf === '17px/26px' && copy.ah >= 44,
    `h1 "${copy.h}" ${copy.hf}; sub ${copy.pf}, matches desktop: ${copy.p.trim() === COPY[1]}; pill "${copy.a.trim()}" ${copy.ah}px tall`)
}

export async function reduced(page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const read = () => page.$$eval(`${t.section} .marquee`, (els) => els.map((el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', a.length === 3 && [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
  const pause = await page.$$eval(PAUSE, (els) => els.length)
  t.check('M-G5', pause === 0, `pause button under reduced motion: ${pause} rendered (nothing moves)`)
}
