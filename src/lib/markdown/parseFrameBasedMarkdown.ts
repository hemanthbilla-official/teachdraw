import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame, TeachDrawLayoutHint } from '@/types/teachdraw'
import { normalizeMarkdown, parseBlock, parseBoardTitle, slugId, stripMarkdownMarkers } from './markdownUtils'

const frameHeadingRegex = /^#{1,2}\s*Frame\s+(\d+)\s*:\s*(.+)$/i

export function parseFrameBasedMarkdown(markdown: string): TeachDrawDocument {
  const normalized = normalizeMarkdown(markdown)
  const lines = normalized.split('\n')
  const frameHeadingIndexes = lines
    .map((line, index) => ({ line, index, match: line.match(frameHeadingRegex) }))
    .filter((entry) => entry.match)

  const firstFrameIndex = frameHeadingIndexes[0]?.index ?? lines.length
  const titleInfo = parseBoardTitle(lines.slice(0, firstFrameIndex).join('\n'))
  const frames: TeachDrawFrame[] = []

  frameHeadingIndexes.forEach((entry, frameIndex) => {
    const match = entry.match
    if (!match) return

    const nextFrameIndex = frameHeadingIndexes[frameIndex + 1]?.index ?? lines.length
    const bodyLines = lines.slice(entry.index + 1, nextFrameIndex)
    const layoutHint = parseFrameLayoutHint(bodyLines)
    const blocks = parseFrameBlocks(removeFrameLayoutComments(bodyLines), frameIndex)

    frames.push({
      id: slugId('frame', frameIndex, match[2]),
      frameNumber: Number(match[1]),
      frameTitle: stripMarkdownMarkers(match[2]),
      layoutHint,
      blocks,
    })
  })

  return {
    mode: 'frame-based',
    rawTitle: titleInfo.rawTitle,
    boardTitle: titleInfo.boardTitle ?? titleInfo.rawTitle,
    boardSubtitle: titleInfo.boardSubtitle,
    frames: splitCrowdedFrames(frames),
  }
}

const layoutHints = new Set<TeachDrawLayoutHint>([
  'concept-focus',
  'code-focus',
  'flow-focus',
  'mistake-fix',
  'practice-grid',
  'comparison',
  'recap',
])

function parseFrameLayoutHint(lines: string[]): TeachDrawLayoutHint | undefined {
  for (const line of lines.slice(0, 6)) {
    const match = line.match(/<!--\s*layout\s*:\s*([a-z-]+)\s*-->/i)
    const value = match?.[1]?.toLowerCase()
    if (value && layoutHints.has(value as TeachDrawLayoutHint)) return value as TeachDrawLayoutHint
  }
  return undefined
}

function removeFrameLayoutComments(lines: string[]): string[] {
  return lines.filter((line) => !/<!--\s*layout\s*:\s*[a-z-]+\s*-->/i.test(line))
}

function splitCrowdedFrames(frames: TeachDrawFrame[]): TeachDrawFrame[] {
  const maxBlocksPerSection = 6
  const expanded: TeachDrawFrame[] = []

  frames.forEach((frame) => {
    if (frame.blocks.length <= maxBlocksPerSection + 1) {
      expanded.push(frame)
      return
    }

    const titleBlock = frame.blocks.find((block) => block.kind === 'title')
    const contentBlocks = frame.blocks.filter((block) => block !== titleBlock)
    if (contentBlocks.length <= maxBlocksPerSection) {
      expanded.push(frame)
      return
    }

    const chunks = chunkBlocks(contentBlocks, maxBlocksPerSection)
    chunks.forEach((chunk, index) => {
      const blocks = index === 0 && titleBlock ? [titleBlock, ...chunk] : chunk
      expanded.push({
        ...frame,
        id: `${frame.id}-part-${index + 1}`,
        frameTitle: index === 0 ? frame.frameTitle : `${frame.frameTitle} Continued`,
        blocks,
      })
    })
  })

  return expanded
}

function chunkBlocks(blocks: TeachDrawBlock[], size: number): TeachDrawBlock[][] {
  const chunks: TeachDrawBlock[][] = []
  for (let index = 0; index < blocks.length; index += size) {
    chunks.push(blocks.slice(index, index + size))
  }
  return chunks
}

function parseFrameBlocks(lines: string[], frameIndex: number) {
  const blockIndexes = lines
    .map((line, index) => ({ line, index, match: line.match(/^##\s+(.+)$/) }))
    .filter((entry) => entry.match)

  if (blockIndexes.length === 0) return parseLabelBlocks(lines, frameIndex)

  return blockIndexes.map((entry, blockIndex) => {
    const heading = entry.match?.[1] ?? 'Content'
    const nextBlockIndex = blockIndexes[blockIndex + 1]?.index ?? lines.length
    const rawContent = lines
      .slice(entry.index + 1, nextBlockIndex)
      .filter((line) => line.trim() !== '---')
      .join('\n')

    return parseBlock(slugId(`frame-${frameIndex + 1}-block`, blockIndex, heading), heading, rawContent)
  })
}

function parseLabelBlocks(lines: string[], frameIndex: number) {
  const blockIndexes = lines
    .map((line, index) => ({ line, index, match: line.match(/^([A-Z][A-Za-z0-9 /`+().-]{1,60})\s*:\s*$/) }))
    .filter((entry) => entry.match)

  if (blockIndexes.length === 0) {
    return [parseBlock(slugId(`frame-${frameIndex + 1}-block`, 0, 'Content'), 'Content', lines.join('\n'))]
  }

  return blockIndexes.map((entry, blockIndex) => {
    const heading = entry.match?.[1] ?? 'Content'
    const nextBlockIndex = blockIndexes[blockIndex + 1]?.index ?? lines.length
    const rawContent = lines
      .slice(entry.index + 1, nextBlockIndex)
      .filter((line) => line.trim() !== '---')
      .join('\n')

    return parseBlock(slugId(`frame-${frameIndex + 1}-block`, blockIndex, heading), heading, rawContent)
  })
}
