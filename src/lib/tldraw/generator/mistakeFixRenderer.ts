import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { createGeoCard, type ShapePartial } from '../shapeHelpers'
import { isCodeVisualBlock } from './classification'
import { renderCodeBlockStack } from './codeCardRenderers'
import { hasNonCodeText } from './content'
import { renderFlowBlock } from './flowRenderer'
import { getMistakeFixBodyHeading } from './palette'
import { renderTextCard } from './textCardRenderers'
import type { FlowOrientation, GeneratedMeta } from './types'

export function renderMistakeFixPanel(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  label: 'Mistake' | 'Correct',
  color: 'red' | 'green',
  flowOrientation: FlowOrientation
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  let cursorY = y

  shapes.push(
    createGeoCard({
      x,
      y: cursorY,
      w: Math.min(230, Math.max(150, label.length * 22)),
      h: 50,
      text: label,
      parentId,
      color,
      labelColor: 'black',
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    })
  )
  cursorY += 66

  if (block.kind === 'flow') {
    cursorY += renderFlowBlock(shapes, block, parentId, x, cursorY, w, frameMeta, flowOrientation)
    return cursorY - y
  }

  if (hasNonCodeText(block)) {
    const textHeight = renderTextCard(shapes, block, parentId, x, cursorY, w, frameMeta, {
      colorOverride: color,
      labelOverride: getMistakeFixBodyHeading(block, label),
    })
    cursorY += textHeight + 22
  }

  if (isCodeVisualBlock(block)) {
    cursorY += renderCodeBlockStack(shapes, block, parentId, x, cursorY, w, frameMeta, {
      colorOverride: color,
      showHeading: !hasNonCodeText(block),
    })
  }

  if (!hasNonCodeText(block) && !isCodeVisualBlock(block)) {
    cursorY += renderTextCard(shapes, block, parentId, x, cursorY, w, frameMeta, {
      colorOverride: color,
      labelOverride: getMistakeFixBodyHeading(block, label),
    })
  }

  return cursorY - y
}
