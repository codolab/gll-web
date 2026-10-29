# GLL parity report

Build: http://localhost:4210/ · captured 2026-10-29T11:50:55.408Z · 2x, each section isolated (`?isolate=<slug>`) on its backdrop.
Verdicts: 10 PASS, 1 FAIL, 0 STUB, 0 ERROR.

| section | state | ref origin (dev px) | geometry pass | worst px | text origin/size fail | ae % | struct % (blob) | edge-only % (thick px) | build shift meas / exp | worst band | ink measured dx,dy | ink expected (snap) | ink residual | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hero | built | 0,0 | 24/24 | 0.03 | 0/0 of 3 | 1.019 | 0 | 100 (0) | 0,0 / 0.07,0.02 | y479.5+240 | -0.03,-0.06 | 0.11,0.15 | -0.14,-0.21 | PASS |
| gradient | built | nominal? | 1/1 | 0.01 | 0/0 of 0 | 0 | 0 | 100 (0) | 0,0 / -0.01,0 | y0+180.5 | n/a,-0.04 | -0.01,0 | n/a,-0.04 | PASS |
| logos | built | 0,0 | 10/10 | 0.02 | 0/0 of 0 | 4.049 | 0 | 98 (370) | 0,0 / 0.02,0.1 | y1013.5+77 | -0.27,0 | 0.04,0.11 | -0.31,-0.11 | FAIL (ae, edgeOnly) |
| nav | built | -1,+0 | 11/11 | 0.02 | 0/0 of 6 | 1.355 | 0 | 100 (0) | 0,0 / 0.27,0.02 | y10.5+74 | 0.21,-0.01 | 0.27,0.02 | -0.06,-0.03 | PASS |
| ribbons | built | 0,0 | 19/19 | 0.01 | 0/0 of 6 | 1.474 | 0 | 100 (0) | 0,0 / 0,0.01 | y2266+84 | 0.04,0 | 0,0.01 | 0.04,-0.01 | PASS |
| programs | built | 0,0 | 25/25 | 0.02 | 0/0 of 12 | 0.668 | 0 | 100 (0) | 0,0 / 0,-0.08 | y2619+208.5 | -0.05,-0.1 | 0,-0.08 | -0.05,-0.02 | PASS |
| impact | built | 0,0 | 19/19 | 0.02 | 0/0 of 8 | 0.769 | 0 | 100 (0) | 0,0 / 0,0.23 | y4521+220.5 | 0.03,0.23 | 0,0.23 | 0.03,0 | PASS |
| meet | built | +0,+23 | 68/68 | 0.95 | 0/0 of 13 | 2.803 | 0 | 99 (534) | 0,0 / 0.03,0.14 | y5186+172.5 | -0.38,0.06 | 0.03,0.11 | -0.41,-0.05 | PASS |
| talent | built | 0,0 | 16/16 | 0.02 | 0/0 of 6 | 2.096 | 0 | 99.9 (32) | 0,0 / -0.1,0.23 | y1367.5+185 | -0.27,0.2 | -0.44,-0.06 | 0.17,0.26 | PASS |
| community | built | 0,0 | 24/24 | 0.03 | 0/0 of 12 | 2.071 | 0 | 100 (5) | 0,0 / -0.02,0.18 | y6223.5+232.5 | -0.11,0.12 | -0.06,0.2 | -0.05,-0.08 | PASS |
| footer | built | 0,0 | 42/42 | 0.01 | 0/0 of 21 | 0.6 | 0 | 99.6 (104) | 0,0 / 0,0.05 | y7350.5+214 | 0,0.16 | 0,0.01 | 0,0.15 | PASS |

Gates: geometry boxes/images/vectors max |dx,dy,dw,dh| <= 1px; text origin <= 1px and text size <= 1px, scored separately. ae <= 3% (4% fuzz). structural <= 0.1% of 8 CSS px cells (12% fuzz) and no contiguous cluster over 2 cells. edge-only: px surviving a 1px erosion of the 10% difference mask <= 0.02% of the window. ink: in every band, |measured - expected| < 0.5 CSS px on both axes.
`ref origin` is where Figma put its (possibly trimmed) render relative to the node box, in device px, solved against Figma's own composite; non-zero means the render is trimmed, so the old assumed-origin diff was misregistered. `build shift` is the best whole-section registration of our capture onto that reference, shown against the snap expectation. Raster gates are measured at the true registration, never at the best one.
`ink expected (snap)` is the offset Chromium itself imposes: it paints boxes, images and text at round(y) of the canvas-absolute coordinate (whole CSS px, even at 2x; horizontally boxes and images only, text is sub-pixel), while the reference sits at round(2*section origin) device px. Expected = round(y) - y minus that placement, averaged over the painted elements in the band (edges weigh 2 px of ink, text and images their area). The gate is the residual. `worst band` is the band with the largest residual; ink figures are CSS px, ours minus Figma's; n/a = not measurable (no ink, or no edges and a flat least-squares fit).

## hero (wide:hero)

- coverage: 24/24 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y0 spread dx 0.83 dy 0.05; y240 spread dx 1.03 dy 0.84; y479.5 spread dx 1 dy 0.92; y719.5 spread dx 0.8 dy 0.4

## gradient (173:336)

- reference origin: too few opaque reference pixels on the canvas (1829) to solve; nominal origin assumed.
- coverage: 1/1 visible Figma nodes carry a data-node-id.
- least-squares fallback (too few edges for correlation) in 1 band(s): y0 dy

## logos (173:337)

- coverage: 10/10 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y1013.5 spread dx 0.92 dy 0.61

## nav (173:347)

- reference is trimmed: 3171x191 vs box 3171x190; its origin solves to +-1,+0 device px against Figma's composite (residual 3.07 vs 3.99 at nominal); the node render bounds put it at +0,+0, which the snap expectation uses.
- coverage: 11/19 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y10.5 spread dx 0.33 dy 0.75

## ribbons (173:366)

- coverage: 19/19 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 2 band(s): y2266 spread dx 0.66 dy 0.36; y2394 spread dx 0.64 dy 0.36

## programs (173:386)

- coverage: 25/25 visible Figma nodes carry a data-node-id.

## impact (173:411)

- coverage: 19/19 visible Figma nodes carry a data-node-id.

## meet (173:430)

- reference is trimmed: 3497x1466 vs box 3496x1488; its origin solves to +0,+23 device px against Figma's composite (residual 5.9 vs 38.9 at nominal); the node render bounds put it at +0,+22.55, which the snap expectation uses.
- coverage: 68/88 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 5 band(s): y5013.5 spread dx 0.63 dy 0.4; y5186 spread dx 0.94 dy 0.4; y5377.5 spread dx 0.94 dy 0.39; y5423.5 spread dx 0.75 dy 0.39
- least-squares fallback (too few edges for correlation) in 1 band(s): y5186 dy

## talent (wide:talent)

- coverage: 16/16 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y1367.5 spread dx 0.59 dy 0.59; y1552.5 spread dx 0.78 dy 0.73; y1737.5 spread dx 0.78 dy 0.73; y1922 spread dx 0.78 dy 0.73
- least-squares fallback (too few edges for correlation) in 2 band(s): y1367.5 dx; y1552.5 dy

## community (173:1456)

- coverage: 24/33 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y5990.5 spread dx 0.92 dy 0.34; y6223.5 spread dx 0.92 dy 0.56; y6456 spread dx 0.45 dy 0.98; y6689 spread dx 0.45 dy 0.83

## footer (173:524)

- coverage: 42/63 visible Figma nodes carry a data-node-id.
- snap expectation is mixed (elements with different fractional offsets) in 3 band(s): y6922 spread dx 0 dy 0.5; y7136 spread dx 0 dy 0.5; y7350.5 spread dx 0 dy 0.5

Images: `qa/cmp/<slug>.side.png` (Figma | build | diff; red = mismatch, magenta = survives the 1px erosion).
