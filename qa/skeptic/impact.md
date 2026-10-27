# Skeptic: impact (94:180)

Verdict: no finding.

Method: same as `meet.md`, a fresh harness capture with per-element and per-line ink windows. The reference origin is 0,0, so dX and dY are both 0. Every node sits at local y .781 + integer, so the expected dy is +0.22 to +0.23 (Chromium paints at round(y)) and the expected dx is 0. Scripts and crops are in `qa/skeptic/work/pim/`.

- **Per-element ink:** all 19 elements have residuals of 0.06 or less. Every text line, split into thirds, is within 0.06: "Global", "impact", the 3 numbers and the 3 captions, including both lines of 94:198.
- **Hairlines 94:191 and 94:195:** the ink centroid is dy +0.25 against an expected +0.22, so the residual is +0.03. The build paints 2 full device rows where the ref antialiases over 3, which is a seam rather than a shift.
- **Geometry:** worst 0.02.
- **Colour:**
  - Fills: #ccd8f4 and ink #0b1722 are exact.
  - Hairline: ink at 0.88 renders #232f3c, against the ref's #232e3c (1/255).
  - Pill photo: the mean is within 0.12 levels.
  - 94:185 has corner radius 58 but the img carries no CSS radius. The rounding is baked into `pill.webp`, and `impact-pill-leftcorner-400.png` shows a matching arc.
- **Copy:** 8/8 TEXT nodes match exactly. No textCase.
- **Completeness:** 19/19 visible nodes are tagged, and no hidden nodes exist.
- **Crops:** `impact-10000-400.png` shows only the expected +0.23 vertical snap fringe, and `impact-pill-leftcorner-400.png` is neutral.
