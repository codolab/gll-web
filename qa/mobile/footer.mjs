// footer on mobile (MOBILE_SPEC.md section 10). Copy is checked against the
// Figma text nodes char for char (the placeholder as the field's placeholder,
// the copyright with the current year, as desktop prints it since PR #5). The
// newsletter field is a labelled, typeable email input that never submits
// anywhere (no backend, gaps.md G-03); every control is at least 44x44; the
// five link columns sit in a two-column grid.
import { copyFromFigma, controls, missingCopy } from './community.mjs'

const WIDTHS = [320, 390, 768]
const YEAR = new Date().getFullYear()
const fmt = (n) => (Math.round(n * 10) / 10).toString()

export default async function (page, t) {
  const sec = page.locator(t.section)
  t.check('markup', await sec.evaluate((el) => el.matches('section#footer[role="contentinfo"]') && !!el.querySelector('h2') && !!el.querySelector('nav[aria-label="Footer"]')),
    'section#footer is the contentinfo landmark, with an h2 and a "Footer" nav')

  // Copy: the field's placeholder is a text node in Figma; the copyright carries the build year.
  const copy = copyFromFigma('footer')
  const placeholder = copy.find(([id]) => id === '94:323')[1]
  const texts = copy.filter(([id]) => id !== '94:323').map(([id, s]) => (id === '94:368' ? s.replace(/© \d{4} /, `© ${YEAR} `) : s))
  const missing = await missingCopy(page, t.section, texts)
  t.check('copy', !missing.length, missing.length ? `missing or altered: ${missing.map((s) => JSON.stringify(s)).join(', ')}` : `all ${texts.length} Figma text nodes present char for char`)

  const copyright = await sec.evaluate((el) => [...el.querySelectorAll('p')].map((p) => p.textContent).find((s) => s.includes('All Rights Reserved')) ?? '')
  t.check('year', copyright.includes(`© ${YEAR} |`), `copyright reads "${copyright}" (want © ${YEAR})`)

  // The email field: labelled, typed for email, typeable, validating, and Enter goes nowhere.
  const field = sec.getByRole('textbox', { name: 'Email', exact: true })
  const n = await field.count()
  const attrs = n === 1 && await field.evaluate((el) => ({
    type: el.type, name: el.name, auto: el.autocomplete, ph: el.placeholder,
    label: [...el.labels].map((l) => l.textContent).join('|'), fs: parseFloat(getComputedStyle(el).fontSize),
  }))
  t.check('email field', n === 1 && attrs.type === 'email' && attrs.name === 'email' && attrs.auto === 'email' && attrs.ph === placeholder && attrs.label === 'Email' && attrs.fs >= 16,
    n === 1 ? `textbox "Email" via <label> "${attrs.label}": type=${attrs.type} name=${attrs.name} autocomplete=${attrs.auto} placeholder "${attrs.ph}" ${attrs.fs}px (16+ keeps iOS from zooming)` : `${n} textboxes named "Email"`)
  if (n === 1) {
    await field.scrollIntoViewIfNeeded()
    await page.evaluate(() => { window.__stay = true })
    const url = page.url()
    await field.tap()
    await page.keyboard.type('reader@example.com')
    const typed = await field.evaluate((el) => ({ v: el.value, focus: document.activeElement === el, ok: el.checkValidity() }))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await field.fill('not an email')
    const bad = await field.evaluate((el) => el.validity.typeMismatch)
    const btn = sec.getByRole('button', { name: 'SUBSCRIBE', exact: true })
    const btnType = await btn.evaluate((el) => el.type)
    await btn.tap()
    await page.waitForTimeout(300)
    const stayed = page.url() === url && await page.evaluate(() => window.__stay === true)
    t.check('email typing', typed.focus && typed.v === 'reader@example.com' && typed.ok && bad && btnType === 'button' && stayed,
      `tap focuses (${typed.focus}), typed "${typed.v}" valid ${typed.ok}; "not an email" typeMismatch ${bad}; SUBSCRIBE type=${btnType}; Enter and SUBSCRIBE leave the page as it was (${stayed})`)
  }

  // Logo and the social icons: links named for assistive tech, their images decorative.
  const named = []
  for (const name of ['Global Lithuanian Leaders', 'Facebook', 'LinkedIn']) {
    const link = sec.getByRole('link', { name, exact: true })
    const ok = (await link.count()) === 1 && await link.evaluate((el) => !!el.querySelector('img[alt=""]') && el.querySelector('img').naturalWidth > 0)
    named.push([name, ok])
  }
  t.check('logo + social', named.every(([, ok]) => ok), named.map(([n, ok]) => `${n} ${ok ? 'named, icon loaded' : 'MISSING'}`).join(' · '))

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.waitForTimeout(150)
    const small = (await controls(page, t.section)).filter((c) => c.w < 44 || c.h < 44)
    const all = (await controls(page, t.section)).length
    t.check(`targets ${w}`, !small.length, small.length ? small.map((c) => `${c.name} ${fmt(c.w)}x${fmt(c.h)}`).join(', ') : `all ${all} links, buttons and the field at least 44x44`)

    const grid = await sec.evaluate((el) => [...el.querySelectorAll('nav[aria-label="Footer"] > *')].map((c) => ({
      head: c.querySelector('a')?.textContent, x: Math.round(c.getBoundingClientRect().left), links: c.querySelectorAll('a').length - 1,
    })))
    const xs = [...new Set(grid.map((c) => c.x))]
    const order = grid.map((c) => c.head).join(', ')
    t.check(`columns ${w}`, order === 'About, Network, Programs, Events, Join us' && xs.length === 2 && grid[0].x === grid[2].x && grid[2].x === grid[4].x && grid[1].x === grid[3].x,
      `${order}; ${xs.length} column lefts (${xs.join(', ')}); links per column ${grid.map((c) => c.links).join('/')}`)

    const card = await sec.evaluate((el) => {
      const c = el.querySelector('[data-card="newsletter"]')
      const cs = getComputedStyle(c)
      const img = c.querySelector('img')
      const scrim = getComputedStyle(img.nextElementSibling).backgroundColor
      const b = c.getBoundingClientRect()
      return { r: cs.borderTopLeftRadius, clip: cs.overflow, img: img.naturalWidth > 0 && img.getBoundingClientRect().height >= b.height - 1, scrim, w: b.width, vw: document.documentElement.clientWidth }
    })
    t.check(`card ${w}`, card.r === '16px' && card.clip === 'hidden' && card.img && /0\.61\)$/.test(card.scrim) && card.w <= 640 && card.w >= Math.min(640, card.vw - 40) - 0.5,
      `newsletter card ${fmt(card.w)}px wide, radius ${card.r}, ${card.clip}, photo fills it ${card.img}, scrim ${card.scrim}`)
  }
}
