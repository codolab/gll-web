// M-09: the impact numbers (94:189, 94:193, 94:197) count up from 0 once the
// section is 40% visible, 1.8s ease-out cubic, once per load; the final frame is
// the Figma strings, assistive tech always reads those (M-G1), and reduced
// motion shows them without counting. One t.check per aspect.
const IDS = ['94:189', '94:193', '94:197']
const FINAL = ['10,000+', '60+', '10+']
const TARGET = [10000, 60, 10]
const EN = /^\d{1,3}(,\d{3})*\+$/
const num = (s) => Number(s.replace(/\D/g, ''))
// 1.8s ease-out cubic: 10,000 first rounds to its final value at 1 - (1 - t)^3 >= 0.99995.
const SETTLE = 1.8 * (1 - Math.cbrt(0.00005))
const f2 = (n) => n.toFixed(2)

/** The digits a sighted visitor sees: the aria-hidden count while counting, else the text. */
const shown = (page) => page.evaluate((ids) => ids.map((id) => {
  const el = document.querySelector(`[data-node-id="${id}"]`)
  return (el.querySelector('[aria-hidden="true"]') ?? el).textContent
}), IDS)
const html = (page) => page.evaluate((ids) => ids.map((id) => document.querySelector(`[data-node-id="${id}"]`).innerHTML), IDS)
/** What assistive tech reads for each number node. */
const spoken = (page) => Promise.all(IDS.map((id) => page.locator(`[data-node-id="${id}"]`).ariaSnapshot()))
const readsFinal = (snaps) => snaps.every((s, i) => s.trim() === `- paragraph: ${FINAL[i]}`)

/** Every frame, record the shown strings when they change: what each paint shows. */
function recorder(ids) {
  window.__rec = []
  const f = (now) => {
    const v = ids.map((id) => {
      const el = document.querySelector(`[data-node-id="${id}"]`)
      return el ? (el.querySelector('[aria-hidden="true"]') ?? el).textContent : null
    })
    const last = window.__rec.at(-1)
    if (!last || last[1].join('|') !== v.join('|')) window.__rec.push([now, v])
    requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}

/** Visible fraction of the section, and scroll it so that `frac` of it shows from the bottom. */
const visible = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect()
  return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height
})
const peek = (page, sel, frac) => page.$eval(sel, (el, f) => {
  const r = el.getBoundingClientRect()
  scrollBy(0, r.top - (innerHeight - f * r.height))
}, frac)

/** Count timing from recorded frames: start, end, ease-out at mid-time, formats. */
function analyse(rec) {
  const live = rec.filter(([, v]) => v[0] !== null)
  const iStart = live.findIndex(([, v]) => v.some((s, i) => num(s) > 0 && s !== FINAL[i]))
  const iEnd = live.findIndex(([, v]) => v.every((s, i) => s === FINAL[i]))
  const tStart = live[iStart]?.[0]
  const tEnd = live[iEnd]?.[0]
  const mid = live.filter(([t]) => t <= tStart + (tEnd - tStart) / 2).at(-1)
  const counting = live.slice(Math.max(0, iStart), iEnd)
  return {
    first: live[0]?.[1], tFirst: live[0]?.[0], tStart, dur: (tEnd - tStart) / 1000,
    midFrac: mid ? num(mid[1][0]) / TARGET[0] : NaN, frames: counting.length,
    monotonic: counting.every(([, v], i) => !i || v.every((s, k) => num(s) >= num(counting[i - 1][1][k]))),
    formatted: counting.every(([, v]) => v.every((s) => EN.test(s))),
    comma: counting.some(([, v]) => num(v[0]) >= 1000 && v[0].includes(',')),
    flash: live.slice(0, Math.max(0, iStart)).some(([, v]) => v.join() === FINAL.join()),
  }
}

export default async function (page, t) {
  const sec = t.section
  // Other builders' edits can hot-reload the shared dev page mid-run, re-arming the count.
  await page.evaluate(() => { window.__same = true })
  // Off screen at load: parked at 0, while assistive tech reads the finals.
  const offRatio = await visible(page, sec)
  const parked = await shown(page)
  const parkedSpoken = await spoken(page)
  t.check('M-09', offRatio === 0 && parked.every((s) => s === '0+'),
    `parked off screen: ${f2(offRatio)} visible, shows ${parked.join(' ')}`)

  await peek(page, sec, 0.25)
  await t.sleep(500)
  const peekRatio = await visible(page, sec)
  const atPeek = await shown(page)
  t.check('M-09', peekRatio > 0.1 && peekRatio < 0.4 && atPeek.every((s) => s === '0+'),
    `40% threshold: at ${f2(peekRatio)} visible still ${atPeek.join(' ')}`)

  await page.evaluate(recorder, IDS)
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'center' }))
  const t0 = Date.now()
  await t.sleep(300 - (Date.now() - t0))
  const at300 = await shown(page)
  const midSpoken = await spoken(page)
  t.check('M-09', at300.every((s, i) => EN.test(s) && num(s) > 0 && num(s) < TARGET[i]),
    `counting: ${Date.now() - t0}ms after scrolling in shows ${at300.join(' ')}`)

  await t.sleep(2500 - (Date.now() - t0))
  const finalHtml = await html(page)
  const glyphs = await page.$eval(`[data-node-id="${IDS[0]}"]`, (el) => getComputedStyle(el).fontVariantNumeric)
  t.check('M-09', finalHtml.every((s, i) => s === FINAL[i]) && glyphs === 'normal',
    `final frame: ${Date.now() - t0}ms after scrolling in innerHTML ${finalHtml.map((s) => JSON.stringify(s)).join(' ')}, font-variant-numeric ${glyphs}`)

  const run = analyse(await page.evaluate(() => window.__rec))
  t.check('M-09', Math.abs(run.dur - SETTLE) < 0.15 && run.midFrac > 0.8 && run.midFrac < 0.95,
    `easing: first counted frame to final strings ${f2(run.dur)}s over ${run.frames} frames (1.8s run settles at ${f2(SETTLE)}s), ` +
    `${Math.round(run.midFrac * 100)}% of 10,000 at half time (ease-out cubic 88%)`)
  t.check('M-09', run.formatted && run.comma && run.monotonic && !run.flash,
    `format: every frame en-US with "+" ${run.formatted}, thousands comma seen ${run.comma}, never decreases ${run.monotonic}, final before counting ${run.flash}`)

  t.check('M-09', [parkedSpoken, midSpoken].every(readsFinal) && readsFinal(await spoken(page)),
    `assistive tech: parked ${parkedSpoken.join(' | ')}; mid-count ${midSpoken.join(' | ')} (aria-hidden count + sr-only final)`)

  // Once per load: away and back changes nothing.
  await page.evaluate(() => scrollTo(0, 0))
  await t.sleep(400)
  await page.evaluate(() => { window.__rec = [] })
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(800)
  const again = await page.evaluate(() => window.__rec.map(([, v]) => v.join(' ')))
  t.check('M-09', again.length === 1 && again[0] === FINAL.join(' '),
    `once per load: away and back, ${again.length - 1} changes (${again.join(' / ')})`)
  if (!(await page.evaluate(() => window.__same))) t.check('M-09', false, 'page reloaded mid-run (dev server hot reload): the checks above saw a reset page, rerun')

  // Already in view at mount: a viewport tall enough to show the section at load.
  const tall = await t.browser.newPage({ viewport: { width: 1440, height: 4800 }, reducedMotion: 'no-preference' })
  await tall.addInitScript(recorder, IDS)
  await tall.goto(t.url, { waitUntil: 'load' })
  await t.sleep(2800)
  const mountRatio = await visible(tall, sec)
  const scrolled = await tall.evaluate(() => scrollY)
  const mount = analyse(await tall.evaluate(() => window.__rec))
  await tall.close()
  t.check('M-09',
    mountRatio > 0.4 && scrolled === 0 && mount.first?.join() === '0+,0+,0+' && !mount.flash &&
      mount.tStart - mount.tFirst < 500 && Math.abs(mount.dur - SETTLE) < 0.15 && mount.monotonic,
    `in view at mount: ${f2(mountRatio)} visible, scrollY ${scrolled}; first paint ${mount.first?.join(' ')}, ` +
    `count starts ${Math.round(mount.tStart - mount.tFirst)}ms later, ${f2(mount.dur)}s, final before counting ${mount.flash}`)
}

export async function reduced(page, t) {
  const sec = t.section
  const parked = await html(page)
  await page.evaluate(recorder, IDS)
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(2500)
  const after = await html(page)
  const rec = await page.evaluate(() => window.__rec.map(([, v]) => v.join(' ')))
  const snaps = await spoken(page)
  t.check('M-09', parked.every((s, i) => s === FINAL[i]) && after.every((s, i) => s === FINAL[i]) && rec.length === 1,
    `reduced, no count: before scroll ${parked.join(' ')}; 2.5s after scrolling in ${after.join(' ')}; distinct frames ${rec.length}`)
  t.check('M-09', readsFinal(snaps), `reduced, assistive tech: ${snaps.join(' | ')}`)
}
