// nav (MOBILE_SPEC.md 1): a fixed 64px header, clear over the hero, with an ink bar that
// fades in once the hero has scrolled out from under it (the desktop M-16). The menu sheet
// is a modal dialog: ARIA wiring, focus in / held / returned, Escape, close button and every
// link close it, the page behind does not scroll, 44px targets.
// `reduced`: the bar and the sheet change state without a transition.
const HEADER = '[data-mobile="root"] [data-section="nav"]'
const BAR = `${HEADER} [data-nav-bar]`
const BUTTON = `${HEADER} button[aria-controls]`
const SHEET = '#mobile-menu'
const BAR_H = 64
const RADIUS = 32 // the hero's rounded bottom: the bar arrives this much before the hero's edge

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2)
const bar = (page) => page.$eval(BAR, (el) => {
  const h = el.closest('header').getBoundingClientRect()
  return { state: el.dataset.navBar, opacity: getComputedStyle(el).opacity, fading: el.getAnimations().length, top: h.top, h: h.height, w: h.width, vw: document.documentElement.clientWidth }
})
const transitions = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === 'running').map((a) => a.finished)))

/** Scroll, wait for the bar state the hero's position calls for (or 3s), let its fade land. */
async function scrollTo(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await page.waitForTimeout(150)
  await page.waitForFunction(([bar, edge]) => {
    const h = document.getElementById('hero').getBoundingClientRect()
    return document.querySelector(bar).dataset.navBar === (h.bottom < edge ? 'solid' : 'clear')
  }, [BAR, BAR_H + RADIUS], { timeout: 3000 }).catch(() => {})
  await transitions(page)
  return bar(page)
}

/** Everything the menu checks read, in one frame. */
const menu = (page) => page.evaluate(([b, s]) => {
  const btn = document.querySelector(b), sheet = document.querySelector(s), r = sheet?.getBoundingClientRect()
  const a = document.activeElement
  return {
    expanded: btn.getAttribute('aria-expanded'),
    controls: btn.getAttribute('aria-controls'),
    name: (btn.getAttribute('aria-label') || btn.textContent).trim(),
    exists: !!sheet,
    role: sheet?.getAttribute('role'),
    modal: sheet?.getAttribute('aria-modal'),
    label: sheet?.getAttribute('aria-label'),
    display: sheet && getComputedStyle(sheet).display,
    covers: !!r && r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight,
    inside: !!sheet?.contains(a),
    onButton: a === btn,
    focus: (a?.getAttribute('aria-label') || a?.textContent || a?.tagName || '').trim().slice(0, 20),
    overflow: getComputedStyle(document.documentElement).overflow,
    scrollY,
  }
}, [BUTTON, SHEET])
/** Wait out the sheet's fade so `display` has landed (it switches at the end of a close). */
const settled = async (page) => { await transitions(page); return menu(page) }

/** A real touch swipe up the middle of the screen; how far the page scrolled. */
async function swipe(page, cdp) {
  const y0 = await page.evaluate(() => scrollY)
  await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 620, yDistance: -360, gestureSourceType: 'touch', speed: 1200 })
  await page.waitForTimeout(250)
  return (await page.evaluate(() => scrollY)) - y0
}

/** The bar arrives as the hero's rounded bottom reaches the nav, not before, and fades in over 300ms. */
async function threshold(page, t) {
  const edge = await page.evaluate((o) => document.getElementById('hero').getBoundingClientRect().bottom + scrollY - o, BAR_H + RADIUS)
  const before = await scrollTo(page, Math.floor(edge) - 2)
  await page.evaluate((y) => window.scrollTo(0, y), Math.ceil(edge) + 2)
  const fade = await page.waitForFunction((sel) => {
    const el = document.querySelector(sel), a = el.getAnimations()[0]
    return el.dataset.navBar === 'solid' && (a ? `${a.effect.getComputedTiming().duration}ms` : 'none')
  }, BAR, { timeout: 3000 }).then((h) => h.jsonValue(), () => 'never solid')
  const after = await scrollTo(page, Math.ceil(edge) + 2)
  t.check('M-16', before.state === 'clear' && before.opacity === '0' && after.state === 'solid' && after.opacity === '1' && fade === '300ms',
    `hero bottom ${RADIUS}px below the bar at scroll ${fmt(edge)}: 2px before -> ${before.state} ${before.opacity}, 2px after -> ${after.state} ${after.opacity} (fade ${fade})`)
}

/** Stuck at every scroll: the header never moves; clear over the hero, solid past it. */
async function sticky(page, t, label) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const seen = []
  for (const y of [0, 300, 1200, 3000, max]) seen.push({ y, b: await scrollTo(page, y), past: await page.evaluate((o) => document.getElementById('hero').getBoundingClientRect().bottom < o, BAR_H + RADIUS) })
  const ok = seen.every(({ b, past }) => b.top === 0 && b.h === BAR_H && b.w === b.vw && b.state === (past ? 'solid' : 'clear') && b.opacity === (past ? '1' : '0'))
  t.check('M-16', ok, `${label}: ${seen.map(({ y, b }) => `scroll ${Math.round(y)}: header ${fmt(b.top)},${fmt(b.h)}x${fmt(b.w)} bar ${b.state} ${b.opacity}`).join('; ')}`)
  await scrollTo(page, 0)
}

/** Opened already scrolled (a reload mid-page): the bar is solid from the first frame, no fade over the content. */
async function preScrolled(t) {
  const ctx = await t.browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    new MutationObserver((_, mo) => {
      if (!document.body) return
      mo.disconnect()
      document.documentElement.style.minHeight = '6000px'
      window.scrollTo(0, 3000)
    }).observe(document, { childList: true, subtree: true })
    const seen = (window.__bar = [])
    const f = () => {
      const el = document.querySelector('[data-section="nav"] [data-nav-bar]')
      if (el) seen.push(`${Math.round(scrollY)}:${el.dataset.navBar}:${(+getComputedStyle(el).opacity).toFixed(2)}`)
      if (seen.length < 20) requestAnimationFrame(f)
    }
    requestAnimationFrame(f)
  })
  await page.goto(t.url, { waitUntil: 'networkidle' })
  const frames = await page.evaluate(() => window.__bar)
  await ctx.close()
  t.check('M-16', frames.length >= 10 && frames.every((s) => s === '3000:solid:1.00'), `opened at scroll 3000, first ${frames.length} frames: ${[...new Set(frames)].join(', ')}`)
}

export default async function (page, t) {
  await sticky(page, t, '390x844')
  await threshold(page, t)
  await preScrolled(t)

  // Keyboard focus never lands under the bar: park the hero's link 20px from the top, Tab onto it from the menu button.
  await scrollTo(page, 0)
  const parked = await page.evaluate((b) => {
    const el = document.querySelector('[data-section="hero"] a[href]')
    window.scrollTo(0, scrollY + el.getBoundingClientRect().top - 20)
    document.querySelector(b).focus({ preventScroll: true })
    return el.getBoundingClientRect().top
  }, BUTTON)
  await page.keyboard.press('Tab')
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const landed = await page.evaluate(() => ({ hero: !!document.activeElement.closest('[data-section="hero"]'), top: document.activeElement.getBoundingClientRect().top }))
  t.check('M-16', landed.hero && landed.top >= BAR_H, `Tab from the menu button onto the hero link parked at ${fmt(parked)}px scrolls it to ${fmt(landed.top)}px, clear of the ${BAR_H}px bar: ${landed.hero && landed.top >= BAR_H}`)
  await page.evaluate(() => document.activeElement.blur())

  // ARIA wiring, closed.
  await scrollTo(page, 300)
  const cdp = await page.context().newCDPSession(page)
  const c0 = await menu(page)
  t.check('menu', c0.expanded === 'false' && c0.controls === SHEET.slice(1) && c0.exists && c0.name && c0.display === 'none' && c0.role === 'dialog' && c0.modal === 'true' && !!c0.label,
    `closed: button "${c0.name}" aria-expanded=${c0.expanded} aria-controls=${c0.controls} -> ${c0.exists ? `role=${c0.role} aria-modal=${c0.modal} aria-label="${c0.label}", display ${c0.display}` : 'MISSING'}`)

  // Tap open: the sheet covers the screen, focus moves in, the page behind does not scroll.
  const free0 = await swipe(page, cdp)
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.tap(BUTTON)
  const o = await settled(page)
  const held = await swipe(page, cdp)
  const after = await menu(page)
  t.check('menu', o.expanded === 'true' && o.display !== 'none' && o.covers && o.inside, `tap: aria-expanded=${o.expanded}, display ${o.display}, covers the viewport: ${o.covers}; focus moved in to "${o.focus}": ${o.inside}`)
  t.check('menu', free0 > 100 && held === 0 && after.scrollY === 300 && o.overflow === 'hidden',
    `scroll lock: a touch swipe scrolls the closed page ${fmt(free0)}px, the open one ${fmt(held)}px (root overflow ${o.overflow}, scrollY stays ${after.scrollY})`)

  // Tab and Shift+Tab stay inside.
  const trail = []
  for (const key of [...Array(12).fill('Tab'), ...Array(12).fill('Shift+Tab')]) {
    await page.keyboard.press(key)
    const m = await menu(page)
    trail.push(m.inside ? m.focus : `OUT:${m.focus}`)
  }
  const stops = new Set(trail).size
  t.check('menu', trail.every((s) => !s.startsWith('OUT')) && stops >= 7, `24 Tab / Shift+Tab presses visit ${stops} stops, all inside the sheet: ${[...new Set(trail)].join(' | ')}`)

  // Targets: every control in the open sheet, and in the header, is at least 44x44.
  const small = await page.$$eval(`${HEADER} a, ${HEADER} button`, (els) => els.filter((e) => e.offsetParent).map((e) => {
    const r = e.getBoundingClientRect()
    return { n: (e.getAttribute('aria-label') || e.textContent || 'logo').trim(), w: r.width, h: r.height }
  }))
  const under = small.filter((s) => s.w < 44 || s.h < 44)
  t.check('menu', small.length >= 10 && !under.length, `${small.length} header and sheet controls, under 44x44: ${under.map((s) => `${s.n} ${fmt(s.w)}x${fmt(s.h)}`).join(', ') || 'none'}`)

  // Escape closes, focus returns to the menu button, the page scrolls again from where it was.
  await page.keyboard.press('Escape')
  const e = await settled(page)
  const free1 = await swipe(page, cdp)
  t.check('menu', e.expanded === 'false' && e.display === 'none' && e.onButton && e.overflow === c0.overflow && e.scrollY === 300 && free1 > 100,
    `Escape: aria-expanded=${e.expanded}, display ${e.display}, focus on the menu button: ${e.onButton}; root overflow back to ${e.overflow}, scrollY ${e.scrollY}, a swipe scrolls ${fmt(free1)}px`)

  // Keyboard open from the button, then the close button.
  await page.focus(BUTTON)
  await page.keyboard.press('Enter')
  const k = await settled(page)
  await page.tap(`${SHEET} button`)
  const x = await settled(page)
  t.check('menu', k.expanded === 'true' && k.inside && x.expanded === 'false' && x.display === 'none' && x.onButton,
    `Enter on the button opens it with focus on "${k.focus}"; the close button ("${await page.$eval(`${SHEET} button`, (b) => b.getAttribute('aria-label'))}") closes it, focus back on the menu button: ${x.onButton}`)

  // Every link closes it and returns focus.
  const n = await page.$$eval(`${SHEET} a`, (els) => els.length)
  const closed = []
  for (let i = 0; i < n; i++) {
    await page.tap(BUTTON)
    await settled(page)
    const name = await page.$$eval(`${SHEET} a`, (els, i) => (els[i].textContent.trim() || els[i].querySelector('img')?.alt), i)
    await page.$$eval(`${SHEET} a`, (els, i) => els[i].scrollIntoView({ block: 'nearest' }), i)
    await (await page.$$(`${SHEET} a`))[i].tap()
    const m = await settled(page)
    closed.push({ name, ok: m.expanded === 'false' && m.display === 'none' && m.onButton })
  }
  t.check('menu', n === 7 && closed.every((c) => c.ok), `${n} links in the sheet; each tap closes it with focus back on the button: ${closed.map((c) => `${c.name} ${c.ok}`).join(', ')}`)
  await cdp.detach()
}

export async function reduced(page, t) {
  await sticky(page, t, 'reduced motion')
  await page.evaluate(() => window.scrollTo(0, 3000))
  const b = await (await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    return el.dataset.navBar === 'solid' && { opacity: getComputedStyle(el).opacity, fading: el.getAnimations().length }
  }, BAR)).jsonValue()
  t.check('M-G2', b.opacity === '1' && b.fading === 0, `the moment the bar turns solid: opacity ${b.opacity}, ${b.fading} transitions running`)

  // The sheet appears and goes at once.
  await page.tap(BUTTON)
  const o = await page.$eval(SHEET, (el) => ({ opacity: getComputedStyle(el).opacity, display: getComputedStyle(el).display, fading: el.getAnimations().length }))
  await page.keyboard.press('Escape')
  const c = await page.$eval(SHEET, (el) => ({ display: getComputedStyle(el).display, fading: el.getAnimations().length }))
  t.check('M-G2', o.display !== 'none' && o.opacity === '1' && o.fading === 0 && c.display === 'none' && c.fading === 0,
    `menu sheet right after the tap: display ${o.display}, opacity ${o.opacity}, ${o.fading} transitions; right after Escape: display ${c.display}, ${c.fading} transitions`)
}
