// M-04..M-06: the four numbered shapes (94:266, 94:269, 94:268, 94:267) are tabs
// with automatic activation (hover, focus, tap, arrow keys). The selected one is
// drawn as the Figma loop (the "2" pill, turned to start at its circle) and the
// rest as circles, morphing in 0.4s; the loop takes a 30px white band off the one
// Figma photo (94:265), which never changes; the tagline (94:274 stack) swaps one
// line at a time. All instant under reduced motion. State 2 is the Figma frame.
// One t.check per aspect.
import { execFileSync } from 'node:child_process'

const PHOTO = 'vilnius-photo.webp'
const LINES = ['Global minds. Lithuanian roots.', 'One community. Endless possibilities.', 'Your next chapter starts here.', 'Go further, together.']
const REST = 1
const PILL_W = 135.065
const CIRCLE = [158.806, 158.806, 158.806, 143.682]
const MORPH_S = 0.4
const GAP = 29.5
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
const is = (s, i) => s.selected === i + 1 && s.nSelected === 1 && s.tabindex === roving(i) && s.photo === PHOTO && s.line === LINES[i] &&
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
  const lines = [...sec.querySelectorAll('p')]
  const shapes = [...sec.querySelectorAll('[role="tab"]')].map((b) => b.querySelectorAll('svg path')[2])
  const op = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' ? +cs.opacity : 0 }
  const form = (el) => { const cs = getComputedStyle(el); return [parseFloat(cs.strokeDasharray), parseFloat(cs.strokeWidth)] }
  window.__fade = []
  const t0 = performance.now()
  const f = (now) => {
    window.__fade.push([now, null, lines.map(op), shapes.map(form)])
    if (now - t0 < ms) requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}, ms)
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

/**
 * The white band round the selected loop, read from a real screenshot: points
 * between the loop's edge and 30px out (2px skipped at both edges) that are not
 * on another shape or the tagline must be white. Returns the points that are not.
 */
async function band(page) {
  const pts = await page.evaluate((GAP) => {
    const sec = document.querySelector('[data-section="talent"]')
    const tabs = [...sec.querySelectorAll('[role="tab"]')]
    const b = sec.querySelector('[role="tab"][aria-selected="true"]')
    const { dist, r, box } = window.__shape(b)
    const others = tabs.filter((o) => o !== b).map((o) => window.__shape(o))
    const line = sec.querySelector('[data-node-id="94:274"]').parentElement.querySelector('p:not(.invisible)').getBoundingClientRect()
    const out = []
    for (let y = Math.ceil(box[1] - GAP); y < box[3] + GAP; y += 3) {
      for (let x = Math.ceil(box[0] - GAP); x < box[2] + GAP; x += 3) {
        const e = dist(x, y) - r
        if (e < 2 || e > GAP - 2 || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
        if (others.some((o) => o.dist(x, y) < o.r + 3)) continue
        if (x >= line.left - 2 && x <= line.right + 2 && y >= line.top - 2 && y <= line.bottom + 2) continue
        out.push([x, y])
      }
    }
    return { tab: b.dataset.nodeId, pts: out }
  }, GAP)
  const png = await page.screenshot()
  const w = png.readUInt32BE(16)
  const rgb = execFileSync('magick', ['png:-', '-alpha', 'off', '-depth', '8', 'rgb:-'], { input: png, maxBuffer: 1 << 28 })
  const bad = pts.pts.filter(([x, y]) => { const i = (y * w + x) * 3; return Math.min(rgb[i], rgb[i + 1], rgb[i + 2]) < 250 })
  return { tab: pts.tab, n: pts.pts.length, bad: bad.length }
}

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
    clear.push(await band(page))
    offsets.push(await centred(page))
  }
  t.check('M-04', all(hovered), `hover selects: ${trail(hovered)}; extended ${trail(hovered, 'extended')}`)

  // The morph: 1 grows from its circle into the loop while 2 shrinks back, both in 0.4s; 3 and 4 hold,
  // and no frame stalls on the way (a stall shows as a jump in the shape).
  const series = (k, f) => one.map((x) => x[3][k][f])
  const grow = series(0, 0), shrink = series(1, 0)
  const tStart = one.findIndex((x) => x[3][0][0] > 0), tEnd = one.findIndex((x) => x[3][0][0] >= 0.999)
  const morphDur = (one[tEnd]?.[0] - one[Math.max(0, tStart - 1)]?.[0]) / 1000
  const mid = grow[Math.floor((tStart + tEnd) / 2)]
  const rising = grow.every((v, j) => !j || v >= grow[j - 1] - 1e-6), falling = shrink.every((v, j) => !j || v <= shrink[j - 1] + 1e-6)
  const held = [2, 3].every((k) => series(k, 0).every((v) => v <= 0.001))
  const w0 = series(0, 1), w1 = series(1, 1)
  const steps = one.slice(Math.max(1, tStart), tEnd + 1).map((x, j) => x[0] - one[Math.max(1, tStart) + j - 1][0])
  const worstFrame = Math.max(...steps)
  const widths = Math.abs(w0[0] - CIRCLE[0]) < 0.01 && Math.abs(w0.at(-1) - PILL_W) < 0.01 && Math.abs(w1[0] - PILL_W) < 0.01 && Math.abs(w1.at(-1) - CIRCLE[1]) < 0.01
  t.check('M-04', rising && falling && held && widths && shrink.at(-1) <= 0.001 && Math.abs(morphDur - MORPH_S) < 0.12 && mid > 0.1 && mid < 0.9 && worstFrame <= 34,
    `morph 2->1: 1 extends ${f2(grow[0])} -> ${f2(grow.at(-1))} in ~${f2(morphDur)}s (mid ${f2(mid)}, rising ${rising}), width ${f2(w0[0])} -> ${f2(w0.at(-1))}; ` +
    `2 shrinks ${f2(shrink[0])} -> ${f2(shrink.at(-1))} (falling ${falling}), width ${f2(w1[0])} -> ${f2(w1.at(-1))}; 3 and 4 stay circles ${held}; ` +
    `${steps.length} frames, longest ${worstFrame.toFixed(1)}ms`)

  t.check('M-04', offsets.every((d) => d <= 0.5),
    `numbers centred in their circles: worst ${offsets.map((d) => `${f2(d)}px`).join(', ')} across hover 1, 3, 4, 2`)

  // The photo keeps Figma's 30px of white round whichever loop is out, and no more.
  const bands = await page.$$eval(`${t.section} [role="tabpanel"] svg path`, (ps) => ps.map((p) => [parseFloat(getComputedStyle(p).strokeDasharray), parseFloat(getComputedStyle(p).strokeWidth)]))
  const bandOk = bands.length === 4 && bands.every(([d, w], i) => (i === 1 ? d >= 0.999 && Math.abs(w - (PILL_W + 2 * GAP)) < 0.01 : d <= 0.001 && Math.abs(w - CIRCLE[i]) < 0.01))
  t.check('M-05', bandOk && clear.every((c) => c.n > 500 && c.bad === 0),
    `white band round the loop, from screenshots: ${clear.map((c) => `${c.tab} ${c.bad}/${c.n} points not white`).join(', ')}; ` +
    `band at rest ${bands.map(([d, w]) => `${d >= 0.999 ? 'loop' : 'circle'} ${f2(w)}px`).join(', ')} (loop ${f2(PILL_W)} + 2 x ${GAP})`)

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

  // M-05: one photo, the Figma image fill, shown in every state and never swapped.
  const photos = await page.$$eval(`${t.section} img`, (imgs) => Promise.all(imgs.map(async (i) => {
    const decoded = await i.decode().then(() => true, () => false)
    const r = i.getBoundingClientRect()
    return { src: i.src.split('/').pop(), w: i.naturalWidth, h: i.naturalHeight, at2x: decoded && Math.abs(i.naturalWidth - 2 * r.width) <= 1.5 && Math.abs(i.naturalHeight - 2 * r.height) <= 1.5, clip: getComputedStyle(i).clipPath.startsWith('path(') }
  })))
  t.check('M-05', photos.length === 1 && photos[0].src === PHOTO && photos[0].at2x && photos[0].clip && [rest, ...hovered.map(([, s]) => s), ...keyed.map(([, s]) => s)].every((s) => s.photo === PHOTO),
    `one photo: ${photos.map((p) => `${p.src} ${p.w}x${p.h} decoded at 2x its box ${p.at2x}, clipped to the Figma vector ${p.clip}`).join(', ')}; shown unchanged in all ${1 + hovered.length + keyed.length} states sampled`)

  // M-06: the tagline.
  const lines = await fit(page)
  t.check('M-06', rest.line === LINES[REST] && [...hovered, ...keyed].every(([i, s]) => s.line === LINES[i]),
    `tagline per state: rest "${rest.line}" (94:274); hover ${hovered.map(([, s]) => `"${s.line}"`).join(', ')}`)
  t.check('M-06', lines.every((l) => l.lines <= 3 && l.bottom <= lines[REST].bottom && l.w <= 254),
    `fits 254x108: ${lines.map((l, i) => `${i + 1} ${l.lines} lines ${l.w}px, text bottom ${l.bottom}px`).join('; ')} (state 2 sets the limit)`)
  // One line at a time: 2 fades out, then 1 fades in, never both drawn.
  const shown = one.map((x) => x[2].filter((a) => a > 0.01).length)
  const iOut = one.findIndex((x) => x[2][1] <= 0.01), iIn2 = one.findIndex((x) => x[2][0] >= 0.999)
  const swap = (one[iIn2]?.[0] - one[0][0]) / 1000
  const between = one.slice(0, iIn2 + 1).some((x) => x[2].every((a) => a <= 0.01))
  const part = (k) => one.filter((x) => x[2][k] > 0.05 && x[2][k] < 0.95).length
  t.check('M-06', Math.max(...shown) === 1 && iOut >= 0 && iIn2 > iOut && swap > 0.2 && swap < 0.45 && part(1) >= 3 && part(0) >= 3,
    `swap 2->1: at most ${Math.max(...shown)} line drawn per frame over ${one.length} frames; 2 fades out over ${part(1)} part-way frames, gone at frame ${iOut}; ` +
    `1 fades in over ${part(0)}, full at ${iIn2} (${f2(swap)}s)${between ? ', a blank frame between' : ''}`)
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
  const morph = await page.$$eval(`${t.section} svg path`, (els) => Math.max(...els.map((e) => parseFloat(getComputedStyle(e).transitionDuration) || 0)))
  t.check('M-04', is(rest, REST) && all(seen) && all(keys) && morph === 0,
    `reduced, still switches with no morph: hover ${trail(seen)}, keys ${keys.map(([, s, k]) => `${k}->${s.selected}`).join(' ')}, each within 2 frames; longest shape transition ${morph}s`)
  t.check('M-05', [...seen, ...keys].every(([, s]) => s.photo === PHOTO) && Math.max(...durs) === 0,
    `reduced, one photo and instant lines: ${[...new Set(seen.map(([, s]) => s.photo))].join(', ')}; longest transition ${Math.max(...durs)}s`)
  t.check('M-06', [...seen, ...keys].every(([i, s]) => s.line === LINES[i]),
    `reduced, tagline instant: ${seen.map(([, s]) => `"${s.line}"`).join(', ')}`)
}
