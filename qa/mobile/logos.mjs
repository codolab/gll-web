// logos (MOBILE_SPEC.md 3, motion-spec M-02/M-03): the eight desktop logos at 60% in one
// row drifting left at 30 px/s, a seamless loop that keeps the window covered at every
// shift (390 and 1023 wide); the page's pause control (M-G5) and a hovering mouse (M-03)
// stop it; clones are hidden; the LF marks stay hard-light on a white track, moving too.
// `reduced`: no animation, no transform.
import { sample, speed, secs, settle, compare, fmt, fringeOnly } from '../motion/_marquee.mjs'
import { marquee, pauseCheck } from './hero.mjs'

const SPEED = -30
const GAP = 70.8085 * 0.6 // the desktop strip's spacing at 60%: the widest empty run the row may show
const ok = (p) => p.then(() => true, () => false)

/** Viewport clip around an element, 2px of margin, whole CSS px. */
const clipOf = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect(), x = Math.floor(r.left) - 2, y = Math.floor(r.top) - 2
  return { x, y, width: Math.ceil(r.right) + 2 - x, height: Math.ceil(r.bottom) + 2 - y }
})

export default async function (page, t) {
  const TRACK = `${t.section} .marquee`
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const n = await page.$$eval(TRACK, (els) => els.length)

  const a = await sample(page, TRACK)
  await t.sleep(1000)
  const b = await sample(page, TRACK)
  const v = speed(a, b)
  t.check('M-02', n === 1 && Math.abs(v - SPEED) < 1.5, `${n} track: ${a.x.toFixed(2)} -> ${b.x.toFixed(2)}px over ${secs(a, b)}s = ${v.toFixed(2)} px/s (want ${SPEED}, leftward)`)

  await pauseCheck(page, t, [[TRACK, SPEED]])

  // Coverage and seam at the phone width and at the widest mobile window.
  const wide = await t.browser.newContext({ viewport: { width: 1023, height: 900 } })
  const p2 = await wide.newPage()
  await p2.goto(t.url, { waitUntil: 'networkidle' })
  for (const [label, p] of [['390', page], ['1023', p2]]) {
    const g = await marquee(p, TRACK)
    t.check('M-02', g.run <= GAP + 0.5 && g.seam && g.period < 0,
      `${label}px: widest empty run over one ${g.period}px period ${g.run.toFixed(2)}px at shift ${g.d.toFixed(2)} (${g.n} edge-crossing shifts, logo gap ${GAP.toFixed(2)}); one period on shows the same ${g.shown} logos at the same x: ${g.seam}`)
  }

  // M-03 with a mouse (a 1023 window without touch): hovering pauses the strip, leaving resumes it.
  const strip = await p2.$eval(t.section, (el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top } })
  await p2.mouse.move(strip.x, strip.y)
  const held = await ok(settle(p2, TRACK, 'paused'))
  const h0 = await sample(p2, TRACK)
  await p2.waitForTimeout(500)
  const h1 = await sample(p2, TRACK)
  await p2.mouse.move(strip.x, strip.top - 150)
  const freed = await ok(settle(p2, TRACK, 'running'))
  const r0 = await sample(p2, TRACK)
  await p2.waitForTimeout(500)
  const r1 = await sample(p2, TRACK)
  t.check('M-03', held && freed && h1.x === h0.x && Math.abs(speed(r0, r1) - SPEED) < 1.5,
    `mouse over the strip: ${(h1.x - h0.x).toFixed(3)}px over ${secs(h0, h1)}s; after leaving: ${speed(r0, r1).toFixed(2)} px/s`)
  await wide.close()

  // M-G3: eight live logos with their names, sixteen clones hidden and unnamed; nothing focusable.
  const imgs = await page.$$eval(`${TRACK} > img`, (els) => els.map((e) => ({ hidden: e.getAttribute('aria-hidden') === 'true', alt: e.getAttribute('alt'), tab: e.tabIndex })))
  const live = imgs.filter((i) => !i.hidden), clones = imgs.filter((i) => i.hidden)
  t.check('M-G3', live.length === 8 && live.every((i) => i.alt) && clones.length === 16 && clones.every((i) => i.alt === '') && imgs.every((i) => i.tab < 0),
    `${live.length} named logos (${live.map((i) => i.alt).join(' | ')}); ${clones.length} clones aria-hidden with alt=""; none focusable`)

  // The LF marks: hard-light, on a white track, and the moving mark looks as it does at rest.
  const blend = await page.$$eval(`${TRACK} > img[src*="/lf-"]`, (els) => els.map((e) => getComputedStyle(e).mixBlendMode))
  const bg = await page.$eval(TRACK, (el) => getComputedStyle(el).backgroundColor)
  const ctx = await t.browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const p3 = await ctx.newPage()
  await p3.goto(t.url, { waitUntil: 'networkidle' })
  await p3.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
  await p3.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const LF = `${TRACK} > img[src*="/lf-1"]:not([aria-hidden])`
  const rest = await p3.screenshot({ clip: await clipOf(p3, LF) })
  await p3.emulateMedia({ reducedMotion: 'no-preference' })
  await settle(p3, TRACK, 'running')
  // 100px of travel keeps the mark on screen and on the same subpixel phase as at rest.
  await p3.$eval(TRACK, (el) => el.getAnimations().forEach((a) => { a.pause(); a.currentTime = (100 / 30) * 1000 }))
  const moving = await p3.screenshot({ clip: await clipOf(p3, LF) })
  const dm = compare(rest, moving)
  await p3.addStyleTag({ content: '[data-section="logos"] .marquee{background-color:transparent!important}' })
  const db = compare(rest, await p3.screenshot({ clip: await clipOf(p3, LF) }))
  await ctx.close()
  t.check('M-02', blend.length === 6 && blend.every((m) => m === 'hard-light') && bg === 'rgb(255, 255, 255)' && fringeOnly(dm) && !fringeOnly(db),
    `${blend.length} LF marks ${[...new Set(blend)].join()}, track ${bg}; LF 1 after 100px of travel vs at rest, 2x: ${fmt(dm)}; the same frame without the track's white: ${fmt(db)}`)
}

export async function reduced(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const read = () => page.$eval(`${t.section} .marquee`, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', a === '0:none' && b === '0:none', `[animations:transform] on the track ${a} -> ${b} over 0.5s`)
}
