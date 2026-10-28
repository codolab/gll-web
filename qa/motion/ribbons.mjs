// ribbons: M-07, the two type rows scroll in opposite directions at 40 px/s, seamless loops.
// The page's pause button (M-G5) is checked for these rows too, in logos.mjs.
import { sample, speed, secs, seek, coverage, clipOf, boxes, open2x, motionOn, compare, fmt, fringeOnly } from './_marquee.mjs'

const GAP = 32 // phrase-to-dot spacing in both rows: the widest empty run a row may show
const ROWS = [
  { node: '94:140', speed: -40, name: '"Connect globally"' },
  { node: '94:147', speed: 40, name: '"Grow together"' },
].map((r) => ({ ...r, sel: `[data-node-id="${r.node}"]`, track: `[data-node-id="${r.node}"] > .marquee` }))

export default async function (page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))

  const a = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  await t.sleep(1000)
  const b = await Promise.all(ROWS.map((r) => sample(page, r.track)))
  for (const [i, r] of ROWS.entries()) {
    const v = speed(a[i], b[i])
    const period = await page.$eval(r.track, (el) => Math.abs(parseFloat(getComputedStyle(el).getPropertyValue('--marquee-shift'))))
    t.check('M-07', Math.abs(v - r.speed) < 2, `${r.node} ${r.name}: ${a[i].x.toFixed(2)} -> ${b[i].x.toFixed(2)}px over ${secs(a[i], b[i])}s = ${v.toFixed(2)} px/s (want ${r.speed}); period ${period}px = ${(period / 40).toFixed(2)}s`)
  }

  for (const r of ROWS) {
    const cov = await coverage(page, r.track, r.sel, r.speed)
    t.check('M-07', cov.run <= GAP + 0.5 && Math.abs(cov.live - cov.run) < 0.05,
      `${r.node} coverage over one period, exact at ${cov.n} edge-crossing shifts: widest empty run ${cov.run.toFixed(2)}px at shift ${cov.d.toFixed(2)} (design gap ${GAP}); re-measured live there: ${cov.live.toFixed(2)}px`)
  }

  // Phrase clones are hidden from assistive tech; dot clones are empty boxes with nothing to hide.
  const clones = await page.$$eval(`${t.section} .marquee > :not([data-node-id])`, (els) => els.map((e) => ({
    hidden: e.getAttribute('aria-hidden') === 'true' || !e.textContent.trim(),
    ids: e.querySelectorAll('[data-node-id]').length,
    focusable: e.querySelectorAll('a,button,input,[tabindex]').length,
  })))
  const fine = clones.length === 8 && clones.every((c) => c.hidden && !c.ids && !c.focusable)
  t.check('M-G3', fine, `${clones.length} clone dots/phrases: no node id inside, no exposed text, nothing focusable: ${fine}`)

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
  const same = restBoxes.length === 16 && restBoxes.join('|') === liveBoxes.join('|')
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
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const read = () => Promise.all(ROWS.map((r) => page.$eval(r.track, (el) => `${el.getAnimations().length}:${getComputedStyle(el).transform}`)))
  const a = await read()
  await t.sleep(500)
  const b = await read()
  t.check('M-G2', [...a, ...b].every((s) => s === '0:none'), `per row [animations:transform] ${a.join(', ')} -> ${b.join(', ')} over 0.5s`)
}
