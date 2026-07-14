import type { Editor, TLShape } from 'tldraw'
import type { TeachDrawDocument } from '@/types/teachdraw'
import { createGeoCard, createFrameShape, type AssetPartial, type ShapePartial } from './shapeHelpers'
import { BOARD_X, BOARD_Y, FRAME_START_GAP, defaultOptions } from './generator/constants'
import { cleanBoardTitleText, cleanFrameTitle, stripMarkdownMarkers } from './generator/content'
import { renderFrameContent } from './generator/frameRenderers'
import { resolveDocumentImageInfo } from './generator/imageRenderer'
import { getBoardLayout, setFrameHeight } from './generator/layout'
import { estimateTextCardHeight } from './generator/measurements'
import { pickFrameColor } from './generator/palette'
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
  let cursorY = BOARD_Y

  cursorY += createBoardTitle(shapes, document, layout.frameWidth)
  cursorY += FRAME_START_GAP

  document.frames.forEach((frame, index) => {
    const frameShapes: ShapePartial[] = []
    const frameMeta = { frameNumber: frame.frameNumber, frameTitle: frame.frameTitle }
    const frameShape = createFrameShape({
      x: BOARD_X,
      y: cursorY,
      w: layout.frameWidth,
      h: layout.minFrameHeight,
      name: cleanFrameTitle(frame.frameTitle) || 'Untitled Section',
      color: pickFrameColor(index, frame),
      meta: frameMeta,
    })
    const parentId = frameShape.id as TLShape['id']
    const contentHeight = renderFrameContent(frameShapes, assets, frame, parentId, layout, opts, index, imageInfo)
    const frameHeight = Math.max(layout.minFrameHeight, Math.ceil(contentHeight + layout.paddingY))

    setFrameHeight(frameShape, frameHeight)
    shapes.push(frameShape, ...frameShapes)
    cursorY += frameHeight + layout.frameGapY
  })

  return {
    assets,
    shapes,
    frameCount: document.frames.length,
    cameraZoom: layout.cameraZoom,
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

function createBoardTitle(shapes: ShapePartial[], document: TeachDrawDocument, frameWidth: number): number {
  const title = cleanBoardTitleText(document.boardTitle || document.rawTitle || 'Untitled Lesson')
  const subtitle = document.boardSubtitle ? stripMarkdownMarkers(document.boardSubtitle) : ''
  const titleText = [title, subtitle].filter(Boolean).join('\n\n')
  const titleWidth = Math.min(frameWidth, 1180)
  const height = estimateTextCardHeight(titleText, titleWidth, {
    paddingX: 42,
    paddingY: 34,
    lineHeight: 36,
    minimum: subtitle ? 146 : 112,
  })

  shapes.push(
    createGeoCard({
      x: BOARD_X,
      y: BOARD_Y,
      w: titleWidth,
      h: height,
      text: titleText,
      color: 'blue',
      labelColor: 'black',
      fill: 'semi',
      size: 'xl',
      align: 'middle',
      boldLineCount: 1,
      meta: { blockHeading: 'Board Title', blockKind: 'title' },
    })
  )

  return height
}
