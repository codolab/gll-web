# Skeptic: meet (94:199)

Verdict: no finding at the 0.5 CSS px gate. One near-miss with a known cause and a one-line fix. The controls band residual and the 0.95px geometry offender are both harness artefacts.

Method: fresh capture through `scripts/harness.mjs` (`captureSection` + `evaluateSection`, `?isolate=meet` on :4197, 2x). Reference registered the harness's way: origin +0,+23, trimY 22.55, so dX 0 and dY +0.1625. Expected offset = harness snap model (round(y) - y - dY; x snapped for boxes and images, not for text). Each data-node-id element and each text line was measured in its own window: NCC on profiles (`bestShift`), 2D SSD, and coverage centroids. Text lines were also split into thirds and sixths. Scripts and crops are in `qa/skeptic/work/pim/`. All numbers below are build minus ref, in CSS px.

## Controls band y5561 (harness: dx -0.42 measured, +0.06 expected, -0.48 residual)

| node | what | measured dx, dy | expected | residual |
|---|---|---|---|---|
| 94:253 Previous stories (navy disc) | centroid | -0.38, -0.16 | -0.18, -0.06 | -0.20, -0.10 |
| 94:254 icon (white arrow 94:256) | centroid | -0.36, -0.17 | -0.12, +0.01 | -0.24, -0.18 |
| 94:257 Next stories (#e5e9f3 disc) | centroid | -0.02, -0.16 | +0.18, -0.06 | -0.20, -0.10 |
| 94:258 icon (arrow 94:260) | centroid | -0.05, -0.14 | +0.23, +0.01 | -0.28, -0.15 |
| I94:246/247/248;11754:1418 dots | centroid | -0.01, -0.67 | 0, -0.56 | -0.01, -0.11 |

The band's -0.42 is the navy button. Navy on white is about 206 levels of contrast and #e5e9f3 on white is about 20, so the navy disc dominates the ink. Its left edge 1355.352 paints at 1355, which accounts for -0.18 of it.

Two harness artefacts close the gap:

- **The band expectation ignores contrast.** Every box edge weighs 2px, so the faint button's +0.35 right-edge snap cancels the navy button's -0.35. That gives +0.06 where an ink-weighted expectation is about -0.15.
- **The reference drifts right.** Figma's reference sits about 0.2px right of the node boxes here: the light disc centroid is 1315.52 in the ref against 1315.32 from the node. This is part of a left-to-right drift across the reference:
  - card text residuals: -0.02, -0.07, -0.11, -0.16 for cards 1 to 4
  - ref card left edges: +0.10 at x372, rising to +0.18 at x1076

  The drift is consistent with the 2792.34px render being stretched to 2793px.

The band's dy expectation also counts the disc bottom edges at 5621.72, and those cannot be measured: they lie outside the window, which ends at 5621.5, and inside the NCC margin. The build's boxes match the node boxes (geometry 0.00 to 0.02).

The dots sit 0.4 above Figma's numbers. That is Chromium's whole-px snap of 5587.3985 to 5587, and the snap model predicts it.

Evidence:
- `work/pim/meet-navy-leftedge-800.png`, `meet-navy-rightedge-800.png`: a red fringe on the left edge and a weaker cyan fringe on the right show the disc is wider and shifted left.
- `meet-navy-arrow-400.png`, `meet-light-btn-ana-400.png`, `meet-dots-ana-400.png`: crops of the arrow, the light button and the dots.

## Geometry 0.95: 94:235 "Category" (NEW EVENT), dw -0.95

Figma makes all four badge labels whole-px wide: 102, 104, 98 and 87, against browser advances of 101.05, 103.59, 97.83 and 86.34. Figma rounds auto-width text boxes up to a whole pixel. The ink is identical:
- residual per sixth of the line: dx -0.04 to +0.05
- centroid: dx +0.08

`meet-newevent-right-400.png` (the "NT" end) is neutral grey in the anaglyph. Not real.

## Near-miss (below the gate): 94:200 heading "Meet, greet and network!"

- **Measured:** dx +0.38 by NCC and +0.42 by centroid, uniform across six segments (+0.30 to +0.41). dy residual is +0.01.
- **Cause:** Chromium applies the -1px tracking after the last glyph as well. The CSS line is 656.72 wide against Figma's 657.72, so the centred line starts 0.5 further right (range left 391.64 against 391.14).
- **Fix:** Programs compensates the same effect with `pr-[2.88px]` on 94:164. Here `pr-px` on the h2 would bring this to about -0.1.

Crops: `meet-heading-left-400.png`, `meet-heading-right-400.png`. Both show a cyan leading fringe and a red trailing fringe on both ends, which is a uniform shift.

## Colour, copy, completeness

- **Colour:** every computed fill and text colour equals the node JSON. Rendered flat fills are exact. The curve baked into `photo-leaders.webp` and `photo-connections.webp` renders #fde9e7 against #fce9e6 (1/255, lossy WebP). Photo means are within 0.3 levels.
- **Copy:** 9/9 TEXT nodes match exactly, including the "Meet \nleaders" trailing space. The four badges with textCase UPPER render with `uppercase`.
- **Completeness:** 16 visible nodes are untagged, and each has a counterpart:
  - 94:204 and 94:232 have no paint.
  - Curves 94:205 and 94:233 are baked into the frame renders; the card 2 curve crop is aligned.
  - The arrow vectors are baked into the SVGs, and their container instances have no paint.
- **Hidden nodes:** none is rendered (94:241, 94:243-245, 94:249-251, and the hidden fills).
