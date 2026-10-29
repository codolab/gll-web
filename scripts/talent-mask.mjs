// The talent photo's outline and the corner fills for its loops (motion-spec M-05).
//   node scripts/talent-mask.mjs   prints BLOB, FILLS and CORNERS for src/sections/Talent.tsx
//
// Figma's photo outline (94:265 fillGeometry, below) is drawn for "2 selected": its
// right side is cut round the 2 loop. The resting outline has to be the same for
// every number, so it keeps Figma's three petals and its notches under 1 and beside
// 4, gives 2 and 3 the notch under 1 (their circles are the same size, so it is
// turned onto them), and closes the shape with a fourth petal: the top-left one,
// turned 180deg and stretched along its chord to span the wider gap there.
//
// A selected loop's white band crosses the petal ahead of it and leaves a spike of
// photo where it meets the next number's notch. That corner is rounded with an arc
// tangent to both (radius RHO, the one that best matches Figma's own corner there),
// drawn by a white ring clipped to the corner's FILL.
import { readFileSync } from 'node:fs'

const FIGMA = 'M68.152 22.5161C100.651 -9.99506 122.75 -2.49247 146.149 33.77C200.746 108.796 298.242 105.045 358.039 30.0187C386.638 -11.2455 410.037 -6.24377 441.235 22.5161L482.833 65.0308C510.132 91.2898 511.432 122.551 485.433 147.559C446.435 188.823 442.535 238.841 442.535 278.854C441.235 367.635 387.938 432.658 298.242 436.409C226.745 438.91 183.847 463.918 148.748 506.433C125.349 535.193 95.4508 536.443 69.452 512.685L23.954 468.92C-5.94461 440.16 -8.54449 416.402 20.0542 385.141C82.4514 315.117 86.3512 227.587 29.1538 158.813C-0.744841 121.3 0.555101 98.7924 29.1538 67.5317L68.152 22.5161Z'
const PHOTO = [108.398, 103.4] // 94:265 in 94:264
const PILL = [[653.540625, 342.1872], [653.540625, 469.5455], [632.103625, 514.9415], [550.140325, 593.1215]]
const PILL_W = 135.065, RHO = 150
// The band's gap is the component's own, so the fills cannot drift from it.
const GAP = +readFileSync(new URL('../src/sections/Talent.tsx', import.meta.url), 'utf8').match(/^const GAP = ([\d.]+)/m)[1]
// Circle centres and radii in 94:264, in tab order; 2's circle is its loop's start.
const C = [[360.403, 79.403, 79.403], [...PILL[0], 79.403], [371.403, 659.403, 79.403], [71.841, 367.841, 71.841]]

const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k]
const len = (v) => Math.hypot(v[0], v[1]), unit = (v) => mul(v, 1 / len(v)), dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const lerp = (a, b, t) => add(a, mul(sub(b, a), t))
const turn = ([x, y], q) => (q === 1 ? [-y, x] : q === -1 ? [y, -x] : q === 2 ? [-x, -y] : [x, y])
const point = (c, u) => { const m = 1 - u; return [0, 1].map((k) => m ** 3 * c[0][k] + 3 * m * m * u * c[1][k] + 3 * m * u * u * c[2][k] + u ** 3 * c[3][k]) }
const sample = (c, n = 1500) => Array.from({ length: n + 1 }, (_, j) => point(c, j / n))
const nearest = (pts, q) => pts.reduce((b, p, j) => { const d = len(sub(q, p)); return d < b[0] ? [d, p, j] : b }, [Infinity])

// Figma's outline as 14 cubics (lines as straight cubics), in 94:264.
const segs = []
let start
for (const [, k, nums] of FIGMA.matchAll(/([MCL])([^MCLZ]+)/g)) {
  const v = nums.trim().split(/\s+/).map(Number), pts = []
  for (let i = 0; i < v.length; i += 2) pts.push(add([v[i], v[i + 1]], PHOTO))
  if (k === 'M') start = pts[0]
  else { const a = segs.length ? segs.at(-1)[3] : start; segs.push(k === 'C' ? [a, ...pts] : [a, lerp(a, pts[0], 1 / 3), lerp(a, pts[0], 2 / 3), pts[0]]) }
}
const tS = (c) => unit(sub(c[1], c[0])), tE = (c) => unit(sub(c[3], c[2]))
const setStart = (c, P, T, arm) => [P, add(P, mul(T, arm)), c[2], c[3]]
const setEnd = (c, P, T, arm) => [c[0], c[1], sub(P, mul(T, arm)), P]

// Notch 1 turned onto 2 and 3; the right flank of the top-right petal moves onto notch 2.
const notch1 = segs[1], notchAt = (c, q) => notch1.map((p) => add(c, turn(sub(p, C[0]), q)))
const n2 = notchAt(C[1], 1), n3 = notchAt(C[2], 2)
const TR = [segs[2], segs[3], setEnd(segs[4], n2[0], tS(n2), 25)]
const bl = segs[8], BL = [[n3[3], add(bl[1], sub(n3[3], bl[0])), bl[2], bl[3]], segs[9], segs[10]]
// The fourth petal: top-left turned 180deg about its chord's middle, then mapped chord
// to chord, stretched along it, 0.88 as thick and leant 8deg into the corner, so it
// stays inside the photo; its first arm is halved for the same reason.
const TL = [segs[12], segs[13], segs[0]], mid = lerp(TL[0][0], TL[2][3], 0.5)
const src = TL.map((c) => c.map((p) => sub(mul(mid, 2), p)))
const s0 = src[0][0], s1 = src[2][3], P0 = n2[3], P1 = n3[0], lean = (8 * Math.PI) / 180
const u = unit(sub(s1, s0)), v = [-u[1], u[0]], U = unit(sub(P1, P0))
const V = [-U[1] * Math.cos(lean) - U[0] * Math.sin(lean), U[0] * Math.cos(lean) - U[1] * Math.sin(lean)]
const k = len(sub(P1, P0)) / len(sub(s1, s0))
const map = (p) => { const d = sub(p, s0); return add(P0, add(mul(U, dot(d, u) * k), mul(V, dot(d, v) * 0.88))) }
const BR = src.map((c) => c.map(map))
BR[0] = setStart(BR[0], P0, tE(n2), len(sub(BR[0][1], BR[0][0])) * 0.5)
BR[2] = setEnd(BR[2], P1, tS(n3), len(sub(BR[2][3], BR[2][2])))
const outline = [segs[0], notch1, ...TR, n2, ...BR, n3, ...BL, segs[11], segs[12], segs[13]]
const notches = [notch1, n2, n3, segs[11]]

const r3 = (x) => +x.toFixed(3)
const blob = `M${sub(outline[0][0], PHOTO).map(r3).join(' ')}` +
  outline.map((c) => `C${c.slice(1).map((p) => sub(p, PHOTO).map(r3).join(' ')).join(' ')}`).join('') + 'Z'

// Corner fills: a circle of radius RHO, RHO from the band of loop i and from notch i+1, inside
// the outline. At rest a fill is the corner it rounds off, closed through white: the next
// circle's centre, the loop's end, its centreline.
const ring = outline.flatMap((c) => sample(c, 300))
const within = (poly, q) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > q[1]) !== (yj > q[1]) && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) c = !c } return c }
const inside = (q) => within(ring, q)
const R = PILL_W / 2 + GAP
// Each fill is drawn as a white ring round its corner circle, clipped to a shape whose sides all
// run through white once the band has passed them: into the next notch, along the band's
// centreline, and through the circle itself, where the ring never draws. The ring's radius is
// s RHO and the band's own transition widens its stroke from 0 to 2 (s - 1) RHO, so at progress
// p the band (dash p, width d + (W - d) p) and the ring's inner edge (s + (1 - s) p, in RHO) move
// together. The ring may reach a side only once the band covers it, so it never strands photo or
// shows a straight edge: s is the least that keeps that, over the centreline points to close on.
const corners = []
const fills = C.map(([cx, cy], i) => {
  const loop = sample(PILL.map((p) => (i === 1 ? p : add([cx, cy], turn(sub(p, PILL[0]), [-1, 0, 1, 2][i])))))
  const notch = sample(notches[(i + 1) % 4]), E = loop.at(-1)
  const err = (q) => [nearest(loop, q), nearest(notch, q)]
  let F, best = Infinity
  for (let x = E[0] - 260; x <= E[0] + 260; x += 2) for (let y = E[1] - 260; y <= E[1] + 260; y += 2) {
    const [[dl], [dn]] = err([x, y]), e = (dl - R - RHO) ** 2 + (dn - RHO) ** 2
    if (e < best && Math.abs(dl - R - RHO) < 4 && Math.abs(dn - RHO) < 4 && inside([x, y])) { best = e; F = [x, y] }
  }
  if (!F) throw new Error(`loop ${i + 1}: no corner circle of radius ${RHO}`)
  for (let it = 0; it < 200; it++) { // Newton on the two distances
    const [[dl, pl], [dn, pn]] = err(F), g1 = unit(sub(F, pl)), g2 = unit(sub(F, pn))
    const r1 = dl - R - RHO, r2 = dn - RHO, det = g1[0] * g2[1] - g1[1] * g2[0]
    const step = [(-r1 * g2[1] + r2 * g1[1]) / det, (-g1[0] * r2 + g2[0] * r1) / det]
    F = add(F, mul(step, 0.5)); if (len(step) < 1e-4) break
  }
  const [[dl, pl, jl], [dn, T2, jn]] = err(F), T1 = add(pl, mul(unit(sub(F, pl)), R))
  if (Math.abs(dl - R - RHO) > 0.01 || Math.abs(dn - RHO) > 0.01 || !inside(F) || !jl || !jn || jn === notch.length - 1) {
    throw new Error(`loop ${i + 1}: corner circle not tangent inside both curves`)
  }
  let da = Math.atan2(...sub(T2, F).reverse()) - Math.atan2(...sub(T1, F).reverse())
  da = Math.atan2(Math.sin(da), Math.cos(da))
  const nc = C[(i + 1) % 4].slice(0, 2), f = (p) => p.map((x) => +x.toFixed(2)).join(' ')
  const a1 = Math.atan2(...sub(T1, F).reverse())
  const fill = [...Array.from({ length: 61 }, (_, j) => add(F, [RHO * Math.cos(a1 + (da * j) / 60), RHO * Math.sin(a1 + (da * j) / 60)])), nc, E, pl]
  // When the band (or the outline) first covers a point, as progress 0 to 1.
  const at = [0]
  for (let j = 1; j < loop.length; j++) at.push(at[j - 1] + len(sub(loop[j], loop[j - 1])))
  const L = at.at(-1), d0 = 2 * C[i][2], W = 2 * R
  const cover = (q) => inside(q) ? Math.max(0, Math.min(...loop.map((c, j) => Math.max(at[j] / L, (2 * len(sub(q, c)) - d0) / (W - d0))))) : 0
  // The photo each grid point shows at rest, with the fill above and with a candidate.
  const xs = fill.map((p) => p[0]), ys = fill.map((p) => p[1]), grid = []
  for (let x = Math.floor(Math.min(...xs)) - 4; x <= Math.max(...xs) + 4; x++) for (let y = Math.floor(Math.min(...ys)) - 4; y <= Math.max(...ys) + 4; y++) {
    const q = [x, y]
    if (inside(q) && len(sub(q, F)) > RHO + 1 && nearest(loop, q)[0] > R + 1) grid.push([q, within(fill, q)])
  }
  let pick
  for (let jq = 0; jq < loop.length; jq += 15) {
    const clip = [T1, F, T2, nc], dir = Math.sign(jl - jq)
    for (let j = jq; (jl - j) * dir > 0; j += 100 * dir) clip.push(loop[j])
    clip.push(loop[jl])
    const edges = clip.flatMap((a, j) => { const b = clip[(j + 1) % clip.length], n = Math.ceil(len(sub(b, a))); return Array.from({ length: n }, (_, k) => lerp(a, b, k / n)) })
    let s = 1
    for (const q of edges) {
      const D = len(sub(q, F)) / RHO, c = cover(q)
      if (D > 1.003) s = Math.max(s, c >= 1 ? Infinity : (D - c) / (1 - c))
    }
    if (s < (pick?.s ?? Infinity) && grid.every(([q, was]) => was === within(clip, q))) pick = { s, clip }
  }
  if (!pick) throw new Error(`loop ${i + 1}: no clip both matches the fill at rest and runs through white`)
  if (pick.clip.some((q) => len(sub(q, F)) >= 3 * RHO)) throw new Error(`loop ${i + 1}: clip reaches past the ring`)
  corners.push([...F.map((v) => +v.toFixed(2)), Math.ceil(pick.s * 100) / 100])
  return `M${pick.clip.map(f).join('L')}Z`
})

console.log(`const BLOB =\n  '${blob}'`)
console.log(`const FILLS = [\n${fills.map((d) => `  '${d}',`).join('\n')}\n]`)
console.log(`const CORNERS = ${JSON.stringify(corners).replace(/,/g, ', ')}`)
