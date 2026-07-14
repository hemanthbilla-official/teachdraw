import type { TeachDrawBlock, TeachDrawFrame } from '@/types/teachdraw'
import { isCommandBlock, isCorrectBlock, isMistakeBlock, pickContentLayout } from './classification'
import { cleanBlockHeading, normalizeHeading } from './content'
import type { DrawColor } from './types'

export function getTextColor(block: TeachDrawBlock): DrawColor {
  switch (block.kind) {
    case 'definition':
    case 'meaning':
      return 'green'
    case 'example':
    case 'explanation':
    case 'response':
      return 'blue'
    case 'request':
      return 'orange'
    case 'mistake':
    case 'warning':
      return 'red'
    case 'correct':
      return 'green'
    case 'task':
    case 'practice':
    case 'assignment':
      return 'violet'
    case 'recap':
      return 'orange'
    case 'important':
    case 'keyPoint':
    case 'memory':
      return 'orange'
    default:
      return 'grey'
  }
}

export function getCodeColor(block: TeachDrawBlock): DrawColor {
  if (block.kind === 'command' || isCommandBlock(block)) return 'green'
  if (block.kind === 'request') return 'orange'
  if (block.kind === 'response') return 'blue'
  if (isMistakeBlock(block)) return 'red'
  if (isCorrectBlock(block)) return 'green'
  return 'blue'
}

export function getCalloutColor(block: TeachDrawBlock): DrawColor {
  switch (block.kind) {
    case 'warning':
      return 'red'
    case 'task':
    case 'practice':
    case 'assignment':
      return 'violet'
    case 'recap':
      return 'orange'
    case 'memory':
    case 'important':
    case 'keyPoint':
      return 'orange'
    default:
      return 'orange'
  }
}

export function getCalloutLabel(block: TeachDrawBlock): string {
  const heading = normalizeHeading(block.heading)
  if (block.kind === 'memory' || heading.includes('memory') || heading.includes('remember')) return 'Memory line'
  if (block.kind === 'important') return 'Important'
  if (block.kind === 'warning') return heading.includes('mistake') ? 'Mistake' : 'Warning'
  if (block.kind === 'task' || block.kind === 'practice' || block.kind === 'assignment') return 'Practice'
  if (block.kind === 'recap') return 'Recap'
  return 'Important'
}

export function getMistakeFixBodyHeading(block: TeachDrawBlock, panelLabel: 'Mistake' | 'Correct'): string {
  const heading = cleanBlockHeading(block.heading)
  if (!heading || normalizeHeading(heading) === normalizeHeading(panelLabel)) return ''
  return heading
}

export function getFlowStepColor(index: number, total: number): DrawColor {
  if (index === 0) return 'grey'
  if (index === total - 1) return 'green'
  return 'blue'
}

export function pickFrameColor(_index: number, frame?: TeachDrawFrame): DrawColor {
  const layout = frame ? pickContentLayout(frame.blocks, frame.layoutHint) : undefined
  if (frame?.blocks.some((block) => block.kind === 'mistake' || block.kind === 'warning')) return 'red'
  if (frame?.blocks.some((block) => block.kind === 'request')) return 'orange'
  if (frame?.blocks.some((block) => block.kind === 'command')) return 'green'
  if (layout === 'code-focus') return 'blue'
  if (layout === 'flow-focus') return 'blue'
  if (layout === 'mistake-fix') return 'red'
  if (layout === 'comparison') return 'orange'
  if (layout === 'practice-grid') return 'violet'
  if (layout === 'recap') return 'orange'

  if (frame?.blocks.some((block) => block.kind === 'definition' || block.kind === 'meaning')) return 'green'
  if (frame?.blocks.some((block) => block.kind === 'important' || block.kind === 'keyPoint' || block.kind === 'memory')) return 'orange'
  return 'blue'
}
