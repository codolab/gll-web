# Skeptic: gradient (94:110)

Verdict: no finding. Harness PASS reproduced (ae 0).

- Colour along the ramp (x 700, y 1/50/101/151/192/200) within 0.4 levels of the Figma render; left (x 5) and right (x 1435) columns identical to centre, so no horizontal component.
- Geometry: 202.031 vs 202.041 tall; bottom stop alpha 0, invisible.
- No text, no children; nothing hidden in JSON. The reference origin is nominal (too few opaque pixels to solve), so ink offset is lsq-only; a pure vertical ramp has no edges for per-element registration, and colour sampling is the meaningful check here.
