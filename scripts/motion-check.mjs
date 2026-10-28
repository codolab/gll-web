// Behaviour checks for design/motion-spec.md, run with motion ON. The parity
// harness only proves the rest frame (it captures under reduced motion); this
// proves the motion exists and does what the spec says.
//
//   npm run build && node scripts/motion-check.mjs [slug ...]   (URL=... to override)
//
// Each qa/motion/<slug>.mjs default-exports `async (page, t) => {}` and may
// export `reduced`, run the same way under prefers-reduced-motion: reduce.
// Files starting with `_` are shared helpers, not checks.
// t.check(id, pass, detail) records one spec item (id = M-xx from the spec).
// Both get the full page (not ?isolate) at 1440x900, 1x, at the top; each
// module scrolls its section into view. Exit code 1 if any check fails or a
// module throws. The default URL is the production preview: the dev server
// hot-reloads mid-run whenever a file is saved.
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { at, launch } from './harness.mjs'

const URL = process.env.URL ?? 'http://localhost:4197/'
const only = process.argv.slice(2)
const files = readdirSync(at('qa/motion')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .filter((f) => !only.length || only.includes(f.replace(/\.mjs$/, '')))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** translateX of an element's computed transform, 0 for none. */
const translateX = (page, sel) => page.$eval(sel, (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)

const browser = await launch()
const results = []
for (const f of files) {
  const slug = f.replace(/\.mjs$/, '')
  const mod = await import(pathToFileURL(at('qa/motion', f)).href)
  for (const [mode, fn] of [['motion', mod.default], ['reduce', mod.reduced]]) {
    if (!fn) continue
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]))
    const t = {
      slug, mode, browser, url: URL, sleep,
      translateX: (sel) => translateX(page, sel),
      section: `[data-section="${slug}"]`,
      check: (id, pass, detail = '') => results.push({ slug, mode, id, pass: !!pass, detail: String(detail) }),
    }
    try {
      await page.goto(URL, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await fn(page, t)
    } catch (e) {
      t.check('module', false, `threw: ${String(e.message).split('\n')[0]}`)
    }
    for (const e of errors) t.check('pageerror', false, e)
    await page.close()
  }
}
await browser.close()

for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.slug.padEnd(10)} ${r.mode.padEnd(6)} ${r.id.padEnd(8)} ${r.detail}`)
const failed = results.filter((r) => !r.pass).length
console.log(`\n${results.length - failed}/${results.length} pass`)
mkdirSync(at('qa/out'), { recursive: true })
writeFileSync(at('qa/out/motion.json'), JSON.stringify({ url: URL, at: new Date().toISOString(), results }, null, 1))
process.exit(failed || !results.length ? 1 : 0)
