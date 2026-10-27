# Skeptic review: community (94:276)

Build: http://localhost:4197/?isolate=community, captured through `scripts/harness.mjs` `captureSection` (byte-identical to `qa/out/community.build.png`). Reference: harness `placedRef` + `solveRefOrigin` (origin 0,0). Paint-snap expectation as in `snapItems`: dY = -0.2227, so an element at a .72 canvas row expects +0.50, at a .22/.23 row 0.00; text x expects 0.

## Verdict: no finding

## Near miss (below the gate, reported for the record)

- 94:298 "Go further, together." (white, centred, on the navy ellipse): line 1 "Go further," sits left of Figma by 0.39 CSS px (words -0.40 / -0.39, all 10 glyphs -0.32 to -0.43, so it is a line-start offset, not advance drift). Line 2 "together." is at -0.02. Edge crossings: G left edge 825.541 vs 825.821 (-0.28), r right edge 970.156 vs 970.538 (-0.38). Probably Chromium and Figma centring the soft-wrapped line with a different width at the trailing comma+space. Under 0.5. Crops: `qa/skeptic/work/crops/community-gofurther-left.side.png` (fringe on both vertical sides of the G) vs `community-together-left.side.png` (faint).

## What the high ae and the 184 thick px are (harness artefacts)

- ae 2.58% is the two photos under the 1-device-px paint snap: members-flag 13.2%, conversations 6.5%, everything else 1.7%. With the build read one device row lower (the snap expectation for these .72-row elements) total ae is 0.70%, conversations 0.1%, flag 1.0%. Photo colour after registration: mean signed difference 0.0 to 0.2 levels, mean |diff| 1.6 / 2.0 (WebP).
- All 184 thick px vanish at that registration (184 to 0). They sit inside the conversations photo (404..733, 6100..6280) and a few in the flag photo.

## Checked, no finding

- Ink, per element (2D NCC, +/-6 device px, parabolic sub-pixel): all 24 tagged elements, every box edge (middle half of each side), 23 text lines, 45 words, 265 glyphs. Max residual 0.05 on any edge, line or glyph other than 94:298 line 1. The `lowerBaseline` 1px pads (94:280, 94:292) land exactly: residual 0.00. Photo quadrants (both images, 4 each) all 0.00,+0.50 vs expected 0,+0.50, so no crop or scale error. Arrows 94:285/94:305 0.00,+0.50.
- Shapes: CSS radii order matches every rectangleCornerRadii (TL TR BR BL): 94:282 24/132/132/24, 94:289 24/184/184/24, 94:299 24/160/24/24, 94:300 24/136/24/24, 94:287 r24, 94:296 pill, 94:288 circle; cornerSmoothing 0 on all. Per-row and per-column sub-pixel crossing of every solid-tile corner (26 corners): mean deviation 0.02 to 0.08 CSS px (a uniform AA inset), single-row max 0.65 only at tangent points of the 132 to 184 radii where the crossing is ill-conditioned. Photo-tile corners checked at 400%: `crops/community-c299-tl.side.png`, `community-c299-tr.side.png`, `community-c287-tr.side.png`, curves coincide.
- Colour (median of flat patches, ref / build / JSON all equal): periwinkle 204,216,244; green 102,184,0; navy 5,50,91; pink 255,112,142; white 255,255,255; ink pill and text 11,23,34. White text cores (94:297, 94:298) 255,255,255. Opacity 1 everywhere, as in the JSON.
- Copy: 12 TEXT nodes match `characters` exactly (curly apostrophe in "Lithuania’s", "10,000+", line breaks); no textCase in the JSON, computed text-transform none; letter-spacing -2 / -2 / -0.128 as specified.
- Completeness: 7 untagged visible nodes are paintless auto-layout frames (94:277, 278, 290, 293, 294) and the two arrow vectors (94:286, 94:306) baked into the arrow SVGs (stroke #0B1722, width 2). No node is visible:false; the two hidden white fills on 94:285/94:305 are not rendered.
