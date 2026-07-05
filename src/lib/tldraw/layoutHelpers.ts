import type { TeachDrawBlock, TeachDrawFrame } from '@/types/teachdraw'

const baseFrameHeaderHeight = 118
const normalBlockBaseHeight = 150
const listItemHeight = 36
const codeLineHeight = 34
const flowStepHeight = 126
const blockGap = 42
const framePadding = 72

export function estimateBlockHeight(block: TeachDrawBlock, contentWidth = 760): number {
  if (block.kind === 'title') return 96

  if (block.kind === 'flow') {
    const steps = Math.max(block.flowSteps.length, 1)
    const horizontal = steps <= 5 && block.flowSteps.every((step) => step.length <= 24)
    return horizontal ? 180 : 72 + steps * flowStepHeight
  }

  const codeLines = block.codeBlocks.reduce((sum, code) => sum + code.content.split('\n').length + 1, 0)
  if (block.kind === 'code' || block.kind === 'command' || codeLines > 0) {
    return Math.max(240, 96 + codeLines * codeLineHeight)
  }

  const listCount = Math.max(block.bullets.length, block.numberedItems.length)
  if (listCount > 0) return normalBlockBaseHeight + listCount * listItemHeight

  const estimatedLines = Math.ceil((block.text.length || 80) / Math.max(contentWidth / 12, 40))
  return normalBlockBaseHeight + Math.max(0, estimatedLines - 2) * 32
}

export function estimateFrameHeight(frame: TeachDrawFrame): number {
  const blocksHeight = frame.blocks.reduce((sum, block) => sum + estimateBlockHeight(block) + blockGap, 0)
  return Math.max(650, baseFrameHeaderHeight + blocksHeight + framePadding)
}

export function chooseFlowOrientation(
  steps: string[],
  preference: 'auto' | 'vertical' | 'horizontal'
): 'vertical' | 'horizontal' {
  if (preference !== 'auto') return preference
  return steps.length <= 5 && steps.every((step) => step.length <= 24) ? 'horizontal' : 'vertical'
}
