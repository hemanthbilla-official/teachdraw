import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame } from '@/types/teachdraw'
import { scanMarkdownLines } from './fenceScanner'
import { detectBlockKind, normalizeMarkdown, parseBlock, slugId, stripMarkdownMarkers } from './markdownUtils'

const sectionPrefixRegex =
  /^(Concept|Flow|Decision|Code|Command|Request|Response|Image|Screenshot|Photo|Task|Practice|Assignment|Warning|Mistake|Correct|Compare|Recap|Example|Definition|Meaning|Explanation|Walkthrough|What to notice|Important|Key Point|Memory Line)\s*:\s*(.+)$/i

export function parseSectionBasedMarkdown(markdown: string): TeachDrawDocument {
  const normalized = normalizeMarkdown(markdown)
  const lines = normalized.split('\n')
  const rawTitle =
    lines
      .map((line) => line.match(/^#\s+(.+)$/)?.[1])
      .find(Boolean)
      ?.trim() || 'Untitled Lesson'

  const sectionIndexes = scanMarkdownLines(normalized).lines
    .map((line) => ({ line: line.text, index: line.index, match: line.kind === 'prose' ? line.text.match(/^##\s+(.+)$/) : null }))
    .filter((entry) => entry.match)

  let frames: TeachDrawFrame[]

  if (sectionIndexes.length === 0) {
    const body = lines.filter((line) => !/^#\s+/.test(line)).join('\n')
    frames = [
      {
        id: 'frame-1-content',
        frameNumber: 1,
        frameTitle: stripMarkdownMarkers(rawTitle),
        blocks: [parseBlock('frame-1-block-1-content', 'Content', body, 'normal')],
      },
    ]
  } else {
    frames = []
    const firstSectionIndex = sectionIndexes[0].index
    const preamble = lines
      .slice(0, firstSectionIndex)
      .filter((line) => !/^#\s+/.test(line) && line.trim() !== '---')
      .join('\n')
      .trim()

    if (preamble) {
      frames.push({
        id: 'frame-1-overview',
        frameNumber: 1,
        frameTitle: 'Overview',
        blocks: [parseBlock('frame-1-block-1-content', 'Content', preamble, 'normal')],
      })
    }

    sectionIndexes.forEach((entry, index) => {
      const originalHeading = entry.match?.[1] ?? `Section ${index + 1}`
      const nextSectionIndex = sectionIndexes[index + 1]?.index ?? lines.length
      const rawContent = cleanSectionContent(lines.slice(entry.index + 1, nextSectionIndex))
      const parsedHeading = parseSectionHeading(originalHeading)

      const frameIndex = frames.length
      frames.push({
        id: slugId('frame', frameIndex, parsedHeading.frameTitle),
        frameNumber: frameIndex + 1,
        frameTitle: parsedHeading.frameTitle,
        blocks: [
          parseBlock(
            slugId(`frame-${frameIndex + 1}-block`, 0, parsedHeading.blockHeading),
            parsedHeading.blockHeading,
            rawContent,
            parsedHeading.kind
          ),
        ],
      })
    })
  }

  return {
    mode: 'section-based',
    rawTitle: stripMarkdownMarkers(rawTitle),
    boardTitle: stripMarkdownMarkers(rawTitle),
    frames,
  }
}

function cleanSectionContent(lines: string[]): string {
  return scanMarkdownLines(lines.join('\n')).lines
    .filter((line) => line.kind !== 'prose' || line.text.trim() !== '---')
    .map((line) => line.text)
    .join('\n')
}

function parseSectionHeading(heading: string): {
  frameTitle: string
  blockHeading: string
  kind: TeachDrawBlock['kind']
} {
  const match = heading.match(sectionPrefixRegex)
  if (!match) {
    return {
      frameTitle: stripMarkdownMarkers(heading),
      blockHeading: stripMarkdownMarkers(heading),
      kind: detectBlockKind(heading),
    }
  }

  return {
    frameTitle: stripMarkdownMarkers(match[2]),
    blockHeading: stripMarkdownMarkers(match[1]),
    kind: detectBlockKind(match[1]),
  }
}
