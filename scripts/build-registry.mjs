// Builds design/sections.json (the section registry the app and the harness
// share) and design/nodes/<slug>.json (each section's subtree, with every box
// re-based to the frame origin so it reads in canvas pixels).
//
// Geometry is REST absoluteBoundingBox, never x/y: those are pre-transform.
import { writeFileSync, mkdirSync } from 'node:fs'
import { frameTree } from './figma-api.mjs'

// Paint order = Figma child order; later entries stack above earlier ones.
// overlay: painted on top of another section, so it is captured in isolation.
// backdrop: the QA-only colour an isolated capture (and the flattened Figma
// render) sits on; white text on the default white would be invisible to a diff.
const SECTIONS = [
  { slug: 'hero', node: '94:85' },
  { slug: 'gradient', node: '94:110', overlay: true, backdrop: '#ffffff' },
  { slug: 'logos', node: '94:111' },
  { slug: 'nav', node: '94:120', overlay: true, backdrop: '#0b1722' },
  { slug: 'ribbons', node: '94:139' },
  { slug: 'programs', node: '94:156' },
  { slug: 'impact', node: '94:180' },
  { slug: 'meet', node: '94:199' },
  { slug: 'talent', node: '94:935' },
  { slug: 'community', node: '94:276' },
  { slug: 'footer', node: '94:307' },
]

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

mkdirSync('design/nodes', { recursive: true })
const sections = SECTIONS.map((s) => {
  const n = index.get(s.node)
  if (!n) throw new Error(`node ${s.node} not in frame`)
  const b = rebase(n.absoluteBoundingBox)
  const r = rebase(n.absoluteRenderBounds ?? n.absoluteBoundingBox)
  writeFileSync(`design/nodes/${s.slug}.json`, JSON.stringify(relocate(n), null, 1))
  return {
    slug: s.slug, node: s.node, name: n.name,
    x: b.x, y: b.y, w: b.width, h: b.height,
    overlay: !!s.overlay,
    backdrop: s.backdrop ?? '#ffffff',
    // The visible window inside the 1440 canvas; Figma renders a node to this
    // box, not to its bounding box, when the node overhangs the frame.
    render: { x: r.x, y: r.y, w: r.width, h: r.height },
  }
})

writeFileSync('design/sections.json', JSON.stringify({
  file: 'Mhl8szCFRd3mDfVsTCGdnG', frame: frame.id,
  canvas: { w: frame.absoluteBoundingBox.width, h: frame.absoluteBoundingBox.height },
  sections,
}, null, 2) + '\n')
console.log(sections.map((s) => `${s.slug.padEnd(10)} ${s.node.padEnd(7)} ${[s.x, s.y, s.w, s.h].map((v) => +v.toFixed(2)).join(',')}`).join('\n'))
