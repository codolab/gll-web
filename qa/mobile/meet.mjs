// meet on mobile (MOBILE_SPEC.md 8): a native scroll-snap row of the four desktop
// cards. Card width min(78vw, 320), first card on the content edge (gutter as
// scroll padding), arrows step one card and go pale + aria-disabled at the ends,
// dots follow the current card, a touch swipe or trackpad scroll moves one card
// and snaps, a vertical swipe still scrolls the page, Tab walks the cards then
// the arrows, and nothing is moved by a JS transform. Reduced motion: arrows jump.
const TITLES = ['Meet leaders', 'Meaningful Connections', 'Grow Your Impact', 'A Global Community']
const TAGS = ['New event', 'ALL Events', 'Programs', 'Network']
const FORCE = { force: true }

/** Row geometry and carousel state in one read. */
const state = (page, sec) => page.$eval(sec, (s) => {
  const row = s.querySelector('#meet-cards')
  const cards = [...row.children]
  const snaps = cards.map((c) => Math.min(row.scrollWidth - row.clientWidth, c.offsetLeft - cards[0].offsetLeft))
  const dots = [...s.querySelectorAll('[data-dot]')]
  const btn = (d) => s.querySelector(`[data-dir="${d}"]`)
  return {
    x: row.scrollLeft, max: row.scrollWidth - row.clientWidth, snaps,
    lefts: cards.map((c) => c.getBoundingClientRect().left), widths: cards.map((c) => c.getBoundingClientRect().width),
    vw: document.documentElement.clientWidth,
    dot: dots.findIndex((d) => d.hasAttribute('data-active')), dots: dots.length,
    prevOff: btn('prev').getAttribute('aria-disabled') === 'true', nextOff: btn('next').getAttribute('aria-disabled') === 'true',
    transforms: [row, ...cards].map((e) => getComputedStyle(e).transform).filter((v) => v !== 'none'),
  }
})
/** Wait until the row has stopped scrolling (unchanged for 200ms), then read it. */
async function settled(page, sec, t, ms = 3000) {
  let last = -1, still = 0
  for (let i = 0; i < ms / 50; i++) {
    const x = await page.$eval(`${sec} #meet-cards`, (r) => r.scrollLeft).catch(async (e) => {
      const same = await page.evaluate(() => !!window.__same).catch(() => false)
      throw same ? e : new Error('page reloaded mid-run (dev server hot reload): rerun')
    })
    still = x === last ? still + 50 : 0
    last = x
    if (still >= 200) break
    await t.sleep(50)
  }
  return state(page, sec)
}
const at = (s) => s.snaps.findIndex((p) => Math.abs(p - s.x) < 1)
const fmt = (s) => `scrollLeft ${s.x.toFixed(1)} (card ${at(s)}), dot ${s.dot}, prev ${s.prevOff ? 'off' : 'on'}, next ${s.nextOff ? 'off' : 'on'}`

export default async function (page, t) {
  const sec = t.section
  // Other builders' edits can reload the shared dev page mid-run, resetting the row.
  await page.evaluate(() => { window.__same = true })
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'start' }))
  await t.sleep(200)

  // Copy, assets and geometry at rest.
  const a = await page.$eval(sec, (s) => ({
    h2: s.querySelector('h2').textContent,
    tags: [...s.querySelectorAll('article > div > span')].map((e) => e.textContent),
    titles: [...s.querySelectorAll('article h3')].map((e) => e.textContent),
    links: [...s.querySelectorAll('article a')].map((e) => e.getAttribute('aria-label')),
    imgs: [...s.querySelectorAll('img')].filter((i) => !i.complete || !i.naturalWidth).length,
    btns: [...s.querySelectorAll('[data-dir]')].map((b) => { const r = b.getBoundingClientRect(); return `${r.width}x${r.height}` }),
    content: s.firstElementChild.getBoundingClientRect().left + parseFloat(getComputedStyle(s.firstElementChild).paddingLeft),
  }))
  t.check('copy', a.h2 === 'Meet, greet and network!' && a.tags.join() === TAGS.join() && a.titles.map((x) => x.replace(/\s+/g, ' ').trim()).join() === TITLES.join() &&
    a.links.join() === TITLES.map((x) => `Explore: ${x}`).join(),
    `"${a.h2}"; tags ${a.tags.join(', ')}; titles ${a.titles.map((x) => JSON.stringify(x)).join(', ')}`)
  t.check('assets', !a.imgs && a.btns.every((b) => b === '44x44'), `${a.imgs} images not loaded; arrow buttons ${a.btns.join(', ')}`)

  for (const w of [320, 390, 768]) {
    await page.setViewportSize({ width: w, height: 844 })
    await t.sleep(150)
    const s = await state(page, sec)
    const c = await page.$eval(sec, (el) => el.firstElementChild.getBoundingClientRect().left + parseFloat(getComputedStyle(el.firstElementChild).paddingLeft))
    const want = Math.min(0.78 * w, 320)
    t.check(`rest ${w}`, s.x === 0 && Math.abs(s.lefts[0] - c) < 0.5 && s.widths.every((x) => Math.abs(x - want) < 0.5) && Math.abs(s.lefts[1] - s.lefts[0] - want - 12) < 0.5,
      `first card at ${s.lefts[0].toFixed(1)} = content edge ${c.toFixed(1)}; cards ${s.widths[0].toFixed(1)} wide (want ${want.toFixed(1)}), gap ${(s.lefts[1] - s.lefts[0] - s.widths[0]).toFixed(1)}`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await t.sleep(150)

  const s0 = await state(page, sec)
  t.check('start', s0.x === 0 && s0.dot === 0 && s0.dots === 4 && s0.prevOff && !s0.nextOff, fmt(s0))

  // Next steps exactly one card per press, dots follow, and it stops at the end.
  const steps = []
  // Arrow presses are forced taps: Playwright would otherwise wait for an aria-disabled arrow to enable.
  for (let i = 1; i <= 4; i++) {
    await page.click(`${sec} [data-dir="next"]`, FORCE)
    steps.push(await settled(page, sec, t))
  }
  t.check('next', steps.map(at).join() === '1,2,3,3' && steps.every((s) => s.dot === at(s)) &&
    Math.abs(steps[0].lefts[1] - 20) < 0.5 && Math.abs(steps[1].lefts[2] - 20) < 0.5 && Math.abs(steps[2].x - steps[2].max) < 1 &&
    !steps[1].nextOff && steps[2].nextOff && !steps[2].prevOff && steps[3].x === steps[2].x,
    steps.map((s, k) => `press ${k + 1}: ${fmt(s)}`).join('; '))
  const back = []
  for (let i = 1; i <= 4; i++) {
    await page.click(`${sec} [data-dir="prev"]`, FORCE)
    back.push(await settled(page, sec, t))
  }
  t.check('prev', back.map(at).join() === '2,1,0,0' && back.every((s) => s.dot === at(s)) && !back[1].prevOff && back[2].prevOff && !back[2].nextOff && back[3].x === 0,
    back.map((s, k) => `press ${k + 1}: ${fmt(s)}`).join('; '))

  // A press mid-slide counts from where the slide is going: two quick presses = two cards.
  await page.click(`${sec} [data-dir="next"]`, FORCE)
  await t.sleep(60)
  await page.click(`${sec} [data-dir="next"]`, FORCE)
  const two = await settled(page, sec, t)
  t.check('burst', at(two) === 2 && two.dot === 2, `two presses 60ms apart: ${fmt(two)}`)
  await page.$eval(`${sec} #meet-cards`, (r) => r.scrollTo({ left: 0, behavior: 'instant' }))
  await settled(page, sec, t)

  // Snap: a scroll that stops between cards comes to rest on one.
  await page.$eval(`${sec} #meet-cards`, (r) => r.scrollTo({ left: 0.62 * (r.children[1].offsetLeft - r.children[0].offsetLeft), behavior: 'instant' }))
  const snapped = await settled(page, sec, t)
  t.check('snap', at(snapped) === 1 && snapped.dot === 1, `scrolled to 62% of a card: rests at ${fmt(snapped)}`)
  await page.$eval(`${sec} #meet-cards`, (r) => r.scrollTo({ left: 0, behavior: 'instant' }))
  await settled(page, sec, t)

  // Touch: real synthesized finger gestures (CDP), as Chrome would get them from a phone.
  const cdp = await page.context().newCDPSession(page)
  const box = await page.locator(`${sec} #meet-cards`).boundingBox()
  const gy = Math.round(box.y + box.height / 3)
  const gesture = async (o) => {
    await cdp.send('Input.synthesizeScrollGesture', { x: 300, y: gy, yDistance: 0, gestureSourceType: 'touch', ...o })
    return settled(page, sec, t)
  }
  const home = async () => {
    await page.$eval(`${sec} #meet-cards`, (r) => r.scrollTo({ left: 0, behavior: 'instant' }))
    await settled(page, sec, t)
  }
  const y0 = await page.evaluate(() => scrollY)
  const drag = await gesture({ xDistance: -200, speed: 800 })
  const y1 = await page.evaluate(() => scrollY)
  const dragBack = await gesture({ xDistance: 200, speed: 800 })
  t.check('swipe', at(drag) === 1 && drag.dot === 1 && !drag.prevOff && at(dragBack) === 0 && dragBack.dot === 0 && y1 === y0,
    `finger dragged 200px left: ${fmt(drag)}; page scrollY ${y0} -> ${y1}; dragged back: ${fmt(dragBack)}`)

  // A short quick flick carries on to the next card and stops there (snap-stop: always).
  const flick = await gesture({ xDistance: -100, speed: 2500, preventFling: false })
  await home()
  t.check('flick', at(flick) === 1 && flick.dot === 1, `100px flick with momentum: ${fmt(flick)}`)

  // A vertical swipe over the cards scrolls the page, not the row.
  const v0 = await page.evaluate(() => scrollY)
  await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: Math.round(box.y + box.height / 2), xDistance: 0, yDistance: -200, gestureSourceType: 'touch', speed: 800 })
  await t.sleep(400)
  const vert = await state(page, sec)
  const v1 = await page.evaluate(() => scrollY)
  t.check('vertical', v1 - v0 > 100 && vert.x === 0, `vertical swipe on the cards: page scrollY +${v1 - v0}, row scrollLeft ${vert.x}`)
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'start' }))
  await t.sleep(200)

  // Trackpad: a precise two-finger scroll gesture (CDP 'mouse' source) past half a card
  // lands on the next card; a short one springs back. Plus one 400px mouse-wheel notch.
  const pad = await gesture({ xDistance: -200, speed: 800, gestureSourceType: 'mouse', x: 200 })
  await home()
  const nudge = await gesture({ xDistance: -100, speed: 800, gestureSourceType: 'mouse', x: 200 })
  const b2 = await page.locator(`${sec} #meet-cards`).boundingBox()
  await page.mouse.move(b2.x + 200, b2.y + 100)
  await page.mouse.wheel(400, 0)
  const wheeled = await settled(page, sec, t)
  await home()
  t.check('trackpad', at(pad) === 1 && pad.dot === 1 && at(nudge) === 0 && at(wheeled) === 1 && wheeled.dot === 1,
    `200px two-finger scroll: ${fmt(pad)}; 100px: springs back to card ${at(nudge)}; wheel 400: ${fmt(wheeled)}`)

  // Keyboard: Tab walks the four card links, then prev and next; focusing a card brings it on screen.
  await page.focus(`${sec} article a`)
  const order = [await page.evaluate(() => document.activeElement.getAttribute('aria-label'))]
  const seen = []
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    await t.sleep(i < 3 ? 450 : 50)
    order.push(await page.evaluate(() => document.activeElement.getAttribute('aria-label')))
    if (i < 3) {
      const on = await page.evaluate(() => {
        const r = document.activeElement.getBoundingClientRect()
        return r.left >= 0 && r.right <= document.documentElement.clientWidth
      })
      seen.push(on && at(await settled(page, sec, t)) >= 0)
    }
  }
  t.check('tab order', order.join(' > ') === [...TITLES.map((x) => `Explore: ${x}`), 'Previous events', 'Next events'].join(' > ') && seen.every(Boolean),
    `${order.join(' > ')}; each focused card link fully on screen with the row resting on a card: ${seen.join(',')}`)
  // Keyboard activation on the arrows, from where focus left the row (card 4 on screen).
  const kb0 = await settled(page, sec, t)
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Enter')
  const kb1 = await settled(page, sec, t)
  t.check('keyboard', at(kb0) === 3 && at(kb1) === 2 && kb1.dot === 2, `after tabbing out: ${fmt(kb0)}; Enter on Previous: ${fmt(kb1)}`)

  // Tablet: from ~600px two cards show and the last two share the end. Every stop is at
  // least half a card from the next (no 12px nudge), one dot per stop, and a scroll that
  // stops near the end rests on the end, not on the dropped third-card snap.
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'start' }))
  await home()
  const tab = [await state(page, sec)]
  for (let i = 0; i < 4 && !tab.at(-1).nextOff; i++) {
    await page.click(`${sec} [data-dir="next"]`, FORCE)
    tab.push(await settled(page, sec, t))
  }
  const xs = tab.map((s) => s.x)
  const pitch = tab[0].snaps[1]
  const gaps = xs.slice(1).map((x, k) => x - xs[k])
  await page.$eval(`${sec} #meet-cards`, (r) => r.scrollTo({ left: r.scrollWidth - r.clientWidth - 26, behavior: 'instant' }))
  const nearEnd = await settled(page, sec, t)
  t.check('tablet 768', xs.length === tab[0].dots && gaps.every((g) => g >= pitch / 2) && Math.abs(xs.at(-1) - tab[0].max) < 1 &&
    tab.every((s, k) => s.dot === k) && Math.abs(nearEnd.x - nearEnd.max) < 1 && nearEnd.dot === tab[0].dots - 1,
    `stops ${xs.map((x) => x.toFixed(0)).join(', ')} (steps ${gaps.map((g) => g.toFixed(0)).join(', ')}, card pitch ${pitch}), ${tab[0].dots} dots, ` +
    `dots ${tab.map((s) => s.dot).join(',')}; stopped 26px short of the end: rests at ${nearEnd.x.toFixed(0)} (end ${nearEnd.max})`)

  // Every card can be shown whole at every width: by stepping the arrows end to end,
  // and by scrolling straight to it (snap must not pull it back off screen). Dots: one
  // per stop, three only where the third card is already whole at the end stop.
  const DOTS = { 320: 4, 390: 4, 560: 4, 600: 4, 640: 4, 667: 4, 768: 3, 1023: 3 }
  const whole = () => page.$eval(`${sec} #meet-cards`, (r) => [...r.children].map((c) => {
    const b = c.getBoundingClientRect()
    return b.left >= -0.5 && b.right <= document.documentElement.clientWidth + 0.5
  }))
  for (const [w, dots] of Object.entries(DOTS).map(([w, d]) => [+w, d])) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.$eval(sec, (el) => el.scrollIntoView({ block: 'start' }))
    await home()
    let s = await state(page, sec)
    const xs = [s.x]
    const byArrow = new Set()
    const see = async () => (await whole()).forEach((v, k) => v && byArrow.add(k))
    await see()
    for (let i = 0; i < 5 && !s.nextOff; i++) {
      await page.click(`${sec} [data-dir="next"]`, FORCE)
      s = await settled(page, sec, t)
      xs.push(s.x)
      await see()
    }
    const byScroll = []
    for (let k = 0; k < 4; k++) {
      await page.$eval(`${sec} #meet-cards`, (r, k) => r.scrollTo({ left: r.children[k].offsetLeft - r.children[0].offsetLeft, behavior: 'instant' }), k)
      await settled(page, sec, t)
      byScroll.push((await whole())[k])
    }
    const steps = xs.slice(1).map((x, k) => (x - xs[k]).toFixed(0))
    t.check(`whole ${w}`, byArrow.size === 4 && byScroll.every(Boolean) && s.dots === dots && xs.length === dots,
      `arrows rest at ${xs.map((x) => x.toFixed(0)).join(', ')} (steps ${steps.join(', ')}) showing cards ${[...byArrow].sort().join(',')} whole; ` +
      `scrolled to each card: whole ${byScroll.map((v, k) => `${k}:${v ? 'y' : 'n'}`).join(' ')}; ${s.dots} dots (want ${dots})`)
  }
  await page.setViewportSize({ width: 390, height: 844 })

  const all = [s0, ...steps, ...back, two, snapped, drag, flick, pad, wheeled, kb1, ...tab]
  t.check('no transforms', all.every((s) => !s.transforms.length), 'row and cards never carry a transform: the browser scrolls them')
  if (!(await page.evaluate(() => window.__same))) t.check('reload', false, 'page reloaded mid-run (dev server hot reload): rerun')
}

export async function reduced(page, t) {
  const sec = t.section
  await page.$eval(sec, (el) => el.scrollIntoView({ block: 'start' }))
  await t.sleep(200)
  // Instant: the very next frame after the press already shows the next card.
  const x = await page.evaluate(async (s) => {
    const row = document.querySelector(`${s} #meet-cards`)
    document.querySelector(`${s} [data-dir="next"]`).click()
    await new Promise(requestAnimationFrame)
    return [row.scrollLeft, row.children[1].offsetLeft - row.children[0].offsetLeft]
  }, sec)
  const s = await state(page, sec)
  t.check('instant', Math.abs(x[0] - x[1]) < 1 && s.dot === 1, `one frame after Next: scrollLeft ${x[0].toFixed(1)} (card 1 at ${x[1]}), dot ${s.dot}`)
  const zoom = await page.$eval(`${sec} article img`, (i) => getComputedStyle(i).transitionDuration)
  t.check('no zoom', zoom === '0s', `photo transition-duration ${zoom} (M-10 zoom is motion-safe only)`)
}
