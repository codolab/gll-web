/**
 * gradient - Figma 94:110. One rectangle, x -416 w 2272, linear fill.
 * Handles (0.5,0) -> (0.5,1) in box space map to (0,0) -> (0,202.04) px:
 * straight down, spanning exactly the box height, so 180deg with stops at the
 * edges whatever the aspect ratio (the third handle only sets the unused
 * perpendicular axis). Figma blends stops unpremultiplied while CSS blends
 * premultiplied; the interior stops are Figma's own values at 25/50/75%,
 * which keeps CSS within a quarter of a level of the render.
 */
const FILL = `linear-gradient(180deg,
  rgb(11 23 34 / 1) 0%,
  rgb(15 24 33.25 / 0.75) 25%,
  rgb(19 25 32.5 / 0.5) 50%,
  rgb(23 26 31.75 / 0.25) 75%,
  rgb(27 27 31 / 0) 100%)`

export default function Gradient() {
  return (
    <div className="relative size-full" data-node-id="94:110">
      <div className="absolute inset-0" style={{ background: FILL }} />
    </div>
  )
}
