import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { createGeoCard, createTextShape, type ShapePartial } from '../shapeHelpers'
import { isCodeVisualBlock, isFlowLikeBlock } from './classification'
import { renderCodeBlockStack } from './codeCardRenderers'
import { buildPlainBody, cleanBlockHeading, normalizeHeading } from './content'
import { renderFlowBlock } from './flowRenderer'
import { renderSmallHeading } from './headingRenderers'
import { estimateTextCardHeight } from './measurements'
import type { FlowOrientation, GeneratedMeta } from './types'

const PANEL_HEADER_HEIGHT = 68
const PANEL_PADDING = 28
const PANEL_GAP = 60
const CONTENT_GAP = 18

type PanelSpec = {
  block: TeachDrawBlock
  label: 'Mistake' | 'Correct'
  color: 'red' | 'green'
}

export function renderMistakeFixPair(
  shapes: ShapePartial[],
  mistake: TeachDrawBlock,
  correct: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: FlowOrientation
): number {
  const panels: PanelSpec[] = [
    { block: mistake, label: 'Mistake', color: 'red' },
    { block: correct, label: 'Correct', color: 'green' },
  ]

  if (w < 860) {
    let cursorY = y
    panels.forEach((panel, index) => {
      cursorY += renderPanel(shapes, panel, parentId, x, cursorY, w, frameMeta, flowOrientation)
      if (index === 0) cursorY += PANEL_GAP
    })
    return cursorY - y
  }

  const panelW = Math.floor((w - PANEL_GAP) / 2)
  const rendered = panels.map((panel, index) =>
    stagePanel(panel, parentId, x + index * (panelW + PANEL_GAP), y, panelW, frameMeta, flowOrientation)
  )
  const rowHeight = Math.max(...rendered.map((panel) => panel.height))

  rendered.forEach((panel) => {
    pushPanelShell(shapes, panel.spec, parentId, panel.x, y, panelW, rowHeight, frameMeta)
    shapes.push(...panel.content)
  })

  return rowHeight
}

function renderPanel(
  shapes: ShapePartial[],
  spec: PanelSpec,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: FlowOrientation
): number {
  const staged = stagePanel(spec, parentId, x, y, w, frameMeta, flowOrientation)
  pushPanelShell(shapes, spec, parentId, x, y, w, staged.height, frameMeta)
  shapes.push(...staged.content)
  return staged.height
}

function stagePanel(
  spec: PanelSpec,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: FlowOrientation
) {
  const content: ShapePartial[] = []
  const innerX = x + PANEL_PADDING
  const innerW = w - PANEL_PADDING * 2
  let cursorY = y + PANEL_HEADER_HEIGHT + PANEL_PADDING
  const meta = { ...frameMeta, blockHeading: spec.block.heading, blockKind: spec.block.kind }
  const subheading = cleanBlockHeading(spec.block.heading)

  if (subheading && normalizeHeading(subheading) !== normalizeHeading(spec.label)) {
    cursorY += renderSmallHeading(content, subheading, parentId, innerX, cursorY, innerW, spec.color, meta)
  }

  if (isFlowLikeBlock(spec.block)) {
    cursorY += renderFlowBlock(content, spec.block, parentId, innerX, cursorY, innerW, frameMeta, flowOrientation)
  } else {
    const body = buildPlainBody(spec.block)
    if (body) {
      const bodyH = estimateTextCardHeight(body, innerW, { paddingX: 0, paddingY: 0, lineHeight: 29, minimum: 52 })
      content.push(createTextShape({ x: innerX, y: cursorY, w: innerW, text: body, parentId, color: 'black', size: 'm', meta }))
      cursorY += bodyH
      if (isCodeVisualBlock(spec.block)) cursorY += CONTENT_GAP
    }

    if (isCodeVisualBlock(spec.block)) {
      cursorY += renderCodeBlockStack(content, spec.block, parentId, innerX, cursorY, innerW, frameMeta, {
        colorOverride: spec.color,
        showHeading: false,
      })
    }

    if (!body && !isCodeVisualBlock(spec.block)) {
      const fallbackH = 52
      content.push(createTextShape({ x: innerX, y: cursorY, w: innerW, text: 'No details provided.', parentId, color: 'grey', size: 'm', meta }))
      cursorY += fallbackH
    }
  }

  return {
    spec,
    x,
    content,
    height: Math.max(180, cursorY - y + PANEL_PADDING),
  }
}

function pushPanelShell(
  shapes: ShapePartial[],
  spec: PanelSpec,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta
) {
  const meta = { ...frameMeta, blockHeading: spec.block.heading, blockKind: spec.block.kind }
  shapes.push(
    createGeoCard({ x, y, w, h, text: '', parentId, color: spec.color, fill: 'none', meta }),
    createGeoCard({
      x: x + 2,
      y: y + 2,
      w: w - 4,
      h: PANEL_HEADER_HEIGHT - 2,
      text: spec.label.toUpperCase(),
      parentId,
      color: spec.color,
      labelColor: spec.color,
      fill: 'solid',
      size: 'm',
      align: 'middle',
      boldLineCount: 1,
      meta,
    })
  )
}
