// talent (MOBILE_SPEC.md 4): the static desktop figure (group 94:264) in one fixed
// 722x739 box, scaled to the content width. At 390, 320 and 768: the box scales by
// width / 722, everything it paints stays inside the figure and the window, and the
// reserved height matches so nothing below moves. Plus copy, alt, assets and a11y.

const FIG = { w: 722, h: 739 }

const measure = (page, sel) => page.$eval(sel, (sec) => {
  const fig = sec.querySelector('[data-talent="figure"]').getBoundingClientRect()
  const box = sec.querySelector('[data-talent="box"]')
  const scale = new DOMMatrixReadOnly(getComputedStyle(box).transform).a
  // Union of everything the box paints, in window px.
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity
  for (const el of box.querySelectorAll('*')) {
    const q = el.getBoundingClientRect()
    l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom)
  }
  const content = sec.firstElementChild.getBoundingClientRect()
  return {
    vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth,
    fig: { l: fig.left, r: fig.right, t: fig.top, b: fig.bottom, w: fig.width, h: fig.height },
    paint: { l, r, t, b }, scale, content: content.width,
  }
})

export default async function (page, t) {
  for (const w of [390, 320, 768]) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.waitForFunction(() => document.querySelector('main').dataset.surface === 'mobile')
    await page.$eval(t.section, (el) => el.scrollIntoView({ block: 'start' }))
    await t.sleep(100)
    const m = await measure(page, t.section)
    const want = m.fig.w / FIG.w
    // Content width on phones; 480 at most on tablets.
    t.check(`scale ${w}`, m.fig.w === Math.min(m.content, 480) && Math.abs(m.scale - want) < 1e-4 && Math.abs(m.fig.h - m.fig.w * FIG.h / FIG.w) < 1,
      `figure ${m.fig.w.toFixed(1)}x${m.fig.h.toFixed(1)} = min(content width ${m.content.toFixed(1)}, 480); scale ${m.scale.toFixed(4)} (want ${want.toFixed(4)})`)
    const e = 0.5
    const inside = m.paint.l >= m.fig.l - e && m.paint.r <= m.fig.r + e && m.paint.t >= m.fig.t - e && m.paint.b <= m.fig.b + e
    t.check(`fit ${w}`, inside && m.paint.l >= 0 && m.paint.r <= m.vw && m.sw <= m.vw,
      `painted ${m.paint.l.toFixed(1)}..${m.paint.r.toFixed(1)} x ${m.paint.t.toFixed(1)}..${m.paint.b.toFixed(1)} inside figure ${m.fig.l.toFixed(1)}..${m.fig.r.toFixed(1)} x ${m.fig.t.toFixed(1)}..${m.fig.b.toFixed(1)}; window ${m.vw}, page scrollWidth ${m.sw}`)
  }

  // No layout shift: the figure's height comes from CSS aspect-ratio, not the scale, so the
  // tagline sits in the same place whatever the scale is (unscaled, as before any script ran).
  await page.setViewportSize({ width: 390, height: 844 })
  const shift = await page.$eval(t.section, (sec) => {
    const fig = sec.querySelector('[data-talent="figure"]'), box = sec.querySelector('[data-talent="box"]'), line = sec.querySelector('[data-talent="figure"] ~ p')
    const before = line.getBoundingClientRect().top, keep = box.style.transform
    box.style.transform = 'none'
    const unscaled = line.getBoundingClientRect().top
    box.style.transform = keep
    return { before, unscaled, ratio: getComputedStyle(fig).aspectRatio, height: fig.style.height, position: getComputedStyle(box).position }
  })
  t.check('no shift', shift.ratio === '722 / 739' && !shift.height && shift.position === 'absolute' && shift.before === shift.unscaled,
    `figure height from CSS aspect-ratio ${shift.ratio} (inline height "${shift.height}"), box ${shift.position}; tagline top ${shift.before.toFixed(2)} scaled, ${shift.unscaled.toFixed(2)} unscaled`)

  const a = await page.$eval(t.section, (sec) => ({
    h2: sec.querySelector('h2')?.textContent,
    line: sec.querySelector('[data-talent="figure"] ~ p')?.textContent,
    imgs: [...sec.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), ok: i.complete && i.naturalWidth > 0, hidden: !!i.closest('[aria-hidden="true"]') })),
    digits: [...sec.querySelectorAll('[data-talent="box"] span')].map((s) => ({ d: s.textContent, hidden: !!s.closest('[aria-hidden="true"]') })),
    focusable: sec.querySelectorAll('a, button, input, [tabindex], [role="tab"]').length,
  }))
  t.check('copy', a.h2 === 'A world of Lithuanian talent' && a.line === 'One community. Endless possibilities.', `heading "${a.h2}", tagline "${a.line}"`)
  const photo = a.imgs.find((i) => i.src.endsWith('vilnius-portrait.webp'))
  t.check('assets', a.imgs.length === 2 && a.imgs.every((i) => i.ok && i.src.startsWith('/assets/mobile/talent/')),
    a.imgs.map((i) => `${i.src} ${i.ok ? 'loaded' : 'NOT LOADED'}`).join('; '))
  t.check('a11y', photo && photo.alt && !photo.hidden && a.digits.map((d) => d.d).sort().join('') === '1234' && a.digits.every((d) => d.hidden) && !a.focusable,
    `photo alt "${photo?.alt}"; digits ${a.digits.map((d) => `${d.d}${d.hidden ? ' hidden' : ' EXPOSED'}`).join(', ')}; focusable ${a.focusable}`)
}
