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

## 2026-10-28: hero pan cut down after motion sickness

- Marius got motion sick from the hero on production. The pan moved the whole
  photo wall ±115px with a 0.2s lag, so a mouse sweep ran it above 1000 px/s.
  Now ±24px at 0.6s: an edge-to-edge sweep peaks at 76.7 px/s, and
  qa/motion/hero.mjs fails anything above 85 px/s. Rest frame unchanged
  (hero 25/25, ae 1.316).
- Then Marius asked for passive movement instead: the three photo rows now
  loop on their own, rows 1 and 3 rightward and row 2 leftward, at 20 px/s
  (checked under 25). The mouse pan is gone. Period 1713px, whole px, with
  each track at a whole-px origin: the seam is exact or 1px fringes and the
  photos are not resampled at t=0. The scrim over the moving rows blends with
  1-level rounding on 57% of pixels, so compare() gained a `floor`; the page
  check still catches the old pause-button shadow at floor 1 (769 core px).
  Rest frame unchanged (hero 25/25, ae 1.316); qa:motion 104/104.

## 2026-10-28: talent numbers morph into the loop

- Marius: hovering a number extends it into the quarter loop the Figma draws
  for 2, and the others are circles. The Figma pill is one cubic stroked 135px
  with round caps, so each number now owns that path turned in quarter turns to
  start at its circle, drawn with pathLength 1 and a dash of 0 (a circle) or 1
  (the loop); stroke-dasharray and stroke-width morph in 0.4s. The dash gap is
  2, not 1: a gap equal to the path length drew a second circle at its end.
- At rest 2 is extended, as in Figma, so the Figma photo and line now belong to
  2; 1, 3 and 4 get the placeholders. Turned loops covered the photo (the blob
  was cut for the right-hand loop only), so the blob outline turns with the
  loop: scripts/talent-photos.mjs bakes 1, 3 and 4 in the turned blob.
- Rest frame: talent ae 1.967 (was 2.009), structural 0. qa:motion 109/109;
  the new photo-clearance check fails with unturned outlines (about 10k px
  of each loop over the photo).
- Review round: the outgoing photo now fades out (0.2s) once the incoming one
  is full, because each blob has its own outline and the part only the old one
  covered popped; and the "2" digit centres in its circle when retracted (the
  Figma puts it 6.8px below the loop's start). Both have checks that fail
  without the fix. qa:motion 111/111.
- Marius: "jaggy and garbled; take the full image from Figma; no lags, jags
  or overlapping images; simplicity is key". Rebuilt: one photo, the Figma
  image fill (assets.mjs fill) clipped by CSS to the node's own vector; the
  per-number photos, their turned outlines and the photo crossfade are gone.
  The extended loop takes Figma's 30px gap (measured 30.06 at the pill,
  31.8 to 34.3 at the circles) off the photo with a white band that morphs
  with it, layered over the photo and under the tagline. Lines swap out then
  in, never both. Rest frame talent ae 1.736 (was 2.009 on main). Morph runs
  at 16.7ms frames (one 33ms frame in 221 at 4x CPU throttle).
- Review round: band 29.5px (half a pixel inside Figma's 30.06, so its edge
  never touches the photo at rest); the band check also asserts the band's
  width, the photo check that it decoded at 2x, the line check that both lines
  fade part-way, reduced motion covers the band paths, frame limit 34ms.
