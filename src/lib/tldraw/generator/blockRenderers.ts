import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import type { AssetPartial, ShapePartial } from '../shapeHelpers'
import { isCalloutBlock, isCodeVisualBlock, isComparisonBlock, isFlowLikeBlock } from './classification'
import { renderCodeBlockStack } from './codeCardRenderers'
import { renderComparisonBlock } from './comparisonRenderer'
import { hasNonCodeText } from './content'
import { renderFlowBlock } from './flowRenderer'
import { isImageBlock, renderImageBlock, type ImageInfoMap } from './imageRenderer'
import { renderCalloutCard, renderTextCard } from './textCardRenderers'
import type { BoardLayout, GeneratedMeta, GenerateTeachDrawOptions } from './types'

export function renderAnyBlock(
  shapes: ShapePartial[],
  assets: AssetPartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  layout: BoardLayout,
  imageInfo: ImageInfoMap
): number {
  if (isImageBlock(block)) {
    return renderImageBlock(shapes, assets, block, parentId, x, y, w, frameMeta, imageInfo)
  }

  if (isComparisonBlock(block)) {
    return renderComparisonBlock(shapes, block, parentId, x, y, w, frameMeta)
  }

  if (isFlowLikeBlock(block)) {
    return renderFlowBlock(shapes, block, parentId, x, y, w, frameMeta, options.flowOrientation)
  }

  if (isCodeVisualBlock(block)) {
    let cursorY = y
    if (hasNonCodeText(block)) {
      const textHeight = renderTextCard(shapes, block, parentId, x, cursorY, w, frameMeta, { colorOverride: 'blue' })
      cursorY += textHeight + layout.smallGap
    }
    const codeHeight = renderCodeBlockStack(shapes, block, parentId, x, cursorY, w, frameMeta, {
      showHeading: !hasNonCodeText(block),
    })
    return cursorY + codeHeight - y
  }

  if (isCalloutBlock(block)) {
    return renderCalloutCard(shapes, block, parentId, x, y, w, frameMeta)
  }

  return renderTextCard(shapes, block, parentId, x, y, w, frameMeta)
}
