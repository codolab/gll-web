# Harness validation

Run 2026-10-27T12:15:20.080Z by `node scripts/validate-harness.mjs`. Known inputs only; no build involved.
Gates under test: ae <= 3%, structural <= 0.1% of 8 CSS px cells and no cluster over 2 cells, edge-only thick px <= 0.02% of window, ink |d| < 0.5 CSS px per band and build shift 0.

**25/25 expectations met.**

## Raster: reference against a doctored copy of itself

| section | case | ae % | struct % | edge-only % | thick px | edge-only alone says | build shift (CSS px) | worst band ink measured dx,dy | expected (snap) | residual | method | bands flagged | verdict | failing gates |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| programs | self | 0 | 0 | 100 | 0 | clean | 0,0 | 0,0 | -,- | 0,0 | ncc | 0/7 | PASS | - |
| programs | shift +1 device px x | 1.812 | 0 | 99.4 | 635 | clean | 0.5,0 | 0.5,0 | -,- | 0.5,0 | ncc | 7/7 | FAIL | ink |
| programs | shift +1 CSS px x | 3.023 | 0 | 78.2 | 37529 | defect | 1,0 | 1,0 | -,- | 1,0 | ncc | 7/7 | FAIL | ae, edgeOnly, ink |
| programs | shift +1 CSS px y | 2.425 | 0 | 86.7 | 17504 | defect | 0,1 | 0.01,1 | -,- | 0.01,1 | ncc | 7/7 | FAIL | edgeOnly, ink |
| programs | painted block 48x32 CSS | 0.073 | 0.073 (blob 24) | 5.1 | 5828 | defect | 0,0 | 0.01,0.01 | -,- | 0.01,0.01 | ncc | 0/7 | FAIL | structural, edgeOnly |
| nav | self | 0 | 0 | 100 | 0 | clean | 0,0 | 0,0 | -,- | 0,0 | ncc | 0/1 | PASS | - |
| nav | shift +1 device px x | 1.849 | 0 | 99.9 | 9 | clean | 0.5,0 | 0.5,0 | -,- | 0.5,0 | ncc | 1/1 | FAIL | ink |
| nav | shift +1 CSS px x | 2.684 | 0 | 88 | 1565 | defect | 1,0 | 1,0 | -,- | 1,0 | ncc | 1/1 | FAIL | edgeOnly, ink |
| nav | shift +1 CSS px y | 2.311 | 0 | 90.2 | 1083 | defect | 0,1 | 0,1 | -,- | 0,1 | ncc | 1/1 | FAIL | edgeOnly, ink |
| nav | painted block 48x32 CSS | 1.162 | 1.149 (blob 24) | 5.1 | 5828 | defect | 0,0 | 0.01,-0.01 | -,- | 0.01,-0.01 | ncc | 0/1 | FAIL | structural, edgeOnly |
| nav | shift +1 device px y, text at y 0.5 (snap predicts +0.5) | 1.61 | 0 | 100 | 0 | clean | 0,0.5 | 0,0.5 | 0,0.5 | 0,0 | ncc | 0/1 | PASS | - |
| nav | shift +1 device px y, text at y 0 (nothing predicts it) | 1.61 | 0 | 100 | 0 | clean | 0,0.5 | 0,0.5 | 0,0 | 0,0.5 | ncc | 1/1 | FAIL | ink |
| talent | self | 0 | 0 | 100 | 0 | clean | 0,0 | 0,-0.01 | -,- | 0,-0.01 | ncc+lsq | 0/5 | PASS | - |
| talent | shift +1 device px x | 3.151 | 0 | 99.2 | 437 | clean | 0.5,0 | 0.5,0 | -,- | 0.5,0 | ncc+lsq | 5/5 | FAIL | ae, ink |
| talent | shift +1 CSS px x | 5.258 | 0 | 88.2 | 11516 | defect | 1,0 | 1,0 | -,- | 1,0 | ncc+lsq | 5/5 | FAIL | ae, edgeOnly, ink |
| talent | shift +1 CSS px y | 4.064 | 0.022 (blob 2) | 93.2 | 4680 | defect | 0,1 | 0,1 | -,- | 0,1 | ncc+lsq | 5/5 | FAIL | ae, edgeOnly, ink |
| talent | painted block 48x32 CSS | 0.179 | 0.178 (blob 24) | 5.1 | 5828 | defect | 0,0 | -0.01,-0.41 | -,- | -0.01,-0.41 | ncc+lsq | 0/5 | FAIL | structural, edgeOnly |
| gradient | self (ramp, lsq fallback) | 0 | 0 | 100 | 0 | clean | 0,0 | 0,0 | -,- | 0,0 | ncc+lsq | 0/1 | PASS | - |
| gradient | shift +1 CSS px y (ramp) | 0.495 | 0 | 50 | 2880 | defect | 0,1 | 0,1 | -,- | 0,1 | ncc+lsq | 1/1 | FAIL | edgeOnly, ink |

Reading it: a 1 device px shift leaves only seams, so "edge-only alone says clean" for it. That is exactly the hole; the per-band ink residual closes it and the verdict fails. The painted block survives erosion and trips structural through its contiguous cluster, at any section size. The two nav snap rows are the same pixels: the residual, not the raw measurement, decides, so an offset Chromium imposes passes and the identical offset at an integer y fails. The gradient rows are measured by the least-squares fallback (method lsq), because correlation cannot register a ramp.

## Reference origin solver on synthetic trims

| section | cut off top-left (device px) | solved | residual | ok |
|---|---|---|---|---|
| hero | +26,+14 | +26,+14 | 9.4 | yes |
| hero | +13,+0 | +13,+0 | 9.81 | yes |
| programs | +1,+3 | +1,+3 | 0.78 | yes |
| footer | +0,+0 | +0,+0 | 1.85 | yes |

## Geometry gate on a synthetic probe (meet)

| case | checked | failed | failing ids |
|---|---|---|---|
| probe = Figma boxes | 66 | 0 | - |
| rect 94:204 x+1.5, text 94:200 w+2 | 66 | 2 | 94:200 TEXT origin ok size FAIL; 94:204 RECTANGLE |

## Expectations

| check | want | got | ok |
|---|---|---|---|
| programs self | PASS | PASS | yes |
| programs shift +1 device px x | FAIL | FAIL | yes |
| programs shift +1 CSS px x | FAIL | FAIL | yes |
| programs shift +1 CSS px y | FAIL | FAIL | yes |
| programs painted block 48x32 CSS | FAIL | FAIL | yes |
| nav self | PASS | PASS | yes |
| nav shift +1 device px x | FAIL | FAIL | yes |
| nav shift +1 CSS px x | FAIL | FAIL | yes |
| nav shift +1 CSS px y | FAIL | FAIL | yes |
| nav painted block 48x32 CSS | FAIL | FAIL | yes |
| nav shift +1 device px y, text at y 0.5 (snap predicts +0.5) | PASS | PASS | yes |
| nav shift +1 device px y, text at y 0 (nothing predicts it) | FAIL | FAIL | yes |
| talent self | PASS | PASS | yes |
| talent shift +1 device px x | FAIL | FAIL | yes |
| talent shift +1 CSS px x | FAIL | FAIL | yes |
| talent shift +1 CSS px y | FAIL | FAIL | yes |
| talent painted block 48x32 CSS | FAIL | FAIL | yes |
| gradient self (ramp, lsq fallback) | PASS | PASS | yes |
| gradient shift +1 CSS px y (ramp) | FAIL | FAIL | yes |
| hero trimmed by 26,14 device px | +26,+14 | 26,14 | yes |
| hero trimmed by 13,0 device px | +13,+0 | 13,0 | yes |
| programs trimmed by 1,3 device px | +1,+3 | 1,3 | yes |
| footer trimmed by 0,0 device px | +0,+0 | 0,0 | yes |
| geometry: probe equals Figma | 0 failed | 0 failed | yes |
| geometry: 1.5px box shift and text size-only error | 2 failed, text = size only | 94:200 TEXT origin ok size FAIL; 94:204 RECTANGLE | yes |
