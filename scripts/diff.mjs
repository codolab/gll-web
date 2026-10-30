// Batch compare: every captured section against Figma, then qa/report.md and
// qa/report.json. Reads what scripts/capture.mjs wrote to qa/out/.
// SURFACE=wide reads and writes qa/wide/ instead.
//   node scripts/diff.mjs [slug ...]
// Exit code 1 when any section is not PASS (stubs included), so this can gate.
import { existsSync, readFileSync } from 'node:fs'
import { SECTIONS, QA, evaluateSection, writeReport, printConsole, offenders } from './harness.mjs'

const cap = JSON.parse(readFileSync(QA('out/capture.json'), 'utf8'))
const only = process.argv.slice(2)
const todo = SECTIONS.filter((s) => (only.length ? only.includes(s.slug) : true) && cap.sections[s.slug])

const results = todo.map((s) => {
  const c = cap.sections[s.slug]
  if (c.error) return evaluateSection(s, c)
  const probe = JSON.parse(readFileSync(QA(`out/${s.slug}.probe.json`), 'utf8'))
  const shot = QA(`out/${s.slug}.build.png`)
  if (!existsSync(shot)) return evaluateSection(s, { error: 'capture missing' })
  return evaluateSection(s, { shot, probe }, QA('cmp'))
})

writeReport(results, { url: cap.url })
printConsole(results)
for (const r of results) {
  const o = offenders(r, 3)
  if (o.length) console.log(`  ${r.slug}: ${o.join('\n  ' + ' '.repeat(r.slug.length + 2))}`)
}
console.log(`\n${QA('report.md')} · report.json · cmp/<slug>.side.png`)
process.exitCode = results.every((r) => r.verdict === 'PASS') ? 0 : 1
