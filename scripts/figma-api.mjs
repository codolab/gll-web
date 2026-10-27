// Shared Figma REST access. Reads the personal access token from .env.local
// (gitignored) and caches every JSON response under design/cache, so a rerun
// costs nothing against the rate limit.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const FILE_KEY = process.env.FIGMA_FILE_KEY ?? 'Mhl8szCFRd3mDfVsTCGdnG'
export const FRAME = '94:84'

const raw = readFileSync('.env.local', 'utf8')
const token = (raw.match(/^\s*(?:FIGMA_TOKEN|FIGMA_PAT)\s*=\s*(.+)$/m)?.[1] ?? raw)
  .trim().replace(/^["']|["']$/g, '')
if (!token.startsWith('fig')) throw new Error('.env.local does not look like it holds a Figma token')

const CACHE = 'design/cache'
mkdirSync(CACHE, { recursive: true })

export async function figma(path, { fresh = false } = {}) {
  const key = createHash('sha1').update(path).digest('hex').slice(0, 16)
  const file = `${CACHE}/${key}.json`
  if (!fresh && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const res = await fetch(`https://api.figma.com${path}`, { headers: { 'X-Figma-Token': token } })
  if (!res.ok) {
    const retry = res.headers.get('retry-after')
    throw new Error(`figma ${res.status} on ${path}${retry ? ` (retry-after ${retry}s)` : ''}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = await res.json()
  writeFileSync(file, JSON.stringify(data))
  return data
}

export async function download(url, out) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status} for ${out}`)
  writeFileSync(out, Buffer.from(await res.arrayBuffer()))
}

/** The full node tree of the frame, from the cached nodes call. */
export async function frameTree() {
  const d = await figma(`/v1/files/${FILE_KEY}/nodes?ids=${FRAME}`)
  return d.nodes[FRAME].document
}
