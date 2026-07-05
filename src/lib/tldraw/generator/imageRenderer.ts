import type { TLShape } from 'tldraw'
import type { TeachDrawBlock, TeachDrawDocument, TeachDrawImageBlock } from '@/types/teachdraw'
import { isRemoteImageUrl } from '@/lib/imageUrlRules'
import { createGeoCard, createImageAsset, createImageShape, type AssetPartial, type ShapePartial } from '../shapeHelpers'
import { buildPlainBody, cleanBlockHeading } from './content'
import { renderCodeLabel } from './headingRenderers'
import { estimateTextCardHeight } from './measurements'
import type { GeneratedMeta } from './types'

export type ImageRenderInfo = {
  ok: boolean
  w: number
  h: number
  source: 'loaded' | 'fallback' | 'timeout' | 'error'
}

export type ImageInfoMap = Map<string, ImageRenderInfo>

const IMAGE_LOAD_TIMEOUT_MS = 6500
const FALLBACK_IMAGE_WIDTH = 720
const FALLBACK_IMAGE_HEIGHT = 405
const MAX_IMAGE_WIDTH = 980
const MAX_IMAGE_HEIGHT = 520
const IMAGE_FRAME_PADDING = 18
const IMAGE_GAP = 28

export async function resolveDocumentImageInfo(document: TeachDrawDocument): Promise<ImageInfoMap> {
  const urls = Array.from(
    new Set(
      document.frames
        .flatMap((frame) => frame.blocks)
        .flatMap((block) => block.imageBlocks)
        .map((image) => image.url)
        .filter(isRemoteImageUrl)
    )
  )

  const entries = await Promise.all(urls.map(async (url) => [url, await loadImageInfo(url)] as const))
  return new Map(entries)
}

export function renderImageBlock(
  shapes: ShapePartial[],
  assets: AssetPartial[],
  block: TeachDrawBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  frameMeta: GeneratedMeta,
  imageInfo: ImageInfoMap
): number {
  if (block.imageBlocks.length === 0) return 0

  const meta = { ...frameMeta, blockHeading: block.heading, blockKind: block.kind }
  let cursorY = y
  const body = buildPlainBody(block)

  if (body) {
    const heading = cleanBlockHeading(block.heading)
    const text = [heading, body].filter(Boolean).join('\n\n')
    const h = estimateTextCardHeight(text, w, {
      paddingX: 30,
      paddingY: 24,
      lineHeight: 30,
      minimum: 96,
    })
    shapes.push(
      createGeoCard({
        x,
        y: cursorY,
        w,
        h,
        text,
        parentId,
        color: 'blue',
        labelColor: 'black',
        fill: 'semi',
        size: 'm',
        boldLineCount: heading ? 1 : 0,
        verticalAlign: 'start',
        meta,
      })
    )
    cursorY += h + 22
  }

  block.imageBlocks.forEach((image, index) => {
    const urlIsValid = isRemoteImageUrl(image.url)
    const info = urlIsValid ? imageInfo.get(image.url) : undefined

    if (!urlIsValid || info?.ok === false) {
      const label = image.alt || cleanBlockHeading(block.heading) || 'Image'
      const labelHeight = label ? renderCodeLabel(shapes, label, parentId, x, cursorY, w, 'blue', meta) : 0
      cursorY += labelHeight
      const fallbackHeight = renderImageFallback(shapes, image, parentId, x, cursorY, w, meta, urlIsValid)
      cursorY += fallbackHeight + (index < block.imageBlocks.length - 1 ? IMAGE_GAP : 0)
      return
    }

    const size = getDisplayImageSize(w, info)
    const frameW = Math.min(w, size.w + IMAGE_FRAME_PADDING * 2)
    const frameH = size.h + IMAGE_FRAME_PADDING * 2
    const frameX = x + Math.round((w - frameW) / 2)
    const imageX = frameX + Math.round((frameW - size.w) / 2)
    const label = image.alt || cleanBlockHeading(block.heading) || 'Image'
    const labelHeight = label ? renderCodeLabel(shapes, label, parentId, frameX, cursorY, frameW, 'blue', meta) : 0
    cursorY += labelHeight

    const assetImageWidth = info?.w && info.w > 0 ? info.w : size.w
    const assetImageHeight = info?.h && info.h > 0 ? info.h : size.h
    const { asset, assetId } = createImageAsset({
      src: image.url,
      name: image.alt || image.url,
      w: assetImageWidth,
      h: assetImageHeight,
      meta,
    })

    assets.push(asset)
    shapes.push(
      createGeoCard({
        x: frameX,
        y: cursorY,
        w: frameW,
        h: frameH,
        text: '',
        parentId,
        color: 'grey',
        labelColor: 'black',
        fill: 'none',
        size: 'm',
        verticalAlign: 'start',
        meta,
      })
    )
    shapes.push(
      createImageShape({
        x: imageX,
        y: cursorY + IMAGE_FRAME_PADDING,
        w: size.w,
        h: size.h,
        assetId,
        altText: image.alt || '',
        parentId,
        meta,
      })
    )

    cursorY += frameH + (index < block.imageBlocks.length - 1 ? IMAGE_GAP : 0)
  })

  return Math.max(0, cursorY - y)
}

export function isImageBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'image' || block.imageBlocks.length > 0
}

function renderImageFallback(
  shapes: ShapePartial[],
  image: TeachDrawImageBlock,
  parentId: TLShape['id'],
  x: number,
  y: number,
  w: number,
  meta: GeneratedMeta,
  urlLooksValid: boolean
): number {
  const text = [
    image.alt || 'Image could not be loaded',
    urlLooksValid ? image.url : `Invalid image URL: ${image.url}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  const h = estimateTextCardHeight(text, w, {
    paddingX: 28,
    paddingY: 22,
    lineHeight: 28,
    minimum: 108,
  })

  shapes.push(
    createGeoCard({
      x,
      y,
      w,
      h,
      text,
      parentId,
      color: urlLooksValid ? 'orange' : 'red',
      labelColor: 'black',
      fill: 'semi',
      size: 'm',
      boldLineCount: 1,
      verticalAlign: 'start',
      meta,
    })
  )

  return h
}

function getDisplayImageSize(maxWidth: number, info?: ImageRenderInfo): { w: number; h: number } {
  if (!info?.ok || !info.w || !info.h) {
    const w = Math.min(maxWidth, MAX_IMAGE_WIDTH, FALLBACK_IMAGE_WIDTH)
    return { w, h: Math.round((w / FALLBACK_IMAGE_WIDTH) * FALLBACK_IMAGE_HEIGHT) }
  }

  const ratio = info.w / info.h
  let w = Math.min(maxWidth, MAX_IMAGE_WIDTH, info.w)
  let h = Math.round(w / ratio)

  if (h > MAX_IMAGE_HEIGHT) {
    h = MAX_IMAGE_HEIGHT
    w = Math.round(h * ratio)
  }

  return {
    w: Math.max(180, Math.round(w)),
    h: Math.max(120, Math.round(h)),
  }
}

function loadImageInfo(url: string): Promise<ImageRenderInfo> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve({ ok: true, w: FALLBACK_IMAGE_WIDTH, h: FALLBACK_IMAGE_HEIGHT, source: 'fallback' })
  }

  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      cleanup()
      resolve({ ok: false, w: FALLBACK_IMAGE_WIDTH, h: FALLBACK_IMAGE_HEIGHT, source: 'timeout' })
    }, IMAGE_LOAD_TIMEOUT_MS)

    function cleanup() {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const naturalWidth = image.naturalWidth || FALLBACK_IMAGE_WIDTH
      const naturalHeight = image.naturalHeight || FALLBACK_IMAGE_HEIGHT
      cleanup()
      resolve({ ok: true, w: naturalWidth, h: naturalHeight, source: 'loaded' })
    }

    image.onerror = () => {
      cleanup()
      resolve({ ok: false, w: FALLBACK_IMAGE_WIDTH, h: FALLBACK_IMAGE_HEIGHT, source: 'error' })
    }

    image.src = url
  })
}
