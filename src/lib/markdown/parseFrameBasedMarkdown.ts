import type { TeachDrawDocument, TeachDrawFrame } from '@/types/teachdraw'
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
    const blocks = parseFrameBlocks(bodyLines, frameIndex)

    frames.push({
      id: slugId('frame', frameIndex, match[2]),
      frameNumber: Number(match[1]),
      frameTitle: stripMarkdownMarkers(match[2]),
      blocks,
    })
  })

  return {
    mode: 'frame-based',
    rawTitle: titleInfo.rawTitle,
    boardTitle: titleInfo.boardTitle ?? titleInfo.rawTitle,
    boardSubtitle: titleInfo.boardSubtitle,
    frames,
  }
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
