import type { ShapePartial } from '../shapeHelpers'
import { verticalCardLayout } from './constants'
import type { BoardLayout } from './types'

export function getBoardLayout(): BoardLayout {
  return {
    ...verticalCardLayout,
    contentWidth: verticalCardLayout.frameWidth - verticalCardLayout.paddingX * 2,
  }
}

export function setFrameHeight(shape: ShapePartial, h: number) {
  if (shape.type !== 'frame') return
  ;(shape.props as { h: number }).h = h
}
