import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { chooseFlowOrientation } from '../layoutHelpers'
import { createArrow, createGeoCard, type ShapePartial } from '../shapeHelpers'
import { buildPlainBody, cleanBlockHeading, getFlowSteps, stripMarkdownMarkers } from './content'
import { renderSmallHeading } from './headingRenderers'
import { estimateTextCardHeight } from './measurements'
import { getFlowStepColor } from './palette'
import type { FlowOrientation, GeneratedMeta } from './types'

type DecisionFlow = {
  question: string
  yesLabel: string
  yesText: string
  noLabel: string
  noText: string
}

export function renderFlowBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: FlowOrientation
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const heading = cleanBlockHeading(block.heading)
  let cursorY = y

  if (heading) {
    cursorY += renderSmallHeading(shapes, heading, parentId, x, cursorY, w, 'blue', meta)
  }

  const steps = getFlowSteps(block)
  const decision = parseDecisionFlow(block, steps)
  if (decision) {
    return cursorY + renderDecisionFlow(shapes, decision, parentId, x, cursorY, w, meta, flowOrientation) - y
  }

  const orientation = chooseFlowOrientation(steps, flowOrientation)
  const flowHeight =
    orientation === 'horizontal'
      ? renderHorizontalFlowSteps(shapes, steps, parentId, x, cursorY, w, meta)
      : renderVerticalFlowSteps(shapes, steps, parentId, x, cursorY, w, meta)

  return cursorY + flowHeight - y
}

function parseDecisionFlow(block: TeachDrawBlock, steps: string[]): DecisionFlow | null {
  const bodyLines = buildPlainBody(block)
    .split('\n')
    .map(cleanDecisionLine)
    .filter(Boolean)
  const stepLines = steps.map(cleanDecisionLine).filter(Boolean)
  const lines = bodyLines.length >= 3 ? bodyLines : stepLines

  const yesIndex = findBranchIndex(lines, 'yes')
  const noIndex = findBranchIndex(lines, 'no')
  if (yesIndex === -1 || noIndex === -1 || yesIndex === noIndex) return null

  const firstBranchIndex = Math.min(yesIndex, noIndex)
  const question = lines.slice(0, firstBranchIndex).join('\n').trim()
  if (!question) return null

  const yesText = extractBranchText(lines, yesIndex, noIndex, 'yes')
  const noText = extractBranchText(lines, noIndex, yesIndex, 'no')
  if (!yesText || !noText) return null

  return {
    question,
    yesLabel: 'Yes',
    yesText,
    noLabel: 'No',
    noText,
  }
}

function cleanDecisionLine(line: string): string {
  return stripMarkdownMarkers(line)
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim()
}

function findBranchIndex(lines: string[], label: 'yes' | 'no'): number {
  return lines.findIndex((line) => isBranchLine(line, label))
}

function isBranchLine(line: string, label: 'yes' | 'no'): boolean {
  return new RegExp(`^${label}\\b\\s*(?::|->|=>|-)?\\s*`, 'i').test(line)
}

function extractBranchText(lines: string[], branchIndex: number, otherBranchIndex: number, label: 'yes' | 'no'): string {
  const nextBranchIndex = branchIndex < otherBranchIndex ? otherBranchIndex : lines.length
  const inlineText = lines[branchIndex].replace(new RegExp(`^${label}\\b\\s*(?::|->|=>|-)?\\s*`, 'i'), '').trim()
  const followingLines = lines.slice(branchIndex + 1, nextBranchIndex).filter((line) => !isBranchLine(line, 'yes') && !isBranchLine(line, 'no'))

  return [inlineText, ...followingLines].filter(Boolean).join('\n').trim()
}

function renderDecisionFlow(
  shapes: ShapePartial[],
  decision: DecisionFlow,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta,
  flowOrientation: FlowOrientation
): number {
  const shouldStackBranches = w < 760 || flowOrientation === 'vertical'
  const questionW = Math.min(560, Math.max(360, Math.round(w * 0.42)))
  const questionH = Math.max(126, estimateTextCardHeight(decision.question, questionW, { paddingX: 34, paddingY: 28, lineHeight: 28, minimum: 112 }))
  const questionX = x + (w - questionW) / 2
  const questionCenterX = questionX + questionW / 2
  const questionBottomY = y + questionH

  shapes.push(
    createGeoCard({
      x: questionX,
      y,
      w: questionW,
      h: questionH,
      text: decision.question,
      parentId,
      geo: 'diamond',
      color: 'blue',
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    })
  )

  return shouldStackBranches
    ? renderStackedDecisionBranches(shapes, decision, parentId, x, questionCenterX, questionH, questionBottomY, w, meta)
    : renderSideBySideDecisionBranches(shapes, decision, parentId, x, questionCenterX, questionH, questionBottomY, w, meta)
}

function renderSideBySideDecisionBranches(
  shapes: ShapePartial[],
  decision: DecisionFlow,
  parentId: TLShape['id'],
  x: number,
  questionCenterX: number,
  questionH: number,
  questionBottomY: number,
  w: number,
  meta: GeneratedMeta
): number {
  const gap = Math.max(64, Math.round(w * 0.06))
  const branchW = Math.floor((w - gap) / 2)
  const branchY = questionBottomY + 112
  const yesX = x
  const noX = x + branchW + gap
  const yesH = Math.max(104, estimateTextCardHeight(decision.yesText, branchW, { paddingX: 28, paddingY: 24, lineHeight: 29, minimum: 96 }))
  const noH = Math.max(104, estimateTextCardHeight(decision.noText, branchW, { paddingX: 28, paddingY: 24, lineHeight: 29, minimum: 96 }))
  const yesCenterX = yesX + branchW / 2
  const noCenterX = noX + branchW / 2

  createDecisionBranchArrow(shapes, parentId, questionCenterX, questionBottomY, yesCenterX, branchY, decision.yesLabel, 'green', meta)
  createDecisionBranchArrow(shapes, parentId, questionCenterX, questionBottomY, noCenterX, branchY, decision.noLabel, 'red', meta)
  createDecisionBranchCard(shapes, parentId, yesX, branchY, branchW, yesH, decision.yesText, 'green', meta)
  createDecisionBranchCard(shapes, parentId, noX, branchY, branchW, noH, decision.noText, 'red', meta)

  return questionH + 112 + Math.max(yesH, noH)
}

function renderStackedDecisionBranches(
  shapes: ShapePartial[],
  decision: DecisionFlow,
  parentId: TLShape['id'],
  x: number,
  questionCenterX: number,
  questionH: number,
  questionBottomY: number,
  w: number,
  meta: GeneratedMeta
): number {
  const branchW = Math.min(620, w)
  const branchX = x + (w - branchW) / 2
  const yesY = questionBottomY + 96
  const yesH = Math.max(104, estimateTextCardHeight(decision.yesText, branchW, { paddingX: 28, paddingY: 24, lineHeight: 29, minimum: 96 }))
  const noY = yesY + yesH + 96
  const noH = Math.max(104, estimateTextCardHeight(decision.noText, branchW, { paddingX: 28, paddingY: 24, lineHeight: 29, minimum: 96 }))
  const branchCenterX = branchX + branchW / 2

  createDecisionBranchArrow(shapes, parentId, questionCenterX, questionBottomY, branchCenterX, yesY, decision.yesLabel, 'green', meta)
  createDecisionBranchCard(shapes, parentId, branchX, yesY, branchW, yesH, decision.yesText, 'green', meta)
  createDecisionBranchArrow(shapes, parentId, questionCenterX, questionBottomY, branchCenterX, noY, decision.noLabel, 'red', meta)
  createDecisionBranchCard(shapes, parentId, branchX, noY, branchW, noH, decision.noText, 'red', meta)

  return questionH + 96 + yesH + 96 + noH
}

function createDecisionBranchArrow(
  shapes: ShapePartial[],
  parentId: TLShape['id'],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  label: string,
  color: 'green' | 'red',
  meta: GeneratedMeta
) {
  shapes.push(createArrow({ x: startX, y: startY + 8, endX, endY: endY - 10, parentId, color: 'grey', meta }))

  const labelW = 74
  const labelH = 34
  shapes.push(
    createGeoCard({
      x: (startX + endX) / 2 - labelW / 2,
      y: (startY + endY) / 2 - labelH / 2,
      w: labelW,
      h: labelH,
      text: label,
      parentId,
      color,
      fill: 'semi',
      align: 'middle',
      size: 's',
      boldLineCount: 1,
      meta,
    })
  )
}

function createDecisionBranchCard(
  shapes: ShapePartial[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color: 'green' | 'red',
  meta: GeneratedMeta
) {
  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text,
      parentId,
      color,
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    })
  )
}


function renderHorizontalFlowSteps(
  shapes: ShapePartial[],
  steps: string[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta
): number {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const gapX = 58
  const gapY = 64
  const maxNodeW = 300
  const columns = Math.max(1, Math.min(5, Math.floor((w + gapX) / (maxNodeW + gapX)), safeSteps.length))
  const nodeW = Math.min(maxNodeW, Math.floor((w - gapX * (columns - 1)) / columns))
  const rows = Math.ceil(safeSteps.length / columns)
  const nodeHeights = safeSteps.map((step) => Math.max(78, estimateTextCardHeight(step, nodeW, { paddingX: 22, paddingY: 18, lineHeight: 26, minimum: 78 })))
  const rowHeights = Array.from({ length: rows }, (_, row) => {
    const rowItems = nodeHeights.slice(row * columns, row * columns + columns)
    return Math.max(...rowItems)
  })

  safeSteps.forEach((step, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const rowStart = row * columns
    const rowCount = Math.min(columns, safeSteps.length - rowStart)
    const rowWidth = rowCount * nodeW + Math.max(0, rowCount - 1) * gapX
    const rowX = x + Math.max(0, (w - rowWidth) / 2)
    const boxX = rowX + col * (nodeW + gapX)
    const boxY = y + rowHeights.slice(0, row).reduce((sum, height) => sum + height + gapY, 0)
    const boxH = rowHeights[row]

    shapes.push(
      createGeoCard({
        x: boxX,
        y: boxY,
        w: nodeW,
        h: boxH,
        text: step,
        parentId,
        color: getFlowStepColor(index, safeSteps.length),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )

    const nextIndex = index + 1
    if (nextIndex >= safeSteps.length) return

    const nextRow = Math.floor(nextIndex / columns)
    const nextCol = nextIndex % columns
    if (nextRow === row) {
      const nextX = rowX + nextCol * (nodeW + gapX)
      shapes.push(createArrow({ x: boxX + nodeW + 8, y: boxY + boxH / 2, endX: nextX - 8, endY: boxY + boxH / 2, parentId, color: 'grey', meta }))
      return
    }

    const nextRowCount = Math.min(columns, safeSteps.length - nextRow * columns)
    const nextRowWidth = nextRowCount * nodeW + Math.max(0, nextRowCount - 1) * gapX
    const nextRowX = x + Math.max(0, (w - nextRowWidth) / 2)
    const nextY = y + rowHeights.slice(0, nextRow).reduce((sum, height) => sum + height + gapY, 0)
    shapes.push(
      createArrow({
        x: boxX + nodeW / 2,
        y: boxY + boxH + 8,
        endX: nextRowX + nextCol * (nodeW + gapX) + nodeW / 2,
        endY: nextY - 8,
        parentId,
        color: 'grey',
        meta,
      })
    )
  })

  return rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rows - 1) * gapY
}

function renderVerticalFlowSteps(
  shapes: ShapePartial[],
  steps: string[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta
): number {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const nodeW = Math.min(820, w)
  const nodeX = x + (w - nodeW) / 2
  const gap = 46
  let cursorY = y

  safeSteps.forEach((step, index) => {
    const boxH = Math.max(78, estimateTextCardHeight(step, nodeW, { paddingX: 24, paddingY: 18, lineHeight: 26, minimum: 78 }))
    shapes.push(
      createGeoCard({
        x: nodeX,
        y: cursorY,
        w: nodeW,
        h: boxH,
        text: step,
        parentId,
        color: getFlowStepColor(index, safeSteps.length),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )

    if (index < safeSteps.length - 1) {
      shapes.push(createArrow({ x: nodeX + nodeW / 2, y: cursorY + boxH + 8, endX: nodeX + nodeW / 2, endY: cursorY + boxH + gap - 8, parentId, color: 'grey', meta }))
    }

    cursorY += boxH + gap
  })

  return cursorY - y - gap
}
