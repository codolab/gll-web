// One section, straight off a running server, with exactly the maths of
// `npm run qa` (both call scripts/harness.mjs; never fork the comparison).
//   node scripts/check-one.mjs <slug> [url]        default url: dev server :4196
// Writes qa/one/<slug>.{ref,build,diff,side}.png and qa/one/<slug>.json.
import { writeFileSync } from 'node:fs'
import { at, section, launch, captureSection, evaluateSection, printConsole, offenders, bandFlagged, GATES } from './harness.mjs'

const [slug, base = process.env.URL ?? 'http://localhost:4196/'] = process.argv.slice(2)
if (!slug) { console.error('usage: node scripts/check-one.mjs <slug> [url]'); process.exit(2) }
const s = section(slug)
const out = at('qa/one')

const browser = await launch()
const cap = await captureSection(browser, base, s, out)
await browser.close()
const r = evaluateSection(s, cap, out)
writeFileSync(`${out}/${slug}.json`, JSON.stringify(r, null, 1))

printConsole([r])
if (r.error) process.exit(1)
const o = r.origin
if (o.x || o.y) console.log(`ref origin: Figma's render is trimmed (${o.ref} vs box ${o.box}); it sits at +${o.x},+${o.y} device px and is compared there.`)
const x = r.raster
if (x.structBlob) console.log(`structural: largest block of differing 8px cells: ${x.structBlob.cells} cells, ${x.structBlob.at} (canvas CSS px)`)
console.log(`ink per band, CSS px, ours minus Figma's: measured / expected from paint snapping / residual (gate: |residual| < ${GATES.inkTol})`)
for (const b of x.ink.bands) {
  const f = (m, e, res, meth) => `${String(m ?? 'n/a').padStart(5)} / ${String(e ?? '-').padStart(5)} / ${String(res ?? 'n/a').padStart(5)}${meth === 'lsq' ? ' lsq' : '    '}`
  console.log(`  y ${String(b.y).padStart(7)} h ${String(b.h).padStart(6)}  dx ${f(b.dx, b.expX, b.resX, b.method.x)}  dy ${f(b.dy, b.expY, b.resY, b.method.y)}` +
    `${b.empty ? '  (our band is empty)' : ''}${bandFlagged(b) ? '  <- off' : ''}`)
}
const off = offenders(r, 15)
if (off.length) { console.log(`geometry offenders (${r.geometry.failed.length}):`); for (const l of off) console.log(`  ${l}`) }
console.log(`images: qa/one/${slug}.side.png (Figma | build | diff; red = mismatch, magenta = survives 1px erosion)`)
