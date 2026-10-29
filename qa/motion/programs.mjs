// M-08: a hovered program card (desktop 94:167, 94:171, 94:176; wide 173:390,
// 173:402, 173:407) lifts 6px; the photo block (94:159; 173:394) stays.
const IDS = {
  desktop: { cards: ['94:167', '94:171', '94:176'], photo: '94:159', heading: '94:157' },
  wide: { cards: ['173:390', '173:402', '173:407'], photo: '173:394', heading: '173:388' },
}
const sel = (id) => `[data-node-id="${id}"]`
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2)

/** Rect in viewport px, the canvas scale, and the computed translate/transform. */
const probe = (page, id) => page.$eval(sel(id), (el) => {
  const cs = getComputedStyle(el)
  // Canvas scale on either surface: rendered width over layout width.
  const c = document.querySelector('[data-canvas="root"]')
  const k = c.getBoundingClientRect().width / c.offsetWidth
  return { ...el.getBoundingClientRect().toJSON(), k, translate: cs.translate, transform: cs.transform }
})
const restStyle = (p) => p.translate === 'none' && p.transform === 'none'
const awayFromCards = async (page, HEADING) => {
  const h = await probe(page, HEADING)
  await page.mouse.move(h.left + h.width / 2, h.top + h.height / 2)
}

export default async function (page, t) {
  const { cards: CARDS, photo: PHOTO, heading: HEADING } = IDS[t.surface]
  const rest = []
  for (const id of CARDS) {
    const p = await probe(page, id)
    rest.push(`${id} ${p.translate}/${p.transform}`)
  }
  t.check('M-08', rest.every((r) => r.endsWith('none/none')), `rest: translate/transform ${rest.join(', ')}`)

  for (const id of CARDS) {
    await page.$eval(sel(id), (el) => el.scrollIntoView({ block: 'center' }))
    await awayFromCards(page, HEADING)
    await t.sleep(400)
    const before = await probe(page, id)
    const photoBefore = await probe(page, PHOTO)
    // Sample the card top every frame across the hover to time the transition.
    await page.$eval(sel(id), (el) => {
      const s = (window.__lift = [])
      const t0 = performance.now()
      const f = (now) => {
        s.push([now, el.getBoundingClientRect().top])
        if (now - t0 < 600) requestAnimationFrame(f)
      }
      requestAnimationFrame(f)
    })
    await page.mouse.move(before.left + before.width / 2, before.top + before.height / 2)
    await t.sleep(700)
    const hovered = await probe(page, id)
    const samples = await page.evaluate(() => window.__lift)
    const tStart = samples.find(([, y]) => y < before.top)?.[0]
    const tEnd = samples.find(([, y]) => Math.abs(before.top - y - 6 * before.k) < 0.01)?.[0]
    const half = samples.find(([, y]) => before.top - y >= 3 * before.k)?.[0]
    const dur = (tEnd - tStart) / 1000
    const halfAt = (half - tStart) / 1000
    const timing = await page.$eval(sel(id), (el) => `${getComputedStyle(el).transitionDuration} ${getComputedStyle(el).transitionTimingFunction}`)
    const photo = await probe(page, PHOTO)
    // 2px inside the resting bottom edge: the lifted card no longer covers it, the hover must hold.
    await page.mouse.move(before.left + before.width / 2, before.bottom - 2)
    await t.sleep(400)
    const edge = await probe(page, id)
    await awayFromCards(page, HEADING)
    await t.sleep(400)
    const after = await probe(page, id)
    const lift = (before.top - hovered.top) / before.k
    const edgeLift = (before.top - edge.top) / before.k
    const back = (after.top - before.top) / before.k
    const photoMoved = Math.abs(photo.top - photoBefore.top) + Math.abs(photo.left - photoBefore.left)
    t.check('M-08',
      Math.abs(lift - 6) < 0.05 && dur > 0.18 && dur < 0.3 && halfAt < dur / 2 && Math.abs(edgeLift - 6) < 0.05 &&
        Math.abs(back) < 0.05 && restStyle(after) && photoMoved === 0 && hovered.left === before.left,
      `${id}: hover lifts ${fmt(lift)}px in ~${fmt(dur)}s, half way at ${fmt(halfAt)}s (ease-out; ${timing}), at bottom edge ${fmt(edgeLift)}px, ` +
      `leave ${fmt(back)}px and ${after.translate}/${after.transform}; photo moved ${fmt(photoMoved)}px`)
  }
}

export async function reduced(page, t) {
  const { cards: CARDS, heading: HEADING } = IDS[t.surface]
  const seen = []
  for (const id of CARDS) {
    await page.$eval(sel(id), (el) => el.scrollIntoView({ block: 'center' }))
    await awayFromCards(page, HEADING)
    const before = await probe(page, id)
    await page.mouse.move(before.left + before.width / 2, before.top + before.height / 2)
    await t.sleep(400)
    const hovered = await probe(page, id)
    seen.push({ id, dy: (hovered.top - before.top) / before.k, rest: restStyle(hovered) })
  }
  t.check('M-08', seen.every((s) => s.dy === 0 && s.rest),
    `reduced motion, hovered: ${seen.map((s) => `${s.id} moved ${fmt(s.dy)}px${s.rest ? ', no translate' : ', translate set'}`).join('; ')}`)
}
