// impact on mobile (MOBILE_SPEC.md 7): copy, the fluid headline fitting the
// window, and the M-09 count-up. The numbers sit at 0 until 40% of the stats list
// is in view, count to 10,000+ / 60+ / 10+ once per load, assistive tech reads the
// finals throughout, and reduced motion shows the finals without counting.
const FINAL = ['10,000+', '60+', '10+']
const TARGET = [10000, 60, 10]
const CAPS = ['Lithuanian professionals', 'Countries represented', 'programs for engagement to contribute to Lithuania']
const EN = /^\d{1,3}(,\d{3})*\+$/
const num = (s) => Number(s.replace(/\D/g, ''))

const STATS = (sec) => `${sec} ul`
/** The digits a sighted visitor sees: the aria-hidden count while counting, else the text. */
const shown = (page, sec) => page.$$eval(`${sec} [data-stat]`, (els) => els.map((el) => (el.querySelector('[aria-hidden="true"]') ?? el).textContent))
/** What assistive tech reads: the accessibility tree of the stats list. */
const spoken = (page, sec) => page.locator(STATS(sec)).ariaSnapshot()
const readsFinal = (snap) => {
  const paras = [...snap.matchAll(/paragraph: (.+)/g)].map((m) => m[1].trim())
  return FINAL.every((f, i) => paras[i * 2] === f && paras[i * 2 + 1] === CAPS[i]) && paras.length === 6
}
/** Fraction of the stats list inside the window. */
const visible = (page, sec) => page.$eval(STATS(sec), (el) => {
  const r = el.getBoundingClientRect()
  return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height
})
/** Every frame, record the shown strings when they change. */
function recorder(sel) {
  window.__rec = []
  const f = (now) => {
    const v = [...document.querySelectorAll(sel)].map((el) => (el.querySelector('[aria-hidden="true"]') ?? el).textContent)
    const last = window.__rec.at(-1)
    if (!last || last[1].join('|') !== v.join('|')) window.__rec.push([now, v])
    requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}

async function copyAndFit(page, t) {
  for (const w of [320, 390, 768]) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'start' }))
    const m = await page.$eval(t.section, (sec) => {
      const h2 = sec.querySelector('h2')
      const pill = h2.querySelector('img')
      const line2 = pill.parentElement.getBoundingClientRect()
      const word = pill.nextElementSibling.getBoundingClientRect()
      const box = sec.firstElementChild
      const pad = parseFloat(getComputedStyle(box).paddingLeft)
      const b = box.getBoundingClientRect()
      return {
        fs: parseFloat(getComputedStyle(h2).fontSize), pill: pill.getBoundingClientRect(), ok: pill.complete && pill.naturalWidth > 0,
        line2: line2.width, wordRight: word.right, contentRight: b.right - pad, name: h2.textContent.replace(/\s+/g, ' ').trim(),
      }
    })
    const wantFs = Math.min(56, (w - 40) / 5.4)
    t.check(`fit ${w}`, Math.abs(m.fs - wantFs) < 0.05 && m.wordRight <= m.contentRight + 0.5 && m.ok,
      `headline ${m.fs.toFixed(1)}px (want ${wantFs.toFixed(1)}), pill ${m.pill.width.toFixed(1)}x${m.pill.height.toFixed(1)}, "impact" ends ${m.wordRight.toFixed(1)} <= content edge ${m.contentRight.toFixed(1)}`)
    if (w === 390) t.check('pill', Math.abs(m.pill.width - 104) < 0.2 && Math.abs(m.pill.height - 58) < 0.2, `pill ${m.pill.width.toFixed(1)}x${m.pill.height.toFixed(1)} at 56px (spec 104x58)`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const name = await page.$eval(`${t.section} h2`, (h) => h.textContent.replace(/\s+/g, ' ').trim())
  const caps = await page.$$eval(`${t.section} li p:not([data-stat])`, (ps) => ps.map((p) => p.textContent))
  t.check('copy', name === 'Global impact' && caps.join('|') === CAPS.join('|'), `heading "${name}"; captions ${caps.map((c) => `"${c}"`).join(', ')}`)
}

export default async function (page, t) {
  const sec = t.section
  // Other builders' edits can hot-reload the shared dev page mid-run, re-arming the count.
  await page.evaluate(() => { window.__same = true })

  const offRatio = await visible(page, sec)
  const parked = await shown(page, sec)
  const parkedSpoken = await spoken(page, sec)
  t.check('parked', offRatio === 0 && parked.every((s) => s === '0+'), `off screen at load (${offRatio.toFixed(2)} visible): shows ${parked.join(' ')}`)

  // Below the 40% threshold nothing starts.
  await page.$eval(STATS(sec), (el) => scrollBy(0, el.getBoundingClientRect().top - (innerHeight - 0.25 * el.getBoundingClientRect().height)))
  await t.sleep(500)
  const peek = await visible(page, sec)
  const atPeek = await shown(page, sec)
  t.check('threshold', peek > 0.1 && peek < 0.4 && atPeek.every((s) => s === '0+'), `${peek.toFixed(2)} of the stats in view: still ${atPeek.join(' ')}`)

  await page.evaluate(recorder, `${sec} [data-stat]`)
  await page.$eval(STATS(sec), (el) => el.scrollIntoView({ block: 'center' }))
  const t0 = Date.now()
  await t.sleep(300)
  const mid = await shown(page, sec)
  const midSpoken = await spoken(page, sec)
  t.check('counting', mid.every((s, i) => EN.test(s) && num(s) > 0 && num(s) < TARGET[i]), `${Date.now() - t0}ms after scrolling in: ${mid.join(' ')}`)

  await t.sleep(2500 - (Date.now() - t0))
  const html = await page.$$eval(`${sec} [data-stat]`, (els) => els.map((el) => el.innerHTML))
  t.check('final', html.every((s, i) => s === FINAL[i]), `${Date.now() - t0}ms after: innerHTML ${html.map((s) => JSON.stringify(s)).join(' ')}`)

  // A dev-server reload drops the recorder: an empty record fails the checks below, and 'reload' says why.
  const rec = (await page.evaluate(() => window.__rec)) ?? []
  const frames = rec.map(([, v]) => v)
  const iEnd = frames.findIndex((v) => v.every((s, i) => s === FINAL[i]))
  const counting = frames.slice(0, iEnd < 0 ? frames.length : iEnd)
  const dur = iEnd < 0 ? NaN : (rec[iEnd][0] - rec[0][0]) / 1000
  t.check('easing', counting.length > 10 && counting.every((v, k) => !k || v.every((s, i) => num(s) >= num(counting[k - 1][i]))) &&
    counting.every((v) => v.every((s) => EN.test(s))) && counting.some((v) => num(v[0]) >= 1000 && v[0].includes(',')) && dur > 1.4 && dur < 2.1,
    `${counting.length} counting frames over ${dur.toFixed(2)}s, never decreasing, en-US with "+" and the thousands comma`)

  t.check('a11y', [parkedSpoken, midSpoken, await spoken(page, sec)].every(readsFinal),
    `parked, mid-count and final all read ${FINAL.join(' / ')}: ${midSpoken.replace(/\s+/g, ' ')}`)

  // Once per load.
  await page.evaluate(() => scrollTo(0, 0))
  await t.sleep(400)
  await page.evaluate(() => { window.__rec = [] })
  await page.$eval(STATS(sec), (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(800)
  const again = await page.evaluate(() => (window.__rec ?? []).map(([, v]) => v.join(' ')))
  t.check('once', again.length === 1 && again[0] === FINAL.join(' '), `away and back: ${again.length - 1} changes (${again.join(' / ')})`)
  if (!(await page.evaluate(() => window.__same))) t.check('reload', false, 'page reloaded mid-run (dev server hot reload): rerun')

  await copyAndFit(page, t)
}

export async function reduced(page, t) {
  const sec = t.section
  const before = await page.$$eval(`${sec} [data-stat]`, (els) => els.map((el) => el.innerHTML))
  await page.evaluate(recorder, `${sec} [data-stat]`)
  await page.$eval(STATS(sec), (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(2200)
  const after = await page.$$eval(`${sec} [data-stat]`, (els) => els.map((el) => el.innerHTML))
  const rec = await page.evaluate(() => window.__rec?.length)
  t.check('no count', before.every((s, i) => s === FINAL[i]) && after.every((s, i) => s === FINAL[i]) && rec === 1,
    `before scroll ${before.join(' ')}; 2.2s after scrolling in ${after.join(' ')}; distinct frames ${rec}`)
  const snap = await spoken(page, sec)
  t.check('a11y', readsFinal(snap), snap.replace(/\s+/g, ' '))
}
