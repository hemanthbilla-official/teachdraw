import type { TeachDrawDocument, TeachDrawFrame, TeachDrawLayoutHint } from '@/types/teachdraw'
import { scanMarkdownLines } from './fenceScanner'
import { normalizeMarkdown, parseBlock, parseBoardTitle, slugId, stripMarkdownMarkers } from './markdownUtils'

const frameHeadingRegex = /^#{1,2}\s*Frame(?:\s+(\d+)\s*:|\s+)(.+)$/i

export function parseFrameBasedMarkdown(markdown: string): TeachDrawDocument {
  const normalized = normalizeMarkdown(markdown)
  const lines = normalized.split('\n')
  const frameHeadingIndexes = scanMarkdownLines(normalized).lines
    .map((line) => ({ line: line.text, index: line.index, match: line.kind === 'prose' ? line.text.match(frameHeadingRegex) : null }))
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
      frameNumber: match[1] ? Number(match[1]) : frameIndex + 1,
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
    frames,
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

const layoutHintAliases: Record<string, TeachDrawLayoutHint> = {
  concept: 'concept-focus',
  horizontal: 'concept-focus',
  vertical: 'concept-focus',
  code: 'code-focus',
  flow: 'flow-focus',
  compare: 'comparison',
  practice: 'practice-grid',
  task: 'practice-grid',
  mistake: 'mistake-fix',
  fix: 'mistake-fix',
}

function parseFrameLayoutHint(lines: string[]): TeachDrawLayoutHint | undefined {
  const proseLines = scanMarkdownLines(lines.join('\n')).lines.filter((line) => line.kind === 'prose').slice(0, 6)
  for (const line of proseLines) {
    const match = line.text.match(/<!--\s*layout\s*:\s*([a-z-]+)\s*-->/i)
    const value = match?.[1]?.toLowerCase()
    if (value && layoutHints.has(value as TeachDrawLayoutHint)) return value as TeachDrawLayoutHint
    if (value && layoutHintAliases[value]) return layoutHintAliases[value]
  }
  return undefined
}

function removeFrameLayoutComments(lines: string[]): string[] {
  return scanMarkdownLines(lines.join('\n')).lines
    .filter((line) => line.kind !== 'prose' || !/<!--\s*layout\s*:\s*[a-z-]+\s*-->/i.test(line.text))
    .map((line) => line.text)
}

function parseFrameBlocks(lines: string[], frameIndex: number) {
  const blockIndexes = scanMarkdownLines(lines.join('\n')).lines
    .map((line) => ({ line: line.text, index: line.index, match: line.kind === 'prose' ? line.text.match(/^##\s+(.+)$/) : null }))
    .filter((entry) => entry.match)

  if (blockIndexes.length === 0) return parseLabelBlocks(lines, frameIndex)

  const blocks = []
  const preamble = cleanBlockContent(lines.slice(0, blockIndexes[0].index))
  if (preamble.trim()) {
    blocks.push(parseBlock(slugId(`frame-${frameIndex + 1}-block`, 0, 'Content'), 'Content', preamble))
  }

  blockIndexes.forEach((entry, blockIndex) => {
    const heading = entry.match?.[1] ?? 'Content'
    const nextBlockIndex = blockIndexes[blockIndex + 1]?.index ?? lines.length
    const rawContent = cleanBlockContent(lines.slice(entry.index + 1, nextBlockIndex))

    blocks.push(parseBlock(slugId(`frame-${frameIndex + 1}-block`, blocks.length, heading), heading, rawContent))
  })

  return blocks
}

function parseLabelBlocks(lines: string[], frameIndex: number) {
  const blockIndexes = scanMarkdownLines(lines.join('\n')).lines
    .map((line) => ({
      line: line.text,
      index: line.index,
      match: line.kind === 'prose' ? line.text.match(/^([A-Z][A-Za-z0-9 /`+().-]{1,60})\s*:\s*$/) : null,
    }))
    .filter((entry) => entry.match)

  if (blockIndexes.length === 0) {
    const content = cleanBlockContent(lines)
    return content.trim()
      ? [parseBlock(slugId(`frame-${frameIndex + 1}-block`, 0, 'Content'), 'Content', content)]
      : []
  }

  const blocks = []
  const preamble = cleanBlockContent(lines.slice(0, blockIndexes[0].index))
  if (preamble.trim()) {
    blocks.push(parseBlock(slugId(`frame-${frameIndex + 1}-block`, 0, 'Content'), 'Content', preamble))
  }

  blockIndexes.forEach((entry, blockIndex) => {
    const heading = entry.match?.[1] ?? 'Content'
    const nextBlockIndex = blockIndexes[blockIndex + 1]?.index ?? lines.length
    const rawContent = cleanBlockContent(lines.slice(entry.index + 1, nextBlockIndex))

    blocks.push(parseBlock(slugId(`frame-${frameIndex + 1}-block`, blocks.length, heading), heading, rawContent))
  })

  return blocks
}

function cleanBlockContent(lines: string[]): string {
  return scanMarkdownLines(lines.join('\n')).lines
    .filter((line) => line.kind !== 'prose' || line.text.trim() !== '---')
    .map((line) => line.text)
    .join('\n')
    .trim()
}
