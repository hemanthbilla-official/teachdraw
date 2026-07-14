import type { TLShape } from 'tldraw'
import { createGeoCard, createTextShape, type ShapePartial } from '../shapeHelpers'
import type { DrawColor, GeneratedMeta } from './types'

export function renderSmallHeading(
  shapes: ShapePartial[],
  heading: string,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  color: DrawColor,
  meta: GeneratedMeta
): number {
  shapes.push(
    createTextShape({
      x,
      y,
      w,
      text: heading,
      parentId,
      color,
      size: 'm',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x,
      y: y + 34,
      w: Math.min(260, Math.max(96, heading.length * 9)),
      h: 7,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta,
    })
  )

  return 58
}

export function renderCodeLabel(
  shapes: ShapePartial[],
  label: string,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  color: DrawColor,
  meta: GeneratedMeta
): number {
  shapes.push(
    createTextShape({
      x,
      y,
      w,
      text: label,
      parentId,
      color,
      size: 'm',
      boldLineCount: 1,
      meta,
    })
  )

  return 38
}
