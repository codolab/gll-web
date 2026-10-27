// Prove the harness on inputs whose answer is known, before trusting it on a
// build. Writes qa/harness-validation.md.   node scripts/validate-harness.mjs
//
//   self      reference vs itself: every gate must read ~0.
//   shift     reference vs itself moved 1 device px, 1 CSS px, 1 CSS px down:
//             edge-only alone calls these clean (that is the trap); the ink
//             and build-shift gates must catch them, so the verdict must fail.
//   block     a painted 48x32 CSS px block: structural and edge-only must fail.
//   trim      a reference with its top-left cut off: the origin solver must
//             return exactly the cut, including an odd (device-px) one.
//   geometry  a probe built from the Figma boxes: 0 failures; then one box off
//             by 1.5px and one text node off in size only.
//   snap      the same 1 device px vertical shift on nav, once with its text at
//             a fractional y (Chromium's whole-px snap predicts +0.5: pass) and
//             once at an integer y (nothing predicts it: must fail).
//   ramp      the gradient against itself and moved 1 CSS px down: correlation
//             is blind to a ramp, so the least-squares fallback must measure it.
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { at, section, placedRef, measureRaster, verdict, solveRefOrigin, figmaIndex, scoreGeometry, GATES, DPR } from './harness.mjs'

const SCRATCH = at('qa/out/validate')   // gitignored
mkdirSync(SCRATCH, { recursive: true })
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))

function shifted(img, dx, dy, bg) {
  const out = { ...img, data: new Uint8Array(img.data.length) }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const sx = x - dx, sy = y - dy, o = (y * img.w + x) * 3
    if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) { out.data.set(bg, o); continue }
    out.data.set(img.data.subarray((sy * img.w + sx) * 3, (sy * img.w + sx) * 3 + 3), o)
  }
  return out
}
function painted(img, x0, y0, w, h, rgb) {
  const out = { ...img, data: Uint8Array.from(img.data) }
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.data.set(rgb, (y * img.w + x) * 3)
  return out
}

const rows = []
const expect = []
for (const slug of ['programs', 'nav', 'talent', 'gradient']) {
  const s = section(slug)
  const origin = solveRefOrigin(s)
  const ref = placedRef(s, origin)
  const bg = hex(s.backdrop)
  const cases = slug === 'gradient' ? [
    ['self (ramp, lsq fallback)', ref, 'PASS'],
    ['shift +1 CSS px y (ramp)', shifted(ref, 0, 2, bg), 'FAIL'],
  ] : [
    ['self', ref, 'PASS'],
    ['shift +1 device px x', shifted(ref, 1, 0, bg), 'FAIL'],
    ['shift +1 CSS px x', shifted(ref, 2, 0, bg), 'FAIL'],
    ['shift +1 CSS px y', shifted(ref, 0, 2, bg), 'FAIL'],
    ['painted block 48x32 CSS', painted(ref, Math.round(ref.w / 2), Math.round(ref.h / 3), 96, Math.min(64, ref.h - Math.round(ref.h / 3)), [255, 0, 255]), 'FAIL'],
  ]
  if (slug === 'nav') {
    // One painted text run across the nav; only its canvas y differs.
    const text = (y) => [{ x: s.x, y, w: s.w, h: s.h - 1, text: 1 }]
    cases.push(['shift +1 device px y, text at y 0.5 (snap predicts +0.5)', shifted(ref, 0, 1, bg), 'PASS', text(0.5)])
    cases.push(['shift +1 device px y, text at y 0 (nothing predicts it)', shifted(ref, 0, 1, bg), 'FAIL', text(0)])
  }
  for (const [name, build, want, paint] of cases) {
    const raster = measureRaster(s, ref, build, { paint })
    const v = verdict({ raster, geometry: { failed: [], checked: 1 } })
    const failed = Object.entries(v.gates).filter(([, ok]) => ok === false).map(([k]) => k)
    const edgeAloneClean = raster.thick <= GATES.thickMax
    rows.push({ slug, name, ...raster, verdict: v.verdict, failed, edgeAloneClean })
    expect.push({ what: `${slug} ${name}`, want, got: v.verdict, ok: v.verdict === want })
  }
}

// Origin solver on synthetic trims of an untrimmed reference.
const trims = []
for (const [slug, cx, cy] of [['hero', 26, 14], ['hero', 13, 0], ['programs', 1, 3], ['footer', 0, 0]]) {
  const s = section(slug)
  const f = `${SCRATCH}/${slug}-trim-${cx}-${cy}.png`
  execFileSync('magick', [at(`design/figma/${slug}.png`), '-crop', `+${cx}+${cy}`, '+repage', f])
  const o = solveRefOrigin(s, { refFile: f })
  trims.push({ slug, cut: `+${cx},+${cy}`, got: `${o.x >= 0 ? '+' : ''}${o.x},${o.y >= 0 ? '+' : ''}${o.y}`, ok: o.x === cx && o.y === cy, residual: o.residual })
  expect.push({ what: `${slug} trimmed by ${cx},${cy} device px`, want: `+${cx},+${cy}`, got: `${o.x},${o.y}`, ok: o.x === cx && o.y === cy })
}

// Geometry on a synthetic probe made from the Figma boxes themselves.
const geo = []
{
  const s = section('meet')
  const nodes = [...figmaIndex().values()].filter((n) => n.slug === s.slug && !n.hidden && n.box)
    .map((n) => ({ id: n.id, tag: 'div', display: 'block', x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h }))
  const exact = scoreGeometry(s, { nodes })
  geo.push({ case: 'probe = Figma boxes', checked: exact.checked, failed: exact.failed.length })
  expect.push({ what: 'geometry: probe equals Figma', want: '0 failed', got: `${exact.failed.length} failed`, ok: exact.failed.length === 0 })
  const box = nodes.find((n) => figmaIndex().get(n.id).type === 'RECTANGLE')
  const text = nodes.find((n) => figmaIndex().get(n.id).type === 'TEXT')
  const bad = nodes.map((n) => (n.id === box.id ? { ...n, x: n.x + 1.5 } : n.id === text.id ? { ...n, w: n.w + 2 } : n))
  const r = scoreGeometry(s, { nodes: bad })
  const ids = r.failed.map((f) => `${f.id} ${f.type}${f.type === 'TEXT' ? ` origin ${f.originPass ? 'ok' : 'FAIL'} size ${f.sizePass ? 'ok' : 'FAIL'}` : ''}`)
  geo.push({ case: `rect ${box.id} x+1.5, text ${text.id} w+2`, checked: r.checked, failed: r.failed.length, ids })
  const want = r.failed.length === 2 && r.failed.some((f) => f.id === text.id && f.originPass && !f.sizePass)
  expect.push({ what: 'geometry: 1.5px box shift and text size-only error', want: '2 failed, text = size only', got: ids.join('; '), ok: want })
}

const L = ['# Harness validation', '',
  `Run ${new Date().toISOString()} by \`node scripts/validate-harness.mjs\`. Known inputs only; no build involved.`,
  `Gates under test: ae <= ${GATES.aeMax}%, structural <= ${GATES.structMax}% of 8 CSS px cells and no cluster over ${GATES.structBlobMax} cells, edge-only thick px <= ${GATES.thickMax}% of window, ink |d| < ${GATES.inkTol} CSS px per band and build shift 0.`, '',
  `**${expect.filter((e) => e.ok).length}/${expect.length} expectations met.**`, '',
  '## Raster: reference against a doctored copy of itself', '',
  '| section | case | ae % | struct % | edge-only % | thick px | edge-only alone says | build shift (CSS px) | worst band ink measured dx,dy | expected (snap) | residual | method | bands flagged | verdict | failing gates |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for (const r of rows) {
  const w = r.ink.worst
  const meth = [...new Set(r.ink.bands.flatMap((b) => [b.method.x, b.method.y]).filter(Boolean))].join('+') || 'n/a'
  L.push(`| ${r.slug} | ${r.name} | ${r.ae} | ${r.structural}${r.structBlob ? ` (blob ${r.structBlob.cells})` : ''} | ${r.edgeOnly} | ${r.thickPx} | ${r.edgeAloneClean ? 'clean' : 'defect'} | ${r.shift ? `${r.shift.dx},${r.shift.dy}` : 'n/a'} | ${w ? `${w.dx ?? 'n/a'},${w.dy ?? 'n/a'}` : '-'} | ${w ? `${w.expX ?? '-'},${w.expY ?? '-'}` : '-'} | ${w ? `${w.resX ?? 'n/a'},${w.resY ?? 'n/a'}` : '-'} | ${meth} | ${r.ink.flagged}/${r.ink.bands.length} | ${r.verdict} | ${r.failed.join(', ') || '-'} |`)
}
L.push('', 'Reading it: a 1 device px shift leaves only seams, so "edge-only alone says clean" for it. That is exactly the hole; the per-band ink residual closes it and the verdict fails. The painted block survives erosion and trips structural through its contiguous cluster, at any section size. The two nav snap rows are the same pixels: the residual, not the raw measurement, decides, so an offset Chromium imposes passes and the identical offset at an integer y fails. The gradient rows are measured by the least-squares fallback (method lsq), because correlation cannot register a ramp.', '')
L.push('## Reference origin solver on synthetic trims', '', '| section | cut off top-left (device px) | solved | residual | ok |', '|---|---|---|---|---|')
for (const t of trims) L.push(`| ${t.slug} | ${t.cut} | ${t.got} | ${t.residual} | ${t.ok ? 'yes' : 'NO'} |`)
L.push('', '## Geometry gate on a synthetic probe (meet)', '', '| case | checked | failed | failing ids |', '|---|---|---|---|')
for (const g of geo) L.push(`| ${g.case} | ${g.checked} | ${g.failed} | ${(g.ids ?? []).join('; ') || '-'} |`)
L.push('', '## Expectations', '', '| check | want | got | ok |', '|---|---|---|---|')
for (const e of expect) L.push(`| ${e.what} | ${e.want} | ${e.got} | ${e.ok ? 'yes' : 'NO'} |`)
writeFileSync(at('qa/harness-validation.md'), L.join('\n') + '\n')
console.log(L.join('\n'))
process.exitCode = expect.every((e) => e.ok) ? 0 : 1
