import {
  type Editor,
  type TLDefaultColorStyle,
  type TLDefaultFillStyle,
  type TLRichText,
  type TLShape,
  createShapeId,
  toRichText,
} from 'tldraw'

export type TeachDrawShapeMeta = {
  teachDrawGenerated: true
  frameNumber?: number
  frameTitle?: string
  blockHeading?: string
  blockKind?: string
}

export type ShapePartial = Parameters<Editor['createShapes']>[0][number]

type ShapeMetaInput = Partial<Omit<TeachDrawShapeMeta, 'teachDrawGenerated'>>

export function createGeneratedMeta(meta: ShapeMetaInput = {}): TeachDrawShapeMeta {
  return {
    teachDrawGenerated: true,
    ...meta,
  }
}

export function createTextProps(text: string, options: { boldLineCount?: number } = {}) {
  if (options.boldLineCount && options.boldLineCount > 0) {
    return {
      richText: toRichTextWithBoldLines(text, options.boldLineCount),
    }
  }

  return {
    richText: toRichText(text),
  }
}

function toRichTextWithBoldLines(text: string, boldLineCount: number): TLRichText {
  const content = text.split('\n').map((line, index) => {
    if (!line) return { type: 'paragraph' }

    const textNode: { type: 'text'; text: string; marks?: Array<{ type: string }> } = {
      type: 'text',
      text: line,
    }

    if (index < boldLineCount) {
      textNode.marks = [{ type: 'bold' }]
    }

    return {
      type: 'paragraph',
      content: [textNode],
    }
  })

  return {
    type: 'doc',
    content,
  }
}

export function createFrameShape(args: {
  x: number
  y: number
  w: number
  h: number
  name: string
  color?: TLDefaultColorStyle
  meta?: ShapeMetaInput
}): ShapePartial {
  return {
    id: createShapeId(),
    type: 'frame',
    x: args.x,
    y: args.y,
    props: {
      w: args.w,
      h: args.h,
      name: args.name,
      color: args.color ?? 'blue',
    },
    meta: createGeneratedMeta(args.meta),
  }
}

export function createGeoCard(args: {
  x: number
  y: number
  w: number
  h: number
  text: string
  geo?: 'rectangle' | 'diamond'
  parentId?: TLShape['id']
  color?: TLDefaultColorStyle
  labelColor?: TLDefaultColorStyle
  fill?: TLDefaultFillStyle
  font?: 'draw' | 'sans' | 'serif' | 'mono'
  size?: 's' | 'm' | 'l' | 'xl'
  align?: 'start' | 'middle' | 'end' | 'start-legacy' | 'middle-legacy' | 'end-legacy'
  verticalAlign?: 'start' | 'middle' | 'end'
  boldLineCount?: number
  meta?: ShapeMetaInput
}): ShapePartial {
  return {
    id: createShapeId(),
    type: 'geo',
    parentId: args.parentId,
    x: args.x,
    y: args.y,
    props: {
      geo: args.geo ?? 'rectangle',
      w: args.w,
      h: args.h,
      dash: 'solid',
      url: '',
      growY: 0,
      scale: 1,
      color: args.color ?? 'black',
      labelColor: args.labelColor ?? 'black',
      fill: args.fill ?? 'semi',
      size: args.size ?? 'm',
      font: args.font ?? 'sans',
      align: args.align ?? 'start',
      verticalAlign: args.verticalAlign ?? 'middle',
      ...createTextProps(args.text, { boldLineCount: args.boldLineCount }),
    },
    meta: createGeneratedMeta(args.meta),
  }
}

export function createTextShape(args: {
  x: number
  y: number
  w: number
  text: string
  parentId?: TLShape['id']
  color?: TLDefaultColorStyle
  font?: 'draw' | 'sans' | 'serif' | 'mono'
  size?: 's' | 'm' | 'l' | 'xl'
  boldLineCount?: number
  meta?: ShapeMetaInput
}): ShapePartial {
  return {
    id: createShapeId(),
    type: 'text',
    parentId: args.parentId,
    x: args.x,
    y: args.y,
    props: {
      w: args.w,
      autoSize: false,
      scale: 1,
      color: args.color ?? 'black',
      font: args.font ?? 'sans',
      size: args.size ?? 'm',
      textAlign: 'start',
      ...createTextProps(args.text, { boldLineCount: args.boldLineCount }),
    },
    meta: createGeneratedMeta(args.meta),
  }
}

export function createArrow(args: {
  x: number
  y: number
  endX: number
  endY: number
  parentId?: TLShape['id']
  color?: TLDefaultColorStyle
  meta?: ShapeMetaInput
}): ShapePartial {
  return {
    id: createShapeId(),
    type: 'arrow',
    parentId: args.parentId,
    x: args.x,
    y: args.y,
    props: {
      kind: 'arc',
      labelColor: 'black',
      color: args.color ?? 'black',
      fill: 'none',
      dash: 'solid',
      size: 'm',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
      font: 'sans',
      start: { x: 0, y: 0 },
      end: { x: args.endX - args.x, y: args.endY - args.y },
      bend: 0,
      ...createTextProps(''),
      labelPosition: 0.5,
      scale: 1,
      elbowMidPoint: 0.5,
    },
    meta: createGeneratedMeta(args.meta),
  }
}
