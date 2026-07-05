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
      return 'blue'
    case 'mistake':
    case 'warning':
      return 'red'
    case 'correct':
      return 'green'
    case 'task':
    case 'practice':
    case 'assignment':
      return 'green'
    case 'recap':
      return 'grey'
    default:
      return 'blue'
  }
}

export function getCodeColor(block: TeachDrawBlock): DrawColor {
  if (block.kind === 'command' || isCommandBlock(block)) return 'green'
  if (isMistakeBlock(block)) return 'red'
  if (isCorrectBlock(block)) return 'green'
  return 'violet'
}

export function getCalloutColor(block: TeachDrawBlock): DrawColor {
  switch (block.kind) {
    case 'warning':
      return 'red'
    case 'task':
    case 'practice':
    case 'assignment':
      return 'green'
    case 'recap':
      return 'grey'
    case 'memory':
    case 'keyPoint':
      return 'orange'
    default:
      return 'orange'
  }
}

export function getCalloutLabel(block: TeachDrawBlock): string {
  const heading = normalizeHeading(block.heading)
  if (block.kind === 'memory' || heading.includes('memory') || heading.includes('remember')) return 'Memory line'
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
  if (index === 0) return 'green'
  if (index === total - 1) return 'orange'
  return 'blue'
}

export function pickFrameColor(index: number, frame?: TeachDrawFrame): DrawColor {
  const layout = frame ? pickContentLayout(frame.blocks, frame.layoutHint) : undefined
  if (layout === 'code-focus') return 'violet'
  if (layout === 'flow-focus') return 'blue'
  if (layout === 'mistake-fix') return 'red'
  if (layout === 'comparison') return 'orange'
  if (layout === 'practice-grid') return 'green'
  if (layout === 'recap') return 'grey'

  const colors: DrawColor[] = ['blue', 'green', 'orange', 'violet']
  return colors[index % colors.length]
}
