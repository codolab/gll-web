# Skeptic: hero (94:85)

Verdict: 1 finding. Harness PASS reproduced (re-captured from :4197 via scripts/harness.mjs into work/hero/).

## Finding H1: 94:106 headline line 2 "shaping tomorrow" is shifted, its final "w" the other way

- What: every glyph cluster from "s" to the last "o" sits 0.56 to 0.82 CSS px LEFT of Figma (line NCC -0.66); the final "w" sits +0.67 px RIGHT. The o-w gap is 1.33 px too wide.
- Snap expectation for text x is 0 (sub-pixel), so the residual is the raw value: -0.66 px on the line, 12/12 clusters >= 0.5.
- Cause (verified in the browser, work/kern.mjs): the `<span className="tracking-normal">w</span>` in Hero.tsx splits the shaping run, so the Inter "ow" kern pair is lost. "shaping tomorrow" as one run minus its trailing tracking = 712.23 px; with the span split = 713.56 px (+1.33). Centred, that pushes the line left 0.66 and the "w" right 0.66, exactly as measured.
- Fix direction: keep "tomorrow" in one run and offset the trailing tracking on the line instead (e.g. a 4.11px right margin/padding on the inline span).
- Line 1 "Empowering leaders" is fine (clusters -0.20..+0.21).
- Evidence (400%, Figma | build | overlay red=Figma cyan=build): work/crops/hero-106-l2-ow.side.png ("o" fringes cyan-left/red-right, "w" red-left/cyan-right: opposite shifts), work/crops/hero-106-l2-start.side.png ("s" and "h" cyan-left: build left).
- Why the harness missed it: the band at y240-719 is dominated by tile edges, which are exact.

## No finding (checked)

- Tiles 94:88-94:102: per-edge sub-pixel positions match round(dom) - figma to <= 0.03 px on every measurable edge; inner photo content NCC residual <= 0.12 (94:94-96 read up to -0.28 only because finding H1's text crosses them).
- 94:107 paragraph (3 lines, 110 clusters): |dx| <= 0.13, |dy| <= 0.02. 94:109 label: residual <= 0.07. 94:108 pill: all four edges within 0.03 of snap.
- Colour: scrim gap 9,22,34 vs 9,23,35 (alpha 0.71 quantised, 1 level); pink/amber 0.8/green tiles under scrim within 1 level; button white; text colours match fills.
- Copy: 3/3 TEXT exact (94:109 textCase UPPER via CSS uppercase). Completeness: 25/25 nodes, nothing hidden in JSON. Bottom 50px corners match at 400% (work/crops/sk5-hero-85-corners.side.png).
