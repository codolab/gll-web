// Helpers shared by the marquee checks (logos.mjs, ribbons.mjs).
import { execFileSync } from 'node:child_process'

/** translateX of a track and the timeline time it was sampled at: both come from the same frame. */
export const sample = (page, sel) => page.$eval(sel, (el) => ({ x: new DOMMatrixReadOnly(getComputedStyle(el).transform).m41, t: document.timeline.currentTime }))
export const speed = (a, b) => (b.x - a.x) / ((b.t - a.t) / 1000)
export const secs = (a, b) => ((b.t - a.t) / 1000).toFixed(2)

/**
 * Wait until every animation of every `sel` element is in `state` ('paused' |
 * 'running') and no longer pending: a pause reports 'paused' a frame before its
 * hold time is fixed, so sampling earlier still sees one frame of travel.
 */
export const settle = (page, sel, state) => page.waitForFunction(([sel, state]) =>
  [...document.querySelectorAll(sel)].every((el) => el.getAnimations().length && el.getAnimations().every((a) => a.playState === state && !a.pending)),
  [sel, state], { timeout: 5000 })

/** Park a track's animation at `ms`, or on its last frame (shift = one full period) for 'end'; returns translateX. */
export const seek = (page, sel, ms) => page.$eval(sel, (el, ms) => {
  for (const a of el.getAnimations()) {
    a.pause()
    if (ms === 'end') { a.effect.updateTiming({ iterations: 1, fill: 'forwards' }); a.currentTime = a.effect.getComputedTiming().duration }
    else a.currentTime = ms
  }
  return new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
}, ms)

/**
 * Widest empty run inside the visible span (canvas and `clip`) over one full
 * period. The track moves rigidly, so the run is piecewise linear in the shift
 * and peaks where a box edge crosses a span edge: checking those shifts is
 * exact. The worst one is then seeked for real and re-measured.
 */
export const coverage = (page, track, clip, pxPerSec) => page.$eval(track, (el, [clip, v]) => {
  const c = document.querySelector('[data-canvas="root"]').getBoundingClientRect(), k = document.querySelector(clip).getBoundingClientRect()
  const lo = Math.max(c.left, k.left), hi = Math.min(c.right, k.right)
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
  return { ...worst, n: ds.length, live: run(spans(0), 0) }
}, [clip, pxPerSec])

/** Integer CSS-px viewport clip of an element's part inside the canvas. */
export const clipOf = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect(), c = document.querySelector('[data-canvas="root"]').getBoundingClientRect()
  const x = Math.floor(Math.max(r.left, c.left)), y = Math.floor(r.top)
  return { x, y, width: Math.ceil(Math.min(r.right, c.right)) - x, height: Math.ceil(r.bottom) - y }
})

/** Node boxes in a section, to prove that nothing moved between two frames. */
export const boxes = (page, sel) => page.$$eval(`${sel} [data-node-id]`, (els) => els.map((e) => {
  const r = e.getBoundingClientRect()
  return [e.dataset.nodeId, r.x, r.y, r.width, r.height].join()
}))

/**
 * The section alone at 2x, as the parity harness renders it, under reduced
 * motion (the rest frame). `motionOn` then starts the marquees on the same page.
 */
export async function open2x(t) {
  const page = await t.browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const url = new URL(t.url)
  url.searchParams.set('isolate', t.slug)
  await page.goto(url.href, { waitUntil: 'load' })
  await page.waitForSelector(`${t.section} [data-node-id]`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete))
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
  await page.$eval(t.section, (el) => scrollTo(0, Math.round(el.getBoundingClientRect().top + scrollY - 300)))
  return page
}
export async function motionOn(page, sel) {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await settle(page, sel, 'running')
}

const rgb = (png) => execFileSync('magick', ['png:-', '-alpha', 'off', '-depth', '8', 'rgb:-'], { input: png, maxBuffer: 1 << 28 })
/**
 * Compare two same-size captures. `core` counts differing pixels whose eight
 * neighbours differ too: a shifted, missing or re-blended element leaves solid
 * blocks, while raster rounding on a promoted layer leaves 1px fringes only.
 */
export function compare(a, b) {
  const w = a.readUInt32BE(16), h = a.readUInt32BE(20), x = rgb(a), y = rgb(b)
  const m = new Uint8Array(w * h)
  let n = 0, max = 0, core = 0
  for (let p = 0; p < w * h; p++) {
    const i = p * 3, d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]))
    if (d) { m[p] = 1; n++; max = Math.max(max, d) }
  }
  for (let r = 1; r < h - 1; r++) for (let c = 1; c < w - 1; c++) {
    let all = m[r * w + c]
    for (let k = 0; all && k < 9; k++) all = m[(r + Math.floor(k / 3) - 1) * w + c + (k % 3) - 1]
    if (all) core++
  }
  return { n, max, core, pct: (100 * n) / (w * h) }
}
export const fmt = (d) => `${d.n} px differ (${d.pct.toFixed(3)}%, max delta ${d.max}, ${d.core} beyond 1px fringes)`
export const fringeOnly = (d) => d.core === 0 && d.pct <= 0.1
