// community on mobile (MOBILE_SPEC.md section 9). Copy is checked against the
// Figma text nodes, char for char. The bento keeps the desktop shapes: computed
// radii put each round side at half the card's height (a semicircle), the
// circle stays a circle, and every line of copy sits inside its card's shape at
// 320, 390 and 768. M-13 on mobile: the arrows nudge on keyboard focus and on
// press, never at rest, and not at all under reduced motion.
// copyFromFigma and controls are exported for qa/mobile/footer.mjs.
import { readFileSync } from 'node:fs'

const WIDTHS = [320, 390, 768]
const BAND = [0xcc, 0xd8, 0xf4]
const NUDGE = 4

/** Every visible TEXT node of a desktop section, as [node id, characters]. */
export function copyFromFigma(slug) {
  const out = []
  const walk = (n) => {
    if (n.visible === false) return
    if (n.type === 'TEXT') out.push([n.id, n.characters])
    ;(n.children ?? []).forEach(walk)
  }
  walk(JSON.parse(readFileSync(new URL(`../../design/nodes/${slug}.json`, import.meta.url), 'utf8')))
  return out
}

/** Copy strings with no element in the section whose textContent is exactly that string. */
export const missingCopy = (page, sel, strings) =>
  page.$eval(sel, (sec, want) => {
    const have = new Set([...sec.querySelectorAll('*')].map((e) => e.textContent))
    return want.filter((s) => !have.has(s))
  }, strings)

/** Links, buttons and inputs in the section smaller than 44x44 at the current width. */
export const controls = (page, sel) =>
  page.$eval(sel, (sec) => [...sec.querySelectorAll('a[href], button, input')].map((el) => {
    const b = el.getBoundingClientRect()
    return { name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 24), w: b.width, h: b.height }
  }))

/** Used corner radii of each card ([rx, ry] per corner, after CSS scales overflowing radii) and whether its copy fits the shape. */
const bento = (page, sel) => page.$eval(sel, (sec) => {
  const shape = (el) => {
    const cs = getComputedStyle(el)
    const b = el.getBoundingClientRect()
    const len = (t, d) => (t.endsWith('%') ? (parseFloat(t) / 100) * d : t.endsWith('px') ? parseFloat(t) : NaN)
    const r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((p) => {
      const [x, y = x] = cs[p].split(' ')
      return [len(x, b.width), len(y, b.height)]
    })
    const [tl, tr, br, bl] = r
    const f = Math.min(1, b.width / (tl[0] + tr[0]), b.width / (bl[0] + br[0]), b.height / (tl[1] + bl[1]), b.height / (tr[1] + br[1]))
    return { b, w: b.width, h: b.height, r: r.map(([x, y]) => [x * f, y * f]) }
  }
  const inside = (s, X, Y) => {
    const x = X - s.b.left, y = Y - s.b.top
    const [tl, tr, br, bl] = s.r
    const ell = (cx, cy, [rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
    if (x < 0 || y < 0 || x > s.w || y > s.h) return false
    if (x < tl[0] && y < tl[1]) return ell(tl[0], tl[1], tl)
    if (x > s.w - tr[0] && y < tr[1]) return ell(s.w - tr[0], tr[1], tr)
    if (x > s.w - br[0] && y > s.h - br[1]) return ell(s.w - br[0], s.h - br[1], br)
    if (x < bl[0] && y > s.h - bl[1]) return ell(bl[0], s.h - bl[1], bl)
    return true
  }
  const out = {}
  for (const el of sec.querySelectorAll('[data-card]')) {
    const s = shape(el)
    const escaped = []
    // Each line's glyph box (cap height to baseline in Inter), 2px clear of the edge.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue
      const fs = parseFloat(getComputedStyle(n.parentElement).fontSize)
      const range = document.createRange()
      range.selectNodeContents(n)
      for (const q of range.getClientRects()) {
        const top = q.top + 0.242 * fs, bottom = q.top + 0.969 * fs
        const pts = [[q.left - 2, top], [q.right + 2, top], [q.right + 2, bottom], [q.left - 2, bottom]]
        if (!pts.every(([x, y]) => inside(s, x, y))) escaped.push(`"${n.textContent.trim().slice(0, 16)}"`)
      }
    }
    for (const c of el.querySelectorAll('img, a')) {
      const q = c.getBoundingClientRect()
      // A pill's ends are round: test its outermost points, not its box corners.
      const R = c.matches('a') ? q.height / 2 : 0
      const k = R * (1 - Math.SQRT1_2)
      const pts = R
        ? [[q.right, q.top + R], [q.right - k, q.top + k], [q.right - k, q.bottom - k], [q.left + k, q.top + k], [q.left + k, q.bottom - k]]
        : [[q.left, q.top], [q.right, q.top], [q.right, q.bottom], [q.left, q.bottom]]
      if (!pts.every(([x, y]) => inside(s, x, y))) escaped.push(c.tagName.toLowerCase())
    }
    out[el.dataset.card] = { w: s.w, h: s.h, r: s.r, escaped }
  }
  return out
})

const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol
const fmt = (n) => (Math.round(n * 10) / 10).toString()
const rad = (r) => r.map(([x, y]) => (near(x, y) ? fmt(x) : `${fmt(x)}/${fmt(y)}`)).join(' ')

/** The desktop shape rules, scaled: [card, test, what it asserts]. */
const SHAPES = [
  ['partner', (c) => near(c.r[0][0], 16) && near(c.r[3][0], 16) && [c.r[1], c.r[2]].every(([x, y]) => near(x, c.h / 2) && near(y, c.h / 2)), 'TL/BL 16, right side a semicircle (h/2)'],
  ['conversations', (c) => c.r[0][0] === 0 && c.r[3][0] === 0 && near(c.r[1][0], 16) && near(c.r[2][0], 16), 'right corners 16, left side from the photo'],
  ['together', (c) => near(c.w, c.h, 1) && c.r.every(([x, y]) => near(x, c.w / 2) && near(y, c.h / 2)), 'a circle'],
  ['flag', (c) => near(c.w, c.h, 1) && near(c.r[1][0], c.w / 2) && near(c.r[1][1], c.h / 2) && [c.r[0], c.r[2], c.r[3]].every(([x]) => near(x, 16)), 'square, TR quarter circle (w/2), others 16'],
  ['member', (c) => near(c.r[0][0], 16) && near(c.r[3][0], 16) && [c.r[1], c.r[2]].every(([x, y]) => near(x, c.h / 2) && near(y, c.h / 2)), 'full width, TL/BL 16, right end a semicircle'],
  ['support', (c) => near(c.r[1][0], c.h / 2) && near(c.r[1][1], c.h / 2) && [c.r[0], c.r[2], c.r[3]].every(([x]) => near(x, 16)), 'full width, TR quarter circle (h/2), others 16'],
]

/** RGB at CSS-px points of an element's on-screen pixels; negative coordinates count from the far edge. */
async function pixels(page, locator, pts) {
  const png = await locator.screenshot({ animations: 'disabled', scale: 'css' })
  return page.evaluate(async ([b64, pts]) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const g = new OffscreenCanvas(img.width, img.height).getContext('2d')
    g.drawImage(img, 0, 0)
    return pts.map(([x, y]) => [...g.getImageData(x < 0 ? img.width + x : x, y < 0 ? img.height + y : y, 1, 1).data.slice(0, 3)])
  }, [png.toString('base64'), pts])
}
const isBand = (p) => p.every((v, i) => Math.abs(v - BAND[i]) <= 6)

const arrowX = (page, sel, which) => page.$eval(`${sel} [data-arrow="${which}"]`, (el) => ({
  x: el.getBoundingClientRect().left, translate: getComputedStyle(el).translate, transform: getComputedStyle(el).transform,
}))
const atRest = (p) => (p.translate === 'none' || p.translate === '0px') && p.transform === 'none'

/** Keyboard focus: focus whatever precedes the link in tab order, then press Tab. */
async function tabTo(page, link) {
  await link.evaluate((el) => {
    const all = [...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('[inert], [aria-hidden="true"]') && e.getClientRects().length)
    const prev = all[all.indexOf(el) - 1]
    if (prev) prev.focus()
    else document.body.focus()
  })
  await page.keyboard.press('Tab')
  return link.evaluate((el) => document.activeElement === el && el.matches(':focus-visible'))
}

/** Hold a press on the link (pointer down, no hover media on a touch device), read the arrow, release. */
async function pressed(page, link, sel, which) {
  const b = await link.boundingBox()
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5)
  await page.mouse.down()
  await page.waitForTimeout(400)
  const during = await arrowX(page, sel, which)
  const active = await link.evaluate((el) => el.matches(':active'))
  await page.mouse.up()
  await page.waitForTimeout(400)
  return { during, active, after: await arrowX(page, sel, which) }
}

const LINKS = [['partner', (s) => `${s} a[data-card="partner"]`], ['support', (s) => `${s} [data-card="support"] a`]]

async function nudges(page, t, reduced) {
  const want = reduced ? 0 : NUDGE
  for (const [which, linkSel] of LINKS) {
    const link = page.locator(linkSel(t.section))
    await link.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    await page.waitForTimeout(400)
    const rest = await arrowX(page, t.section, which)
    if (!reduced) t.check('M-13 rest', atRest(rest), `${which} arrow at rest: translate ${rest.translate}, transform ${rest.transform}`)
    const p = await pressed(page, link, t.section, which)
    const dp = p.during.x - rest.x
    t.check('M-13 press', p.active && near(dp, want, 0.05) && near(p.after.x, rest.x, 0.05),
      `${which}: held press (:active ${p.active}) moves the arrow ${fmt(dp)}px (want ${want}); release ${fmt(p.after.x - rest.x)}px`)
    const visible = await tabTo(page, link)
    await page.waitForTimeout(400)
    const focused = await arrowX(page, t.section, which)
    await link.evaluate((el) => el.blur())
    await page.waitForTimeout(400)
    const blurred = await arrowX(page, t.section, which)
    const df = focused.x - rest.x
    t.check('M-13 focus', visible && near(df, want, 0.05) && near(blurred.x, rest.x, 0.05),
      `${which}: Tab onto the link (focus-visible ${visible}) moves the arrow ${fmt(df)}px (want ${want}); blur ${fmt(blurred.x - rest.x)}px`)
  }
}

export default async function (page, t) {
  const sec = page.locator(t.section)
  t.check('markup', await sec.evaluate((el) => el.matches('section#community') && !!el.querySelector('h2')), 'section#community[data-section] with an h2 headline')

  const copy = copyFromFigma('community')
  const missing = await missingCopy(page, t.section, copy.map(([, s]) => s))
  t.check('copy', !missing.length, missing.length ? `missing or altered: ${missing.map((s) => JSON.stringify(s)).join(', ')}` : `all ${copy.length} Figma text nodes present char for char`)

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.waitForTimeout(150)
    const cards = await bento(page, t.section)
    const bad = SHAPES.filter(([n, ok]) => !cards[n] || !ok(cards[n]))
    t.check(`shapes ${w}`, !bad.length,
      bad.length
        ? bad.map(([n, , what]) => `${n} ${cards[n] ? `${fmt(cards[n].w)}x${fmt(cards[n].h)} radii ${rad(cards[n].r)}` : 'missing'} (want ${what})`).join('; ')
        : SHAPES.map(([n]) => `${n} ${fmt(cards[n].w)}x${fmt(cards[n].h)} r ${rad(cards[n].r)}`).join(' · '))
    const out = Object.entries(cards).filter(([, c]) => c.escaped.length)
    t.check(`fit ${w}`, !out.length, out.length ? out.map(([n, c]) => `${n}: ${c.escaped.join(', ')} cross the shape`).join('; ') : 'every line, arrow and pill sits inside its card shape')

    // The conversations photo has no CSS shape on its left: its round side is the photo's alpha.
    const photo = page.locator(`${t.section} [data-card="conversations"]`)
    await photo.scrollIntoViewIfNeeded()
    const [corner, edge, br] = await pixels(page, photo, [[1, 1], [2, cards.conversations.h / 2], [-1, -1]])
    t.check(`photo arc ${w}`, isBand(corner) && !isBand(edge) && isBand(br),
      `top-left corner shows the band (${corner}), left edge mid-height shows photo (${edge}), bottom-right corner rounded (${br})`)

    const small = (await controls(page, t.section)).filter((c) => c.w < 44 || c.h < 44)
    t.check(`targets ${w}`, !small.length, small.length ? small.map((c) => `${c.name} ${fmt(c.w)}x${fmt(c.h)}`).join(', ') : 'every link at least 44x44')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await nudges(page, t, false)
}

export async function reduced(page, t) {
  await nudges(page, t, true)
}
