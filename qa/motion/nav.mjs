// nav: M-16, the nav stays at the top of the viewport. At the top of the page it sits exactly
// where the frame has it on a clear layer; once the hero has scrolled out from under it, an
// ink bar fades in behind it. Keyboard focus never lands under the bar.
// Under wide (t.surface) the main window is 1640, plus 1540 (scaled) and 2560 (bleed).
const BAR = '[data-nav-bar]'
const NODES = '[data-section="nav"] [data-node-id]'
// radius: the hero's bottom corners; the bar arrives this much before the hero's edge (wide's band is square).
const SURFACES = {
  desktop: { h: 7895, radius: 50, logo: '94:122', windows: [{ width: 1024, height: 768 }, { width: 1921, height: 1080 }] },
  wide: { h: 7993, radius: 0, logo: '173:349', windows: [{ width: 1540, height: 900 }, { width: 2560, height: 1440 }] },
}

/** Node boxes in viewport px. */
const boxes = (page) => page.$$eval(NODES, (els) => els.map((e) => {
  const r = e.getBoundingClientRect()
  return [e.dataset.nodeId, r.x, r.y, r.width, r.height]
}))
/**
 * Node boxes in canvas px, relative to the canvas root (meaningful at scroll 0, where the canvas
 * starts at the viewport top). The root's laid-out width is the frame width, so k is the scale.
 */
const canvasBoxes = (page) => page.$$eval(NODES, (els) => {
  const root = document.querySelector('[data-canvas="root"]'), c = root.getBoundingClientRect(), k = c.width / root.offsetWidth
  return els.map((e) => {
    const r = e.getBoundingClientRect()
    return [e.dataset.nodeId, (r.x - c.x) / k, (r.y - c.y) / k, r.width / k, r.height / k]
  })
})
const worst = (a, b) => (a.length && a.length === b.length && a.every((r, i) => r[0] === b[i][0])
  ? Math.max(...a.flatMap((r, i) => r.slice(1).map((v, j) => Math.abs(v - b[i][j + 1]))))
  : Infinity)
const bar = (page) => page.$eval(BAR, (el) => {
  const r = el.getBoundingClientRect()
  return { state: el.dataset.navBar, opacity: getComputedStyle(el).opacity, fading: el.getAnimations().length, x: r.x, y: r.y, w: r.width, h: r.height, vw: document.documentElement.clientWidth }
})
/**
 * Scroll, give the observer time to report (the state from before the scroll may
 * already look right), wait for the state the hero's position calls for (or 3s),
 * let its fade land, and return it.
 */
const scrollTo = async (page, y, S) => {
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await page.waitForTimeout(150)
  await page.waitForFunction((r) => {
    const h = document.getElementById('hero').getBoundingClientRect(), n = document.querySelector('header').getBoundingClientRect()
    const root = document.querySelector('[data-canvas="root"]'), k = root.getBoundingClientRect().width / root.offsetWidth
    return document.querySelector('[data-nav-bar]').dataset.navBar === (h.bottom < n.bottom + r * k ? 'solid' : 'clear')
  }, S.radius, { timeout: 3000 }).catch(() => {})
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === 'running').map((a) => a.finished)))
  return bar(page)
}
const fmt = (n) => (Math.round(n * 1000) / 1000).toFixed(3)

/** Focus never lands under the bar: put a programs link 20px from the viewport top, then Tab onto it. */
async function focusClear(page) {
  const probe = await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('[inert]') && !e.closest('header'))
    const el = all.find((e) => e.closest('[data-section="programs"]'))
    el.dataset.probe = '1'
    window.scrollTo(0, scrollY + el.getBoundingClientRect().top - 20)
    all[all.indexOf(el) - 1].focus({ preventScroll: true })
    return el.getBoundingClientRect().top
  })
  await page.keyboard.press('Tab')
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const l = await page.evaluate(() => ({
    probe: document.activeElement?.dataset.probe === '1',
    top: document.activeElement.getBoundingClientRect().top,
    bar: document.querySelector('header').getBoundingClientRect().bottom,
  }))
  return { ok: l.probe && l.top >= l.bar, detail: `Tab onto a programs link sitting at ${fmt(probe)}px scrolls it to ${fmt(l.top)}px, below the bar's ${fmt(l.bar)}px: ${l.probe && l.top >= l.bar}` }
}

async function open(t, viewport, reducedMotion = 'no-preference', isolate) {
  const page = await t.browser.newPage({ viewport, reducedMotion })
  const url = new URL(t.url)
  if (isolate) url.searchParams.set('isolate', isolate)
  await page.goto(url.href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return page
}

/** The bar arrives as the hero's bottom (less its corner radius, scaled with the canvas) reaches the nav, not before, and fades in. */
async function threshold(page, t, label, S) {
  const edge = await page.evaluate((r) => {
    const h = document.getElementById('hero').getBoundingClientRect(), n = document.querySelector('header').getBoundingClientRect()
    const root = document.querySelector('[data-canvas="root"]'), k = root.getBoundingClientRect().width / root.offsetWidth
    return h.bottom + scrollY - n.bottom - r * k
  }, S.radius)
  const before = await scrollTo(page, Math.floor(edge) - 2, S)
  await page.evaluate((y) => window.scrollTo(0, y), Math.ceil(edge) + 2)
  // Read the bar the moment it turns solid, while its fade is running.
  const fade = await page.waitForFunction(() => {
    const el = document.querySelector('[data-nav-bar]'), a = el.getAnimations()[0]
    return el.dataset.navBar === 'solid' && (a ? `${a.effect.getComputedTiming().duration}ms ${getComputedStyle(el).transitionTimingFunction}` : 'none')
  }, null, { timeout: 3000 }).then((h) => h.jsonValue(), () => 'never solid')
  const after = await scrollTo(page, Math.ceil(edge) + 2, S)
  t.check('M-16', before.state === 'clear' && before.opacity === '0' && after.state === 'solid' && after.opacity === '1' && fade.startsWith('300ms'),
    `${label}: hero bottom ${S.radius}px (canvas) below the nav at scroll ${fmt(edge)}: 2px before -> ${before.state} ${before.opacity}, 2px after -> ${after.state} ${after.opacity} (fade ${fade})`)
  await scrollTo(page, 0, S)
}

/**
 * Opened already scrolled, as a reload that restores the scroll position is, the bar
 * is solid from the first frame instead of fading in over the content. Real
 * restoration is unreliable headless, so the page is scrolled before the app starts.
 */
async function preScrolled(t, S) {
  const page = await t.browser.newPage({ viewport: { width: t.width, height: 900 } })
  await page.addInitScript((h) => {
    new MutationObserver((_, mo) => {
      if (!document.body) return
      mo.disconnect()
      document.documentElement.style.minHeight = `${h}px`
      window.scrollTo(0, 3000)
    }).observe(document, { childList: true, subtree: true })
    const seen = (window.__bar = [])
    const f = () => {
      const el = document.querySelector('[data-nav-bar]')
      if (el) seen.push(`${Math.round(scrollY)}:${el.dataset.navBar}:${(+getComputedStyle(el).opacity).toFixed(2)}`)
      if (seen.length < 20) requestAnimationFrame(f)
    }
    requestAnimationFrame(f)
  }, S.h)
  await page.goto(t.url, { waitUntil: 'networkidle' })
  const frames = await page.evaluate(() => window.__bar)
  await page.close()
  t.check('M-16', frames.length >= 10 && frames.every((s) => s === '3000:solid:1.00'),
    `opened at scroll 3000, first ${frames.length} frames: ${[...new Set(frames)].join(', ')}`)
}

/** Stuck at every scroll: the nav's viewport boxes never move, and the bar is solid past the hero. */
async function sticky(page, t, label, S) {
  const top = await boxes(page)
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const seen = []
  for (const y of [400, 1300, 3000, 5800, max]) {
    const b = await scrollTo(page, y, S)
    seen.push({ y, d: worst(top, await boxes(page)), b, past: await page.evaluate(() => document.getElementById('hero').getBoundingClientRect().bottom) })
  }
  t.check('M-16', seen.every((s) => s.d < 0.01 && (s.y === 400 ? s.b.state === 'clear' && s.b.opacity === '0' : s.b.state === 'solid' && s.b.opacity === '1')),
    `${label}: ${top.length} nav node boxes vs scroll 0, worst ${seen.map((s) => `scroll ${s.y}: ${fmt(s.d)}px, bar ${s.b.state} ${s.b.opacity}`).join('; ')}`)
  await scrollTo(page, 0, S)
}

export default async function (page, t) {
  const S = SURFACES[t.surface]
  const W = `${t.width}x900`
  // Rest: the full page's nav sits where the isolated (parity-checked) nav does, on a clear bar.
  const iso = await open(t, { width: t.width, height: 900 }, 'reduce', 'nav')
  const ref = await canvasBoxes(iso)
  await iso.close()
  const rest = await bar(page)
  const d0 = worst(ref, await canvasBoxes(page))
  t.check('M-16', ref.length === 11 && d0 < 0.01 && rest.state === 'clear' && rest.opacity === '0',
    `scroll 0: ${ref.length} nav node boxes vs ?isolate=nav, worst ${fmt(d0)} canvas px; bar ${rest.state}, opacity ${rest.opacity}`)

  await sticky(page, t, W, S)
  await threshold(page, t, W, S)
  await preScrolled(t, S)

  // Solid, the bar spans the viewport, the nav links stay on top, and nothing under it takes the pointer.
  const solid = await scrollTo(page, 3000, S)
  const hits = await page.$$eval('[data-section="nav"] a', (els) => els.map((a) => {
    const r = a.getBoundingClientRect()
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a') === a
  }))
  const blank = await page.evaluate(() => !!document.elementFromPoint(300, 40)?.closest('header'))
  t.check('M-16', solid.x === 0 && solid.y === 0 && solid.w === solid.vw && hits.length === 7 && hits.every(Boolean) && blank,
    `scroll 3000: bar ${fmt(solid.x)},${fmt(solid.y)} ${fmt(solid.w)}x${fmt(solid.h)} (viewport ${solid.vw} wide); ${hits.filter(Boolean).length}/${hits.length} nav links hit-test to themselves; blank bar point is the header: ${blank}`)

  // Tab order: the pause button, then the nav.
  await scrollTo(page, 0, S)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const second = await page.evaluate(() => document.activeElement?.closest('[data-node-id]')?.dataset.nodeId)
  const f = await focusClear(page)
  t.check('M-16', second === S.logo && f.ok, `second Tab lands on ${second} (the logo link); ${f.detail}`)

  // Other widths: the nav keeps the canvas's scale and centring, and still sticks.
  for (const vp of S.windows) {
    const p = await open(t, vp)
    const d = worst(ref, await canvasBoxes(p))
    const b = await scrollTo(p, 3000, S)
    const f = await focusClear(p)
    t.check('M-16', d < 0.01 && b.x === 0 && b.w === b.vw && f.ok,
      `${vp.width}x${vp.height} scroll 0: nav boxes vs the ${t.width} isolated nav, worst ${fmt(d)} canvas px; at scroll 3000 the bar spans ${fmt(b.x)}..${fmt(b.x + b.w)} of ${b.vw}; ${f.detail}`)
    await scrollTo(p, 0, S)
    await sticky(p, t, `${vp.width}x${vp.height}`, S)
    if (vp.width < t.width) await threshold(p, t, `${vp.width}x${vp.height}`, S)
    await p.close()
  }
}

export async function reduced(page, t) {
  await sticky(page, t, 'reduced motion', SURFACES[t.surface])
  await page.evaluate(() => window.scrollTo(0, 3000))
  // Read the bar the moment it turns solid: with motion on it would start a 300ms fade from 0 here.
  const b = await (await page.waitForFunction(() => {
    const el = document.querySelector('[data-nav-bar]')
    return el.dataset.navBar === 'solid' && { opacity: getComputedStyle(el).opacity, fading: el.getAnimations().length }
  })).jsonValue()
  t.check('M-G2', b.opacity === '1' && b.fading === 0,
    `reduced motion, the moment the bar turns solid: opacity ${b.opacity}, ${b.fading} transitions running`)
}
