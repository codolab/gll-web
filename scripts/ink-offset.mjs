// How far our ink sits from Figma's inside one region, sub-pixel.
//   node scripts/ink-offset.mjs <slug> [x y w h] [--dir qa/one|qa/cmp]
// Region is in CANVAS CSS px (as Figma reports boxes). Reads <dir>/<slug>.ref.png
// and .build.png written by check-one.mjs (default) or `npm run qa` (qa/cmp).
// Uses harness.mjs's bestShift.
import { existsSync } from 'node:fs'
import { at, section, deviceWindow, readPixels, bestShift, DPR } from './harness.mjs'

const args = process.argv.slice(2)
const di = args.indexOf('--dir')
const dir = di > -1 ? args.splice(di, 2)[1] : 'qa/one'
const [slug, ...reg] = args
const s = section(slug)
const refF = at(dir, `${slug}.ref.png`)
const buildF = at(dir, `${slug}.build.png`)
for (const f of [refF, buildF]) if (!existsSync(f)) { console.error(`missing ${f}; run node scripts/check-one.mjs ${slug}`); process.exit(2) }

const win = deviceWindow(s)
const A = readPixels(refF), B = readPixels(buildF)
let [x, y, w, h] = reg.length === 4 ? reg.map(Number) : [win.X0 / DPR, win.Y0 / DPR, win.W / DPR, win.H / DPR]
const X0 = Math.max(0, Math.round(x * DPR) - win.X0), Y0 = Math.max(0, Math.round(y * DPR) - win.Y0)
const X1 = Math.min(win.W, Math.round((x + w) * DPR) - win.X0), Y1 = Math.min(win.H, Math.round((y + h) * DPR) - win.Y0)
const bg = [1, 3, 5].map((i) => parseInt(s.backdrop.slice(i, i + 2), 16))
const ink = (img, i) => (Math.abs(img.data[i] - bg[0]) + Math.abs(img.data[i + 1] - bg[1]) + Math.abs(img.data[i + 2] - bg[2])) / 3
const rows = [new Float64Array(Y1 - Y0), new Float64Array(Y1 - Y0)], cols = [new Float64Array(X1 - X0), new Float64Array(X1 - X0)]
for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) {
  const i = (yy * win.W + xx) * 3
  const a = ink(A, i), b = ink(B, i)
  rows[0][yy - Y0] += a; rows[1][yy - Y0] += b; cols[0][xx - X0] += a; cols[1][xx - X0] += b
}
const dy = bestShift(rows[0], rows[1], 40), dx = bestShift(cols[0], cols[1], 40)
const css = (r) => (r ? `${r.d / DPR > 0 ? '+' : ''}${+(r.d / DPR).toFixed(2)} CSS px (corr ${r.corr}${r.atEdge ? ', at search edge' : ''})` : 'n/a (no ink)')
console.log(`${slug}  region ${+w.toFixed(2)}x${+h.toFixed(2)} at ${+x.toFixed(2)},${+y.toFixed(2)}`)
console.log(`  our ink sits dx = ${css(dx)}`)
console.log(`  our ink sits dy = ${css(dy)}`)
