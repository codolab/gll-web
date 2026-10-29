# GLL parity report

Build: http://localhost:4210/ · captured 2026-10-29T11:50:09.105Z · 2x, each section isolated (`?isolate=<slug>`) on its backdrop.
Verdicts: 10 PASS, 1 FAIL, 0 STUB, 0 ERROR.

| section | state | ref origin (dev px) | geometry pass | worst px | text origin/size fail | ae % | struct % (blob) | edge-only % (thick px) | build shift meas / exp | worst band | ink measured dx,dy | ink expected (snap) | ink residual | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hero | built | 0,0 | 25/25 | 0.02 | 0/0 of 3 | 1.316 | 0 | 100 (0) | 0,0 / -0.01,0 | y719.5+239.5 | 0.06,0.07 | -0.12,-0.2 | 0.18,0.27 | PASS |
| gradient | built | nominal? | 1/1 | 0.01 | 0/0 of 0 | 0 | 0 | 100 (0) | 0,0 / 0,0 | y0+180.5 | n/a,0.01 | 0,0 | n/a,0.01 | PASS |
| logos | built | 0,0 | 9/9 | 0.02 | 0/0 of 0 | 4.066 | 0 | 95.8 (679) | 0,0 / -0.04,0.11 | y1013.5+77 | -0.15,-0.02 | -0.01,0.12 | -0.14,-0.14 | FAIL (ae, edgeOnly) |
| nav | built | 0,0 | 11/11 | 0.02 | 0/0 of 6 | 1.01 | 0 | 100 (0) | 0,0 / 0,0.01 | y10.5+74 | -0.01,0 | 0,0.01 | -0.01,-0.01 | PASS |
| ribbons | built | 0,0 | 16/16 | 0.01 | 0/0 of 5 | 1.337 | 0 | 100 (0) | 0,0 / 0,0 | y2266+84 | 0.03,0 | 0,0 | 0.03,0 | PASS |
| programs | built | 0,0 | 24/24 | 0 | 0/0 of 12 | 0.531 | 0 | 100 (0) | 0,0 / 0,0 | y2619+208.5 | -0.05,0.01 | 0,0 | -0.05,0.01 | PASS |
| impact | built | 0,0 | 19/19 | 0.02 | 0/0 of 8 | 0.876 | 0 | 100 (0) | 0,0 / 0,0.23 | y4521+220.5 | 0.03,0.23 | 0,0.23 | 0.03,0 | PASS |
| meet | built | +0,+23 | 50/50 | 0.95 | 0/0 of 9 | 2.78 | 0 | 100 (14) | 0,0 / 0.08,0.27 | y5561+60.5 | -0.42,-0.41 | 0.06,-0.04 | -0.48,-0.37 | PASS |
| talent | built | +3,+26 | 15/15 | 0.02 | 0/0 of 6 | 2.009 | 0 | 99.9 (24) | 0,0 / -0.11,0.23 | y1367.5+185 | -0.2,0.23 | -0.43,-0.06 | 0.23,0.29 | PASS |
| community | built | 0,0 | 24/24 | 0.02 | 0/0 of 12 | 2.583 | 0 | 99.8 (184) | 0,0.5 / 0,0.43 | y6610.5+213 | 0.01,0.45 | 0,0.22 | 0.01,0.23 | PASS |
| footer | built | 0,0 | 41/41 | 0.01 | 0/0 of 21 | 1.966 | 0 | 98.7 (674) | 0,0.5 / 0,0.44 | y7252+214 | 0.01,0.28 | 0,0.5 | 0.01,-0.22 | PASS |

Gates: geometry boxes/images/vectors max |dx,dy,dw,dh| <= 1px; text origin <= 1px and text size <= 1px, scored separately. ae <= 3% (4% fuzz). structural <= 0.1% of 8 CSS px cells (12% fuzz) and no contiguous cluster over 2 cells. edge-only: px surviving a 1px erosion of the 10% difference mask <= 0.02% of the window. ink: in every band, |measured - expected| < 0.5 CSS px on both axes.
`ref origin` is where Figma put its (possibly trimmed) render relative to the node box, in device px, solved against Figma's own composite; non-zero means the render is trimmed, so the old assumed-origin diff was misregistered. `build shift` is the best whole-section registration of our capture onto that reference, shown against the snap expectation. Raster gates are measured at the true registration, never at the best one.
`ink expected (snap)` is the offset Chromium itself imposes: it paints boxes, images and text at round(y) of the canvas-absolute coordinate (whole CSS px, even at 2x; horizontally boxes and images only, text is sub-pixel), while the reference sits at round(2*section origin) device px. Expected = round(y) - y minus that placement, averaged over the painted elements in the band (edges weigh 2 px of ink, text and images their area). The gate is the residual. `worst band` is the band with the largest residual; ink figures are CSS px, ours minus Figma's; n/a = not measurable (no ink, or no edges and a flat least-squares fit).

## hero (94:85)

- coverage: 25/25 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y0 spread dx 0.81 dy 0; y240 spread dx 0.81 dy 0.81; y479.5 spread dx 0.81 dy 0.92; y719.5 spread dx 0.81 dy 0.39

## gradient (94:110)

- reference origin: too few opaque reference pixels on the canvas (1610) to solve; nominal origin assumed.
- coverage: 1/1 visible Figma nodes carry a data-node-id.
- least-squares fallback (too few edges for correlation) in 1 band(s): y0 dy

## logos (94:111)

- coverage: 9/9 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y1013.5 spread dx 0.73 dy 0.61

## nav (94:120)

- coverage: 11/19 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y10.5 spread dx 0 dy 0.75

## ribbons (94:139)

- coverage: 16/16 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 2 band(s): y2266 spread dx 0.64 dy 0.36; y2394 spread dx 0.64 dy 0.36

## programs (94:156)

- coverage: 24/24 visible Figma nodes carry a data-node-id.

## impact (94:180)

- coverage: 19/19 visible Figma nodes carry a data-node-id.

## meet (94:199)

- reference is trimmed: 2793x1466 vs box 2792x1488; its origin solves to +0,+23 device px against Figma's composite (residual 4.31 vs 38.96 at nominal); the node render bounds put it at +0,+22.55, which the snap expectation uses.
- coverage: 50/66 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 6 band(s): y5013.5 spread dx 0.7 dy 0; y5186 spread dx 0.93 dy 0; y5377.5 spread dx 0.93 dy 0; y5423 spread dx 0.76 dy 0
- least-squares fallback (too few edges for correlation) in 1 band(s): y5186 dy

## talent (94:935)

- reference is trimmed: 1958x1708 vs box 1984x1734; its origin solves to +3,+26 device px against Figma's composite (residual 3.06 vs 37.09 at nominal); the node render bounds put it at +2.89,+26.61, which the snap expectation uses.
- coverage: 15/15 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y1367.5 spread dx 0.59 dy 0.59; y1552.5 spread dx 0.78 dy 0.74; y1737.5 spread dx 0.78 dy 0.74; y1922 spread dx 0.78 dy 0.74
- least-squares fallback (too few edges for correlation) in 2 band(s): y1367.5 dx; y1552.5 dy

## community (94:276)

- coverage: 24/31 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y5970.5 spread dx 0 dy 0.5; y6184 spread dx 0 dy 0.5; y6397 spread dx 0 dy 0.5; y6610.5 spread dx 0 dy 0.5

## footer (94:307)

- coverage: 41/62 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y6823.5 spread dx 0 dy 0.5; y7037.5 spread dx 0 dy 0.5; y7252 spread dx 0 dy 0.69; y7466 spread dx 0 dy 0.69

Images: `qa/cmp/<slug>.side.png` (Figma | build | diff; red = mismatch, magenta = survives the 1px erosion).
