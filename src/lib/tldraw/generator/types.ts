import type { TeachDrawBlock, TeachDrawCodeBlock } from '@/types/teachdraw'

export type FlowOrientation = 'auto' | 'vertical' | 'horizontal'

export type GenerateTeachDrawOptions = {
  flowOrientation: FlowOrientation
}

export type GeneratedMeta = {
  frameNumber?: number
  frameTitle?: string
  blockHeading?: string
  blockKind?: string
}

export type DrawColor = 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' | 'yellow' | 'grey'

export type BoardLayout = {
  frameWidth: number
  frameGapY: number
  paddingX: number
  paddingY: number
  contentWidth: number
  titleGap: number
  blockGap: number
  smallGap: number
  columnGap: number
  minFrameHeight: number
  cameraZoom: number
}

export type ComparisonColumn = {
  title: string
  sourceLabel?: string
  body: string
  codeBlocks: TeachDrawCodeBlock[]
}

export type ComparisonRenderBlock = TeachDrawBlock & {
  renderKind: 'comparison'
  columns: ComparisonColumn[]
}

export type RenderBlockOptions = {
  colorOverride?: DrawColor
  labelOverride?: string
  omitHeading?: boolean
}
