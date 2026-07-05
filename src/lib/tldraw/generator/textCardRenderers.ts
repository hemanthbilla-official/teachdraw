import type { TLShape } from 'tldraw'
import type { TeachDrawBlock } from '@/types/teachdraw'
import { createGeoCard, type ShapePartial } from '../shapeHelpers'
import { buildPlainBody, buildTextCardText, cleanBlockHeading } from './content'
import { estimateTextCardHeight } from './measurements'
import { getCalloutColor, getCalloutLabel, getTextColor } from './palette'
import type { GeneratedMeta, RenderBlockOptions } from './types'

export function renderTextCard(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  options: RenderBlockOptions = {}
): number {
  const headingForBold = options.omitHeading ? '' : options.labelOverride ?? cleanBlockHeading(block.heading)
  const text = buildTextCardText(block, options)
  if (!text) return 0

  const color = options.colorOverride ?? getTextColor(block)
  const h = estimateTextCardHeight(text, w, {
    paddingX: 30,
    paddingY: 26,
    lineHeight: 30,
    minimum: 104,
  })

  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text,
      parentId,
      color,
      labelColor: 'black',
      fill: 'semi',
      size: 'm',
      boldLineCount: headingForBold ? 1 : 0,
      verticalAlign: 'start',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )

  return h
}

export function renderCalloutCard(
  shapes: ShapePartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta
): number {
  const label = getCalloutLabel(block)
  const body = buildPlainBody(block)
  const text = [label, body].filter(Boolean).join('\n\n')
  if (!text) return 0

  const stripeW = 14
  const color = getCalloutColor(block)
  const fillColor = block.kind === 'keyPoint' || block.kind === 'memory' ? 'yellow' : color
  const h = estimateTextCardHeight(text, w - stripeW, {
    paddingX: 30,
    paddingY: 26,
    lineHeight: 31,
    minimum: 110,
  })

  shapes.push(
    createGeoCard({
      x,
      y,
      w: stripeW,
      h,
      text: '',
      parentId,
      color,
      fill: 'solid',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    }),
    createGeoCard({
      x: x + stripeW,
      y,
      w: w - stripeW,
      h,
      text,
      parentId,
      color: fillColor,
      labelColor: 'black',
      fill: 'semi',
      size: 'm',
      boldLineCount: 1,
      verticalAlign: 'start',
      meta: { ...frameMeta, blockHeading: block.heading, blockKind: block.kind },
    })
  )

  return h
}
