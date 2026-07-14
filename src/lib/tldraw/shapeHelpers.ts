import {
  AssetRecordType,
  type Editor,
  type TLAssetId,
  type TLDefaultColorStyle,
  type TLDefaultDashStyle,
  type TLDefaultFillStyle,
  type TLRichText,
  type TLGeoShapeGeoStyle,
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
export type AssetPartial = Parameters<Editor['createAssets']>[0][number]

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
  geo?: TLGeoShapeGeoStyle
  parentId?: TLShape['id']
  color?: TLDefaultColorStyle
  labelColor?: TLDefaultColorStyle
  fill?: TLDefaultFillStyle
  dash?: TLDefaultDashStyle
  font?: 'draw' | 'sans' | 'serif' | 'mono'
  size?: 's' | 'm' | 'l' | 'xl'
  align?: 'start' | 'middle' | 'end' | 'start-legacy' | 'middle-legacy' | 'end-legacy'
  verticalAlign?: 'start' | 'middle' | 'end'
  boldLineCount?: number
  richText?: TLRichText
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
      dash: args.dash ?? 'solid',
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
      ...(args.richText ? { richText: args.richText } : createTextProps(args.text, { boldLineCount: args.boldLineCount })),
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
  dash?: TLDefaultDashStyle
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
      dash: args.dash ?? 'solid',
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

export function createImageAsset(args: {
  src: string
  name: string
  w: number
  h: number
  mimeType?: string | null
  meta?: ShapeMetaInput
}): { asset: AssetPartial; assetId: TLAssetId } {
  const assetId = AssetRecordType.createId()
  return {
    assetId,
    asset: {
      id: assetId,
      typeName: 'asset',
      type: 'image',
      props: {
        w: args.w,
        h: args.h,
        name: args.name,
        isAnimated: isAnimatedImageUrl(args.src),
        mimeType: args.mimeType ?? inferImageMimeType(args.src),
        src: args.src,
      },
      meta: createGeneratedMeta(args.meta),
    },
  }
}

export function createImageShape(args: {
  x: number
  y: number
  w: number
  h: number
  assetId: TLAssetId
  altText: string
  parentId?: TLShape['id']
  meta?: ShapeMetaInput
}): ShapePartial {
  return {
    id: createShapeId(),
    type: 'image',
    parentId: args.parentId,
    x: args.x,
    y: args.y,
    props: {
      w: args.w,
      h: args.h,
      playing: true,
      url: '',
      assetId: args.assetId,
      crop: null,
      flipX: false,
      flipY: false,
      altText: args.altText,
    },
    meta: createGeneratedMeta(args.meta),
  }
}

function inferImageMimeType(url: string): string | null {
  const clean = url.split(/[?#]/)[0]?.toLowerCase() ?? ''
  if (clean.endsWith('.png')) return 'image/png'
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg'
  if (clean.endsWith('.gif')) return 'image/gif'
  if (clean.endsWith('.webp')) return 'image/webp'
  if (clean.endsWith('.svg')) return 'image/svg+xml'
  if (clean.endsWith('.avif')) return 'image/avif'
  return null
}

function isAnimatedImageUrl(url: string): boolean {
  return url.split(/[?#]/)[0]?.toLowerCase().endsWith('.gif') ?? false
}
