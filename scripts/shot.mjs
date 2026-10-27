// Builder's quick loop, kept for its old command line:
//   node scripts/shot.mjs <slug> [url]
// It used to carry its own comparison, which assumed the reference origin and
// misregistered the trimmed renders (talent, meet). It now runs check-one.mjs,
// so the builder loop and `npm run qa` cannot disagree. Output is unchanged:
// qa/one/<slug>.side.png (Figma | build | diff).
process.argv.splice(2, process.argv.length - 2, ...process.argv.slice(2, 4))
await import('./check-one.mjs')
