// page: M-G1 for what no single section owns. The pause button (M-G5) lives in
// <main>, fixed to the viewport, and is not rendered under reduced motion, so
// the parity harness never sees it: compare the top of the viewport with motion
// on (every animation parked at t=0) against reduced motion, at three scrolls.
// An animating marquee promotes later content (the nav) to its own layer, which
// re-rasterises glyph edges, so 1px fringes are expected; a painted box is not.
// At scroll 0 the nav sits over the moving hero rows, whose blend rounds by 1 level.
import { compare, fmt } from './_marquee.mjs'

const STRIP = { x: 0, y: 0, width: 1440, height: 48 }
const SCROLLS = [0, 1300, 5800] // hero, talent, community: none of them moves on its own at t=0

const strip = async (page, y) => {
  await page.evaluate((y) => scrollTo(0, y), y)
  await page.evaluate(async () => {
    // The sticky nav's bar fades in once (M-16): a state change, not a loop, so let it land.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished))
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0 }
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  return page.screenshot({ clip: STRIP })
}

export default async function (page, t) {
  const calm = await t.browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await calm.goto(t.url, { waitUntil: 'networkidle' })
  await calm.evaluate(() => document.fonts.ready)
  const diffs = []
  const floor = (y) => (y === 0 ? 1 : 0)
  for (const y of SCROLLS) diffs.push([y, compare(await strip(page, y), await strip(calm, y), floor(y))])
  await calm.close()
  const bottom = await page.$eval('main > button[aria-pressed]', (el) => el.getBoundingClientRect().bottom)
  t.check('M-G1', diffs.every(([, d]) => d.core === 0),
    `top ${STRIP.height}px of the viewport, motion on vs reduced: ${diffs.map(([y, d]) => `scroll ${y}: ${fmt(d, floor(y))}`).join('; ')}; pause button bottom at ${bottom}px`)
}
