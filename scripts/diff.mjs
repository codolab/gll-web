// Batch compare: every captured section against Figma, then qa/report.md and
// qa/report.json. Reads what scripts/capture.mjs wrote to qa/out/.
//   node scripts/diff.mjs [slug ...]
// Exit code 1 when any section is not PASS (stubs included), so this can gate.
import { existsSync, readFileSync } from 'node:fs'
import { SECTIONS, at, evaluateSection, writeReport, printConsole, offenders } from './harness.mjs'

const cap = JSON.parse(readFileSync(at('qa/out/capture.json'), 'utf8'))
const only = process.argv.slice(2)
const todo = SECTIONS.filter((s) => (only.length ? only.includes(s.slug) : true) && cap.sections[s.slug])

const results = todo.map((s) => {
  const c = cap.sections[s.slug]
  if (c.error) return evaluateSection(s, c)
  const probe = JSON.parse(readFileSync(at(`qa/out/${s.slug}.probe.json`), 'utf8'))
  const shot = at(`qa/out/${s.slug}.build.png`)
  if (!existsSync(shot)) return evaluateSection(s, { error: 'capture missing' })
  return evaluateSection(s, { shot, probe }, at('qa/cmp'))
})

writeReport(results, { url: cap.url })
printConsole(results)
for (const r of results) {
  const o = offenders(r, 3)
  if (o.length) console.log(`  ${r.slug}: ${o.join('\n  ' + ' '.repeat(r.slug.length + 2))}`)
}
console.log(`\nqa/report.md · qa/report.json · qa/cmp/<slug>.side.png`)
process.exitCode = results.every((r) => r.verdict === 'PASS') ? 0 : 1
