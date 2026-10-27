# Project log: gll-web

## 2026-10-27: first build, desktop frame 94:84

- Source: Figma `Mhl8szCFRd3mDfVsTCGdnG`, frame 94:84 "GLL (1)", 1440x7895, via the
  REST API only (Figma MCP quota on the available seats is ~20 calls a month).
- Method: the Social & Things approach. Fixed canvas, every section at its REST
  `absoluteBoundingBox`, isolated captures, a geometry + raster + ink harness.
- Built by six parallel section agents; harness ported and validated on known
  inputs by a seventh; skeptic pass by three read-only reviewers.
- Font: the design's Inter renders with **Inter 3.19** metrics. The Google Fonts
  Inter 4.0 file drifted up to 6px per line; 3.19 matches to 0.5px.
- Skeptic findings fixed: hero line 2 kerning (a span split the run), ribbon dots
  oversized and clipped, fill-baked photos drifting from rounded crops (tool
  fixed to a sub-pixel Lanczos crop), meet heading 0.4px right.

### Gate (production build, `npm run qa`)

| section | geometry | ae % | verdict |
|---|---|---|---|
| hero | 25/25 | 1.316 | PASS |
| gradient | 1/1 | 0 | PASS |
| logos | 9/9 | 4.063 | FAIL, attributed |
| nav | 11/11 | 1.01 | PASS |
| ribbons | 16/16 | 1.338 | PASS |
| programs | 24/24 | 0.531 | PASS |
| impact | 19/19 | 0.876 | PASS |
| meet | 50/50 | 2.782 | PASS |
| talent | 15/15 | 2.009 | PASS |
| community | 24/24 | 2.583 | PASS |
| footer | 41/41 | 1.965 | PASS |

Logos residual: structural 0, every logo within 0.45 CSS px of its Figma
position. The remainder is resampling of eight small raster logos; placing the
lossless Figma renders at Figma's own device positions scores 2.81%, and
sub-pixel placement by transform measured worse (4.21%). The isolated Figma
render cannot show the two HARD_LIGHT logos as they appear on the page, so the
section is gated against `design/figma/logos.composed.png`.
