// ribbons (MOBILE_SPEC.md 5, motion-spec M-07): "Connect globally" slides left and
// "Grow together" right at 40 px/s, seamless loops that keep a 1023px window covered;
// the page's pause control (M-G5) stops both; one live phrase per row, clones hidden.
// `reduced`: no animation, no transform.
import { compare, fmt, fringeOnly } from '../motion/_marquee.mjs'

const ROWS = [
  { track: '[data-ribbon-track="left"]', speed: -40, phrase: 'Connect globally' },
  { track: '[data-ribbon-track="right"]', speed: 40, phrase: 'Grow together' },
]

const sample = (page, sel) => page.$eval(sel, (el) => ({ x: new DOMMatrixReadOnly(getComputedStyle(el).transform).m41, t: document.timeline.currentTime }))
const speed = (a, b) => (b.x - a.x) / ((b.t - a.t) / 1000)
const sampleAll = (page, t) => Promise.all(ROWS.map((r) => sample(page, `${t.section} ${r.track}`)))
/** Wait until both rows' animations are in `state` and no longer pending (a resume lands a frame or more later). */
const settle = (page, t, state) => page.waitForFunction(([sel, state]) =>
  [...document.querySelectorAll(sel)].every((el) => el.getAnimations().length && el.getAnimations().every((a) => a.playState === state && !a.pending)),
  [`${t.section} .marquee`, state], { timeout: 5000 }).then(() => true, () => false)
const states = (page, t) => page.$$eval(`${t.section} .marquee`, (els) => els.map((e) => e.getAnimations().map((a) => a.playState).join('+') || 'none'))

/** Park a track at `ms`, or on its last frame (one full period) for 'end'. */
const seek = (page, sel, ms) => page.$eval(sel, (el, ms) => {
  for (const a of el.getAnimations()) {
    a.pause()
    if (ms === 'end') { a.effect.updateTiming({ iterations: 1, fill: 'forwards' }); a.currentTime = a.effect.getComputedTiming().duration }
    else a.currentTime = ms
  }
}, ms)

export default async function (page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))

  const a = await sampleAll(page, t)
  await t.sleep(1000)
  const b = await sampleAll(page, t)
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    t.check('M-07', Math.abs(v - r.speed) < 2, `"${r.phrase}" ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px = ${v.toFixed(2)} px/s (want ${r.speed})`)
  }

  // The page's pause control: the first tab stop, a toggle (M-G5).
  await page.keyboard.press('Tab')
  const label = await page.evaluate(() => document.activeElement?.textContent)
  await page.keyboard.press('Enter')
  const stopped = await settle(page, t, 'paused')
  const p0 = await sampleAll(page, t)
  await t.sleep(500)
  const p1 = await sampleAll(page, t)
  const held = await states(page, t)
  await page.keyboard.press('Enter')
  const resumed = await settle(page, t, 'running')
  const r0 = await sampleAll(page, t)
  await t.sleep(500)
  const r1 = await sampleAll(page, t)
  t.check('paused', label === 'Pause moving content' && stopped && resumed && held.every((s) => s === 'paused') && ROWS.every((r, i) => p1[i].x === p0[i].x && Math.abs(speed(r0[i], r1[i]) - r.speed) < 2),
    `"${label}" pressed: ${ROWS.map((r, i) => `"${r.phrase}" ${held[i]}, moved ${(p1[i].x - p0[i].x).toFixed(3)}px in 0.5s`).join('; ')}; released: ${ROWS.map((r, i) => `${speed(r0[i], r1[i]).toFixed(2)} px/s`).join(', ')}`)

  // Coverage and seamlessness on the widest mobile window, at both ends of the loop.
  await page.setViewportSize({ width: 1023, height: 844 })
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  for (const r of ROWS) {
    const sel = `${t.section} ${r.track}`
    const row = await page.$eval(sel, (el) => {
      const units = [...el.children].map((u) => u.getBoundingClientRect().width)
      return { units, period: Math.abs(parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift'))), dur: getComputedStyle(el).animationDuration }
    })
    // Every phrase and dot the row shows, as [kind, left, top, width] in row px.
    const shown = () => page.$eval(sel, (el) => {
      const row = el.parentElement.getBoundingClientRect()
      return [...el.querySelectorAll('p, span.rounded-full')].map((n) => ({ n, q: n.getBoundingClientRect() }))
        .filter(({ q }) => q.right > row.left && q.left < row.right)
        .map(({ n, q }) => [n.tagName === 'P' ? n.textContent : getComputedStyle(n).backgroundColor, q.left - row.left, q.top - row.top, q.width].join(' '))
    })
    const span = () => page.$eval(sel, (el) => {
      const q = el.getBoundingClientRect(), row = el.parentElement.getBoundingClientRect()
      return { l: q.left - row.left, r: q.right - row.left, w: row.width }
    })
    const clip = await page.$eval(sel, (el) => { const q = el.parentElement.getBoundingClientRect(); return { x: q.left, y: q.top, width: q.width, height: q.height } })
    await seek(page, sel, 0)
    const [s0, g0, shot0] = [await span(), await shown(), await page.screenshot({ clip })]
    await seek(page, sel, 'end')
    const [s1, g1, shot1] = [await span(), await shown(), await page.screenshot({ clip })]
    const covered = [s0, s1].every((s) => s.l <= 0 && s.r >= s.w)
    t.check('cover', covered && s0.w >= 1023, `"${r.phrase}" track ${s0.l.toFixed(1)}..${s0.r.toFixed(1)} at rest, ${s1.l.toFixed(1)}..${s1.r.toFixed(1)} after one period, row ${s0.w}px wide`)
    // Seamless: after one period the row shows the same items at the same boxes; the
    // promoted layer may re-raster a dot's anti-aliased rim, so pixels allow 1px fringes only.
    const d = compare(shot0, shot1)
    const same = g0.join('|') === g1.join('|')
    t.check('seamless', row.units.every((u) => Math.abs(u - row.period) < 0.005) && same && fringeOnly(d),
      `"${r.phrase}" ${row.units.length} units of ${row.units.map((u) => +u.toFixed(3)).join('/')}px, period ${row.period}px (${row.dur} at 40 px/s); after one period ${g0.length} item boxes ${same ? 'identical' : 'DIFFER'}; ${fmt(d)}`)
  }

  const a11y = await page.$eval(t.section, (sec) => [...sec.querySelectorAll('.marquee')].map((tr) => ({
    live: [...tr.querySelectorAll('p')].filter((p) => !p.closest('[aria-hidden="true"]')).map((p) => p.textContent),
    phrases: tr.querySelectorAll('p').length,
    focusable: tr.querySelectorAll('a, button, input, [tabindex]').length,
  })))
  t.check('clones', a11y.every((x, i) => x.live.length === 1 && x.live[0] === ROWS[i].phrase && x.phrases >= 6 && !x.focusable),
    a11y.map((x) => `${x.phrases} phrases, live: ${JSON.stringify(x.live)}, focusable ${x.focusable}`).join('; '))
}

export async function reduced(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const read = () => page.$$eval(`${t.section} .marquee`, (els) => els.map((el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', a.length === 2 && [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
}
