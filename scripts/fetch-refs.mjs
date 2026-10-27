// Downloads the parity baseline: one 2x Figma render per registry section into
// design/figma/<slug>.png, plus every source image fill into design/fills/.
// Resumable: anything already on disk is skipped.
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { figma, download, FILE_KEY } from './figma-api.mjs'

const { sections } = JSON.parse(readFileSync('design/sections.json', 'utf8'))
mkdirSync('design/figma', { recursive: true })
mkdirSync('design/fills', { recursive: true })

const only = process.argv.slice(2)
const todo = sections.filter((s) => (!only.length || only.includes(s.slug)) && !existsSync(`design/figma/${s.slug}.png`))
// Small batches: one call for every section hung for minutes.
for (let i = 0; i < todo.length; i += 3) {
  const batch = todo.slice(i, i + 3)
  const ids = batch.map((s) => s.node).join(',')
  const { images } = await figma(`/v1/images/${FILE_KEY}?ids=${ids}&scale=2&format=png`)
  for (const s of batch) {
    await download(images[s.node], `design/figma/${s.slug}.png`)
    console.log('ref', s.slug)
  }
}

if (!only.length) {
  const fills = await figma(`/v1/files/${FILE_KEY}/images`)
  for (const [ref, url] of Object.entries(fills.meta.images)) {
    if (!url || existsSync(`design/fills/${ref}`)) continue
    await download(url, `design/fills/${ref}`)
  }
  console.log('fills', Object.keys(fills.meta.images).length)
}
