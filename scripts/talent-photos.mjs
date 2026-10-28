// Bakes the talent placeholder photos for numbers 1, 3 and 4 (motion-spec M-05).
// Each is a hero tile, upright, cut to the Figma blob (94:265's alpha) turned by
// the same quarter turns as that number's loop (src/sections/Talent.tsx), so the
// blob always leaves room for the extended shape. Number 2 is the Figma photo.
//
//   node scripts/talent-photos.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { at } from './harness.mjs'

const BLOB = at('public/assets/talent/vilnius-portrait.webp')
const PHOTOS = [
  { out: 'members-group.webp', src: 'jaqs-volleyball.webp', turn: -90 }, // 1, tile 94:93
  { out: 'members-selfie.webp', src: 'yolk-volley-308.webp', turn: 90 }, // 3, tile 94:95
  { out: 'members-networking.webp', src: 'yolk-volley-274.webp', turn: 180 }, // 4, tile 94:101
]

const magick = (...args) => execFileSync('magick', args)
const tmp = mkdtempSync(join(tmpdir(), 'talent-'))
try {
  for (const p of PHOTOS) {
    const alpha = join(tmp, 'alpha.png'), photo = join(tmp, 'photo.png'), both = join(tmp, 'both.png')
    magick(BLOB, '-alpha', 'extract', '-rotate', String(p.turn), alpha)
    const [w, h] = String(magick('identify', '-format', '%w %h', alpha)).split(' ')
    magick(at('public/assets/hero', p.src), '-resize', `${w}x${h}^`, '-gravity', 'center', '-extent', `${w}x${h}`, photo)
    // The tile's own rounded corners stay cut: multiply both alphas.
    magick('(', photo, '-alpha', 'extract', ')', alpha, '-compose', 'multiply', '-composite', both)
    magick(photo, both, '-compose', 'CopyOpacity', '-composite', '-quality', '82', at('public/assets/talent', p.out))
    console.log(`${p.out}: ${p.src} in the blob turned ${p.turn} deg, ${w}x${h}`)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
