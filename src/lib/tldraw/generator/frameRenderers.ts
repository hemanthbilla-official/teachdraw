import type { TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawFrame, TeachDrawLayoutHint } from '@/types/teachdraw'
import { createGeoCard, createTextShape, type ShapePartial } from '../shapeHelpers'
import {
  getRenderableBlocks,
  isCalloutBlock,
  isCodeSupportAfterBlock,
  isCodeVisualBlock,
  isComparisonBlock,
  isCorrectBlock,
  isFlowLikeBlock,
  isMistakeBlock,
  pickContentLayout,
} from './classification'
import { renderAnyBlock } from './blockRenderers'
import { renderCodeBlockStack } from './codeCardRenderers'
import { buildGroupedComparisonBlock, mergeGroupedComparisonBlocks } from './comparisonGrouping'
import { renderComparisonBlock } from './comparisonRenderer'
import { getVisibleFrameTitle, hasNonCodeText } from './content'
import { renderFlowBlock } from './flowRenderer'
import { estimateWrappedLines } from './measurements'
import { renderMistakeFixPanel } from './mistakeFixRenderer'
import { pickFrameColor } from './palette'
import { renderCalloutCard, renderTextCard } from './textCardRenderers'
import type { BoardLayout, DrawColor, GeneratedMeta, GenerateTeachDrawOptions, HorizontalLanes } from './types'

export function renderFrameContent(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  parentId: TLShape['id'],
  layout: BoardLayout,
  options: GenerateTeachDrawOptions,
  frameIndex: number
): number {
  const meta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const title = getVisibleFrameTitle(frame)
  const titleHeight = renderFrameHeader(shapes, title, parentId, layout, pickFrameColor(frameIndex, frame), meta)
  const blocks = getRenderableBlocks(frame, title)
  const contentX = layout.paddingX
  const contentY = layout.paddingY + titleHeight

  if (blocks.length === 0) return contentY

  const renderedHeight =
    layout.mode === 'horizontal-cards'
      ? renderHorizontalFrame(shapes, blocks, parentId, contentX, contentY, layout.contentWidth, meta, options, layout, frame.layoutHint)
      : renderVerticalFrame(shapes, blocks, parentId, contentX, contentY, layout.contentWidth, meta, options, layout)

  return contentY + renderedHeight
}

function renderFrameHeader(
  shapes: ShapePartial[],
  title: string,
  parentId: TLShape['id'],
  layout: BoardLayout,
  color: DrawColor,
  meta: GeneratedMeta
): number {
  const titleLines = estimateWrappedLines(title, layout.contentWidth, 26)
  const titleTextHeight = Math.max(62, titleLines * 42)

  shapes.push(
    createTextShape({
      x: layout.paddingX,
      y: layout.paddingY,
      w: layout.contentWidth,
      text: title,
      parentId,
      color,
      size: 'xl',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: layout.paddingX,
      y: layout.paddingY + titleTextHeight + 4,
      w: Math.min(520, Math.max(180, title.length * 11)),
      h: 8,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta,
    })
  )

  return Math.max(layout.titleGap, titleTextHeight + 30)
}

function renderHorizontalFrame(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  layoutHint?: TeachDrawLayoutHint
): number {
  const frameLayout = pickContentLayout(blocks, layoutHint)

  if (frameLayout === 'mistake-fix') {
    return renderHorizontalMistakeFix(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
  }

  if (frameLayout === 'comparison') {
    return renderHorizontalComparison(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
  }

  if (frameLayout === 'flow-focus') {
    return renderHorizontalFlow(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
  }

  if (frameLayout === 'code-focus') {
    return renderHorizontalCodeFocus(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
  }

  return renderHorizontalConcept(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
}

function renderVerticalFrame(
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
  let cursorY = y
  const renderBlocks = mergeGroupedComparisonBlocks(blocks)

  renderBlocks.forEach((block) => {
    const height = renderAnyBlock(shapes, block, parentId, x, cursorY, w, frameMeta, options, layout)
    if (height > 0) cursorY += height + layout.blockGap
  })

  return Math.max(0, cursorY - y - layout.blockGap)
}

function renderHorizontalCodeFocus(
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
  const lanes = getHorizontalLanes(x, w, layout)
  const codeBlocks = blocks.filter(isCodeVisualBlock)
  const used = new Set<TeachDrawBlock>()
  let cursorY = y

  codeBlocks.forEach((codeBlock) => {
    const relatedBlocks = collectRelatedSupportBlocks(blocks, codeBlock, codeBlocks, used)
    const supportBlocks = relatedBlocks.filter((block) => !isCalloutBlock(block))
    const calloutBlocks = relatedBlocks.filter(isCalloutBlock)
    const supportHeight = renderSupportForCode(shapes, codeBlock, supportBlocks, calloutBlocks, parentId, lanes.supportX, cursorY, lanes.supportW, frameMeta, layout)
    const showCodeHeading = supportHeight === 0
    const codeHeight = renderCodeBlockStack(shapes, codeBlock, parentId, lanes.visualX, cursorY, lanes.visualW, frameMeta, {
      showHeading: showCodeHeading,
    })
    const rowHeight = Math.max(supportHeight, codeHeight)

    used.add(codeBlock)
    relatedBlocks.forEach((block) => used.add(block))
    cursorY += rowHeight + layout.blockGap
  })

  const remaining = blocks.filter((block) => !used.has(block))
  if (remaining.length > 0) {
    cursorY += renderHorizontalMixedGrid(shapes, remaining, parentId, x, cursorY, w, frameMeta, options, layout)
  } else {
    cursorY -= layout.blockGap
  }

  return Math.max(0, cursorY - y)
}

function renderSupportForCode(
  shapes: ShapePartial[],
  codeBlock: TeachDrawBlock,
  supportBlocks: TeachDrawBlock[],
  calloutBlocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  layout: BoardLayout
): number {
  let cursorY = y

  if (hasNonCodeText(codeBlock)) {
    const height = renderTextCard(shapes, codeBlock, parentId, x, cursorY, w, frameMeta, { colorOverride: 'blue' })
    cursorY += height + layout.smallGap
  }

  supportBlocks.forEach((block) => {
    const height = renderTextCard(shapes, block, parentId, x, cursorY, w, frameMeta)
    if (height > 0) cursorY += height + layout.smallGap
  })

  calloutBlocks.forEach((block) => {
    const height = renderCalloutCard(shapes, block, parentId, x, cursorY, w, frameMeta)
    if (height > 0) cursorY += height + layout.smallGap
  })

  return Math.max(0, cursorY - y - layout.smallGap)
}

function renderHorizontalFlow(
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
  const flowBlocks = blocks.filter(isFlowLikeBlock)
  const remaining = blocks.filter((block) => !flowBlocks.includes(block))
  let cursorY = y

  flowBlocks.forEach((block) => {
    const height = renderFlowBlock(shapes, block, parentId, x, cursorY, w, frameMeta, options.flowOrientation)
    cursorY += height + layout.blockGap
  })

  if (remaining.length > 0) {
    cursorY += renderHorizontalMixedGrid(shapes, remaining, parentId, x, cursorY, w, frameMeta, options, layout)
  } else {
    cursorY -= layout.blockGap
  }

  return Math.max(0, cursorY - y)
}

function renderHorizontalComparison(
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
  const compareBlocks = blocks.filter(isComparisonBlock)
  const remaining = blocks.filter((block) => !compareBlocks.includes(block))
  const used = new Set<TeachDrawBlock>(compareBlocks)
  let cursorY = y

  compareBlocks.forEach((block) => {
    const groupedComparison = buildGroupedComparisonBlock(block, remaining)
    const height = renderComparisonBlock(shapes, groupedComparison?.block ?? block, parentId, x, cursorY, w, frameMeta)
    groupedComparison?.usedBlocks.forEach((usedBlock) => used.add(usedBlock))
    cursorY += height + layout.blockGap
  })

  const unusedRemaining = remaining.filter((block) => !used.has(block))
  if (unusedRemaining.length > 0) {
    cursorY += renderHorizontalMixedGrid(shapes, unusedRemaining, parentId, x, cursorY, w, frameMeta, options, layout)
  } else {
    cursorY -= layout.blockGap
  }

  return Math.max(0, cursorY - y)
}

function renderHorizontalMistakeFix(
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
  const mistakeBlocks = blocks.filter(isMistakeBlock)
  const correctBlocks = blocks.filter(isCorrectBlock)
  const used = new Set([...mistakeBlocks, ...correctBlocks])
  const gap = layout.columnGap
  const panelW = Math.floor((w - gap) / 2)
  let cursorY = y
  const pairCount = Math.max(mistakeBlocks.length, correctBlocks.length)

  for (let index = 0; index < pairCount; index += 1) {
    const mistake = mistakeBlocks[index]
    const correct = correctBlocks[index]
    const mistakeHeight = mistake
      ? renderMistakeFixPanel(shapes, mistake, parentId, x, cursorY, panelW, frameMeta, 'Mistake', 'red', options.flowOrientation)
      : 0
    const correctHeight = correct
      ? renderMistakeFixPanel(shapes, correct, parentId, x + panelW + gap, cursorY, panelW, frameMeta, 'Correct', 'green', options.flowOrientation)
      : 0

    cursorY += Math.max(mistakeHeight, correctHeight) + layout.blockGap
  }

  const remaining = blocks.filter((block) => !used.has(block))
  if (remaining.length > 0) {
    cursorY += renderHorizontalMixedGrid(shapes, remaining, parentId, x, cursorY, w, frameMeta, options, layout)
  } else {
    cursorY -= layout.blockGap
  }

  return Math.max(0, cursorY - y)
}

function renderHorizontalConcept(
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
  return renderHorizontalMixedGrid(shapes, blocks, parentId, x, y, w, frameMeta, options, layout)
}

function renderHorizontalMixedGrid(
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
  let cursorY = y

  for (let index = 0; index < blocks.length; index += 2) {
    const leftBlock = blocks[index]
    const rightBlock = blocks[index + 1]
    const gap = layout.columnGap
    const colW = Math.floor((w - gap) / 2)
    const leftH = leftBlock ? renderAnyBlock(shapes, leftBlock, parentId, x, cursorY, colW, frameMeta, options, layout) : 0
    const rightH = rightBlock ? renderAnyBlock(shapes, rightBlock, parentId, x + colW + gap, cursorY, colW, frameMeta, options, layout) : 0

    cursorY += Math.max(leftH, rightH) + layout.blockGap
  }

  return Math.max(0, cursorY - y - layout.blockGap)
}

function getHorizontalLanes(x: number, w: number, layout: BoardLayout): HorizontalLanes {
  const gap = layout.columnGap
  const supportW = Math.round((w - gap) * 0.42)
  const visualW = w - supportW - gap

  return {
    supportX: x,
    supportW,
    visualX: x + supportW + gap,
    visualW,
  }
}

function collectRelatedSupportBlocks(
  blocks: TeachDrawBlock[],
  codeBlock: TeachDrawBlock,
  codeBlocks: TeachDrawBlock[],
  used: Set<TeachDrawBlock>
): TeachDrawBlock[] {
  const codeIndex = blocks.indexOf(codeBlock)
  const previousCodeIndexes = codeBlocks.map((block) => blocks.indexOf(block)).filter((index) => index < codeIndex)
  const previousCodeIndex = previousCodeIndexes.length > 0 ? Math.max(...previousCodeIndexes) : -1
  const nextCodeIndex = codeBlocks.map((block) => blocks.indexOf(block)).find((index) => index > codeIndex) ?? blocks.length
  const before = blocks.slice(previousCodeIndex + 1, codeIndex).filter((block) => !used.has(block) && !isCodeVisualBlock(block))
  const after = blocks
    .slice(codeIndex + 1, nextCodeIndex)
    .filter((block) => !used.has(block) && !isCodeVisualBlock(block) && isCodeSupportAfterBlock(block))

  return [...before, ...after]
}
