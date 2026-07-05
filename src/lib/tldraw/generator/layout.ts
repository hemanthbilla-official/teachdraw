import type { ShapePartial } from '../shapeHelpers'
import { spacingConfig } from './constants'
import type { BoardLayout, LayoutMode, SpacingPreset } from './types'

export function getBoardLayout(mode: LayoutMode, spacing: SpacingPreset): BoardLayout {
  const config = spacingConfig[spacing]
  const frameWidth =
    mode === 'horizontal-cards'
      ? config.horizontalWidth
      : mode === 'whiteboard-map'
        ? config.whiteboardWidth
        : config.verticalWidth

  return {
    mode,
    frameWidth,
    frameGapY: config.frameGapY,
    paddingX: config.paddingX,
    paddingY: config.paddingY,
    contentWidth: frameWidth - config.paddingX * 2,
    titleGap: config.titleGap,
    blockGap: config.blockGap,
    smallGap: config.smallGap,
    columnGap: config.columnGap,
    minFrameHeight: config.minFrameHeight,
    cameraZoom: config.cameraZoom,
  }
}

export function setFrameHeight(shape: ShapePartial, h: number) {
  if (shape.type !== 'frame') return
  ;(shape.props as { h: number }).h = h
}
