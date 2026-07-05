import type { TeachDrawBlock, TeachDrawFrame, TeachDrawLayoutHint } from '@/types/teachdraw'
import { commandLanguages, hiddenScreenNoteHeadings } from './constants'
import { buildPlainBody, isSimilarText, looksLikeCommandText, normalizeHeading } from './content'

export function pickContentLayout(blocks: TeachDrawBlock[], layoutHint?: TeachDrawLayoutHint): TeachDrawLayoutHint {
  if (layoutHint === 'mistake-fix' || hasMistakeCorrectPair(blocks)) return 'mistake-fix'
  if (layoutHint === 'comparison' || blocks.some(isComparisonBlock)) return 'comparison'
  if (layoutHint === 'flow-focus' || blocks.some((block) => block.kind === 'flow')) return 'flow-focus'
  if (layoutHint === 'code-focus' || blocks.some(isCodeVisualBlock)) return 'code-focus'
  if (layoutHint === 'practice-grid' || blocks.some((block) => block.kind === 'task' || block.kind === 'practice' || block.kind === 'assignment')) {
    return 'practice-grid'
  }
  if (layoutHint === 'recap' || blocks.every((block) => block.kind === 'recap' || isCalloutBlock(block) || block.kind === 'normal')) return 'recap'
  return 'concept-focus'
}

export function getRenderableBlocks(frame: TeachDrawFrame, visibleTitle: string): TeachDrawBlock[] {
  return frame.blocks.filter((block) => {
    if (isTrainerScriptBlock(block)) return false
    if (block.kind !== 'title') return true

    const body = buildPlainBody(block)
    if (!body) return false
    return !isSimilarText(body, visibleTitle)
  })
}

export function isTrainerScriptBlock(block: TeachDrawBlock): boolean {
  const heading = normalizeHeading(block.heading)
  if (hiddenScreenNoteHeadings.has(heading)) return true
  if (/^(ask|question|answer|expected answer|student expected answer)\b/.test(heading)) return true
  return false
}

export function isCodeVisualBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'code' || block.kind === 'command' || block.codeBlocks.length > 0 || isCommandBlock(block)
}

export function isCommandBlock(block: TeachDrawBlock): boolean {
  if (block.kind === 'command') return true
  if (block.codeBlocks.some((code) => commandLanguages.has((code.language ?? '').toLowerCase()))) return true

  return looksLikeCommandText(buildPlainBody(block))
}

export function isCalloutBlock(block: TeachDrawBlock): boolean {
  return ['keyPoint', 'memory', 'warning', 'task', 'practice', 'assignment', 'recap'].includes(block.kind)
}

export function isMistakeBlock(block: TeachDrawBlock): boolean {
  const heading = normalizeHeading(block.heading)
  return block.kind === 'mistake' || heading.includes('mistake') || heading.includes('wrong') || heading.includes('bad approach')
}

export function isCorrectBlock(block: TeachDrawBlock): boolean {
  const heading = normalizeHeading(block.heading)
  return block.kind === 'correct' || heading.includes('correct') || heading.includes('fix') || heading.includes('solution') || heading.includes('better')
}

export function hasMistakeCorrectPair(blocks: TeachDrawBlock[]): boolean {
  return blocks.some(isMistakeBlock) && blocks.some(isCorrectBlock)
}

export function isComparisonBlock(block: TeachDrawBlock): boolean {
  return block.kind === 'compare' || /\bvs\b|\bversus\b|\bdifference\b/i.test(block.heading)
}

export function isCodeSupportAfterBlock(block: TeachDrawBlock): boolean {
  if (isCalloutBlock(block)) return true
  const heading = normalizeHeading(block.heading)
  return (
    block.kind === 'meaning' ||
    block.kind === 'explanation' ||
    heading.includes('meaning') ||
    heading.includes('explanation') ||
    heading.includes('walkthrough') ||
    heading.includes('notice') ||
    heading.includes('output') ||
    heading.includes('response')
  )
}
