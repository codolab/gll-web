// Batch capture: every section isolated at 2x, plus its geometry probe.
//   URL=http://localhost:4197/ node scripts/capture.mjs [slug ...]
// Default URL is the built app (`npm run build && npm run preview`); the dev
// server (URL=http://localhost:4196/) works too when the build is broken.
// All capture logic lives in scripts/harness.mjs, shared with check-one.mjs.
import { writeFileSync } from 'node:fs'
import { SECTIONS, QA, launch, captureSection } from './harness.mjs'

const URL = process.env.URL ?? 'http://localhost:4197/'
const only = process.argv.slice(2)
const todo = only.length ? SECTIONS.filter((s) => only.includes(s.slug)) : SECTIONS

try {
  await fetch(URL)
} catch {
  console.error(`nothing answers on ${URL}. Run \`npm run build && npm run preview\`, or point at the dev server: URL=http://localhost:4196/ npm run qa`)
  process.exit(2)
}

const browser = await launch()
const caps = {}
for (const s of todo) {
  const c = await captureSection(browser, URL, s, QA('out'))
  caps[s.slug] = c.error ? { error: c.error, errors: c.errors } : { emptyRoot: c.probe.emptyRoot, nodes: c.probe.nodes.length }
  console.log(`captured ${s.slug.padEnd(10)} ${c.error ? `ERROR ${c.error}` : `${c.probe.emptyRoot ? 'empty root, ' : ''}${c.probe.nodes.length} tagged nodes, ${c.probe.paint.length} painting elements`}`)
}
await browser.close()
writeFileSync(QA('out/capture.json'), JSON.stringify({ url: URL, at: new Date().toISOString(), sections: caps }, null, 1))
