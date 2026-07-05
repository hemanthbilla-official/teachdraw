import type { Editor, TLShape } from 'tldraw'
import type { TeachDrawDocument } from '@/types/teachdraw'
import { createGeoCard, createFrameShape, type ShapePartial } from './shapeHelpers'
import { BOARD_X, BOARD_Y, FRAME_START_GAP, defaultOptions } from './generator/constants'
import { cleanBoardTitleText, cleanFrameTitle, stripMarkdownMarkers } from './generator/content'
import { renderFrameContent } from './generator/frameRenderers'
import { getBoardLayout, setFrameHeight } from './generator/layout'
import { estimateTextCardHeight } from './generator/measurements'
import { pickFrameColor } from './generator/palette'
import { renderWhiteboardFrameContent } from './generator/whiteboardRenderer'
import type { GenerateTeachDrawOptions } from './generator/types'
export type { GenerateTeachDrawOptions, LayoutMode, SpacingPreset } from './generator/types'

export function generateTeachDrawBoard(
  editor: Editor,
  document: TeachDrawDocument,
  options?: Partial<GenerateTeachDrawOptions>
): void {
  const opts = { ...defaultOptions, ...options }
  if (opts.clearBeforeGenerate) clearGeneratedShapes(editor)

  const layout = getBoardLayout(opts.layoutMode, opts.spacing)
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
    const contentHeight =
      opts.layoutMode === 'whiteboard-map'
        ? renderWhiteboardFrameContent(frameShapes, frame, parentId, layout, opts, index)
        : renderFrameContent(frameShapes, frame, parentId, layout, opts, index)
    const frameHeight = Math.max(layout.minFrameHeight, Math.ceil(contentHeight + layout.paddingY))

    setFrameHeight(frameShape, frameHeight)
    shapes.push(frameShape, ...frameShapes)
    cursorY += frameHeight + layout.frameGapY
  })

  editor.createShapes(shapes)
  if (shapes.length > 0) {
    editor.setCamera({ x: -60, y: -40, z: layout.cameraZoom }, { animation: { duration: 260 } })
  }
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
