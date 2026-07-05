import type { GenerateTeachDrawOptions, SpacingPreset } from './types'

export const defaultOptions: GenerateTeachDrawOptions = {
  layoutMode: 'vertical-cards',
  flowOrientation: 'auto',
  spacing: 'comfortable',
  clearBeforeGenerate: true,
}

export const BOARD_X = 100
export const BOARD_Y = 80
export const FRAME_START_GAP = 120

export const CODE_TEXT_SIZE = 'l'
export const CODE_LINE_HEIGHT = 34
export const CODE_PADDING_Y = 34

export const spacingConfig: Record<
  SpacingPreset,
  {
    horizontalWidth: number
    verticalWidth: number
    whiteboardWidth: number
    frameGapY: number
    paddingX: number
    paddingY: number
    titleGap: number
    blockGap: number
    smallGap: number
    columnGap: number
    minFrameHeight: number
    cameraZoom: number
  }
> = {
  comfortable: {
    horizontalWidth: 1780,
    verticalWidth: 1120,
    whiteboardWidth: 1840,
    frameGapY: 140,
    paddingX: 58,
    paddingY: 52,
    titleGap: 112,
    blockGap: 42,
    smallGap: 28,
    columnGap: 58,
    minFrameHeight: 360,
    cameraZoom: 0.48,
  },
  compact: {
    horizontalWidth: 1600,
    verticalWidth: 1020,
    whiteboardWidth: 1660,
    frameGapY: 104,
    paddingX: 50,
    paddingY: 46,
    titleGap: 98,
    blockGap: 32,
    smallGap: 22,
    columnGap: 46,
    minFrameHeight: 330,
    cameraZoom: 0.54,
  },
  'extra-compact': {
    horizontalWidth: 1440,
    verticalWidth: 920,
    whiteboardWidth: 1500,
    frameGapY: 82,
    paddingX: 44,
    paddingY: 40,
    titleGap: 88,
    blockGap: 26,
    smallGap: 18,
    columnGap: 36,
    minFrameHeight: 310,
    cameraZoom: 0.58,
  },
  'extreme-compact': {
    horizontalWidth: 1280,
    verticalWidth: 820,
    whiteboardWidth: 1340,
    frameGapY: 64,
    paddingX: 38,
    paddingY: 36,
    titleGap: 78,
    blockGap: 22,
    smallGap: 14,
    columnGap: 30,
    minFrameHeight: 290,
    cameraZoom: 0.64,
  },
}

export const genericCodeHeadings = new Set(['code', 'command', 'terminal', 'bash', 'powershell', 'cmd', 'text'])

export const hiddenScreenNoteHeadings = new Set([
  'ask',
  'ask students',
  'opening question',
  'question',
  'questions',
  'answer',
  'expected answer',
  'student expected answer',
  'students expected answer',
  'student activity',
  'for students',
  'wait for answers',
  'wait for answer',
  'oral question',
  'trainer note',
  'trainer line',
  'trainer script',
])

export const commandLanguages = new Set(['bash', 'shell', 'sh', 'powershell', 'ps1', 'cmd'])
