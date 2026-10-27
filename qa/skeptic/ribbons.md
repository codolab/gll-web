# Skeptic: ribbons (94:139)

Verdict: 1 minor finding. Harness PASS reproduced.

## Finding R1: dots are 38.0 px, not 37.65 px, and two are clipped flat on the right

- 94:145 (amber) and 94:153 (green): the right rim is hard-clipped to a straight vertical edge at x = 799.00 / 1326.00 over ~6 CSS px of rim (12 device rows), where Figma's rim curves out to 799.25 / 1326.25. Cause: the 37.641 px img box at x .641 snaps to 37 px wide (762..799), and object-none clips the 38 px SVG to it.
- All four dots: the SVG path spans ~0..38.0 in its 38 viewBox, so the drawn dot is ~38.0 diameter vs Figma's 37.649. Measured (coverage, per row/column): right rim +0.32..+0.64 px (pink 94:150, green 94:142), bottom rim up to +0.66; amber/green-2 right rim +0.63..+0.90 above/below the clip, left rim +0.33 (= snap +0.36). Net, after the snap, the rims sit +0.3..+0.55 px out on the right/bottom; centroids are within 0.17 px of the snap expectation, so the harness's NCC sees nothing.
- Evidence: work/crops/ribbons-145-amberdot.side.png (400%: the build dot's right side is visibly flat), work/crops/ribbons-145-rightrim-800.side.png and ribbons-153-rightrim-800.side.png (800%: Figma's antialiased round rim vs the build's straight hard edge). Row data: work/sk5-rim.mjs.

## No finding (checked)

- Text: all 5 phrases, 54 glyph clusters, per-cluster |dx| <= 0.19, |dy| <= 0.02; light 300 + semibold 600 split matches the override table.
- Colour: dots 102,184,0 / 255,170,0 / 255,76,119 / 102,184,0 exact; text 11,23,34.
- Copy: 5/5 exact. Completeness: 16/16 nodes, nothing hidden.
