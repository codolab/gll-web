// M-10 photo zoom on card hover/focus, M-11 looping arrows, M-12 touch and pen swipe (meet, 94:199).
const CARDS = ['94:230', '94:202', '94:212', '94:221']
const PHOTO = { '94:230': '94:231', '94:202': '94:203', '94:212': '94:213', '94:221': '94:222' }
const CTA = { '94:230': '94:237', '94:202': '94:210', '94:212': '94:219', '94:221': '94:228' }
const TITLE = { '94:230': '94:236', '94:202': '94:209', '94:212': '94:218', '94:221': '94:227' }
const BAKED = ['94:230', '94:202'] // photo renders with the curve baked in; a copy of the curve shows while zoomed
const PREV = '94:257'
const NEXT = '94:253'
const HEADING = '94:200'
const PITCH = 352.043
const sel = (id) => `[data-node-id="${id}"]`
const curveSel = (card) => `${sel(card)} > img[src$="curve.svg"]`
const imgSel = (card) => `${sel(PHOTO[card])} > img`
const VIEWPORT = `${sel('94:201')} > div:first-child` // the clipping, swipe-handling box around the track
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

/** Real cards by x within 94:201, in canvas px; the first is the one in the first slot. */
const order = (page) => page.evaluate(([ids, s]) => {
  const track = document.querySelector(s).getBoundingClientRect()
  const k = track.width / 1396.172
  return ids.map((id) => ({ id, x: (document.querySelector(`[data-node-id="${id}"]`).getBoundingClientRect().left - track.left) / k }))
    .sort((a, b) => a.x - b.x)
}, [CARDS, sel('94:201')])
const showOrder = (o) => o.map((c) => `${c.id}@${fmt(c.x, 1)}`).join(' ')
// 0.02: Chromium lays boxes out in 1/64 px units.
const atSlots = (o, first) => {
  const i = CARDS.indexOf(first)
  return o.every((c, s) => c.id === CARDS[(i + s) % 4] && Math.abs(c.x - s * PITCH) < 0.02)
}
const firstAfter = (first, steps) => CARDS[(((CARDS.indexOf(first) + steps) % 4) + 4) % 4]
/** The element that moves the cards (parent of the real cards). */
const trackTransform = (page) => page.$eval(sel('94:230'), (el) => getComputedStyle(el.parentElement).transform)
/** Resolves once the track has no running slide and no transform. */
const settled = (page) => until(page, 'the track to settle', (s) => {
  const track = document.querySelector(s).parentElement
  return track.getAnimations().length === 0 && getComputedStyle(track).transform === 'none'
}, sel('94:230'))
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

/**
 * Main-frame navigations after load: none of these checks may navigate. A reload of the page
 * itself is the shared dev server's full reload (another section's edit), not this section.
 */
const watchNavigation = (page) => {
  const seen = []
  page.on('framenavigated', (f) => f === page.mainFrame() && seen.push(f.url()))
  return seen
}

/** CTA links in the order Tab visits them, with their x: start just before the carousel. */
const tabOrder = async (page) => {
  await page.$eval(sel('94:201'), (box) => {
    const all = [...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('[inert]'))
    all[all.findIndex((e) => box.contains(e)) - 1].focus()
  })
  const seen = []
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    seen.push(await page.evaluate(() => ({ id: document.activeElement.dataset.nodeId, x: document.activeElement.getBoundingClientRect().left })))
  }
  await page.evaluate(() => document.activeElement.blur())
  return seen
}

export default async function (page, t) {
  const navs = watchNavigation(page)
  try {
    await motionChecks(page, t)
  } finally {
    if (navs.length) t.check('navigation', false, `desktop page navigated to ${navs.join(', ')}`)
  }
}

async function motionChecks(page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  const labels = await page.evaluate(([p, n]) => [p, n].map((id) => document.querySelector(`[data-node-id="${id}"]`).getAttribute('aria-label')), [PREV, NEXT])
  const o0 = await order(page)
  t.check('M-11', atSlots(o0, '94:230') && (await trackTransform(page)) === 'none' && labels.join() === 'Previous events,Next events',
    `rest: ${showOrder(o0)}, track transform ${await trackTransform(page)}; 94:257 "${labels[0]}", 94:253 "${labels[1]}"`)
  const clones = await page.$$eval(`${sel('94:201')} article:not([data-node-id])`, (els) =>
    els.map((a) => a.getAttribute('aria-hidden') === 'true' && a.inert && !a.querySelector('[data-node-id]')))
  t.check('M-11', clones.length === 8 && clones.every(Boolean), `${clones.length} clone cards, all aria-hidden + inert + no data-node-id: ${clones.every(Boolean)}`)

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
    const shotRest = (await page.locator(sel(card)).screenshot()).toString('base64')
    const sampling = sample(page, img, 'width', rest.img.width * 1.06)
    await page.mouse.move(rest.card.left + rest.card.width / 2, rest.card.top + 120)
    const samples = await sampling
    await frames(page)
    const hov = { img: await rect(page, img), card: await rect(page, sel(card)), curve: await rect(page, curveSel(card)), title: await rect(page, sel(TITLE[card])) }
    const hovCurve = await style(page, curveSel(card))
    const shotHov = (await page.locator(sel(card)).screenshot()).toString('base64')
    const ratio = hov.img.width / rest.img.width
    const tStart = samples.find(([, w]) => w > rest.img.width + 0.01)?.[0] ?? NaN
    const tEnd = samples.find(([, w]) => Math.abs(w - rest.img.width * 1.06) < 0.05)?.[0] ?? NaN
    const tHalf = samples.find(([, w]) => w >= rest.img.width * 1.03)?.[0] ?? NaN
    const dur = (tEnd - tStart) / 1000, half = (tHalf - tStart) / 1000
    const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2]
    const dc = Math.hypot(centre(hov.img)[0] - centre(rest.img)[0], centre(hov.img)[1] - centre(rest.img)[1])
    const same = (a, b) => ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.01)
    const px = await pixelsHeld(page, shotRest, shotHov, rest.curve.left - rest.card.left, PHOTO[card] === '94:231' ? 381 : 356)
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

  // M-11: next steps one pitch with a 0.5s slide, and four steps come back round.
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await away(page)
  const seen = []
  let slide = null
  for (let i = 1; i <= 4; i++) {
    const sampling = i === 1 ? sample(page, sel('94:230'), 'm41') : null
    await page.click(sel(NEXT))
    if (sampling) slide = await sampling
    await settled(page)
    seen.push({ o: await order(page), tf: await trackTransform(page) })
  }
  const want = ['94:202', '94:212', '94:221', '94:230']
  const moving = slide.filter(([, x]) => x !== 0)
  const slideDur = moving.length ? (moving.at(-1)[0] - moving[0][0]) / 1000 : 0
  const startX = moving[0]?.[1] ?? 0
  t.check('M-11', seen.every((s, i) => atSlots(s.o, want[i]) && s.tf === 'none') && slideDur > 0.3 && slideDur < 1 && startX > 0.8 * PITCH && startX <= PITCH + 0.5,
    `next x4: first card ${seen.map((s) => s.o[0].id).join(' -> ')} (wraps to 94:230), each settled at its slot pitch ${PITCH}, track transform ${[...new Set(seen.map((s) => s.tf))]} after each; ` +
    `first slide ran ~${fmt(slideDur)}s from translateX ${fmt(startX)} (one pitch) to none; after step 1: ${showOrder(seen[0].o)}`)

  const back = []
  for (let i = 1; i <= 4; i++) {
    await page.click(sel(PREV))
    await settled(page)
    back.push(await order(page))
  }
  const wantBack = ['94:221', '94:212', '94:202', '94:230']
  t.check('M-11', back.every((o, i) => atSlots(o, wantBack[i])),
    `prev x4: first card ${back.map((o) => o[0].id).join(' -> ')}; after step 1: ${showOrder(back[0])}`)

  // No click is ever lost, however fast they come.
  const bursts = []
  let first = '94:230'
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
    `bursts from 94:230: ${bursts.map((b) => `${b.label}${b.ms ? ` (${b.ms}ms)` : ''} -> ${b.got} (want ${b.expect})`).join('; ')}`)
  await clickTimes(page, PREV, (CARDS.indexOf(first) + 4) % 4)
  await settled(page)

  // WCAG 2.4.3: Tab and reading order follow the cards left to right after stepping.
  const tabs = []
  for (const steps of [1, 2]) {
    await clickTimes(page, NEXT, steps)
    await settled(page)
    const o = await order(page)
    const seq = await tabOrder(page)
    const ok = seq.every((s, i) => s.id === CTA[o[i].id] && (i === 0 || s.x > seq[i - 1].x))
    tabs.push({ after: steps === 1 ? 1 : 3, ok, seq, o })
  }
  await clickTimes(page, NEXT, 1)
  await settled(page)
  t.check('M-11', tabs.every((x) => x.ok) && atSlots(await order(page), '94:230'),
    tabs.map((x) => `after ${x.after} next: Tab visits ${x.seq.map((s) => `${s.id}@${fmt(s.x, 0)}`).join(' ')} (cards ${x.o.map((c) => c.id).join(' ')})`).join('; '))

  // Mouse: a drag does not step (swipe is touch and pen), and a CTA click goes through.
  const r = await rect(page, sel('94:212'))
  await page.mouse.move(r.left + 200, r.top + 100)
  await page.mouse.down()
  await page.mouse.move(r.left + 60, r.top + 100, { steps: 8 })
  await page.mouse.up()
  await frames(page, 3)
  const afterDrag = await order(page)
  const animating = await page.$eval(sel('94:230'), (el) => el.parentElement.getAnimations().length)
  await page.evaluate(() => {
    window.__clicks = []
    window.addEventListener('click', (e) => { window.__clicks.push({ id: e.target.closest('a')?.dataset.nodeId, prevented: e.defaultPrevented }); e.preventDefault() })
  })
  await page.click(sel(CTA['94:212']))
  const clicks = await page.evaluate(() => window.__clicks)
  t.check('M-12', atSlots(afterDrag, '94:230') && !animating && clicks.length === 1 && clicks[0].id === CTA['94:212'] && !clicks[0].prevented,
    `mouse drag 140px left: first card stays ${afterDrag[0].id}, no slide; mouse click on CTA ${CTA['94:212']} delivered ${JSON.stringify(clicks)}`)

  // M-G4: zoom follows keyboard focus only, so the clicked card unzooms once the pointer leaves.
  await away(page)
  const unzoomed = await until(page, '94:212 zoom-out after a mouse click', (s) => getComputedStyle(document.querySelector(s)).scale === 'none', imgSel('94:212')).then(() => true, () => false)
  const stillFocused = await page.$eval(sel(CTA['94:212']), (el) => document.activeElement === el && !el.matches(':focus-visible'))
  t.check('M-10', unzoomed && stillFocused, `mouse click then leave: 94:212 photo scale ${(await style(page, imgSel('94:212'))).scale}, link still focused (not focus-visible) ${stillFocused}`)

  await touchChecks(t, false)
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
  await page.$eval(sel('94:201'), (el) => el.scrollIntoView({ block: 'center' }))
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
  const k = (await rect(page, sel('94:201'))).width / 1396.172
  const mode = reduce ? 'reduced motion: ' : ''

  const p202 = await centreOf(PHOTO['94:202'])
  await drag(p202, -80, 4)
  const left = await settledOrder()
  await drag(p202, 80, -4)
  const right = await settledOrder()
  await drag(p202, -25, 0)
  const short = await settledOrder()
  t.check('M-12', atSlots(left, '94:202') && atSlots(right, '94:230') && atSlots(short, '94:230'),
    `${mode}phone 390px (canvas x${fmt(k, 3)}): touch swipe 80px left -> first card ${left[0].id}, 80px right -> ${right[0].id}, 25px -> ${short[0].id} (no step)`)

  const sy0 = await page.evaluate(() => scrollY)
  await drag(p202, 6, -220)
  await until(page, 'the page scroll to stop', () => new Promise((r) => { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => r(scrollY === y))) }))
  const sy1 = await page.evaluate(() => scrollY)
  const vert = await settledOrder()
  t.check('M-12', sy1 - sy0 > 50 && atSlots(vert, '94:230'),
    `${mode}vertical touch drag 220px up over the cards: page scrolled ${fmt(sy1 - sy0, 0)}px, first card stays ${vert[0].id}`)

  await clicks()
  await tap(await centreOf(CTA['94:202']))
  await delivered()
  const tapped = await clicks()
  await drag(await centreOf(CTA['94:202']), -80, 0)
  await grace()
  const fromLink = await clicks()
  const afterLinkSwipe = await settledOrder()
  await tap(await centreOf(CTA['94:212']))
  await delivered()
  const tap2 = await clicks()
  const ok = (c, id) => c.delivered.length === 1 && c.delivered[0].id === id && !c.delivered[0].prevented
  t.check('M-12', ok(tapped, CTA['94:202']) && fromLink.delivered.length === 0 && atSlots(afterLinkSwipe, '94:202') && ok(tap2, CTA['94:212']),
    `${mode}tap on CTA ${CTA['94:202']}: ${JSON.stringify(tapped.delivered)}; swipe starting on it: steps to ${afterLinkSwipe[0].id}, clicks arrived ${JSON.stringify(fromLink.arrived)} delivered ${fromLink.delivered.length}; ` +
    `next tap on ${CTA['94:212']}: ${JSON.stringify(tap2.delivered)}`)

  await pen(await centreOf(PHOTO['94:212']), -80)
  await grace()
  const penLeft = await settledOrder()
  const penClick = await clicks()
  t.check('M-12', atSlots(penLeft, '94:212') && penClick.delivered.length === 0,
    `${mode}pen drag 80px left: first card ${afterLinkSwipe[0].id} -> ${penLeft[0].id}; click after the drag arrived ${JSON.stringify(penClick.arrived)}, delivered ${penClick.delivered.length} (swallowed)`)

  // Pinch-zoomed: a horizontal drag over the cards pans the zoomed page and does not swipe.
  const ta1 = (await style(page, VIEWPORT)).touchAction
  await page.$eval(sel('94:201'), (el) => el.scrollIntoView({ block: 'center' }))
  await frames(page)
  // Zoom in on the first card's photo, so the zoomed page has room to pan right.
  const zoomedFirst = (await order(page))[0].id
  const [zx, zy] = await centreOf(PHOTO[zoomedFirst])
  await cdp.send('Input.synthesizePinchGesture', { x: zx, y: zy, scaleFactor: 3, relativeSpeed: 1200, gestureSourceType: 'touch' })
  // A missed wait is reported by the check below, not thrown.
  await until(page, 'zoom', (s) => visualViewport.scale > 2.9 && getComputedStyle(document.querySelector(s)).touchAction === 'auto', VIEWPORT).catch(() => {})
  const taZoomed = (await style(page, VIEWPORT)).touchAction
  const z0 = await vv()
  const [, py] = await centreOf(PHOTO[zoomedFirst])
  await drag([z0.w * 0.85, py], -100, 0)
  await grace()
  const z1 = await vv()
  const zoomedAfter = await order(page)
  const zoomedAnim = await page.$eval(sel('94:230'), (el) => el.parentElement.getAnimations().length)
  const z2 = await vv()
  await cdp.send('Input.synthesizePinchGesture', { x: z2.w / 2, y: z2.h / 2, scaleFactor: 1 / z2.scale, relativeSpeed: 1200, gestureSourceType: 'touch' })
  await until(page, 'unzoom', (s) => visualViewport.scale < 1.01 && getComputedStyle(document.querySelector(s)).touchAction !== 'auto', VIEWPORT).catch(() => {})
  const ta2 = (await style(page, VIEWPORT)).touchAction
  await drag(await centreOf(PHOTO[zoomedFirst]), -80, 0)
  const unzoomed = await settledOrder()
  t.check('M-12',
    ta1 === 'pan-y pinch-zoom' && z0.scale > 2.9 && taZoomed === 'auto' && z1.x - z0.x > 30 && atSlots(zoomedAfter, zoomedFirst) && !zoomedAnim &&
      ta2 === 'pan-y pinch-zoom' && atSlots(unzoomed, firstAfter(zoomedFirst, 1)),
    `${mode}touch-action ${ta1} at scale 1; pinch to x${fmt(z0.scale)} -> ${taZoomed}, a 100px horizontal drag over the cards pans the zoomed page ${fmt(z1.x - z0.x, 1)}px ` +
    `and leaves first card ${zoomedAfter[0].id} (no slide); pinch back to x${fmt((await vv()).scale)} -> ${ta2}, swipe steps ${zoomedFirst} -> ${unzoomed[0].id}`)

}

export async function reduced(page, t) {
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
    const c = await rect(page, sel(card))
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
  let want = '94:230'
  for (const [id, n] of [[NEXT, 1], [NEXT, 1], [PREV, 1], [PREV, 1], [NEXT, 9], [PREV, 5], [NEXT, 3], [PREV, 3]]) {
    want = firstAfter(want, id === NEXT ? n : -n)
    await clickTimes(page, id, n)
    const tf = await trackTransform(page)
    const anim = await page.$eval(sel('94:230'), (el) => el.parentElement.getAnimations().length)
    const o = await order(page)
    steps.push({ ok: atSlots(o, want) && tf === 'none' && !anim, label: `${n}x ${id === NEXT ? 'next' : 'prev'}`, first: o[0].id, tf })
  }
  t.check('M-11', steps.every((s) => s.ok),
    `reduced motion, read straight after each burst: ${steps.map((s) => `${s.label} -> ${s.first}`).join(', ')}; track transform ${[...new Set(steps.map((s) => s.tf))]}, no animation (no slide)`)

  await touchChecks(t, true)
}
