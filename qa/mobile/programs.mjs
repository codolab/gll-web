// programs (MOBILE_SPEC.md 6): the heading, the "Programs" photo card with its pill,
// and the three navy cards stacked in order with every word of the desktop copy,
// checked character for character against design/nodes/programs.json. At 390 and 320:
// cards span the content width 16px apart, no text spills out of a card.
import { readFileSync } from 'node:fs'
import { at } from '../../scripts/harness.mjs'

const copy = {}
const walk = (n) => { if (n.characters) copy[n.id] = n.characters; (n.children ?? []).forEach(walk) }
walk(JSON.parse(readFileSync(at('design/nodes/programs.json'), 'utf8')))

const CARDS = [
  ['94:168', '94:169', '94:170'],
  ['94:173', '94:174', '94:175'],
  ['94:177', '94:178', '94:179'],
].map((ids) => ids.map((id) => copy[id]))

const read = (page, sel) => page.$eval(sel, (sec) => {
  const box = (el) => { const q = el.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height } }
  const photo = sec.querySelector('img').closest('div')
  const pill = photo.querySelector('a')
  return {
    h2: sec.querySelector('h2').textContent,
    title: photo.querySelector('p').textContent,
    pill: { text: pill.textContent, href: pill.getAttribute('href'), ...box(pill) },
    photo: { ...box(photo), loaded: photo.querySelector('img').complete && photo.querySelector('img').naturalWidth > 0, alt: photo.querySelector('img').alt },
    content: box(sec.firstElementChild),
    cards: [...sec.querySelectorAll('article')].map((c) => {
      const cb = box(c)
      const parts = [...c.children].map((e) => e.textContent)
      // Every text line stays inside the card's padding box.
      const spill = [...c.children].filter((e) => { const q = e.getBoundingClientRect(); return q.left < cb.l + 23.5 || q.right > cb.r - 23.5 || q.bottom > cb.b - 23.5 || e.scrollWidth > e.clientWidth })
      return { ...cb, parts, spill: spill.length, colour: getComputedStyle(c).backgroundColor }
    }),
  }
})

async function layout(page, t, w) {
  const r = await read(page, t.section)
  const gaps = r.cards.slice(1).map((c, i) => c.t - r.cards[i].b)
  const full = r.cards.every((c) => Math.abs(c.w - r.content.w) < 0.5) && Math.abs(r.photo.w - r.content.w) < 0.5
  t.check(`stack ${w}`, r.cards.length === 3 && full && gaps.every((g) => Math.abs(g - 16) < 0.5) && r.cards[0].t - r.photo.b === 16 && r.cards.every((c) => !c.spill),
    `photo ${r.photo.w.toFixed(1)}x${r.photo.h.toFixed(1)}, cards ${r.cards.map((c) => `${c.w.toFixed(0)}x${c.h.toFixed(0)}`).join(', ')} in content ${r.content.w.toFixed(1)}; gaps ${[r.cards[0].t - r.photo.b, ...gaps].map((g) => g.toFixed(1)).join('/')}; lines outside padding ${r.cards.map((c) => c.spill).join('/')}`)
  return r
}

export default async function (page, t) {
  await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForFunction((s) => [...document.querySelectorAll(`${s} img`)].every((i) => i.complete && i.naturalWidth), t.section, { timeout: 5000 }).catch(() => {})
  const r = await layout(page, t, 390)

  t.check('heading', r.h2 === copy['94:157'], JSON.stringify(r.h2))
  const pillCx = (r.pill.l + r.pill.r) / 2, photoCx = (r.photo.l + r.photo.r) / 2
  t.check('photo card', r.title === copy['94:164'] && r.pill.text === copy['94:166'] && r.pill.href === '#' && r.pill.h >= 44 && Math.abs(pillCx - photoCx) < 0.5 && Math.abs(r.photo.w / r.photo.h - 0.8) < 0.01 && r.photo.loaded && !!r.photo.alt,
    `"${r.title}" + "${r.pill.text}" pill ${r.pill.w.toFixed(0)}x${r.pill.h.toFixed(0)} centred ${(pillCx - photoCx).toFixed(2)}px off; photo ${r.photo.w.toFixed(0)}x${r.photo.h.toFixed(0)} (4:5 ${(r.photo.w / r.photo.h).toFixed(3)}), ${r.photo.loaded ? 'loaded' : 'NOT LOADED'}, alt "${r.photo.alt}"`)

  // Meta and body are split on mobile; joined with the blank line they are the desktop node.
  for (const [i, [n, title, body]] of CARDS.entries()) {
    const c = r.cards[i]
    const got = c ? [c.parts[0], c.parts[1], c.parts.slice(2).join('\n\n')] : []
    const same = got[0] === n && got[1] === title && got[2] === body
    t.check(`card ${n}`, same && c.colour === 'rgb(5, 50, 91)', same ? `${c.parts.length} lines, all desktop copy, on ${c.colour}` : `got ${JSON.stringify(got)}`)
  }

  await page.setViewportSize({ width: 320, height: 640 })
  await t.sleep(100)
  await layout(page, t, 320)
}
