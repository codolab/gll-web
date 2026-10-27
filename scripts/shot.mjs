// Builder's quick loop: capture one section in isolation at 2x and put it next
// to the Figma render.  node scripts/shot.mjs <slug> [url]
// Writes qa/one/<slug>.build.png, qa/one/<slug>.ref.png (the same visible
// window cut from the render) and qa/one/<slug>.side.png (ref | build | diff).
// The rigorous gates live in the harness; this is for looking.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const [slug, base = 'http://localhost:4196/'] = process.argv.slice(2)
const { sections, canvas } = JSON.parse(readFileSync('design/sections.json', 'utf8'))
const s = sections.find((x) => x.slug === slug)
if (!s) throw new Error(`unknown slug ${slug}`)
mkdirSync('qa/one', { recursive: true })

// The part of the section the 1440 canvas actually shows.
const vx = Math.max(s.x, 0), vy = Math.max(s.y, 0)
const vw = Math.min(s.x + s.w, canvas.w) - vx, vh = Math.min(s.y + s.h, canvas.h) - vy

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
await page.goto(`${base}?isolate=${slug}`, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 })
const origin = await page.evaluate(() => {
  const r = document.querySelector('[data-canvas="root"]').getBoundingClientRect()
  return { x: r.x + scrollX, y: r.y + scrollY }
})
await page.setViewportSize({ width: 1600, height: Math.ceil(origin.y + vy + vh + 10) })
const out = `qa/one/${slug}`
await page.screenshot({ path: `${out}.build.png`, clip: { x: origin.x + vx, y: origin.y + vy, width: vw, height: vh } })
await browser.close()

const [rw, rh] = execFileSync('magick', ['identify', '-format', '%w %h', `design/figma/${slug}.png`]).toString().split(' ').map(Number)
const expect = [Math.round(s.w * 2), Math.round(s.h * 2)]
const exact = Math.abs(rw - expect[0]) <= 1 && Math.abs(rh - expect[1]) <= 1
const geom = `${Math.round(vw * 2)}x${Math.round(vh * 2)}+${Math.round((vx - s.x) * 2)}+${Math.round((vy - s.y) * 2)}`
execFileSync('magick', [`design/figma/${slug}.png`, '-background', s.backdrop, '-alpha', 'remove', '-crop', geom, '+repage', `${out}.ref.png`])
let ae = 'n/a'
try {
  execFileSync('magick', ['compare', '-metric', 'AE', '-fuzz', '10%', `${out}.ref.png`, `${out}.build.png`, `${out}.diff.png`], { stdio: 'pipe' })
  ae = '0'
} catch (e) { ae = e.stderr.toString().trim().split(' ')[0] }
execFileSync('magick', [`${out}.ref.png`, `${out}.build.png`, `${out}.diff.png`, '+append', `${out}.side.png`])
const px = Math.round(vw * 2) * Math.round(vh * 2)
console.log(`${slug}: ref ${rw}x${rh} (box ${expect.join('x')}${exact ? '' : ', NOT the box: render is trimmed, the diff below is misregistered'}) · mismatch ${ae} px = ${(100 * Number(ae) / px).toFixed(2)}% · ${out}.side.png`)
