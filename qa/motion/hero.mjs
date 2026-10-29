// hero: M-01, the three photo rows slide as seamless loops at 20 px/s, rows 1 and 3
// rightward and row 2 leftward. They keep moving under the pointer (it usually rests
// on the hero); the page's pause button (M-G5) and reduced motion stop them.
// Wide (t.surface) has no grid group: its tiles are loose layers under the synthetic
// root, and its rows also fill the margins of a window up to 2560 (bleed).
import { sample, speed, secs, settle, seek, coverage, boxes, open2x, motionOn, compare, fmt, fringeOnly } from './_marquee.mjs'

// Tile x positions and width from the node JSON; boxes = tagged nodes in the section;
// tiles = per row, originals plus the copies that keep the row covered.
const SURFACES = {
  desktop: {
    hero: '[data-node-id="94:85"]', grid: '[data-node-id="94:87"]',
    cols: [0, 342.61328125, 685.22265625, 1027.828125, 1370.43359375], tile: 299.7864990234375,
    rows: [['94:88', '94:92'], ['94:93', '94:97'], ['94:98', '94:102']],
    boxes: 25, tiles: 10,
  },
  wide: {
    hero: '[data-node-id="wide:hero"]', grid: '[data-node-id="wide:hero"] > [data-hero-rows]',
    cols: [-130.97216796875, 259.226318359375, 649.420166015625, 1039.60986328125, 1429.79931640625], tile: 341.42352294921875,
    rows: [['173:314', '173:318'], ['173:319', '173:323'], ['173:324', '173:328']],
    boxes: 24, tiles: 12,
    bands: ['173:312', '173:329'], // Rectangle 15 and the Rectangle 14 scrim reach the window edges
  },
}
// The first hero motion (a mouse pan above 1000 px/s) made viewers motion sick: a moving area this large stays slow.
const MAX_SPEED = 25

function setup(surface) {
  const s = SURFACES[surface]
  return {
    ...s,
    GAP: Math.max(...s.cols.slice(1).map((x, i) => x - s.cols[i])) - s.tile, // the widest empty run a row may show
    PITCH: (s.cols[4] - s.cols[0]) / 4, // mean column pitch
    TRACKS: `${s.grid} > .marquee`,
    ROWS: s.rows.map(([a, b], i) => ({ n: i + 1, speed: [20, -20, 20][i], tiles: `${a}..${b}`, first: a, track: `${s.grid} > .marquee:nth-child(${i + 1})` })),
  }
}

const ok = (p) => p.then(() => true, () => false)

/** Viewport clip of one row (its first tile's band) inside the hero and the canvas (row 1 starts above the hero's top edge). */
const rowClip = (page, id, hero) => page.$eval(`[data-node-id="${id}"]`, (el, hero) => {
  const r = el.getBoundingClientRect(), h = document.querySelector(hero).getBoundingClientRect()
  const c = document.querySelector('[data-canvas="root"]').getBoundingClientRect()
  const x = Math.floor(c.left), y = Math.floor(Math.max(r.top, h.top))
  return { x, y, width: Math.ceil(c.right) - x, height: Math.ceil(Math.min(r.bottom, h.bottom)) - y }
}, hero)

/**
 * coverage() over the whole window instead of the canvas: in a window wider than
 * the frame the rows run on into the margins. Exact at the edge-crossing shifts,
 * and the worst one is seeked for real and re-measured.
 */
const windowCoverage = (page, track, pxPerSec) => page.$eval(track, (el, v) => {
  const lo = 0, hi = document.documentElement.clientWidth
  const spans = (dx) => [...el.children].map((n) => n.getBoundingClientRect()).map((r) => [r.left - dx, r.right - dx]).sort((p, q) => p[0] - q[0])
  const run = (sp, d) => {
    let edge = lo, max = 0
    for (const [l, r] of sp) { if (l + d > edge) max = Math.max(max, Math.min(l + d, hi) - edge); edge = Math.max(edge, r + d) }
    return Math.max(max, hi - edge)
  }
  const rest = spans(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)
  const period = Math.abs(parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift'))), dir = Math.sign(v)
  const ds = [0, dir * period, ...rest.flat().flatMap((e) => [lo - e, hi - e])].filter((d) => d * dir >= 0 && d * dir <= period)
  let worst = { run: -1, d: 0 }
  for (const d of ds) { const r = run(rest, d); if (r > worst.run) worst = { run: r, d } }
  for (const a of el.getAnimations()) { a.pause(); a.currentTime = (Math.abs(worst.d) / Math.abs(v)) * 1000 }
  return { ...worst, n: ds.length, live: run(spans(0), 0), vw: hi }
}, pxPerSec)

/** Wide only: at 1920 and 2560 the band fills and the moving rows cover the whole window, margins included. */
async function bleed(t, C) {
  for (const width of [1920, 2560]) {
    const page = await t.browser.newPage({ viewport: { width, height: 1100 } })
    await page.goto(t.url, { waitUntil: 'networkidle' })
    await settle(page, C.TRACKS, 'running')
    const bands = await page.$$eval(C.bands.map((id) => `[data-node-id="${id}"]`).join(), (els) => els.map((e) => {
      const r = e.getBoundingClientRect()
      return { id: e.dataset.nodeId, l: r.left, r: r.right }
    }))
    const full = bands.length === 2 && bands.every((b) => Math.abs(b.l) < 0.01 && Math.abs(b.r - width) < 0.01)
    t.check('M-01', full, `${width}x1100: the hero band fills reach the window edges: ${bands.map((b) => `${b.id} ${b.l.toFixed(2)}..${b.r.toFixed(2)}`).join(', ')}`)
    for (const r of C.ROWS) {
      const cov = await windowCoverage(page, r.track, r.speed)
      t.check('M-01', cov.vw === width && cov.run <= C.GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
        `${width}x1100 row ${r.n} covers the window 0..${cov.vw} over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (column gap ${C.GAP.toFixed(2)}); re-measured live there: ${cov.live.toFixed(2)}px`)
    }
    await page.close()
  }
}

export default async function (page, t) {
  const C = setup(t.surface)
  const { ROWS, TRACKS, GAP, PITCH } = C
  const all = () => Promise.all(ROWS.map((r) => sample(page, r.track)))
  await page.evaluate(() => window.scrollTo(0, 0))

  const a = await all()
  await t.sleep(1000)
  const b = await all()
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    t.check('M-01', Math.abs(v - r.speed) < 2 && Math.abs(v) <= MAX_SPEED,
      `row ${r.n} (${r.tiles}): ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px over ${secs(a[i], b[i])}s = ${v.toFixed(2)} px/s (want ${r.speed}, cap ${MAX_SPEED})`)
  }

  // The rows keep moving with the mouse resting on the headline.
  const hero = await page.$eval(C.hero, (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(hero.left + hero.width / 2, hero.top + 450)
  await t.sleep(300)
  const m0 = await all()
  await t.sleep(500)
  const m1 = await all()
  t.check('M-01', ROWS.every((r, i) => Math.abs(speed(m0[i], m1[i]) - r.speed) < 2),
    `mouse resting on the hero: ${ROWS.map((r, i) => `row ${r.n} ${speed(m0[i], m1[i]).toFixed(2)} px/s`).join(', ')}`)

  // M-G5: the page's pause button stops all three rows and starts them again.
  const toggle = () => page.$eval('main > button[aria-pressed]', (el) => el.click())
  await toggle()
  const held = await ok(settle(page, TRACKS, 'paused'))
  const h0 = await all()
  await t.sleep(500)
  const h1 = await all()
  await toggle()
  const freed = await ok(settle(page, TRACKS, 'running'))
  const f0 = await all()
  await t.sleep(500)
  const f1 = await all()
  t.check('M-G5', held && freed && ROWS.every((r, i) => h1[i].x === h0[i].x && Math.abs(speed(f0[i], f1[i]) - r.speed) < 2),
    `pause button: ${ROWS.map((r, i) => `row ${r.n} held ${(h1[i].x - h0[i].x).toFixed(3)}px over ${secs(h0[i], h1[i])}s, resumed ${speed(f0[i], f1[i]).toFixed(2)} px/s`).join('; ')}`)

  for (const r of ROWS) {
    const cov = await coverage(page, r.track, C.hero, r.speed)
    t.check('M-01', cov.run <= GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
      `row ${r.n} coverage over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (column gap ${GAP.toFixed(2)}); re-measured live there: ${cov.live.toFixed(2)}px`)
  }

  const copies = await page.$$eval(`${TRACKS} > :not([data-node-id])`, (els) => els.map((e) => ({
    hidden: e.getAttribute('aria-hidden') === 'true',
    ids: e.querySelectorAll('[data-node-id]').length,
    focusable: e.querySelectorAll('a,button,input,[tabindex]').length,
  })))
  const fine = copies.length === 3 * (C.tiles - 5) && copies.every((c) => c.hidden && !c.ids && !c.focusable)
  t.check('M-G3', fine, `${copies.length} tile copies: aria-hidden, no node id inside, nothing focusable: ${fine}`)

  // The seam: where a row meets its copies, the step must be one column pitch (no gap, no overlap).
  for (const r of ROWS) {
    const lefts = await page.$$eval(`${r.track} > *`, (els) => els.map((e) => e.getBoundingClientRect().left).sort((a, b) => a - b))
    const steps = lefts.slice(1).map((x, i) => x - lefts[i])
    const worst = Math.max(...steps.map((d) => Math.abs(d - PITCH)))
    t.check('M-01', steps.length === C.tiles - 1 && worst < 0.1,
      `row ${r.n} seam: ${C.tiles} tiles step ${Math.min(...steps).toFixed(3)}..${Math.max(...steps).toFixed(3)}px (pitch ${PITCH.toFixed(3)}, worst off by ${worst.toFixed(3)})`)
  }

  // 2x, isolated, as the parity harness renders: rest frame, then the same page with motion on.
  // The hero is taller than 900px, so the viewport grows to hold all of it.
  const p2 = await open2x(t)
  await p2.setViewportSize({ width: t.width, height: 1100 })
  // open2x opens at 1440: under wide the canvas re-fits to 1x after the resize event.
  await p2.waitForFunction((w) => document.querySelector('[data-canvas="root"]').getBoundingClientRect().width === w, t.width)
  const clip = await p2.$eval(t.section, (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.right) - Math.floor(r.left), height: Math.ceil(r.bottom) - Math.floor(r.top) }
  })
  const rest = await p2.screenshot({ clip })
  const restBoxes = await boxes(p2, t.section)
  await motionOn(p2, TRACKS)
  for (const r of ROWS) await seek(p2, r.track, 0)
  const first = await p2.screenshot({ clip })
  // The scrim over the moving rows blends with 1-level rounding: that alone may differ.
  const d0 = compare(rest, first, 1)
  const liveBoxes = await boxes(p2, t.section)
  const same = restBoxes.length === C.boxes && restBoxes.join('|') === liveBoxes.join('|')
  t.check('M-G1', same && fringeOnly(d0), `t=0 with motion on vs reduced-motion rest, 2x ${clip.width}x${clip.height}: ${restBoxes.length} node boxes ${same ? 'identical' : 'DIFFER'}; ${fmt(d0, 1)}`)

  for (const r of ROWS) {
    const rc = await rowClip(p2, r.first, C.hero)
    const at0 = await p2.screenshot({ clip: rc })
    const endX = await seek(p2, r.track, 'end')
    const dp = compare(at0, await p2.screenshot({ clip: rc }))
    t.check('M-01', fringeOnly(dp), `row ${r.n} seamless: frame at shift ${endX} (one period) vs shift 0, 2x: ${fmt(dp)}`)
  }
  await p2.close()

  if (C.bands) await bleed(t, C)
}

export async function reduced(page, t) {
  const { ROWS } = setup(t.surface)
  await page.evaluate(() => window.scrollTo(0, 0))
  const read = () => Promise.all(ROWS.map((r) => page.$eval(r.track, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
}
