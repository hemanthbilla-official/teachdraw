import type { TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawFrame } from '@/types/teachdraw'
import { createGeoCard, createTextShape, type AssetPartial, type ShapePartial } from '../shapeHelpers'
import {
  getRenderableBlocks,
  isCodeVisualBlock,
  isCorrectBlock,
  isFlowLikeBlock,
  isMistakeBlock,
  pickContentLayout,
} from './classification'
import { renderAnyBlock } from './blockRenderers'
import { mergeGroupedComparisonBlocks } from './comparisonGrouping'
import { FRAME_BADGE_H, FRAME_BADGE_MARGIN, FRAME_BADGE_W } from './constants'
import { getVisibleFrameTitle } from './content'
import type { ImageInfoMap } from './imageRenderer'
import { estimateWrappedLines } from './measurements'
import { renderMistakeFixPair } from './mistakeFixRenderer'
import { pickFrameColor } from './palette'
import type { BoardLayout, DrawColor, GeneratedMeta, GenerateTeachDrawOptions } from './types'

export function renderFrameContent(
  shapes: ShapePartial[],
  assets: AssetPartial[],
  frame: TeachDrawFrame,
  parentId: TLShape['id'],
  layout: BoardLayout,
  options: GenerateTeachDrawOptions,
  frameIndex: number,
  imageInfo: ImageInfoMap
): number {
  const meta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const title = getVisibleFrameTitle(frame)
  const frameColor = pickFrameColor(frameIndex, frame)
  const displayNumber = frame.frameNumber ?? frameIndex + 1
  const titleHeight = renderFrameHeader(shapes, title, parentId, layout, frameColor, meta, displayNumber)
  const blocks = getRenderableBlocks(frame, title)
  const contentX = layout.paddingX
  const contentY = layout.paddingY + titleHeight

  if (blocks.length === 0) return contentY

  const contentLayout = pickContentLayout(blocks, frame.layoutHint)
  const renderedHeight = shouldUseCardGrid(blocks, contentLayout)
    ? renderCardGrid(shapes, assets, blocks, parentId, contentX, contentY, layout.contentWidth, meta, options, layout, imageInfo)
    : renderVerticalFrame(
    shapes,
    assets,
    blocks,
    parentId,
    contentX,
    contentY,
    layout.contentWidth,
    meta,
    options,
    layout,
    imageInfo,
    frame.layoutHint === 'comparison'
  )

  return contentY + renderedHeight
}

function shouldUseCardGrid(blocks: TeachDrawBlock[], contentLayout: ReturnType<typeof pickContentLayout>): boolean {
  if (blocks.length < 2 || blocks.length > 6) return false
  if (!['concept-focus', 'practice-grid', 'recap'].includes(contentLayout)) return false
  return blocks.every(
    (block) =>
      !isCodeVisualBlock(block) &&
      !isFlowLikeBlock(block) &&
      block.imageBlocks.length === 0 &&
      !isMistakeBlock(block) &&
      !isCorrectBlock(block)
  )
}

function renderCardGrid(
  shapes: ShapePartial[],
  assets: AssetPartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  imageInfo: ImageInfoMap
): number {
  const columnWidth = (w - layout.columnGap) / 2
  let cursorY = y

  for (let index = 0; index < blocks.length; index += 2) {
    const row = blocks.slice(index, index + 2)
    const singleFinalCard = row.length === 1 && blocks.length > 1
    const rendered = row.map((block, column) => {
      const cardWidth = singleFinalCard ? w : columnWidth
      const cardX = singleFinalCard ? x : x + column * (columnWidth + layout.columnGap)
      const height = renderAnyBlock(
        shapes,
        assets,
        block,
        parentId,
        cardX,
        cursorY,
        cardWidth,
        frameMeta,
        options,
        layout,
        imageInfo
      )
      return height
    })

    cursorY += Math.max(...rendered) + layout.blockGap
  }

  return Math.max(0, cursorY - y - layout.blockGap)
}

function renderFrameHeader(
  shapes: ShapePartial[],
  title: string,
  parentId: TLShape['id'],
  layout: BoardLayout,
  color: DrawColor,
  meta: GeneratedMeta,
  displayNumber?: number
): number {
  const titleLines = estimateWrappedLines(title, layout.contentWidth, 26)
  const titleTextHeight = Math.max(62, titleLines * 42)

  shapes.push(
    createTextShape({
      x: layout.paddingX,
      y: layout.paddingY,
      w: layout.contentWidth - FRAME_BADGE_W - FRAME_BADGE_MARGIN,
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
      w: Math.min(600, Math.max(180, title.length * 11)),
      h: 10,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta,
    })
  )

  // Frame number badge — top-right corner pill
  if (displayNumber !== undefined) {
    const badgeX = layout.paddingX + layout.contentWidth - FRAME_BADGE_W
    const badgeY = layout.paddingY
    shapes.push(
      createGeoCard({
        x: badgeX,
        y: badgeY,
        w: FRAME_BADGE_W,
        h: FRAME_BADGE_H,
        text: String(displayNumber),
        geo: 'rectangle',
        parentId,
        color,
        labelColor: color,
        fill: 'semi',
        size: 's',
        align: 'middle',
        boldLineCount: 1,
        meta,
      })
    )
  }

  return Math.max(layout.titleGap, titleTextHeight + 30)
}

function renderVerticalFrame(
  shapes: ShapePartial[],
  assets: AssetPartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  imageInfo: ImageInfoMap,
  allowImplicitComparison: boolean
): number {
  let cursorY = y
  const renderBlocks = mergeGroupedComparisonBlocks(blocks, { allowImplicitColumns: allowImplicitComparison })

  const used = new Set<number>()
  renderBlocks.forEach((block, index) => {
    if (used.has(index)) return

    if (isMistakeBlock(block) || isCorrectBlock(block)) {
      const counterpartIndex = renderBlocks.findIndex((candidate, candidateIndex) => {
        if (candidateIndex <= index || used.has(candidateIndex)) return false
        return isMistakeBlock(block) ? isCorrectBlock(candidate) : isMistakeBlock(candidate)
      })

      if (counterpartIndex !== -1) {
        const counterpart = renderBlocks[counterpartIndex]
        const mistake = isMistakeBlock(block) ? block : counterpart
        const correct = isCorrectBlock(block) ? block : counterpart
        const height = renderMistakeFixPair(
          shapes,
          mistake,
          correct,
          parentId,
          x,
          cursorY,
          w,
          frameMeta,
          options.flowOrientation
        )
        used.add(counterpartIndex)
        cursorY += height + layout.blockGap
        return
      }
    }

    const height = renderAnyBlock(shapes, assets, block, parentId, x, cursorY, w, frameMeta, options, layout, imageInfo)
    if (height > 0) cursorY += height + layout.blockGap
  })

  return Math.max(0, cursorY - y - layout.blockGap)
}
