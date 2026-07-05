export type TeachDrawDocument = {
  mode: 'frame-based' | 'section-based'
  rawTitle: string
  boardTitle?: string
  boardSubtitle?: string
  frames: TeachDrawFrame[]
}

export type TeachDrawLayoutHint =
  | 'concept-focus'
  | 'code-focus'
  | 'flow-focus'
  | 'mistake-fix'
  | 'practice-grid'
  | 'comparison'
  | 'recap'

export type TeachDrawFrame = {
  id: string
  frameNumber?: number
  frameTitle: string
  layoutHint?: TeachDrawLayoutHint
  blocks: TeachDrawBlock[]
}

export type TeachDrawBlock = {
  id: string
  heading: string
  kind:
    | 'title'
    | 'flow'
    | 'code'
    | 'command'
    | 'definition'
    | 'example'
    | 'keyPoint'
    | 'warning'
    | 'list'
    | 'assignment'
    | 'task'
    | 'compare'
    | 'recap'
    | 'normal'
  text: string
  bullets: string[]
  numberedItems: string[]
  codeBlocks: TeachDrawCodeBlock[]
  flowSteps: string[]
}

export type TeachDrawCodeBlock = {
  language?: string
  label?: string
  content: string
}
