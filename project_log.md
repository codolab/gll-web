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

## 2026-10-28: sticky nav

- Marius asked for a sticky header. The nav cannot stick from inside the canvas
  (transformed and clipped), so `src/StickyNav.tsx` renders it in a fixed layer
  with the canvas's scale and centring. Clear at the top, so the frame is
  unchanged; an ink bar fades in (0.3s) once the hero's rounded bottom reaches
  the nav. Focusable controls get `scroll-margin-top` so Tab never lands under
  the bar; page `scroll-padding-top` was tried first and shrank every
  scrollIntoView target, which broke the talent hit-area check.
- qa/motion/nav.mjs (M-16) at 1440, 1024 and 1921 wide; the focus checks fail
  with the margin removed. qa:motion 120/120; parity unchanged (nav 11/11, ae
  1.009); scroll-0 viewport vs production differs only by 1px glyph fringes.
- Private review: a page opened mid-scroll faded the bar in over the content
  (now seeded before first paint, fade only after the observer's first report);
  the bar threshold was checked only at scale 1 (now also 1024, proven against
  an unscaled radius); the checks read the bar before the observer reported
  (now they wait). Focus on a nav link while scrolled does not jump the page,
  so the scroll-margin rule stays unscoped. Browser scroll restoration is
  unreliable headless, so the mid-scroll check scrolls before the app starts.
- Built in .worktrees/gll-sticky-header: another session was working in
  projects/gll on feat/talent-morph at the same time.

## 2026-10-29: copyright year

- Marius: "copyright should be 2026". The footer line (94:368) printed the
  frame's "© 2024"; it now prints the current year, so it reads 2026 today and
  does not need another change in January. A deliberate deviation from the frame.
- Parity unchanged: footer 41/41, ae 1.966 (was 1.965); 10/11 sections pass,
  logos FAIL as before.

## 2026-10-29: talent photo outline the same for every number

- Marius: "the image mask has to be symmetrical and only the number selected
  with its quarter circle drawn should overlap that symmetry". Figma's outline
  (94:265) is drawn for 2 selected: its right side is one scoop round the 2
  loop and it has no fourth petal, so with 1, 3 or 4 selected it looked wrong.
- New resting outline (scripts/talent-mask.mjs): Figma's three petals and its
  notches under 1 and beside 4 as drawn; 2 and 3 take the notch under 1 (same
  circle size), turned onto them; a fourth petal, the top-left one turned 180deg
  and stretched to the wider gap (2's circle sits 26px above 4's mirror). Every
  circle now sits 31.8px from the photo (4: 34.3, Figma's own).
- The selected loop's band is 32px (Figma keeps 30 to 34.5 along the loop).
  Where it met the next notch it left a spike of photo; a white corner fill
  (radius 150, the closest match to Figma's own corner after 2) rounds it.
  It rounds the corner of the finished band, so it is drawn when the band's
  growth ends (its transitionend, 0.1s fade) and fades as the band shrinks.
- Checks: every circle's notch gap (fails on Figma's outline: 2 at 19.6px) and
  slivers (pixels an 8px opening removes from the visible photo: 2 to 5 with the
  fills, 16 to 34 without). Both mutation-tested. qa:motion 109/109.
- Review round: a clock-timed fill (delay 0.3s) showed the spike from about
  0.17s to 0.3s into each growth and stuck on screen for 0.3s after a quick
  2 -> 1 -> 2; the fill now waits for the band's transitionend (with a 0.45s
  fallback for a selection flipped back within one frame). New check samples
  every frame: never drawn before its band is out, drawn within 0.2s after,
  and back after 2 -> 1 -> 2 in 60ms (the clock version fails it). The notch
  check now reads the whole notch (nearest and farthest outline point within
  40deg); Figma's outline fails it at 2 (19.6 to 89.6px). The generator reads
  GAP from Talent.tsx and stops if a corner circle is not tangent to both
  curves. Selecting 1 or 4 cuts more photo than 2 or 3 (their corners span
  88 and 94deg against 49 and 57deg), because Figma's circles are not evenly
  placed. qa:motion 110/110.
- Rest frame: talent ae 2.086 (gate 3), geometry 15/15, but structural and
  edge-only now fail: with 2 selected the outline is the symmetric one minus
  the band, not Figma's, so a thin crescent round the head of the 2 loop and a
  strip along the corner differ from 94:265. Recorded in motion-spec M-G1.

## 2026-10-29: talent corner rounds with its band (PR #3 comment)

- Marius on PR #3, with a phone video: "a slight flicker at the end of the
  animation, hiding the rest of the overlap into the final correct shape ... it
  has to be completely smooth. Watch frame by frame." Frame by frame: the band
  stops, a spike of photo sits between it and the next notch for ~150ms, then
  the corner fill fades in over 100ms (two frames of a pale wedge) and snaps.
- Tried and dropped, each stepped frame by frame: a wide stroke revealing the
  fill along the band (the fill's straight sides showed mid-motion), the same
  fade moved into the band's last 120ms (six frames of ghost wedge), the fill
  sliding in with the band's head (it overlapped the corner 140px early).
- Built: each fill is a white ring round its corner circle (radius 150),
  clipped to a shape whose other sides run through white once the band has
  passed them (into the notch and along the band's centreline), and scaled in
  by its own transform transition in the band's timing (0.4s ease-in-out). The
  off scale (2.19, 5.52, 3.93, 4.87) is the least that never lets the ring
  reach a side the band has not covered yet, from the band's dash and width at
  each eased progress. So the spike is trimmed from its tip while the band
  arrives, is round the frame the band stops, and grows back as the band
  leaves. No state, timers or transitionend left in the component.
  scripts/talent-mask.mjs prints CORNERS (centre, off scale) beside BLOB and
  FILLS; FILLS are now the clip shapes, checked against the old fills at rest.
- Private review (fresh reviewer with its own frame scanner): the first clip (a
  circle short of the fill's straight sides) cut a one-frame fleck of photo
  loose at corner 2, and the QA check still passed with the trim made instant.
  Fixed by the clip above; the scanner finds no loose pieces in 9 switches in
  Chromium or WebKit.
- Settled states pixel-identical to the previous build (all four, 0 px at 30%
  fuzz). Every switch, Chromium and WebKit: photo still the frame the band
  stops, one piece in every frame, a corner changes at most 32 to 42% in one
  1/60s step, slivers over the band's last 0.1s 3 to 13 px. Mid-motion sliver
  peaks (the band sweeping across a petal) are the band's own and the same or
  lower than with no fill.
- QA M-05 "corner rounds with its band": a fresh page with Playwright's clock
  installed and paused, each switch's transitions paused and stepped 1/60s with
  the page clock run on alongside, then 0.3s more; nothing may change after the
  bands stop, the photo stays one piece, no corner changes over half in a step,
  and the last 0.1s leaves no spike. Fails on the committed build (still from
  417/433ms, tail slivers 22 to 73), with the trim made instant (2 pieces, a
  corner 100% in a step) and with no fill. The first version left the clock
  running (`install()` alone) and passed the committed build: its 450ms timer
  fired during the slow stepping.
- Second review round (fresh reviewer, read-only, with its own raster model:
  0 straight-edge px and no extra pieces over 300 random fast switches): the
  check's end came from every transition, so a late ring would pass, and the
  frozen clock meant no timer could fire before the last shot. Both fixed: the
  end is the bands' own, the clock runs with the steps. Its third point held
  up: Chromium runs a transform transition on SVG on the compositor (the layer
  tree showed ActiveTransformAnimation on both rings), so on a busy phone the
  ring could run a frame ahead of the band. The ring now keeps its radius
  (s RHO) and widens its stroke from 0 to 2 (s - 1) RHO, the band's own
  property on the main thread: same inner edge, settled masks pixel-identical.
  A lone half-covered pixel where the ring meets the band's edge (one frame,
  0x77 grey; 0x99 on the transform build) no longer counts as a piece.

## 2026-10-29: talent photo per number again

- Marius: "change the images of the masked frame upon hover/tap of the numbers
  (as it was before)". The designer's notes ask for it ("keičiasi centrinė
  nuotrauka"); the one-photo rebuild of 2026-10-28 had dropped it along with
  the turned outlines.
- Same photos as before 9538518 (1 hero 94:93, 2 the Figma photo, 3 hero
  94:95, 4 hero 94:101), now baked from the Figma originals at 2x the photo box
  (`assets.mjs fill --box`, which also finds a node in any section), inside the
  one symmetric outline. Preloaded with the page.
- Each selection stacks its photo over whatever shows and fades it in over the
  loop's 0.4s; layers under it go once it is in. Going back to a photo still in
  the stack fades the ones over it out instead, so a reversal ends with the
  bands (510ms after a 200ms reversal, every transition together).
- The fade drives opacity from a registered number (--fade, index.css). A plain
  opacity transition runs on Chrome's compositor and lifted the band svg into
  an overlap layer: its edges re-rasterised and jumped on the frame the fade
  ended (1601 px on the last step against 289 the step before, 236 on the old
  build). Tried and dropped for the outline: isolation, a CSS mask, will-change
  and a white overlay instead of the clip; none kept the edge the same, and the
  last two changed the settled states.
- QA M-05 "photo changes with its number", same stepping as the corner check
  plus a colour shot per step: no step lighter than both photos beyond 500 px
  (edge anti-aliasing shifts on 11 to 64 px while photos stack, 73 to 75 on the
  build before; white through a crossfade is tens of thousands), none over 20%
  of the change, none 3% over both neighbours. Measured 7 to 12% and 0.5 to
  0.8%. The photo-per-number, reduced-motion and outline checks now read each
  number's photo.

