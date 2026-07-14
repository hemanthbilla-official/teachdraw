import type { TeachDrawBlock } from '@/types/teachdraw'
import { isComparisonBlock, isFlowLikeBlock, isTrainerScriptBlock } from './classification'
import { getComparisonTitleCandidates } from './comparison'
import { buildPlainBody, normalizeHeading } from './content'
import type { ComparisonColumn, ComparisonRenderBlock } from './types'

export type GroupedComparisonBlock = {
  block: TeachDrawBlock
  usedBlocks: TeachDrawBlock[]
}

type ComparisonGroupingOptions = {
  allowImplicitColumns?: boolean
}

export function mergeGroupedComparisonBlocks(
  blocks: TeachDrawBlock[],
  options: ComparisonGroupingOptions = {}
): TeachDrawBlock[] {
  const used = new Set<TeachDrawBlock>()
  const mergedBlocks: TeachDrawBlock[] = []

  blocks.forEach((block, blockIndex) => {
    if (used.has(block)) return

    if (!isComparisonBlock(block)) {
      mergedBlocks.push(block)
      return
    }

    // Only forward siblings are eligible. A comparison must never steal content
    // that has already appeared earlier in the frame.
    const candidates = blocks.slice(blockIndex + 1).filter((candidate) => !used.has(candidate))
    const groupedComparison = buildGroupedComparisonBlock(block, candidates, options)
    if (!groupedComparison) {
      mergedBlocks.push(block)
      return
    }

    groupedComparison.usedBlocks.forEach((usedBlock) => used.add(usedBlock))
    mergedBlocks.push(groupedComparison.block)
  })

  return mergedBlocks
}

export function buildGroupedComparisonBlock(
  compareBlock: TeachDrawBlock,
  candidateBlocks: TeachDrawBlock[],
  options: ComparisonGroupingOptions = {}
): GroupedComparisonBlock | null {
  const titles = getComparisonTitleCandidates(compareBlock)
  const eligibleCandidates = candidateBlocks.filter(isEligibleComparisonColumn)

  if (titles.length < 2) {
    if (!options.allowImplicitColumns || eligibleCandidates.length < 2) return null

    const implicitBlocks = eligibleCandidates.slice(0, 3)
    return makeGroupedComparison(
      compareBlock,
      implicitBlocks.map((block) => comparisonColumn(block.heading, block)),
      implicitBlocks
    )
  }

  const usedBlocks: TeachDrawBlock[] = []
  const columns = titles.map((title) => {
    const matchedBlock = eligibleCandidates.find(
      (block) => !usedBlocks.includes(block) && normalizeHeading(block.heading) === normalizeHeading(title)
    )
    if (!matchedBlock) return comparisonColumn(title)

    usedBlocks.push(matchedBlock)
    return comparisonColumn(title, matchedBlock)
  })

  // Explicit comparison layouts may use conceptual titles ("Manual ID")
  // followed by implementation headings ("Python List"). In that deliberate
  // layout, map the first sibling blocks by position instead of drawing empty
  // columns. The conservative default still requires exact title matches.
  if (usedBlocks.length < 2 && options.allowImplicitColumns && eligibleCandidates.length >= titles.length) {
    const positionalBlocks = eligibleCandidates.slice(0, titles.length)
    return makeGroupedComparison(
      compareBlock,
      titles.map((title, index) => comparisonColumn(title, positionalBlocks[index])),
      positionalBlocks
    )
  }

  // Rendering a partly matched comparison would recreate the empty-column bug.
  if (usedBlocks.length < 2) return null
  return makeGroupedComparison(compareBlock, columns, usedBlocks)
}

function comparisonColumn(title: string, block?: TeachDrawBlock): ComparisonColumn {
  return {
    title,
    sourceLabel: block && normalizeHeading(block.heading) !== normalizeHeading(title) ? block.heading : undefined,
    body: block ? buildPlainBody(block) : '',
    codeBlocks: block?.codeBlocks.map((codeBlock) => ({ ...codeBlock })) ?? [],
  }
}

function makeGroupedComparison(
  compareBlock: TeachDrawBlock,
  columns: ComparisonColumn[],
  usedBlocks: TeachDrawBlock[]
): GroupedComparisonBlock {
  const block: ComparisonRenderBlock = {
    ...compareBlock,
    renderKind: 'comparison',
    columns,
    bullets: [],
    numberedItems: [],
    codeBlocks: [],
    imageBlocks: [],
    flowSteps: [],
  }

  return { block, usedBlocks }
}

function isEligibleComparisonColumn(block: TeachDrawBlock): boolean {
  return !isComparisonBlock(block) && !isFlowLikeBlock(block) && !isTrainerScriptBlock(block) && block.imageBlocks.length === 0
}
