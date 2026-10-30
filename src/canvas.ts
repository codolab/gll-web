/**
 * Figma frames "GLL (1)" 94:84 (1440 x 7895) and 173:310 (1640 x 7993) are
 * fixed canvases. Every section is placed at its own absoluteBoundingBox, in
 * Figma's paint order, so the build is a literal transcription of each frame.
 * Coordinates come from the REST API (scripts/build-registry.mjs, SURFACE=wide
 * for the wide frame) and are not rounded.
 */
import desktop from '../design/sections.json'
import wide from '../design/wide/sections.json'
import type { CanvasSurface } from './surface'

export type SectionSpec = (typeof desktop.sections)[number] | (typeof wide.sections)[number]

export interface Canvas {
  w: number
  h: number
  /** Paint order = Figma child order. Later entries stack above earlier ones. */
  sections: SectionSpec[]
}

export const CANVASES: Record<CanvasSurface, Canvas> = {
  desktop: { ...desktop.canvas, sections: desktop.sections },
  wide: { ...wide.canvas, sections: wide.sections },
}
