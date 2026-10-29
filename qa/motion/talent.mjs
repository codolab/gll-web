// M-04..M-06: the four numbered shapes (94:266, 94:269, 94:268, 94:267) are tabs
// with automatic activation (hover, focus, tap, arrow keys); each state swaps the
// blob photo (94:265 stack) and the tagline (94:274 stack) in one tab panel, with
// a 0.3s fade that never thins the blob, instant under reduced motion. State 1 is
// the Figma frame. One t.check per aspect.
const PHOTOS = ['vilnius-portrait.webp', 'members-group.webp', 'members-selfie.webp', 'members-networking.webp']
const LINES = ['One community. Endless possibilities.', 'Global minds. Lithuanian roots.', 'Your next chapter starts here.', 'Go further, together.']
// Node ids per canvas (wide repeats 94:935 inside 173:509): pill, heading, photo, tagline, shapes frame.
const NODES = {
  desktop: { pill: '94:269', title: '94:261', photo: '94:265', line: '94:274', frame: '94:264' },
  wide: { pill: '173:518', title: '173:510', photo: '173:514', line: '173:523', frame: '173:513' },
}
let N = NODES.desktop
// pill.svg's centreline at t = 0.5, in the 94:269 box: deep inside the 135px stroke.
const PILL_MID = { x: 82.4, y: 143.9 }
const SETTLE_MS = 650
const f2 = (n) => n.toFixed(2)
// Other builders' edits can hot-reload the shared dev page mid-run, resetting it to state 1.
const mark = (page) => page.evaluate(() => { window.__same = true })
const reloaded = async (page) => !(await page.evaluate(() => window.__same))
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => {
  const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : r())
  f(n)
}), n)

/** Shown photo and line (opaque and visible), tab state, focus and its ring. */
const snap = (page) => page.evaluate((PILL) => {
  const sec = document.querySelector('[data-section="talent"]')
  const on = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' && +cs.opacity >= 0.999 }
  const tabs = [...sec.querySelectorAll('[role="tab"]')]
  const a = document.activeElement
  const ring = (b) => b.dataset.nodeId === PILL
    ? getComputedStyle(b.querySelector('svg path')).display !== 'none'
    : getComputedStyle(b).outlineStyle === 'solid' && parseFloat(getComputedStyle(b).outlineWidth) >= 2
  return {
    photo: [...sec.querySelectorAll('img')].filter((i) => i.src.endsWith('.webp') && on(i)).map((i) => i.src.split('/').pop()).join('+'),
    line: [...sec.querySelectorAll('p')].filter(on).map((p) => p.textContent).join('+'),
    selected: tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true') + 1,
    nSelected: tabs.filter((b) => b.getAttribute('aria-selected') === 'true').length,
    tabindex: tabs.map((b) => b.tabIndex).join(','),
    focus: tabs.indexOf(a) + 1,
    ring: tabs.includes(a) ? ring(a) : null,
  }
}, N.pill)
const roving = (i) => [0, 1, 2, 3].map((k) => (k === i ? 0 : -1)).join(',')
const is = (s, i) => s.selected === i + 1 && s.nSelected === 1 && s.tabindex === roving(i) && s.photo === PHOTOS[i] && s.line === LINES[i]
const all = (list) => list.every(([i, s]) => is(s, i))
const trail = (list, key = 'selected') => list.map(([i, s]) => `${i + 1}->${s[key]}`).join(' ')

/** A point inside each shape: circle centres, and the pill's centreline. */
const points = (page) => page.evaluate(({ PILL, PILL_MID }) =>
  [...document.querySelectorAll('[data-section="talent"] [role="tab"]')].map((b) => {
    const r = b.getBoundingClientRect()
    return b.dataset.nodeId === PILL ? { x: r.left + PILL_MID.x, y: r.top + PILL_MID.y } : { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }), { PILL: N.pill, PILL_MID })

const away = async (page) => {
  const h = await page.$eval(`[data-node-id="${N.title}"]`, (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(h.left + h.width / 2, h.top + h.height / 2)
}

/** Every frame for `ms`: each photo's and each line's effective opacity. */
const sampleFades = (page, ms) => page.evaluate((ms) => {
  const sec = document.querySelector('[data-section="talent"]')
  const photos = [...sec.querySelectorAll('img')].filter((i) => i.src.endsWith('.webp'))
  const lines = [...sec.querySelectorAll('p')]
  const op = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' ? +cs.opacity : 0 }
  window.__fade = []
  const t0 = performance.now()
  const f = (now) => {
    window.__fade.push([now, photos.map(op), lines.map(op)])
    if (now - t0 < ms) requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}, ms)
/** Union coverage of the stacked photos (identical alpha), per frame. */
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

/** Hit test over each shape: does the pointer target the tab exactly where the shape paints? */
const hitArea = (page) => page.evaluate(async (PILL) => {
  const out = []
  for (const b of document.querySelectorAll('[data-section="talent"] [role="tab"]')) {
    const r = b.getBoundingClientRect()
    let inside, box
    if (b.dataset.nodeId === PILL) {
      // Ground truth: the alpha of pill.svg itself, drawn at its displayed size.
      const img = b.querySelector('img'), ir = img.getBoundingClientRect()
      const c = Object.assign(document.createElement('canvas'), { width: ir.width, height: ir.height })
      const im = new Image(); im.src = img.src; await im.decode()
      const g = c.getContext('2d'); g.drawImage(im, 0, 0, ir.width, ir.height)
      const d = g.getImageData(0, 0, c.width, c.height).data
      const al = (x, y) => (x < 0 || y < 0 || x >= c.width || y >= c.height ? 0 : d[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3])
      inside = (x, y) => {
        const lx = x - ir.left, ly = y - ir.top
        const s = [al(lx, ly), al(lx - 2, ly), al(lx + 2, ly), al(lx, ly - 2), al(lx, ly + 2)]
        return s.every((a) => a > 250) ? true : s.every((a) => a < 5) ? false : null
      }
      box = [ir.left - 12, ir.top - 12, ir.width + 24, ir.height + 24]
    } else {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2
      inside = (x, y) => { const e = Math.hypot(x - cx, y - cy) - rad; return e < -2 ? true : e > 2 ? false : null }
      box = [r.left - 12, r.top - 12, r.width + 24, r.height + 24]
    }
    let n = 0, ok = 0
    for (let y = box[1] + 1; y < box[1] + box[3]; y += 3) {
      for (let x = box[0] + 1; x < box[0] + box[2]; x += 3) {
        const want = inside(x, y)
        if (want === null) continue
        n++; ok += (document.elementFromPoint(x, y)?.closest('[role="tab"]') === b) === want
      }
    }
    out.push({ id: b.dataset.nodeId, ok, n })
  }
  return out
}, N.pill)

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
  N = NODES[t.surface]
  await mark(page)
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  await t.sleep(200)

  // Tabs semantics at rest.
  const rest = await snap(page)
  const aria = await page.locator(t.section).ariaSnapshot()
  const wiring = await page.evaluate((N) => {
    const sec = document.querySelector('[data-section="talent"]')
    const panel = sec.querySelector('[role="tabpanel"]')
    const tabs = [...sec.querySelectorAll('[role="tablist"] [role="tab"]')]
    const active = tabs.find((b) => b.getAttribute('aria-selected') === 'true')
    return {
      tabs: tabs.length,
      controls: tabs.every((b) => b.getAttribute('aria-controls') === panel.id),
      labelled: panel.getAttribute('aria-labelledby') === active.id,
      holds: panel.contains(sec.querySelector(`[data-node-id="${N.photo}"]`)) && panel.contains(sec.querySelector(`[data-node-id="${N.line}"]`)),
    }
  }, N)
  t.check('M-04', is(rest, 0) && wiring.tabs === 4 && wiring.controls && wiring.labelled && wiring.holds &&
      aria.includes('tablist "A world of Lithuanian talent"') && aria.includes('tab "1: One community. Endless possibilities." [selected]') &&
      aria.includes('tabpanel "1: One community. Endless possibilities."'),
    `tabs semantics: tablist named by the h2, ${wiring.tabs} tabs, aria-controls -> panel ${wiring.controls}, panel labelled by the selected tab ${wiring.labelled}, ` +
    `panel holds ${N.photo} + ${N.line} ${wiring.holds}; rest selected ${rest.selected}, tabindex ${rest.tabindex}`)

  const hits = await hitArea(page)
  t.check('M-04', hits.every((h) => h.n > 0 && h.ok === h.n),
    `hit area matches the painted shape (2px edge band skipped): ${hits.map((h) => `${h.id} ${h.ok}/${h.n}`).join(', ')}`)

  // Hover 2, 3, 4, 1, sampling the 1 -> 2 fade.
  const pts = await points(page)
  const hovered = []
  let one
  for (const i of [1, 2, 3, 0]) {
    if (i === 1) await sampleFades(page, 800)
    await page.mouse.move(pts[i].x, pts[i].y)
    await t.sleep(i === 1 ? 900 : SETTLE_MS)
    if (i === 1) one = await page.evaluate(() => window.__fade)
    hovered.push([i, await snap(page)])
  }
  t.check('M-04', all(hovered), `hover selects: ${trail(hovered)}`)

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
  await page.$eval(`[data-node-id="${N.frame}"]`, (el) => el.scrollIntoView({ block: 'center' }))
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
    `focus ring: keyboard focus ${rings.filter(Boolean).length}/${rings.length} drawn (outline / pill stroke), mouse click focus ${clicked.ring ? 'drawn' : 'none'}`)

  const touch = await t.browser.newPage({ viewport: { width: t.width ?? 1440, height: 900 }, hasTouch: true, reducedMotion: 'no-preference' })
  await touch.goto(t.url, { waitUntil: 'networkidle' })
  await touch.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await t.sleep(200)
  const tp = await points(touch)
  await mark(touch)
  const tapped = []
  for (const i of [1, 3]) {
    await touch.touchscreen.tap(tp[i].x, tp[i].y)
    await t.sleep(SETTLE_MS)
    tapped.push([i, await snap(touch)])
  }
  const touchReset = await reloaded(touch)
  await touch.close()
  t.check('M-04', all(tapped) && !touchReset, `tap selects: ${trail(tapped)}${touchReset ? ' (page reloaded mid-check, rerun)' : ''}`)

  // M-05: the photo.
  const pre = await page.evaluate(() => [...document.querySelectorAll('[data-section="talent"] img')]
    .filter((i) => i.src.endsWith('.webp')).map((i) => ({ ok: i.complete && i.naturalWidth === 1009 && i.naturalHeight === 1059, box: JSON.stringify(i.getBoundingClientRect()) })))
  t.check('M-05', pre.length === 4 && pre.every((p) => p.ok && p.box === pre[0].box),
    `preloaded: ${pre.filter((p) => p.ok).length}/4 decoded at 1009x1059 before input, one shared box ${pre.every((p) => p.box === pre[0].box)}`)
  t.check('M-05', rest.photo === PHOTOS[0] && [...hovered, ...keyed].every(([i, s]) => s.photo === PHOTOS[i]),
    `photo per state: rest ${rest.photo}; hover ${hovered.map(([, s]) => s.photo).join(', ')}; keys ${keyed.map(([, s]) => s.photo.replace('.webp', '')).join(', ')}`)

  const pf = fade(one, 0, 1, 'photo')
  const durs = await page.$$eval(`${t.section} img[src$=".webp"]`, (imgs) => imgs.map((i) => parseFloat(getComputedStyle(i).transitionDuration) || 0))
  const inDur = Math.max(...durs)
  const cov1 = Math.min(...coverage(one))
  t.check('M-05', Math.abs(inDur - 0.3) < 0.01 && pf.dur > 0.2 && pf.dur < 0.5 && pf.mid > 0.05 && pf.mid < 0.95 && pf.held && cov1 >= 0.999,
    `crossfade 1->2: incoming transition ${f2(inDur)}s, measured ${f2(pf.dur)}s, mid-fade ${f2(pf.mid)}, photo 1 opaque underneath ${pf.held}, blob coverage min ${f2(cov1)}`)

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
  t.check('M-06', rest.line === LINES[0] && [...hovered, ...keyed].every(([i, s]) => s.line === LINES[i]),
    `tagline per state: rest "${rest.line}" (${N.line}); hover ${hovered.map(([, s]) => `"${s.line}"`).join(', ')}`)
  t.check('M-06', lines.every((l) => l.lines <= 3 && l.bottom <= lines[0].bottom && l.w <= 254),
    `fits 254x108: ${lines.map((l, i) => `${i + 1} ${l.lines} lines ${l.w}px, text bottom ${l.bottom}px`).join('; ')} (state 1 sets the limit)`)
  const lf = fade(one, 0, 1, 'line')
  const lineDur = await page.$eval(`[data-node-id="${N.line}"]`, (el) => parseFloat(getComputedStyle(el).transitionDuration))
  t.check('M-06', Math.abs(lineDur - 0.3) < 0.01 && lf.dur > 0.2 && lf.dur < 0.5 && lf.mid > 0.05 && lf.mid < 0.95,
    `crossfade 1->2: transition ${f2(lineDur)}s, measured ${f2(lf.dur)}s, mid-fade ${f2(lf.mid)}`)
  if (await reloaded(page)) t.check('M-04', false, 'page reloaded mid-run (dev server hot reload): the checks above saw a reset page, rerun')
}

export async function reduced(page, t) {
  N = NODES[t.surface]
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  await t.sleep(200)
  const rest = await snap(page)
  const pts = await points(page)
  const seen = []
  for (const i of [1, 2, 3, 0]) {
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
  t.check('M-04', is(rest, 0) && all(seen) && all(keys),
    `reduced, still switches: hover ${trail(seen)}, keys ${keys.map(([, s, k]) => `${k}->${s.selected}`).join(' ')}, each within 2 frames`)
  t.check('M-05', [...seen, ...keys].every(([i, s]) => s.photo === PHOTOS[i]) && Math.max(...durs) === 0,
    `reduced, photo instant: ${seen.map(([, s]) => s.photo).join(', ')}; longest transition ${Math.max(...durs)}s`)
  t.check('M-06', [...seen, ...keys].every(([i, s]) => s.line === LINES[i]),
    `reduced, tagline instant: ${seen.map(([, s]) => `"${s.line}"`).join(', ')}`)
}
