export type LayoutMode = 'horizontal-cards' | 'vertical-cards' | 'whiteboard-map'

export type SpacingPreset = 'comfortable' | 'compact' | 'extra-compact' | 'extreme-compact'

export type FlowOrientation = 'auto' | 'vertical' | 'horizontal'

export type GenerateTeachDrawOptions = {
  layoutMode: LayoutMode
  flowOrientation: FlowOrientation
  spacing: SpacingPreset
  clearBeforeGenerate: boolean
}

export type GeneratedMeta = {
  frameNumber?: number
  frameTitle?: string
  blockHeading?: string
  blockKind?: string
}

export type DrawColor = 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' | 'yellow' | 'grey'

export type BoardLayout = {
  mode: LayoutMode
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

export type HorizontalLanes = {
  supportX: number
  supportW: number
  visualX: number
  visualW: number
}

export type ComparisonColumn = {
  title: string
  body: string
}

export type RenderBlockOptions = {
  colorOverride?: DrawColor
  labelOverride?: string
  omitHeading?: boolean
}
