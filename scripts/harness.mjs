// The parity harness: the ONE place a section is captured and compared against
// Figma. scripts/capture.mjs + scripts/diff.mjs (all sections, `npm run qa`),
// scripts/check-one.mjs (one section) and scripts/shot.mjs (the builders'
// loop) all call into this file. On Social & Things the batch and single
// runners each carried a copy of the comparison, the copies drifted, and
// agents chased wrong numbers for an hour. Do not fork any of this.
//
// Coordinates: CSS px on the 1440 canvas unless a name says "device" (2x).
// Every raster here is 2x, because the Figma references are 2x renders.
//
// Gates per section:
//   geometry    every [data-node-id] element vs that node's Figma box.
//               Boxes, images, vectors: max |dx,dy,dw,dh| <= 1px. Text is
//               scored on origin (dx,dy) and size (dw,dh) separately.
//   ae          raw raster mismatch, 4% fuzz.
//   structural  both images at 1/8 of CSS scale (16x16 device cells), 12% fuzz:
//               block position, size, colour; glyph shape dissolves.
//   edge-only   difference mask eroded by 1px; what survives is thicker than
//               an antialiasing seam, i.e. a real defect.
//   ink offset  per horizontal band of the section, the sub-pixel dx/dy that
//               best registers our ink onto Figma's. A uniform 1px shift
//               produces only 1px seams, so edge-only alone calls it clean;
//               this is the guard that does not.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const at = (...p) => join(ROOT, ...p)

export const REGISTRY = JSON.parse(readFileSync(at('design/sections.json'), 'utf8'))
export const SECTIONS = REGISTRY.sections
export const CANVAS = REGISTRY.canvas
export const DPR = 2
// Wider than the canvas so a scrollbar can never pull it below scale 1.
export const VIEWPORT = { width: 1600, height: 1000 }
export const CANVAS_SEL = '[data-canvas="root"]'

export const GATES = {
  geomTol: Number(process.env.GEOM_TOL ?? 1),
  textOriginTol: Number(process.env.TEXT_ORIGIN_TOL ?? 1),
  textSizeTol: Number(process.env.TEXT_SIZE_TOL ?? 1),
  fuzz: 0.04,
  aeMax: Number(process.env.AE_MAX ?? 3),          // % of window
  // 1/8 at CSS scale, as on Social & Things (1x). At 2x an 8-device-px cell is
  // only 4 CSS px and flags per-glyph antialiasing (nav's "J" hook: 24%).
  structK: 16,
  structFuzz: 0.12,
  structMax: Number(process.env.STRUCT_MAX ?? 0.1), // % of 1/8 cells
  // Largest 8-connected cluster of failing cells. A percentage alone gets
  // weaker as the section grows: a painted 48x32 block on programs was 0.073%.
  structBlobMax: Number(process.env.STRUCT_BLOB_MAX ?? 2),
  edgeThreshold: 0.10,
  thickMax: Number(process.env.THICK_MAX ?? 0.02),  // % of window, device px
  inkTol: Number(process.env.INK_TOL ?? 0.5),       // CSS px (= 1 device px)
  inkMinCorr: 0.6,
  // NCC drop at +/-2 device px below which a band has too few edges for the
  // correlation to be determined (a ramp correlates ~1.0 at every lag); such a
  // band falls back to least squares on the profile, or is n/a.
  inkMinSharp: Number(process.env.INK_MIN_SHARP ?? 0.001),
}

// ---------------------------------------------------------------- figma side

let figmaCache
/** Every node of every section subtree, id -> box in canvas px. */
export function figmaIndex() {
  if (figmaCache) return figmaCache
  const idx = new Map()
  for (const s of SECTIONS) {
    const walk = (n, hidden) => {
      const h = hidden || n.visible === false
      const b = n.absoluteBoundingBox
      const r = n.absoluteRenderBounds
      idx.set(n.id, {
        id: n.id, slug: s.slug, name: n.name, type: n.type, hidden: h,
        box: b && { x: b.x, y: b.y, w: b.width, h: b.height },
        render: r && { x: r.x, y: r.y, w: r.width, h: r.height },
      })
      for (const c of n.children ?? []) walk(c, h)
    }
    walk(JSON.parse(readFileSync(at(`design/nodes/${s.slug}.json`), 'utf8')), false)
  }
  return (figmaCache = idx)
}

export function section(slug) {
  const s = SECTIONS.find((x) => x.slug === slug)
  if (!s) throw new Error(`unknown section "${slug}"; known: ${SECTIONS.map((x) => x.slug).join(', ')}`)
  return s
}

/**
 * The part of the section the canvas shows, in device px. The reference is a
 * render of the FULL box (gradient, logos, ribbons and impact overhang the
 * 1440 canvas); only this window is ever compared.
 */
export function deviceWindow(s) {
  const x0 = Math.max(s.x, 0), y0 = Math.max(s.y, 0)
  const x1 = Math.min(s.x + s.w, CANVAS.w), y1 = Math.min(s.y + s.h, CANVAS.h)
  const X0 = Math.round(x0 * DPR), Y0 = Math.round(y0 * DPR)
  return { X0, Y0, W: Math.round(x1 * DPR) - X0, H: Math.round(y1 * DPR) - Y0 }
}

/** Where the reference's pixel (0,0) lands if Figma did not trim it. */
export const nominalOrigin = (s) => ({ x: Math.round(s.x * DPR), y: Math.round(s.y * DPR) })

// ---------------------------------------------------------------- pixels

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))

/** Decode any image to raw 8-bit pixels via ImageMagick (PPM/PGM/PAM). */
export function readPixels(file, { flatten, alpha = false } = {}) {
  const args = [file]
  if (flatten) args.push('-background', flatten, '-alpha', 'remove', '-alpha', 'off')
  args.push('-depth', '8', alpha ? 'pam:-' : 'ppm:-')
  const buf = execFileSync('magick', args, { maxBuffer: 1 << 30 })
  if (alpha) {
    const end = buf.indexOf('ENDHDR\n') + 7
    const head = buf.subarray(0, end).toString()
    const w = +head.match(/WIDTH (\d+)/)[1], h = +head.match(/HEIGHT (\d+)/)[1]
    const depth = +head.match(/DEPTH (\d+)/)[1]
    const src = buf.subarray(end)
    const data = new Uint8Array(w * h * 4)
    for (let i = 0, j = 0; i < w * h; i++, j += depth) {
      data[i * 4] = src[j]; data[i * 4 + 1] = src[j + (depth > 2 ? 1 : 0)]
      data[i * 4 + 2] = src[j + (depth > 2 ? 2 : 0)]; data[i * 4 + 3] = depth % 2 === 0 ? src[j + depth - 1] : 255
    }
    return { w, h, c: 4, data }
  }
  let p = 0
  const tok = () => {
    while (/\s/.test(String.fromCharCode(buf[p]))) p++
    const s = p
    while (!/\s/.test(String.fromCharCode(buf[p]))) p++
    return buf.subarray(s, p).toString()
  }
  tok()
  const w = +tok(), h = +tok()
  tok()
  p++
  return { w, h, c: 3, data: new Uint8Array(buf.buffer, buf.byteOffset + p, w * h * 3) }
}

export function writePixels(img, out) {
  execFileSync('magick', ['-size', `${img.w}x${img.h}`, '-depth', '8', `${img.c === 4 ? 'rgba' : 'rgb'}:-`, out],
    { input: Buffer.from(img.data.buffer, img.data.byteOffset, img.w * img.h * img.c) })
}

const solid = (w, h, rgb) => {
  const data = new Uint8Array(w * h * 3)
  for (let i = 0; i < w * h; i++) { data[i * 3] = rgb[0]; data[i * 3 + 1] = rgb[1]; data[i * 3 + 2] = rgb[2] }
  return { w, h, c: 3, data }
}

/** Copy `src` into `dst` with src(0,0) at dst(ox,oy); anything outside is dropped. */
function blit(dst, src, ox, oy) {
  for (let y = Math.max(0, oy); y < Math.min(dst.h, oy + src.h); y++) {
    const sy = y - oy
    const x0 = Math.max(0, ox), x1 = Math.min(dst.w, ox + src.w)
    if (x1 <= x0) continue
    dst.data.set(src.data.subarray((sy * src.w + (x0 - ox)) * 3, (sy * src.w + (x1 - ox)) * 3), (y * dst.w + x0) * 3)
  }
  return dst
}

/**
 * The reference as it should appear in the section's window: flattened onto
 * the section backdrop (Figma renders onto nothing; the isolated capture sits
 * on the backdrop) and placed at nominal origin + `off` (device px). A trimmed
 * reference leaves backdrop where Figma cut its transparent margin.
 */
/**
 * The section's Figma reference. `<slug>.composed.png` wins when present: an
 * isolated render blends non-normal layers (HARD_LIGHT...) against nothing, so
 * such sections ship a reference composited onto the page backdrop instead.
 */
export const refFileFor = (s) => {
  const composed = at(`design/figma/${s.slug}.composed.png`)
  return existsSync(composed) ? composed : at(`design/figma/${s.slug}.png`)
}

export function placedRef(s, off = { x: 0, y: 0 }) {
  const win = deviceWindow(s)
  const ref = readPixels(refFileFor(s), { flatten: s.backdrop })
  const n = nominalOrigin(s)
  return blit(solid(win.W, win.H, hex(s.backdrop)), ref, n.x + off.x - win.X0, n.y + off.y - win.Y0)
}

// ---------------------------------------------------------------- ref origin

let compCache
/**
 * Where Figma put the reference, solved against Figma's OWN composite
 * (design/figma/full-1x.png), so it is independent of the build and valid
 * while a section is still a stub. Some renders are trimmed to their ink
 * (talent, meet), so the origin is never assumed. Coarse search at 1x, then
 * fine at device px: a 2x offset P samples ref pixels 2X-P and 2X-P+1 for
 * composite pixel X, so odd offsets are scored exactly, not interpolated.
 * Only opaque reference pixels vote: an overlay section has no backdrop of its
 * own, and the hero is partly covered by the gradient and nav in the composite.
 */
export function solveRefOrigin(s, { range = 48, refFile } = {}) {
  compCache ??= readPixels(at('design/figma/full-1x.png'), { flatten: '#ffffff' })
  const comp = compCache
  const ref = readPixels(refFile ?? refFileFor(s), { alpha: true })
  const n = nominalOrigin(s)

  const score = (ox, oy, stride) => {
    const Px = n.x + ox, Py = n.y + oy
    const X0 = Math.max(0, Math.ceil(Px / 2)), X1 = Math.min(comp.w, Math.floor((Px + ref.w) / 2) - 1)
    const Y0 = Math.max(0, Math.ceil(Py / 2)), Y1 = Math.min(comp.h, Math.floor((Py + ref.h) / 2) - 1)
    let sum = 0, cnt = 0
    for (let Y = Y0; Y < Y1; Y += stride) {
      const j = 2 * Y - Py
      for (let X = X0; X < X1; X += stride) {
        const i = 2 * X - Px
        const a = (j * ref.w + i) * 4, b = a + 4, c = a + ref.w * 4, d = c + 4
        const rd = ref.data
        if (rd[a + 3] < 250 || rd[b + 3] < 250 || rd[c + 3] < 250 || rd[d + 3] < 250) continue
        const k = (Y * comp.w + X) * 3
        let e = 0
        for (let ch = 0; ch < 3; ch++) {
          const v = (rd[a + ch] + rd[b + ch] + rd[c + ch] + rd[d + ch]) / 4
          e += Math.abs(v - comp.data[k + ch])
        }
        sum += Math.min(e, 96); cnt++
      }
    }
    return cnt >= 64 ? { s: sum / cnt, cnt } : { s: Infinity, cnt }
  }

  let best = { x: 0, y: 0, s: Infinity }
  const sweep = (xs, ys, stride) => {
    // Scores at different strides are not comparable: re-score the incumbent.
    if (Number.isFinite(best.s)) best = { ...best, ...(({ s, cnt }) => ({ s, cnt }))(score(best.x, best.y, stride)) }
    for (const oy of ys) for (const ox of xs) {
      const r = score(ox, oy, stride)
      if (r.s < best.s - 1e-9 || (Math.abs(r.s - best.s) < 1e-9 && Math.abs(ox) + Math.abs(oy) < Math.abs(best.x) + Math.abs(best.y))) {
        best = { x: ox, y: oy, s: r.s, cnt: r.cnt }
      }
    }
  }
  const span = (c, r, step) => { const a = []; for (let v = c - r; v <= c + r; v += step) a.push(v); return a }
  sweep(span(0, range, 4), span(0, range, 4), 6)          // coarse: every 2 CSS px
  sweep(span(best.x, 4, 1), span(best.y, 4, 1), 3)        // device px
  sweep(span(best.x, 1, 1), span(best.y, 1, 1), 1)        // confirm at full density
  const nominal = score(0, 0, 1)
  const meta = { ref: `${ref.w}x${ref.h}`, box: `${Math.round(s.w * DPR)}x${Math.round(s.h * DPR)}` }
  // A smooth gradient or a handful of opaque pixels cannot pin an origin: the
  // gradient "solved" to (+36,-5) on 480 samples. Below this, assume nominal.
  if (!Number.isFinite(best.s) || (best.cnt ?? 0) < 2000) {
    return { x: 0, y: 0, solved: false, samples: best.cnt ?? 0, ...meta,
             note: `too few opaque reference pixels on the canvas (${best.cnt ?? 0}) to solve; nominal origin assumed` }
  }
  const trim = renderTrim(s)
  // A trimmed render starts at its ink, a fractional offset into the box; the
  // solve can only land on whole device px. The node JSON knows the fraction,
  // and the snap model needs it, but only trust it where the two agree.
  const trimmed = meta.ref !== meta.box
  const tx = trimmed && Math.abs(trim.x - best.x) <= 1 ? +trim.x.toFixed(2) : best.x
  const ty = trimmed && Math.abs(trim.y - best.y) <= 1 ? +trim.y.toFixed(2) : best.y
  return { x: best.x, y: best.y, solved: true, residual: +best.s.toFixed(2), nominalResidual: +nominal.s.toFixed(2), samples: best.cnt,
           trimX: tx, trimY: ty, ...meta }
}

/** Offset (device px) of the top-left of the section's painted descendants, from REST render bounds. */
export function renderTrim(s) {
  const root = JSON.parse(readFileSync(at(`design/nodes/${s.slug}.json`), 'utf8'))
  const paints = (n) => ['fills', 'strokes'].some((k) => (n[k] ?? []).some((f) => f.visible !== false)) || (n.effects ?? []).some((e) => e.visible !== false)
  let x0 = Infinity, y0 = Infinity
  const walk = (n) => {
    if (n.visible === false) return
    const r = n.absoluteRenderBounds
    if (r && n !== root && n.type !== 'GROUP' && (n.type !== 'FRAME' || paints(n))) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y) }
    for (const c of n.children ?? []) walk(c)
  }
  walk(root)
  return Number.isFinite(x0) ? { x: (x0 - s.x) * DPR, y: (y0 - s.y) * DPR } : { x: 0, y: 0 }
}

// ---------------------------------------------------------------- capture

/** Load `?isolate=<slug>` with every image decoded and every animation frozen. */
export async function openIsolated(browser, base, slug) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DPR })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message).split('\n')[0].slice(0, 160)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().split('\n')[0].slice(0, 160)}`) })
  const url = new URL(base)
  url.searchParams.set('isolate', slug)
  await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForSelector(`[data-section="${slug}"]`, { timeout: 15_000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  // A lazy image that has never been in view never settles; walk the page once.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
      scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r))
    }
    scrollTo(0, 0)
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30_000 }).catch(() => {})
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode?.().catch(() => {}))))
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  return { page, errors }
}

/**
 * Capture one section in isolation at 2x, cropped to its device window, and
 * probe every [data-node-id] element inside it. Never throws for a broken
 * section: a builder mid-edit is the normal state, so failures come back as
 * { error } and the batch carries on.
 */
export async function captureSection(browser, base, s, outDir) {
  mkdirSync(outDir, { recursive: true })
  const win = deviceWindow(s)
  let page, errors = []
  try {
    ;({ page, errors } = await openIsolated(browser, base, s.slug))
    const geo = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      const r = el.getBoundingClientRect()
      return { left: r.left + scrollX, top: r.top + scrollY, scale: r.width / el.offsetWidth }
    }, CANVAS_SEL)
    if (Math.abs(geo.scale - 1) > 1e-6) throw new Error(`canvas renders at scale ${geo.scale}, not 1`)

    // Integer CSS superset of the window, cropped to exact device px after.
    const ox = Math.round(geo.left * DPR), oy = Math.round(geo.top * DPR)
    const cx = Math.floor((ox + win.X0) / DPR), cy = Math.floor((oy + win.Y0) / DPR)
    const cw = Math.ceil((ox + win.X0 + win.W) / DPR) - cx, ch = Math.ceil((oy + win.Y0 + win.H) / DPR) - cy
    const tmp = join(outDir, `${s.slug}.raw.png`)
    await page.screenshot({ path: tmp, fullPage: true, animations: 'disabled', caret: 'hide', clip: { x: cx, y: cy, width: cw, height: ch } })
    const shot = join(outDir, `${s.slug}.build.png`)
    execFileSync('magick', [tmp, '-crop', `${win.W}x${win.H}+${ox + win.X0 - cx * DPR}+${oy + win.Y0 - cy * DPR}`, '+repage', '-alpha', 'off', shot])

    const probe = await page.evaluate(({ sel, slug }) => {
      const root = document.querySelector(sel).getBoundingClientRect()
      const sec = document.querySelector(`[data-section="${slug}"]`)
      const top = sec.firstElementChild
      const nodes = [...sec.querySelectorAll('[data-node-id]')].map((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          id: el.getAttribute('data-node-id'), tag: el.tagName.toLowerCase(), display: cs.display,
          x: +(r.left - root.left).toFixed(3), y: +(r.top - root.top).toFixed(3),
          w: +r.width.toFixed(3), h: +r.height.toFixed(3),
        }
      })
      const broken = [...sec.querySelectorAll('img')].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'))
      // Every element that paints, tagged or not, for the paint-snap model.
      const alpha = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/)
        if (!m) return 0
        const p = m[1].split(/[\s,/]+/).filter(Boolean)
        return p.length > 3 ? parseFloat(p[3]) : 1
      }
      const paint = []
      for (const el of sec.querySelectorAll('*')) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.display === 'contents' || cs.visibility === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) continue
        const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        const content = ['img', 'svg', 'video', 'canvas'].includes(el.tagName.toLowerCase()) || cs.backgroundImage !== 'none'
        const box = alpha(cs.backgroundColor) > 0 || cs.boxShadow !== 'none' ||
          ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(cs[`border${k}Width`]) > 0 && cs[`border${k}Style`] !== 'none')
        if (!text && !content && !box) continue
        paint.push({ x: +(r.left - root.left).toFixed(3), y: +(r.top - root.top).toFixed(3), w: +r.width.toFixed(3), h: +r.height.toFixed(3),
                     ...(text ? { text: 1 } : {}), ...(content ? { content: 1 } : {}), ...(box ? { box: 1 } : {}) })
      }
      return {
        rootId: top?.getAttribute('data-node-id') ?? null,
        // The scaffold placeholder is an empty root. Not sufficient alone: the
        // gradient paints its fill on an empty root. evaluateSection also
        // requires a blank capture before calling a section a stub.
        emptyRoot: !top || (top.childElementCount === 0 && !top.textContent.trim()),
        nodes, broken, paint,
      }
    }, { sel: CANVAS_SEL, slug: s.slug })
    writeFileSync(join(outDir, `${s.slug}.probe.json`), JSON.stringify({ ...probe, errors }, null, 1))
    return { slug: s.slug, shot, probe: { ...probe, errors } }
  } catch (e) {
    return { slug: s.slug, error: String(e.message ?? e).split('\n')[0].slice(0, 200), errors }
  } finally {
    await page?.close()
  }
}

export const launch = () => chromium.launch()

// ---------------------------------------------------------------- geometry

/**
 * Score every probed element against its Figma box. Ground truth is REST
 * absoluteBoundingBox, which is post-transform and axis-aligned, exactly what
 * getBoundingClientRect returns, so rotation needs no special case. A
 * non-text node may instead match absoluteRenderBounds (a baked shadow or
 * stroke); whichever is closer wins and the row says which.
 */
export function scoreGeometry(s, probe) {
  const fig = figmaIndex()
  const rows = [], skipped = { noBox: [], notInFigma: [], otherSection: [] }
  const seen = new Map()
  for (const n of probe.nodes) seen.set(n.id, (seen.get(n.id) ?? 0) + 1)
  for (const got of probe.nodes) {
    const want = fig.get(got.id)
    if (!want) { skipped.notInFigma.push(got.id); continue }
    if (want.slug !== s.slug) skipped.otherSection.push(got.id)
    if (got.display === 'contents') { skipped.noBox.push(got.id); continue }
    const isText = want.type === 'TEXT'
    const d = (b) => ({ dx: +(got.x - b.x).toFixed(2), dy: +(got.y - b.y).toFixed(2), dw: +(got.w - b.w).toFixed(2), dh: +(got.h - b.h).toFixed(2) })
    let delta = d(want.box), against = 'box'
    const mag = (q) => Math.max(...Object.values(q).map(Math.abs))
    if (!isText && want.render) {
      const alt = d(want.render)
      if (mag(alt) < mag(delta)) { delta = alt; against = 'render' }
    }
    const origin = Math.max(Math.abs(delta.dx), Math.abs(delta.dy))
    const size = Math.max(Math.abs(delta.dw), Math.abs(delta.dh))
    const hidden = got.display === 'none' || (got.w === 0 && got.h === 0)
    const pass = !hidden && !want.hidden && (isText
      ? origin <= GATES.textOriginTol && size <= GATES.textSizeTol
      : Math.max(origin, size) <= GATES.geomTol)
    rows.push({
      id: got.id, name: want.name, type: want.type, tag: got.tag, ...delta, against,
      origin: +origin.toFixed(2), size: +size.toFixed(2), worst: +Math.max(origin, size).toFixed(2),
      ...(isText ? { originPass: origin <= GATES.textOriginTol, sizePass: size <= GATES.textSizeTol } : {}),
      ...(hidden ? { note: 'element has no rendered box' } : {}),
      ...(want.hidden ? { note: 'node is visible:false in Figma' } : {}),
      ...(seen.get(got.id) > 1 ? { duplicate: seen.get(got.id) } : {}),
      pass,
    })
  }
  const text = rows.filter((r) => r.type === 'TEXT')
  const visible = [...fig.values()].filter((n) => n.slug === s.slug && !n.hidden)
  const tagged = new Set(probe.nodes.map((n) => n.id))
  const failed = rows.filter((r) => !r.pass).sort((a, b) => b.worst - a.worst)
  return {
    checked: rows.length, passed: rows.length - failed.length,
    worst: rows.length ? Math.max(...rows.map((r) => r.worst)) : null,
    text: { checked: text.length, originFail: text.filter((r) => !r.originPass).length, sizeFail: text.filter((r) => !r.sizePass).length },
    coverage: { tagged: visible.filter((n) => tagged.has(n.id)).length, figma: visible.length },
    skipped, failed, rows,
  }
}

// ---------------------------------------------------------------- raster

/**
 * Device-px offset (dx,dy) such that build(x+dx, y+dy) best matches ref(x,y).
 * Every candidate is scored over the same inner region (a margin of the search
 * range is left out on all sides), and candidates are tried nearest-first: a
 * larger shift has to beat the incumbent by `tol` levels, so content that only
 * varies along one axis (the gradient) cannot drift to the edge of the search.
 */
export function solveShift(ref, build, range = 16, tol = 0.05) {
  const { w, h } = ref
  const m = range + 3
  if (w <= 2 * m + 8 || h <= 2 * m + 8) return { dx: 0, dy: 0, gain: 0, atEdge: false, note: 'window too small to register' }
  const score = (dx, dy, stride) => {
    let sum = 0, cnt = 0
    for (let y = m; y < h - m; y += stride) for (let x = m; x < w - m; x += stride) {
      const a = (y * w + x) * 3, b = ((y + dy) * w + x + dx) * 3
      const e = Math.abs(ref.data[a] - build.data[b]) + Math.abs(ref.data[a + 1] - build.data[b + 1]) + Math.abs(ref.data[a + 2] - build.data[b + 2])
      sum += Math.min(e, 96); cnt++
    }
    return sum / cnt
  }
  const search = (cands, stride, start) => {
    let best = { ...start, s: score(start.dx, start.dy, stride) }
    cands.sort((p, q) => Math.hypot(p.dx, p.dy) - Math.hypot(q.dx, q.dy))
    for (const c of cands) {
      const v = score(c.dx, c.dy, stride)
      if (v < best.s - tol) best = { ...c, s: v }
    }
    return best
  }
  const grid = (cx, cy, r, step) => {
    const out = []
    for (let dy = cy - r; dy <= cy + r; dy += step) for (let dx = cx - r; dx <= cx + r; dx += step) {
      if (Math.abs(dx) <= range && Math.abs(dy) <= range) out.push({ dx, dy })
    }
    return out
  }
  const coarse = search(grid(0, 0, range, 2), 4, { dx: 0, dy: 0 })
  const fine = search(grid(coarse.dx, coarse.dy, 2, 1), 2, { dx: 0, dy: 0 })
  const zero = score(0, 0, 2)
  return { dx: fine.dx, dy: fine.dy, gain: +(zero - fine.s).toFixed(3), atEdge: Math.abs(fine.dx) >= range || Math.abs(fine.dy) >= range }
}

/** Per-pixel "ink": distance from the section backdrop, 0..255. */
function inkMap(img, bg) {
  const out = new Float32Array(img.w * img.h)
  for (let i = 0; i < out.length; i++) {
    out[i] = (Math.abs(img.data[i * 3] - bg[0]) + Math.abs(img.data[i * 3 + 1] - bg[1]) + Math.abs(img.data[i * 3 + 2] - bg[2])) / 3
  }
  return out
}

/**
 * Normalised cross-correlation shift d with b[i+d] ~ a[i], refined to sub-pixel.
 * Every lag is scored over the SAME index range [max, n-max): letting the
 * range grow and shrink with d let the column a shift exposes vote at one lag
 * and not its mirror, which skewed a pure 1px shift to read 1.4px.
 */
export function bestShift(a, b, max = 16) {
  const n = a.length
  max = Math.min(max, Math.floor((n - 8) / 2))
  if (max < 1) return null
  const ncc = (d) => {
    let ma = 0, mb = 0
    const k = n - 2 * max
    for (let i = max; i < n - max; i++) { ma += a[i]; mb += b[i + d] }
    ma /= k; mb /= k
    let num = 0, na = 0, nb = 0
    for (let i = max; i < n - max; i++) {
      const va = a[i] - ma, vb = b[i + d] - mb
      num += va * vb; na += va * va; nb += vb * vb
    }
    return na > 1e-6 && nb > 1e-6 ? num / Math.sqrt(na * nb) : -Infinity
  }
  const s = new Map()
  for (let d = -max; d <= max; d++) s.set(d, ncc(d))
  // Nearest-first, and a farther lag must win by a margin: two smooth ramps
  // correlate at ~1.0 for every lag and must not wander.
  let best = { d: 0, c: s.get(0) }
  for (const d of [...s.keys()].sort((p, q) => Math.abs(p) - Math.abs(q))) {
    if (s.get(d) > best.c + 1e-4) best = { d, c: s.get(d) }
  }
  if (!Number.isFinite(best.c)) return null
  let frac = 0
  const l = s.get(best.d - 1), r = s.get(best.d + 1)
  if (Number.isFinite(l) && Number.isFinite(r)) {
    const den = l - 2 * best.c + r
    if (den < -1e-12) frac = Math.max(-0.5, Math.min(0.5, (l - r) / (2 * den)))
  }
  // Peak sharpness: how much worse a 2px mis-registration correlates. Near 0
  // means the profile has no edges (a gradient) and the shift is meaningless.
  const sharp = best.c - Math.max(s.get(best.d - 2) ?? -Infinity, s.get(best.d + 2) ?? -Infinity)
  return { d: +(best.d + frac).toFixed(2), corr: +best.c.toFixed(3), sharp: +sharp.toFixed(4), atEdge: Math.abs(best.d) === max }
}

/**
 * Least-squares shift on raw profiles, for bands too smooth for correlation:
 * NCC is blind to a ramp (a shifted ramp is the ramp plus a constant), SSD is
 * not. Returns null when the SSD curve is flat too (nothing to register).
 */
export function lsqShift(a, b, max = 16) {
  const n = a.length
  max = Math.min(max, Math.floor((n - 8) / 2))
  if (max < 1) return null
  const ssd = (d) => {
    let v = 0
    for (let i = max; i < n - max; i++) { const e = a[i] - b[i + d]; v += e * e }
    return v / (n - 2 * max)
  }
  const s = new Map()
  for (let d = -max; d <= max; d++) s.set(d, ssd(d))
  let best = { d: 0, v: s.get(0) }
  for (const d of [...s.keys()].sort((p, q) => Math.abs(p) - Math.abs(q))) {
    if (s.get(d) < best.v * (1 - 1e-4)) best = { d, v: s.get(d) }
  }
  const rise = Math.min(s.get(best.d - 2) ?? Infinity, s.get(best.d + 2) ?? Infinity) - best.v
  if (!(rise > 1e-9) || rise < 0.05 * best.v || Math.abs(best.d) === max) return null
  let frac = 0
  const l = s.get(best.d - 1), r = s.get(best.d + 1)
  if (l !== undefined && r !== undefined) {
    const den = l - 2 * best.v + r
    if (den > 1e-12) frac = Math.max(-0.5, Math.min(0.5, (l - r) / (2 * den)))
  }
  return { d: +(best.d + frac).toFixed(2), method: 'lsq' }
}

/**
 * Chromium paints at whole CSS px even at deviceScaleFactor 2: a box or text
 * whose canvas-absolute top is y paints from row 2*round(y) (verified: tops
 * 110.25 / 110.5 / 110.72 paint from device rows 220 / 222 / 222, Figma's
 * round(2y) is 221). Horizontally boxes and images snap the same way, text
 * does not (sub-pixel glyph positioning). The reference is placed at
 * round(2*s.y) device px, which adds its own half-pixel. So an edge at a
 * fractional canvas coordinate carries an offset the browser imposes, and the
 * ink gate is applied to measured minus this expectation, never to a looser
 * threshold: a real 0.5px shift at an integer y still fails.
 */
function snapItems(s, paint, origin = { x: 0, y: 0 }) {
  // Where the harness put the reference relative to where Figma's content truly
  // is: round(2*origin) + solved offset, against 2*origin + the true (possibly
  // fractional) trim.
  const dX = (Math.round(s.x * DPR) + origin.x - (s.x * DPR + (origin.trimX ?? origin.x))) / DPR
  const dY = (Math.round(s.y * DPR) + origin.y - (s.y * DPR + (origin.trimY ?? origin.y))) / DPR
  const snap = (v) => Math.round(v) - v
  const vis = (p) => Math.max(0, Math.min(CANVAS.w, p.x + p.w) - Math.max(0, p.x))
  const items = []
  for (const p of paint ?? []) {
    const vw = vis(p)
    if (!vw) continue
    if (p.text || p.content) {
      items.push({ axis: 'y', y0: p.y, y1: p.y + p.h, e: snap(p.y) - dY, w: vw, area: true })
      items.push({ axis: 'x', y0: p.y, y1: p.y + p.h, e: (p.text && !p.content ? 0 : snap(p.x)) - dX, w: p.w, area: true })
    }
    if (p.box) {
      items.push({ axis: 'y', y0: p.y, y1: p.y, e: snap(p.y) - dY, w: vw })
      items.push({ axis: 'y', y0: p.y + p.h, y1: p.y + p.h, e: snap(p.y + p.h) - dY, w: vw })
      items.push({ axis: 'x', y0: p.y, y1: p.y + p.h, e: snap(p.x) - dX, w: 2 })
      items.push({ axis: 'x', y0: p.y, y1: p.y + p.h, e: snap(p.x + p.w) - dX, w: 2 })
    }
  }
  return items
}

/** Weighted expected offset of the items overlapping canvas rows [b0, b1). */
function expectedIn(items, axis, b0, b1) {
  let sw = 0, se = 0, lo = Infinity, hi = -Infinity
  for (const it of items) {
    if (it.axis !== axis) continue
    const ov = Math.min(b1, it.y1) - Math.max(b0, it.y0)
    const inside = it.y0 === it.y1 ? it.y0 >= b0 && it.y0 < b1 : ov > 0
    if (!inside) continue
    // Edges weigh as 2 CSS px of ink; areas (text, images) by their overlap.
    const wgt = it.area ? it.w * Math.max(ov, 0) : it.w * 2
    if (!(wgt > 0)) continue
    sw += wgt; se += wgt * it.e
    lo = Math.min(lo, it.e); hi = Math.max(hi, it.e)
  }
  return sw ? { e: +(se / sw).toFixed(2), spread: +(hi - lo).toFixed(2) } : null
}

/**
 * Bands are cut from the REFERENCE (so they do not move between runs): runs of
 * inked rows separated by >= 8 blank device rows, each capped at 480 rows.
 */
function bands(refInk, w, h) {
  const inked = new Uint8Array(h)
  for (let y = 0; y < h; y++) {
    let c = 0
    for (let x = 0; x < w; x++) if (refInk[y * w + x] > 24) { c++; if (c > 1) break }
    inked[y] = c > 1 ? 1 : 0
  }
  const runs = []
  let y = 0
  while (y < h) {
    while (y < h && !inked[y]) y++
    if (y >= h) break
    let end = y, gap = 0
    for (let k = y; k < h; k++) {
      if (inked[k]) { end = k; gap = 0 } else if (++gap >= 8) break
    }
    runs.push([y, end + 1])
    y = end + 1
  }
  const out = []
  for (const [a, b] of runs) {
    const n = Math.ceil((b - a) / 480)
    for (let i = 0; i < n; i++) out.push([a + Math.round(((b - a) * i) / n), a + Math.round(((b - a) * (i + 1)) / n)])
  }
  return out
}

function inkBands(refInk, buildInk, w, h, win, items) {
  const res = []
  const measure = (a, b, inkB) => {
    if (!inkB) return { d: null, method: null }
    const r = bestShift(a, b)
    if (r && r.corr >= GATES.inkMinCorr && r.sharp >= GATES.inkMinSharp && !r.atEdge) return { d: +(r.d / DPR).toFixed(2), method: 'ncc', corr: r.corr }
    // Correlation undetermined (too little edge energy, e.g. a smooth ramp):
    // least squares on the profile, or n/a. A low correlation WITH sharp edges
    // means different content, not a shift: n/a, and structural/edge-only judge it.
    if (r && r.sharp < GATES.inkMinSharp) {
      const l = lsqShift(a, b)
      if (l) return { d: +(l.d / DPR).toFixed(2), method: 'lsq', corr: r.corr }
    }
    return { d: null, method: null, corr: r?.corr ?? null }
  }
  for (const [b0, b1] of bands(refInk, w, h)) {
    const y0 = Math.max(0, b0 - 16), y1 = Math.min(h, b1 + 16)
    const rowA = new Float64Array(y1 - y0), rowB = new Float64Array(y1 - y0)
    const colA = new Float64Array(w), colB = new Float64Array(w)
    let inkB = 0
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const a = refInk[y * w + x], b = buildInk[y * w + x]
      rowA[y - y0] += a; rowB[y - y0] += b; colA[x] += a; colB[x] += b; inkB += b
    }
    const my = measure(rowA, rowB, inkB), mx = measure(colA, colB, inkB)
    const c0 = (win.Y0 + b0) / DPR, c1 = (win.Y0 + b1) / DPR
    const ex = items ? expectedIn(items, 'x', c0, c1) : null
    const ey = items ? expectedIn(items, 'y', c0, c1) : null
    const resid = (m, e) => (m.d === null ? null : +(m.d - (e?.e ?? 0)).toFixed(2))
    res.push({
      y: +c0.toFixed(1), h: +(c1 - c0).toFixed(1),
      dx: mx.d, dy: my.d, method: { x: mx.method, y: my.method },
      expX: ex?.e ?? null, expY: ey?.e ?? null, spreadX: ex?.spread ?? null, spreadY: ey?.spread ?? null,
      resX: resid(mx, ex), resY: resid(my, ey),
      empty: inkB === 0,
    })
  }
  return res
}

const gray = (img) => {
  const out = new Uint8Array(img.w * img.h)
  for (let i = 0; i < out.length; i++) out[i] = Math.round(0.2126 * img.data[i * 3] + 0.7152 * img.data[i * 3 + 1] + 0.0722 * img.data[i * 3 + 2])
  return out
}

/**
 * Raster gates for one section. `ref` and `build` are equal-size RGB images
 * of the device window. Compared at the TRUE registration (no build-shift
 * compensation): a shifted build is a defect and must cost something.
 */
export function measureRaster(s, ref, build, { outDir, tag = s.slug, paint, origin } = {}) {
  if (ref.w !== build.w || ref.h !== build.h) throw new Error(`${tag}: ref ${ref.w}x${ref.h} vs build ${build.w}x${build.h}`)
  const { w, h } = ref
  const total = w * h
  const bg = hex(s.backdrop)
  const fuzz = GATES.fuzz * 255, edgeT = GATES.edgeThreshold * 255

  let ae = 0
  const diff = new Uint8Array(total)
  const mism = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    const dr = ref.data[i * 3] - build.data[i * 3], dg = ref.data[i * 3 + 1] - build.data[i * 3 + 1], db = ref.data[i * 3 + 2] - build.data[i * 3 + 2]
    if (Math.sqrt((dr * dr + dg * dg + db * db) / 3) > fuzz) { ae++; mism[i] = 1 }
    if (0.2126 * Math.abs(dr) + 0.7152 * Math.abs(dg) + 0.0722 * Math.abs(db) > edgeT) diff[i] = 1
  }

  // Erode by 1px (3x3): a seam up to 2 device px wide vanishes, a defect stays.
  let diffPx = 0, thickPx = 0
  const thick = new Uint8Array(total)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!diff[i]) continue
    diffPx++
    let all = 1
    for (let ky = -1; ky <= 1 && all; ky++) for (let kx = -1; kx <= 1; kx++) {
      const yy = Math.min(h - 1, Math.max(0, y + ky)), xx = Math.min(w - 1, Math.max(0, x + kx))
      if (!diff[yy * w + xx]) { all = 0; break }
    }
    if (all) { thick[i] = 1; thickPx++ }
  }

  // Structural: KxK block means, 12% fuzz.
  const K = GATES.structK, sw = Math.ceil(w / K), sh = Math.ceil(h / K)
  let structBad = 0
  const sf = GATES.structFuzz * 255
  const cellBad = new Uint8Array(sw * sh)
  for (let by = 0; by < sh; by++) for (let bx = 0; bx < sw; bx++) {
    const acc = [0, 0, 0, 0, 0, 0]
    let n = 0
    for (let y = by * K; y < Math.min(h, by * K + K); y++) for (let x = bx * K; x < Math.min(w, bx * K + K); x++) {
      const i = (y * w + x) * 3
      for (let c = 0; c < 3; c++) { acc[c] += ref.data[i + c]; acc[3 + c] += build.data[i + c] }
      n++
    }
    const d = [0, 1, 2].map((c) => (acc[c] - acc[3 + c]) / n)
    if (Math.sqrt((d[0] ** 2 + d[1] ** 2 + d[2] ** 2) / 3) > sf) { structBad++; cellBad[by * sw + bx] = 1 }
  }
  const win = deviceWindow(s)
  const blob = largestBlob(cellBad, sw, sh)
  const structBlob = blob && {
    cells: blob.n,
    // Where it is, in canvas CSS px, so a builder can go straight to it.
    at: `${blob.w * K / DPR}x${blob.h * K / DPR} at ${(win.X0 + blob.x * K) / DPR},${+((win.Y0 + blob.y * K) / DPR).toFixed(1)}`,
  }

  const refInk = inkMap(ref, bg), buildInk = inkMap(build, bg)
  const buildInkPx = buildInk.reduce((n, v) => n + (v > 24 ? 1 : 0), 0)
  const items = paint ? snapItems(s, paint, origin) : null
  const band = inkBands(refInk, buildInk, w, h, win, items)
  const expWhole = items ? { x: expectedIn(items, 'x', -1e9, 1e9), y: expectedIn(items, 'y', -1e9, 1e9) } : null
  const whole = buildInkPx
    ? { dx: bestShift(sumCols(refInk, w, h), sumCols(buildInk, w, h)), dy: bestShift(sumRows(refInk, w, h), sumRows(buildInk, w, h)) }
    : { dx: null, dy: null }
  // Registering a blank capture onto the reference measures nothing.
  const shift = buildInkPx ? solveShift(ref, build) : null

  if (outDir) {
    mkdirSync(outDir, { recursive: true })
    // Diff picture: the reference faded, red = mismatch (seam), magenta = survives erosion.
    const g = gray(ref)
    const pic = new Uint8Array(total * 3)
    for (let i = 0; i < total; i++) {
      const v = 255 - Math.round((255 - g[i]) * 0.25)
      const [r, gg, b] = thick[i] ? [230, 0, 200] : mism[i] ? [255, 40, 40] : [v, v, v]
      pic[i * 3] = r; pic[i * 3 + 1] = gg; pic[i * 3 + 2] = b
    }
    writePixels(ref, join(outDir, `${tag}.ref.png`))
    writePixels(build, join(outDir, `${tag}.build.png`))
    writePixels({ w, h, c: 3, data: pic }, join(outDir, `${tag}.diff.png`))
    execFileSync('magick', [join(outDir, `${tag}.ref.png`), join(outDir, `${tag}.build.png`), join(outDir, `${tag}.diff.png`), '+append', join(outDir, `${tag}.side.png`)])
  }

  const flagged = band.filter(bandFlagged)
  const worstBand = band.reduce((m, b) => {
    const v = Math.max(Math.abs(b.resX ?? 0), Math.abs(b.resY ?? 0))
    return v > (m?.v ?? -1) ? { ...b, v } : m
  }, null)
  return {
    window: `${w}x${h}`,
    ae: +((ae / total) * 100).toFixed(3),
    structural: +((structBad / (sw * sh)) * 100).toFixed(3),
    structBlob,
    diffPx, thickPx,
    thick: +((thickPx / total) * 100).toFixed(4),
    edgeOnly: diffPx ? +((1 - thickPx / diffPx) * 100).toFixed(1) : 100,
    // Whole-section registration, reported against the snap expectation; the
    // gate is the per-band residual, which sees the same shift band by band.
    shift: shift && { dx: shift.dx / DPR, dy: shift.dy / DPR, atEdge: shift.atEdge, gain: shift.gain,
                      expX: expWhole?.x?.e ?? null, expY: expWhole?.y?.e ?? null },
    ink: {
      whole: { dx: whole.dx && +(whole.dx.d / DPR).toFixed(2), dy: whole.dy && +(whole.dy.d / DPR).toFixed(2) },
      worst: worstBand && { y: worstBand.y, h: worstBand.h, dx: worstBand.dx, dy: worstBand.dy, expX: worstBand.expX, expY: worstBand.expY, resX: worstBand.resX, resY: worstBand.resY },
      flagged: flagged.length, bands: band,
    },
    buildBlank: buildInkPx === 0,
  }
}

/** Largest 8-connected component of set cells: size and bounding box. */
function largestBlob(m, w, h) {
  const seen = new Uint8Array(m.length)
  let best = null
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue
    const stack = [i]
    seen[i] = 1
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0
    while (stack.length) {
      const j = stack.pop(), x = j % w, y = (j - x) / w
      n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
        const xx = x + kx, yy = y + ky, k = yy * w + xx
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[k] && !seen[k]) { seen[k] = 1; stack.push(k) }
      }
    }
    if (!best || n > best.n) best = { n, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  }
  return best
}

export const bandFlagged = (b) => (b.resX !== null && Math.abs(b.resX) >= GATES.inkTol) || (b.resY !== null && Math.abs(b.resY) >= GATES.inkTol)

const sumRows = (m, w, h) => { const o = new Float64Array(h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y] += m[y * w + x]; return o }
const sumCols = (m, w, h) => { const o = new Float64Array(w); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x] += m[y * w + x]; return o }

/** Pass/fail per gate. `null` means the gate could not run. */
export function verdict(r) {
  if (r.error) return { verdict: 'ERROR', gates: {} }
  const g = {
    geometry: r.geometry ? r.geometry.failed.length === 0 && r.geometry.checked > 0 : null,
    ae: r.raster ? r.raster.ae <= GATES.aeMax : null,
    structural: r.raster ? r.raster.structural <= GATES.structMax && (r.raster.structBlob?.cells ?? 0) <= GATES.structBlobMax : null,
    edgeOnly: r.raster ? r.raster.thick <= GATES.thickMax : null,
    ink: r.raster ? (r.raster.buildBlank ? null : r.raster.ink.flagged === 0) : null,
  }
  if (r.stub) return { verdict: 'STUB', gates: g }
  const ok = Object.values(g).every((v) => v === true)
  return { verdict: ok ? 'PASS' : 'FAIL', gates: g }
}

// ---------------------------------------------------------------- one section

/** Compare an already-captured section. Shared by diff.mjs and check-one.mjs. */
export function evaluateSection(s, cap, outDir) {
  if (cap.error) return { slug: s.slug, node: s.node, error: cap.error, errors: cap.errors ?? [] }
  const origin = solveRefOrigin(s)
  const ref = placedRef(s, origin)
  const build = readPixels(cap.shot)
  const raster = measureRaster(s, ref, build, { outDir, paint: cap.probe.paint, origin })
  const geometry = scoreGeometry(s, cap.probe)
  const r = {
    slug: s.slug, node: s.node, stub: !!cap.probe.emptyRoot && raster.buildBlank, origin, raster, geometry,
    broken: cap.probe.broken, errors: cap.probe.errors,
  }
  return { ...r, ...verdict(r) }
}

// ---------------------------------------------------------------- printing

const pad = (v, n) => String(v ?? '-').padEnd(n)
export const fmtShift = (dx, dy) => (dx === null && dy === null ? 'n/a' : `${dx ?? '?'},${dy ?? '?'}`)

export function originLabel(o) {
  if (!o) return '-'
  if (!o.solved) return 'nominal?'
  return o.x || o.y ? `${o.x >= 0 ? '+' : ''}${o.x},${o.y >= 0 ? '+' : ''}${o.y}` : '0,0'
}

const pair = (x, y) => `${x ?? 'n/a'},${y ?? 'n/a'}`

export function tableRows(results) {
  const head = ['section', 'state', 'ref origin (dev px)', 'geometry pass', 'worst px', 'text origin/size fail', 'ae %', 'struct % (blob)',
    'edge-only % (thick px)', 'build shift meas / exp', 'worst band', 'ink measured dx,dy', 'ink expected (snap)', 'ink residual', 'verdict']
  const rows = results.map((r) => {
    if (r.error) return [r.slug, 'ERROR', ...Array(12).fill('-'), `ERROR: ${r.error}`]
    const g = r.geometry, x = r.raster
    const wb = x.ink.worst
    const sh = x.shift
    return [
      r.slug, r.stub ? 'STUB' : 'built', originLabel(r.origin),
      `${g.passed}/${g.checked}`, g.worst ?? '-', `${g.text.originFail}/${g.text.sizeFail} of ${g.text.checked}`,
      x.ae, `${x.structural}${x.structBlob ? ` (${x.structBlob.cells})` : ''}`, `${x.edgeOnly} (${x.thickPx})`,
      sh ? `${sh.dx},${sh.dy} / ${pair(sh.expX, sh.expY)}${sh.atEdge ? ' (search edge)' : ''}` : 'n/a (blank)',
      wb ? `y${wb.y}+${wb.h}` : 'no ink',
      wb ? pair(wb.dx, wb.dy) : '-', wb ? pair(wb.expX, wb.expY) : '-',
      wb ? pair(wb.resX, wb.resY) + (x.ink.flagged ? ` [${x.ink.flagged}/${x.ink.bands.length} bands >= ${GATES.inkTol}]` : '') : '-',
      r.verdict + (r.verdict === 'FAIL' ? ` (${Object.entries(r.gates).filter(([, v]) => v === false).map(([k]) => k).join(', ')})` : ''),
    ]
  })
  return { head, rows }
}

export function printConsole(results) {
  const { head, rows } = tableRows(results)
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)) + 2)
  console.log(head.map((h, i) => pad(h, widths[i])).join(''))
  for (const r of rows) console.log(r.map((c, i) => pad(c, widths[i])).join(''))
}

export function offenders(r, n = 8) {
  if (!r.geometry) return []
  return r.geometry.failed.slice(0, n).map((f) =>
    `${f.id} ${f.type} "${String(f.name).replace(/\u2014/g, '-').slice(0, 40)}" dx=${f.dx} dy=${f.dy} dw=${f.dw} dh=${f.dh}` +
    (f.type === 'TEXT' ? ` (origin ${f.originPass ? 'ok' : 'FAIL'}, size ${f.sizePass ? 'ok' : 'FAIL'})` : '') +
    (f.against === 'render' ? ' [vs render bounds]' : '') + (f.note ? ` [${f.note}]` : ''))
}

// ---------------------------------------------------------------- report

export function writeReport(results, { url, out = at('qa') } = {}) {
  const { head, rows } = tableRows(results)
  const esc = (v) => String(v).replace(/\|/g, '\\|')
  const L = []
  L.push('# GLL parity report', '')
  L.push(`Build: ${url} · captured ${new Date().toISOString()} · ${DPR}x, each section isolated (\`?isolate=<slug>\`) on its backdrop.`)
  L.push(`Verdicts: ${['PASS', 'FAIL', 'STUB', 'ERROR'].map((v) => `${results.filter((r) => r.verdict === v).length} ${v}`).join(', ')}.`, '')
  L.push('| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|')
  for (const r of rows) L.push('| ' + r.map(esc).join(' | ') + ' |')
  L.push('')
  L.push('Gates: geometry boxes/images/vectors max |dx,dy,dw,dh| <= ' + GATES.geomTol + 'px; text origin <= ' + GATES.textOriginTol +
    'px and text size <= ' + GATES.textSizeTol + 'px, scored separately. ae <= ' + GATES.aeMax + '% (4% fuzz). structural <= ' +
    GATES.structMax + '% of 8 CSS px cells (12% fuzz) and no contiguous cluster over ' + GATES.structBlobMax + ' cells. edge-only: px surviving a 1px erosion of the 10% difference mask <= ' + GATES.thickMax +
    '% of the window. ink: in every band, |measured - expected| < ' + GATES.inkTol + ' CSS px on both axes.')
  L.push('`ref origin` is where Figma put its (possibly trimmed) render relative to the node box, in device px, solved against Figma\'s own composite; non-zero means the render is trimmed, so the old assumed-origin diff was misregistered. `build shift` is the best whole-section registration of our capture onto that reference, shown against the snap expectation. Raster gates are measured at the true registration, never at the best one.')
  L.push('`ink expected (snap)` is the offset Chromium itself imposes: it paints boxes, images and text at round(y) of the canvas-absolute coordinate (whole CSS px, even at 2x; horizontally boxes and images only, text is sub-pixel), while the reference sits at round(2*section origin) device px. Expected = round(y) - y minus that placement, averaged over the painted elements in the band (edges weigh 2 px of ink, text and images their area). The gate is the residual. `worst band` is the band with the largest residual; ink figures are CSS px, ours minus Figma\'s; n/a = not measurable (no ink, or no edges and a flat least-squares fit).', '')
  for (const r of results) {
    const notes = []
    if (r.error) notes.push(`capture failed: ${r.error}`)
    if (r.stub) notes.push('STUB: the section root is empty (scaffold placeholder); the raster numbers compare Figma against a blank backdrop.')
    if (r.origin && (r.origin.x || r.origin.y)) notes.push(`reference is trimmed: ${r.origin.ref} vs box ${r.origin.box}; its origin solves to +${r.origin.x},+${r.origin.y} device px against Figma's composite (residual ${r.origin.residual} vs ${r.origin.nominalResidual} at nominal); the node render bounds put it at +${r.origin.trimX},+${r.origin.trimY}, which the snap expectation uses.`)
    if (r.origin && !r.origin.solved) notes.push(`reference origin: ${r.origin.note}.`)
    if (r.geometry) {
      const g = r.geometry
      notes.push(`coverage: ${g.coverage.tagged}/${g.coverage.figma} visible Figma nodes carry a data-node-id.`)
      if (g.skipped.notInFigma.length) notes.push(`ids not in the Figma frame: ${g.skipped.notInFigma.slice(0, 8).join(', ')}`)
      if (g.skipped.otherSection.length) notes.push(`ids owned by another section: ${g.skipped.otherSection.slice(0, 8).join(', ')}`)
    }
    if (r.raster?.structBlob && r.raster.structBlob.cells > GATES.structBlobMax) notes.push(`structural: largest block of differing 8px cells is ${r.raster.structBlob.cells} cells, ${r.raster.structBlob.at} (canvas CSS px).`)
    if (r.raster?.ink.flagged) {
      const bad = (v) => v !== null && Math.abs(v) >= GATES.inkTol
      const f = r.raster.ink.bands.filter(bandFlagged)
      // Chromium places the baseline at round(ascent)+floor(half-leading), Figma
      // at the rounded exact value: a lone vertical residual of about 1px on a
      // text band is that. Still reported, still failing; labelled so nobody
      // chases it as a layout bug.
      const label = (b) => (!bad(b.resX) && Math.abs(b.resY) <= 1.1 ? ' (vertical only, <=1px: likely baseline rounding)' : '')
      notes.push(`ink off in ${f.length} band(s), measured / expected / residual (CSS px): ` + f.slice(0, 8).map((b) =>
        `y${b.y}+${b.h} dx ${b.dx ?? 'n/a'} / ${b.expX ?? 'n/a'} / ${b.resX ?? 'n/a'}, dy ${b.dy ?? 'n/a'} / ${b.expY ?? 'n/a'} / ${b.resY ?? 'n/a'}${label(b)}`).join('; '))
    }
    const mixed = (r.raster?.ink.bands ?? []).filter((b) => (b.spreadY ?? 0) >= 0.5 || (b.spreadX ?? 0) >= 0.5)
    if (mixed.length) notes.push(`snap expectation is mixed (elements with different fractional offsets) in ${mixed.length} band(s): ` + mixed.slice(0, 4).map((b) => `y${b.y} spread dx ${b.spreadX} dy ${b.spreadY}`).join('; '))
    const lsq = (r.raster?.ink.bands ?? []).filter((b) => b.method.x === 'lsq' || b.method.y === 'lsq')
    if (lsq.length) notes.push(`least-squares fallback (too few edges for correlation) in ${lsq.length} band(s): ` + lsq.slice(0, 4).map((b) => `y${b.y}${b.method.x === 'lsq' ? ' dx' : ''}${b.method.y === 'lsq' ? ' dy' : ''}`).join('; '))
    if (r.broken?.length) notes.push(`broken images: ${r.broken.join(', ')}`)
    if (r.errors?.length) notes.push(`page errors: ${r.errors.slice(0, 3).join(' / ')}`)
    const off = offenders(r)
    if (!notes.length && !off.length) continue
    L.push(`## ${r.slug} (${r.node})`, '')
    for (const n of notes) L.push(`- ${n}`)
    if (off.length) {
      L.push(`- worst geometry offenders (${r.geometry.failed.length} failing):`)
      for (const o of off) L.push(`  - ${o}`)
    }
    L.push('')
  }
  L.push('Images: `qa/cmp/<slug>.side.png` (Figma | build | diff; red = mismatch, magenta = survives the 1px erosion).')
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'report.md'), L.join('\n') + '\n')
  writeFileSync(join(out, 'report.json'), JSON.stringify({ url, at: new Date().toISOString(), gates: GATES, dpr: DPR, results }, null, 1) + '\n')
}
