import type { BoardLayout, GenerateTeachDrawOptions } from './types'

export const defaultOptions: GenerateTeachDrawOptions = {
  flowOrientation: 'auto',
}

export const BOARD_X = 100
export const BOARD_Y = 80
export const FRAME_START_GAP = 120

export const CODE_TEXT_SIZE = 'l'
export const CODE_LINE_HEIGHT = 34
export const CODE_PADDING_Y = 34

export const verticalCardLayout: Omit<BoardLayout, 'contentWidth'> = {
  frameWidth: 1280,
  frameGapY: 124,
  paddingX: 58,
  paddingY: 52,
  titleGap: 112,
  blockGap: 38,
  smallGap: 24,
  columnGap: 56,
  minFrameHeight: 360,
  cameraZoom: 0.54,
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
