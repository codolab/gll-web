# GLL parity report

Build: http://localhost:4210/ · captured 2026-10-29T11:04:20.995Z · 2x, each section isolated (`?isolate=<slug>`) on its backdrop.
Verdicts: 0 PASS, 11 FAIL, 0 STUB, 0 ERROR.

| section | state | ref origin (dev px) | geometry pass | worst px | text origin/size fail | ae % | struct % (blob) | edge-only % (thick px) | build shift meas / exp | worst band | ink measured dx,dy | ink expected (snap) | ink residual | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hero | built | 0,0 | 0/0 | - | 0/0 of 0 | 57.207 | 32.26 (1614) | 15.3 (1959357) | -5,0 / -0.01,0 | y0+240 | n/a,-0.19 | -0.02,0 | n/a,-0.19 | FAIL (geometry, ae, structural, edgeOnly) |
| gradient | built | nominal? | 0/0 | - | 0/0 of 0 | 0 | 0 | 100 (0) | 0,0 / -0.01,0 | y0+180.5 | n/a,-0.04 | -0.01,0 | n/a,-0.04 | FAIL (geometry) |
| logos | built | -1,+0 | 0/0 | - | 0/0 of 0 | 10.951 | 14.851 (92) | 48 (33769) | 0,0 / 0.47,0.1 | y1013.5+77 | n/a,0.02 | 0.49,0.11 | n/a,-0.09 | FAIL (geometry, ae, structural, edgeOnly) |
| nav | built | -1,+0 | 0/0 | - | 0/0 of 0 | 2.319 | 1.843 (44) | 63.6 (4532) | 0,0 / 0.27,0.01 | y10.5+74 | 0.17,0 | 0.27,0.01 | -0.1,-0.01 | FAIL (geometry, structural, edgeOnly) |
| ribbons | built | 0,0 | 0/0 | - | 0/0 of 0 | 2.968 | 2.504 (45) | 37.7 (22215) | 0,0 / 0,0.01 | y2266+84 | 0.03,0.01 | 0,0.01 | 0.03,0 | FAIL (geometry, structural, edgeOnly) |
| programs | built | 0,0 | 0/0 | - | 0/0 of 0 | 23.148 | 19.08 (4092) | 17.7 (1027168) | -8,0.5 / 0,0.01 (search edge) | y3871.5+208.5 | -7.4,0.92 | 0,0.01 | -7.4,0.91 [7/7 bands >= 0.5] | FAIL (geometry, ae, structural, edgeOnly, ink) |
| impact | built | 0,0 | 0/0 | - | 0/0 of 0 | 5.191 | 6.694 (121) | 34.8 (127851) | -5,0 / 0,0.23 | y4300.5+220.5 | -5,0.24 | 0,0.23 | -5,0.01 [1/3 bands >= 0.5] | FAIL (geometry, ae, structural, edgeOnly, ink) |
| meet | built | +0,+23 | 0/0 | - | 0/0 of 0 | 19.036 | 12.947 (903) | 16.2 (494822) | 0,0 / 0.08,0.27 | y5561+60.5 | n/a,-0.34 | 0.06,-0.04 | n/a,-0.3 | FAIL (geometry, ae, structural, edgeOnly) |
| talent | built | +0,-1 | 0/0 | - | 0/0 of 0 | 3.211 | 2.239 (278) | 55.3 (32099) | 0,0 / -0.06,-0.07 | y1922+184.5 | -5.58,n/a | 0.04,0.02 | -5.62,n/a [1/5 bands >= 0.5] | FAIL (geometry, ae, structural, edgeOnly, ink) |
| community | built | 0,0 | 0/0 | - | 0/0 of 0 | 38.544 | 37.671 (8427) | 7.6 (2502247) | 0,0 / 0,0.43 | y6689+233 | n/a,3.56 | 0,0.31 | n/a,3.25 [1/5 bands >= 0.5] | FAIL (geometry, ae, structural, edgeOnly, ink) |
| footer | built | 0,0 | 0/0 | - | 0/0 of 0 | 22.51 | 12.039 (1409) | 20.4 (789744) | 0,0 / 0,0.06 | y7350.5+214 | n/a,0.2 | 0,0.01 | n/a,0.19 | FAIL (geometry, ae, structural, edgeOnly) |

Gates: geometry boxes/images/vectors max |dx,dy,dw,dh| <= 1px; text origin <= 1px and text size <= 1px, scored separately. ae <= 3% (4% fuzz). structural <= 0.1% of 8 CSS px cells (12% fuzz) and no contiguous cluster over 2 cells. edge-only: px surviving a 1px erosion of the 10% difference mask <= 0.02% of the window. ink: in every band, |measured - expected| < 0.5 CSS px on both axes.
`ref origin` is where Figma put its (possibly trimmed) render relative to the node box, in device px, solved against Figma's own composite; non-zero means the render is trimmed, so the old assumed-origin diff was misregistered. `build shift` is the best whole-section registration of our capture onto that reference, shown against the snap expectation. Raster gates are measured at the true registration, never at the best one.
`ink expected (snap)` is the offset Chromium itself imposes: it paints boxes, images and text at round(y) of the canvas-absolute coordinate (whole CSS px, even at 2x; horizontally boxes and images only, text is sub-pixel), while the reference sits at round(2*section origin) device px. Expected = round(y) - y minus that placement, averaged over the painted elements in the band (edges weigh 2 px of ink, text and images their area). The gate is the residual. `worst band` is the band with the largest residual; ink figures are CSS px, ours minus Figma's; n/a = not measurable (no ink, or no edges and a flat least-squares fit).

## hero (wide:hero)

- coverage: 0/24 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:85, 94:86, 94:87, 94:88, 94:89, 94:90, 94:91, 94:92
- structural: largest block of differing 8px cells is 1614 cells, 848x320 at 328,320 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y0 spread dx 0.81 dy 0; y240 spread dx 0.81 dy 0.81; y479.5 spread dx 0.81 dy 0.92; y719.5 spread dx 0.81 dy 0.39

## gradient (173:336)

- reference origin: too few opaque reference pixels on the canvas (1829) to solve; nominal origin assumed.
- coverage: 0/1 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:110
- least-squares fallback (too few edges for correlation) in 1 band(s): y0 dy

## logos (173:337)

- reference is trimmed: 3413x208 vs box 3412x208; its origin solves to +-1,+0 device px against Figma's composite (residual 15.85 vs 17.16 at nominal); the node render bounds put it at +0,+0, which the snap expectation uses.
- coverage: 0/10 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:111, 94:112, 94:113, 94:114, 94:115, 94:116, 94:117, 94:118
- structural: largest block of differing 8px cells is 92 cells, 168x56 at 1096,1024 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y1013.5 spread dx 0.73 dy 0.61

## nav (173:347)

- reference is trimmed: 3171x191 vs box 3171x190; its origin solves to +-1,+0 device px against Figma's composite (residual 3.07 vs 3.99 at nominal); the node render bounds put it at +0,+0, which the snap expectation uses.
- coverage: 0/19 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:120, 94:121, 94:122, 94:131, 94:132, 94:133, 94:134, 94:135
- structural: largest block of differing 8px cells is 44 cells, 72x80 at 43.5,8 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 1 band(s): y10.5 spread dx 0.33 dy 0.75

## ribbons (173:366)

- coverage: 0/19 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:139, 94:140, 94:141, 94:142, 94:143, 94:144, 94:145, 94:146
- structural: largest block of differing 8px cells is 45 cells, 104x64 at 1352,2267 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 2 band(s): y2266 spread dx 0.66 dy 0.36; y2394 spread dx 0.64 dy 0.36

## programs (173:386)

- coverage: 0/25 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:156, 94:157, 94:158, 94:159, 94:160, 94:161, 94:162, 94:163
- structural: largest block of differing 8px cells is 4092 cells, 936x672 at 336,2947 (canvas CSS px).
- ink off in 7 band(s), measured / expected / residual (CSS px): y2619+208.5 dx n/a / 0 / n/a, dy 0.91 / 0.01 / 0.9 (vertical only, <=1px: likely baseline rounding); y2827.5+209 dx n/a / 0 / n/a, dy 0.92 / 0.01 / 0.91 (vertical only, <=1px: likely baseline rounding); y3036.5+208.5 dx n/a / 0 / n/a, dy 0.92 / 0.01 / 0.91 (vertical only, <=1px: likely baseline rounding); y3245+209 dx n/a / 0 / n/a, dy 0.92 / 0.01 / 0.91 (vertical only, <=1px: likely baseline rounding); y3454+208.5 dx n/a / 0 / n/a, dy 0.91 / 0.01 / 0.9 (vertical only, <=1px: likely baseline rounding); y3662.5+209 dx n/a / 0 / n/a, dy 0.91 / 0.01 / 0.9 (vertical only, <=1px: likely baseline rounding); y3871.5+208.5 dx -7.4 / 0 / -7.4, dy 0.92 / 0.01 / 0.91

## impact (173:411)

- coverage: 0/19 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:180, 94:181, 94:182, 94:183, 94:184, 94:185, 94:186, 94:187
- structural: largest block of differing 8px cells is 121 cells, 224x64 at 912,4184 (canvas CSS px).
- ink off in 1 band(s), measured / expected / residual (CSS px): y4300.5+220.5 dx -5 / 0 / -5, dy 0.24 / 0.23 / 0.01

## meet (173:430)

- reference is trimmed: 3497x1466 vs box 3496x1488; its origin solves to +0,+23 device px against Figma's composite (residual 5.9 vs 38.9 at nominal); the node render bounds put it at +0,+22.55, which the snap expectation uses.
- coverage: 0/88 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:199, 94:200, 94:201, 94:230, 94:231, 94:234, 94:235, 94:236
- structural: largest block of differing 8px cells is 903 cells, 360x344 at 768,5013.5 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 6 band(s): y5013.5 spread dx 0.7 dy 0; y5186 spread dx 0.93 dy 0; y5377.5 spread dx 0.93 dy 0; y5423.5 spread dx 0.76 dy 0

## talent (wide:talent)

- reference is trimmed: 1996x1734 vs box 1996x1734; its origin solves to +0,+-1 device px against Figma's composite (residual 3.41 vs 6.06 at nominal); the node render bounds put it at +0,+-1, which the snap expectation uses.
- coverage: 0/16 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:935, 94:261, 94:262, 94:263, 94:264, 94:266, 94:270, 94:269
- structural: largest block of differing 8px cells is 278 cells, 248x120 at 1184,1888 (canvas CSS px).
- ink off in 1 band(s), measured / expected / residual (CSS px): y1922+184.5 dx -5.58 / 0.04 / -5.62, dy n/a / 0.02 / n/a
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y1367.5 spread dx 0.59 dy 0.59; y1552.5 spread dx 0.78 dy 0.73; y1737 spread dx 0.78 dy 0.73; y1922 spread dx 0.78 dy 0.73
- least-squares fallback (too few edges for correlation) in 2 band(s): y1367.5 dx; y1552.5 dy

## community (173:1456)

- coverage: 0/33 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:276, 94:279, 94:280, 94:281, 94:282, 94:283, 94:284, 94:285
- structural: largest block of differing 8px cells is 8427 cells, 1512x752 at 64,6085.5 (canvas CSS px).
- ink off in 1 band(s), measured / expected / residual (CSS px): y6689+233 dx n/a / 0 / n/a, dy 3.56 / 0.31 / 3.25
- snap expectation is mixed (elements with different fractional offsets) in 4 band(s): y5990.5 spread dx 0 dy 0.5; y6223.5 spread dx 0 dy 0.5; y6456 spread dx 0 dy 0.5; y6689 spread dx 0 dy 0.5

## footer (173:524)

- coverage: 0/63 visible Figma nodes carry a data-node-id.
- ids not in the Figma frame: 94:307, 94:308, 94:309, 94:312, 94:313, 94:315, 94:316, 94:317
- structural: largest block of differing 8px cells is 1409 cells, 336x520 at 1240,6986 (canvas CSS px).
- snap expectation is mixed (elements with different fractional offsets) in 3 band(s): y6922 spread dx 0 dy 0.5; y7136 spread dx 0 dy 0.5; y7350.5 spread dx 0 dy 0.5

Images: `qa/cmp/<slug>.side.png` (Figma | build | diff; red = mismatch, magenta = survives the 1px erosion).
