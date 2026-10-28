// M-13: hovering "Partner with us" (94:282) or the "Support us" link (94:303) nudges its arrow 6px right.
// M-14 ("the logo spins") is not built: frame 94:84 has no logo in this section (gaps.md G-07).
const BLOCKS = [
  { name: 'Partner with us', hover: '94:282', arrow: '94:285', link: '94:282' },
  { name: 'Support us', hover: '94:303', arrow: '94:305', link: '94:303' },
]
const sel = (id) => `[data-node-id="${id}"]`
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2)

const probe = (page, id) => page.$eval(sel(id), (el) => {
  const cs = getComputedStyle(el)
  const k = document.querySelector('[data-canvas="root"]').getBoundingClientRect().width / 1440
  return { ...el.getBoundingClientRect().toJSON(), k, translate: cs.translate, transform: cs.transform }
})
const atRest = (p) => p.translate === 'none' && p.transform === 'none'
// Park the pointer in the section's empty right margin, level with the middle of the viewport.
const away = async (page) => {
  const r = await page.$eval('[data-section="community"]', (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(r.right - 10, 450)
}
/** Focus the link by keyboard: focus whatever precedes it in tab order, then press Tab. */
const tabTo = async (page, id) => {
  await page.$eval(sel(id), (el) => {
    const all = [...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('[inert]'))
    all[all.indexOf(el) - 1].focus()
  })
  await page.keyboard.press('Tab')
  return page.$eval(sel(id), (el) => document.activeElement === el && el.matches(':focus-visible'))
}

export default async function (page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const rest0 = await Promise.all(BLOCKS.map((b) => probe(page, b.arrow)))
  t.check('M-13', rest0.every(atRest), `rest: ${BLOCKS.map((b, i) => `${b.arrow} translate ${rest0[i].translate}/transform ${rest0[i].transform}`).join(', ')}`)

  for (const b of BLOCKS) {
    // The previous block's keyboard step scrolls the page; bring this block back into view.
    await page.$eval(sel(b.hover), (el) => el.scrollIntoView({ block: 'center' }))
    await away(page)
    await t.sleep(400)
    const before = await probe(page, b.arrow)
    const other = BLOCKS.find((o) => o !== b).arrow
    const otherBefore = await probe(page, other)
    // Sample the arrow every frame across the hover to time the transition.
    const sampling = page.$eval(sel(b.arrow), (el) => new Promise((done) => {
      const s = []
      const t0 = performance.now()
      const f = (now) => {
        s.push([now - t0, el.getBoundingClientRect().left])
        if (now - t0 < 450) requestAnimationFrame(f)
        else done(s)
      }
      requestAnimationFrame(f)
    }))
    // Hover the block away from its arrow (the card's heading area, the link's label).
    const h = await probe(page, b.hover)
    await page.mouse.move(h.left + h.width * 0.4, h.top + h.height * 0.35)
    const samples = await sampling
    const hovered = await probe(page, b.arrow)
    const otherHovered = await probe(page, other)
    const dx = (hovered.left - before.left) / before.k
    const tStart = samples.find(([, x]) => x > before.left + 0.001)?.[0] ?? NaN
    const tEnd = samples.find(([, x]) => Math.abs(x - before.left - 6 * before.k) < 0.01)?.[0] ?? NaN
    const tHalf = samples.find(([, x]) => x - before.left >= 3 * before.k)?.[0] ?? NaN
    const dur = (tEnd - tStart) / 1000, half = (tHalf - tStart) / 1000
    const timing = await page.$eval(sel(b.arrow), (el) => `${getComputedStyle(el).transitionDuration} ${getComputedStyle(el).transitionTimingFunction}`)
    await away(page)
    await t.sleep(400)
    const after = await probe(page, b.arrow)
    const back = (after.left - before.left) / before.k
    t.check('M-13',
      Math.abs(dx - 6) < 0.01 && hovered.top === before.top && dur > 0.18 && dur < 0.3 && half < dur / 2 &&
        Math.abs(back) < 0.01 && atRest(after) && otherHovered.left === otherBefore.left,
      `${b.name} (${b.hover}) hovered: arrow ${b.arrow} +${fmt(dx)}px x, ${fmt((hovered.top - before.top) / before.k)}px y, in ~${fmt(dur)}s, half way at ${fmt(half)}s ` +
      `(ease-out; ${timing}); leave ${fmt(back)}px and ${after.translate}/${after.transform}; other arrow moved ${fmt((otherHovered.left - otherBefore.left) / before.k)}px`)

    const visible = await tabTo(page, b.link)
    await t.sleep(400)
    const focused = await probe(page, b.arrow)
    await page.$eval(sel(b.link), (el) => el.blur())
    await t.sleep(400)
    const blurred = await probe(page, b.arrow)
    const fdx = (focused.left - before.left) / before.k
    t.check('M-13', visible && Math.abs(fdx - 6) < 0.01 && atRest(blurred),
      `${b.name}: Tab onto link ${b.link} (focus-visible ${visible}) moves arrow +${fmt(fdx)}px; blur -> ${blurred.translate}/${blurred.transform}`)
  }
}

export async function reduced(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const seen = []
  for (const b of BLOCKS) {
    await page.$eval(sel(b.hover), (el) => el.scrollIntoView({ block: 'center' }))
    await away(page)
    const before = await probe(page, b.arrow)
    const h = await probe(page, b.hover)
    // Prove the hover lands, so "the arrow did not move" is not a missed hover.
    const landed = await page.evaluate(([x, y, id]) => !!document.elementFromPoint(x, y)?.closest(`[data-node-id="${id}"]`), [h.left + h.width * 0.4, h.top + h.height * 0.35, b.hover])
    await page.mouse.move(h.left + h.width * 0.4, h.top + h.height * 0.35)
    await t.sleep(400)
    const hovered = await probe(page, b.arrow)
    const visible = await tabTo(page, b.link)
    await t.sleep(400)
    const focused = await probe(page, b.arrow)
    await page.$eval(sel(b.link), (el) => el.blur())
    seen.push({ b, ok: landed && hovered.left === before.left && atRest(hovered) && visible && focused.left === before.left && atRest(focused), hovered, focused, before })
  }
  t.check('M-13', seen.every((s) => s.ok),
    `reduced motion: ${seen.map((s) => `${s.b.arrow} hover ${fmt(s.hovered.left - s.before.left)}px (${s.hovered.translate}), keyboard focus ${fmt(s.focused.left - s.before.left)}px`).join('; ')}`)
}
