import type { TLRichText, TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawCodeBlock } from '@/types/teachdraw'
import { createGeoCard, createTextShape, type ShapePartial } from '../shapeHelpers'
import { getComparisonColumns } from './comparison'
import { buildTextCardText, stripMarkdownMarkers } from './content'
import { estimateCodeHeight, estimateTextCardHeight, shouldBoldFirstLine } from './measurements'
import type { ComparisonColumn, DrawColor, GeneratedMeta } from './types'

const HEADER_HEIGHT = 66
const PANEL_PADDING = 24
const CONTENT_GAP = 16
const SOURCE_LABEL_HEIGHT = 52
const CODE_LABEL_HEIGHT = 40

type MeasuredColumn = {
  column: ComparisonColumn
  bodyHeight: number
  code: Array<{ block: TeachDrawCodeBlock; labelHeight: number; cardHeight: number }>
  panelHeight: number
}

export function renderComparisonBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
): number {
  const visibleColumns = getComparisonColumns(block).slice(0, 3)
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

  const gap = visibleColumns.length === 3 ? 34 : 84
  const colW = Math.floor((w - gap * (visibleColumns.length - 1)) / visibleColumns.length)
  const innerW = colW - PANEL_PADDING * 2
  const measured = visibleColumns.map((column) => measureColumn(column, innerW))
  const rowHeight = Math.max(...measured.map((item) => item.panelHeight))
  const colors: DrawColor[] = ['blue', 'orange', 'green']
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }

  measured.forEach((item, index) => {
    const panelX = x + index * (colW + gap)
    renderColumnPanel(shapes, item, parentId, panelX, y, colW, rowHeight, colors[index], meta)
  })

  if (visibleColumns.length === 2) {
    shapes.push(
      createGeoCard({
        x: x + colW + gap / 2 - 32,
        y: y + 14,
        w: 64,
        h: 40,
        text: 'VS',
        parentId,
        color: 'violet',
        labelColor: 'violet',
        fill: 'solid',
        size: 's',
        align: 'middle',
        boldLineCount: 1,
        meta,
      })
    )
  }

  return rowHeight
}

function measureColumn(column: ComparisonColumn, innerW: number): MeasuredColumn {
  const bodyHeight = column.body
    ? estimateTextCardHeight(column.body, innerW, { paddingX: 0, paddingY: 0, lineHeight: 28, minimum: 44 })
    : 0
  const code = column.codeBlocks.map((block) => ({
    block,
    labelHeight: block.label ? CODE_LABEL_HEIGHT : 0,
    cardHeight: estimateCodeHeight(block.content, innerW),
  }))
  const contentHeights = [column.sourceLabel ? SOURCE_LABEL_HEIGHT : 0, bodyHeight]
    .concat(code.map((item) => item.labelHeight + item.cardHeight))
    .filter((height) => height > 0)
  const contentHeight = contentHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, contentHeights.length - 1) * CONTENT_GAP

  return {
    column,
    bodyHeight,
    code,
    panelHeight: HEADER_HEIGHT + PANEL_PADDING * 2 + Math.max(52, contentHeight),
  }
}

function renderColumnPanel(
  shapes: ShapePartial[],
  measured: MeasuredColumn,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  h: number,
  color: DrawColor,
  meta: GeneratedMeta
) {
  const innerX = x + PANEL_PADDING
  const innerW = w - PANEL_PADDING * 2
  let cursorY = y + HEADER_HEIGHT + PANEL_PADDING

  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text: '',
      parentId,
      color,
      fill: 'none',
      meta,
    }),
    createGeoCard({
      x: x + 2,
      y: y + 2,
      w: w - 4,
      h: HEADER_HEIGHT - 2,
      text: measured.column.title || 'Comparison',
      parentId,
      color,
      labelColor: 'black',
      fill: 'solid',
      size: 'l',
      align: 'middle',
      boldLineCount: 1,
      meta,
    })
  )

  if (measured.column.sourceLabel) {
    const label = stripMarkdownMarkers(measured.column.sourceLabel)
    shapes.push(
      createTextShape({
        x: innerX,
        y: cursorY,
        w: innerW,
        text: label,
        parentId,
        color: 'black',
        size: 'm',
        boldLineCount: 1,
        meta,
      }),
      createGeoCard({
        x: innerX,
        y: cursorY + 34,
        w: Math.min(210, Math.max(92, label.length * 9)),
        h: 5,
        text: '',
        parentId,
        color,
        fill: 'solid',
        meta,
      })
    )
    cursorY += SOURCE_LABEL_HEIGHT + CONTENT_GAP
  }

  if (measured.column.body) {
    shapes.push(
      createTextShape({
        x: innerX,
        y: cursorY,
        w: innerW,
        text: measured.column.body,
        parentId,
        color: 'black',
        size: 'm',
        meta,
      })
    )
    cursorY += measured.bodyHeight + CONTENT_GAP
  }

  measured.code.forEach((item, index) => {
    if (item.block.label) {
      shapes.push(
        createTextShape({
          x: innerX,
          y: cursorY,
          w: innerW,
          text: stripMarkdownMarkers(item.block.label).replace(/:$/, ''),
          parentId,
          color,
          size: 'm',
          boldLineCount: 1,
          meta,
        })
      )
      cursorY += item.labelHeight
    }

    shapes.push(
      createGeoCard({
        x: innerX,
        y: cursorY,
        w: innerW,
        h: item.cardHeight,
        text: item.block.content,
        richText: codeRichText(item.block.content),
        parentId,
        color,
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: 'm',
        verticalAlign: 'start',
        meta,
      })
    )
    cursorY += item.cardHeight + (index < measured.code.length - 1 ? CONTENT_GAP : 0)
  })
}

function codeRichText(code: string): TLRichText {
  return {
    type: 'doc',
    content: code.split('\n').map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line, marks: [{ type: 'code' }] }] } : {}),
    })),
  } as TLRichText
}
