// Downloads the parity baseline: one 2x Figma render per registry section into
// design/figma/<slug>.png, plus every source image fill into design/fills/,
// and the frame at 1x (full-1x.png) the harness solves trimmed origins against.
// SURFACE=wide does the same under design/wide/ (scripts/surface.mjs).
// Resumable: anything already on disk is skipped.
//
// A section of loose layers (`nodes`) has no single node to render, so each
// layer is rendered alone into figma/parts/ and composited in paint order onto
// the section box. A layer's render covers its bounding box, unless Figma
// trimmed it to its ink (groups, text): then it starts at the top-left of its
// painted descendants' render bounds. Figma exports on the absolute 2x pixel
// grid, so a layer lands at round(2*origin) - round(2*section): placed at
// round(2*(origin - section)) instead, the talent group sat 1 device px low and
// ae rose 2.10 -> 2.17. <slug>.parts.json records each layer's origin and
// placement, so the harness's snap model can treat each layer as its own render.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { figma, download, FILE_KEY, FRAME } from './figma-api.mjs'
import { CONF } from './surface.mjs'

const D = CONF.dir
const { sections } = JSON.parse(readFileSync(`${D}/sections.json`, 'utf8'))
mkdirSync(`${D}/figma/parts`, { recursive: true })
mkdirSync('design/fills', { recursive: true })

/** Render nodes at 2x into files, in small batches: one call for everything hung for minutes. */
async function render(jobs) {
  const todo = jobs.filter((j) => !existsSync(j.out))
  for (let i = 0; i < todo.length; i += 3) {
    const batch = todo.slice(i, i + 3)
    const { images } = await figma(`/v1/images/${FILE_KEY}?ids=${batch.map((j) => j.id).join(',')}&scale=2&format=png`)
    for (const j of batch) await download(images[j.id], j.out)
  }
}

const size = (f) => execFileSync('magick', ['identify', '-format', '%w %h', f]).toString().split(' ').map(Number)

/** Top-left of a node's ink: its painted descendants' render bounds (as harness.renderTrim). */
function inkOrigin(n) {
  const paints = (m) => ['fills', 'strokes'].some((k) => (m[k] ?? []).some((f) => f.visible !== false)) || (m.effects ?? []).some((e) => e.visible !== false)
  let x = Infinity, y = Infinity
  const walk = (m) => {
    if (m.visible === false) return
    const r = m.absoluteRenderBounds
    if (r && m.type !== 'GROUP' && (m.type !== 'FRAME' || paints(m))) { x = Math.min(x, r.x); y = Math.min(y, r.y) }
    for (const c of m.children ?? []) walk(c)
  }
  walk(n)
  return { x, y }
}

const only = process.argv.slice(2)
const wanted = sections.filter((s) => (!only.length || only.includes(s.slug)) && !existsSync(`${D}/figma/${s.slug}.png`))

await render(wanted.filter((s) => !s.nodes).map((s) => ({ id: s.node, out: `${D}/figma/${s.slug}.png` })))
for (const s of wanted.filter((s) => !s.nodes)) console.log('ref', s.slug)

for (const s of wanted.filter((s) => s.nodes)) {
  const root = JSON.parse(readFileSync(`${D}/nodes/${s.slug}.json`, 'utf8'))
  const part = (id) => `${D}/figma/parts/${id.replace(':', '-')}.png`
  await render(s.nodes.map((id) => ({ id, out: part(id) })))
  const args = ['-size', `${Math.round(s.w * 2)}x${Math.round(s.h * 2)}`, 'xc:none']
  const parts = []
  for (const n of root.children) {
    const [w, h] = size(part(n.id))
    const b = n.absoluteBoundingBox
    const full = Math.abs(w - b.width * 2) <= 1.5 && Math.abs(h - b.height * 2) <= 1.5
    const o = full ? b : inkOrigin(n)
    const dx = Math.round(o.x * 2) - Math.round(s.x * 2), dy = Math.round(o.y * 2) - Math.round(s.y * 2)
    parts.push({ id: n.id, x: o.x, y: o.y, box: { x: b.x, y: b.y, w: b.width, h: b.height }, dx, dy })
    args.push(part(n.id), '-geometry', `${dx >= 0 ? '+' : ''}${dx}${dy >= 0 ? '+' : ''}${dy}`, '-composite')
    console.log(`  ${s.slug} ${n.id} ${full ? 'box' : 'ink'} at ${dx},${dy}`)
  }
  execFileSync('magick', [...args, '-depth', '8', `${D}/figma/${s.slug}.png`])
  writeFileSync(`${D}/figma/${s.slug}.parts.json`, JSON.stringify(parts, null, 1) + '\n')
  console.log('ref', s.slug, `(composite of ${s.nodes.length})`)
}

if (!existsSync(`${D}/figma/full-1x.png`)) {
  const { images } = await figma(`/v1/images/${FILE_KEY}?ids=${FRAME}&scale=1&format=png`)
  await download(images[FRAME], `${D}/figma/full-1x.png`)
  console.log('frame 1x')
}

if (!only.length) {
  const fills = await figma(`/v1/files/${FILE_KEY}/images`)
  for (const [ref, url] of Object.entries(fills.meta.images)) {
    if (!url || existsSync(`design/fills/${ref}`)) continue
    await download(url, `design/fills/${ref}`)
  }
  console.log('fills', Object.keys(fills.meta.images).length)
}
