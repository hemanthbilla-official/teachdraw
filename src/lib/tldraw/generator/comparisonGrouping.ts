import type { TeachDrawBlock } from '@/types/teachdraw'
import { isComparisonBlock } from './classification'
import { getComparisonTitleCandidates } from './comparison'
import { buildPlainBody, normalizeHeading } from './content'

export type GroupedComparisonBlock = {
  block: TeachDrawBlock
  usedBlocks: TeachDrawBlock[]
}

export function mergeGroupedComparisonBlocks(blocks: TeachDrawBlock[]): TeachDrawBlock[] {
  const used = new Set<TeachDrawBlock>()
  const mergedBlocks: TeachDrawBlock[] = []

  blocks.forEach((block) => {
    if (used.has(block)) return

    if (!isComparisonBlock(block)) {
      mergedBlocks.push(block)
      return
    }

    const candidates = blocks.filter((candidate) => candidate !== block && !used.has(candidate))
    const groupedComparison = buildGroupedComparisonBlock(block, candidates)
    if (!groupedComparison) {
      mergedBlocks.push(block)
      return
    }

    groupedComparison.usedBlocks.forEach((usedBlock) => used.add(usedBlock))
    mergedBlocks.push(groupedComparison.block)
  })

  return mergedBlocks
}

export function buildGroupedComparisonBlock(compareBlock: TeachDrawBlock, candidateBlocks: TeachDrawBlock[]): GroupedComparisonBlock | null {
  const titles = getComparisonTitleCandidates(compareBlock)
  if (titles.length < 2) return null

  const usedBlocks: TeachDrawBlock[] = []
  const segments = titles.map((title) => {
    const matchedBlock = candidateBlocks.find(
      (block) => !usedBlocks.includes(block) && normalizeHeading(block.heading) === normalizeHeading(title)
    )
    if (!matchedBlock) return title

    usedBlocks.push(matchedBlock)
    return [title, buildPlainBody(matchedBlock)].filter(Boolean).join('\n\n')
  })

  if (usedBlocks.length < 2) return null

  return {
    block: {
      ...compareBlock,
      text: segments.join('\n\nvs\n\n'),
      bullets: [],
      numberedItems: [],
      codeBlocks: [],
      imageBlocks: [],
      flowSteps: [],
    },
    usedBlocks,
  }
}
