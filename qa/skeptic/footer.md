# Skeptic review: footer (94:307)

Build: http://localhost:4197/?isolate=footer, captured through `scripts/harness.mjs` `captureSection` (byte-identical to `qa/out/footer.build.png`). Reference: harness `placedRef` + `solveRefOrigin` (origin 0,0). Paint-snap expectation as in `snapItems`: dY = -0.2227, so an element at a .72 canvas row expects +0.50, at a .22 row 0.00; text x expects 0.

## Verdict: 1 finding (FAIL on the 0.5 px rule)

### F1. 94:309 "Dark navy photo overlay": photo content drifts upward, residual reaches -0.63 CSS px

- What: the photo inside the newsletter card is vertically squashed and shifted up. The card's clip edges sit exactly where the snap model says (top +0.49, bottom +0.47, expected +0.50), but the photo content does not:

  | band (canvas y) | measured dy | expected | residual |
  |---|---|---|---|
  | 6890 | +0.27 | +0.50 | -0.23 |
  | 6990 | +0.17 | +0.50 | -0.33 |
  | 7110 | +0.09 | +0.50 | -0.41 |
  | 7240 | -0.01 | +0.50 | -0.51 |
  | 7330 | -0.10 | +0.50 | -0.60 |
  | 7370 | -0.13 | +0.50 | -0.63 |

  dx is 0.00 +/- 0.08 everywhere (no horizontal error).
- Cause (predicted before matching): `scripts/assets.mjs fill` rounds the FILL cover crop to whole source px. Source `design/fills/96140f9d...` is 1500x988; the exact cover crop is 1500x594.512+0+196.744, it was baked as 1500x595+0+197 and then forced to 2624x1040 with `!`. That shifts the content up by 0.22 CSS px at the card top and 0.65 at the bottom (model: -0.224 / -0.437 / -0.651 at top / middle / bottom), which is what the bands measure.
- Evidence: `qa/skeptic/work/crops/footer-photo-bottom-evidence.png` (400%, canvas 120,7352 90x30). Top row: build read at the snap-expected registration (+1 device row), the diff shows bright fringes along the roof line and parapet. Bottom row: build at zero shift, diff is clean. Mean |diff| over a 300x60 band at the card bottom is lowest at build row +0 (1.59) and 4.06 at the expected +1; the same test on community's conversations photo is lowest at +1 (1.34), as it should be. The photo ae is 0.9% at the true registration and 2.7% at the snap registration, the reverse of every correctly placed element.
- Why the harness passes it: the whole-section bands mix the photo with card edges and white text (band y7252 reads -0.22), and the element-level average is -0.33.
- Fix: re-bake `public/assets/footer/newsletter-photo.webp` with a sub-pixel crop (scale the full source by 2624/1500 = 1.74933, then crop 2624x1040 at y = 196.744 * 1.74933 = 344.17, or `-distort` with the exact offset). `scripts/assets.mjs fill` has the same rounding for every FILL/STRETCH bake, so other sections' fill assets can carry the same drift.

## Near miss (below the gate, reported for the record)

- 94:329 logo (`logo.svg`): the SVG geometry is about 0.5% larger than Figma's vector boxes. Per vector, measured dx grows left to right: 94:335 0.00, 94:330 0.06, 94:332/333/336/337 0.14 to 0.17, 94:331 0.30, 94:334 0.35 (right dot edge at 139.06 in the build vs 138.70 in the ref, same AA criterion). The SVG puts that dot at x 64.16..75.35 in a 75-wide group whose Figma box ends at 75.00. Vertical residual top dot +0.04, bottom dot +0.32. Max 0.35, under 0.5. Crop: `qa/skeptic/work/crops/footer-logo.side.png`.

## Checked, no finding

- Ink, per element (2D NCC, +/-6 device px, parabolic sub-pixel): all 41 tagged elements, every box edge (middle half of each side), 23 text lines, 66 words, 337 glyphs: max residual 0.03 for text, 0.03 for box edges. Placeholder "Enter your email" (not a DOM text node) measured 0.03,0.00 against expected 0,0. Facebook/LinkedIn icons 0.00,+0.51 vs 0,+0.50. Text x at the fractional column origins (334.4, 604.8, 875.2, 1145.6) measures 0, confirming sub-pixel text x.
- The 650 thick px: all are the 1-device-px paint snap. With the build moved up one device row they fall to 77, and those 77 sit on .22-row elements (placeholder, PROGRAMS pill) that are correct at the true registration. Located in the 17px link rows (7660 to 7760) and the 13px copyright line (7850). Harness artefact, not a defect. Crops: `crops/footer-legal-a.side.png`, `footer-legal-b.side.png`.
- Shapes: 94:308 r28, 94:315/94:317 r28 pills, 94:321 r30 pill. Pill extremes by edge crossing: left 792.257 vs 792.271, right 1319.766 vs 1319.875. PROGRAMS 1px inside stroke white, curve matches at 400% (`crops/footer-programs-pill.side.png`, `footer-form-right.side.png`).
- Colour (median of flat patches, ref / build / JSON): section and nav ink 11,23,34 all three; EVENTS and SUBSCRIBE 255,70,109; form 255,255,255; PROGRAMS stroke 255,255,255; dividers 94:327 bottom and 94:365 top 45,56,65 / 45,55,65 / white at 0.14 over ink = 45,55,65. Photo overlay (ink at 0.61): mean colour difference -0.1 to -0.3 levels in three text-free regions. Text colour cores exact in 7 text windows.
- Copy: 22 TEXT nodes match `characters` exactly (including "©", "|", "&", "!"); placeholder attribute equals 94:323 "Enter your email"; no textCase in the JSON and computed text-transform is none everywhere.
- Completeness: 21 untagged visible nodes are paintless auto-layout frames (94:310, 311, 314, 319, 328, 338, 342, 343, 366, 367), the placeholder TEXT rendered by the input, and the 10 vectors baked into logo/facebook/linkedin SVGs. No node is visible:false; the one hidden paint (94:339 white fill) is not rendered.
