# Project log: gll-web

## 2026-10-27: first build, desktop frame 94:84

- Source: Figma `Mhl8szCFRd3mDfVsTCGdnG`, frame 94:84 "GLL (1)", 1440x7895, via the
  REST API only (Figma MCP quota on the available seats is ~20 calls a month).
- Method: the Social & Things approach. Fixed canvas, every section at its REST
  `absoluteBoundingBox`, isolated captures, a geometry + raster + ink harness.
- Built by six parallel section agents; harness ported and validated on known
  inputs by a seventh; skeptic pass by three read-only reviewers.
- Font: the design's Inter renders with **Inter 3.19** metrics. The Google Fonts
  Inter 4.0 file drifted up to 6px per line; 3.19 matches to 0.5px.
- Skeptic findings fixed: hero line 2 kerning (a span split the run), ribbon dots
  oversized and clipped, fill-baked photos drifting from rounded crops (tool
  fixed to a sub-pixel Lanczos crop), meet heading 0.4px right.

### Gate (production build, `npm run qa`)

| section | geometry | ae % | verdict |
|---|---|---|---|
| hero | 25/25 | 1.316 | PASS |
| gradient | 1/1 | 0 | PASS |
| logos | 9/9 | 4.063 | FAIL, attributed |
| nav | 11/11 | 1.01 | PASS |
| ribbons | 16/16 | 1.338 | PASS |
| programs | 24/24 | 0.531 | PASS |
| impact | 19/19 | 0.876 | PASS |
| meet | 50/50 | 2.782 | PASS |
| talent | 15/15 | 2.009 | PASS |
| community | 24/24 | 2.583 | PASS |
| footer | 41/41 | 1.965 | PASS |

Logos residual: structural 0, every logo within 0.45 CSS px of its Figma
position. The remainder is resampling of eight small raster logos; placing the
lossless Figma renders at Figma's own device positions scores 2.81%, and
sub-pixel placement by transform measured worse (4.21%). The isolated Figma
render cannot show the two HARD_LIGHT logos as they appear on the page, so the
section is gated against `design/figma/logos.composed.png`.

## 2026-10-28: designer motion notes

- Source: the designer's Lithuanian notes, itemised in `design/motion-spec.md`
  (global rules M-G1..M-G4, items M-00a..M-15). Defaults the notes do not give
  are marked [PROPOSED DEFAULT] there and logged as G-06..G-08.
- Built by four parallel section builders on `feat/designer-motion`: hero
  mouse pan, logo and ribbon marquees, talent hover states, programs card lift,
  impact count-up, meet photo zoom + looping arrows + swipe, Join us arrow nudge.
- Not built: "Join us: the logo spins" (M-14). The section has no logo in 94:84 (G-07).
- Harness: captures under reduced motion so script motion parks on its rest
  frame. New `npm run qa:motion` (scripts/motion-check.mjs + qa/motion/*.mjs)
  proves each behaviour with motion on and its absence under reduced motion.
- Findings worth keeping: the ribbon dots alternate colour, so a seamless loop
  is two phrases long; a moving track isolates blending, so the hard-light LF
  logos need an opaque white track; the two baked meet photos carry exposure
  filters, so the zoom shows a curve copy instead of re-baking them.
- Gate (production build): `npm run qa` identical to the 2026-10-27 table
  (rest frames unchanged); `npm run qa:motion` 71/71. The first animated frame
  of a marquee differs from rest by 0.02% of pixels, all 1px fringes, from
  layer promotion; the checks hold it to a fringe-only rule.
- Second review (Copilot was out of credits) found five more: the hidden pause
  button's shadow reached into the viewport on every page, ribbons had no hover
  pause, a meet photo stayed zoomed after a mouse click, a hover moved the talent
  tab stop, and the Support us nudge fired over non-clickable card area. All
  fixed in ba7937c with checks; a page-level check now proves the pause button
  paints nothing at rest. `npm run qa:motion` 103/103.
- Open questions answered: G-08 timings accepted and G-09 pause coverage
  accepted as is (no visible control, no tap-to-stop). G-06 talent photos and
  lines and G-07 Join us spin are with the designer.
