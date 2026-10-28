// M-04..M-06: the four numbered shapes (94:266, 94:269, 94:268, 94:267) are tabs
// with automatic activation (hover, focus, tap, arrow keys). The selected one is
// drawn as the Figma loop (the "2" pill, turned to start at its circle) and the
// rest as circles, morphing in 0.4s; each state swaps the blob photo (94:265
// stack, its outline turned with the loop) and the tagline (94:274 stack) in one
// tab panel, with a 0.3s fade that never thins the blob, all instant under reduced
// motion. State 2 is the Figma frame. One t.check per aspect.
const PHOTOS = ['members-group.webp', 'vilnius-portrait.webp', 'members-selfie.webp', 'members-networking.webp']
const LINES = ['Global minds. Lithuanian roots.', 'One community. Endless possibilities.', 'Your next chapter starts here.', 'Go further, together.']
const REST = 1
const PILL_W = 135.065
const CIRCLE = [158.806, 158.806, 158.806, 143.682]
const MORPH_S = 0.4
const SETTLE_MS = 650
const f2 = (n) => n.toFixed(2)
// Other builders' edits can hot-reload the shared dev page mid-run, resetting it to state 2.
const mark = (page) => page.evaluate(() => { window.__same = true })
const reloaded = async (page) => !(await page.evaluate(() => window.__same))
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => {
  const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : r())
  f(n)
}), n)

/** Shown photo and line (opaque and visible), tab state, focus and its ring. */
const snap = (page) => page.evaluate(() => {
  const sec = document.querySelector('[data-section="talent"]')
  const on = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' && +cs.opacity >= 0.999 }
  const tabs = [...sec.querySelectorAll('[role="tab"]')]
  const a = document.activeElement
  // Paths per tab: ink ring, white ring, the shape, then its hit area.
  const ring = (b) => getComputedStyle(b.querySelector('svg path')).visibility === 'visible'
  const dash = (b) => parseFloat(getComputedStyle(b.querySelectorAll('svg path')[2]).strokeDasharray)
  return {
    extended: tabs.map((b, i) => (dash(b) >= 0.999 ? i + 1 : 0)).filter(Boolean).join(','),
    circles: tabs.filter((b) => dash(b) <= 0.001).length,
    photo: [...sec.querySelectorAll('img')].filter((i) => i.src.endsWith('.webp') && on(i)).map((i) => i.src.split('/').pop()).join('+'),
    line: [...sec.querySelectorAll('p')].filter(on).map((p) => p.textContent).join('+'),
    selected: tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true') + 1,
    nSelected: tabs.filter((b) => b.getAttribute('aria-selected') === 'true').length,
    tabindex: tabs.map((b) => b.tabIndex).join(','),
    focus: tabs.indexOf(a) + 1,
    ring: tabs.includes(a) ? ring(a) : null,
  }
})
const roving = (i) => [0, 1, 2, 3].map((k) => (k === i ? 0 : -1)).join(',')
const is = (s, i) => s.selected === i + 1 && s.nSelected === 1 && s.tabindex === roving(i) && s.photo === PHOTOS[i] && s.line === LINES[i] &&
  s.extended === String(i + 1) && s.circles === 3
const all = (list) => list.every(([i, s]) => is(s, i))
const trail = (list, key = 'selected') => list.map(([i, s]) => `${i + 1}->${s[key]}`).join(' ')

/** A point inside each shape in either form: its number, centred on the circle where the loop starts. */
const points = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[data-section="talent"] [role="tab"] [data-node-id]')].map((n) => {
    const r = n.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }))

const away = async (page) => {
  const h = await page.$eval('[data-node-id="94:261"]', (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(h.left + h.width / 2, h.top + h.height / 2)
}

/** Every frame for `ms`: each photo's and each line's effective opacity. */
const sampleFades = (page, ms) => page.evaluate((ms) => {
  const sec = document.querySelector('[data-section="talent"]')
  const photos = [...sec.querySelectorAll('img')].filter((i) => i.src.endsWith('.webp'))
  const lines = [...sec.querySelectorAll('p')]
  const shapes = [...sec.querySelectorAll('[role="tab"]')].map((b) => b.querySelectorAll('svg path')[2])
  const op = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' ? +cs.opacity : 0 }
  const form = (el) => { const cs = getComputedStyle(el); return [parseFloat(cs.strokeDasharray), parseFloat(cs.strokeWidth)] }
  window.__fade = []
  const t0 = performance.now()
  const f = (now) => {
    window.__fade.push([now, photos.map(op), lines.map(op), shapes.map(form)])
    if (now - t0 < ms) requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}, ms)
/** Union coverage of the stacked photos, per frame: 1 while one of them is fully drawn. */
const coverage = (s) => s.map(([, p]) => 1 - p.reduce((q, a) => q * (1 - a), 1))

/** Fade from j to k: incoming rise time, mid value, whether j stayed opaque under it. */
function fade(s, j, k, which) {
  const v = (x) => x[which === 'photo' ? 1 : 2]
  const iStart = s.findIndex((x) => v(x)[k] > 0)
  const iFull = s.findIndex((x) => v(x)[k] >= 0.999)
  const during = s.slice(iStart, iFull)
  return {
    dur: (s[iFull]?.[0] - s[Math.max(0, iStart - 1)]?.[0]) / 1000,
    mid: during.length ? v(during[Math.floor(during.length / 2)])[k] : NaN,
    held: during.every((x) => v(x)[j] >= 0.999),
  }
}

/**
 * Points of each tab's shape as painted: the stroke's visible part (dash 0 to 1 of
 * the path, sampled every 2px) widened by half its width. In viewport px.
 */
const installShape = (page) => page.evaluate(() => { window.__shape = (b) => {
  const p = b.querySelectorAll('svg path')[2], cs = getComputedStyle(p)
  const len = p.getTotalLength() * parseFloat(cs.strokeDasharray), w = parseFloat(cs.strokeWidth)
  const m = p.getScreenCTM()
  const pts = []
  for (let l = 0; ; l = Math.min(len, l + 2)) {
    const q = new DOMPoint(p.getPointAtLength(l).x, p.getPointAtLength(l).y).matrixTransform(m)
    pts.push([q.x, q.y])
    if (l >= len) break
  }
  const dist = (x, y) => Math.min(...pts.map(([a, c]) => Math.hypot(x - a, y - c)))
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1])
  return { dist, r: w / 2, box: [Math.min(...xs) - w / 2, Math.min(...ys) - w / 2, Math.max(...xs) + w / 2, Math.max(...ys) + w / 2] }
} })

/** Hit test over each shape: does the pointer target the tab exactly where the shape paints? */
const hitArea = (page) => page.evaluate(() => {
  const shape = window.__shape
  return [...document.querySelectorAll('[data-section="talent"] [role="tab"]')].map((b) => {
    const { dist, r, box } = shape(b)
    let n = 0, ok = 0
    for (let y = box[1] - 11; y < box[3] + 12; y += 3) {
      for (let x = box[0] - 11; x < box[2] + 12; x += 3) {
        const e = dist(x, y) - r
        if (Math.abs(e) <= 2) continue
        n++; ok += (document.elementFromPoint(x, y)?.closest('[role="tab"]') === b) === e < 0
      }
    }
    return { id: b.dataset.nodeId, ok, n }
  })
})

/** Pixels of the selected loop painted over an opaque pixel of the shown photo (it must leave the loop room). */
const overlap = (page) => page.evaluate(async () => {
  const shape = window.__shape
  const sec = document.querySelector('[data-section="talent"]')
  const b = sec.querySelector('[role="tab"][aria-selected="true"]')
  const img = [...sec.querySelectorAll('img')].find((i) => i.src.endsWith('.webp') && getComputedStyle(i).visibility === 'visible' && +getComputedStyle(i).opacity >= 0.999 && +getComputedStyle(i).zIndex === 2)
  const ir = img.getBoundingClientRect()
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(ir.width), height: Math.round(ir.height) })
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height)
  const d = g.getImageData(0, 0, c.width, c.height).data
  const { dist, r, box } = shape(b)
  let n = 0, over = 0
  for (let y = Math.ceil(box[1]); y < box[3]; y++) {
    for (let x = Math.ceil(box[0]); x < box[2]; x++) {
      if (dist(x + 0.5, y + 0.5) > r) continue
      n++
      const lx = Math.floor(x - ir.left), ly = Math.floor(y - ir.top)
      if (lx >= 0 && ly >= 0 && lx < c.width && ly < c.height && d[(ly * c.width + lx) * 4 + 3] > 128) over++
    }
  }
  return { tab: b.dataset.nodeId, photo: img.src.split('/').pop(), n, over }
})

/** Worst distance between a circle's number and the circle's centre, over the unselected tabs. */
const centred = (page) => page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-section="talent"] [role="tab"][aria-selected="false"]')].map((b) => {
  const p = b.querySelectorAll('svg path')[2], o = p.getPointAtLength(0), c = new DOMPoint(o.x, o.y).matrixTransform(p.getScreenCTM())
  const r = b.querySelector('[data-node-id]').getBoundingClientRect()
  return Math.hypot(r.left + r.width / 2 - c.x, r.top + r.height / 2 - c.y)
})))

/** Lines each tagline wraps to, and how far its text reaches below the box top. */
const fit = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="talent"] p')].map((p) => {
  const r = document.createRange(); r.selectNodeContents(p)
  const lines = new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size
  return { lines, bottom: Math.round(r.getBoundingClientRect().bottom - p.getBoundingClientRect().top), w: Math.round(r.getBoundingClientRect().width) }
}))

/** Focus the last tab stop before the tablist, so Tab enters the group as a visitor would. */
const focusBefore = (page) => page.evaluate(() => {
  const first = document.querySelector('[data-section="talent"] [role="tab"]')
  const stops = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
    .filter((el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length && !el.closest('[role="tablist"]'))
    .filter((el) => el.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
  const prev = stops.at(-1)
  prev ? prev.focus() : document.activeElement?.blur()
  return prev ? `${prev.tagName.toLowerCase()} "${(prev.textContent || prev.getAttribute('aria-label') || '').trim().slice(0, 24)}"` : 'body'
})

export default async function (page, t) {
  await mark(page)
  await installShape(page)
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  await t.sleep(200)

  // Tabs semantics at rest.
  const rest = await snap(page)
  const aria = await page.locator(t.section).ariaSnapshot()
  const wiring = await page.evaluate(() => {
    const sec = document.querySelector('[data-section="talent"]')
    const panel = sec.querySelector('[role="tabpanel"]')
    const tabs = [...sec.querySelectorAll('[role="tablist"] [role="tab"]')]
    const active = tabs.find((b) => b.getAttribute('aria-selected') === 'true')
    return {
      tabs: tabs.length,
      controls: tabs.every((b) => b.getAttribute('aria-controls') === panel.id),
      labelled: panel.getAttribute('aria-labelledby') === active.id,
      holds: panel.contains(sec.querySelector('[data-node-id="94:265"]')) && panel.contains(sec.querySelector('[data-node-id="94:274"]')),
    }
  })
  t.check('M-04', is(rest, REST) && wiring.tabs === 4 && wiring.controls && wiring.labelled && wiring.holds &&
      aria.includes('tablist "A world of Lithuanian talent"') && aria.includes('tab "2: One community. Endless possibilities." [selected]') &&
      aria.includes('tabpanel "2: One community. Endless possibilities."'),
    `tabs semantics: tablist named by the h2, ${wiring.tabs} tabs, aria-controls -> panel ${wiring.controls}, panel labelled by the selected tab ${wiring.labelled}, ` +
    `panel holds 94:265 + 94:274 ${wiring.holds}; rest selected ${rest.selected} (extended ${rest.extended}, ${rest.circles} circles), tabindex ${rest.tabindex}`)

  const hits = await hitArea(page)
  t.check('M-04', hits.every((h) => h.n > 0 && h.ok === h.n),
    `hit area matches the painted shape (2px edge band skipped): ${hits.map((h) => `${h.id} ${h.ok}/${h.n}`).join(', ')}`)

  // Hover 1, 3, 4, 2, sampling the 2 -> 1 morph and fades; each settled loop must clear its photo.
  const pts = await points(page)
  const hovered = []
  const clear = []
  const offsets = []
  let one
  for (const i of [0, 2, 3, 1]) {
    if (i === 0) await sampleFades(page, 900)
    await page.mouse.move(pts[i].x, pts[i].y)
    await t.sleep(i === 0 ? 1000 : SETTLE_MS)
    if (i === 0) one = await page.evaluate(() => window.__fade)
    hovered.push([i, await snap(page)])
    clear.push(await overlap(page))
    offsets.push(await centred(page))
  }
  t.check('M-04', all(hovered), `hover selects: ${trail(hovered)}; extended ${trail(hovered, 'extended')}`)

  // The morph: 1 grows from its circle into the loop while 2 shrinks back, both in 0.4s; 3 and 4 hold.
  const series = (k, f) => one.map((x) => x[3][k][f])
  const grow = series(0, 0), shrink = series(1, 0)
  const tStart = one.findIndex((x) => x[3][0][0] > 0), tEnd = one.findIndex((x) => x[3][0][0] >= 0.999)
  const morphDur = (one[tEnd]?.[0] - one[Math.max(0, tStart - 1)]?.[0]) / 1000
  const mid = grow[Math.floor((tStart + tEnd) / 2)]
  const rising = grow.every((v, j) => !j || v >= grow[j - 1] - 1e-6), falling = shrink.every((v, j) => !j || v <= shrink[j - 1] + 1e-6)
  const held = [2, 3].every((k) => series(k, 0).every((v) => v <= 0.001))
  const w0 = series(0, 1), w1 = series(1, 1)
  const widths = Math.abs(w0[0] - CIRCLE[0]) < 0.01 && Math.abs(w0.at(-1) - PILL_W) < 0.01 && Math.abs(w1[0] - PILL_W) < 0.01 && Math.abs(w1.at(-1) - CIRCLE[1]) < 0.01
  t.check('M-04', rising && falling && held && widths && shrink.at(-1) <= 0.001 && Math.abs(morphDur - MORPH_S) < 0.12 && mid > 0.1 && mid < 0.9,
    `morph 2->1: 1 extends ${f2(grow[0])} -> ${f2(grow.at(-1))} in ~${f2(morphDur)}s (mid ${f2(mid)}, rising ${rising}), width ${f2(w0[0])} -> ${f2(w0.at(-1))}; ` +
    `2 shrinks ${f2(shrink[0])} -> ${f2(shrink.at(-1))} (falling ${falling}), width ${f2(w1[0])} -> ${f2(w1.at(-1))}; 3 and 4 stay circles ${held}`)

  t.check('M-04', offsets.every((d) => d <= 0.5),
    `numbers centred in their circles: worst ${offsets.map((d) => `${f2(d)}px`).join(', ')} across hover 1, 3, 4, 2`)

  // The blob turns with the loop: the extended shape never paints over the photo.
  t.check('M-05', clear.every((c) => c.n > 1000 && c.over === 0),
    `loop clears the photo: ${clear.map((c) => `${c.tab} over ${c.photo.replace('.webp', '')} ${c.over}/${c.n} px`).join(', ')}`)

  await page.mouse.move(pts[2].x, pts[2].y)
  await t.sleep(SETTLE_MS)
  await away(page)
  await t.sleep(600)
  const persisted = await snap(page)
  t.check('M-04', is(persisted, 2), `selection persists: 0.6s after the pointer left 3, selected ${persisted.selected}`)

  // Keyboard: Tab enters on the selected tab (3), arrows/Home/End move and select, Tab leaves.
  // The pointer parks in the corner: focus scrolls, and a shape sliding under it would select.
  await page.mouse.move(1, 1)
  const before = await focusBefore(page)
  const keyed = []
  for (const [key, i] of [['Tab', 2], ['ArrowRight', 3], ['ArrowDown', 0], ['ArrowLeft', 3], ['ArrowUp', 2], ['Home', 0], ['End', 3], ['ArrowRight', 0]]) {
    await page.keyboard.press(key)
    await t.sleep(SETTLE_MS)
    keyed.push([i, await snap(page), key])
  }
  t.check('M-04', all(keyed) && keyed.every(([i, s]) => s.focus === i + 1),
    `keyboard: from ${before}, ${keyed.map(([, s, k]) => `${k}->${s.focus}`).join(' ')} (focus = selection, roving tabindex)`)
  await page.keyboard.press('Tab')
  const out = await snap(page)
  await page.keyboard.press('Shift+Tab')
  const backIn = await snap(page)
  t.check('M-04', out.focus === 0 && backIn.focus === 1 && is(backIn, 0),
    `tab stop: Tab leaves the group (focus on tab ${out.focus || 'none'}), Shift+Tab returns to the selected tab ${backIn.focus}`)

  // A hover while a tab holds keyboard focus must not move the tab stop: Tab still leaves the group.
  // Focus moves scroll the page: centre the composition (focus stays put) and measure again.
  await page.$eval('[data-node-id="94:264"]', (el) => el.scrollIntoView({ block: 'center' }))
  const now = await points(page)
  await page.mouse.move(now[2].x, now[2].y)
  await t.sleep(SETTLE_MS)
  const hoveredWhileFocused = await snap(page)
  await page.keyboard.press('Tab')
  const out2 = await snap(page)
  t.check('M-04', hoveredWhileFocused.selected === 3 && hoveredWhileFocused.focus === 1 && out2.focus === 0,
    `hover 3 while tab 1 has focus: selected ${hoveredWhileFocused.selected}, focus stays on ${hoveredWhileFocused.focus}; Tab then lands ${out2.focus ? `on tab ${out2.focus}` : 'outside the group'}`)
  await page.mouse.move(1, 1)

  const rings = keyed.map(([, s]) => s.ring)
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  pts.splice(0, 4, ...(await points(page)))
  // Focus must move by pointer (from 1 to 4); re-clicking the focused tab keeps its ring.
  await page.mouse.click(pts[3].x, pts[3].y)
  await away(page)
  const clicked = await snap(page)
  t.check('M-04', rings.every((r) => r === true) && clicked.focus === 4 && clicked.ring === false,
    `focus ring: keyboard focus ${rings.filter(Boolean).length}/${rings.length} drawn (shape stroke), mouse click focus ${clicked.ring ? 'drawn' : 'none'}`)

  const touch = await t.browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true, reducedMotion: 'no-preference' })
  await touch.goto(t.url, { waitUntil: 'networkidle' })
  await touch.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(200)
  const tp = await points(touch)
  await mark(touch)
  const tapped = []
  for (const i of [0, 3]) {
    await touch.touchscreen.tap(tp[i].x, tp[i].y)
    await t.sleep(SETTLE_MS)
    tapped.push([i, await snap(touch)])
  }
  const touchReset = await reloaded(touch)
  await touch.close()
  t.check('M-04', all(tapped) && !touchReset, `tap selects: ${trail(tapped)}${touchReset ? ' (page reloaded mid-check, rerun)' : ''}`)

  // M-05: the photo.
  const pre = await page.evaluate(() => [...document.querySelectorAll('[data-section="talent"] img')]
    .filter((i) => i.src.endsWith('.webp')).map((i) => {
      const r = i.getBoundingClientRect()
      return { ok: i.complete && Math.abs(i.naturalWidth - 2 * r.width) <= 1.5 && Math.abs(i.naturalHeight - 2 * r.height) <= 1.5, size: `${i.naturalWidth}x${i.naturalHeight}` }
    }))
  t.check('M-05', pre.length === 4 && pre.every((p) => p.ok),
    `preloaded: ${pre.filter((p) => p.ok).length}/4 decoded at 2x their box before input (${pre.map((p) => p.size).join(', ')})`)
  t.check('M-05', rest.photo === PHOTOS[REST] && [...hovered, ...keyed].every(([i, s]) => s.photo === PHOTOS[i]),
    `photo per state: rest ${rest.photo}; hover ${hovered.map(([, s]) => s.photo).join(', ')}; keys ${keyed.map(([, s]) => s.photo.replace('.webp', '')).join(', ')}`)

  const pf = fade(one, 1, 0, 'photo')
  // Then the outgoing photo fades out too: the part of its outline the new blob lacks must not pop.
  const iIn = one.findIndex((x) => x[1][0] >= 0.999)
  const leave = one.slice(iIn).map((x) => x[1][1])
  const iGone = leave.findIndex((v) => v <= 0.001)
  const outDur = iGone > 0 ? (one[iIn + iGone][0] - one[iIn][0]) / 1000 : NaN
  const outMid = leave.filter((v) => v > 0.05 && v < 0.95).length
  const durs = await page.$$eval(`${t.section} img[src$=".webp"]`, (imgs) => imgs.map((i) => parseFloat(getComputedStyle(i).transitionDuration) || 0))
  const inDur = Math.max(...durs)
  const cov1 = Math.min(...coverage(one))
  t.check('M-05', Math.abs(inDur - 0.3) < 0.01 && pf.dur > 0.2 && pf.dur < 0.5 && pf.mid > 0.05 && pf.mid < 0.95 && pf.held && cov1 >= 0.999,
    `crossfade 2->1: incoming transition ${f2(inDur)}s, measured ${f2(pf.dur)}s, mid-fade ${f2(pf.mid)}, photo 2 opaque underneath ${pf.held}, blob coverage min ${f2(cov1)}`)
  t.check('M-05', outDur > 0.12 && outDur < 0.35 && outMid >= 3,
    `then photo 2 fades out in ${f2(outDur)}s once photo 1 is full (${outMid} frames part-way), so its own outline does not pop`)

  // Rapid 2 -> 3 -> 4: the last fully shown photo stays opaque; the others hide at once.
  await page.mouse.move(pts[0].x, pts[0].y)
  await t.sleep(SETTLE_MS)
  await sampleFades(page, 1200)
  await t.sleep(50)
  const r0 = Date.now()
  await page.mouse.move(pts[1].x, pts[1].y)
  await t.sleep(50)
  await page.mouse.move(pts[2].x, pts[2].y)
  await t.sleep(50)
  await page.mouse.move(pts[3].x, pts[3].y)
  const span = Date.now() - r0
  await t.sleep(1400)
  const rapid = await page.evaluate(() => window.__fade)
  const settledRapid = await snap(page)
  const covR = Math.min(...coverage(rapid))
  const most = Math.max(...rapid.map(([, p]) => p.filter((a) => a > 0).length))
  t.check('M-05', span < 300 && covR >= 0.999 && most <= 2 && is(settledRapid, 3),
    `rapid 2->3->4 in ${span}ms: blob coverage min ${f2(covR)} over ${rapid.length} frames, at most ${most} photos drawn at once, settles on ${settledRapid.photo}`)

  // M-06: the tagline.
  const lines = await fit(page)
  t.check('M-06', rest.line === LINES[REST] && [...hovered, ...keyed].every(([i, s]) => s.line === LINES[i]),
    `tagline per state: rest "${rest.line}" (94:274); hover ${hovered.map(([, s]) => `"${s.line}"`).join(', ')}`)
  t.check('M-06', lines.every((l) => l.lines <= 3 && l.bottom <= lines[REST].bottom && l.w <= 254),
    `fits 254x108: ${lines.map((l, i) => `${i + 1} ${l.lines} lines ${l.w}px, text bottom ${l.bottom}px`).join('; ')} (state 2 sets the limit)`)
  const lf = fade(one, 1, 0, 'line')
  const lineDur = await page.$eval('[data-node-id="94:274"]', (el) => parseFloat(getComputedStyle(el).transitionDuration))
  t.check('M-06', Math.abs(lineDur - 0.3) < 0.01 && lf.dur > 0.2 && lf.dur < 0.5 && lf.mid > 0.05 && lf.mid < 0.95,
    `crossfade 2->1: transition ${f2(lineDur)}s, measured ${f2(lf.dur)}s, mid-fade ${f2(lf.mid)}`)
  if (await reloaded(page)) t.check('M-04', false, 'page reloaded mid-run (dev server hot reload): the checks above saw a reset page, rerun')
}

export async function reduced(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  await t.sleep(200)
  const rest = await snap(page)
  const pts = await points(page)
  const seen = []
  for (const i of [0, 2, 3, 1]) {
    await page.mouse.move(pts[i].x, pts[i].y)
    await frames(page)
    seen.push([i, await snap(page)])
  }
  const keys = []
  await page.mouse.click(pts[0].x, pts[0].y)
  for (const [key, i] of [['ArrowRight', 1], ['End', 3]]) {
    await page.keyboard.press(key)
    await frames(page)
    keys.push([i, await snap(page), key])
  }
  const durs = await page.$$eval(`${t.section} img[src$=".webp"], ${t.section} p`, (els) => els.map((e) => parseFloat(getComputedStyle(e).transitionDuration) || 0))
  const morph = await page.$$eval(`${t.section} [role="tab"] svg path`, (els) => Math.max(...els.map((e) => parseFloat(getComputedStyle(e).transitionDuration) || 0)))
  t.check('M-04', is(rest, REST) && all(seen) && all(keys) && morph === 0,
    `reduced, still switches with no morph: hover ${trail(seen)}, keys ${keys.map(([, s, k]) => `${k}->${s.selected}`).join(' ')}, each within 2 frames; longest shape transition ${morph}s`)
  t.check('M-05', [...seen, ...keys].every(([i, s]) => s.photo === PHOTOS[i]) && Math.max(...durs) === 0,
    `reduced, photo instant: ${seen.map(([, s]) => s.photo).join(', ')}; longest transition ${Math.max(...durs)}s`)
  t.check('M-06', [...seen, ...keys].every(([i, s]) => s.line === LINES[i]),
    `reduced, tagline instant: ${seen.map(([, s]) => `"${s.line}"`).join(', ')}`)
}
