import type { TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawFrame } from '@/types/teachdraw'
import { createArrow, createGeoCard, createTextShape, type ShapePartial } from '../shapeHelpers'
import {
  getRenderableBlocks,
  isCalloutBlock,
  isCodeVisualBlock,
  isComparisonBlock,
  isCorrectBlock,
  isFlowLikeBlock,
  isMistakeBlock,
} from './classification'
import { renderCodeBlockStack } from './codeCardRenderers'
import { mergeGroupedComparisonBlocks } from './comparisonGrouping'
import { renderComparisonBlock } from './comparisonRenderer'
import { buildPlainBody, buildTextCardText, getVisibleFrameTitle, hasNonCodeText } from './content'
import { renderFlowBlock } from './flowRenderer'
import { renderMistakeFixPanel } from './mistakeFixRenderer'
import { estimateWrappedLines } from './measurements'
import { getCalloutColor, getCalloutLabel, getTextColor } from './palette'
import type { BoardLayout, DrawColor, GeneratedMeta, GenerateTeachDrawOptions } from './types'

type WhiteboardLane = 'support' | 'visual' | 'callout'

type RenderedWhiteboardItem = {
  x: number
  y: number
  w: number
  h: number
}

type RenderedLane = {
  height: number
  items: RenderedWhiteboardItem[]
}

export function renderWhiteboardFrameContent(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  parentId: TLShape['id'],
  layout: BoardLayout,
  options: GenerateTeachDrawOptions,
  frameIndex: number
): number {
  const meta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const title = getVisibleFrameTitle(frame)
  const titleHeight = renderWhiteboardHeader(shapes, title, parentId, layout, pickWhiteboardTitleColor(frameIndex), meta)
  const blocks = mergeGroupedComparisonBlocks(getRenderableBlocks(frame, title))
  const contentX = layout.paddingX
  const contentY = layout.paddingY + titleHeight

  if (blocks.length === 0) return contentY

  const renderedHeight = renderWhiteboardMap(shapes, blocks, parentId, contentX, contentY, layout.contentWidth, meta, options, layout)
  return contentY + renderedHeight
}

function renderWhiteboardHeader(
  shapes: ShapePartial[],
  title: string,
  parentId: TLShape['id'],
  layout: BoardLayout,
  color: DrawColor,
  meta: GeneratedMeta
): number {
  const titleLines = estimateWrappedLines(title, layout.contentWidth, 28)
  const titleTextHeight = Math.max(58, titleLines * 40)

  shapes.push(
    createTextShape({
      x: layout.paddingX,
      y: layout.paddingY,
      w: layout.contentWidth,
      text: title,
      parentId,
      color,
      font: 'draw',
      size: 'xl',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: layout.paddingX,
      y: layout.paddingY + titleTextHeight + 2,
      w: Math.min(560, Math.max(190, title.length * 12)),
      h: 7,
      text: '',
      parentId,
      color,
      fill: 'solid',
      dash: 'draw',
      meta,
    })
  )

  return Math.max(layout.titleGap, titleTextHeight + 30)
}

function renderWhiteboardMap(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout
): number {
  const lanes = splitWhiteboardLanes(blocks)

  if (lanes.visual.length === 0) {
    return renderWhiteboardConceptGrid(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
  }

  const laneGap = layout.columnGap
  const laneLayout = getWhiteboardLaneLayout(x, w, laneGap, lanes.support.length > 0, lanes.callout.length > 0)
  const support = lanes.support.length
    ? renderWhiteboardLane(shapes, lanes.support, parentId, laneLayout.supportX, y, laneLayout.supportW, frameMeta, options, layout, 'support')
    : emptyLane()
  const visual = renderWhiteboardVisualLane(shapes, lanes.visual, parentId, laneLayout.visualX, y, laneLayout.visualW, frameMeta, options, layout)
  const callout = lanes.callout.length
    ? renderWhiteboardLane(shapes, lanes.callout, parentId, laneLayout.calloutX, y, laneLayout.calloutW, frameMeta, options, layout, 'callout')
    : emptyLane()

  connectWhiteboardLanes(shapes, parentId, support.items[0], visual.items[0], frameMeta)
  connectWhiteboardLanes(shapes, parentId, visual.items[0], callout.items[0], frameMeta)

  return Math.max(support.height, visual.height, callout.height)
}

function splitWhiteboardLanes(blocks: TeachDrawBlock[]): Record<WhiteboardLane, TeachDrawBlock[]> {
  const lanes: Record<WhiteboardLane, TeachDrawBlock[]> = {
    support: [],
    visual: [],
    callout: [],
  }

  blocks.forEach((block) => {
    if (isCalloutBlock(block)) {
      lanes.callout.push(block)
      return
    }

    if (isPrimaryWhiteboardBlock(block)) {
      lanes.visual.push(block)
      return
    }

    lanes.support.push(block)
  })

  return lanes
}

function isPrimaryWhiteboardBlock(block: TeachDrawBlock): boolean {
  return isCodeVisualBlock(block) || isComparisonBlock(block) || isFlowLikeBlock(block) || isMistakeBlock(block) || isCorrectBlock(block)
}

function getWhiteboardLaneLayout(
  x: number,
  w: number,
  gap: number,
  hasSupport: boolean,
  hasCallout: boolean
): {
  supportX: number
  supportW: number
  visualX: number
  visualW: number
  calloutX: number
  calloutW: number
} {
  if (!hasSupport && !hasCallout) {
    return { supportX: x, supportW: 0, visualX: x, visualW: w, calloutX: x + w, calloutW: 0 }
  }

  if (!hasSupport) {
    const calloutW = Math.max(260, Math.round((w - gap) * 0.26))
    const visualW = w - calloutW - gap
    return { supportX: x, supportW: 0, visualX: x, visualW, calloutX: x + visualW + gap, calloutW }
  }

  if (!hasCallout) {
    const supportW = Math.round((w - gap) * 0.32)
    const visualW = w - supportW - gap
    return { supportX: x, supportW, visualX: x + supportW + gap, visualW, calloutX: x + w, calloutW: 0 }
  }

  const usable = w - gap * 2
  const supportW = Math.round(usable * 0.28)
  const visualW = Math.round(usable * 0.52)
  const calloutW = usable - supportW - visualW
  return {
    supportX: x,
    supportW,
    visualX: x + supportW + gap,
    visualW,
    calloutX: x + supportW + gap + visualW + gap,
    calloutW,
  }
}

function renderWhiteboardConceptGrid(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout
): number {
  const columnCount = blocks.length <= 1 ? 1 : blocks.length === 2 ? 2 : 3
  const gap = layout.columnGap
  const colW = Math.floor((w - gap * (columnCount - 1)) / columnCount)
  const cursors = Array.from({ length: columnCount }, () => y)

  blocks.forEach((block, index) => {
    const column = index % columnCount
    const blockX = x + column * (colW + gap)
    const blockY = cursors[column]
    const height = renderWhiteboardBlock(shapes, block, parentId, blockX, blockY, colW, frameMeta, options, layout, 'support')
    if (height > 0) cursors[column] += height + layout.blockGap
  })

  return Math.max(...cursors) - y - layout.blockGap
}

function renderWhiteboardLane(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  lane: WhiteboardLane
): RenderedLane {
  const items: RenderedWhiteboardItem[] = []
  let cursorY = y

  blocks.forEach((block, index) => {
    const offset = lane === 'visual' ? 0 : (index % 2) * Math.min(18, layout.smallGap)
    const blockX = x + offset
    const blockW = Math.max(220, w - offset)
    const height = renderWhiteboardBlock(shapes, block, parentId, blockX, cursorY, blockW, frameMeta, options, layout, lane)
    if (height > 0) {
      items.push({ x: blockX, y: cursorY, w: blockW, h: height })
      cursorY += height + layout.blockGap
    }
  })

  return { height: Math.max(0, cursorY - y - layout.blockGap), items }
}

function renderWhiteboardVisualLane(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout
): RenderedLane {
  const items: RenderedWhiteboardItem[] = []
  let cursorY = y

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    const next = blocks[index + 1]

    if (isMistakeBlock(block) && next && isCorrectBlock(next) && w >= 720) {
      const gap = Math.max(24, Math.round(layout.columnGap * 0.7))
      const panelW = Math.floor((w - gap) / 2)
      const mistakeHeight = renderMistakeFixPanel(shapes, block, parentId, x, cursorY, panelW, frameMeta, 'Mistake', 'red', options.flowOrientation)
      const correctHeight = renderMistakeFixPanel(
        shapes,
        next,
        parentId,
        x + panelW + gap,
        cursorY,
        panelW,
        frameMeta,
        'Correct',
        'green',
        options.flowOrientation
      )
      const rowHeight = Math.max(mistakeHeight, correctHeight)
      items.push({ x, y: cursorY, w, h: rowHeight })
      cursorY += rowHeight + layout.blockGap
      index += 1
      continue
    }

    const height = renderWhiteboardBlock(shapes, block, parentId, x, cursorY, w, frameMeta, options, layout, 'visual')
    if (height > 0) {
      items.push({ x, y: cursorY, w, h: height })
      cursorY += height + layout.blockGap
    }
  }

  return { height: Math.max(0, cursorY - y - layout.blockGap), items }
}

function renderWhiteboardBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  lane: WhiteboardLane
): number {
  if (isComparisonBlock(block)) {
    return renderComparisonBlock(shapes, block, parentId, x, y, w, frameMeta)
  }

  if (isFlowLikeBlock(block)) {
    return renderFlowBlock(shapes, block, parentId, x, y, w, frameMeta, options.flowOrientation)
  }

  if (isMistakeBlock(block)) {
    return renderMistakeFixPanel(shapes, block, parentId, x, y, w, frameMeta, 'Mistake', 'red', options.flowOrientation)
  }

  if (isCorrectBlock(block)) {
    return renderMistakeFixPanel(shapes, block, parentId, x, y, w, frameMeta, 'Correct', 'green', options.flowOrientation)
  }

  if (isCodeVisualBlock(block)) {
    return renderWhiteboardCodeBlock(shapes, block, parentId, x, y, w, frameMeta, layout)
  }

  if (isCalloutBlock(block) || lane === 'callout') {
    return renderWhiteboardCallout(shapes, block, parentId, x, y, w, frameMeta)
  }

  return renderWhiteboardNote(shapes, block, parentId, x, y, w, frameMeta)
}

function renderWhiteboardCodeBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  layout: BoardLayout
): number {
  let cursorY = y

  if (hasNonCodeText(block)) {
    const textHeight = renderWhiteboardNote(shapes, block, parentId, x, cursorY, w, frameMeta, 'blue')
    cursorY += textHeight + layout.smallGap
  }

  const codeHeight = renderCodeBlockStack(shapes, block, parentId, x, cursorY, w, frameMeta, {
    showHeading: !hasNonCodeText(block),
  })

  return cursorY + codeHeight - y
}

function renderWhiteboardNote(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  colorOverride?: DrawColor
): number {
  const text = buildTextCardText(block)
  if (!text) return 0

  const color = colorOverride ?? getTextColor(block)
  const h = estimateLooseTextHeight(text, w, 82)

  shapes.push(
    createTextShape({
      x,
      y: y + 4,
      w,
      text,
      parentId,
      color,
      font: 'draw',
      size: 'm',
      boldLineCount: 1,
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )

  return h
}

function renderWhiteboardCallout(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
): number {
  const label = getCalloutLabel(block)
  const body = buildPlainBody(block)
  const text = [label, body].filter(Boolean).join('\n\n')
  if (!text) return 0

  const color = getCalloutColor(block)
  const stripeW = 8
  const textGap = 18
  const textW = Math.max(180, w - stripeW - textGap)
  const h = estimateLooseTextHeight(text, textW, 88)

  shapes.push(
    createGeoCard({
      x,
      y: y + 6,
      w: stripeW,
      h: Math.max(54, h - 12),
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    }),
    createTextShape({
      x: x + stripeW + textGap,
      y: y + 4,
      w: textW,
      text,
      parentId,
      color,
      font: 'draw',
      size: 'm',
      boldLineCount: 1,
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )

  return h
}

function connectWhiteboardLanes(
  shapes: ShapePartial[],
  parentId: TLShape['id'],
  from: RenderedWhiteboardItem | undefined,
  to: RenderedWhiteboardItem | undefined,
  meta: GeneratedMeta
) {
  if (!from || !to) return
  if (to.x <= from.x) return

  shapes.push(
    createArrow({
      x: from.x + from.w + 10,
      y: from.y + Math.min(from.h * 0.5, 78),
      endX: to.x - 12,
      endY: to.y + Math.min(to.h * 0.5, 78),
      parentId,
      color: 'grey',
      dash: 'draw',
      meta,
    })
  )
}

function emptyLane(): RenderedLane {
  return { height: 0, items: [] }
}

function pickWhiteboardTitleColor(index: number): DrawColor {
  const colors: DrawColor[] = ['blue', 'green', 'orange', 'violet']
  return colors[index % colors.length]
}

function estimateLooseTextHeight(text: string, width: number, minimum: number): number {
  const lines = estimateWrappedLines(text, Math.max(180, width), Math.max(22, Math.floor(width / 11)))
  return Math.max(minimum, lines * 30 + 18)
}
