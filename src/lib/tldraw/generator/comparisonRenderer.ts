import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { createGeoCard, type ShapePartial } from '../shapeHelpers'
import { getComparisonColumns } from './comparison'
import { buildTextCardText } from './content'
import { estimateTextCardHeight, shouldBoldFirstLine } from './measurements'
import type { DrawColor, GeneratedMeta } from './types'

export function renderComparisonBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
): number {
  const columns = getComparisonColumns(block)
  const visibleColumns = columns.slice(0, 3)
  const fallbackText = buildTextCardText(block)

  if (visibleColumns.length < 2) {
    const h = estimateTextCardHeight(fallbackText, w, { paddingX: 30, paddingY: 26, lineHeight: 31, minimum: 130 })
    shapes.push(
      createGeoCard({
        x,
        y,
        w,
        h,
        text: fallbackText,
        parentId,
        color: 'orange',
        labelColor: 'black',
        fill: 'semi',
        size: 'm',
        boldLineCount: shouldBoldFirstLine(fallbackText) ? 1 : 0,
        verticalAlign: 'start',
        meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
      })
    )
    return h
  }

  const gap = visibleColumns.length === 3 ? 34 : 48
  const colW = Math.floor((w - gap * (visibleColumns.length - 1)) / visibleColumns.length)
  const colors: DrawColor[] = ['blue', 'orange', 'green']
  const texts = visibleColumns.map((column) => [column.title, column.body].filter(Boolean).join('\n\n'))
  const heights = texts.map((text) => estimateTextCardHeight(text, colW, { paddingX: 30, paddingY: 28, lineHeight: 31, minimum: 150 }))
  const rowHeight = Math.max(...heights)

  texts.forEach((text, index) => {
    shapes.push(
      createGeoCard({
        x: x + index * (colW + gap),
        y,
        w: colW,
        h: rowHeight,
        text,
        parentId,
        color: colors[index],
        labelColor: 'black',
        fill: 'semi',
        size: 'm',
        boldLineCount: 1,
        verticalAlign: 'start',
        meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
      })
    )
  })

  return rowHeight
}
