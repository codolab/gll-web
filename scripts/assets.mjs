// Asset export for section builders. Writes into public/assets/<slug>/.
//
//   node scripts/assets.mjs render <slug> <node>=<name> ... [--format=png|svg|jpg] [--scale=2]
//     Figma renders the node itself: crop, image filters, corner radius,
//     masks and blend all baked in. Right for childless image/vector nodes.
//     PNG output is re-encoded to WebP (alpha kept) to keep the bundle small.
//
//   node scripts/assets.mjs fill <slug> <node>=<name> ...
//     Bakes a node's IMAGE fill from the original source file at 2x its box:
//     STRETCH ("Crop" mode) via imageTransform, FILL via a centred cover crop,
//     so the result has exactly the box's aspect and object-cover is a no-op.
//     Right for frames that carry an image fill AND children. Image filters
//     (exposure, contrast...) are NOT applied; the command says when they exist.
//     --box=<w>x<h> bakes for that box instead: the node's own crop, centre-cut
//     to the box's aspect. The node may be in any section.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { figma, download, FILE_KEY } from './figma-api.mjs'
import { CONF } from './surface.mjs'

const [mode, slug, ...rest] = process.argv.slice(2)
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')))
const pairs = rest.filter((a) => !a.startsWith('--')).map((a) => a.split('='))
if (!['render', 'fill'].includes(mode) || !slug || !pairs.length) {
  console.error('usage: assets.mjs render|fill <slug> <node>=<name> ...'); process.exit(1)
}
const dir = `public/assets/${slug}`
mkdirSync(dir, { recursive: true })

const index = new Map()
for (const f of mode === 'fill' ? readdirSync(`${CONF.dir}/nodes`).map((f) => `${CONF.dir}/nodes/${f}`) : [`${CONF.dir}/nodes/${slug}.json`]) {
  const walk = (n) => { index.set(n.id, n); (n.children ?? []).forEach(walk) }
  walk(JSON.parse(readFileSync(f, 'utf8')))
}

if (mode === 'render') {
  const format = flags.format ?? 'png'
  const scale = flags.scale ?? '2'
  const ids = pairs.map(([id]) => id).join(',')
  const q = format === 'svg' ? `format=svg&svg_outline_text=false` : `format=${format}&scale=${scale}`
  const { images } = await figma(`/v1/images/${FILE_KEY}?ids=${ids}&${q}`)
  for (const [id, name] of pairs) {
    if (!images[id]) { console.error(`no render for ${id}`); continue }
    if (format === 'png') {
      const tmp = `${dir}/${name}.png`
      await download(images[id], tmp)
      execFileSync('magick', [tmp, '-quality', '90', '-define', 'webp:alpha-quality=100', `${dir}/${name}.webp`])
      unlinkSync(tmp)
      console.log(`/assets/${slug}/${name}.webp`)
    } else {
      await download(images[id], `${dir}/${name}.${format}`)
      console.log(`/assets/${slug}/${name}.${format}`)
    }
  }
}

if (mode === 'fill') {
  for (const [id, name] of pairs) {
    const n = index.get(id)
    if (!n) throw new Error(`${id} is not in ${CONF.dir}/nodes/`)
    const fill = (n.fills ?? []).find((f) => f.type === 'IMAGE' && f.visible !== false)
    if (!fill) throw new Error(`${id} has no visible IMAGE fill`)
    const src = `design/fills/${fill.imageRef}`
    if (!existsSync(src)) throw new Error(`${src} missing - run scripts/fetch-refs.mjs`)
    const [sw, sh] = execFileSync('magick', ['identify', '-format', '%w %h', src + '[0]']).toString().split(' ').map(Number)
    const [bw, bh] = flags.box?.split('x').map(Number) ?? [n.absoluteBoundingBox.width, n.absoluteBoundingBox.height]
    const box = { width: bw, height: bh }
    let crop
    if (fill.imageTransform) {
      const [[a, b, tx], [c, d, ty]] = fill.imageTransform
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => [a * u + b * v + tx, c * u + d * v + ty])
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      crop = { l: Math.min(...xs) * sw, t: Math.min(...ys) * sh, w: (Math.max(...xs) - Math.min(...xs)) * sw, h: (Math.max(...ys) - Math.min(...ys)) * sh }
    } else if (fill.scaleMode === 'FILL' || !fill.scaleMode) {
      const own = n.absoluteBoundingBox, s = Math.max(own.width / sw, own.height / sh)
      const w = own.width / s, h = own.height / s
      crop = { l: (sw - w) / 2, t: (sh - h) / 2, w, h }
    } else {
      throw new Error(`${id}: scaleMode ${fill.scaleMode} - handle it by hand (FIT = object-contain on the source)`)
    }
    if (flags.box) {
      const w = Math.min(crop.w, crop.h * bw / bh), h = Math.min(crop.h, crop.w * bh / bw)
      crop = { l: crop.l + (crop.w - w) / 2, t: crop.t + (crop.h - h) / 2, w, h }
    }
    // Sub-pixel crop: rounding the crop to whole source pixels drifted the footer
    // photo up to 0.63 CSS px, so map the exact crop rect onto the output instead.
    const ow = Math.round(box.width * 2), oh = Math.round(box.height * 2)
    const { l, t, w, h } = crop
    const geom = `${w.toFixed(3)}x${h.toFixed(3)}+${l.toFixed(3)}+${t.toFixed(3)}`
    execFileSync('magick', [src + '[0]', '-filter', 'Lanczos', '-virtual-pixel', 'edge', '-define', `distort:viewport=${ow}x${oh}+0+0`,
      '-distort', 'Affine', `${l},${t} 0,0  ${l + w},${t} ${ow},0  ${l},${t + h} 0,${oh}`,
      '+repage', '-quality', '88', `${dir}/${name}.webp`])
    const warn = fill.filters ? `  WARNING: fill has filters ${JSON.stringify(fill.filters)} - not applied` : ''
    console.log(`/assets/${slug}/${name}.webp  (crop ${geom} of ${sw}x${sh})${warn}`)
  }
}
