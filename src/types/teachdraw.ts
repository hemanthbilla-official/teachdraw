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
    | 'decision'
    | 'code'
    | 'command'
    | 'request'
    | 'response'
    | 'definition'
    | 'meaning'
    | 'explanation'
    | 'example'
    | 'important'
    | 'keyPoint'
    | 'memory'
    | 'warning'
    | 'mistake'
    | 'correct'
    | 'list'
    | 'assignment'
    | 'task'
    | 'practice'
    | 'compare'
    | 'image'
    | 'recap'
    | 'normal'
  text: string
  bullets: string[]
  numberedItems: string[]
  codeBlocks: TeachDrawCodeBlock[]
  imageBlocks: TeachDrawImageBlock[]
  flowSteps: string[]
}

export type TeachDrawCodeBlock = {
  language?: string
  label?: string
  content: string
}

export type TeachDrawImageBlock = {
  alt: string
  url: string
}
