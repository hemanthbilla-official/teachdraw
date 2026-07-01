import type { Editor, TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame } from '@/types/teachdraw'
import { chooseFlowOrientation, estimateBlockHeight, estimateFrameHeight } from './layoutHelpers'
import { createArrow, createFrameShape, createGeoCard, createTextShape, type ShapePartial } from './shapeHelpers'

export type LayoutMode = 'whiteboard-notes' | 'frame-grid' | 'vertical-cards'

export type GenerateTeachDrawOptions = {
  layoutMode: LayoutMode
  columns: 2 | 3 | 4
  flowOrientation: 'auto' | 'vertical' | 'horizontal'
  clearBeforeGenerate: boolean
}

const defaultOptions: GenerateTeachDrawOptions = {
  layoutMode: 'whiteboard-notes',
  columns: 3,
  flowOrientation: 'auto',
  clearBeforeGenerate: true,
}

type GeneratedMeta = {
  frameNumber?: number
  frameTitle?: string
  blockHeading?: string
  blockKind?: string
}

const whiteboard = {
  boardX: 120,
  boardY: 80,
  contentWidth: 1500,
  leftColWidth: 850,
  rightColWidth: 540,
  colGap: 80,
  sectionGap: 150,
  sectionHeadingGap: 108,
  mapColumns: 1,
  mapColumnWidth: 1040,
  mapGapX: 0,
  mapGapY: 76,
  mapPadding: 18,
}

const codeLanguages = new Set(['python', 'javascript', 'js', 'typescript', 'ts', 'bash', 'shell', 'powershell', 'cmd', 'json', 'html', 'css', 'sql'])
const commandLanguages = new Set(['bash', 'shell', 'powershell', 'cmd'])
const endpointRegex = /^(GET|POST|PUT|PATCH|DELETE)\s+\/\S*$/i
const urlRegex = /^https?:\/\/\S+$/i
const hiddenWhiteboardHeadings = new Set([
  'answer',
  'ask',
  'ask students',
  'board line',
  'browser url',
  'code',
  'command',
  'concept',
  'correct idea',
  'definition',
  'draw this',
  'endpoint',
  'error reason',
  'expected answer',
  'explain',
  'explanation',
  'flow',
  'for students',
  'heading',
  'important',
  'important line',
  'instruction',
  'meaning',
  'memory line',
  'main flow',
  'opening question',
  'reason',
  'response type',
  'simple explanation',
  'subtitle',
  'title',
  'trainer line',
  'url',
  'usage',
  'visual',
  'visual layout',
  'workflow',
])

export function generateTeachDrawBoard(
  editor: Editor,
  document: TeachDrawDocument,
  options?: Partial<GenerateTeachDrawOptions>
): void {
  const opts = { ...defaultOptions, ...options }
  if (opts.clearBeforeGenerate) clearGeneratedShapes(editor)

  if (opts.layoutMode === 'whiteboard-notes') {
    generateWhiteboardNotesLayout(editor, document, opts)
    return
  }

  generateFrameGridLayout(editor, document, opts)
}

export function clearGeneratedShapes(editor: Editor): void {
  const generatedShapeIds = editor
    .getCurrentPageShapes()
    .filter((shape) => shape.meta?.teachDrawGenerated === true)
    .map((shape) => shape.id)

  if (generatedShapeIds.length > 0) {
    editor.deleteShapes(generatedShapeIds)
  }
}

function generateWhiteboardNotesLayout(editor: Editor, document: TeachDrawDocument, options: GenerateTeachDrawOptions) {
  const shapes: ShapePartial[] = []
  const boardTitleEndY = createWhiteboardBoardTitle(shapes, document, whiteboard.boardY)
  const columnYs = Array.from({ length: whiteboard.mapColumns }, () => boardTitleEndY)

  document.frames.forEach((frame, index) => {
    const column = getShortestColumnIndex(columnYs)
    const x = whiteboard.boardX + column * (whiteboard.mapColumnWidth + whiteboard.mapGapX)
    const y = columnYs[column]
    const height = estimateWhiteboardMapSectionHeight(frame)

    createWhiteboardMapSection(shapes, frame, index, x, y, height, options)
    columnYs[column] = y + height + whiteboard.mapGapY
  })

  editor.createShapes(shapes)
  editor.setCamera({ x: -70, y: -40, z: 0.82 }, { animation: { duration: 260 } })
}

function getShortestColumnIndex(columnYs: number[]): number {
  return columnYs.reduce((bestIndex, y, index) => (y < columnYs[bestIndex] ? index : bestIndex), 0)
}

function createWhiteboardBoardTitle(shapes: ShapePartial[], document: TeachDrawDocument, y: number): number {
  const title = document.boardTitle || document.rawTitle || 'Untitled Lesson'
  const meta = { blockHeading: 'Board Title', blockKind: 'title' }
  const titleWidth = getWhiteboardMapTotalWidth()

  shapes.push(
    createTextShape({
      x: whiteboard.boardX,
      y,
      w: titleWidth,
      text: title,
      color: 'black',
      size: 'xl',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: whiteboard.boardX,
      y: y + 72,
      w: 760,
      h: 10,
      text: '',
      color: 'blue',
      fill: 'solid',
      meta,
    }),
    createGeoCard({
      x: whiteboard.boardX + 792,
      y: y + 72,
      w: 260,
      h: 10,
      text: '',
      color: 'green',
      fill: 'solid',
      meta,
    })
  )

  let nextY = y + 118

  if (document.boardSubtitle) {
    shapes.push(
      createTextShape({
        x: whiteboard.boardX,
        y: nextY,
        w: titleWidth,
        text: document.boardSubtitle,
        color: 'green',
        size: 'l',
        boldLineCount: 1,
        meta: { blockHeading: 'Board Subtitle', blockKind: 'normal' },
      })
    )
    nextY += 92
  }

  return nextY + 92
}

function getWhiteboardMapTotalWidth(): number {
  return whiteboard.mapColumns * whiteboard.mapColumnWidth + (whiteboard.mapColumns - 1) * whiteboard.mapGapX
}

function createWhiteboardMapSection(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  index: number,
  x: number,
  y: number,
  _h: number,
  options: GenerateTeachDrawOptions
) {
  const frameMeta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const accent = pickSectionColor(index)
  const pad = whiteboard.mapPadding
  const innerX = x + pad
  const innerW = whiteboard.mapColumnWidth - pad * 2
  let cursorY = y

  shapes.push(
    createTextShape({
      x: innerX,
      y: cursorY,
      w: innerW,
      text: frame.frameTitle,
      color: accent,
      size: 'l',
      boldLineCount: 1,
      meta: frameMeta,
    }),
    createGeoCard({
      x: innerX,
      y: cursorY + 46,
      w: Math.min(420, Math.max(180, frame.frameTitle.length * 9)),
      h: 6,
      text: '',
      color: accent,
      fill: 'solid',
      meta: frameMeta,
    })
  )

  cursorY += 70

  const titleBlock = frame.blocks.find((block) => block.kind === 'title')
  if (titleBlock) {
    const titleText = cleanVisibleText(blockPrimaryText(titleBlock))
    if (titleText && titleText !== frame.frameTitle) {
      shapes.push(
        createTextShape({
          x: innerX + 14,
          y: cursorY,
          w: innerW - 14,
          text: titleText,
          color: 'black',
          size: 'm',
          boldLineCount: 1,
          meta: { ...frameMeta, blockHeading: titleBlock.heading, blockKind: titleBlock.kind },
        }),
        createGeoCard({
          x: innerX,
          y: cursorY + 4,
          w: 6,
          h: 28,
          text: '',
          color: 'yellow',
          fill: 'solid',
          meta: { ...frameMeta, blockHeading: titleBlock.heading, blockKind: titleBlock.kind },
        })
      )
      cursorY += 52
    }
  }

  const contentBlocks = frame.blocks.filter((block) => block !== titleBlock)
  const mainBlocks = contentBlocks.filter((block) => block.kind !== 'keyPoint' && block.kind !== 'warning')
  const anchorBlocks = contentBlocks.filter((block) => block.kind === 'keyPoint' || block.kind === 'warning')

  mainBlocks.forEach((block) => {
    cursorY = renderWhiteboardMapBlock(shapes, block, innerX, cursorY, innerW, frameMeta, options.flowOrientation)
  })

  anchorBlocks.forEach((block) => {
    const blockHeight = Math.max(getCalloutMinHeight(block), Math.min(220, estimateWhiteboardBlockHeight(block, innerW)))
    createCallout(shapes, block, innerX, cursorY, innerW, blockHeight, block.kind === 'warning' ? 'Watch out' : getKeyPointLabel(block), block.kind === 'warning' ? 'red' : 'orange', frameMeta)
    cursorY += blockHeight + 14
  })
}

function renderWhiteboardMapBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const specialKind = getSpecialTextBlockKind(block)

  if (block.kind === 'flow') {
    const heading = cleanBlockHeading(block.heading)
    let cursorY = y
    if (heading) {
      createMapHeading(shapes, heading, x, cursorY, w, 'blue', meta)
      cursorY += 48
    }

    const flowHeight = renderCompactFlow(shapes, block.flowSteps, x, cursorY, w, flowOrientation, meta)
    return cursorY + flowHeight + 24
  }

  if (shouldRenderAsCodeOrCommand(block)) {
    const height = Math.max(138, estimateWhiteboardBlockHeight(block, w))
    shapes.push(
      createGeoCard({
        x,
        y,
        w,
        h: height,
        text: buildCodeCardText(block),
        color: block.kind === 'command' ? 'green' : 'violet',
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: 's',
        boldLineCount: getCodeCardBoldLineCount(block),
        verticalAlign: 'start',
        meta,
      })
    )
    return y + height + 24
  }

  if (specialKind === 'endpoint-list') {
    const height = Math.max(88, estimateWhiteboardBlockHeight(block, w))
    createEndpointListBlock(shapes, block, x, y, w, height, frameMeta)
    return y + height + 20
  }

  if (specialKind === 'url-list') {
    const height = Math.max(82, estimateWhiteboardBlockHeight(block, w))
    createUrlListBlock(shapes, block, x, y, w, height, frameMeta)
    return y + height + 18
  }

  if (specialKind === 'folder-tree') {
    const height = Math.max(136, Math.min(360, estimateWhiteboardBlockHeight(block, w)))
    createFolderTreeBlock(shapes, block, x, y, w, height, frameMeta)
    return y + height + 22
  }

  if (specialKind === 'formula') {
    createFormulaBlock(shapes, block, x, y, w, 120, frameMeta)
    return y + 132
  }

  if (block.kind === 'assignment' || block.kind === 'task' || block.kind === 'recap' || block.kind === 'definition') {
    const label = block.kind === 'assignment' ? 'Assignment' : block.kind === 'task' ? 'Practice' : block.kind === 'recap' ? 'Recap' : cleanBlockHeading(block.heading) || 'Definition'
    const height = Math.max(120, Math.min(220, estimateWhiteboardBlockHeight(block, w)))
    createCallout(shapes, block, x, y, w, height, label, getCalloutColor(block.kind), frameMeta)
    return y + height + 20
  }

  return renderWhiteboardMapTextBlock(shapes, block, x, y, w, frameMeta)
}

function renderWhiteboardMapTextBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
): number {
  const heading = cleanBlockHeading(block.heading)
  const body = buildPlainTextBody(block)
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  let cursorY = y

  if (heading) {
    createMapHeading(shapes, heading, x, cursorY, w, getNoteHeadingColor(block.kind), meta)
    cursorY += 44
  }

  if (body) {
    const bodyHeight = estimateTextBodyHeight(body, w)
    shapes.push(
      createTextShape({
        x: heading ? x + 14 : x,
        y: cursorY,
        w: heading ? w - 14 : w,
        text: body,
        color: 'black',
        size: 'm',
        meta,
      })
    )
    cursorY += bodyHeight
  }

  return cursorY + 18
}

function createMapHeading(
  shapes: ShapePartial[],
  heading: string,
  x: number,
  y: number,
  w: number,
  color: 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet',
  meta: GeneratedMeta
) {
  shapes.push(
    createTextShape({
      x,
      y,
      w,
      text: heading,
      color,
      size: 'm',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x,
      y: y + 32,
      w: Math.min(210, Math.max(86, heading.length * 8)),
      h: 5,
      text: '',
      color,
      fill: 'solid',
      meta,
    })
  )
}

function renderCompactFlow(
  shapes: ShapePartial[],
  steps: string[],
  x: number,
  y: number,
  w: number,
  preference: GenerateTeachDrawOptions['flowOrientation'],
  meta: GeneratedMeta
): number {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const orientation = preference === 'auto' ? 'vertical' : chooseFlowOrientation(safeSteps, preference)

  if (orientation === 'horizontal') {
    const gap = 28
    const boxW = Math.max(132, Math.min(190, (w - gap * (safeSteps.length - 1)) / safeSteps.length))
    const boxH = 64
    const totalWidth = safeSteps.length * boxW + (safeSteps.length - 1) * gap
    const startX = x + Math.max(0, (w - totalWidth) / 2)

    safeSteps.forEach((step, index) => {
      const boxX = startX + index * (boxW + gap)
      shapes.push(
        createGeoCard({
          x: boxX,
          y,
          w: boxW,
          h: boxH,
          text: step,
          color: getFlowStepColor(index),
          fill: 'semi',
          align: 'middle',
          size: 'm',
          boldLineCount: 1,
          meta,
        })
      )

      if (index < safeSteps.length - 1) {
        shapes.push(createArrow({ x: boxX + boxW + 6, y: y + boxH / 2, endX: boxX + boxW + gap - 6, endY: y + boxH / 2, color: 'black', meta }))
      }
    })

    return boxH
  }

  const boxW = Math.min(620, w)
  const boxH = 56
  const gap = 22
  const boxX = x + (w - boxW) / 2

  safeSteps.forEach((step, index) => {
    const boxY = y + index * (boxH + gap)
    shapes.push(
      createGeoCard({
        x: boxX,
        y: boxY,
        w: boxW,
        h: boxH,
        text: step,
        color: getFlowStepColor(index),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )

    if (index < safeSteps.length - 1) {
      shapes.push(createArrow({ x: boxX + boxW / 2, y: boxY + boxH + 6, endX: boxX + boxW / 2, endY: boxY + boxH + gap - 6, color: 'black', meta }))
    }
  })

  return safeSteps.length * boxH + (safeSteps.length - 1) * gap
}

function estimateWhiteboardMapSectionHeight(frame: TeachDrawFrame): number {
  const titleBlock = frame.blocks.find((block) => block.kind === 'title')
  const contentBlocks = frame.blocks.filter((block) => block !== titleBlock)
  const innerW = whiteboard.mapColumnWidth - whiteboard.mapPadding * 2
  let height = 70

  if (titleBlock) {
    const titleText = cleanVisibleText(blockPrimaryText(titleBlock))
    if (titleText && titleText !== frame.frameTitle) height += 52
  }

  contentBlocks.forEach((block) => {
    height += estimateWhiteboardMapBlockHeight(block, innerW)
  })

  return Math.max(220, height + whiteboard.mapPadding)
}

function estimateWhiteboardMapBlockHeight(block: TeachDrawBlock, width: number): number {
  const specialKind = getSpecialTextBlockKind(block)
  if (block.kind === 'flow') {
    const steps = Math.max(block.flowSteps.length, 1)
    return (cleanBlockHeading(block.heading) ? 48 : 0) + steps * 56 + (steps - 1) * 22 + 24
  }

  if (shouldRenderAsCodeOrCommand(block)) {
    return Math.max(138, estimateWhiteboardBlockHeight(block, width)) + 24
  }

  if (block.kind === 'keyPoint' || block.kind === 'warning') {
    return Math.max(getCalloutMinHeight(block), Math.min(220, estimateWhiteboardBlockHeight(block, width))) + 14
  }

  if (block.kind === 'assignment' || block.kind === 'task' || block.kind === 'recap' || block.kind === 'definition') {
    return Math.max(120, Math.min(220, estimateWhiteboardBlockHeight(block, width))) + 20
  }

  if (specialKind === 'endpoint-list' || specialKind === 'url-list') return Math.max(88, estimateWhiteboardBlockHeight(block, width)) + 20
  if (specialKind === 'folder-tree') return Math.max(136, Math.min(360, estimateWhiteboardBlockHeight(block, width))) + 22
  if (specialKind === 'formula') return 132

  const heading = cleanBlockHeading(block.heading)
  const body = buildPlainTextBody(block)
  return (heading ? 44 : 0) + (body ? estimateTextBodyHeight(body, width) : 0) + 18
}

function estimateTextBodyHeight(text: string, width: number): number {
  const lines = text.split('\n')
  const estimatedLines = lines.reduce((sum, line) => {
    if (!line.trim()) return sum + 0.65
    return sum + Math.max(1, Math.ceil(line.length / Math.max(width / 10, 48)))
  }, 0)

  return Math.max(30, Math.ceil(estimatedLines * 28))
}

// Kept as a legacy renderer while the default whiteboard mode uses the masonry lesson board above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createWhiteboardSection(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  index: number,
  y: number,
  options: GenerateTeachDrawOptions
): number {
  const frameMeta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const accent = pickSectionColor(index)
  const sectionNumber = String(frame.frameNumber ?? index + 1).padStart(2, '0')
  let cursorY = y

  shapes.push(
    createGeoCard({
      x: whiteboard.boardX,
      y: cursorY,
      w: 58,
      h: 58,
      text: sectionNumber,
      color: accent,
      labelColor: 'white',
      fill: 'solid',
      align: 'middle',
      size: 'l',
      boldLineCount: 1,
      meta: frameMeta,
    }),
    createTextShape({
      x: whiteboard.boardX + 78,
      y: cursorY - 2,
      w: whiteboard.contentWidth - 78,
      text: frame.frameTitle,
      color: accent,
      size: 'xl',
      boldLineCount: 1,
      meta: frameMeta,
    }),
    createGeoCard({
      x: whiteboard.boardX + 80,
      y: cursorY + 68,
      w: 420,
      h: 8,
      text: '',
      color: accent,
      fill: 'solid',
      meta: frameMeta,
    })
  )

  cursorY += whiteboard.sectionHeadingGap

  const titleBlock = frame.blocks.find((block) => block.kind === 'title')
  if (titleBlock) {
    const titleText = blockPrimaryText(titleBlock)
    if (titleText) {
      shapes.push(
        createGeoCard({
          x: whiteboard.boardX + 40,
          y: cursorY - 4,
          w: whiteboard.contentWidth - 80,
          h: 76,
          text: titleText,
          color: 'yellow',
          fill: 'semi',
          align: 'middle',
          size: 'l',
          boldLineCount: 1,
          meta: { ...frameMeta, blockHeading: titleBlock.heading, blockKind: titleBlock.kind },
        }),
        createGeoCard({
          x: whiteboard.boardX + 40,
          y: cursorY - 4,
          w: 12,
          h: 76,
          text: '',
          color: 'black',
          fill: 'solid',
          meta: { ...frameMeta, blockHeading: titleBlock.heading, blockKind: titleBlock.kind },
        })
      )
      cursorY += 102
    }
  }

  const contentBlocks = frame.blocks.filter((block) => block !== titleBlock)
  const codeBlocks = contentBlocks.filter((block) => shouldRenderAsCodeOrCommand(block))
  const compareBlocks = contentBlocks.filter((block) => block.kind === 'compare')
  const flowBlocks = contentBlocks.filter((block) => block.kind === 'flow')
  const warnings = contentBlocks.filter((block) => block.kind === 'warning')
  const keyPoints = contentBlocks.filter((block) => block.kind === 'keyPoint')
  const regularBlocks = contentBlocks.filter(
    (block) => !codeBlocks.includes(block) && !compareBlocks.includes(block) && !flowBlocks.includes(block) && !warnings.includes(block) && !keyPoints.includes(block)
  )

  if (codeBlocks.length > 0) {
    const besideBlocks = [...regularBlocks, ...keyPoints, ...warnings]
    cursorY = renderWhiteboardCodeRows(shapes, codeBlocks, besideBlocks, cursorY, frameMeta)
  } else if (compareBlocks.length > 0) {
    compareBlocks.forEach((block) => {
      const height = Math.max(220, estimateWhiteboardBlockHeight(block, whiteboard.contentWidth))
      shapes.push(...renderCompareCard(block, undefined, whiteboard.boardX + 40, cursorY, 1280, height, { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }))
      cursorY += height + 54
    })
  }

  if (flowBlocks.length > 0) {
    flowBlocks.forEach((block) => {
      cursorY = renderWhiteboardFlowBlock(shapes, block, cursorY, frameMeta, options.flowOrientation)
    })
  }

  if (codeBlocks.length === 0) {
    cursorY = renderWhiteboardTextAndCallouts(shapes, regularBlocks, keyPoints, warnings, cursorY, frameMeta)
  } else {
    const unusedRegular = regularBlocks.filter((block) => !blockPrimaryText(block) && block.bullets.length === 0 && block.numberedItems.length === 0)
    if (unusedRegular.length > 0) {
      cursorY = renderWhiteboardTextAndCallouts(shapes, unusedRegular, [], [], cursorY, frameMeta)
    }
  }

  return cursorY + whiteboard.sectionGap
}

function renderWhiteboardCodeRows(
  shapes: ShapePartial[],
  codeBlocks: TeachDrawBlock[],
  besideBlocks: TeachDrawBlock[],
  y: number,
  frameMeta: GeneratedMeta
): number {
  let cursorY = y
  let sideIndex = 0

  codeBlocks.forEach((block) => {
    const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
    const height = Math.max(230, estimateWhiteboardBlockHeight(block, whiteboard.leftColWidth))
    const sideBlocks = besideBlocks.slice(sideIndex, sideIndex + 2)
    sideIndex += sideBlocks.length

    shapes.push(
      createGeoCard({
        x: whiteboard.boardX + 40,
        y: cursorY,
        w: whiteboard.leftColWidth,
        h: height,
        text: buildCodeCardText(block),
        color: block.kind === 'command' ? 'green' : 'violet',
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: 'm',
        boldLineCount: getCodeCardBoldLineCount(block),
        verticalAlign: 'start',
        meta,
      })
    )

    let sideY = cursorY
    sideBlocks.forEach((sideBlock) => {
      const sideHeight = sideBlock.kind === 'keyPoint' ? 190 : sideBlock.kind === 'warning' ? 150 : estimatePlainTextHeight(sideBlock, whiteboard.rightColWidth)
      renderWhiteboardBlock(shapes, sideBlock, whiteboard.boardX + 40 + whiteboard.leftColWidth + whiteboard.colGap, sideY, whiteboard.rightColWidth, sideHeight, frameMeta)
      sideY += sideHeight + 32
    })

    cursorY += Math.max(height, sideY - cursorY) + 64
  })

  const remainingSideBlocks = besideBlocks.slice(sideIndex)
  if (remainingSideBlocks.length > 0) {
    cursorY = renderWhiteboardTextAndCallouts(shapes, remainingSideBlocks, [], [], cursorY, frameMeta)
  }

  return cursorY
}

function renderWhiteboardFlowBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  y: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const x = whiteboard.boardX + 150
  const w = 1200
  const labelY = y
  const heading = cleanBlockHeading(block.heading)

  if (heading) {
    shapes.push(
      createTextShape({
        x,
        y: labelY,
        w,
        text: heading,
        color: 'blue',
        size: 'l',
        boldLineCount: 1,
        meta,
      }),
      createGeoCard({
        x,
        y: labelY + 44,
        w: Math.min(260, Math.max(120, heading.length * 10)),
        h: 6,
        text: '',
        color: 'blue',
        fill: 'solid',
        meta,
      })
    )
  }

  const flowY = heading ? y + 72 : y
  const flowHeight = renderLargeFlow(shapes, block.flowSteps, x, flowY, w, flowOrientation, meta)
  return flowY + flowHeight + 70
}

function renderWhiteboardTextAndCallouts(
  shapes: ShapePartial[],
  regularBlocks: TeachDrawBlock[],
  keyPoints: TeachDrawBlock[],
  warnings: TeachDrawBlock[],
  y: number,
  frameMeta: GeneratedMeta
): number {
  const cursorY = y
  const leftBlocks = regularBlocks
  const callouts = [...warnings, ...keyPoints]

  if (leftBlocks.length === 0 && callouts.length === 0) return cursorY

  const leftHeight = Math.max(
    0,
    leftBlocks.reduce((sum, block) => sum + estimatePlainTextHeight(block, whiteboard.leftColWidth) + 34, 0) - 34
  )
  const calloutHeight = Math.max(
    0,
    callouts.reduce((sum, block) => sum + Math.max(getCalloutMinHeight(block), estimateWhiteboardBlockHeight(block, whiteboard.rightColWidth)) + 30, 0) - 30
  )

  let leftY = cursorY
  leftBlocks.forEach((block) => {
    const height = estimatePlainTextHeight(block, whiteboard.leftColWidth)
    renderWhiteboardPlainText(shapes, block, whiteboard.boardX + 40, leftY, whiteboard.leftColWidth, height, frameMeta)
    leftY += height + 34
  })

  let calloutY = cursorY
  callouts.forEach((block) => {
    const height = Math.max(getCalloutMinHeight(block), Math.min(280, estimateWhiteboardBlockHeight(block, whiteboard.rightColWidth)))
    renderWhiteboardBlock(shapes, block, whiteboard.boardX + 40 + whiteboard.leftColWidth + whiteboard.colGap, calloutY, whiteboard.rightColWidth, height, frameMeta)
    calloutY += height + 30
  })

  return cursorY + Math.max(leftHeight, calloutHeight) + 66
}

function renderWhiteboardBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta
) {
  const specialKind = getSpecialTextBlockKind(block)

  if (specialKind === 'endpoint-list') {
    createEndpointListBlock(shapes, block, x, y, w, h, frameMeta)
    return
  }

  if (specialKind === 'url-list') {
    createUrlListBlock(shapes, block, x, y, w, h, frameMeta)
    return
  }

  if (specialKind === 'folder-tree') {
    createFolderTreeBlock(shapes, block, x, y, w, h, frameMeta)
    return
  }

  if (specialKind === 'formula') {
    createFormulaBlock(shapes, block, x, y, w, h, frameMeta)
    return
  }

  if (block.kind === 'keyPoint') {
    createCallout(shapes, block, x, y, w, h, getKeyPointLabel(block), 'orange', frameMeta)
    return
  }

  if (block.kind === 'warning') {
    createCallout(shapes, block, x, y, w, h, 'Watch out', 'red', frameMeta)
    return
  }

  if (block.kind === 'assignment' || block.kind === 'task' || block.kind === 'recap' || block.kind === 'definition') {
    const label = block.kind === 'assignment' ? 'Assignment' : block.kind === 'task' ? 'Practice' : block.kind === 'recap' ? 'Recap' : block.heading
    createCallout(shapes, block, x, y, w, h, label, getCalloutColor(block.kind), frameMeta)
    return
  }

  renderWhiteboardPlainText(shapes, block, x, y, w, h, frameMeta)
}

function renderWhiteboardPlainText(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta
) {
  const specialKind = getSpecialTextBlockKind(block)
  if (specialKind) {
    renderWhiteboardBlock(shapes, block, x, y, w, h, frameMeta)
    return
  }

  const heading = cleanBlockHeading(block.heading)
  const body = buildPlainTextBody(block)
  if (!heading && !body) return

  let bodyY = y

  if (heading) {
    const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: heading,
        color: getNoteHeadingColor(block.kind),
        size: 'm',
        boldLineCount: 1,
        meta,
      }),
      createGeoCard({
        x,
        y: y + 34,
        w: Math.min(260, Math.max(96, heading.length * 9)),
        h: 5,
        text: '',
        color: getNoteHeadingColor(block.kind),
        fill: 'solid',
        meta,
      })
    )
    bodyY += 54
  }

  if (body) {
    shapes.push(
      createTextShape({
        x: heading ? x + 20 : x,
        y: bodyY,
        w: heading ? w - 20 : w,
        text: body,
        color: 'black',
        size: 'm',
        meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
      })
    )
  }
}

function getCalloutMinHeight(block: TeachDrawBlock): number {
  return block.kind === 'keyPoint' ? 130 : 120
}

function getKeyPointLabel(block: TeachDrawBlock): string {
  const heading = block.heading.toLowerCase()
  if (heading.includes('important') || heading.includes('memory line') || heading.includes('trainer line')) {
    return 'Important'
  }

  return 'Key Point'
}

function getNoteHeadingColor(kind: TeachDrawBlock['kind']): 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' {
  switch (kind) {
    case 'example':
      return 'blue'
    case 'definition':
      return 'green'
    case 'task':
    case 'assignment':
      return 'orange'
    case 'warning':
      return 'red'
    case 'recap':
    case 'compare':
      return 'violet'
    default:
      return 'black'
  }
}

function createCallout(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: 'orange' | 'red' | 'green' | 'violet' | 'yellow' | 'blue',
  frameMeta: GeneratedMeta
) {
  const body = cleanVisibleText(blockPrimaryText(block))
  const list = [...block.bullets, ...block.numberedItems].map(cleanVisibleText)
  const text = [label ? `${label}:` : '', body, list.map((item) => `- ${item}`).join('\n')].filter(Boolean).join('\n\n')
  const hasStripe = Boolean(label)
  const cardX = hasStripe ? x + 18 : x
  const cardW = hasStripe ? w - 18 : w
  const cardColor = block.kind === 'keyPoint' ? 'yellow' : color

  if (hasStripe) {
    shapes.push(
      createGeoCard({
        x,
        y,
        w: 14,
        h,
        text: '',
        color,
        fill: 'solid',
        meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
      })
    )
  }

  shapes.push(
    createGeoCard({
      x: cardX,
      y,
      w: cardW,
      h,
      text,
      color: cardColor,
      labelColor: 'black',
      fill: 'semi',
      size: block.kind === 'keyPoint' || block.kind === 'warning' ? 'l' : 'm',
      boldLineCount: label ? 1 : 0,
      verticalAlign: 'start',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )
}

function createEndpointListBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  _h: number,
  frameMeta: GeneratedMeta
) {
  const endpoints = getVisualText(block)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => endpointRegex.test(line))
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const pillW = Math.min(230, Math.max(140, (w - 56) / 3))
  const pillH = 54
  const gap = 18
  const heading = cleanBlockHeading(block.heading)
  const contentY = heading ? y + 52 : y

  if (heading) {
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: heading,
        color: 'violet',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )
  }

  endpoints.forEach((endpoint, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    shapes.push(
      createGeoCard({
        x: x + col * (pillW + gap),
        y: contentY + row * (pillH + gap),
        w: pillW,
        h: pillH,
        text: endpoint,
        color: getEndpointColor(endpoint),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )
  })
}

function createUrlListBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  _h: number,
  frameMeta: GeneratedMeta
) {
  const urls = getVisualText(block)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => urlRegex.test(line))
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const heading = cleanBlockHeading(block.heading)
  const contentY = heading ? y + 48 : y

  if (heading) {
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: heading,
        color: 'blue',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )
  }

  urls.forEach((url, index) => {
    shapes.push(
      createTextShape({
        x: x + 22,
        y: contentY + index * 40,
        w: w - 22,
        text: url,
        color: 'blue',
        size: 'm',
        meta,
      })
    )
  })
}

function createFolderTreeBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta
) {
  const tree = getVisualText(block)
    .split('\n')
    .map((line) => {
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      const trimmed = cleanVisibleText(line.trim())
      if (!trimmed) return ''
      return `${' '.repeat(Math.floor(indent / 2) * 3)}${trimmed}`
    })
    .filter(Boolean)
    .join('\n')

  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text: [cleanBlockHeading(block.heading), tree].filter(Boolean).join('\n\n'),
      color: 'green',
      fill: 'semi',
      font: 'mono',
      size: 'm',
      boldLineCount: cleanBlockHeading(block.heading) ? 1 : 0,
      verticalAlign: 'start',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )
}

function createFormulaBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta
) {
  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h: Math.max(104, Math.min(h, 150)),
      text: cleanVisibleText(getVisualText(block).trim()),
      color: 'yellow',
      fill: 'semi',
      align: 'middle',
      size: 'l',
      boldLineCount: 1,
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )
}

function renderLargeFlow(
  shapes: ShapePartial[],
  steps: string[],
  x: number,
  y: number,
  w: number,
  preference: GenerateTeachDrawOptions['flowOrientation'],
  meta: GeneratedMeta
): number {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const orientation = chooseFlowOrientation(safeSteps, preference)

  if (orientation === 'horizontal') {
    const gap = 46
    const boxW = Math.max(170, Math.min(230, (w - gap * (safeSteps.length - 1)) / safeSteps.length))
    const boxH = 94
    const totalWidth = safeSteps.length * boxW + (safeSteps.length - 1) * gap
    const startX = x + (w - totalWidth) / 2

    safeSteps.forEach((step, index) => {
      const boxX = startX + index * (boxW + gap)
      shapes.push(
        createGeoCard({
          x: boxX,
          y,
          w: boxW,
          h: boxH,
          text: step,
          color: getFlowStepColor(index),
          fill: 'semi',
          align: 'middle',
          size: 'm',
          boldLineCount: 1,
          meta,
        })
      )

      if (index < safeSteps.length - 1) {
        shapes.push(createArrow({ x: boxX + boxW + 8, y: y + boxH / 2, endX: boxX + boxW + gap - 8, endY: y + boxH / 2, color: 'black', meta }))
      }
    })

    return boxH
  }

  const boxW = Math.min(760, w)
  const boxH = 78
  const gap = 42
  const boxX = x + (w - boxW) / 2

  safeSteps.forEach((step, index) => {
    const boxY = y + index * (boxH + gap)
    shapes.push(
      createGeoCard({
        x: boxX,
        y: boxY,
        w: boxW,
        h: boxH,
        text: step,
        color: getFlowStepColor(index),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )

    if (index < safeSteps.length - 1) {
      shapes.push(createArrow({ x: boxX + boxW / 2, y: boxY + boxH + 8, endX: boxX + boxW / 2, endY: boxY + boxH + gap - 8, color: 'black', meta }))
    }
  })

  return safeSteps.length * boxH + (safeSteps.length - 1) * gap
}

function generateFrameGridLayout(editor: Editor, document: TeachDrawDocument, options: GenerateTeachDrawOptions): void {
  const shapes: ShapePartial[] = []

  createBoardTitleShapes(shapes, document)
  createFrameShapes(shapes, document, options)

  editor.createShapes(shapes)
  editor.selectAll()
  editor.zoomToSelection({ animation: { duration: 320 } })
  editor.selectNone()
}

function createBoardTitleShapes(shapes: ShapePartial[], document: TeachDrawDocument) {
  const boardStartX = 100
  const boardStartY = 80
  const titleWidth = 1100
  const titleHeight = 140
  const title = document.boardTitle || document.rawTitle || 'Untitled Lesson'

  shapes.push(
    createGeoCard({
      x: boardStartX,
      y: boardStartY,
      w: titleWidth,
      h: titleHeight,
      text: title,
      color: 'blue',
      labelColor: 'black',
      fill: 'semi',
      size: 'xl',
      align: 'middle',
      meta: { blockHeading: 'Board Title', blockKind: 'title' },
    })
  )

  if (document.boardSubtitle) {
    shapes.push(
      createGeoCard({
        x: boardStartX,
        y: boardStartY + titleHeight + 20,
        w: titleWidth,
        h: 84,
        text: document.boardSubtitle,
        color: 'green',
        labelColor: 'black',
        fill: 'semi',
        size: 'm',
        align: 'middle',
        meta: { blockHeading: 'Board Subtitle', blockKind: 'normal' },
      })
    )
  }
}

function createFrameShapes(shapes: ShapePartial[], document: TeachDrawDocument, options: GenerateTeachDrawOptions) {
  const frameWidth = 900
  const horizontalGap = 160
  const verticalGap = 160
  const startX = 100
  const startY = 320
  const columns = options.layoutMode === 'vertical-cards' ? 1 : options.columns
  const rowHeights: number[] = []

  document.frames.forEach((frame, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const frameHeight = estimateFrameHeight(frame)
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, frameHeight)
    const previousRowsHeight = rowHeights.slice(0, row).reduce((sum, height) => sum + height + verticalGap, 0)
    const x = startX + column * (frameWidth + horizontalGap)
    const y = startY + previousRowsHeight
    const frameShape = createFrameShape({
      x,
      y,
      w: frameWidth,
      h: frameHeight,
      name: `Frame ${frame.frameNumber ?? index + 1}: ${frame.frameTitle}`,
      color: pickSectionColor(index),
      meta: { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle },
    })

    shapes.push(frameShape)
    createFrameContentShapes(shapes, frame, frameShape.id as TLShape['id'], options)
  })
}

function createFrameContentShapes(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  parentId: TLShape['id'],
  options: GenerateTeachDrawOptions
) {
  const contentX = 36
  let cursorY = 42
  const contentWidth = 828
  const meta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }

  shapes.push(
    createTextShape({
      x: contentX,
      y: cursorY,
      w: contentWidth,
      text: `Frame ${frame.frameNumber ?? ''}`.trim(),
      parentId,
      color: 'grey',
      size: 's',
      meta,
    }),
    createTextShape({
      x: contentX,
      y: cursorY + 34,
      w: contentWidth,
      text: frame.frameTitle,
      parentId,
      color: 'black',
      size: 'xl',
      meta,
    })
  )

  cursorY += 112

  for (const block of frame.blocks) {
    const height = estimateBlockHeight(block, contentWidth)
    createBlockShapes(shapes, block, parentId, contentX, cursorY, contentWidth, height, meta, options.flowOrientation)
    cursorY += height + 28
  }
}

function createBlockShapes(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
) {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }

  if (block.kind === 'flow') {
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: block.heading,
        parentId,
        color: 'black',
        size: 'm',
        meta,
      })
    )
    renderFlow(shapes, block.flowSteps, parentId, x, y + 42, w, flowOrientation, meta)
    return
  }

  if (block.kind === 'code' || block.kind === 'command' || block.codeBlocks.length > 0) {
    shapes.push(
      createGeoCard({
        x,
        y,
        w,
        h,
        text: buildCodeCardText(block),
        parentId,
        color: block.kind === 'command' ? 'orange' : 'violet',
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: 's',
        verticalAlign: 'start',
        meta,
      })
    )
    return
  }

  if (block.kind === 'compare') {
    shapes.push(...renderCompareCard(block, parentId, x, y, w, h, meta))
    return
  }

  const style = getBlockStyle(block.kind)
  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text: buildCardText(block),
      parentId,
      color: style.color,
      labelColor: 'black',
      fill: style.fill,
      size: style.size,
      verticalAlign: 'start',
      meta,
    })
  )
}

function renderFlow(
  shapes: ShapePartial[],
  steps: string[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  preference: GenerateTeachDrawOptions['flowOrientation'],
  meta: GeneratedMeta
) {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const orientation = chooseFlowOrientation(safeSteps, preference)

  if (orientation === 'horizontal') {
    const gap = 28
    const boxW = Math.max(112, Math.min(170, (w - gap * (safeSteps.length - 1)) / safeSteps.length))
    const boxH = 76

    safeSteps.forEach((step, index) => {
      const boxX = x + index * (boxW + gap)
      shapes.push(
        createGeoCard({
          x: boxX,
          y,
          w: boxW,
          h: boxH,
          text: step,
          parentId,
          color: 'blue',
          fill: 'semi',
          align: 'middle',
          size: 's',
          meta,
        })
      )

      if (index < safeSteps.length - 1) {
        shapes.push(createArrow({ x: boxX + boxW + 4, y: y + boxH / 2, endX: boxX + boxW + gap - 4, endY: y + boxH / 2, parentId, color: 'grey', meta }))
      }
    })
    return
  }

  const boxW = Math.min(560, w)
  const boxH = 62
  const gap = 30
  const boxX = x + (w - boxW) / 2

  safeSteps.forEach((step, index) => {
    const boxY = y + index * (boxH + gap)
    shapes.push(
      createGeoCard({
        x: boxX,
        y: boxY,
        w: boxW,
        h: boxH,
        text: step,
        parentId,
        color: 'blue',
        fill: 'semi',
        align: 'middle',
        meta,
      })
    )

    if (index < safeSteps.length - 1) {
      shapes.push(createArrow({ x: boxX + boxW / 2, y: boxY + boxH + 4, endX: boxX + boxW / 2, endY: boxY + boxH + gap - 4, parentId, color: 'grey', meta }))
    }
  })
}

function renderCompareCard(
  block: TeachDrawBlock,
  parentId: TLShape['id'] | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  meta: GeneratedMeta
): ShapePartial[] {
  const text = buildCardText(block)
  const halves = text.split(/\n\s*(?:vs|versus)\s*\n/i)

  if (halves.length >= 2) {
    return [
      createGeoCard({ x, y, w: w / 2 - 16, h, text: halves[0], parentId, color: 'blue', fill: 'semi', verticalAlign: 'start', meta }),
      createGeoCard({ x: x + w / 2 + 16, y, w: w / 2 - 16, h, text: halves.slice(1).join('\n'), parentId, color: 'orange', fill: 'semi', verticalAlign: 'start', meta }),
    ]
  }

  return [createGeoCard({ x, y, w, h, text, parentId, color: 'orange', fill: 'semi', verticalAlign: 'start', meta })]
}

function buildCardText(block: TeachDrawBlock): string {
  const parts = [block.heading]

  if (block.text) parts.push(block.text)
  if (block.bullets.length > 0) parts.push(block.bullets.map((item) => `- ${item}`).join('\n'))
  if (block.numberedItems.length > 0) parts.push(block.numberedItems.map((item, index) => `${index + 1}. ${item}`).join('\n'))

  return parts.filter(Boolean).join('\n\n')
}

function buildPlainTextBody(block: TeachDrawBlock): string {
  const parts: string[] = []
  const body = cleanVisibleText(blockPrimaryText(block))
  const list = [...block.bullets, ...block.numberedItems].map(cleanVisibleText).filter(Boolean)

  if (body) parts.push(body)
  if (list.length > 0) parts.push(list.map((item) => `- ${item}`).join('\n'))

  return parts.filter(Boolean).join('\n\n')
}

function getCodeCardBoldLineCount(block: TeachDrawBlock): number {
  const heading = cleanBlockHeading(block.heading)
  if (heading) return 1
  return block.codeBlocks.some((code) => code.language) ? 1 : 0
}

function blockPrimaryText(block: TeachDrawBlock): string {
  return block.text || block.codeBlocks.map((code) => code.content).join('\n\n')
}

function buildCodeCardText(block: TeachDrawBlock): string {
  const heading = cleanBlockHeading(block.heading)
  const textParts = block.text ? [heading, cleanVisibleText(block.text)].filter(Boolean) : [heading].filter(Boolean)
  const codeParts = block.codeBlocks.map((code) => {
    const language = normalizeLanguage(code.language)
    const showLanguage = language && codeLanguages.has(language) && language !== 'text'
    return [showLanguage ? displayLanguage(language) : '', code.content].filter(Boolean).join('\n')
  })

  if (codeParts.length === 0) {
    const inlineCommands = cleanVisibleText(block.bullets.length > 0 ? block.bullets.join('\n') : block.text)
    return [heading, inlineCommands].filter(Boolean).join('\n\n')
  }

  return [...textParts, ...codeParts].filter(Boolean).join('\n\n')
}

function estimateWhiteboardBlockHeight(block: TeachDrawBlock, width: number): number {
  const specialKind = getSpecialTextBlockKind(block)
  if (specialKind === 'endpoint-list') {
    const count = getVisualText(block).split('\n').filter((line) => endpointRegex.test(line.trim())).length
    return 62 + Math.ceil(count / 3) * 72
  }
  if (specialKind === 'url-list') {
    const count = getVisualText(block).split('\n').filter((line) => urlRegex.test(line.trim())).length
    return 58 + count * 40
  }
  if (specialKind === 'folder-tree') {
    const count = getVisualText(block).split('\n').filter((line) => line.trim()).length
    return Math.max(140, 78 + count * 32)
  }
  if (specialKind === 'formula') return 120

  const codeLines = block.codeBlocks.reduce((sum, code) => sum + code.content.split('\n').length + 2, 0)
  if (block.kind === 'code' || block.kind === 'command' || codeLines > 0) {
    return Math.max(220, 76 + codeLines * 30 + Math.ceil((block.text.length || 0) / 72) * 28)
  }

  const listCount = block.bullets.length + block.numberedItems.length
  const textLines = Math.ceil((block.text.length || 80) / Math.max(width / 11, 52))
  return Math.max(130, 78 + listCount * 34 + textLines * 28)
}

function estimatePlainTextHeight(block: TeachDrawBlock, width: number): number {
  const specialKind = getSpecialTextBlockKind(block)
  if (specialKind) return estimateWhiteboardBlockHeight(block, width)

  const listCount = block.bullets.length + block.numberedItems.length
  const textLines = Math.ceil((block.text.length || 80) / Math.max(width / 10, 48))
  return Math.max(118, 62 + listCount * 32 + textLines * 28)
}

function shouldRenderAsCodeOrCommand(block: TeachDrawBlock): boolean {
  if (block.kind === 'command') return true
  if (isCommandBlock(block)) return true
  if (getSpecialTextBlockKind(block)) return false

  return block.kind === 'code' || block.codeBlocks.some((code) => {
    const language = normalizeLanguage(code.language)
    return Boolean(language && codeLanguages.has(language) && language !== 'text' && !commandLanguages.has(language))
  })
}

function isCommandBlock(block: TeachDrawBlock): boolean {
  if (block.codeBlocks.some((code) => commandLanguages.has(normalizeLanguage(code.language)))) return true
  if (/command|terminal|run|install|powershell|bash|cmd/i.test(block.heading)) return true

  const lines = getVisualText(block).split('\n').map((line) => line.trim()).filter(Boolean)
  return lines.length > 0 && lines.every((line) => /^(npm|npx|pnpm|yarn|pip|python\s+-m|uvicorn|fastapi\s+dev|git)\b/i.test(line))
}

function getSpecialTextBlockKind(block: TeachDrawBlock): 'endpoint-list' | 'url-list' | 'folder-tree' | 'formula' | null {
  const text = getVisualText(block)
  if (!text.trim()) return null
  const textCodeOnly = block.codeBlocks.length > 0 && block.codeBlocks.every((code) => {
    const language = normalizeLanguage(code.language)
    return !language || language === 'text'
  })
  const canTreatAsVisualText = textCodeOnly || block.kind !== 'code' || !block.codeBlocks.length
  if (!canTreatAsVisualText) return null

  if (isEndpointList(text)) return 'endpoint-list'
  if (isUrlList(text)) return 'url-list'
  if (isFolderTree(text)) return 'folder-tree'
  if (isFormulaText(text)) return 'formula'
  return null
}

function getVisualText(block: TeachDrawBlock): string {
  const codeText = block.codeBlocks.map((code) => code.content).join('\n')
  return cleanVisibleText([block.text, block.bullets.join('\n'), block.numberedItems.join('\n'), codeText].filter(Boolean).join('\n'))
}

function isEndpointList(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  return lines.length > 0 && lines.every((line) => endpointRegex.test(line))
}

function isUrlList(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  return lines.length > 0 && lines.every((line) => urlRegex.test(line))
}

function isFolderTree(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return false
  const hasRootDir = lines.some((line) => /^\S.*\/$/.test(line.trim()))
  const hasIndentedChild = lines.some((line) => /^\s{2,}\S/.test(line))
  return hasRootDir && hasIndentedChild
}

function isFormulaText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.includes('=') || trimmed.includes('\n') || trimmed.length > 120) return false
  if (/^\s*[{[]/.test(trimmed)) return false
  if (/[;{}]|\b(function|const|let|var|return|def|class|import|from)\b/.test(trimmed)) return false
  return true
}

function normalizeLanguage(language?: string): string {
  return (language ?? '').trim().toLowerCase()
}

function displayLanguage(language: string): string {
  if (language === 'js') return 'javascript'
  if (language === 'ts') return 'typescript'
  if (language === 'shell') return 'bash'
  return language
}

function cleanBlockHeading(heading: string): string {
  const cleaned = cleanVisibleText(heading).replace(/:$/, '').trim()
  return hiddenWhiteboardHeadings.has(cleaned.toLowerCase()) ? '' : cleaned
}

function cleanVisibleText(text: string): string {
  return text
    .replaceAll('\u2192', '->')
    .replaceAll('\u00e2\u2020\u2019', '->')
    .replaceAll('\u00e2\u2020\u201c', '\u2193')
    .replaceAll('\u00e2\u20ac\u201d', '-')
    .replaceAll('\u00e2\u20ac\u201c', '-')
    .replaceAll('\u00e2\u20ac\u2122', "'")
    .replaceAll('\u00e2\u20ac\u0153', '"')
    .replaceAll('\u00e2\u20ac\u009d', '"')
    .replaceAll('\u00e2\u20ac\u02dc', "'")
    .replaceAll('\u00e2\u20ac\u00a2', '-')
    .replaceAll('\u00e2\u201d\u0153\u00e2\u201d\u20ac\u00e2\u201d\u20ac', '|--')
    .replaceAll('\u00e2\u201d\u201d\u00e2\u201d\u20ac\u00e2\u201d\u20ac', '`--')
    .replace(/\[(dir|file)\]\s*/gi, '')
    .replace(/^(URL|Code|Text)\s+$/gim, '')
    .trim()
}

function getEndpointColor(endpoint: string): 'blue' | 'green' | 'orange' | 'red' | 'violet' {
  const method = endpoint.split(/\s+/)[0]?.toUpperCase()
  if (method === 'GET') return 'blue'
  if (method === 'POST') return 'green'
  if (method === 'PUT' || method === 'PATCH') return 'orange'
  if (method === 'DELETE') return 'red'
  return 'violet'
}

function getFlowStepColor(index: number): 'blue' | 'green' | 'violet' | 'orange' {
  const colors = ['blue', 'green', 'violet', 'orange'] as const
  return colors[index % colors.length]
}

function getBlockStyle(kind: TeachDrawBlock['kind']): {
  color: 'black' | 'grey' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet'
  fill: 'none' | 'semi' | 'solid'
  size: 's' | 'm' | 'l' | 'xl'
} {
  switch (kind) {
    case 'title':
      return { color: 'blue', fill: 'semi', size: 'xl' }
    case 'keyPoint':
      return { color: 'yellow', fill: 'semi', size: 'm' }
    case 'warning':
      return { color: 'red', fill: 'semi', size: 'm' }
    case 'task':
      return { color: 'green', fill: 'semi', size: 'm' }
    case 'assignment':
      return { color: 'orange', fill: 'semi', size: 'm' }
    case 'recap':
      return { color: 'violet', fill: 'semi', size: 'm' }
    case 'definition':
      return { color: 'green', fill: 'semi', size: 'm' }
    case 'example':
      return { color: 'blue', fill: 'semi', size: 'm' }
    default:
      return { color: 'grey', fill: 'semi', size: 'm' }
  }
}

function getCalloutColor(kind: TeachDrawBlock['kind']): 'orange' | 'red' | 'green' | 'violet' | 'yellow' | 'blue' {
  switch (kind) {
    case 'warning':
      return 'red'
    case 'assignment':
      return 'orange'
    case 'task':
      return 'green'
    case 'recap':
      return 'violet'
    case 'definition':
      return 'green'
    default:
      return 'yellow'
  }
}

function pickSectionColor(index: number): 'blue' | 'green' | 'violet' | 'orange' | 'red' | 'black' {
  const colors = ['violet', 'blue', 'orange', 'green', 'red', 'black'] as const
  return colors[index % colors.length]
}

