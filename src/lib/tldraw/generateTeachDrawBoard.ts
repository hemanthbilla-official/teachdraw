import type { Editor, TLShape } from 'tldraw'
import type { TeachDrawDocument } from '@/types/teachdraw'
import { createGeoCard, createFrameShape, createTextShape, type AssetPartial, type ShapePartial } from './shapeHelpers'
import {
  BOARD_X,
  BOARD_Y,
  CHAPTER_GAP,
  CHAPTER_HEADER_GAP,
  CHAPTER_HEADER_H,
  FRAME_START_GAP,
  defaultOptions,
} from './generator/constants'
import { cleanBoardTitleText, stripMarkdownMarkers } from './generator/content'
import { renderFrameContent } from './generator/frameRenderers'
import { resolveDocumentImageInfo } from './generator/imageRenderer'
import { getBoardLayout, setFrameHeight } from './generator/layout'
import { estimateWrappedLines } from './generator/measurements'
import { buildLessonChapters, type LessonChapter } from './generator/storyboard'
import type { GenerateTeachDrawOptions } from './generator/types'
export type { FlowOrientation, GenerateTeachDrawOptions } from './generator/types'

export type TeachDrawRenderPlan = {
  assets: AssetPartial[]
  shapes: ShapePartial[]
  frameCount: number
  cameraZoom: number
}

export type TeachDrawGenerationSummary = {
  shapeCount: number
  assetCount: number
  frameCount: number
}

type CleanupSummary = {
  shapeCount: number
  assetCount: number
}

// Tldraw displays "Frame" when the name is empty. A zero-width space keeps
// the native label visually blank while the designed title remains inside.
const INVISIBLE_FRAME_NAME = '\u200B'

export async function generateTeachDrawBoard(
  editor: Editor,
  document: TeachDrawDocument,
  options?: Partial<GenerateTeachDrawOptions>
): Promise<TeachDrawGenerationSummary> {
  const plan = await buildTeachDrawRenderPlan(document, options)
  return commitTeachDrawBoard(editor, plan)
}

export async function buildTeachDrawRenderPlan(
  document: TeachDrawDocument,
  options?: Partial<GenerateTeachDrawOptions>
): Promise<TeachDrawRenderPlan> {
  const opts = { ...defaultOptions, ...options }
  const layout = getBoardLayout()
  const imageInfo = await resolveDocumentImageInfo(document)
  const assets: AssetPartial[] = []
  const shapes: ShapePartial[] = []
  const boardWidth = layout.frameWidth
  let cursorY = BOARD_Y

  const chapters = buildLessonChapters(document.frames)
  cursorY += createBoardTitle(shapes, document, boardWidth)
  cursorY += FRAME_START_GAP

  chapters.forEach((chapter, chapterIndex) => {
    createChapterHeader(shapes, chapter, chapterIndex, chapters.length, cursorY, boardWidth)
    cursorY += CHAPTER_HEADER_H + CHAPTER_HEADER_GAP

    chapter.frames.forEach(({ frame, index }) => {
      const rendered = renderFrame(frame, index)
      rendered.frameShape.y = cursorY
      shapes.push(rendered.frameShape, ...rendered.contentShapes)
      cursorY += rendered.height + layout.frameGapY
    })

    cursorY += CHAPTER_GAP - layout.frameGapY
  })

  return {
    assets,
    shapes,
    frameCount: document.frames.length,
    cameraZoom: layout.cameraZoom,
  }

  function renderFrame(frame: TeachDrawDocument['frames'][number], index: number) {
    const contentShapes: ShapePartial[] = []
    const frameMeta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
    const frameShape = createFrameShape({
      x: BOARD_X,
      y: 0,
      w: layout.frameWidth,
      h: layout.minFrameHeight,
      name: INVISIBLE_FRAME_NAME,
      color: 'grey',
      meta: frameMeta,
    })
    const parentId = frameShape.id as TLShape['id']
    const contentHeight = renderFrameContent(contentShapes, assets, frame, parentId, layout, opts, index, imageInfo)
    const height = Math.max(layout.minFrameHeight, Math.ceil(contentHeight + layout.paddingY))
    setFrameHeight(frameShape, height)
    return { frameShape, contentShapes, height }
  }
}

export function commitTeachDrawBoard(editor: Editor, plan: TeachDrawRenderPlan): TeachDrawGenerationSummary {
  const previousSnapshot = editor.getSnapshot()
  const beforeMark = editor.markHistoryStoppingPoint('teachdraw-before-generation')

  try {
    editor.run(
      () => {
        performGeneratedCleanup(editor)
        if (plan.assets.length > 0) editor.createAssets(plan.assets)
        if (plan.shapes.length > 0) editor.createShapes(plan.shapes)
      },
      { history: 'record' }
    )
    editor.markHistoryStoppingPoint('teachdraw-after-generation')

    if (plan.shapes.length > 0) {
      editor.setCamera({ x: -60, y: -40, z: plan.cameraZoom }, { animation: { duration: 260 } })
    }
  } catch (error) {
    editor.bailToMark(beforeMark)
    editor.loadSnapshot(previousSnapshot)
    throw error
  }

  return {
    shapeCount: plan.shapes.length,
    assetCount: plan.assets.length,
    frameCount: plan.frameCount,
  }
}

export function clearGeneratedShapes(editor: Editor): CleanupSummary {
  let summary: CleanupSummary = { shapeCount: 0, assetCount: 0 }
  editor.run(
    () => {
      summary = performGeneratedCleanup(editor)
    },
    { history: 'record' }
  )
  return summary
}

function performGeneratedCleanup(editor: Editor): CleanupSummary {
  const generatedShapeIds = editor
    .getCurrentPageShapes()
    .filter((shape) => shape.meta?.teachDrawGenerated === true)
    .map((shape) => shape.id)
  const deletingShapeIds = new Set<string>(generatedShapeIds)
  const referencedAssetIds = new Set<string>()

  editor.store.allRecords().forEach((record) => {
    const candidate = record as unknown as {
      id?: string
      typeName?: string
      props?: { assetId?: unknown }
    }
    if (candidate.typeName !== 'shape' || (candidate.id && deletingShapeIds.has(candidate.id))) return
    if (typeof candidate.props?.assetId === 'string') referencedAssetIds.add(candidate.props.assetId)
  })

  const generatedAssetIds = editor
    .getAssets()
    .filter((asset) => asset.meta?.teachDrawGenerated === true && !referencedAssetIds.has(asset.id))
    .map((asset) => asset.id)

  if (generatedShapeIds.length > 0) editor.deleteShapes(generatedShapeIds)
  if (generatedAssetIds.length > 0) editor.deleteAssets(generatedAssetIds)

  return { shapeCount: generatedShapeIds.length, assetCount: generatedAssetIds.length }
}

function createBoardTitle(
  shapes: ShapePartial[],
  document: TeachDrawDocument,
  boardWidth: number
): number {
  const title = cleanBoardTitleText(document.boardTitle || document.rawTitle || 'Untitled Lesson')
  const subtitle = document.boardSubtitle ? stripMarkdownMarkers(document.boardSubtitle) : ''
  const titleY = BOARD_Y
  const titleHeight = Math.max(58, estimateWrappedLines(title, boardWidth, 34) * 54)
  const subtitleY = titleY + titleHeight + 26
  const subtitleHeight = subtitle ? Math.max(46, estimateWrappedLines(subtitle, boardWidth, 52) * 40) : 0
  const ruleY = subtitleY + subtitleHeight + 36

  shapes.push(
    createTextShape({
      x: BOARD_X,
      y: titleY,
      w: boardWidth,
      text: title,
      color: 'black',
      size: 'xl',
      boldLineCount: 1,
      meta: { blockHeading: 'Board Title', blockKind: 'title' },
    }),
    ...(subtitle
      ? [
          createTextShape({
            x: BOARD_X,
            y: subtitleY,
            w: boardWidth,
            text: subtitle,
            color: 'blue',
            size: 'l',
            meta: { blockHeading: 'Board Subtitle', blockKind: 'subtitle' },
          }),
        ]
      : []),
    createGeoCard({
      x: BOARD_X,
      y: ruleY,
      w: boardWidth,
      h: 7,
      text: '',
      color: 'grey',
      fill: 'solid',
      meta: { blockKind: 'title-rule' },
    }),
    createGeoCard({
      x: BOARD_X,
      y: ruleY + 15,
      w: Math.round(boardWidth * 0.24),
      h: 4,
      text: '',
      color: 'blue',
      fill: 'solid',
      meta: { blockKind: 'title-rule' },
    })
  )

  return ruleY + 19 - BOARD_Y
}

function createChapterHeader(
  shapes: ShapePartial[],
  chapter: LessonChapter,
  index: number,
  total: number,
  y: number,
  boardWidth: number
) {
  const number = String(index + 1).padStart(2, '0')
  const frameRange = getFrameRange(chapter)
  shapes.push(
    createTextShape({
      x: BOARD_X,
      y: y + 18,
      w: 94,
      text: number,
      color: chapter.color,
      size: 'xl',
      boldLineCount: 1,
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    }),
    createGeoCard({
      x: BOARD_X + 96,
      y,
      w: 7,
      h: CHAPTER_HEADER_H - 18,
      text: '',
      color: chapter.color,
      fill: 'solid',
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    }),
    createTextShape({
      x: BOARD_X + 132,
      y: y + 4,
      w: boardWidth - 400,
      text: `CHAPTER ${index + 1} / ${total}  /  ${chapter.eyebrow}`,
      color: chapter.color,
      size: 's',
      boldLineCount: 1,
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    }),
    createTextShape({
      x: BOARD_X + 132,
      y: y + 46,
      w: boardWidth - 400,
      text: chapter.title,
      color: 'black',
      size: 'l',
      boldLineCount: 1,
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    }),
    createTextShape({
      x: BOARD_X + boardWidth - 250,
      y: y + 44,
      w: 250,
      text: frameRange,
      color: 'grey',
      size: 's',
      boldLineCount: 1,
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    }),
    createGeoCard({
      x: BOARD_X + 132,
      y: y + CHAPTER_HEADER_H - 7,
      w: boardWidth - 132,
      h: 4,
      text: '',
      color: chapter.color,
      fill: 'solid',
      meta: { blockHeading: chapter.title, blockKind: 'chapter' },
    })
  )
}

function getFrameRange(chapter: LessonChapter): string {
  const first = chapter.frames[0]?.frame.frameNumber ?? chapter.frames[0]?.index + 1
  const lastEntry = chapter.frames.at(-1)
  const last = lastEntry?.frame.frameNumber ?? (lastEntry ? lastEntry.index + 1 : first)
  return first === last ? `FRAME ${first}` : `FRAMES ${first}-${last}`
}
