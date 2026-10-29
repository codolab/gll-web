// Checks for the mobile composition (MOBILE_SPEC.md) and for which composition
// each window width gets. Mobile has no Figma frame, so there is no parity to
// measure; these are the gates instead.
//
//   npm run build && node scripts/mobile-check.mjs [slug ...]   (URL=... to override)
//
// 1. surface: the width -> composition table in src/surface.ts, and that a window
//    wider than the canvas shows no white margin beside a full-width band.
// 2. layout, at every width in WIDTHS: nothing escapes the window unless a
//    clipping box (marquee, carousel) holds it, every section renders, text is
//    at least 12px, every control is at least 24x24 (WCAG 2.5.8; 44 is the aim
//    and is reported), every image loads, no page errors. Full-page shots go
//    to qa/mobile/out/<width>.png.
// 3. qa/mobile/<slug>.mjs, as in scripts/motion-check.mjs: a default export
//    `async (page, t) => {}` run at 390x844 with touch and motion on, and an
//    optional `reduced` export run under prefers-reduced-motion: reduce.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { at, launch } from './harness.mjs'

const BASE = process.env.URL ?? 'http://localhost:4197/'
const only = process.argv.slice(2)
const OUT = at('qa/mobile/out')
mkdirSync(OUT, { recursive: true })

export const WIDTHS = [320, 360, 390, 430, 768, 1023]
const SLUGS = ['nav', 'hero', 'logos', 'talent', 'ribbons', 'programs', 'impact', 'meet', 'community', 'footer']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
const check = (group, id, pass, detail = '') => results.push({ group, id, pass: !!pass, detail: String(detail) })

const browser = await launch()

async function open(viewport, { reduce = false, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: reduce ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().split('\n')[0]) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, errors }
}

// ------------------------------------------------------------ 1. surface
if (!only.length || only.includes('surface')) {
  for (const [w, want] of [[320, 'mobile'], [1023, 'mobile'], [1024, 'desktop'], [1539, 'desktop'], [1540, 'wide'], [1920, 'wide'], [2560, 'wide']]) {
    const { page, ctx } = await open({ width: w, height: 900 })
    const got = await page.$eval('main', (m) => m.dataset.surface)
    check('surface', `${w}px`, got === want, `${w}px -> ${got} (want ${want})`)
    if (want !== 'mobile') {
      // No white margin: the window's outermost columns match the band beside them.
      const margins = []
      for (const slug of ['hero', 'programs', 'impact', 'community', 'footer']) {
        await page.evaluate((s) => {
          const r = document.querySelector(`[data-section="${s}"]`).getBoundingClientRect()
          scrollTo(0, scrollY + r.top + Math.min(r.height / 2, 300) - 100)
        }, slug)
        await sleep(150)
        const shot = await page.screenshot({ clip: { x: 0, y: 100, width: w, height: 1 } })
        const { left, right, inner } = await page.evaluate(async (b64) => {
          const img = new Image()
          img.src = `data:image/png;base64,${b64}`
          await img.decode()
          const c = new OffscreenCanvas(img.width, 1)
          const g = c.getContext('2d')
          g.drawImage(img, 0, 0)
          const px = (x) => [...g.getImageData(x, 0, 1, 1).data.slice(0, 3)]
          const canvas = document.querySelector('[data-canvas="root"]').getBoundingClientRect()
          return { left: px(1), right: px(img.width - 2), inner: px(Math.max(1, Math.round(canvas.left) + 4)) }
        }, shot.toString('base64'))
        const white = (p) => p.every((v) => v > 247)
        if ((white(left) || white(right)) && !white(inner)) margins.push(`${slug} edge ${left}/${right} vs band ${inner}`)
      }
      check('surface', `${w}px bleed`, !margins.length, margins.length ? margins.join('; ') : 'bands reach both window edges')
    }
    await ctx.close()
  }
}

// ------------------------------------------------------------ 2. layout
if (!only.length || only.includes('layout')) {
  for (const w of WIDTHS) {
    const { page, ctx, errors } = await open({ width: w, height: 800 }, { touch: true })
    // Walk the page once so lazy images load.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
        scrollTo(0, y); await new Promise((r) => setTimeout(r, 60))
      }
      scrollTo(0, 0)
    })
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15_000 }).catch(() => {})
    const r = await page.evaluate((slugs) => {
      const vw = document.documentElement.clientWidth
      const clips = (el) => {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          if (a.matches('main, [data-mobile="root"]')) return false
          const cs = getComputedStyle(a)
          if (cs.overflowX !== 'visible') return true
        }
        return false
      }
      const visible = (el) => {
        const cs = getComputedStyle(el)
        const b = el.getBoundingClientRect()
        return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0 && b.width > 0 && b.height > 0 && !el.closest('[aria-hidden="true"], [inert]')
      }
      const escaped = []
      const small = []
      const targets = []
      for (const el of document.querySelectorAll('[data-mobile="root"] *')) {
        if (!visible(el)) continue
        const b = el.getBoundingClientRect()
        const leaf = el.matches('img, svg, a, button, input, video') || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        if (leaf && (b.left < -1 || b.right > vw + 1) && !clips(el)) escaped.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} ${Math.round(b.left)}..${Math.round(b.right)}`)
        if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
          const fs = parseFloat(getComputedStyle(el).fontSize)
          if (fs < 12) small.push(`${fs}px "${el.textContent.trim().slice(0, 24)}"`)
        }
        if (el.matches('a[href], button, input, [role="tab"]') && !el.closest('[data-motion-skip]')) {
          targets.push({ w: b.width, h: b.height, name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 24) })
        }
      }
      const sections = slugs.map((s) => {
        const el = document.querySelector(`[data-mobile="root"] [data-section="${s}"]`)
        return { s, h: el ? el.getBoundingClientRect().height : -1 }
      })
      const images = [...document.querySelectorAll('[data-mobile="root"] img')].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src'))
      return { vw, escaped, small, targets, sections, images, surface: document.querySelector('main').dataset.surface }
    }, SLUGS)
    const g = `layout ${w}`
    check(g, 'surface', r.surface === 'mobile', r.surface)
    check(g, 'escape', !r.escaped.length, r.escaped.length ? r.escaped.slice(0, 6).join('; ') : 'nothing leaves the window unclipped')
    const missing = r.sections.filter((x) => x.h <= 0)
    check(g, 'sections', !missing.length, missing.length ? `missing or empty: ${missing.map((x) => x.s).join(', ')}` : r.sections.map((x) => `${x.s} ${Math.round(x.h)}`).join(' · '))
    check(g, 'text>=12', !r.small.length, r.small.length ? r.small.slice(0, 5).join('; ') : 'all text at least 12px')
    const tiny = r.targets.filter((x) => x.w < 24 || x.h < 24)
    const under44 = r.targets.filter((x) => x.w < 44 || x.h < 44)
    check(g, 'targets>=24', !tiny.length, `${r.targets.length} controls; under 24: ${tiny.map((x) => `${x.name} ${Math.round(x.w)}x${Math.round(x.h)}`).join(', ') || 'none'}; under 44: ${under44.length}`)
    check(g, 'images', !r.images.length, r.images.length ? `not loaded: ${r.images.join(', ')}` : 'all loaded')
    check(g, 'errors', !errors.length, errors.join(' | ') || 'none')
    await page.screenshot({ path: `${OUT}/${w}.png`, fullPage: true, animations: 'disabled' })
    await ctx.close()
  }
}

// ------------------------------------------------------------ 3. modules
const files = readdirSync(at('qa/mobile')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .filter((f) => !only.length || only.includes(f.replace(/\.mjs$/, '')))
for (const f of files) {
  const slug = f.replace(/\.mjs$/, '')
  const mod = await import(pathToFileURL(at('qa/mobile', f)).href)
  for (const [mode, fn] of [['motion', mod.default], ['reduce', mod.reduced]]) {
    if (!fn) continue
    const { page, ctx, errors } = await open({ width: 390, height: 844 }, { touch: true, reduce: mode === 'reduce' })
    const t = {
      slug, mode, browser, url: BASE, sleep, out: OUT,
      section: `[data-mobile="root"] [data-section="${slug}"]`,
      check: (id, pass, detail = '') => check(`${slug} ${mode}`, id, pass, detail),
    }
    try {
      await fn(page, t)
    } catch (e) {
      t.check('module', false, `threw: ${String(e.message).split('\n')[0]}`)
    }
    for (const e of errors) t.check('pageerror', false, e)
    await ctx.close()
  }
}
await browser.close()

for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.group.padEnd(18)} ${r.id.padEnd(12)} ${r.detail}`)
const failed = results.filter((r) => !r.pass).length
console.log(`\n${results.length - failed}/${results.length} pass · shots in qa/mobile/out/`)
writeFileSync(`${OUT}/mobile.json`, JSON.stringify({ url: BASE, at: new Date().toISOString(), results }, null, 1))
process.exit(failed || !results.length ? 1 : 0)
