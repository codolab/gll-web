// Builds design/sections.json (the section registry the app and the harness
// share) and design/nodes/<slug>.json (each section's subtree, with every box
// re-based to the frame origin so it reads in canvas pixels). SURFACE=wide
// writes the same under design/wide/ (scripts/surface.mjs).
//
// Geometry is REST absoluteBoundingBox, never x/y: those are pre-transform.
import { writeFileSync, mkdirSync } from 'node:fs'
import { frameTree } from './figma-api.mjs'
import { CONF } from './surface.mjs'

// Paint order = Figma child order; later entries stack above earlier ones.
// overlay: painted on top of another section, so it is captured in isolation.
// backdrop: the QA-only colour an isolated capture (and the flattened Figma
// render) sits on; white text on the default white would be invisible to a diff.
// The section lists live in scripts/surface.mjs, one per SURFACE.
const SECTIONS = CONF.sections

const frame = await frameTree()
const ox = frame.absoluteBoundingBox.x
const oy = frame.absoluteBoundingBox.y

const index = new Map()
const walk = (n) => { index.set(n.id, n); (n.children ?? []).forEach(walk) }
walk(frame)

const rebase = (b) => b && { x: b.x - ox, y: b.y - oy, width: b.width, height: b.height }
function relocate(n) {
  const out = { ...n }
  if (n.absoluteBoundingBox) out.absoluteBoundingBox = rebase(n.absoluteBoundingBox)
  if (n.absoluteRenderBounds) out.absoluteRenderBounds = rebase(n.absoluteRenderBounds)
  if (n.children) out.children = n.children.map(relocate)
  return out
}

const union = (boxes) => {
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y))
  return { x, y, width: Math.max(...boxes.map((b) => b.x + b.width)) - x, height: Math.max(...boxes.map((b) => b.y + b.height)) - y }
}
const clip = (b) => {
  const fw = frame.absoluteBoundingBox.width, fh = frame.absoluteBoundingBox.height
  const x = Math.max(b.x, 0), y = Math.max(b.y, 0)
  return { x, y, width: Math.min(b.x + b.width, fw) - x, height: Math.min(b.y + b.height, fh) - y }
}

/** A band of loose layers as one subtree: a synthetic GROUP over its nodes. */
function composite(s) {
  const kids = s.nodes.map((id) => {
    const n = index.get(id)
    if (!n) throw new Error(`node ${id} not in frame`)
    return n
  })
  const box = s.box ? index.get(s.box).absoluteBoundingBox : union(kids.map((n) => n.absoluteBoundingBox))
  return {
    id: `wide:${s.slug}`, name: `${s.slug} (loose layers ${s.nodes.join(', ')})`, type: 'GROUP', synthetic: true,
    absoluteBoundingBox: box, absoluteRenderBounds: box, children: kids,
  }
}

mkdirSync(`${CONF.dir}/nodes`, { recursive: true })
const sections = SECTIONS.map((s) => {
  const n = s.nodes ? composite(s) : index.get(s.node)
  if (!n) throw new Error(`node ${s.node} not in frame`)
  const b = rebase(n.absoluteBoundingBox)
  const r = rebase(n.absoluteRenderBounds ?? n.absoluteBoundingBox)
  writeFileSync(`${CONF.dir}/nodes/${s.slug}.json`, JSON.stringify(relocate(n), null, 1))
  return {
    slug: s.slug, node: n.id, name: n.name,
    ...(s.nodes && { nodes: s.nodes }),
    x: b.x, y: b.y, w: b.width, h: b.height,
    overlay: !!s.overlay,
    backdrop: s.backdrop ?? '#ffffff',
    // The visible window inside the canvas; Figma renders a node to this
    // box, not to its bounding box, when the node overhangs the frame.
    render: s.nodes ? (({ x, y, width, height }) => ({ x, y, w: width, h: height }))(clip(r)) : { x: r.x, y: r.y, w: r.width, h: r.height },
  }
})

writeFileSync(`${CONF.dir}/sections.json`, JSON.stringify({
  file: 'Mhl8szCFRd3mDfVsTCGdnG', frame: frame.id,
  canvas: { w: frame.absoluteBoundingBox.width, h: frame.absoluteBoundingBox.height },
  sections,
}, null, 2) + '\n')
console.log(sections.map((s) => `${s.slug.padEnd(10)} ${s.node.padEnd(7)} ${[s.x, s.y, s.w, s.h].map((v) => +v.toFixed(2)).join(',')}`).join('\n'))
