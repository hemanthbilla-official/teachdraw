import type { Editor, TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame, TeachDrawLayoutHint } from '@/types/teachdraw'
import { cleanCodeContent } from '@/lib/markdown/markdownUtils'
import { chooseFlowOrientation } from './layoutHelpers'
import { createArrow, createFrameShape, createGeoCard, createTextShape, type ShapePartial } from './shapeHelpers'

export type LayoutMode = 'frame-grid' | 'vertical-cards' | 'horizontal-cards'

export type GenerateTeachDrawOptions = {
  layoutMode: LayoutMode
  columns: 2 | 3 | 4
  flowOrientation: 'auto' | 'vertical' | 'horizontal'
  spacing: SpacingPreset
  clearBeforeGenerate: boolean
}

export type SpacingPreset = 'comfortable' | 'spacious' | 'compact' | 'extra-compact' | 'extreme-compact'

const defaultOptions: GenerateTeachDrawOptions = {
  layoutMode: 'vertical-cards',
  columns: 3,
  flowOrientation: 'auto',
  spacing: 'comfortable',
  clearBeforeGenerate: true,
}

type GeneratedMeta = {
  frameNumber?: number
  frameTitle?: string
  blockHeading?: string
  blockKind?: string
}

type DecisionFlow = {
  question: string
  yesLabel: string
  yesText: string
  noLabel: string
  noText: string
}

const whiteboard = {
  boardX: 120,
  boardY: 100,
  contentWidth: 1900,
  leftColWidth: 1050,
  rightColWidth: 650,
  colGap: 120,
  sectionGap: 360,
  sectionHeadingGap: 108,
  sectionWidth: 1900,
  titleGapAfter: 180,
  headingGapAfter: 100,
  smallBlockGap: 44,
  cardPaddingX: 36,
  cardPaddingY: 30,
  minCardHeight: 130,
  normalCardWidth: 650,
  largeCardWidth: 1050,
  codeLineHeight: 30,
  codePadding: 34,
  minCodeBoxHeight: 240,
  flowNodeWidth: 760,
  flowNodeHeight: 76,
  flowGapY: 56,
  horizontalFlowNodeWidth: 280,
  horizontalFlowGapX: 90,
}

const spacingPresets = {
  spacious: {
    sectionGap: 480,
    headingGapAfter: 130,
    blockGap: 110,
    smallBlockGap: 70,
    columnGap: 160,
    cardPaddingX: 42,
    cardPaddingY: 36,
    chapterGap: 260,
    codeLineHeight: 32,
    bodyLineHeight: 32,
  },
  comfortable: {
    sectionGap: 360,
    headingGapAfter: 100,
    blockGap: 80,
    smallBlockGap: 44,
    columnGap: 120,
    cardPaddingX: 36,
    cardPaddingY: 30,
    chapterGap: 220,
    codeLineHeight: 30,
    bodyLineHeight: 30,
  },
  compact: {
    sectionGap: 240,
    headingGapAfter: 72,
    blockGap: 52,
    smallBlockGap: 30,
    columnGap: 90,
    cardPaddingX: 28,
    cardPaddingY: 24,
    chapterGap: 150,
    codeLineHeight: 26,
    bodyLineHeight: 26,
  },
  'extra-compact': {
    sectionGap: 160,
    headingGapAfter: 62,
    blockGap: 44,
    smallBlockGap: 28,
    columnGap: 64,
    cardPaddingX: 28,
    cardPaddingY: 24,
    chapterGap: 100,
    codeLineHeight: 30,
    bodyLineHeight: 29,
  },
  'extreme-compact': {
    sectionGap: 90,
    headingGapAfter: 46,
    blockGap: 32,
    smallBlockGap: 22,
    columnGap: 42,
    cardPaddingX: 24,
    cardPaddingY: 20,
    chapterGap: 60,
    codeLineHeight: 28,
    bodyLineHeight: 27,
  },
} as const

const spacingWidths = {
  spacious: {
    sectionWidth: 1900,
    leftColWidth: 1050,
    rightColWidth: 650,
  },
  comfortable: {
    sectionWidth: 1900,
    leftColWidth: 1050,
    rightColWidth: 650,
  },
  compact: {
    sectionWidth: 1700,
    leftColWidth: 940,
    rightColWidth: 560,
  },
  'extra-compact': {
    sectionWidth: 1500,
    leftColWidth: 820,
    rightColWidth: 500,
  },
  'extreme-compact': {
    sectionWidth: 1300,
    leftColWidth: 720,
    rightColWidth: 420,
  },
} as const

type WhiteboardLayout = ReturnType<typeof getWhiteboardLayout>
type LegacyCardLayout = ReturnType<typeof getLegacyCardLayout>

function getScaleForSpacing(spacing: SpacingPreset): number {
  switch (spacing) {
    case 'spacious':
      return 1.08
    case 'comfortable':
      return 1
    case 'compact':
      return 0.9
    case 'extra-compact':
      return 0.9
    case 'extreme-compact':
      return 0.84
  }
}

function getWhiteboardLayout(spacing: SpacingPreset) {
  const preset = spacingPresets[spacing]
  const widths = spacingWidths[spacing]
  const scale = getScaleForSpacing(spacing)

  return {
    ...preset,
    ...widths,
    spacing,
    scale,
    minCardHeight: Math.max(118, Math.round(whiteboard.minCardHeight * scale)),
    minCodeBoxHeight: whiteboard.minCodeBoxHeight,
    codeLineHeight: Math.max(34, preset.codeLineHeight),
    codePaddingY: Math.max(34, preset.cardPaddingY),
    flowNodeWidth: Math.max(700, Math.round(whiteboard.flowNodeWidth * scale)),
    flowNodeHeight: Math.max(76, Math.round(whiteboard.flowNodeHeight * scale)),
    flowGapY: Math.max(42, Math.round(whiteboard.flowGapY * scale)),
    horizontalFlowNodeWidth: Math.max(240, Math.round(whiteboard.horizontalFlowNodeWidth * scale)),
    horizontalFlowGapX: Math.max(62, Math.round(whiteboard.horizontalFlowGapX * scale)),
  }
}

function getLegacyCardLayout(spacing: SpacingPreset, mode: LayoutMode) {
  const whiteboardLayout = getWhiteboardLayout(spacing)
  const vertical = mode === 'vertical-cards'
  const horizontalCards = mode === 'horizontal-cards'
  const stacked = vertical || horizontalCards
  const scale = whiteboardLayout.scale

  const frameWidthBySpacing: Record<SpacingPreset, number> = horizontalCards
    ? {
        spacious: 1960,
        comfortable: 1780,
        compact: 1600,
        'extra-compact': 1440,
        'extreme-compact': 1280,
      }
    : vertical
    ? {
        spacious: 1420,
        comfortable: 1280,
        compact: 1180,
        'extra-compact': 1080,
        'extreme-compact': 980,
      }
    : {
        spacious: 1180,
        comfortable: 1080,
        compact: 980,
        'extra-compact': 900,
        'extreme-compact': 820,
      }

  return {
    spacing,
    mode,
    scale,
    frameWidth: frameWidthBySpacing[spacing],
    horizontalGap: stacked ? 0 : Math.max(120, Math.round(whiteboardLayout.columnGap * 1.45)),
    verticalGap: horizontalCards ? Math.max(140, Math.round(whiteboardLayout.sectionGap * 0.72)) : Math.max(96, Math.round(whiteboardLayout.sectionGap * 0.68)),
    contentPaddingX: Math.max(34, Math.round(52 * scale)),
    contentStartY: Math.max(38, Math.round(50 * scale)),
    titleGap: Math.max(102, Math.round(126 * scale)),
    blockGap: Math.max(30, Math.round(whiteboardLayout.blockGap * 0.58)),
    minFrameHeight: Math.max(620, Math.round((vertical ? 820 : horizontalCards ? 640 : 720) * scale)),
    cameraZoom: vertical
      ? Math.max(0.52, Math.min(0.72, 0.68 / scale))
      : horizontalCards
        ? Math.max(0.38, Math.min(0.54, 0.48 / scale))
        : Math.max(0.38, Math.min(0.58, 0.5 / scale)),
  }
}

const codeLanguages = new Set(['python', 'javascript', 'js', 'typescript', 'ts', 'bash', 'shell', 'powershell', 'cmd', 'json', 'html', 'css', 'sql'])
const commandLanguages = new Set(['bash', 'shell', 'powershell', 'cmd'])
const endpointRegex = /^(GET|POST|PUT|PATCH|DELETE)\s+\/\S*$/i
const urlRegex = /^https?:\/\/\S+$/i
const hiddenWhiteboardHeadings = new Set([
  'ask',
  'ask students',
  'board line',
  'browser url',
  'code',
  'command',
  'concept',
  'correct idea',
  'decision',
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
  'main flow',
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

// Kept temporarily while card modes share whiteboard sizing/rendering helpers.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateWhiteboardNotesLayout(editor: Editor, document: TeachDrawDocument, options: GenerateTeachDrawOptions) {
  const shapes: ShapePartial[] = []
  const layout = getWhiteboardLayout(options.spacing)
  let cursorY = createWhiteboardBoardTitle(shapes, document, whiteboard.boardY, layout)

  document.frames.forEach((frame, index) => {
    if (index > 0 && index % 6 === 0) {
      createWhiteboardChapterDivider(shapes, Math.floor(index / 6) + 1, cursorY, layout)
      cursorY += layout.chapterGap
    }

    cursorY = createWhiteboardTeachingSection(shapes, frame, index, cursorY, options)
    cursorY += layout.sectionGap
  })

  editor.createShapes(shapes)
  editor.setCamera({ x: -80, y: -50, z: 0.78 }, { animation: { duration: 260 } })
}

function createWhiteboardBoardTitle(shapes: ShapePartial[], document: TeachDrawDocument, y: number, layout: WhiteboardLayout): number {
  const title = cleanBoardTitleText(document.boardTitle || document.rawTitle || 'Untitled Lesson')
  const meta = { blockHeading: 'Board Title', blockKind: 'title' }
  const titleWidth = layout.sectionWidth

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
      w: Math.min(760, Math.round(titleWidth * 0.5)),
      h: 10,
      text: '',
      color: 'blue',
      fill: 'solid',
      meta,
    }),
    createGeoCard({
      x: whiteboard.boardX + Math.min(792, Math.round(titleWidth * 0.52)),
      y: y + 72,
      w: Math.min(260, Math.round(titleWidth * 0.18)),
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
        text: cleanBoardTitleText(document.boardSubtitle),
        color: 'green',
        size: 'l',
        boldLineCount: 1,
        meta: { blockHeading: 'Board Subtitle', blockKind: 'normal' },
      })
    )
    nextY += 92
  }

  return nextY + whiteboard.titleGapAfter
}

function cleanBoardTitleText(rawTitle?: string): string {
  return (rawTitle || 'Untitled Lesson')
    .replace(/^#*\s*/g, '')
    .replace(/^tldraw\s+script\s*:\s*/i, '')
    .replace(/^tldraw\s+content\s*:\s*/i, '')
    .replace(/^script\s*:\s*/i, '')
    .replace(/^content\s*:\s*/i, '')
    .replace(/\*\*/g, '')
    .trim() || 'Untitled Lesson'
}

function cleanFrameTitle(title: string): string {
  return cleanVisibleText(title)
    .replace(/^frame\s+\d+\s*:?\s*/i, '')
    .replace(/\*\*/g, '')
    .trim()
}

function getVisibleSectionTitle(frame: TeachDrawFrame): string {
  const titleBlock = frame.blocks.find((block) => block.kind === 'title' && cleanVisibleText(blockPrimaryText(block)).trim().length > 0)
  if (titleBlock) return cleanVisibleText(blockPrimaryText(titleBlock))
  return cleanFrameTitle(frame.frameTitle) || 'Untitled Section'
}

function createWhiteboardChapterDivider(
  shapes: ShapePartial[],
  chapterNumber: number,
  y: number,
  layout: WhiteboardLayout
) {
  const meta = { blockHeading: `Part ${chapterNumber}`, blockKind: 'title' }
  const width = layout.leftColWidth + layout.columnGap + layout.rightColWidth
  const label = `Part ${chapterNumber}`

  shapes.push(
    createTextShape({
      x: whiteboard.boardX,
      y,
      w: width,
      text: label,
      color: 'black',
      size: 'xl',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: whiteboard.boardX,
      y: y + 74,
      w: width,
      h: 8,
      text: '',
      color: 'black',
      fill: 'solid',
      meta,
    })
  )
}

function isSimilarTitle(a: string, b: string): boolean {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  return clean(a) === clean(b)
}

type WhiteboardColor = 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' | 'yellow' | 'grey'

function createDividerLine(
  shapes: ShapePartial[],
  x: number,
  y: number,
  w: number,
  color: WhiteboardColor,
  meta: GeneratedMeta,
  thickness = 6
) {
  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h: thickness,
      text: '',
      color,
      fill: 'solid',
      meta,
    })
  )
}

function createWhiteboardSectionHeading(
  shapes: ShapePartial[],
  title: string,
  x: number,
  y: number,
  w: number,
  color: 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet',
  meta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  const accentW = Math.max(10, Math.round(14 * layout.scale))
  const accentH = Math.max(72, Math.round(92 * layout.scale))
  const titleY = y - Math.round(4 * layout.scale)
  const underlineY = y + Math.max(68, Math.round(88 * layout.scale))
  const titleSize = layout.spacing === 'extra-compact' || layout.spacing === 'extreme-compact' ? 'xl' : 'xl'

  createDividerLine(shapes, x, y - Math.max(28, Math.round(38 * layout.scale)), Math.min(w, 960), 'grey', meta, 3)
  shapes.push(
    createGeoCard({
      x,
      y: y + 12,
      w: accentW,
      h: accentH,
      text: '',
      color,
      fill: 'solid',
      meta,
    }),
    createTextShape({
      x: x + accentW + 28,
      y: titleY,
      w: w - accentW - 28,
      text: title,
      color,
      size: titleSize,
      boldLineCount: 1,
      meta,
    })
  )

  createDividerLine(
    shapes,
    x + accentW + 28,
    underlineY,
    Math.min(620, Math.max(210, title.length * 12 * layout.scale)),
    color,
    meta,
    Math.max(7, Math.round(9 * layout.scale))
  )

  return Math.max(116, Math.round(142 * layout.scale))
}

function createSoftNoteBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  const heading = cleanBlockHeading(block.heading)
  const body = buildPlainTextBody(block)
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const color = getNoteHeadingColor(block.kind, block.heading)
  let cursorY = y

  if (heading) {
    createMapHeading(shapes, heading, x, cursorY, w, color, meta)
    cursorY += Math.max(46, Math.round(62 * layout.scale))
  }

  if (body) {
    const bodyW = heading ? w - 30 : w
    const bodyHeight = estimateTextHeight(body, bodyW > 900 ? 70 : 42, layout.bodyLineHeight + 2)
    const accentHeight = estimateAccentHeightForText(body, bodyW, layout.bodyLineHeight + 2, bodyW > 900 ? 70 : 42)
    const textX = heading ? x + 30 : x
    shapes.push(
      createGeoCard({
        x: textX - 14,
        y: cursorY + 2,
        w: 5,
        h: accentHeight,
        text: '',
        color,
        fill: 'solid',
        meta,
      })
    )
    shapes.push(
      createTextShape({
        x: textX,
        y: cursorY,
        w: bodyW,
        text: body,
        color: 'black',
        size: bodyW > 560 ? 'l' : 'm',
        meta,
      })
    )
    cursorY += bodyHeight
  }

  return Math.max(cursorY - y, heading ? 64 : 0)
}

function estimateAccentHeightForText(text: string, width: number, lineHeight: number, charsPerLine?: number): number {
  const estimatedHeight = estimateTextHeight(text, charsPerLine ?? (width > 900 ? 70 : 42), lineHeight)
  return Math.max(28, Math.min(estimatedHeight - lineHeight, estimatedHeight - 8))
}

function createEmphasisCallout(
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
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const stripeW = 16
  const cardColor = block.kind === 'keyPoint' ? 'yellow' : color

  shapes.push(
    createGeoCard({
      x,
      y,
      w: stripeW,
      h,
      text: '',
      color,
      fill: 'solid',
      meta,
    }),
    createGeoCard({
      x: x + stripeW,
      y,
      w: w - stripeW,
      h,
      text,
      color: cardColor,
      labelColor: 'black',
      fill: 'semi',
      size: 'l',
      boldLineCount: label ? 1 : 0,
      verticalAlign: 'start',
      meta,
    })
  )
}

function createCodeHeroBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  h: number,
  frameMeta: GeneratedMeta,
  layout: WhiteboardLayout
) {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const color = block.kind === 'command' ? 'green' : 'violet'
  const heading = cleanBlockHeading(block.heading)
  let cardY = y

  if (heading) {
    createMapHeading(shapes, heading, x, y, w, color, meta)
    cardY += Math.max(46, Math.round(62 * layout.scale))
  }

  shapes.push(
    createGeoCard({
      x,
      y: cardY,
      w,
      h: h - (cardY - y),
      text: buildCodeCardText(block),
      color,
      labelColor: 'black',
      fill: 'semi',
      font: 'mono',
      size: 'l',
      verticalAlign: 'start',
      meta,
    })
  )
}

function createFlowHero(
  shapes: ShapePartial[],
  steps: string[],
  x: number,
  y: number,
  w: number,
  preference: GenerateTeachDrawOptions['flowOrientation'],
  meta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  return renderReadableFlow(shapes, steps, x, y, w, preference, meta, layout)
}

function createWhiteboardTeachingSection(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  index: number,
  y: number,
  options: GenerateTeachDrawOptions
): number {
  const layout = getWhiteboardLayout(options.spacing)
  const frameMeta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const accent = pickSectionColor(index, frame)
  const leftX = whiteboard.boardX
  const rightX = leftX + layout.leftColWidth + layout.columnGap
  const contentW = layout.leftColWidth + layout.columnGap + layout.rightColWidth
  let cursorY = y
  const visibleTitle = getVisibleSectionTitle(frame)

  cursorY += createWhiteboardSectionHeading(shapes, visibleTitle, leftX, cursorY, contentW, accent, frameMeta, layout)
  cursorY += layout.headingGapAfter

  const titleBlock = frame.blocks.find((block) => block.kind === 'title')

  const contentBlocks = frame.blocks.filter((block) => {
    if (block === titleBlock) return false
    if (block.kind === 'title' && isSimilarTitle(cleanVisibleText(blockPrimaryText(block)), visibleTitle)) return false
    if (isSimilarTitle(cleanBlockHeading(block.heading), visibleTitle) && !blockPrimaryText(block)) return false
    return true
  })
  return renderAdaptiveTeachingContent(
    shapes,
    contentBlocks,
    leftX,
    rightX,
    cursorY,
    contentW,
    frameMeta,
    options.flowOrientation,
    layout,
    frame.layoutHint
  )
}

function renderAdaptiveTeachingContent(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  rightX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout,
  layoutHint?: TeachDrawLayoutHint
): number {
  if (blocks.length === 0) return y

  if (layoutHint === 'mistake-fix' || hasMistakeCorrectPair(blocks)) {
    return renderMistakeCorrectLesson(shapes, blocks, leftX, rightX, y, contentW, frameMeta, flowOrientation, layout)
  }

  if (layoutHint === 'flow-focus') {
    const diagramBlock = blocks.find((block) => block.kind === 'flow')
    if (diagramBlock) return renderDiagramFirstLesson(shapes, blocks, diagramBlock, leftX, rightX, y, contentW, frameMeta, flowOrientation, layout)
  }

  if (layoutHint === 'code-focus') {
    return renderCodeFirstLesson(shapes, blocks, leftX, rightX, y, frameMeta, flowOrientation, layout)
  }

  if (layoutHint === 'practice-grid') {
    return renderPracticeGridLesson(shapes, blocks, leftX, y, contentW, frameMeta, flowOrientation, layout)
  }

  if (layoutHint === 'comparison') {
    return renderComparisonLesson(shapes, blocks, leftX, y, contentW, frameMeta, flowOrientation, layout)
  }

  if (layoutHint === 'recap') {
    return renderRecapLesson(shapes, blocks, leftX, y, contentW, frameMeta, flowOrientation, layout)
  }

  const decisionBlock = blocks.find((block) => block.kind === 'flow' && parseDecisionFlow(block))
  if (decisionBlock) {
    return renderDiagramFirstLesson(shapes, blocks, decisionBlock, leftX, rightX, y, contentW, frameMeta, flowOrientation, layout)
  }

  const flowBlock = blocks.find((block) => block.kind === 'flow')
  if (flowBlock && !blocks.some(shouldRenderAsCodeOrCommand)) {
    return renderDiagramFirstLesson(shapes, blocks, flowBlock, leftX, rightX, y, contentW, frameMeta, flowOrientation, layout)
  }

  if (blocks.some(shouldRenderAsCodeOrCommand)) {
    return renderCodeFirstLesson(shapes, blocks, leftX, rightX, y, frameMeta, flowOrientation, layout)
  }

  return renderConceptLesson(shapes, blocks, leftX, rightX, y, frameMeta, flowOrientation, layout)
}

function renderCodeFirstLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  rightX: number,
  y: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const codeBlocks = blocks.filter(shouldRenderAsCodeOrCommand)
  const consumedBlocks = new Set<TeachDrawBlock>()
  let cursorY = y

  codeBlocks.forEach((codeBlock) => {
    const codeIndex = blocks.indexOf(codeBlock)
    const previousCodeIndex = Math.max(-1, ...codeBlocks.filter((block) => blocks.indexOf(block) < codeIndex).map((block) => blocks.indexOf(block)))
    const nextCodeIndex = codeBlocks
      .map((block) => blocks.indexOf(block))
      .find((index) => index > codeIndex) ?? blocks.length
    const beforeBlocks = blocks.slice(previousCodeIndex + 1, codeIndex).filter((block) => !consumedBlocks.has(block))
    const afterBlocks = blocks.slice(codeIndex + 1, nextCodeIndex).filter((block) => !consumedBlocks.has(block))
    const leadInBlocks = beforeBlocks.filter(isCodeLeadInBlock)
    const sideBlocks = [...beforeBlocks.filter((block) => !leadInBlocks.includes(block)), ...afterBlocks]
      .filter((block) => !consumedBlocks.has(block))
      .slice(0, 3)

    const leadInHeight = leadInBlocks.length > 0
      ? renderCompactLeadInGroup(shapes, leadInBlocks, leftX, cursorY, layout.leftColWidth, frameMeta, layout)
      : 0
    const codeY = cursorY + leadInHeight
    const codeHeight = renderTeachingBlock(shapes, codeBlock, leftX, codeY, layout.leftColWidth, frameMeta, flowOrientation, true, layout)
    const supportHeight = renderSideGroup(shapes, sideBlocks, rightX, codeY, layout.rightColWidth, frameMeta, flowOrientation, layout)

    consumedBlocks.add(codeBlock)
    leadInBlocks.forEach((block) => consumedBlocks.add(block))
    sideBlocks.forEach((block) => consumedBlocks.add(block))

    cursorY = Math.max(codeY + codeHeight, codeY + supportHeight) + layout.blockGap
  })

  const remainingSupport = blocks.filter((block) => !consumedBlocks.has(block))
  if (remainingSupport.length > 0) {
    cursorY = renderConceptColumns(shapes, remainingSupport, leftX, rightX, cursorY, frameMeta, flowOrientation, layout)
  }

  return cursorY
}

function isCodeLeadInBlock(block: TeachDrawBlock): boolean {
  const h = block.heading.toLowerCase()
  return (
    h.includes('before code') ||
    h.includes('definition') ||
    h.includes('setup') ||
    h.includes('starter') ||
    h.includes('goal') ||
    h.includes('what this code')
  )
}

function renderCompactLeadInGroup(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  let cursorY = y
  blocks.forEach((block) => {
    const height = renderTeachingPlainText(shapes, block, x, cursorY, w, frameMeta, layout)
    cursorY += height + Math.max(18, layout.smallBlockGap / 2)
  })
  return cursorY - y
}

function renderDiagramFirstLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  diagramBlock: TeachDrawBlock,
  leftX: number,
  rightX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const supportingBlocks = blocks.filter((block) => block !== diagramBlock)
  let cursorY = y
  const diagramHeight = renderTeachingBlock(shapes, diagramBlock, leftX, cursorY, contentW, frameMeta, flowOrientation, true, layout)
  cursorY += diagramHeight + layout.blockGap

  if (supportingBlocks.length > 0) {
    cursorY = renderConceptColumns(shapes, supportingBlocks, leftX, rightX, cursorY, frameMeta, flowOrientation, layout)
  }

  return cursorY
}

function renderPracticeGridLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const taskBlocks = blocks.filter((block) => block.kind === 'task' || block.kind === 'assignment')
  const remainingBlocks = blocks.filter((block) => !taskBlocks.includes(block))
  const gridBlocks = taskBlocks.length > 0 ? [...taskBlocks, ...remainingBlocks] : blocks
  const cellW = Math.max(520, Math.round((contentW - layout.columnGap) / 2))
  const rightGridX = leftX + cellW + layout.columnGap
  let cursorY = y

  for (let index = 0; index < gridBlocks.length; index += 2) {
    const leftBlock = gridBlocks[index]
    const rightBlock = gridBlocks[index + 1]
    const leftHeight = leftBlock ? renderTeachingBlock(shapes, leftBlock, leftX, cursorY, cellW, frameMeta, flowOrientation, true, layout) : 0
    const rightHeight = rightBlock ? renderTeachingBlock(shapes, rightBlock, rightGridX, cursorY, cellW, frameMeta, flowOrientation, true, layout) : 0
    cursorY += Math.max(leftHeight, rightHeight) + layout.blockGap
  }

  return cursorY
}

function renderComparisonLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const compareBlocks = blocks.filter((block) => block.kind === 'compare' || /\b(vs|versus|difference)\b/i.test(block.heading))
  const remainingBlocks = blocks.filter((block) => !compareBlocks.includes(block))
  let cursorY = y

  if (compareBlocks.length > 0) {
    compareBlocks.forEach((block) => {
      const height = renderTeachingBlock(shapes, block, leftX, cursorY, contentW, frameMeta, flowOrientation, true, layout)
      cursorY += height + layout.blockGap
    })
  }

  if (remainingBlocks.length > 0) {
    cursorY = renderPracticeGridLesson(shapes, remainingBlocks, leftX, cursorY, contentW, frameMeta, flowOrientation, layout)
  }

  return cursorY
}

function renderRecapLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const importantBlocks = blocks.filter(isAnchorBlock)
  const summaryBlocks = blocks.filter((block) => !importantBlocks.includes(block))
  const leftW = Math.round(contentW * 0.58)
  const rightW = contentW - leftW - layout.columnGap
  const rightX = leftX + leftW + layout.columnGap
  const leftHeight = renderSideGroup(shapes, summaryBlocks, leftX, y, leftW, frameMeta, flowOrientation, layout)
  const rightHeight = renderSideGroup(shapes, importantBlocks, rightX, y, rightW, frameMeta, flowOrientation, layout)
  return y + Math.max(leftHeight, rightHeight)
}

function renderConceptLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  rightX: number,
  y: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  return renderConceptColumns(shapes, blocks, leftX, rightX, y, frameMeta, flowOrientation, layout)
}

function renderConceptColumns(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  rightX: number,
  y: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const anchorBlocks = blocks.filter(isAnchorBlock)
  const noteBlocks = blocks.filter((block) => !anchorBlocks.includes(block))
  const leftHeight = renderSideGroup(shapes, noteBlocks, leftX, y, layout.leftColWidth, frameMeta, flowOrientation, layout)
  const rightHeight = renderSideGroup(shapes, anchorBlocks, rightX, y, layout.rightColWidth, frameMeta, flowOrientation, layout)
  return y + Math.max(leftHeight, rightHeight)
}

function renderMistakeCorrectLesson(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  leftX: number,
  rightX: number,
  y: number,
  contentW: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const mistakeBlocks = blocks.filter(isMistakeLikeBlock)
  const correctBlocks = blocks.filter(isCorrectLikeBlock)
  const used = new Set<TeachDrawBlock>([...mistakeBlocks, ...correctBlocks])
  const leftW = Math.max(420, Math.round((contentW - layout.columnGap) / 2))
  const rightW = leftW
  let cursorY = y

  const pairCount = Math.max(mistakeBlocks.length, correctBlocks.length)
  for (let index = 0; index < pairCount; index += 1) {
    const wrong = mistakeBlocks[index]
    const right = correctBlocks[index]
    const wrongHeight = wrong ? renderMistakePanel(shapes, wrong, leftX, cursorY, leftW, 'Mistake', 'red', frameMeta, flowOrientation, layout) : 0
    const rightHeight = right ? renderMistakePanel(shapes, right, leftX + leftW + layout.columnGap, cursorY, rightW, 'Correct', 'green', frameMeta, flowOrientation, layout) : 0
    cursorY += Math.max(wrongHeight, rightHeight) + layout.blockGap
  }

  const remaining = blocks.filter((block) => !used.has(block))
  if (remaining.length > 0) {
    cursorY = renderConceptColumns(shapes, remaining, leftX, rightX, cursorY, frameMeta, flowOrientation, layout)
  }

  return cursorY
}

function renderMistakePanel(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  label: string,
  color: 'red' | 'green',
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const headingHeight = Math.max(76, Math.round(90 * layout.scale))
  createMistakeFixPanelHeading(shapes, label, x, y, w, color, meta)

  const bodyY = y + headingHeight
  const bodyHeight = renderTeachingBlock(shapes, block, x, bodyY, w, frameMeta, flowOrientation, true, layout)
  return headingHeight + bodyHeight
}

function createMistakeFixPanelHeading(
  shapes: ShapePartial[],
  label: string,
  x: number,
  y: number,
  w: number,
  color: 'red' | 'green',
  meta: GeneratedMeta
) {
  shapes.push(
    createGeoCard({
      x,
      y,
      w: Math.min(260, Math.max(160, label.length * 22)),
      h: 54,
      text: label,
      color,
      labelColor: 'black',
      fill: 'semi',
      align: 'middle',
      size: 'l',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x,
      y: y + 64,
      w: Math.min(w, 460),
      h: 7,
      text: '',
      color,
      fill: 'solid',
      meta,
    })
  )
}

function isAnchorBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'keyPoint' || block.kind === 'warning' || block.kind === 'task' || block.kind === 'assignment' || block.kind === 'recap'
}

function isMistakeLikeBlock(block: TeachDrawBlock): boolean {
  const h = block.heading.toLowerCase()
  return block.kind === 'warning' || h.includes('mistake') || h.includes('wrong') || h.includes('bad approach') || h.includes('problem')
}

function isCorrectLikeBlock(block: TeachDrawBlock): boolean {
  const h = block.heading.toLowerCase()
  return h.includes('correct') || h.includes('fix') || h.includes('better') || h.includes('solution')
}

function getMistakeFixCodeLabel(heading: string): { label: 'Mistake' | 'Correct'; color: 'red' | 'green' } | null {
  const h = heading.toLowerCase()

  if (h.includes('mistake') || h.includes('wrong') || h.includes('bad approach') || h.includes('problem')) {
    return { label: 'Mistake', color: 'red' }
  }

  if (h.includes('correct') || h.includes('fix') || h.includes('better') || h.includes('solution')) {
    return { label: 'Correct', color: 'green' }
  }

  return null
}

function hasMistakeCorrectPair(blocks: TeachDrawBlock[]): boolean {
  return blocks.some(isMistakeLikeBlock) && blocks.some(isCorrectLikeBlock)
}

function inferFrameLayoutHint(frame: TeachDrawFrame): TeachDrawLayoutHint {
  if (frame.layoutHint) return frame.layoutHint
  if (hasMistakeCorrectPair(frame.blocks)) return 'mistake-fix'
  if (frame.blocks.some((block) => block.kind === 'flow')) return 'flow-focus'
  if (frame.blocks.some(shouldRenderAsCodeOrCommand)) return 'code-focus'
  if (frame.blocks.some((block) => block.kind === 'task' || block.kind === 'assignment')) return 'practice-grid'
  if (frame.blocks.some((block) => block.kind === 'compare')) return 'comparison'
  if (frame.blocks.every((block) => block.kind === 'recap' || block.kind === 'keyPoint' || block.kind === 'normal')) return 'recap'
  return 'concept-focus'
}

function renderSideGroup(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  layout: WhiteboardLayout
): number {
  let cursorY = y

  blocks.forEach((block) => {
    const height = renderTeachingBlock(shapes, block, x, cursorY, w, frameMeta, flowOrientation, false, layout)
    cursorY += height + layout.smallBlockGap
  })

  return cursorY - y
}

function renderTeachingBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  primary: boolean,
  layout: WhiteboardLayout
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const specialKind = getSpecialTextBlockKind(block)

  if (block.kind === 'flow') {
    const heading = cleanBlockHeading(block.heading)
    let cursorY = y
    if (heading) {
      createMapHeading(shapes, heading, x, cursorY, w, 'blue', meta)
      cursorY += Math.max(62, Math.round(76 * layout.scale))
    }

    const decision = parseDecisionFlow(block)
    if (decision) {
      const decisionHeight = renderDecisionFlow(shapes, decision, x, cursorY, w, meta, layout)
      return cursorY + decisionHeight - y
    }

    const flowHeight = createFlowHero(shapes, block.flowSteps, x, cursorY, w, flowOrientation, meta, layout)
    return cursorY + flowHeight - y
  }

  if (shouldRenderAsCodeOrCommand(block)) {
    const height = estimateCodeCardHeight(block, layout)
    createCodeHeroBlock(shapes, block, x, y, w, height, frameMeta, layout)
    return height
  }

  if (specialKind === 'endpoint-list') {
    const height = Math.max(layout.minCardHeight, estimateWhiteboardBlockHeight(block, w))
    createEndpointListBlock(shapes, block, x, y, w, height, frameMeta)
    return height
  }

  if (specialKind === 'url-list') {
    const height = Math.max(120, estimateWhiteboardBlockHeight(block, w))
    createUrlListBlock(shapes, block, x, y, w, height, frameMeta)
    return height
  }

  if (specialKind === 'folder-tree') {
    const height = Math.max(layout.minCardHeight, estimateWhiteboardBlockHeight(block, w))
    createFolderTreeBlock(shapes, block, x, y, w, height, frameMeta)
    return height
  }

  if (specialKind === 'formula') {
    const height = Math.max(layout.minCardHeight, estimateTextHeight(getVisualText(block), 56, layout.bodyLineHeight))
    createFormulaBlock(shapes, block, x, y, w, height, frameMeta)
    return height
  }

  if (block.kind === 'compare') {
    const height = Math.max(layout.minCardHeight + 80, estimateWhiteboardBlockHeight(block, w))
    shapes.push(...renderCompareCard(block, undefined, x, y, w, height, meta))
    return height
  }

  if (block.kind === 'keyPoint' || block.kind === 'warning' || block.kind === 'assignment' || block.kind === 'task' || block.kind === 'recap') {
    const label =
      block.kind === 'keyPoint'
        ? getKeyPointLabel(block)
        : block.kind === 'warning'
          ? getWarningLabel(block)
          : block.kind === 'assignment' || block.kind === 'task'
            ? 'Practice'
            : 'Recap'
    const height = Math.max(getCalloutMinHeight(block, layout), estimateTextHeight(buildCalloutText(block, label), primary ? 72 : 42, layout.bodyLineHeight))
    createEmphasisCallout(shapes, block, x, y, w, height, label, block.kind === 'keyPoint' ? 'orange' : getCalloutColor(block.kind), frameMeta)
    return height
  }

  return renderTeachingPlainText(shapes, block, x, y, w, frameMeta, layout)
}

function renderTeachingPlainText(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  return createSoftNoteBlock(shapes, block, x, y, w, frameMeta, layout)
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
      size: 'l',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x,
      y: y + 42,
      w: Math.min(260, Math.max(104, heading.length * 10)),
      h: 7,
      text: '',
      color,
      fill: 'solid',
      meta,
    })
  )
}

function renderReadableFlow(
  shapes: ShapePartial[],
  steps: string[],
  x: number,
  y: number,
  w: number,
  preference: GenerateTeachDrawOptions['flowOrientation'],
  meta: GeneratedMeta,
  layout: WhiteboardLayout
): number {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const orientation =
    preference === 'auto'
      ? safeSteps.length <= 4 && safeSteps.every((step) => step.length <= 24)
        ? 'horizontal'
        : 'vertical'
      : chooseFlowOrientation(safeSteps, preference)

  if (orientation === 'horizontal') {
    const gap = layout.horizontalFlowGapX
    const boxW = Math.min(layout.horizontalFlowNodeWidth, Math.max(190, (w - gap * (safeSteps.length - 1)) / safeSteps.length))
    const boxH = layout.flowNodeHeight
    const totalWidth = safeSteps.length * boxW + (safeSteps.length - 1) * gap
    const startX = x + Math.max(0, (w - totalWidth) / 2)

    safeSteps.forEach((step, index) => {
      const boxX = startX + index * (boxW + gap)
      const color = getHeroFlowStepColor(index, safeSteps.length)
      shapes.push(
        createGeoCard({
          x: boxX,
          y,
          w: boxW,
          h: boxH,
          text: step,
          color,
          fill: 'semi',
          align: 'middle',
          size: 'l',
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

  const boxW = w < 540 ? w : Math.min(layout.flowNodeWidth, w)
  const boxH = layout.flowNodeHeight
  const gap = layout.flowGapY
  const boxX = x + (w - boxW) / 2

  safeSteps.forEach((step, index) => {
    const boxY = y + index * (boxH + gap)
    const color = getHeroFlowStepColor(index, safeSteps.length)
    shapes.push(
      createGeoCard({
        x: boxX,
        y: boxY,
        w: boxW,
        h: boxH,
        text: step,
        color,
        fill: 'semi',
        align: 'middle',
        size: 'l',
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

function parseDecisionFlow(block: TeachDrawBlock): DecisionFlow | null {
  const visualText = getVisualText(block)
  const lines = visualText
    .split('\n')
    .map((line) => cleanVisibleText(line).trim())
    .filter(Boolean)

  const inlineDecision = parseInlineDecisionFlow(lines.join(' '))
  if (inlineDecision) return inlineDecision

  if (lines.length < 2) return null

  const yesMatch = findDecisionBranch(lines, ['yes', 'true'])
  const noMatch = findDecisionBranch(lines, ['no', 'false'])
  if (!yesMatch || !noMatch) return null

  const questionLine = lines.find((line, index) => {
    if (index === yesMatch.index || index === noMatch.index) return false
    if (isDecisionBranchLine(line)) return false
    return line.endsWith('?') || /^(if|is|does|should|can|has|user|value|condition)\b/i.test(line)
  })

  const headingQuestion = cleanBlockHeading(block.heading)
  const question = questionLine || (/(decision|condition|if|branch)/i.test(headingQuestion) ? '' : headingQuestion) || lines[0]
  if (!question || isDecisionBranchLine(question)) return null

  return {
    question,
    yesLabel: yesMatch.label,
    yesText: yesMatch.text,
    noLabel: noMatch.label,
    noText: noMatch.text,
  }
}

function parseInlineDecisionFlow(text: string): DecisionFlow | null {
  const match = text.match(/^(.*?)\?\s*(yes|true)\s*(?:->|=>|:|-)\s*(.+?)\s+(no|false)\s*(?:->|=>|:|-)\s*(.+)$/i)
  if (!match) return null

  return {
    question: `${cleanVisibleText(match[1]).trim()}?`,
    yesLabel: normalizeDecisionLabel(match[2]),
    yesText: cleanVisibleText(match[3]).trim(),
    noLabel: normalizeDecisionLabel(match[4]),
    noText: cleanVisibleText(match[5]).trim(),
  }
}

function findDecisionBranch(lines: string[], labels: string[]): { index: number; label: string; text: string } | null {
  for (const [index, line] of lines.entries()) {
    const branch = parseDecisionBranchLine(line, labels)
    if (branch) return { index, ...branch }
  }

  return null
}

function parseDecisionBranchLine(line: string, labels: string[]): { label: string; text: string } | null {
  const labelPattern = labels.join('|')
  const match = line.match(new RegExp(`^(${labelPattern})\\s*(?:->|=>|:|-|=)\\s*(.+)$`, 'i'))
  if (!match) return null

  return {
    label: normalizeDecisionLabel(match[1]),
    text: cleanVisibleText(match[2]).trim(),
  }
}

function isDecisionBranchLine(line: string): boolean {
  return Boolean(parseDecisionBranchLine(line, ['yes', 'true', 'no', 'false']))
}

function normalizeDecisionLabel(label: string): string {
  const normalized = label.toLowerCase()
  if (normalized === 'true') return 'True'
  if (normalized === 'false') return 'False'
  return normalized === 'yes' ? 'Yes' : 'No'
}

function renderDecisionFlow(
  shapes: ShapePartial[],
  decision: DecisionFlow,
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta,
  layout: WhiteboardLayout,
  parentId?: TLShape['id']
): number {
  const diamondW = Math.min(360, Math.max(260, Math.round(w * 0.34)))
  const diamondH = Math.max(150, Math.round(170 * layout.scale))
  const branchW = Math.min(360, Math.max(240, Math.round((w - layout.columnGap) / 2)))
  const branchH = Math.max(layout.minCardHeight, estimateTextHeight(`${decision.yesText}\n${decision.noText}`, 36, layout.bodyLineHeight) / 2)
  const diamondX = x + (w - diamondW) / 2
  const branchY = y + diamondH + layout.flowGapY
  const canBranchSideBySide = branchW * 2 + layout.columnGap <= w
  const yesX = canBranchSideBySide ? x + (w - layout.columnGap) / 2 - branchW : x + (w - branchW) / 2
  const noX = canBranchSideBySide ? x + (w + layout.columnGap) / 2 : yesX
  const noY = canBranchSideBySide ? branchY : branchY + branchH + layout.smallBlockGap

  shapes.push(
    createGeoCard({
      x: diamondX,
      y,
      w: diamondW,
      h: diamondH,
      text: decision.question,
      geo: 'diamond',
      parentId,
      color: 'violet',
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: yesX,
      y: branchY,
      w: branchW,
      h: branchH,
      text: decision.yesText,
      parentId,
      color: 'green',
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: noX,
      y: noY,
      w: branchW,
      h: branchH,
      text: decision.noText,
      parentId,
      color: 'orange',
      fill: 'semi',
      align: 'middle',
      size: 'm',
      boldLineCount: 1,
      meta,
    }),
    createArrow({
      x: diamondX + diamondW * 0.32,
      y: y + diamondH * 0.78,
      endX: yesX + branchW / 2,
      endY: branchY - 8,
      parentId,
      color: 'green',
      meta,
    }),
    createArrow({
      x: diamondX + diamondW * 0.68,
      y: y + diamondH * 0.78,
      endX: noX + branchW / 2,
      endY: noY - 8,
      parentId,
      color: 'orange',
      meta,
    }),
    createTextShape({
      x: yesX + branchW / 2 - 34,
      y: branchY - 44,
      w: 90,
      text: decision.yesLabel,
      parentId,
      color: 'green',
      size: 's',
      boldLineCount: 1,
      meta,
    }),
    createTextShape({
      x: noX + branchW / 2 - 28,
      y: noY - 44,
      w: 90,
      text: decision.noLabel,
      parentId,
      color: 'orange',
      size: 's',
      boldLineCount: 1,
      meta,
    })
  )

  return diamondH + layout.flowGapY + (canBranchSideBySide ? branchH : branchH * 2 + layout.smallBlockGap)
}

function estimateDecisionFlowHeight(decision: DecisionFlow, width: number, layout: WhiteboardLayout): number {
  const diamondH = Math.max(150, Math.round(170 * layout.scale))
  const branchW = Math.min(360, Math.max(240, Math.round((width - layout.columnGap) / 2)))
  const branchH = Math.max(layout.minCardHeight, estimateTextHeight(`${decision.yesText}\n${decision.noText}`, 36, layout.bodyLineHeight) / 2)
  const canBranchSideBySide = branchW * 2 + layout.columnGap <= width

  return diamondH + layout.flowGapY + (canBranchSideBySide ? branchH : branchH * 2 + layout.smallBlockGap)
}

function estimateCodeCardHeight(block: TeachDrawBlock, layout: WhiteboardLayout): number {
  const headingHeight = cleanBlockHeading(block.heading) ? Math.max(46, Math.round(62 * layout.scale)) : 0
  const renderedText = buildCodeCardText(block)
  const renderedLineCount = renderedText ? renderedText.split('\n').length : 0

  return headingHeight + estimateReadableCodeBoxHeight(renderedLineCount, layout.codeLineHeight, layout.codePaddingY)
}

function estimateTextHeight(text: string, charsPerLine = 60, lineHeight = 30): number {
  const lines = text.split('\n')
  const estimatedLines = lines.reduce((sum, line) => {
    if (!line.trim()) return sum + 1
    return sum + Math.max(1, Math.ceil(line.length / charsPerLine))
  }, 0)

  return Math.max(lineHeight * 2, Math.ceil(estimatedLines * lineHeight + lineHeight * 2))
}

function estimateReadableCodeBoxHeight(lineCount: number, lineHeight = 34, paddingY = 30): number {
  const safeLineCount = Math.max(1, lineCount)
  const naturalHeight = safeLineCount * lineHeight + paddingY * 2
  const compactMinimum = safeLineCount === 1 ? 96 : safeLineCount <= 2 ? 128 : safeLineCount <= 5 ? 150 : safeLineCount <= 9 ? 190 : 230

  return Math.max(compactMinimum, naturalHeight)
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
  const visibleTitle = getVisibleSectionTitle(frame)
  let cursorY = y

  shapes.push(
    createGeoCard({
      x: whiteboard.boardX,
      y: cursorY + 10,
      w: 12,
      h: 58,
      text: '',
      color: accent,
      fill: 'solid',
      meta: frameMeta,
    }),
    createTextShape({
      x: whiteboard.boardX + 34,
      y: cursorY - 2,
      w: whiteboard.contentWidth - 34,
      text: visibleTitle,
      color: accent,
      size: 'xl',
      boldLineCount: 1,
      meta: frameMeta,
    }),
    createGeoCard({
      x: whiteboard.boardX + 34,
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
        size: 'l',
        boldLineCount: 0,
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
        color: getNoteHeadingColor(block.kind, block.heading),
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
        color: getNoteHeadingColor(block.kind, block.heading),
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

function getCalloutMinHeight(block: TeachDrawBlock, layout?: WhiteboardLayout): number {
  const scale = layout?.scale ?? 1
  return Math.max(132, Math.round((block.kind === 'keyPoint' ? 170 : 152) * scale))
}

function getKeyPointLabel(block: TeachDrawBlock): string {
  const heading = block.heading.toLowerCase()
  if (heading.includes('memory line') || heading.includes('memory') || heading.includes('remember')) {
    return 'Memory line'
  }

  if (heading.includes('formula') || heading.includes('core formula')) {
    return 'Formula'
  }

  if (heading.includes('important') || heading.includes('trainer line')) {
    return 'Important'
  }

  return 'Key Point'
}

function getWarningLabel(block: TeachDrawBlock): string {
  const heading = block.heading.toLowerCase()
  if (heading.includes('mistake') || heading.includes('wrong') || heading.includes('error')) return 'Mistake'
  if (heading.includes('avoid')) return 'Avoid'
  return 'Watch out'
}

function buildCalloutText(block: TeachDrawBlock, label: string): string {
  const body = cleanVisibleText(blockPrimaryText(block))
  const list = [...block.bullets, ...block.numberedItems].map(cleanVisibleText).filter(Boolean)
  return [label ? `${label}:` : '', body, list.map((item) => `- ${item}`).join('\n')].filter(Boolean).join('\n\n')
}

function getNoteHeadingColor(kind: TeachDrawBlock['kind'], heading = ''): 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' {
  const h = heading.toLowerCase()
  if (h.includes('question')) return 'blue'
  if (h.includes('answer')) return 'green'
  if (h.includes('meaning') || h.includes('explain')) return 'black'

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
  const legacyLayout = getLegacyCardLayout(options.spacing, options.layoutMode)

  createBoardTitleShapes(shapes, document)
  createFrameShapes(shapes, document, options, legacyLayout)

  editor.createShapes(shapes)
  editor.setCamera({ x: -60, y: -40, z: legacyLayout.cameraZoom }, { animation: { duration: 260 } })
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

function createFrameShapes(shapes: ShapePartial[], document: TeachDrawDocument, options: GenerateTeachDrawOptions, legacyLayout: LegacyCardLayout) {
  const frameWidth = legacyLayout.frameWidth
  const horizontalGap = legacyLayout.horizontalGap
  const verticalGap = legacyLayout.verticalGap
  const startX = 100
  const startY = 320
  const columns = options.layoutMode === 'vertical-cards' || options.layoutMode === 'horizontal-cards' ? 1 : options.columns
  const rowHeights: number[] = []

  document.frames.forEach((frame, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const frameHeight = estimateLegacyFrameHeight(frame, legacyLayout, options.flowOrientation)
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, frameHeight)
    const previousRowsHeight = rowHeights.slice(0, row).reduce((sum, height) => sum + height + verticalGap, 0)
    const x = startX + column * (frameWidth + horizontalGap)
    const y = startY + previousRowsHeight
    const frameShape = createFrameShape({
      x,
      y,
      w: frameWidth,
      h: frameHeight,
      name: cleanFrameTitle(frame.frameTitle),
      color: pickSectionColor(index),
      meta: { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle },
    })

    shapes.push(frameShape)
    createFrameContentShapes(shapes, frame, frameShape.id as TLShape['id'], options, legacyLayout)
  })
}

function createFrameContentShapes(
  shapes: ShapePartial[],
  frame: TeachDrawFrame,
  parentId: TLShape['id'],
  options: GenerateTeachDrawOptions,
  legacyLayout: LegacyCardLayout
) {
  const contentX = legacyLayout.contentPaddingX
  let cursorY = legacyLayout.contentStartY
  const frameWidth = legacyLayout.frameWidth
  const contentWidth = frameWidth - contentX * 2
  const meta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
  const title = getVisibleSectionTitle(frame)

  shapes.push(
    createTextShape({
      x: contentX,
      y: cursorY,
      w: contentWidth,
      text: title,
      parentId,
      color: pickSectionColor((frame.frameNumber ?? 1) - 1, frame),
      size: 'xl',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x: contentX,
      y: cursorY + 74,
      w: Math.min(420, Math.max(160, title.length * 10)),
      h: 8,
      text: '',
      parentId,
      color: pickSectionColor((frame.frameNumber ?? 1) - 1, frame),
      fill: 'solid',
      meta,
    })
  )

  cursorY += legacyLayout.titleGap

  const contentBlocks = frame.blocks.filter((block) => {
    if (block.kind !== 'title') return true
    return !isSimilarTitle(cleanVisibleText(blockPrimaryText(block)), title)
  })

  if (options.layoutMode === 'horizontal-cards') {
    createHorizontalCardContentShapes(shapes, contentBlocks, parentId, contentX, cursorY, contentWidth, meta, options, legacyLayout)
    return
  }

  for (const block of contentBlocks) {
    const height = estimateLegacyBlockHeight(block, contentWidth, options.flowOrientation)
    createBlockShapes(shapes, block, parentId, contentX, cursorY, contentWidth, height, meta, options.flowOrientation)
    cursorY += height + legacyLayout.blockGap
  }
}

function estimateLegacyFrameHeight(
  frame: TeachDrawFrame,
  legacyLayout: LegacyCardLayout,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
): number {
  const contentWidth = legacyLayout.frameWidth - legacyLayout.contentPaddingX * 2
  const contentBlocks = frame.blocks.filter((block) => {
    if (block.kind !== 'title') return true
    return !isSimilarTitle(cleanVisibleText(blockPrimaryText(block)), getVisibleSectionTitle(frame))
  })

  if (legacyLayout.mode === 'horizontal-cards') {
    const horizontalHeight = estimateHorizontalCardContentHeight(contentBlocks, contentWidth, flowOrientation, legacyLayout)
    return Math.max(legacyLayout.minFrameHeight, legacyLayout.titleGap + horizontalHeight + legacyLayout.contentStartY + 60)
  }

  const blocksHeight = contentBlocks.reduce(
    (sum, block) => sum + estimateLegacyBlockHeight(block, contentWidth, flowOrientation) + legacyLayout.blockGap,
    0
  )
  return Math.max(legacyLayout.minFrameHeight, legacyLayout.titleGap + blocksHeight + legacyLayout.contentStartY + 60)
}

function createHorizontalCardContentShapes(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: GenerateTeachDrawOptions,
  legacyLayout: LegacyCardLayout
) {
  const lanes = getHorizontalCardLanes(w, legacyLayout)
  const primaryBlocks = blocks.filter(isHorizontalPrimaryBlock)
  const sideBlocks = blocks.filter((block) => !isHorizontalPrimaryBlock(block))
  let sideIndex = 0
  let cursorY = y

  primaryBlocks.forEach((block) => {
    if (isHorizontalFullWidthBlock(block)) {
      const height = shouldUseHorizontalWrappedFlow(block, options.flowOrientation)
        ? estimateHorizontalWrappedFlowBlockHeight(block, w)
        : estimateLegacyBlockHeight(block, w, options.flowOrientation)

      if (shouldUseHorizontalWrappedFlow(block, options.flowOrientation)) {
        createHorizontalWrappedFlowBlock(shapes, block, parentId, x, cursorY, w, frameMeta)
      } else {
        createBlockShapes(shapes, block, parentId, x, cursorY, w, height, frameMeta, options.flowOrientation)
      }

      cursorY += height + legacyLayout.blockGap
      return
    }

    const primaryHeight = estimateLegacyBlockHeight(block, lanes.leftW, options.flowOrientation)
    const rowSideBlocks = sideBlocks.slice(sideIndex, sideIndex + 2)
    sideIndex += rowSideBlocks.length

    let sideY = cursorY
    rowSideBlocks.forEach((sideBlock, index) => {
      const sideHeight = estimateLegacyBlockHeight(sideBlock, lanes.rightW, options.flowOrientation)
      createBlockShapes(shapes, sideBlock, parentId, x, sideY, lanes.rightW, sideHeight, frameMeta, options.flowOrientation)
      sideY += sideHeight + (index < rowSideBlocks.length - 1 ? lanes.smallGap : 0)
    })

    const sideHeight = rowSideBlocks.length > 0 ? sideY - cursorY : 0
    const rowHeight = Math.max(primaryHeight, sideHeight)
    createBlockShapes(shapes, block, parentId, x + getHorizontalPrimaryRightX(lanes), cursorY, lanes.leftW, primaryHeight, frameMeta, options.flowOrientation)
    cursorY += rowHeight + legacyLayout.blockGap
  })

  const remainingBlocks = primaryBlocks.length > 0 ? sideBlocks.slice(sideIndex) : sideBlocks
  createHorizontalGridRows(shapes, remainingBlocks, parentId, x, cursorY, lanes, frameMeta, options.flowOrientation, legacyLayout)
}

function createHorizontalGridRows(
  shapes: ShapePartial[],
  blocks: TeachDrawBlock[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  lanes: HorizontalCardLanes,
  frameMeta: GeneratedMeta,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  legacyLayout: LegacyCardLayout
) {
  let cursorY = y

  for (let index = 0; index < blocks.length; index += 2) {
    const leftBlock = blocks[index]
    const rightBlock = blocks[index + 1]
    const leftHeight = leftBlock ? estimateLegacyBlockHeight(leftBlock, lanes.leftW, flowOrientation) : 0
    const rightHeight = rightBlock ? estimateLegacyBlockHeight(rightBlock, lanes.rightW, flowOrientation) : 0
    const rowHeight = Math.max(leftHeight, rightHeight)

    if (leftBlock) {
      createBlockShapes(shapes, leftBlock, parentId, x, cursorY, lanes.leftW, leftHeight, frameMeta, flowOrientation)
    }

    if (rightBlock) {
      createBlockShapes(shapes, rightBlock, parentId, x + lanes.rightX, cursorY, lanes.rightW, rightHeight, frameMeta, flowOrientation)
    }

    cursorY += rowHeight + legacyLayout.blockGap
  }
}

function estimateHorizontalCardContentHeight(
  blocks: TeachDrawBlock[],
  width: number,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation'],
  legacyLayout: LegacyCardLayout
): number {
  const lanes = getHorizontalCardLanes(width, legacyLayout)
  const primaryBlocks = blocks.filter(isHorizontalPrimaryBlock)
  const sideBlocks = blocks.filter((block) => !isHorizontalPrimaryBlock(block))
  let sideIndex = 0
  let height = 0

  primaryBlocks.forEach((block) => {
    if (isHorizontalFullWidthBlock(block)) {
      height += shouldUseHorizontalWrappedFlow(block, flowOrientation)
        ? estimateHorizontalWrappedFlowBlockHeight(block, width) + legacyLayout.blockGap
        : estimateLegacyBlockHeight(block, width, flowOrientation) + legacyLayout.blockGap
      return
    }

    const primaryHeight = estimateLegacyBlockHeight(block, lanes.leftW, flowOrientation)
    const rowSideBlocks = sideBlocks.slice(sideIndex, sideIndex + 2)
    sideIndex += rowSideBlocks.length
    const sideHeight = rowSideBlocks.reduce((sum, sideBlock, index) => {
      const gap = index < rowSideBlocks.length - 1 ? lanes.smallGap : 0
      return sum + estimateLegacyBlockHeight(sideBlock, lanes.rightW, flowOrientation) + gap
    }, 0)

    height += Math.max(primaryHeight, sideHeight) + legacyLayout.blockGap
  })

  const remainingBlocks = primaryBlocks.length > 0 ? sideBlocks.slice(sideIndex) : sideBlocks
  for (let index = 0; index < remainingBlocks.length; index += 2) {
    const leftBlock = remainingBlocks[index]
    const rightBlock = remainingBlocks[index + 1]
    const leftHeight = leftBlock ? estimateLegacyBlockHeight(leftBlock, lanes.leftW, flowOrientation) : 0
    const rightHeight = rightBlock ? estimateLegacyBlockHeight(rightBlock, lanes.rightW, flowOrientation) : 0
    height += Math.max(leftHeight, rightHeight) + legacyLayout.blockGap
  }

  return Math.max(0, height - legacyLayout.blockGap)
}

type HorizontalCardLanes = {
  leftW: number
  rightX: number
  rightW: number
  smallGap: number
}

function getHorizontalCardLanes(width: number, legacyLayout: LegacyCardLayout): HorizontalCardLanes {
  const gap = Math.max(58, Math.round(legacyLayout.blockGap * 1.25))
  const leftW = Math.round((width - gap) * 0.64)
  const rightW = width - leftW - gap

  return {
    leftW,
    rightX: leftW + gap,
    rightW,
    smallGap: Math.max(24, Math.round(legacyLayout.blockGap * 0.62)),
  }
}

function getHorizontalPrimaryRightX(lanes: HorizontalCardLanes): number {
  const gap = lanes.rightX - lanes.leftW
  return lanes.rightW + gap
}

function isHorizontalPrimaryBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'flow' || block.kind === 'compare' || shouldRenderAsCodeOrCommand(block)
}

function isHorizontalFullWidthBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'flow' || block.kind === 'compare'
}

function shouldUseHorizontalWrappedFlow(
  block: TeachDrawBlock,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
): boolean {
  return block.kind === 'flow' && flowOrientation !== 'vertical' && !parseDecisionFlow(block)
}

function estimateHorizontalWrappedFlowBlockHeight(block: TeachDrawBlock, width: number): number {
  const headingHeight = cleanBlockHeading(block.heading) ? 62 : 0
  const steps = block.flowSteps.length > 0 ? block.flowSteps : ['Flow step']
  return headingHeight + estimateHorizontalWrappedFlowHeight(steps, width)
}

function createHorizontalWrappedFlowBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
) {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const heading = cleanBlockHeading(block.heading)
  let flowY = y

  if (heading) {
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: heading,
        parentId,
        color: 'blue',
        size: 'l',
        boldLineCount: 1,
        meta,
      }),
      createGeoCard({
        x,
        y: y + 42,
        w: Math.min(260, Math.max(120, heading.length * 10)),
        h: 7,
        text: '',
        parentId,
        color: 'blue',
        fill: 'solid',
        meta,
      })
    )
    flowY += 62
  }

  renderHorizontalWrappedFlow(shapes, block.flowSteps, parentId, x, flowY, w, meta)
}

function getHorizontalWrappedFlowMetrics(stepCount: number, width: number) {
  const boxW = 260
  const boxH = 76
  const gapX = 70
  const gapY = 74
  const columns = Math.max(2, Math.min(5, Math.floor((width + gapX) / (boxW + gapX)), stepCount || 1))
  const rows = Math.max(1, Math.ceil(Math.max(1, stepCount) / columns))

  return { boxW, boxH, gapX, gapY, columns, rows }
}

function estimateHorizontalWrappedFlowHeight(steps: string[], width: number): number {
  const metrics = getHorizontalWrappedFlowMetrics(Math.max(1, steps.length), width)
  return metrics.rows * metrics.boxH + Math.max(0, metrics.rows - 1) * metrics.gapY
}

function renderHorizontalWrappedFlow(
  shapes: ShapePartial[],
  steps: string[],
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta
) {
  const safeSteps = steps.length > 0 ? steps : ['Flow step']
  const metrics = getHorizontalWrappedFlowMetrics(safeSteps.length, w)
  const positions = safeSteps.map((step, index) => {
    const row = Math.floor(index / metrics.columns)
    const indexInRow = index % metrics.columns
    const rowStartIndex = row * metrics.columns
    const rowStepCount = Math.min(metrics.columns, safeSteps.length - rowStartIndex)
    const rowWidth = rowStepCount * metrics.boxW + Math.max(0, rowStepCount - 1) * metrics.gapX
    const rowX = x + Math.max(0, (w - rowWidth) / 2)
    const visualIndex = row % 2 === 0 ? indexInRow : rowStepCount - 1 - indexInRow

    return {
      step,
      x: rowX + visualIndex * (metrics.boxW + metrics.gapX),
      y: y + row * (metrics.boxH + metrics.gapY),
      row,
    }
  })

  positions.forEach((position, index) => {
    shapes.push(
      createGeoCard({
        x: position.x,
        y: position.y,
        w: metrics.boxW,
        h: metrics.boxH,
        text: position.step,
        parentId,
        color: getHeroFlowStepColor(index, safeSteps.length),
        fill: 'semi',
        align: 'middle',
        size: 'm',
        boldLineCount: 1,
        meta,
      })
    )

    const next = positions[index + 1]
    if (!next) return

    if (next.row === position.row) {
      const leftToRight = next.x > position.x
      shapes.push(
        createArrow({
          x: leftToRight ? position.x + metrics.boxW + 8 : position.x - 8,
          y: position.y + metrics.boxH / 2,
          endX: leftToRight ? next.x - 8 : next.x + metrics.boxW + 8,
          endY: next.y + metrics.boxH / 2,
          parentId,
          color: 'grey',
          meta,
        })
      )
      return
    }

    shapes.push(
      createArrow({
        x: position.x + metrics.boxW / 2,
        y: position.y + metrics.boxH + 8,
        endX: next.x + metrics.boxW / 2,
        endY: next.y - 8,
        parentId,
        color: 'grey',
        meta,
      })
    )
  })
}

function estimateLegacyBlockHeight(
  block: TeachDrawBlock,
  width: number,
  flowOrientation: GenerateTeachDrawOptions['flowOrientation']
): number {
  if (block.kind === 'flow') {
    const decision = parseDecisionFlow(block)
    const steps = block.flowSteps.length > 0 ? block.flowSteps : ['Flow step']
    if (decision) {
      const headingHeight = cleanBlockHeading(block.heading) ? 62 : 0
      return headingHeight + estimateDecisionFlowHeight(decision, width, getWhiteboardLayout('compact'))
    }
    const orientation = chooseFlowOrientation(steps, flowOrientation)
    if (orientation === 'horizontal') return 170
    return 72 + steps.length * 86 + Math.max(0, steps.length - 1) * 36
  }

  if (shouldRenderAsCodeOrCommand(block)) {
    const codeText = buildCodeCardText(block)
    const lines = Math.max(1, codeText.split('\n').length)
    const mistakeFixLabel = getMistakeFixCodeLabel(block.heading)
    const headingHeight = mistakeFixLabel ? 84 : cleanBlockHeading(block.heading) ? 62 : 0
    return headingHeight + estimateReadableCodeBoxHeight(lines, 34, 30)
  }

  if (block.kind === 'compare') {
    const columns = parseComparisonColumns(buildComparisonCardText(block))
    if (columns.length >= 2) {
      const columnCount = Math.min(3, columns.length)
      const gap = columnCount === 3 ? Math.max(36, Math.round(width * 0.03)) : Math.max(52, Math.round(width * 0.04))
      const columnWidth = (width - gap * (columnCount - 1)) / columnCount
      const charsPerLine = columnWidth > 420 ? 42 : 32
      const tallest = columns
        .slice(0, 3)
        .reduce((max, column) => Math.max(max, estimateTextHeight(column, charsPerLine, 34)), 0)
      return Math.max(280, tallest + 36)
    }
    return Math.max(240, estimateTextHeight(buildComparisonCardText(block), width > 1000 ? 78 : 58, 32))
  }

  const text = buildCardText(block)
  const lineHeight = block.kind === 'keyPoint' || block.kind === 'warning' || block.kind === 'task' || block.kind === 'assignment' ? 34 : 32
  const charsPerLine = width > 1000 ? 80 : 62
  return Math.max(getLegacyMinBlockHeight(block), estimateTextHeight(text, charsPerLine, lineHeight))
}

function getLegacyMinBlockHeight(block: TeachDrawBlock): number {
  if (block.kind === 'keyPoint' || block.kind === 'warning') return 170
  if (block.kind === 'task' || block.kind === 'assignment' || block.kind === 'recap') return 190
  return 150
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
    const decision = parseDecisionFlow(block)
    const heading = cleanBlockHeading(block.heading)
    const flowY = heading ? y + 62 : y
    if (heading) {
      shapes.push(
        createTextShape({
          x,
          y,
          w,
          text: heading,
          parentId,
          color: 'blue',
          size: 'l',
          boldLineCount: 1,
          meta,
        }),
        createGeoCard({
          x,
          y: y + 42,
          w: Math.min(260, Math.max(120, heading.length * 10)),
          h: 7,
          text: '',
          parentId,
          color: 'blue',
          fill: 'solid',
          meta,
        })
      )
    }

    if (decision) {
      renderDecisionFlow(shapes, decision, x, flowY, w, meta, getWhiteboardLayout('compact'), parentId)
      return
    }

    renderFlow(shapes, block.flowSteps, parentId, x, flowY, w, flowOrientation, meta)
    return
  }

  if (shouldRenderAsCodeOrCommand(block)) {
    const mistakeFixLabel = getMistakeFixCodeLabel(block.heading)
    const heading = mistakeFixLabel ? '' : cleanBlockHeading(block.heading)
    let cardY = y
    let cardColor: 'blue' | 'green' | 'orange' | 'red' | 'violet' = block.kind === 'command' ? 'green' : 'violet'

    if (mistakeFixLabel) {
      createLegacyMistakeFixCodeLabel(shapes, mistakeFixLabel.label, parentId, x, y, w, mistakeFixLabel.color, meta)
      cardY += 84
      cardColor = mistakeFixLabel.color
    } else if (heading) {
      const headingColor: 'green' | 'violet' = block.kind === 'command' ? 'green' : 'violet'
      shapes.push(
        createTextShape({
          x,
          y,
          w,
          text: heading,
          parentId,
          color: headingColor,
          size: 'l',
          boldLineCount: 1,
          meta,
        }),
        createGeoCard({
          x,
          y: y + 42,
          w: Math.min(260, Math.max(120, heading.length * 10)),
          h: 7,
          text: '',
          parentId,
          color: headingColor,
          fill: 'solid',
          meta,
        })
      )
      cardY += 62
    }

    const codeText = buildCodeCardText(block)
    const codeLineCount = Math.max(1, codeText.split('\n').length)
    const codeCardHeight = estimateReadableCodeBoxHeight(codeLineCount, 34, 30)

    shapes.push(
      createGeoCard({
        x,
        y: cardY,
        w,
        h: codeCardHeight,
        parentId,
        text: codeText,
        color: cardColor,
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: 'l',
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

  if (block.kind === 'keyPoint' || block.kind === 'warning' || block.kind === 'assignment' || block.kind === 'task' || block.kind === 'recap') {
    const label =
      block.kind === 'keyPoint'
        ? getKeyPointLabel(block)
        : block.kind === 'warning'
          ? getWarningLabel(block)
          : block.kind === 'recap'
            ? 'Recap'
            : 'Practice'
    const color = block.kind === 'keyPoint' ? 'orange' : getCalloutColor(block.kind)
    const stripeW = 16
    shapes.push(
      createGeoCard({
        x,
        y,
        w: stripeW,
        h,
        parentId,
        text: '',
        color,
        fill: 'solid',
        meta,
      }),
      createGeoCard({
        x: x + stripeW,
        y,
        w: w - stripeW,
        h,
        text: buildCalloutText(block, label),
        parentId,
        color: block.kind === 'keyPoint' ? 'yellow' : color,
        labelColor: 'black',
        fill: 'semi',
        size: 'l',
        boldLineCount: 1,
        verticalAlign: 'start',
        meta,
      })
    )
    return
  }

  renderLegacyPlainBlock(shapes, block, parentId, x, y, w, h, meta)
}

function createLegacyMistakeFixCodeLabel(
  shapes: ShapePartial[],
  label: string,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  color: 'red' | 'green',
  meta: GeneratedMeta
) {
  shapes.push(
    createGeoCard({
      x,
      y,
      w: Math.min(260, Math.max(170, label.length * 24)),
      h: 54,
      text: label,
      parentId,
      color,
      labelColor: 'black',
      fill: 'semi',
      align: 'middle',
      size: 'l',
      boldLineCount: 1,
      meta,
    }),
    createGeoCard({
      x,
      y: y + 64,
      w: Math.min(w, 440),
      h: 7,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta,
    })
  )
}

function renderLegacyPlainBlock(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  h: number,
  meta: GeneratedMeta
) {
  const heading = cleanBlockHeading(block.heading)
  const body = buildPlainTextBody(block)
  const color = getNoteHeadingColor(block.kind, block.heading)
  let cursorY = y

  if (heading) {
    shapes.push(
      createTextShape({
        x,
        y,
        w,
        text: heading,
        parentId,
        color,
        size: 'l',
        boldLineCount: 1,
        meta,
      }),
      createGeoCard({
        x,
        y: y + 42,
        w: Math.min(260, Math.max(120, heading.length * 10)),
        h: 7,
        text: '',
        parentId,
        color,
        fill: 'solid',
        meta,
      })
    )
    cursorY += 66
  }

  if (!body) return
  const bodyW = w - 22
  const accentHeight = estimateAccentHeightForText(body, bodyW, 32, bodyW > 900 ? 80 : 62)

  shapes.push(
    createGeoCard({
      x,
      y: cursorY,
      w: 6,
      h: accentHeight,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta,
    }),
    createTextShape({
      x: x + 22,
      y: cursorY,
      w: bodyW,
      text: body,
      parentId,
      color: 'black',
      size: 'm',
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
    const gap = 48
    const boxW = Math.max(150, Math.min(230, (w - gap * (safeSteps.length - 1)) / safeSteps.length))
    const boxH = 82

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
          size: 'm',
          boldLineCount: 1,
          meta,
        })
      )

      if (index < safeSteps.length - 1) {
        shapes.push(createArrow({ x: boxX + boxW + 4, y: y + boxH / 2, endX: boxX + boxW + gap - 4, endY: y + boxH / 2, parentId, color: 'grey', meta }))
      }
    })
    return
  }

  const boxW = Math.min(760, w)
  const boxH = 82
  const gap = 44
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
        size: 'm',
        boldLineCount: 1,
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
  const text = buildComparisonCardText(block)
  const columns = parseComparisonColumns(text)

  if (columns.length >= 2) {
    const visibleColumns = columns.slice(0, 3)
    const gap = visibleColumns.length === 3 ? Math.max(36, Math.round(w * 0.03)) : Math.max(52, Math.round(w * 0.04))
    const colW = (w - gap * (visibleColumns.length - 1)) / visibleColumns.length
    const colors = ['blue', 'orange', 'green'] as const

    return visibleColumns.map((column, index) =>
      createGeoCard({
        x: x + index * (colW + gap),
        y,
        w: colW,
        h,
        text: column,
        parentId,
        color: colors[index],
        fill: 'semi',
        size: 'l',
        boldLineCount: 1,
        verticalAlign: 'start',
        meta,
      })
    )
  }

  return [createGeoCard({ x, y, w, h, text, parentId, color: 'orange', fill: 'semi', size: 'l', boldLineCount: 1, verticalAlign: 'start', meta })]
}

function buildComparisonCardText(block: TeachDrawBlock): string {
  if (block.text && /\n\s*(?:vs|versus)\s*\n/i.test(block.text)) {
    return block.text
  }

  const bodyParts = [block.text]
  if (block.bullets.length > 0) bodyParts.push(block.bullets.map((item) => `- ${item}`).join('\n'))
  if (block.numberedItems.length > 0) bodyParts.push(block.numberedItems.map((item, index) => `${index + 1}. ${item}`).join('\n'))
  return bodyParts.filter(Boolean).join('\n\n')
}

function parseComparisonColumns(text: string): string[] {
  return text
    .split(/\n\s*(?:vs|versus)\s*\n/i)
    .map((part) => part.trim())
    .filter(Boolean)
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

function blockPrimaryText(block: TeachDrawBlock): string {
  return [block.text, ...block.codeBlocks.map(formatCodeBlockForDisplay)].filter(Boolean).join('\n\n')
}

function buildCodeCardText(block: TeachDrawBlock): string {
  const text = block.text ? cleanVisibleText(block.text) : ''
  const codeParts = block.codeBlocks
    .map(formatCodeBlockForDisplay)
    .filter(Boolean)

  if (codeParts.length === 0) {
    const inlineCommands = cleanVisibleText(block.bullets.length > 0 ? block.bullets.join('\n') : block.text)
    return inlineCommands
  }

  const interleavedParts = interleaveCodeLabels(text, codeParts)
  if (interleavedParts) return interleavedParts.join('\n\n')

  return [text, ...codeParts].filter(Boolean).join('\n\n')
}

function formatCodeBlockForDisplay(code: { language?: string; label?: string; content: string }): string {
  const content = cleanCodeContent(code.language, code.content)
  return [code.label ? cleanVisibleText(code.label) : '', content].filter(Boolean).join('\n\n')
}

function interleaveCodeLabels(text: string, codeParts: string[]): string[] | null {
  if (!text || codeParts.length < 2) return null

  const labels = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  const labelOnly = labels.length === codeParts.length && labels.every((label) => label.length <= 80 && /:\s*$/.test(label))
  if (!labelOnly) return null

  return codeParts.flatMap((code, index) => [labels[index], code])
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

  const codeLines = block.codeBlocks.reduce((sum, code) => sum + formatCodeBlockForDisplay(code).split('\n').length + 1, 0)
  if (block.kind === 'code' || block.kind === 'command' || codeLines > 0) {
    const leadInLines = Math.ceil((block.text.length || 0) / 72)
    return estimateReadableCodeBoxHeight(Math.max(1, codeLines), 30, 28) + leadInLines * 28
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
  if (block.codeBlocks.length === 0) return block.kind === 'code' && looksLikeInlineCode(block.text)

  return block.codeBlocks.some((code) => {
    const language = normalizeLanguage(code.language)
    return Boolean(language && codeLanguages.has(language) && language !== 'text' && !commandLanguages.has(language))
  })
}

function looksLikeInlineCode(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return false
  return lines.some((line) =>
    /[{};]/.test(line) ||
    /^<\/?[a-z][^>]*>/i.test(line) ||
    /^(const|let|var|function|class|def|import|from|return|if|for|while)\b/.test(line) ||
    /^[.#]?[a-z0-9_-]+\s*\{/.test(line)
  )
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
  const codeText = block.codeBlocks.map(formatCodeBlockForDisplay).join('\n')
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

function cleanBlockHeading(heading: string): string {
  const cleaned = cleanVisibleText(heading).replace(/:$/, '').trim()
  const lowered = cleaned.toLowerCase()

  if (lowered === 'opening question' || lowered === 'question') return 'Question'
  if (lowered === 'answer' || lowered === 'expected answer') return 'Answer'
  if (lowered === 'meaning') return 'Meaning'
  if (lowered === 'memory line') return 'Memory line'

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

function getHeroFlowStepColor(index: number, total: number): 'blue' | 'green' | 'orange' {
  if (index === 0) return 'green'
  if (index === total - 1) return 'orange'
  return 'blue'
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

function pickSectionColor(index: number, frame?: TeachDrawFrame): 'blue' | 'green' | 'violet' | 'orange' | 'red' | 'black' {
  const layoutHint = frame ? inferFrameLayoutHint(frame) : undefined
  if (layoutHint === 'flow-focus') return 'blue'
  if (layoutHint === 'code-focus') return 'violet'
  if (layoutHint === 'mistake-fix') return 'red'
  if (layoutHint === 'practice-grid') return 'green'
  if (layoutHint === 'comparison') return 'orange'
  if (layoutHint === 'recap') return 'black'

  const colors = ['green', 'blue', 'orange', 'violet'] as const
  return colors[index % colors.length]
}

