/**
 * Figma frame "GLL (1)" (94:84) is a fixed 1440 x 7895 canvas. Every section is
 * placed at its own absoluteBoundingBox, in Figma's paint order, so the build
 * is a literal transcription of the frame. Coordinates come from the REST API
 * (scripts/build-registry.mjs) and are not rounded.
 */
import data from '../design/sections.json'

export type SectionSpec = (typeof data.sections)[number]

export const CANVAS_W = data.canvas.w
export const CANVAS_H = data.canvas.h

/** Paint order = Figma child order. Later entries stack above earlier ones. */
export const SECTIONS: SectionSpec[] = data.sections
