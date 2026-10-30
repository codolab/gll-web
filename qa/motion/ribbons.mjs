// ribbons: M-07, the two type rows scroll in opposite directions at 40 px/s, seamless loops,
// and both rows pause while the section is hovered (like the logos, M-03).
// The page's pause button (M-G5) is checked for these rows too, in logos.mjs.
import { sample, speed, secs, settle, seek, coverage, clipOf, boxes, open2x, openWide, motionOn, compare, fmt, fringeOnly } from './_marquee.mjs'

const GAP = 32 // phrase-to-dot spacing in both rows: the widest empty run a row may show
// Row node ids per canvas, and how many nodes the section tags (root, rows, dot groups + vectors, phrases).
const NODES = {
  desktop: { rows: ['94:140', '94:147'], tagged: 16, items: 9 },
  wide: { rows: ['173:367', '173:377'], tagged: 19, items: 11 },
}
let ROWS = []
const rowsFor = (surface) => [
  { speed: -40, name: '"Connect globally"' },
  { speed: 40, name: '"Grow together"' },
].map((r, i) => {
  const node = NODES[surface].rows[i]
  return { ...r, node, sel: `[data-node-id="${node}"]`, track: `[data-node-id="${node}"] > .marquee` }
})

export default async function (page, t) {
  ROWS = rowsFor(t.surface)
  const N = NODES[t.surface]
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))

  const a = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  await t.sleep(1000)
  const b = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    const period = await page.$eval(r.track, (el) => Math.abs(parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift'))))
    t.check('M-07', Math.abs(v - r.speed) < 2, `${r.node} ${r.name}: ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px over ${secs(a[i], b[i])}s = ${v.toFixed(2)} px/s (want ${r.speed}); period ${period}px = ${(period / 40).toFixed(2)}s`)
  }

  // Hover pause: point at the gap between the rows, then leave. The play state lands a recalc later.
  const sec = await clipOf(page, t.section)
  await page.mouse.move(sec.x + sec.width / 2, sec.y + 120)
  const held = await Promise.all(ROWS.map((r) => settle(page, r.track, 'paused').then(() => true, () => false)))
  const h0 = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  await t.sleep(500)
  const h1 = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  await page.mouse.move(sec.x + sec.width / 2, sec.y - 150)
  const freed = await Promise.all(ROWS.map((r) => settle(page, r.track, 'running').then(() => true, () => false)))
  const f0 = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  await t.sleep(500)
  const f1 = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  t.check('M-07', held.every(Boolean) && freed.every(Boolean) && ROWS.every((r, i) => h1[i].x === h0[i].x && Math.abs(speed(f0[i], f1[i]) - r.speed) < 2),
    `hover pause: ${ROWS.map((r, i) => `${r.node} held ${(h1[i].x - h0[i].x).toFixed(3)}px over ${secs(h0[i], h1[i])}s, after leaving ${speed(f0[i], f1[i]).toFixed(2)} px/s`).join('; ')}`)

  for (const r of ROWS) {
    const cov = await coverage(page, r.track, r.sel, r.speed)
    t.check('M-07', cov.run <= GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
      `${r.node} coverage over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (design gap ${GAP}); re-measured live there: ${cov.live.toFixed(2)}px`)
  }

  // Bleed: wider windows show the canvas at 1x with margins; each row must fill them all through the loop.
  for (const width of [1920, 2560]) {
    const { page: wp, bleed } = await openWide(t, width)
    for (const r of ROWS) {
      const wc = await coverage(wp, r.track, null, r.speed)
      t.check('M-07', bleed > 0 && wc.run <= GAP + 0.5 && Math.abs(wc.live - wc.run) < 0.05,
        `${r.node} bleed at ${width}px (canvas bleed ${bleed}px each side): widest empty run across the window over one period ${wc.run.toFixed(2)}px at shift ${wc.d.toFixed(2)} (design gap ${GAP}); re-measured live: ${wc.live.toFixed(2)}px`)
    }
    await wp.close()
  }

  // Phrase clones are hidden from assistive tech; dot clones are empty boxes with nothing to hide.
  // At least one full period of clones per row fills the loop and the bleed.
  const clones = await page.$$eval(`${t.section} .marquee > :not([data-node-id])`, (els) => els.map((e) => ({
    hidden: e.getAttribute('aria-hidden') === 'true' || !e.textContent.trim(),
    ids: e.querySelectorAll('[data-node-id]').length,
    focusable: e.querySelectorAll('a,button,input,[tabindex]').length,
  })))
  const fine = clones.length >= N.items && clones.every((c) => c.hidden && !c.ids && !c.focusable)
  t.check('M-G3', fine, `${clones.length} clone dots/phrases (rows of ${N.items} items): no node id inside, no exposed text, nothing focusable: ${fine}`)

  // 2x, isolated, as the parity harness renders: rest frame, then the same page with motion on.
  const p2 = await open2x(t)
  const clip = await clipOf(p2, t.section)
  const rest = await p2.screenshot({ clip })
  const restBoxes = await boxes(p2, t.section)
  await motionOn(p2, `${t.section} .marquee`)
  for (const r of ROWS) await seek(p2, r.track, 0)
  const first = await p2.screenshot({ clip })
  const d0 = compare(rest, first)
  const liveBoxes = await boxes(p2, t.section)
  const same = restBoxes.length === N.tagged && restBoxes.join('|') === liveBoxes.join('|')
  t.check('M-G1', same && fringeOnly(d0), `t=0 with motion on vs reduced-motion rest, 2x ${clip.width}x${clip.height}: ${restBoxes.length} node boxes ${same ? 'identical' : 'DIFFER'}; ${fmt(d0)}`)

  for (const r of ROWS) {
    const rc = await clipOf(p2, r.sel)
    const at0 = await p2.screenshot({ clip: rc })
    const endX = await seek(p2, r.track, 'end')
    const dp = compare(at0, await p2.screenshot({ clip: rc }))
    t.check('M-07', dp.n === 0, `${r.node} seamless: frame at shift ${endX} (one period) vs shift 0, 2x: ${fmt(dp)}`)
  }
  await p2.close()
}

export async function reduced(page, t) {
  ROWS = rowsFor(t.surface)
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const read = () => Promise.all(ROWS.map((r) => page.$eval(r.track, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
}
