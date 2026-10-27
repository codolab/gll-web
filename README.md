# Global Lithuanian Leaders: web

A pixel-accurate build of Figma frame `94:84` ("GLL (1)") from
[GLL](https://www.figma.com/design/Mhl8szCFRd3mDfVsTCGdnG/GLL?node-id=94-84).

## Run

```bash
npm install
npm run dev        # http://localhost:4196
npm run build
npm run preview    # http://localhost:4197
```

## How the page is put together

The design is a single fixed 1440 x 7895 frame with no mobile counterpart, so
the build reproduces it literally: `src/App.tsx` renders a canvas of exactly
those dimensions and absolutely positions each top-level Figma layer at its own
`absoluteBoundingBox`, in Figma's paint order. The registry is
`design/sections.json`, generated from the Figma REST API by
`scripts/build-registry.mjs`. Viewports narrower than 1440 scale the canvas
down rather than reflow it (`gaps.md` G-01).

Each section lives in `src/sections/` and renders only its own interior.
`CONVENTIONS.md` is the contract.

## Design sources

`.env.local` holds a Figma personal access token (`FIGMA_TOKEN=...`, scope
`file_content:read`). Everything fetched is cached under `design/cache/`.

```bash
node scripts/build-registry.mjs   # design/sections.json + design/nodes/<slug>.json
node scripts/fetch-refs.mjs       # 2x renders design/figma/<slug>.png + source fills
node scripts/assets.mjs ...       # per-section asset export (see CONVENTIONS.md)
```

## Read before shipping

`gaps.md`.
