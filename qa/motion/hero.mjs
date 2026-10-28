// M-01: the photo grid 94:87 drifts gently with the mouse x over the hero, eased, and rests untransformed.
// Waits poll for the expected state with a generous cap, so CPU load only slows a run, never fails it.
const GRID = '[data-node-id="94:87"]'
const HERO = '[data-node-id="94:85"]'
const PAN = { left: 24, right: 24 }
const TAU = 0.6
// An edge-to-edge sweep must stay slow: the first cut peaked above 1000 px/s and made viewers motion sick.
const MAX_SPEED = 85 // px/s; the easing alone caps it at (2 * 24) / 0.6 = 80
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol
const fmt = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d)

/** Canvas px over the hero -> viewport px, from the hero's rect (the canvas is scaled below 1440). */
const toViewport = async (page, cx, cy) => {
  const r = await page.$eval(HERO, (el) => el.getBoundingClientRect().toJSON())
  const k = r.width / 1440
  return [r.left + cx * k, r.top + cy * k]
}
const moveTo = async (page, cx, cy) => page.mouse.move(...(await toViewport(page, cx, cy)))
const transformOf = (page) => page.$eval(GRID, (el) => getComputedStyle(el).transform)

/** Poll translateX until it reaches `want` (the loop snaps exactly onto its target), capped at 6s. */
const until = async (t, want) => {
  let x = NaN
  for (let i = 0; i < 120; i++) {
    x = await t.translateX(GRID)
    if (Math.abs(x - want) < 0.001) return x
    await t.sleep(50)
  }
  return x
}

/**
 * Record every translateX the pan loop writes, with its frame time, seeded with the
 * position at the next mouse move (read before the hero's own listener runs) so the
 * first step is measured too.
 */
const record = (page) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  const s = (window.__pan = [])
  const x = () => new DOMMatrixReadOnly(el.style.transform || 'none').m41
  window.addEventListener('pointermove', (e) => s.push([e.timeStamp, x()]), { capture: true, once: true })
  window.__panMo = new MutationObserver(() => s.push([document.timeline.currentTime, x()]))
  window.__panMo.observe(el, { attributes: true, attributeFilter: ['style'] })
}, GRID)
const recorded = (page) => page.evaluate(() => { window.__panMo.disconnect(); return window.__pan })

/** Resolves once the hero's visibility is `want` (cap 6s). The hero's own observer, created earlier, is notified first. */
const visible = (page, want) => page.$eval(HERO, (el, want) => new Promise((res) => {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting === want) { io.disconnect(); res() }
  })
  io.observe(el)
  setTimeout(() => { io.disconnect(); res() }, 6000)
}), want)

/** Count getBoundingClientRect calls on the hero while `moves` mouse moves sweep the viewport. */
const rectCallsDuring = async (page, moves) => {
  await page.evaluate((sel) => {
    const hero = document.querySelector(sel)
    const orig = (window.__rectOrig ??= Element.prototype.getBoundingClientRect)
    window.__rects = 0
    Element.prototype.getBoundingClientRect = function () {
      if (this === hero) window.__rects++
      return orig.call(this)
    }
  }, HERO)
  for (const [x, y] of moves) await page.mouse.move(x, y, { steps: 5 })
  return page.evaluate(() => {
    Element.prototype.getBoundingClientRect = window.__rectOrig
    return window.__rects
  })
}

export default async function (page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await visible(page, true)
  t.check('M-01', (await transformOf(page)) === 'none', `rest: 94:87 transform ${await transformOf(page)} before any input`)

  // Touch and pen must not pan.
  const [tx0, ty0] = await toViewport(page, 0, 600)
  await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: x, clientY: y })), [tx0, ty0])
  await t.sleep(400)
  t.check('M-01', (await transformOf(page)) === 'none', `touch pointermove at canvas x 0: transform ${await transformOf(page)} (mouse only)`)

  // 1439.5 is the last pixel a real mouse reaches in a 1440 viewport (1440 is never delivered).
  for (const [cx, want] of [[0, PAN.left], [720, 0], [1439.5, -PAN.right * (719.5 / 720)]]) {
    await moveTo(page, cx, 600)
    const got = await until(t, want)
    t.check('M-01', near(got, want), `mouse at canvas x ${cx}, y 600: translateX ${fmt(got)} (want ${fmt(want)})`)
  }
  const [ex, ey] = await toViewport(page, 1440, 600)
  await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: y })), [ex, ey])
  const edge = await until(t, -PAN.right)
  t.check('M-01', near(edge, -PAN.right, 0.06), `mouse pointermove at canvas x 1440 (dispatched): translateX ${fmt(edge)} (want ${fmt(-PAN.right)})`)

  // Over the nav (painted above the hero's top) the pan must still follow.
  await moveTo(page, 720, 100)
  await until(t, 0)
  const [nx, ny] = await toViewport(page, 0, 100)
  const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-section]')?.dataset.section, [nx, ny])
  await page.mouse.move(nx, ny)
  const navGot = await until(t, PAN.left)
  t.check('M-01', near(navGot, PAN.left), `mouse at canvas x 0, y 100 (hit-test lands on "${top}"): translateX ${fmt(navGot)} (want ${fmt(PAN.left)})`)

  // Easing: record every value the loop writes with its frame time. Each frame closes the
  // gap by exp(-dt / tau), so consecutive frames give tau exactly whatever the frame pacing.
  await moveTo(page, 720, 600)
  await until(t, 0)
  await record(page)
  await moveTo(page, 0, 600)
  await until(t, PAN.left)
  const s = await recorded(page)
  const taus = []
  for (let i = 1; i < s.length; i++) {
    const [r0, r1, dt] = [PAN.left - s[i - 1][1], PAN.left - s[i][1], s[i][0] - s[i - 1][0]]
    if (dt > 0 && r1 > 0 && r0 > r1) taus.push(-dt / 1000 / Math.log(r1 / r0))
  }
  taus.sort((a, b) => a - b)
  const tau = taus[taus.length >> 1]
  t.check('M-01', taus.length >= 5 && near(tau, TAU, 0.06),
    `eased: first frame at ${s.length > 1 ? fmt(s[1][1]) : 'none'} of ${PAN.left}px, settled in ${s.length - 1} frames, time constant ${fmt(tau, 3)}s ` +
    `(median of ${taus.length} frame pairs, range ${fmt(taus[0], 3)}..${fmt(taus[taus.length - 1], 3)})`)

  // Speed: sweep from the right edge to the left edge in one move, the largest jump the pan can make.
  await moveTo(page, 1439.5, 600)
  await until(t, -PAN.right * (1439 / 1440))
  await record(page)
  await moveTo(page, 0, 600)
  await until(t, PAN.left)
  const v = await recorded(page)
  let peak = 0
  for (let i = 1; i < v.length; i++) {
    const dt = (v[i][0] - v[i - 1][0]) / 1000
    if (dt > 0) peak = Math.max(peak, Math.abs(v[i][1] - v[i - 1][1]) / dt)
  }
  t.check('M-01', v.length >= 5 && peak <= MAX_SPEED,
    `edge-to-edge sweep: ${v.length ? fmt(v[v.length - 1][1] - v[0][1]) : 'no'}px over ${v.length - 1} frames, peak ${fmt(peak, 1)} px/s (cap ${MAX_SPEED})`)

  // The mouse leaving the window fires pointerout with no relatedTarget (dispatched: Playwright cannot leave).
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerout', { pointerType: 'mouse', bubbles: true, relatedTarget: null })))
  const exitGot = await until(t, 0)
  t.check('M-01', exitGot === 0 && (await transformOf(page)) === 'none', `mouse left the window from canvas x 0: translateX ${fmt(exitGot)}, transform ${await transformOf(page)}`)

  // Leaving the hero: scroll so the logos strip is under the pointer, then move onto it.
  await moveTo(page, 0, 600)
  await until(t, PAN.left)
  await page.evaluate(() => window.scrollTo(0, 400))
  const [lx, ly] = await toViewport(page, 720, 1100)
  await page.mouse.move(lx, ly)
  const leftGot = await until(t, 0)
  const leftTf = await transformOf(page)
  t.check('M-01', leftGot === 0 && leftTf === 'none', `mouse left the hero: translateX ${fmt(leftGot)}, transform ${leftTf} (eases back to rest, unset)`)

  // Out of view: panned hero scrolled away rests, and mouse moves cost the hero nothing.
  await page.evaluate(() => window.scrollTo(0, 0))
  await moveTo(page, 0, 600)
  await until(t, PAN.left)
  await page.evaluate(() => window.scrollTo(0, 2400))
  await visible(page, false)
  const awayGot = await until(t, 0)
  const sweep = [[10, 100], [1430, 450], [10, 890], [720, 450]]
  const awayRects = await rectCallsDuring(page, sweep)
  const awayTf = await transformOf(page)
  t.check('M-01', awayGot === 0 && awayRects === 0 && awayTf === 'none',
    `hero scrolled out of view: translateX ${fmt(awayGot)}, ${awayRects} hero getBoundingClientRect calls over ${sweep.length * 5} mouse moves, transform ${awayTf}`)

  // Back in view the pan resumes (and the counter does see the work, so the 0 above means something).
  await page.evaluate(() => window.scrollTo(0, 0))
  await visible(page, true)
  const backRects = await rectCallsDuring(page, sweep)
  await moveTo(page, 0, 600)
  const backGot = await until(t, PAN.left)
  t.check('M-01', backRects > 0 && near(backGot, PAN.left),
    `scrolled back into view: ${backRects} hero getBoundingClientRect calls over the same ${sweep.length * 5} moves, mouse at canvas x 0: translateX ${fmt(backGot)} (want ${fmt(PAN.left)})`)
}

export async function reduced(page, t) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const seen = []
  for (const cx of [0, 1440, 0]) {
    await moveTo(page, cx, 600)
    await t.sleep(500)
    seen.push(await transformOf(page))
  }
  t.check('M-01', seen.every((v) => v === 'none'), `reduced motion, mouse at canvas x 0, 1440, 0: transform ${seen.join(', ')}`)
}
