import type { TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawFrame } from '@/types/teachdraw'
import { createGeoCard, createTextShape, type AssetPartial, type ShapePartial } from '../shapeHelpers'
import { getRenderableBlocks, isCorrectBlock, isMistakeBlock } from './classification'
import { renderAnyBlock } from './blockRenderers'
import { mergeGroupedComparisonBlocks } from './comparisonGrouping'
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
  const titleHeight = renderFrameHeader(shapes, title, parentId, layout, pickFrameColor(frameIndex, frame), meta)
  const blocks = getRenderableBlocks(frame, title)
  const contentX = layout.paddingX
  const contentY = layout.paddingY + titleHeight

  if (blocks.length === 0) return contentY

  const renderedHeight = renderVerticalFrame(
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
