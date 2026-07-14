import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { cleanCodeContent } from '@/lib/markdown/markdownUtils'
import { createGeoCard, type ShapePartial } from '../shapeHelpers'
import { CODE_TEXT_SIZE, genericCodeHeadings } from './constants'
import { cleanBlockHeading, getCodeUnits, stripMarkdownMarkers } from './content'
import { renderCodeLabel, renderSmallHeading } from './headingRenderers'
import { estimateCodeHeight } from './measurements'
import { getCodeColor } from './palette'
import type { DrawColor, GeneratedMeta } from './types'

export function renderCodeBlockStack(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: { showHeading?: boolean; colorOverride?: DrawColor } = {}
): number {
  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  const layoutColor = options.colorOverride ?? getCodeColor(block)
  const codeUnits = getCodeUnits(block)
  let cursorY = y

  if (options.showHeading) {
    const heading = cleanBlockHeading(block.heading)
    if (heading && !genericCodeHeadings.has(heading.toLowerCase())) {
      const headingHeight = renderSmallHeading(shapes, heading, parentId, x, cursorY, w, layoutColor, meta)
      cursorY += headingHeight
    }
  }

  codeUnits.forEach((code, index) => {
    const label = code.label ? stripMarkdownMarkers(code.label) : ''
    if (label) {
      const labelHeight = renderCodeLabel(shapes, label, parentId, x, cursorY, w, layoutColor, meta)
      cursorY += labelHeight
    }

    const codeText = cleanCodeContent(code.language, code.content)
    const h = estimateCodeHeight(codeText, w)
    shapes.push(
      createGeoCard({
        x,
        y: cursorY,
        w,
        h,
        text: codeText,
        parentId,
        color: layoutColor,
        labelColor: 'black',
        fill: 'semi',
        font: 'mono',
        size: CODE_TEXT_SIZE,
        verticalAlign: 'start',
        meta,
      })
    )
    cursorY += h + (index < codeUnits.length - 1 ? 28 : 0)
  })

  return Math.max(0, cursorY - y)
}
