// M-10 photo zoom on card hover/focus, M-11 looping arrows, M-12 touch and pen swipe (meet, 94:199 / 173:430).
// One table per canvas (t.surface); every check reads its ids and slots from it.
const SURFACES = {
  desktop: {
    CARDS: ['94:230', '94:202', '94:212', '94:221'],
    PHOTO: { '94:230': '94:231', '94:202': '94:203', '94:212': '94:213', '94:221': '94:222' },
    CTA: { '94:230': '94:237', '94:202': '94:210', '94:212': '94:219', '94:221': '94:228' },
    TITLE: { '94:230': '94:236', '94:202': '94:209', '94:212': '94:218', '94:221': '94:227' },
    BAKED: ['94:230', '94:202'], // photo renders with the curve baked in; a copy of the curve shows while zoomed
    TALL: '94:230', // the one photo frame 381 high (the others 356)
    PREV: '94:257', NEXT: '94:253', HEADING: '94:200', GROUP: '94:201', GROUP_W: 1396.172,
    SLOTS: [0, 352.043, 704.086, 1056.129], PITCH: 352.043,
  },
  // Five slots for four events: Grow Your Impact twice (173:442, 173:451). The fifth overhangs the
  // frame, so its link leaves the Tab order while cut off; 173:460 lies under the row, inert.
  wide: {
    CARDS: ['173:478', '173:432', '173:442', '173:469', '173:451'],
    PHOTO: { '173:478': '173:479', '173:432': '173:433', '173:442': '173:443', '173:469': '173:470', '173:451': '173:452' },
    CTA: { '173:478': '173:485', '173:432': '173:440', '173:442': '173:449', '173:469': '173:476', '173:451': '173:458' },
    TITLE: { '173:478': '173:484', '173:432': '173:439', '173:442': '173:448', '173:469': '173:475', '173:451': '173:457' },
    BAKED: ['173:478', '173:432'],
    TALL: '173:478',
    PREV: '173:505', NEXT: '173:501', HEADING: '173:431', GROUP: '173:1359', GROUP_W: 1748.043,
    SLOTS: [0, 352, 704.1, 1056, 1408], PITCH: 352, PEEK: true, UNDER: '173:460',
  },
}
let CARDS, PHOTO, CTA, TITLE, BAKED, TALL, PREV, NEXT, HEADING, GROUP, GROUP_W, SLOTS, PITCH, PEEK, UNDER, N
const use = (surface) => {
  ;({ CARDS, PHOTO, CTA, TITLE, BAKED, TALL, PREV, NEXT, HEADING, GROUP, GROUP_W, SLOTS, PITCH, PEEK, UNDER } = SURFACES[surface])
  N = CARDS.length
}
const sel = (id) => `[data-node-id="${id}"]`
const curveSel = (card) => `${sel(card)} > img[src$="curve.svg"]`
const imgSel = (card) => `${sel(PHOTO[card])} > img`
const viewportSel = () => `${sel(GROUP)} > div:first-child` // the clipping, swipe-handling box around the track
const fmt = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d)
const WAIT = { timeout: 5000 }
/** waitForFunction that says what it was waiting for when it times out. */
const until = (page, what, fn, arg) => page.waitForFunction(fn, arg, WAIT).catch((e) => {
  throw new Error(`waiting for ${what}: ${String(e.message).split('\n')[0]}`)
})

const rect = (page, s) => page.$eval(s, (el) => el.getBoundingClientRect().toJSON())
const style = (page, s) => page.$eval(s, (el) => {
  const cs = getComputedStyle(el)
  return { scale: cs.scale, transform: cs.transform, visibility: cs.visibility, touchAction: cs.touchAction }
})
const away = async (page) => {
  const h = await rect(page, sel(HEADING))
  await page.mouse.move(h.left + 4, h.top + h.height / 2)
}
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r()); requestAnimationFrame(f) }), n)

/** Real cards by x within the group, in canvas px; the first is the one in the first slot. */
const order = (page) => page.evaluate(([ids, s, w]) => {
  const track = document.querySelector(s).getBoundingClientRect()
  const k = track.width / w
  return ids.map((id) => ({ id, x: (document.querySelector(`[data-node-id="${id}"]`).getBoundingClientRect().left - track.left) / k }))
    .sort((a, b) => a.x - b.x)
}, [CARDS, sel(GROUP), GROUP_W])
const showOrder = (o) => o.map((c) => `${c.id}@${fmt(c.x, 1)}`).join(' ')
// 0.02: Chromium lays boxes out in 1/64 px units.
const atSlots = (o, first) => {
  const i = CARDS.indexOf(first)
  return o.every((c, s) => c.id === CARDS[(i + s) % N] && Math.abs(c.x - SLOTS[s]) < 0.02)
}
const firstAfter = (first, steps) => CARDS[(((CARDS.indexOf(first) + steps) % N) + N) % N]
/** The element that moves the cards (parent of the real cards). */
const trackTransform = (page) => page.$eval(sel(CARDS[0]), (el) => getComputedStyle(el.parentElement).transform)
/** Resolves once the track has no running slide and no transform. */
const settled = (page) => until(page, 'the track to settle', (s) => {
  const track = document.querySelector(s).parentElement
  return track.getAnimations().length === 0 && getComputedStyle(track).transform === 'none'
}, sel(CARDS[0]))
const clickTimes = async (page, id, n, gap = 0) => {
  for (let i = 0; i < n; i++) {
    await page.click(sel(id))
    if (gap) await page.waitForTimeout(gap)
  }
}

/**
 * Sample the img width (zoom) or the track translateX (slide) every frame until it reaches
 * `done(v, seenMove)` or maxMs passes. Frame-based, so a slow machine only stretches it.
 */
const sample = (page, s, what, target, maxMs = 2500) => page.$eval(s, (el, [what, target, maxMs]) => new Promise((resolve) => {
  const out = []
  const t0 = performance.now()
  let moved = false
  const f = (now) => {
    const v = what === 'width' ? el.getBoundingClientRect().width : new DOMMatrixReadOnly(getComputedStyle(el.parentElement).transform).m41
    out.push([now - t0, v])
    moved ||= what === 'width' ? Math.abs(v - out[0][1]) > 0.01 : v !== 0
    const done = what === 'width' ? Math.abs(v - target) < 0.05 : moved && v === 0
    if (done || now - t0 > maxMs) resolve(out)
    else requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}), [what, target, maxMs])

/**
 * Rest vs hovered screenshots of one card, compared in page: pixels fully under the curve
 * (eroded 2px against a 1px clip offset) and below the photo must not change; the photo must.
 * Held pixels may move by WebP noise only: the baked blush is off by up to 3 per channel and
 * the curve copy paints the exact #fce9e6 over it. A real leak differs by tens.
 */
const pixelsHeld = (page, a, b, curveX, photoH) => page.evaluate(async ([a, b, cx, ph]) => {
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src })
  const [ia, ib, svg] = await Promise.all([load(`data:image/png;base64,${a}`), load(`data:image/png;base64,${b}`), load('/assets/meet/curve.svg')])
  const W = ia.naturalWidth, H = ia.naturalHeight
  const px = (draw) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); draw(g); return g.getImageData(0, 0, W, H).data }
  const A = px((g) => g.drawImage(ia, 0, 0)), B = px((g) => g.drawImage(ib, 0, 0)), M = px((g) => g.drawImage(svg, cx, 250, 341, 188))
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && M[(y * W + x) * 4 + 3] === 255
  let held = 0, heldChanged = 0, heldNoise = 0, heldMax = 0, photo = 0, photoChanged = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]))
    const under = [[0, 0], [0, -2], [-2, 0], [2, 0], [0, 2]].every(([dx, dy]) => solid(x + dx, y + dy))
    if (under || y >= ph + 2) { held++; heldChanged += d > 12; heldNoise += d > 0 && d <= 12; heldMax = Math.max(heldMax, d) }
    else if (y < 240) { photo++; photoChanged += d > 2 }
  }
  return { held, heldChanged, heldNoise, heldMax, photoChangedPct: (100 * photoChanged) / photo }
}, [a, b, curveX, photoH])

/** The part of a card the window shows (the wide fifth slot runs off the frame). */
const shown = async (page, r) => {
  const vw = page.viewportSize().width
  return { ...r, right: Math.min(r.right, vw), width: Math.min(r.right, vw) - r.left }
}
/** Screenshot of a card; one the window cuts off is shot up to the window edge. */
const cardShot = async (page, card) => {
  const r = await rect(page, sel(card))
  if (r.right <= page.viewportSize().width) return (await page.locator(sel(card)).screenshot()).toString('base64')
  const s = await shown(page, r)
  return (await page.screenshot({ clip: { x: s.left, y: s.top, width: s.width, height: s.height } })).toString('base64')
}

/**
 * Main-frame navigations after load: none of these checks may navigate. A reload of the page
 * itself is the shared dev server's full reload (another section's edit), not this section.
 */
const watchNavigation = (page) => {
  const seen = []
  page.on('framenavigated', (f) => f === page.mainFrame() && seen.push(f.url()))
  return seen
}

/** The first n stops Tab visits from just before the carousel, with their x and the page's sideways scroll. */
const tabOrder = async (page, n) => {
  await page.$eval(sel(GROUP), (box) => {
    const all = [...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('[inert]'))
    all[all.findIndex((e) => box.contains(e)) - 1].focus()
  })
  const seen = []
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    seen.push(await page.evaluate(() => ({ id: document.activeElement.dataset.nodeId, x: document.activeElement.getBoundingClientRect().left })))
  }
  const scrolled = await page.evaluate(() => scrollX + document.querySelector('main').scrollLeft)
  await page.evaluate(() => document.activeElement.blur())
  return Object.assign(seen, { scrolled })
}

export default async function (page, t) {
  use(t.surface)
  const navs = watchNavigation(page)
  try {
    await motionChecks(page, t)
    if (PEEK) await bleedChecks(t)
  } finally {
    if (navs.length) t.check('navigation', false, `desktop page navigated to ${navs.join(', ')}`)
  }
}

async function motionChecks(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const labels = await page.evaluate(([p, n]) => [p, n].map((id) => document.querySelector(`[data-node-id="${id}"]`).getAttribute('aria-label')), [PREV, NEXT])
  const o0 = await order(page)
  t.check('M-11', atSlots(o0, CARDS[0]) && (await trackTransform(page)) === 'none' && labels.join() === 'Previous events,Next events',
    `rest: ${showOrder(o0)}, track transform ${await trackTransform(page)}; ${PREV} "${labels[0]}", ${NEXT} "${labels[1]}"`)
  const clones = await page.$$eval(`${sel(GROUP)} article:not([data-node-id])`, (els) =>
    els.map((a) => a.getAttribute('aria-hidden') === 'true' && a.inert && !a.querySelector('[data-node-id]')))
  t.check('M-11', clones.length === 2 * N && clones.every(Boolean), `${clones.length} clone cards, all aria-hidden + inert + no data-node-id: ${clones.every(Boolean)}`)
  if (UNDER) {
    // The card Figma leaves under the row: drawn, never reachable, and it does not move with the track.
    const under = await page.$eval(sel(UNDER), (a, g) => ({
      inert: a.inert, hidden: a.getAttribute('aria-hidden'), outside: !document.querySelector(g).contains(a),
      behind: !!(a.compareDocumentPosition(document.querySelector(g)) & Node.DOCUMENT_POSITION_FOLLOWING),
    }), sel(GROUP))
    t.check('M-11', under.inert && under.hidden === 'true' && under.outside && under.behind,
      `${UNDER} (under the row): inert ${under.inert}, aria-hidden ${under.hidden}, outside the track group ${under.outside}, painted before it ${under.behind}`)
  }

  // M-10, card by card.
  for (const card of CARDS) {
    const img = imgSel(card)
    const baked = BAKED.includes(card)
    await page.$eval(sel(card), (el) => el.scrollIntoView({ block: 'center' }))
    await away(page)
    await until(page, `${card} photo at rest`, (s) => getComputedStyle(document.querySelector(s)).scale === 'none', img)
    const rest = { img: await rect(page, img), card: await rect(page, sel(card)), curve: await rect(page, curveSel(card)), title: await rect(page, sel(TITLE[card])) }
    const restStyle = await style(page, img)
    const restCurve = await style(page, curveSel(card))
    const shotRest = await cardShot(page, card)
    const sampling = sample(page, img, 'width', rest.img.width * 1.06)
    const vis = await shown(page, rest.card)
    await page.mouse.move(vis.left + vis.width / 2, rest.card.top + 120)
    const samples = await sampling
    await frames(page)
    const hov = { img: await rect(page, img), card: await rect(page, sel(card)), curve: await rect(page, curveSel(card)), title: await rect(page, sel(TITLE[card])) }
    const hovCurve = await style(page, curveSel(card))
    const shotHov = await cardShot(page, card)
    const ratio = hov.img.width / rest.img.width
    const tStart = samples.find(([, w]) => w > rest.img.width + 0.01)?.[0] ?? NaN
    const tEnd = samples.find(([, w]) => Math.abs(w - rest.img.width * 1.06) < 0.05)?.[0] ?? NaN
    const tHalf = samples.find(([, w]) => w >= rest.img.width * 1.03)?.[0] ?? NaN
    const dur = (tEnd - tStart) / 1000, half = (tHalf - tStart) / 1000
    const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2]
    const dc = Math.hypot(centre(hov.img)[0] - centre(rest.img)[0], centre(hov.img)[1] - centre(rest.img)[1])
    const same = (a, b) => ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.01)
    const px = await pixelsHeld(page, shotRest, shotHov, rest.curve.left - rest.card.left, card === TALL ? 381 : 356)
    const curveShown = baked ? restCurve.visibility === 'hidden' && hovCurve.visibility === 'visible' : hovCurve.visibility === 'visible'
    await away(page)
    // The curve copy hides only once the zoom-out is over, so wait for both.
    await until(page, `${card} zoom-out`, ([i, c, baked]) => getComputedStyle(document.querySelector(i)).scale === 'none' &&
      (!baked || getComputedStyle(document.querySelector(c)).visibility === 'hidden'), [img, curveSel(card), baked])
    const left = await style(page, img)
    const leftCurve = await style(page, curveSel(card))
    const back = await rect(page, img)
    t.check('M-10',
      restStyle.scale === 'none' && restStyle.transform === 'none' && Math.abs(ratio - 1.06) < 0.002 && dc < 0.05 &&
        same(rest.card, hov.card) && same(rest.curve, hov.curve) && same(rest.title, hov.title) && curveShown &&
        dur > 0.3 && dur < 1 && half < dur / 2 && px.heldChanged === 0 && px.photoChangedPct > 30 &&
        left.transform === 'none' && same(back, rest.img),
      `${card}${baked ? ' (baked curve)' : ''}: rest scale ${restStyle.scale}/transform ${restStyle.transform}; hover scales photo ${fmt(ratio, 4)}x ` +
      `in ~${fmt(dur)}s (half at ${fmt(half)}s, ease-out), centre moved ${fmt(dc)}px; card/curve/title boxes unchanged ${same(rest.card, hov.card)}/${same(rest.curve, hov.curve)}/${same(rest.title, hov.title)}; ` +
      `curve ${baked ? `copy ${restCurve.visibility} -> ${hovCurve.visibility}` : 'vector visible'}; pixels under curve + below photo changed ${px.heldChanged}/${px.held} (noise-level ${px.heldNoise}, max channel delta ${px.heldMax}), photo above curve changed ${fmt(px.photoChangedPct, 1)}%; ` +
      `leave: scale ${left.scale}${baked ? `, copy ${leftCurve.visibility}` : ''}`)

    // M-G4: keyboard focus on the card's link zooms too.
    await page.focus(sel(CTA[card]))
    await until(page, `${card} zoom on focus`, ([s, w]) => Math.abs(document.querySelector(s).getBoundingClientRect().width - w) < 0.05, [img, rest.img.width * 1.06])
    const focused = await rect(page, img)
    await page.$eval(sel(CTA[card]), (el) => el.blur())
    await until(page, `${card} zoom-out on blur`, (s) => getComputedStyle(document.querySelector(s)).scale === 'none', img)
    t.check('M-10', Math.abs(focused.width / rest.img.width - 1.06) < 0.002,
      `${card}: focus on link ${CTA[card]} scales photo ${fmt(focused.width / rest.img.width, 4)}x, blur -> scale none`)
  }

  // M-11: next steps one pitch with a 0.5s slide, and N steps come back round.
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  const seen = []
  let slide = null
  for (let i = 1; i <= N; i++) {
    const sampling = i === 1 ? sample(page, sel(CARDS[0]), 'm41') : null
    await page.click(sel(NEXT))
    if (sampling) slide = await sampling
    await settled(page)
    seen.push({ o: await order(page), tf: await trackTransform(page) })
  }
  const want = CARDS.map((_, i) => CARDS[(i + 1) % N])
  const moving = slide.filter(([, x]) => x !== 0)
  const slideDur = moving.length ? (moving.at(-1)[0] - moving[0][0]) / 1000 : 0
  const startX = moving[0]?.[1] ?? 0
  t.check('M-11', seen.every((s, i) => atSlots(s.o, want[i]) && s.tf === 'none') && slideDur > 0.3 && slideDur < 1 && startX > 0.8 * PITCH && startX <= PITCH + 0.5,
    `next x${N}: first card ${seen.map((s) => s.o[0].id).join(' -> ')} (wraps to ${CARDS[0]}), each settled at its slot pitch ${PITCH}, track transform ${[...new Set(seen.map((s) => s.tf))]} after each; ` +
    `first slide ran ~${fmt(slideDur)}s from translateX ${fmt(startX)} (one pitch) to none; after step 1: ${showOrder(seen[0].o)}`)

  const back = []
  for (let i = 1; i <= N; i++) {
    await page.click(sel(PREV))
    await settled(page)
    back.push(await order(page))
  }
  const wantBack = CARDS.map((_, i) => CARDS[(N - 1 - i + N) % N])
  t.check('M-11', back.every((o, i) => atSlots(o, wantBack[i])),
    `prev x${N}: first card ${back.map((o) => o[0].id).join(' -> ')}; after step 1: ${showOrder(back[0])}`)

  // No click is ever lost, however fast they come.
  const bursts = []
  let first = CARDS[0]
  for (const [label, id, n, gap, dir] of [
    ['2 quick nexts', NEXT, 2, 0, 1], ['2 quick prevs', PREV, 2, 0, -1], ['5 quick nexts', NEXT, 5, 0, 1], ['9 quick nexts', NEXT, 9, 0, 1],
    ['9 nexts at 3/s for 3s', NEXT, 9, 333, 1], ['7 quick prevs', PREV, 7, 0, -1],
  ]) {
    const t0 = Date.now()
    await clickTimes(page, id, n, gap)
    const ms = Date.now() - t0
    await settled(page)
    const o = await order(page)
    const expect = firstAfter(first, dir * n)
    bursts.push({ label, ok: atSlots(o, expect), got: o[0].id, expect, ms })
    first = o[0].id
  }
  const sync = await page.$eval(sel(NEXT), (el) => { for (let i = 0; i < 11; i++) el.click() })
  await settled(page)
  const oSync = await order(page)
  const expSync = firstAfter(first, 11)
  bursts.push({ label: '11 clicks in one task', ok: atSlots(oSync, expSync), got: oSync[0].id, expect: expSync, ms: 0, sync })
  first = oSync[0].id
  t.check('M-11', bursts.every((b) => b.ok),
    `bursts from ${CARDS[0]}: ${bursts.map((b) => `${b.label}${b.ms ? ` (${b.ms}ms)` : ''} -> ${b.got} (want ${b.expect})`).join('; ')}`)
  await clickTimes(page, PREV, (CARDS.indexOf(first) + N) % N)
  await settled(page)

  // WCAG 2.4.3: Tab and reading order follow the cards left to right after stepping. On wide the
  // fifth slot is cut off at the frame width, so its link is skipped and Tab goes on to the arrows.
  const tabs = []
  const shownLinks = PEEK ? N - 1 : N
  for (const steps of [1, 2]) {
    await clickTimes(page, NEXT, steps)
    await settled(page)
    const o = await order(page)
    const seq = await tabOrder(page, PEEK ? shownLinks + 1 : shownLinks)
    const ok = seq.slice(0, shownLinks).every((s, i) => s.id === CTA[o[i].id] && (i === 0 || s.x > seq[i - 1].x)) &&
      (!PEEK || (seq[shownLinks].id === PREV && seq.scrolled === 0))
    tabs.push({ after: steps === 1 ? 1 : 3, ok, seq, o })
  }
  await clickTimes(page, NEXT, N - 3)
  await settled(page)
  t.check('M-11', tabs.every((x) => x.ok) && atSlots(await order(page), CARDS[0]),
    tabs.map((x) => `after ${x.after} next: Tab visits ${x.seq.map((s) => `${s.id}@${fmt(s.x, 0)}`).join(' ')} (cards ${x.o.map((c) => c.id).join(' ')})` +
      (PEEK ? `, page scrolled sideways ${x.seq.scrolled}px` : '')).join('; '))

  // Mouse: a drag does not step (swipe is touch and pen), and a CTA click goes through.
  const r = await rect(page, sel(CARDS[2]))
  await page.mouse.move(r.left + 200, r.top + 100)
  await page.mouse.down()
  await page.mouse.move(r.left + 60, r.top + 100, { steps: 8 })
  await page.mouse.up()
  await frames(page, 3)
  const afterDrag = await order(page)
  const animating = await page.$eval(sel(CARDS[0]), (el) => el.parentElement.getAnimations().length)
  await page.evaluate(() => {
    window.__clicks = []
    window.addEventListener('click', (e) => { window.__clicks.push({ id: e.target.closest('a')?.dataset.nodeId, prevented: e.defaultPrevented }); e.preventDefault() })
  })
  await page.click(sel(CTA[CARDS[2]]))
  const clicks = await page.evaluate(() => window.__clicks)
  t.check('M-12', atSlots(afterDrag, CARDS[0]) && !animating && clicks.length === 1 && clicks[0].id === CTA[CARDS[2]] && !clicks[0].prevented,
    `mouse drag 140px left: first card stays ${afterDrag[0].id}, no slide; mouse click on CTA ${CTA[CARDS[2]]} delivered ${JSON.stringify(clicks)}`)

  // M-G4: zoom follows keyboard focus only, so the clicked card unzooms once the pointer leaves.
  await away(page)
  const unzoomed = await until(page, `${CARDS[2]} zoom-out after a mouse click`, (s) => getComputedStyle(document.querySelector(s)).scale === 'none', imgSel(CARDS[2])).then(() => true, () => false)
  const stillFocused = await page.$eval(sel(CTA[CARDS[2]]), (el) => document.activeElement === el && !el.matches(':focus-visible'))
  t.check('M-10', unzoomed && stillFocused, `mouse click then leave: ${CARDS[2]} photo scale ${(await style(page, imgSel(CARDS[2]))).scale}, link still focused (not focus-visible) ${stillFocused}`)

  await touchChecks(t, false)
}

/**
 * Wide only, on a 2560 window (the canvas at 1x, centred, --bleed 460): the row runs on into the
 * right margin with the next cards of the loop and nothing shows left of the first card; the
 * fifth slot's link is reachable once the window shows it; a burst never uncovers the margin.
 */
async function bleedChecks(t) {
  const page = await t.browser.newPage({ viewport: { width: 2560, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]))
  await page.goto(t.url, { waitUntil: 'networkidle' })
  const navs = watchNavigation(page)
  try {
    await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
    await frames(page)
    // Cards (real and clone) by the title they show, left to right, as far as the window reaches.
    const margin = () => page.evaluate(([g, v]) => {
      const group = document.querySelector(g).getBoundingClientRect()
      const clip = document.querySelector(v)
      const box = clip.getBoundingClientRect()
      const cards = [...clip.querySelectorAll('article')].map((a) => ({ r: a.getBoundingClientRect(), title: a.querySelector('h3').textContent.replace(/\s+/g, ' ').trim() }))
        .filter((c) => c.r.right > box.left && c.r.left < Math.min(box.right, innerWidth)).sort((a, b) => a.r.left - b.r.left)
      // Gaps wider than the 12px between cards, from the first card to the window edge.
      let edge = cards[0].r.left, hole = 0
      for (const c of cards) { hole = Math.max(hole, c.r.left - edge); edge = Math.max(edge, c.r.right) }
      const root = document.querySelector('[data-canvas="root"]')
      return {
        bleed: getComputedStyle(root).getPropertyValue('--bleed').trim(), canvasRight: root.getBoundingClientRect().right,
        clipLeft: box.left - group.left, clipRight: box.right, overflow: getComputedStyle(clip).overflowX,
        titles: cards.map((c) => c.title), lastRight: edge, hole, firstLeft: cards[0].r.left - group.left, vw: innerWidth,
      }
    }, [sel(GROUP), viewportSel()])
    const titleOf = (id) => page.$eval(sel(TITLE[id]), (el) => el.textContent.replace(/\s+/g, ' ').trim())
    const loopTitles = await Promise.all(CARDS.map(titleOf))
    const expectTitles = (first, n) => Array.from({ length: n }, (_, i) => loopTitles[(first + i) % N])
    const m0 = await margin()
    const m0ok = m0.clipLeft === 0 && m0.firstLeft === 0 && m0.overflow === 'clip' && m0.clipRight >= m0.vw - 0.5 && m0.lastRight >= m0.vw &&
      m0.hole <= 12.5 && m0.titles.join('|') === expectTitles(0, m0.titles.length).join('|') && m0.titles.length > N
    await page.click(sel(NEXT))
    await settled(page)
    const m1 = await margin()
    const m1ok = m1.lastRight >= m1.vw && m1.hole <= 12.5 && m1.titles.join('|') === expectTitles(1, m1.titles.length).join('|')
    t.check('M-11', m0ok && m1ok,
      `2560 window (--bleed ${m0.bleed}, canvas ends at ${fmt(m0.canvasRight, 0)}): the clip starts at the first card (+${m0.clipLeft}px, overflow ${m0.overflow}) and reaches ${fmt(m0.clipRight, 0)} of ${m0.vw}; ` +
      `cards run to ${fmt(m0.lastRight, 0)} with no gap over 12px (${fmt(m0.hole, 1)}): ${m0.titles.join(' | ')}; after one next: ${m1.titles.join(' | ')}`)
    await page.click(sel(PREV))
    await settled(page)

    const seq = await tabOrder(page, N + 1)
    const o = await order(page)
    const tabOk = seq.slice(0, N).every((s, i) => s.id === CTA[o[i].id]) && seq[N].id === PREV && seq.scrolled === 0
    t.check('M-11', tabOk, `2560 window: the fifth slot's link is shown, so Tab visits ${seq.map((s) => s.id).join(' ')}; page scrolled sideways ${seq.scrolled}px`)

    // Five quick prevs in one task: the first frame of the slide must still cover the window.
    const burst = await page.evaluate(([p, v]) => {
      const btn = document.querySelector(p)
      for (let i = 0; i < 5; i++) btn.click()
      const box = document.querySelector(v).getBoundingClientRect()
      const right = Math.max(...[...document.querySelectorAll(`${v} article`)].map((a) => a.getBoundingClientRect().right))
      const left = Math.min(...[...document.querySelectorAll(`${v} article`)].map((a) => a.getBoundingClientRect().left))
      return { right, left, clipLeft: box.left, vw: innerWidth }
    }, [sel(PREV), viewportSel()])
    await settled(page)
    const after = await order(page)
    t.check('M-11', burst.right >= burst.vw && burst.left <= burst.clipLeft && atSlots(after, firstAfter(CARDS[0], -5)),
      `2560 window, 5 prevs in one task: first slide frame spans cards ${fmt(burst.left, 0)}..${fmt(burst.right, 0)} over the clip ${fmt(burst.clipLeft, 0)}..${burst.vw}; settles on ${after[0].id}`)
  } finally {
    if (navs.length) t.check('navigation', false, `2560 page navigated to ${navs.join(', ')}`)
    for (const e of errors) t.check('pageerror', false, `2560 page: ${e}`)
    await page.close()
  }
}

/** Touch (CDP touch events on a 390px phone), pen (CDP mouse events, pointerType pen) and pinch-zoom. */
async function touchChecks(t, reduce) {
  const ctx = await t.browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reduce ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]))
  await page.goto(t.url, { waitUntil: 'networkidle' })
  const navs = watchNavigation(page)
  try {
    await phoneChecks(t, page, ctx, reduce)
  } finally {
    if (navs.length) t.check('navigation', false, `phone page navigated to ${navs.join(', ')}`)
    for (const e of errors) t.check('pageerror', false, `phone page: ${e}`)
    await ctx.close()
  }
}

async function phoneChecks(t, page, ctx, reduce) {
  const cdp = await ctx.newCDPSession(page)
  const [C0, C1, C2] = CARDS
  await page.$eval(sel(GROUP), (el) => el.scrollIntoView({ block: 'center' }))
  await page.evaluate(() => {
    window.__clicks = { arrived: [], delivered: [] }
    document.addEventListener('click', (e) => window.__clicks.arrived.push(e.target.closest('a')?.dataset.nodeId ?? e.target.tagName), true)
    window.addEventListener('click', (e) => { window.__clicks.delivered.push({ id: e.target.closest('a')?.dataset.nodeId, prevented: e.defaultPrevented }); e.preventDefault() })
  })
  const clicks = async () => page.evaluate(() => { const c = window.__clicks; window.__clicks = { arrived: [], delivered: [] }; return c })
  // A click that should not come gets this long to show up anyway.
  const grace = () => page.waitForTimeout(300)
  const delivered = () => until(page, 'a delivered click', () => window.__clicks.delivered.length > 0)
  const vv = () => page.evaluate(() => ({ scale: visualViewport.scale, x: visualViewport.offsetLeft, y: visualViewport.offsetTop, w: visualViewport.width, h: visualViewport.height }))
  // CDP input (touch, pen, pinch) is in CSS px from the visual viewport's corner; rects are layout px.
  const toInput = async ([x, y]) => { const v = await vv(); return [x - v.x, y - v.y] }
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  const drag = async ([x0, y0], dx, dy) => {
    await touch('touchStart', x0, y0)
    for (let i = 1; i <= 10; i++) { await touch('touchMove', x0 + (dx * i) / 10, y0 + (dy * i) / 10); await frames(page, 1) }
    // Hold still before lifting: no fling, so the page is where the next step expects it.
    for (let i = 0; i < 3; i++) { await touch('touchMove', x0 + dx, y0 + dy); await frames(page, 1) }
    await touch('touchEnd')
    await frames(page, 3)
  }
  const tap = async ([x, y]) => { await touch('touchStart', x, y); await touch('touchEnd') }
  const pen = async ([x0, y0], dx) => {
    const ev = (type, x, buttons) => cdp.send('Input.dispatchMouseEvent', { type, x, y: y0, button: 'left', buttons, clickCount: 1, pointerType: 'pen' })
    await ev('mousePressed', x0, 1)
    for (let i = 1; i <= 10; i++) { await ev('mouseMoved', x0 + (dx * i) / 10, 1); await frames(page, 1) }
    await ev('mouseReleased', x0 + dx, 0)
    await frames(page, 3)
  }
  const centreOf = async (id) => { const r = await rect(page, sel(id)); return toInput([r.left + r.width / 2, r.top + r.height / 2]) }
  const settledOrder = async () => { await settled(page); return order(page) }
  const k = (await rect(page, sel(GROUP))).width / GROUP_W
  const mode = `${reduce ? 'reduced motion: ' : ''}${t.surface} canvas, `

  const p1 = await centreOf(PHOTO[C1])
  await drag(p1, -80, 4)
  const left = await settledOrder()
  await drag(p1, 80, -4)
  const right = await settledOrder()
  await drag(p1, -25, 0)
  const short = await settledOrder()
  t.check('M-12', atSlots(left, C1) && atSlots(right, C0) && atSlots(short, C0),
    `${mode}phone 390px (canvas x${fmt(k, 3)}): touch swipe 80px left -> first card ${left[0].id}, 80px right -> ${right[0].id}, 25px -> ${short[0].id} (no step)`)

  const sy0 = await page.evaluate(() => scrollY)
  await drag(p1, 6, -220)
  await until(page, 'the page scroll to stop', () => new Promise((r) => { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => r(scrollY === y))) }))
  const sy1 = await page.evaluate(() => scrollY)
  const vert = await settledOrder()
  t.check('M-12', sy1 - sy0 > 50 && atSlots(vert, C0),
    `${mode}vertical touch drag 220px up over the cards: page scrolled ${fmt(sy1 - sy0, 0)}px, first card stays ${vert[0].id}`)

  await clicks()
  await tap(await centreOf(CTA[C1]))
  await delivered()
  const tapped = await clicks()
  await drag(await centreOf(CTA[C1]), -80, 0)
  await grace()
  const fromLink = await clicks()
  const afterLinkSwipe = await settledOrder()
  await tap(await centreOf(CTA[C2]))
  await delivered()
  const tap2 = await clicks()
  const ok = (c, id) => c.delivered.length === 1 && c.delivered[0].id === id && !c.delivered[0].prevented
  t.check('M-12', ok(tapped, CTA[C1]) && fromLink.delivered.length === 0 && atSlots(afterLinkSwipe, C1) && ok(tap2, CTA[C2]),
    `${mode}tap on CTA ${CTA[C1]}: ${JSON.stringify(tapped.delivered)}; swipe starting on it: steps to ${afterLinkSwipe[0].id}, clicks arrived ${JSON.stringify(fromLink.arrived)} delivered ${fromLink.delivered.length}; ` +
    `next tap on ${CTA[C2]}: ${JSON.stringify(tap2.delivered)}`)

  await pen(await centreOf(PHOTO[C2]), -80)
  await grace()
  const penLeft = await settledOrder()
  const penClick = await clicks()
  t.check('M-12', atSlots(penLeft, C2) && penClick.delivered.length === 0,
    `${mode}pen drag 80px left: first card ${afterLinkSwipe[0].id} -> ${penLeft[0].id}; click after the drag arrived ${JSON.stringify(penClick.arrived)}, delivered ${penClick.delivered.length} (swallowed)`)

  // Pinch-zoomed: a horizontal drag over the cards pans the zoomed page and does not swipe.
  const ta1 = (await style(page, viewportSel())).touchAction
  await page.$eval(sel(GROUP), (el) => el.scrollIntoView({ block: 'center' }))
  await frames(page)
  // Zoom in on the first card's photo, so the zoomed page has room to pan right.
  const zoomedFirst = (await order(page))[0].id
  const [zx, zy] = await centreOf(PHOTO[zoomedFirst])
  await cdp.send('Input.synthesizePinchGesture', { x: zx, y: zy, scaleFactor: 3, relativeSpeed: 1200, gestureSourceType: 'touch' })
  // A missed wait is reported by the check below, not thrown.
  await until(page, 'zoom', (s) => visualViewport.scale > 2.9 && getComputedStyle(document.querySelector(s)).touchAction === 'auto', viewportSel()).catch(() => {})
  const taZoomed = (await style(page, viewportSel())).touchAction
  const z0 = await vv()
  const [, py] = await centreOf(PHOTO[zoomedFirst])
  await drag([z0.w * 0.85, py], -100, 0)
  await grace()
  const z1 = await vv()
  const zoomedAfter = await order(page)
  const zoomedAnim = await page.$eval(sel(CARDS[0]), (el) => el.parentElement.getAnimations().length)
  const z2 = await vv()
  await cdp.send('Input.synthesizePinchGesture', { x: z2.w / 2, y: z2.h / 2, scaleFactor: 1 / z2.scale, relativeSpeed: 1200, gestureSourceType: 'touch' })
  await until(page, 'unzoom', (s) => visualViewport.scale < 1.01 && getComputedStyle(document.querySelector(s)).touchAction !== 'auto', viewportSel()).catch(() => {})
  const ta2 = (await style(page, viewportSel())).touchAction
  await drag(await centreOf(PHOTO[zoomedFirst]), -80, 0)
  const unzoomed = await settledOrder()
  t.check('M-12',
    ta1 === 'pan-y pinch-zoom' && z0.scale > 2.9 && taZoomed === 'auto' && z1.x - z0.x > 30 && atSlots(zoomedAfter, zoomedFirst) && !zoomedAnim &&
      ta2 === 'pan-y pinch-zoom' && atSlots(unzoomed, firstAfter(zoomedFirst, 1)),
    `${mode}touch-action ${ta1} at scale 1; pinch to x${fmt(z0.scale)} -> ${taZoomed}, a 100px horizontal drag over the cards pans the zoomed page ${fmt(z1.x - z0.x, 1)}px ` +
    `and leaves first card ${zoomedAfter[0].id} (no slide); pinch back to x${fmt((await vv()).scale)} -> ${ta2}, swipe steps ${zoomedFirst} -> ${unzoomed[0].id}`)

}

export async function reduced(page, t) {
  use(t.surface)
  const navs = watchNavigation(page)
  try {
    await reducedChecks(page, t)
  } finally {
    if (navs.length) t.check('navigation', false, `desktop page navigated to ${navs.join(', ')}`)
  }
}

async function reducedChecks(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const zoom = []
  for (const card of CARDS) {
    const img = imgSel(card)
    await away(page)
    const r0 = await rect(page, img)
    const c = await shown(page, await rect(page, sel(card)))
    await page.mouse.move(c.left + c.width / 2, c.top + 120)
    await page.waitForTimeout(600)
    const s = await style(page, img)
    const r1 = await rect(page, img)
    const curve = await style(page, curveSel(card))
    zoom.push({ card, ok: s.scale === 'none' && s.transform === 'none' && r1.width === r0.width && (!BAKED.includes(card) || curve.visibility === 'hidden'), s, curve })
  }
  t.check('M-10', zoom.every((z) => z.ok),
    `reduced motion, hovered for 0.6s: ${zoom.map((z) => `${z.card} scale ${z.s.scale}${BAKED.includes(z.card) ? `, curve copy ${z.curve.visibility}` : ''}`).join('; ')}`)

  await away(page)
  const steps = []
  let want = CARDS[0]
  for (const [id, n] of [[NEXT, 1], [NEXT, 1], [PREV, 1], [PREV, 1], [NEXT, 9], [PREV, 5], [NEXT, 3], [PREV, 3]]) {
    want = firstAfter(want, id === NEXT ? n : -n)
    await clickTimes(page, id, n)
    const tf = await trackTransform(page)
    const anim = await page.$eval(sel(CARDS[0]), (el) => el.parentElement.getAnimations().length)
    const o = await order(page)
    steps.push({ ok: atSlots(o, want) && tf === 'none' && !anim, label: `${n}x ${id === NEXT ? 'next' : 'prev'}`, first: o[0].id, tf })
  }
  t.check('M-11', steps.every((s) => s.ok),
    `reduced motion, read straight after each burst: ${steps.map((s) => `${s.label} -> ${s.first}`).join(', ')}; track transform ${[...new Set(steps.map((s) => s.tf))]}, no animation (no slide)`)

  await touchChecks(t, true)
}
