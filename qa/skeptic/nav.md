# Skeptic: nav (94:120)

Verdict: no finding. Harness PASS reproduced.

- Per-element ink: logo 94:122 2D NCC dy +0.42 = snap expectation +0.42 (residual 0.00); links 94:132-136 per-cluster |dx| <= 0.06, |dy| <= 0.03, line residual <= 0.10; 94:138 "JOIN US" residual -0.13; pill 94:137 edges top -0.31/bottom +0.31 vs snap -0.34/+0.34 (Chromium paints it 23..73, Figma 23.34..72.66).
- Colour: pill 255,76,119 exact, backdrop exact, text white.
- Copy: 6/6 exact including trailing spaces ("About ", "Programs ", "Events ", "Join us "); "join us" uses textCase UPPER, rendered via CSS uppercase.
- Completeness: coverage 11/19 is the 8 logo VECTORs 94:123-130, which live inside logo.svg (8 paths, fills 2x #66B800, 2x white, 2x #FFAA00, 2x #FF3567 = the node fills). Logo NCC corr 1.00. Not a gap.
- The edge tool flagged the logo bottom (+0.53): artefact of edge-strip sampling on curved thin shapes; whole-logo NCC is exact.
