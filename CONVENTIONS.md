# Build conventions: gll-web

A literal, pixel-accurate transcription of Figma frames `94:84` ("GLL (1)",
1440) and `173:310` (its 1640 wide variant) in file `Mhl8szCFRd3mDfVsTCGdnG`.
The design is the specification. Do not improve it, re-space it, or "fix" its
inconsistencies. Below 1024px the page is a separate mobile composition with no
Figma frame behind it: see `MOBILE_SPEC.md`.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind v4 (`@tailwindcss/vite`).
No other runtime dependencies. Do not add npm packages. Font: Inter,
self-hosted variable (`--font-sans`), which is the design's own face, so text
can and should match the render closely.

## Layout model

`src/App.tsx` renders a fixed canvas, 1440 x 7895 or 1640 x 7993 (see Surfaces),
and absolutely positions each section at its Figma `absoluteBoundingBox`
(registry: `design/sections.json`, `design/wide/sections.json`).

**Your component renders only the inside of your section.** The wrapper div,
its `left/top/width/height` and `data-section` are provided by App. Your root
is `<div className="relative size-full" data-node-id="<section node>">` and
must not position itself. Content may overflow the wrapper; the canvas clips
at 0..1440 exactly as the Figma frame does.

## Surfaces

`src/surface.ts` picks the composition by window width: **mobile** up to 1023
(`src/mobile/`), **desktop** 1024-1539 (the 1440 canvas, scaled down below
1440), **wide** from 1540 (the 1640 canvas, scaled down below 1640). `?surface=`
pins one whatever the window (QA only; the harness and `qa:motion` always pin).

- Both canvases render the same section components. A section reads
  `useCanvasSurface()` (`'desktop' | 'wide'`) and picks its geometry, node ids
  and assets by it. Share behaviour, not coordinates: keep one component and its
  motion code, with a table per surface. The desktop render must not change by
  one pixel (`npm run qa` identical to main).
- Wide sources live under `design/wide/` (`sections.json`, `nodes/`, `figma/`)
  and the scripts take `SURFACE=wide`: `SURFACE=wide node scripts/shot.mjs
  <slug> <url>`, `npm run qa:wide`, `npm run qa:motion:wide`. Wide assets go in
  `public/assets/<slug>/` too, named `wide-*` where they differ.
- The wide hero and talent are loose layers in 173:310, not one node, so their
  root is a synthetic `wide:hero` / `wide:talent` (box = Rectangle 15 for the
  hero, the union of the group and its headline for talent).
- **Bleed.** Wider than its canvas, the window shows the canvas at 1x, centred,
  and `--bleed` on the canvas root is how far the window reaches past each
  edge (canvas px; 0 otherwise). The canvas then stops clipping left and right,
  so whatever overhangs the frame (photo tiles, marquee tracks, the gradient, the
  meet cards) fills the margin. A full-width band (a fill that spans the whole
  frame) extends by it: `left: calc(-1 * var(--bleed, 0px)); right: calc(-1 *
  var(--bleed, 0px))` on the band's fill only, never on content. Marquee tracks
  carry enough clones to cover a 2560 window (bleed 460 on wide).

## Sources (no Figma MCP: the quota is ~20 calls a month)

- `design/nodes/<slug>.json`: the section's full REST subtree. Every
  `absoluteBoundingBox` is already re-based to canvas pixels. Place a child at
  `box.x - section.x`, `box.y - section.y`. Never use raw `x`/`y` or
  `relativeTransform` for placement: those are pre-transform.
- `design/figma/<slug>.png`: the 2x Figma render of your section, the baseline.
- `design/figma/full-1x.png`: the composed page at 1x, for context.

Read from the node JSON, not off the picture: `style.fontSize`, `fontWeight`,
`lineHeightPx`, `letterSpacing`, `textAlignHorizontal`, `textCase`,
`characterStyleOverrides` + `styleOverrideTable` (mixed weights in one line),
`fills` (SOLID with `opacity`, GRADIENT_* with `gradientHandlePositions`),
`strokes` + `strokeWeight` + `strokeAlign`, `cornerRadius` /
`rectangleCornerRadii`, `effects` (DROP_SHADOW, BACKGROUND_BLUR), node
`opacity`, `blendMode`, `clipsContent`, `visible: false` (skip it).

Absolute placement from the boxes is always correct. Flex/auto-layout is fine
where it reproduces the same boxes exactly; verify, don't assume.

## Assets

Use `scripts/assets.mjs`; it writes to `public/assets/<slug>/` and prints the
URL to reference.

```
node scripts/assets.mjs render <slug> 94:112=partner-triniti 94:113=partner-lf    # PNG->WebP, 2x
node scripts/assets.mjs render <slug> 94:130=logo --format=svg                    # vectors, icons
node scripts/assets.mjs fill   <slug> 94:287=conversations                        # photo fill of a frame with children
```

- `render` has Figma paint the node itself: image filters, crop, blend, masks,
  corner radius all baked in. Use it for childless image nodes, vectors,
  icons, logos, and any image that carries `filters` or a non-normal
  `blendMode`. Batch all of your ids into one call per format.
- `fill` bakes a frame's image fill from the source file at the exact box
  aspect (Figma "Crop"/STRETCH via `imageTransform`, FILL as a centred cover).
  It does not apply image filters and says so; for those, render a child or
  the node and accept what it bakes, and say which you chose.
- Never hand-write an `<svg>` path, never hotlink a Figma URL, never drop an
  icon. A text node stays live text, never an image of text.

## Interaction

Links are `<a href="#">`, buttons are `<button type="button">`, the
newsletter field is a real `<input type="email">`. Hover/focus states are
welcome but must not change the default render.

## Motion

`design/motion-spec.md` is the motion contract (items M-xx). The rest frame
must stay the Figma frame: before any pointer input, scroll trigger or
animation tick a section renders exactly as it did. Under
`prefers-reduced-motion: reduce` decorative motion stops; the parity harness
captures that way and also strips CSS animations and transitions.

- CSS motion: Tailwind `motion-safe:` variants or the `.marquee` class in
  `src/index.css` (set `--marquee-shift` and `--marquee-duration` inline).
- Script motion: `useReducedMotion()` from `src/motion.ts`.
- At rest, leave `transform` unset rather than `translate(0)`: a transform
  promotes a layer and can move how a photo resamples.
- Clones for looping: no `data-node-id`, `aria-hidden`, not focusable.
- The nav is the exception to the layout model: `src/StickyNav.tsx` renders it
  in a fixed layer outside the canvas, with the canvas's scale and centring, so
  it stays on screen (M-16). It covers the top 95px of the viewport (scaled), so
  a check that points there hits the nav. Focusable controls carry
  `scroll-margin-top` so keyboard focus never lands under it.
- Each section with motion owns `qa/motion/<slug>.mjs` (see the header of
  `scripts/motion-check.mjs`): one `t.check('M-xx', pass, detail)` per spec item,
  plus a `reduced` export proving decorative motion stops.

## Checking your work

A dev server runs on http://localhost:4196 (HMR picks up your file). If it is
not answering, start your own: `npx vite --port <your port> --strictPort`.

```
node scripts/shot.mjs <slug> [http://localhost:<port>/]
```

runs the full parity harness on one section (`scripts/harness.mjs`, shared
with `npm run qa`) and writes `qa/one/<slug>.side.png` (Figma | build | diff).
Look at the side-by-side, then crop disputed regions from both images at
300-400% before deciding anything. Trimmed renders (talent, meet) are
registered by the harness, which solves and prints the reference origin.
Chromium snaps box edges to whole CSS px even at 2x; the ink gate subtracts
that expected snap, so only the residual counts.
When `design/figma/<slug>.composed.png` exists the harness uses it instead of `<slug>.png`: an isolated render blends non-normal layers (logos' HARD_LIGHT) against nothing, so that section's reference is re-composited onto its white backdrop.

## Rules

- Strict TypeScript: `npx tsc -b` must pass.
- Touch only `src/sections/<YourComponent>.tsx`, `public/assets/<your-slug>/` and `qa/motion/<your-slug>.mjs`
  (mobile: `src/mobile/sections/<YourComponent>.tsx`, `public/assets/mobile/<your-slug>/`, `qa/mobile/<your-slug>.mjs`).
  Never edit App.tsx, canvas.ts, surface.ts, index.css, scripts, or another section.
- Copy is reproduced character for character from `characters`, including
  curly quotes, dashes and non-breaking spaces the design uses.
- Keep `data-node-id="<figma id>"` on every element that maps to a node; the
  geometry gate measures every one of them against its Figma box.
- Comments: about one line per ten of code, only where the why is not obvious.
  Never use the em-dash character in comments or anything you write (design
  copy is exempt: reproduce what is there).
