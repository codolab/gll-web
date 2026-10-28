// logos: M-02 (strip scrolls left at 30 px/s, seamless loop), M-03 (hover pause),
// and M-G5 (the page's pause button stops every marquee, the ribbons included).
import { sample, speed, secs, settle, seek, coverage, clipOf, boxes, open2x, motionOn, compare, fmt, fringeOnly } from './_marquee.mjs'

const SPEED = -30
const GAP = 70.8085 // the strip's auto-layout spacing: the widest empty run the row may show
const TRACK = '[data-section="logos"] .marquee'
const PAUSE = 'main > button[aria-pressed]'
const ALL = [[TRACK, SPEED], ['[data-node-id="94:140"] > .marquee', -40], ['[data-node-id="94:147"] > .marquee', 40]]
const ok = (p) => p.then(() => true, () => false)

export default async function (page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const period = await page.$eval(TRACK, (el) => -parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift')))

  const a = await sample(page, TRACK)
  await t.sleep(1000)
  const b = await sample(page, TRACK)
  const v = speed(a, b)
  t.check('M-02', Math.abs(v - SPEED) < 1.5, `track ${a.x.toFixed(2)} -> ${b.x.toFixed(2)}px over ${secs(a, b)}s = ${v.toFixed(2)} px/s (want ${SPEED}, leftward); period ${period}px = ${(period / -SPEED).toFixed(2)}s`)

  // M-03: hover the strip, then leave it. The play state lands a style recalc later, so wait for it.
  const strip = await clipOf(page, '[data-node-id="94:111"]')
  await page.mouse.move(strip.x + strip.width / 2, strip.y + strip.height / 2)
  const held = await ok(settle(page, TRACK, 'paused'))
  const h0 = await sample(page, TRACK)
  await t.sleep(500)
  const h1 = await sample(page, TRACK)
  await page.mouse.move(strip.x + strip.width / 2, strip.y - 150)
  const freed = await ok(settle(page, TRACK, 'running'))
  const r0 = await sample(page, TRACK)
  await t.sleep(500)
  const r1 = await sample(page, TRACK)
  const vr = speed(r0, r1)
  t.check('M-03', held && freed && h1.x === h0.x && Math.abs(vr - SPEED) < 1.5,
    `hovered: ${h0.x.toFixed(3)} -> ${h1.x.toFixed(3)}px over ${secs(h0, h1)}s; after leaving: ${(r1.x - r0.x).toFixed(2)}px over ${secs(r0, r1)}s = ${vr.toFixed(2)} px/s`)

  // M-G5: Tab once reaches the pause button, which shows itself; Enter pauses all three tracks, Enter again resumes.
  const hidden = await page.$eval(PAUSE, (el) => el.getBoundingClientRect().bottom <= 0)
  await page.keyboard.press('Tab')
  const shown = await ok(page.waitForFunction((sel) => {
    const el = document.querySelector(sel), r = el.getBoundingClientRect()
    return document.activeElement === el && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
  }, PAUSE, { timeout: 5000 }))
  const pressed = (v) => ok(page.waitForFunction(([sel, v]) => document.querySelector(sel).getAttribute('aria-pressed') === v, [PAUSE, v], { timeout: 5000 }))
  const measure = async () => {
    const s0 = await Promise.all(ALL.map(([s]) => sample(page, s)))
    await t.sleep(500)
    const s1 = await Promise.all(ALL.map(([s]) => sample(page, s)))
    return ALL.map((_, i) => speed(s0[i], s1[i]))
  }
  await page.keyboard.press('Enter')
  const on = (await pressed('true')) && (await ok(settle(page, '.marquee', 'paused')))
  const still = await measure()
  await page.keyboard.press('Enter')
  const off = (await pressed('false')) && (await ok(settle(page, '.marquee', 'running')))
  const again = await measure()
  const resumed = again.every((s, i) => Math.abs(s - ALL[i][1]) < 2)
  t.check('M-G5', hidden && shown && on && still.every((s) => s === 0) && off && resumed,
    `hidden before focus: ${hidden}; Tab focuses it inside the viewport: ${shown}; Enter -> aria-pressed true, tracks (logos, 94:140, 94:147) at ${still.map((s) => s.toFixed(2)).join(' / ')} px/s; Enter -> false: ${again.map((s) => s.toFixed(2)).join(' / ')} px/s`)
  await page.$eval(PAUSE, (el) => el.blur())

  const cov = await coverage(page, TRACK, '[data-canvas="root"]', SPEED)
  t.check('M-02', cov.run <= GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
    `coverage over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (design gap ${GAP}); re-measured live there: ${cov.live.toFixed(2)}px`)

  const clones = await page.$$eval(`${TRACK} > img:not([data-node-id])`, (els) => els.map((e) => ({ aria: e.getAttribute('aria-hidden'), alt: e.getAttribute('alt'), tab: e.tabIndex })))
  const fine = clones.length === 8 && clones.every((c) => c.aria === 'true' && c.alt === '' && c.tab < 0)
  t.check('M-G3', fine, `${clones.length} clone logos: no node id, aria-hidden, alt="", not focusable: ${fine}`)

  // 2x, isolated, as the parity harness renders: rest frame, then the same page with motion on.
  const p2 = await open2x(t)
  const lf = '[data-node-id="94:116"]'
  const pad = (c) => ({ x: c.x - 2, y: c.y - 2, width: c.width + 4, height: c.height + 4 })
  const clip = await clipOf(p2, t.section)
  const rest = await p2.screenshot({ clip })
  const lfRest = await p2.screenshot({ clip: pad(await clipOf(p2, lf)) })
  const restBoxes = await boxes(p2, t.section)
  const promote = await p2.addStyleTag({ content: '.marquee{will-change:transform}' })
  const promoted = await p2.screenshot({ clip })
  await promote.evaluate((n) => n.remove())

  await motionOn(p2, TRACK)
  await seek(p2, TRACK, 0)
  const first = await p2.screenshot({ clip })
  const d0 = compare(rest, first), dc = compare(promoted, first)
  const liveBoxes = await boxes(p2, t.section)
  const same = restBoxes.length === 9 && restBoxes.join('|') === liveBoxes.join('|')
  t.check('M-G1', same && fringeOnly(d0) && dc.n === 0,
    `t=0 with motion on vs reduced-motion rest, 2x ${clip.width}x${clip.height}: ${restBoxes.length} node boxes ${same ? 'identical' : 'DIFFER'}; ${fmt(d0)}; vs the rest frame on a promoted layer (will-change only): ${dc.n} px differ`)

  const endX = await seek(p2, TRACK, 'end')
  const dp = compare(first, await p2.screenshot({ clip }))
  t.check('M-02', fringeOnly(dp), `seamless: frame at shift ${endX} (one period) vs shift 0, 2x: ${fmt(dp)}`)

  // HARD_LIGHT trap: the moving LF mark must look as it does at rest. 10s = exactly 300px of travel.
  const midX = await seek(p2, TRACK, 10000)
  const dm = compare(lfRest, await p2.screenshot({ clip: pad(await clipOf(p2, lf)) }))
  await p2.addStyleTag({ content: '.marquee{background-color:transparent!important}' })
  const db = compare(lfRest, await p2.screenshot({ clip: pad(await clipOf(p2, lf)) }))
  t.check('M-02', fringeOnly(dm) && !fringeOnly(db),
    `hard-light: LF 94:116 at shift ${midX} vs rest, 2x: ${fmt(dm)}; same frame without the track's white: ${fmt(db)}`)
  await p2.close()
}

export async function reduced(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const read = () => page.$eval(TRACK, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', a === '0:none' && b === '0:none', `[animations:transform] on the track ${a} -> ${b} over 0.5s`)
  const buttons = await page.$$eval('button', (els) => els.filter((e) => /pause moving content/i.test(e.textContent)).length)
  t.check('M-G5', buttons === 0, `pause button under reduced motion: ${buttons} rendered`)
}
