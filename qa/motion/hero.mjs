// hero: M-01, the three photo rows slide as seamless loops at 20 px/s, rows 1 and 3
// rightward and row 2 leftward. They keep moving under the pointer (it usually rests
// on the hero); the page's pause button (M-G5) and reduced motion stop them.
import { sample, speed, secs, settle, seek, coverage, boxes, open2x, motionOn, compare, fmt, fringeOnly } from './_marquee.mjs'

const GRID = '[data-node-id="94:87"]'
const HERO = '[data-node-id="94:85"]'
const GAP = 342.61328125 - 299.7864990234375 // column gap: the widest empty run a row may show
// The first hero motion (a mouse pan above 1000 px/s) made viewers motion sick: a moving area this large stays slow.
const MAX_SPEED = 25
const PITCH = 1370.43359375 / 4 // mean column pitch
const ROWS = [
  { n: 1, speed: 20, tiles: '94:88..94:92', first: '94:88' },
  { n: 2, speed: -20, tiles: '94:93..94:97', first: '94:93' },
  { n: 3, speed: 20, tiles: '94:98..94:102', first: '94:98' },
].map((r) => ({ ...r, track: `${GRID} > .marquee:nth-child(${r.n})` }))
const TRACKS = `${GRID} > .marquee`

const all = (page) => Promise.all(ROWS.map((r) => sample(page, r.track)))
const ok = (p) => p.then(() => true, () => false)

/** Viewport clip of one row (its first tile's band) inside the hero and the canvas (row 1 starts above the hero's top edge). */
const rowClip = (page, id) => page.$eval(`[data-node-id="${id}"]`, (el, hero) => {
  const r = el.getBoundingClientRect(), h = document.querySelector(hero).getBoundingClientRect()
  const c = document.querySelector('[data-canvas="root"]').getBoundingClientRect()
  const x = Math.floor(c.left), y = Math.floor(Math.max(r.top, h.top))
  return { x, y, width: Math.ceil(c.right) - x, height: Math.ceil(Math.min(r.bottom, h.bottom)) - y }
}, HERO)

export default async function (page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))

  const a = await all(page)
  await t.sleep(1000)
  const b = await all(page)
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    t.check('M-01', Math.abs(v - r.speed) < 2 && Math.abs(v) <= MAX_SPEED,
      `row ${r.n} (${r.tiles}): ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px over ${secs(a[i], b[i])}s = ${v.toFixed(2)} px/s (want ${r.speed}, cap ${MAX_SPEED})`)
  }

  // The rows keep moving with the mouse resting on the headline.
  const hero = await page.$eval(HERO, (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(hero.left + hero.width / 2, hero.top + 450)
  await t.sleep(300)
  const m0 = await all(page)
  await t.sleep(500)
  const m1 = await all(page)
  t.check('M-01', ROWS.every((r, i) => Math.abs(speed(m0[i], m1[i]) - r.speed) < 2),
    `mouse resting on the hero: ${ROWS.map((r, i) => `row ${r.n} ${speed(m0[i], m1[i]).toFixed(2)} px/s`).join(', ')}`)

  // M-G5: the page's pause button stops all three rows and starts them again.
  const toggle = () => page.$eval('main > button[aria-pressed]', (el) => el.click())
  await toggle()
  const held = await ok(settle(page, TRACKS, 'paused'))
  const h0 = await all(page)
  await t.sleep(500)
  const h1 = await all(page)
  await toggle()
  const freed = await ok(settle(page, TRACKS, 'running'))
  const f0 = await all(page)
  await t.sleep(500)
  const f1 = await all(page)
  t.check('M-G5', held && freed && ROWS.every((r, i) => h1[i].x === h0[i].x && Math.abs(speed(f0[i], f1[i]) - r.speed) < 2),
    `pause button: ${ROWS.map((r, i) => `row ${r.n} held ${(h1[i].x - h0[i].x).toFixed(3)}px over ${secs(h0[i], h1[i])}s, resumed ${speed(f0[i], f1[i]).toFixed(2)} px/s`).join('; ')}`)

  for (const r of ROWS) {
    const cov = await coverage(page, r.track, HERO, r.speed)
    t.check('M-01', cov.run <= GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
      `row ${r.n} coverage over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (column gap ${GAP.toFixed(2)}); re-measured live there: ${cov.live.toFixed(2)}px`)
  }

  const copies = await page.$$eval(`${TRACKS} > :not([data-node-id])`, (els) => els.map((e) => ({
    hidden: e.getAttribute('aria-hidden') === 'true',
    ids: e.querySelectorAll('[data-node-id]').length,
    focusable: e.querySelectorAll('a,button,input,[tabindex]').length,
  })))
  const fine = copies.length === 15 && copies.every((c) => c.hidden && !c.ids && !c.focusable)
  t.check('M-G3', fine, `${copies.length} tile copies: aria-hidden, no node id inside, nothing focusable: ${fine}`)

  // The seam: where a row meets its copies, the step must be one column pitch (no gap, no overlap).
  for (const r of ROWS) {
    const lefts = await page.$$eval(`${r.track} > *`, (els) => els.map((e) => e.getBoundingClientRect().left).sort((a, b) => a - b))
    const steps = lefts.slice(1).map((x, i) => x - lefts[i])
    const worst = Math.max(...steps.map((d) => Math.abs(d - PITCH)))
    t.check('M-01', steps.length === 9 && worst < 0.1,
      `row ${r.n} seam: 10 tiles step ${Math.min(...steps).toFixed(3)}..${Math.max(...steps).toFixed(3)}px (pitch ${PITCH.toFixed(3)}, worst off by ${worst.toFixed(3)})`)
  }

  // 2x, isolated, as the parity harness renders: rest frame, then the same page with motion on.
  // The hero is taller than 900px, so the viewport grows to hold all of it.
  const p2 = await open2x(t)
  await p2.setViewportSize({ width: 1440, height: 1100 })
  const clip = await p2.$eval(t.section, (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.right) - Math.floor(r.left), height: Math.ceil(r.bottom) - Math.floor(r.top) }
  })
  const rest = await p2.screenshot({ clip })
  const restBoxes = await boxes(p2, t.section)
  await motionOn(p2, TRACKS)
  for (const r of ROWS) await seek(p2, r.track, 0)
  const first = await p2.screenshot({ clip })
  // The scrim (94:103) over the moving rows blends with 1-level rounding: that alone may differ.
  const d0 = compare(rest, first, 1)
  const liveBoxes = await boxes(p2, t.section)
  const same = restBoxes.length === 25 && restBoxes.join('|') === liveBoxes.join('|')
  t.check('M-G1', same && fringeOnly(d0), `t=0 with motion on vs reduced-motion rest, 2x ${clip.width}x${clip.height}: ${restBoxes.length} node boxes ${same ? 'identical' : 'DIFFER'}; ${fmt(d0, 1)}`)

  for (const r of ROWS) {
    const rc = await rowClip(p2, r.first)
    const at0 = await p2.screenshot({ clip: rc })
    const endX = await seek(p2, r.track, 'end')
    const dp = compare(at0, await p2.screenshot({ clip: rc }))
    t.check('M-01', fringeOnly(dp), `row ${r.n} seamless: frame at shift ${endX} (one period) vs shift 0, 2x: ${fmt(dp)}`)
  }
  await p2.close()
}

export async function reduced(page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const read = () => Promise.all(ROWS.map((r) => page.$eval(r.track, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
}
