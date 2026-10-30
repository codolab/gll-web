// M-04..M-06: the four numbered shapes (94:266, 94:269, 94:268, 94:267) are tabs
// with automatic activation (hover, focus, tap, arrow keys). The selected one is
// drawn as the Figma loop (the "2" pill, turned to start at its circle) and the
// rest as circles, morphing in 0.4s. Each number has its own photo (94:265 for 2),
// fading in over the last in the same 0.4s inside one outline that gives every number
// the same notch; the selected loop takes a 32px white band off it, its corner with
// the next notch rounded as it arrives, never a sliver.
// The tagline (94:274 stack) swaps one line at a time. All instant under reduced
// motion. State 2 is the Figma frame, except the photo's outline near the 2 loop (M-G1).
// One t.check per aspect.
import { execFileSync } from 'node:child_process'

// Node ids per canvas (wide repeats 94:935 inside 173:509, same boxes and outlines): heading, photo, tagline, shapes frame.
const NODES = {
  desktop: { title: '94:261', photo: '94:265', line: '94:274', frame: '94:264' },
  wide: { title: '173:510', photo: '173:514', line: '173:523', frame: '173:513' },
}
let N = NODES.desktop
const PHOTOS = ['jaqs-volleyball.webp', 'vilnius-photo.webp', 'yolk-volley-308.webp', 'yolk-volley-274.webp']
const LINES = ['Global minds. Lithuanian roots.', 'One community. Endless possibilities.', 'Your next chapter starts here.', 'Go further, together.']
const REST = 1
const PILL_W = 135.065
const CIRCLE = [158.806, 158.806, 158.806, 143.682]
const MORPH_S = 0.4
const GAP = 32
const NOTCH = [31.8, 31.8, 31.8, 34.3] // Figma's notches under 1 and beside 4; 2 and 3 copy 1's
const SPREAD = 12 // measured 4.4 to 5.2 on the copies of notch 1, 9.2 on Figma's notch beside 4
const SETTLE_MS = 650
const JUMP = 0.5 // most of a corner that may change in one 1/60s step
const STEP = 0.2 // most of a switch's change in the photo that may happen in one 1/60s step
const POP = 0.03 // most a step may outdo both its neighbours by, as a share of the change
// Px of a step that may be lighter than both photos: edge anti-aliasing shifts by up to a quarter
// pixel while photos stack (11 to 64 px; 73 to 75 on the build before), white through a crossfade is tens of thousands.
const WASH = 500
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
  const h = await page.$eval(`[data-node-id="${N.title}"]`, (el) => el.getBoundingClientRect().toJSON())
  await page.mouse.move(h.left + h.width / 2, h.top + h.height / 2)
}

/** Every frame for `ms`: each line's opacity, each shape's dash and width. */
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
  const pts = await page.evaluate(([GAP, LINE]) => {
    const sec = document.querySelector('[data-section="talent"]')
    const tabs = [...sec.querySelectorAll('[role="tab"]')]
    const b = sec.querySelector('[role="tab"][aria-selected="true"]')
    const { dist, r, box } = window.__shape(b)
    const others = tabs.filter((o) => o !== b).map((o) => window.__shape(o))
    const line = sec.querySelector(`[data-node-id="${LINE}"]`).parentElement.querySelector('p:not(.invisible)').getBoundingClientRect()
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
  }, [GAP, N.line])
  const png = await page.screenshot()
  const w = png.readUInt32BE(16), px = rgb(png)
  const bad = pts.pts.filter(([x, y]) => { const i = (y * w + x) * 3; return Math.min(px[i], px[i + 1], px[i + 2]) < 250 })
  return { tab: pts.tab, n: pts.pts.length, bad: bad.length }
}

/**
 * Gap between each circle (drawn as a circle) and the photo's clip outline, in px:
 * the nearest and the farthest outline point within 40deg of the line to the photo's
 * centre, so a notch that is off-centre or turned away shows as a wide spread.
 */
const notches = (page) => page.evaluate(([CIRCLE, PHOTO]) => {
  const sec = document.querySelector('[data-section="talent"]')
  const img = sec.querySelector(`[data-node-id="${PHOTO}"]`), box = img.getBoundingClientRect()
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path')
  p.setAttribute('d', getComputedStyle(img).clipPath.match(/path\("(.+)"\)/)[1])
  svg.append(p); document.body.append(svg)
  const pts = []
  for (let l = 0, L = p.getTotalLength(); l < L; l += 1) { const q = p.getPointAtLength(l); pts.push([box.left + q.x, box.top + q.y]) }
  svg.remove()
  const mid = [box.left + box.width / 2, box.top + box.height / 2]
  return [...sec.querySelectorAll('[role="tab"]')].map((b, i) => {
    const s = b.querySelectorAll('svg path')[2], o = s.getPointAtLength(0), c = new DOMPoint(o.x, o.y).matrixTransform(s.getScreenCTM())
    const to = Math.atan2(mid[1] - c.y, mid[0] - c.x)
    // The outline's nearest point per degree, from -40 to 40deg round the line to the centre.
    const near = new Array(81).fill(Infinity)
    for (const [x, y] of pts) {
      const a = Math.round((Math.atan2(Math.sin(Math.atan2(y - c.y, x - c.x) - to), Math.cos(Math.atan2(y - c.y, x - c.x) - to)) * 180) / Math.PI)
      if (Math.abs(a) <= 40) near[a + 40] = Math.min(near[a + 40], Math.hypot(x - c.x, y - c.y) - CIRCLE[i] / 2)
    }
    return [Math.min(...near), Math.max(...near)]
  })
}, [CIRCLE, N.photo])

const rgb = (png) => execFileSync('magick', ['png:-', '-alpha', 'off', '-depth', '8', 'rgb:-'], { input: png, maxBuffer: 1 << 28 })
const HIDE = '[data-section="talent"] [role="tab"], [data-section="talent"] p { visibility: hidden !important }'
const BLACK = `[data-section="talent"] img { filter: brightness(0) !important } ${HIDE}`
const sliverPx = (png) => {
  const area = (...op) => +execFileSync('magick', ['png:-', '-alpha', 'off', '-colorspace', 'gray', '-threshold', '50%', '-negate', ...op, '-format', '%[fx:mean*w*h]', 'info:'], { input: png }).toString()
  return Math.round(area() - area('-morphology', 'Open', 'Disk:8'))
}
/**
 * Photo left as slivers: the visible photo (painted black, shapes and text hidden)
 * from a real screenshot, and the pixels an opening by an 8px disc removes from it.
 * Smooth edges and wide corners lose a few; a spike or a thin strip loses many.
 */
async function slivers(page) {
  const style = await page.addStyleTag({ content: BLACK })
  const png = await page.locator(`[data-node-id="${N.frame}"]`).screenshot()
  await style.evaluate((el) => el.remove())
  return sliverPx(png)
}

/** The photo as a mask (0 where it shows) and how many separate pieces of 2 px or more it is in (a lone half-covered pixel is where two edges meet). */
const mask = (png) => execFileSync('magick', ['png:-', '-alpha', 'off', '-colorspace', 'gray', '-threshold', '50%', 'gray:-'], { input: png, maxBuffer: 1 << 26 })
const pieces = (png) => execFileSync('magick', ['png:-', '-alpha', 'off', '-colorspace', 'gray', '-threshold', '50%', '-define', 'connected-components:verbose=true', '-connected-components', '8', 'null:'], { input: png, maxBuffer: 1 << 26 })
  .toString().split('\n').filter((l) => /gray\(0\)/.test(l) && +l.trim().split(/\s+/)[3] >= 2).length

/** Sum of absolute byte differences, whether no byte differs by more than 3, and how many px are lighter than `top` in any channel. */
const moved = (a, b) => { let n = 0; for (let j = 0; j < a.length; j++) n += Math.abs(a[j] - b[j]); return n }
const near = (a, b) => { for (let j = 0; j < a.length; j++) if (Math.abs(a[j] - b[j]) > 3) return false; return true }
const lighter = (c, top) => { let n = 0; for (let j = 0; j < c.length; j += 3) n += c[j] > top[j] + 6 || c[j + 1] > top[j + 1] + 6 || c[j + 2] > top[j + 2] + 6; return n }

/**
 * Switches from tab a to tab b frame by frame: each transition the switch starts is paused and
 * stepped 1/60s at a time from when it started, to 50ms past the bands' end, with the page clock
 * run on alongside (timers fire when they would), then the clock and the page 0.3s on. A third
 * value switches on again that many ms in: back to a, or to a fourth value. Each step shoots the photo as slivers() does
 * (black, shapes and text hidden) and in colour (shapes and text hidden). Returns per switch:
 * when anything last changed by more than 3 levels, the most pieces the photo was in, the largest share of a corner
 * (a's or the last selected tab's, the photo its fill takes at rest) changed in one step, the
 * most sliver px over the 0.1s before the end, the most px of a step lighter than both tabs'
 * settled photos (white showing through), the largest share of the change in one step, and the
 * most a step outdoes both its neighbours by, as a share (a jump in an otherwise smooth change).
 */
async function settle(t, switches) {
  const page = await t.browser.newPage({ viewport: { width: t.width ?? 1440, height: 900 }, reducedMotion: 'no-preference' })
  await page.clock.install()
  await page.goto(t.url, { waitUntil: 'networkidle' })
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'center' }))
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.addStyleTag({ content: `${HIDE} html:not(.qa-colour) [data-section="talent"] img { filter: brightness(0) !important }` })
  const click = (i) => page.evaluate((i) => document.querySelectorAll('[data-section="talent"] [role="tab"]')[i].click(), i)
  const shot = () => page.locator(`[data-node-id="${N.frame}"]`).screenshot()
  const colour = async () => {
    await page.evaluate(() => document.documentElement.classList.add('qa-colour'))
    const png = await shot()
    await page.evaluate(() => document.documentElement.classList.remove('qa-colour'))
    return png
  }
  // Adds the transitions just started, from `now`; returns when the bands stop, since anything
  // else still changing after them is late.
  const pause = (now) => page.evaluate((now) => {
    const known = new Set(window.__run.map(([x]) => x))
    window.__run = [...window.__run.filter(([x]) => x.playState !== 'idle'),
      ...document.getAnimations().filter((x) => x.transitionProperty && !known.has(x)).map((x) => [x, now])]
    window.__run.forEach(([x]) => x.pause())
    return Math.max(0, ...window.__run.filter(([x]) => x.transitionProperty === 'stroke-dasharray').map(([x, off]) => off + x.effect.getComputedTiming().endTime))
  }, now)
  const corner = async () => {
    const hide = await page.addStyleTag({ content: `${t.section} [role="tabpanel"] svg > g > g { display: none !important }` })
    const bare = mask(await shot())
    await hide.evaluate((el) => el.remove())
    const full = mask(await shot())
    return [...bare.keys()].filter((k) => !bare[k] && full[k])
  }
  const settled = []
  for (const i of [0, 1, 2, 3]) {
    await click(i)
    await t.sleep(SETTLE_MS)
    settled.push(rgb(await colour()))
  }
  const out = []
  for (const [a, b, back, then = a] of switches) {
    await click(a)
    await t.sleep(SETTLE_MS)
    const from = await corner()
    const at = [-1], shots = [await shot()], colours = [await colour()]
    await page.evaluate(() => { window.__run = [] })
    await click(b)
    let end = await pause(0), clock = 0, turned = !back
    for (let k = 0, now = 0; now <= end + 50; now = ++k * 1000 / 60) {
      if (!turned && now > back + 0.01) { await click(then); end = await pause(back); turned = true }
      await page.evaluate((now) => window.__run.forEach(([x, off]) => { x.currentTime = now - off }), now)
      if (Math.round(now) > clock) { await page.clock.runFor(Math.round(now) - clock); clock = Math.round(now) }
      at.push(now)
      shots.push(await shot())
      colours.push(await colour())
    }
    await page.clock.runFor(300)
    await t.sleep(300)
    at.push(Infinity)
    shots.push(await shot())
    colours.push(await colour())
    const to = await corner()
    const masks = shots.map(mask), share = (px) => Math.max(...masks.slice(1).map((m, k) => px.filter((p) => !m[p] !== !masks[k][p]).length / px.length))
    const px = colours.map(rgb), top = settled[a].map((v, j) => Math.max(v, settled[b][j], settled[then][j]))
    const steps = px.slice(1).map((c, k) => moved(c, px[k]))
    out.push({
      run: `${a + 1}->${b + 1}${back ? `->${then + 1} at ${back}ms` : ''}`, end: at.find((x) => x >= end - 0.01),
      still: at[px.findIndex((c, k) => px.slice(k).every((o) => near(o, c)))],
      pieces: Math.max(...shots.map(pieces)),
      jump: from.length && to.length ? Math.max(share(from), share(to)) : null,
      tail: Math.max(...shots.filter((_, k) => at[k] >= end - 100 && at[k] < Infinity).map(sliverPx)),
      wash: Math.max(...px.map((c) => lighter(c, top))),
      step: Math.max(...steps) / steps.reduce((x, y) => x + y, 0),
      pop: Math.max(...steps.map((v, k) => v - Math.max(steps[k - 1] ?? 0, steps[k + 1] ?? 0))) / steps.reduce((x, y) => x + y, 0),
    })
  }
  await page.close()
  return out
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
  N = NODES[t.surface]
  await mark(page)
  await installShape(page)
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
  t.check('M-04', is(rest, REST) && wiring.tabs === 4 && wiring.controls && wiring.labelled && wiring.holds &&
      aria.includes('tablist "A world of Lithuanian talent"') && aria.includes('tab "2: One community. Endless possibilities." [selected]') &&
      aria.includes('tabpanel "2: One community. Endless possibilities."'),
    `tabs semantics: tablist named by the h2, ${wiring.tabs} tabs, aria-controls -> panel ${wiring.controls}, panel labelled by the selected tab ${wiring.labelled}, ` +
    `panel holds ${N.photo} + ${N.line} ${wiring.holds}; rest selected ${rest.selected} (extended ${rest.extended}, ${rest.circles} circles), tabindex ${rest.tabindex}`)

  const hits = await hitArea(page)
  t.check('M-04', hits.every((h) => h.n > 0 && h.ok === h.n),
    `hit area matches the painted shape (2px edge band skipped): ${hits.map((h) => `${h.id} ${h.ok}/${h.n}`).join(', ')}`)

  // Hover 1, 3, 4, 2, sampling the 2 -> 1 morph and fades; each settled loop must clear its photo.
  const pts = await points(page)
  const hovered = []
  const clear = []
  const thin = []
  const offsets = []
  let one
  for (const i of [0, 2, 3, 1]) {
    if (i === 0) await sampleFades(page, 900)
    await page.mouse.move(pts[i].x, pts[i].y)
    await t.sleep(i === 0 ? 1000 : SETTLE_MS)
    if (i === 0) one = await page.evaluate(() => window.__fade)
    hovered.push([i, await snap(page)])
    clear.push(await band(page))
    thin.push(await slivers(page))
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

  // The corner rounds as the band arrives, inside the same transition, for every corner growing
  // and shrinking, a switch sent back half way and one sent on. Frame by frame: the photo stays one piece (no
  // fleck left behind), no step changes more than JUMP of a corner (no snap), nothing changes
  // after the bands stop (no flick after), and the last 0.1s leaves no spike (16 px or more; 22
  // to 55 without a fill).
  const runs = await settle(t, [[3, 0], [0, 1], [1, 2], [2, 3], [1, 0, 200], [0, 1, 200, 2]])
  t.check('M-05', runs.every((r) => r.still <= r.end && r.pieces === 1 && r.jump !== null && r.jump <= JUMP && r.tail < 16),
    `corner rounds with its band, stepped 1/60s with the page clock: ${runs.map((r) => `${r.run} still from ` +
      `${r.still === Infinity ? 'after the end' : `${r.still.toFixed(0)}`}/${r.end.toFixed(0)}ms, ${r.pieces} piece${r.pieces > 1 ? 's' : ''}, ` +
      `${r.jump === null ? 'no corner fill' : `corner step ${(r.jump * 100).toFixed(0)}%`}, tail slivers ${r.tail}`).join('; ')} (step under ${JUMP * 100}%; a spike is 16 or more)`)
  // The new number's photo comes in over the old one in the same steps: no step lighter than
  // both photos (white through a crossfade), none taking more than STEP of the change (a swap),
  // and none standing out from both its neighbours by more than POP (a jump, as when a layer drops).
  t.check('M-05', runs.every((r) => r.wash <= WASH && r.step <= STEP && r.pop <= POP),
    `photo changes with its number: ${runs.map((r) => `${r.run} ${r.wash} px lighter than both photos, ` +
      `${(r.step * 100).toFixed(0)}% of the change in one step, a step ${(r.pop * 100).toFixed(1)}% over its neighbours`).join('; ')} ` +
    `(at most ${WASH} px, under ${STEP * 100}% and ${POP * 100}%)`)

  t.check('M-04', offsets.every((d) => d <= 0.5),
    `numbers centred in their circles: worst ${offsets.map((d) => `${f2(d)}px`).join(', ')} across hover 1, 3, 4, 2`)

  // The band keeps 32px of white between the loop and the photo (its head sits in the circle's notch).
  const bands = await page.$$eval(`${t.section} [role="tabpanel"] svg g > path:first-child`, (ps) => ps.map((p) => [parseFloat(getComputedStyle(p).strokeDasharray), parseFloat(getComputedStyle(p).strokeWidth)]))
  const bandOk = bands.length === 4 && bands.every(([d, w], i) => (i === 1 ? d >= 0.999 && Math.abs(w - (PILL_W + 2 * GAP)) < 0.01 : d <= 0.001 && Math.abs(w - CIRCLE[i]) < 0.01))
  t.check('M-05', bandOk && clear.every((c) => c.n > 500 && c.bad === 0),
    `white band round the loop, from screenshots: ${clear.map((c) => `${c.tab} ${c.bad}/${c.n} points not white`).join(', ')}; ` +
    `band at rest ${bands.map(([d, w]) => `${d >= 0.999 ? 'loop' : 'circle'} ${f2(w)}px`).join(', ')} (loop ${f2(PILL_W)} + 2 x ${GAP})`)

  // The outline is the same for every number: each circle sits in its notch at Figma's gap.
  const gaps = await notches(page)
  t.check('M-05', gaps.every(([lo, hi], i) => Math.abs(lo - NOTCH[i]) <= 1 && hi - lo <= SPREAD),
    `photo outline notches each circle: gap within 40deg of the photo's centre ${gaps.map(([lo, hi], i) => `${i + 1} ${f2(lo)}-${f2(hi)}px`).join(', ')} ` +
    `(Figma's nearest ${NOTCH.join('/')}, spread under ${SPREAD})`)
  // Where the loop meets the next notch the corner is rounded: no spike or strip of photo is left.
  t.check('M-05', thin.every((n) => n <= 10),
    `no slivers of photo: pixels an 8px opening removes, hover ${[0, 2, 3, 1].map((i, j) => `${i + 1} ${thin[j]}`).join(', ')} (smooth edges lose under 10; a spike 16 or more)`)

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
    `focus ring: keyboard focus ${rings.filter(Boolean).length}/${rings.length} drawn (shape stroke), mouse click focus ${clicked.ring ? 'drawn' : 'none'}`)

  const touch = await t.browser.newPage({ viewport: { width: t.width ?? 1440, height: 900 }, hasTouch: true, reducedMotion: 'no-preference' })
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

  // M-05: a photo per number, each at 2x the box, all in the one clipped box (Figma's for 2).
  const photos = await page.$eval(`[data-section="talent"] [data-node-id="${N.photo}"]`, (box, srcs) => Promise.all(srcs.map(async (src) => {
    const i = new Image()
    i.src = `/assets/talent/${src}`
    const decoded = await i.decode().then(() => true, () => false)
    const r = box.getBoundingClientRect()
    return { src, w: i.naturalWidth, h: i.naturalHeight, at2x: decoded && Math.abs(i.naturalWidth - 2 * r.width) <= 1.5 && Math.abs(i.naturalHeight - 2 * r.height) <= 1.5 }
  })).then((list) => ({ list, clip: getComputedStyle(box).clipPath.startsWith('path('), inside: [...box.querySelectorAll('img')].every((i) => i.getBoundingClientRect().width === box.getBoundingClientRect().width) })), PHOTOS)
  const states = [[REST, rest], ...hovered, ...keyed]
  t.check('M-05', photos.list.every((p) => p.at2x) && photos.clip && photos.inside && states.every(([i, s]) => s.photo === PHOTOS[i]),
    `photo per number: ${photos.list.map((p) => `${p.src} ${p.w}x${p.h} at 2x ${p.at2x}`).join(', ')}; box clipped to a vector ${photos.clip}, photos fill it ${photos.inside}; ` +
    `each shown alone once settled in all ${states.length} states sampled (${[...new Set(states.map(([, s]) => s.photo))].length} photos)`)

  // M-06: the tagline.
  const lines = await fit(page)
  t.check('M-06', rest.line === LINES[REST] && [...hovered, ...keyed].every(([i, s]) => s.line === LINES[i]),
    `tagline per state: rest "${rest.line}" (${N.line}); hover ${hovered.map(([, s]) => `"${s.line}"`).join(', ')}`)
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
  N = NODES[t.surface]
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
  const morph = await page.$$eval(`${t.section} svg path, ${t.section} svg circle`, (els) => Math.max(...els.map((e) => parseFloat(getComputedStyle(e).transitionDuration) || 0)))
  t.check('M-04', is(rest, REST) && all(seen) && all(keys) && morph === 0,
    `reduced, still switches with no morph: hover ${trail(seen)}, keys ${keys.map(([, s, k]) => `${k}->${s.selected}`).join(' ')}, each within 2 frames; longest shape transition ${morph}s`)
  t.check('M-05', [...seen, ...keys].every(([i, s]) => s.photo === PHOTOS[i]) && Math.max(...durs) === 0,
    `reduced, instant photos and lines: ${seen.map(([i, s]) => `${i + 1} ${s.photo}`).join(', ')}; longest transition ${Math.max(...durs)}s`)
  t.check('M-06', [...seen, ...keys].every(([i, s]) => s.line === LINES[i]),
    `reduced, tagline instant: ${seen.map(([, s]) => `"${s.line}"`).join(', ')}`)
}
