// The Figma frames the site is transcribed from, one per canvas surface.
// SURFACE=desktop (default) or SURFACE=wide selects one for every script:
// registry, references, harness, report. Mobile has no Figma frame (gaps.md
// G-01), so it is not a surface here and the parity harness never sees it.
//
// A section is one node, or `nodes` for a band the designer left as loose
// layers in the frame (the wide hero, the wide talent headline). Such a section
// gets a synthetic root `wide:<slug>` whose box is `box` (one of its nodes) or
// else their union, and its reference is their renders composited in paint
// order (scripts/fetch-refs.mjs).
const SURFACES = {
  desktop: {
    frame: '94:84', dir: 'design', qa: 'qa', viewport: { width: 1440, height: 1000 },
    sections: [
      { slug: 'hero', node: '94:85' },
      { slug: 'gradient', node: '94:110', overlay: true, backdrop: '#ffffff' },
      { slug: 'logos', node: '94:111' },
      { slug: 'nav', node: '94:120', overlay: true, backdrop: '#0b1722' },
      { slug: 'ribbons', node: '94:139' },
      { slug: 'programs', node: '94:156' },
      { slug: 'impact', node: '94:180' },
      { slug: 'meet', node: '94:199' },
      { slug: 'talent', node: '94:935' },
      { slug: 'community', node: '94:276' },
      { slug: 'footer', node: '94:307' },
    ],
  },
  wide: {
    frame: '173:310', dir: 'design/wide', qa: 'qa/wide', viewport: { width: 1640, height: 1000 },
    sections: [
      // Rectangle 15, the fifteen photo tiles, the Rectangle 14 scrim, the copy.
      { slug: 'hero', box: '173:312', nodes: ['173:312', ...Array.from({ length: 15 }, (_, i) => `173:${314 + i}`), '173:329', '173:330'] },
      { slug: 'gradient', node: '173:336', overlay: true, backdrop: '#ffffff' },
      { slug: 'logos', node: '173:337' },
      { slug: 'nav', node: '173:347', overlay: true, backdrop: '#0b1722' },
      { slug: 'ribbons', node: '173:366' },
      { slug: 'programs', node: '173:386' },
      { slug: 'impact', node: '173:411' },
      { slug: 'meet', node: '173:430' },
      { slug: 'talent', nodes: ['173:509', '173:523'] },
      // Figma paints the footer before the community band; they do not overlap,
      // so the desktop order stands.
      { slug: 'community', node: '173:1456' },
      { slug: 'footer', node: '173:524' },
    ],
  },
}

export const SURFACE = process.env.SURFACE ?? 'desktop'
if (!SURFACES[SURFACE]) throw new Error(`SURFACE=${SURFACE}: one of ${Object.keys(SURFACES).join(', ')}`)
export const CONF = SURFACES[SURFACE]
