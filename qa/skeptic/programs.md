# Skeptic: programs (94:156)

Verdict: no finding.

Method: same as `meet.md`, a fresh harness capture with per-element and per-line ink windows. The reference origin is 0,0; dX is 0 and dY is +0.074. Every node sits at local offset .926 + integer, so the snap expectation is 0 everywhere. Scripts and crops are in `qa/skeptic/work/pim/`.

- **Per-element ink:** all 24 data-node-id elements have residuals of 0.13 or less. The largest is the photo stack 94:159 to 94:162 at NCC +0.13, but 2D SSD puts it at -0.04, so the NCC figure is a texture artefact.
- **Text:** every line of every TEXT node, split into thirds, is within 0.09. That covers the 2 heading lines, "Programs", "SEE ALL PROGRAMS", the 3 card numbers, the 3 card titles and all body lines.
- **Tracking check:** "SEE ALL PROGRAMS" carries -0.128 tracking with no compensation, which predicts +0.064. It measures +0.05, which confirms the trailing-tracking mechanism behind the near-miss on meet's 94:200.
- **Geometry:** worst 0.00.
- **Colour:**
  - Computed colours equal the JSON: #0b1722, #05325b, white, and the 94:162 overlay at opacity 0.49.
  - Mean colour over the photo plus overlay is within 0.5 levels of the ref.
  - The BACKGROUND_BLUR (160) on 94:159 is not reproduced. It would only blur the flat section fill behind an opaque photo, and the corner crop is neutral (`programs-photo-corner-400.png`, 2D shift 0.00,0.00).
- **Copy:** 12/12 TEXT nodes match exactly, including the ’ in "GLL Forum ’26", the \n\n paragraph breaks and the \n in the heading. No textCase.
- **Completeness:** 24/24 visible nodes are tagged, and no hidden nodes exist.
- **Crops:**
  - `programs-seeall-400.png`: the pill and its label.
  - `programs-card1-corner-400.png`: radius 20 on the navy card.
  - `programs-photo-corner-400.png`: the photo frame corner.

  All three are neutral in the anaglyph.
