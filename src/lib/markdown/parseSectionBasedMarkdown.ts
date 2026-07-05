import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame } from '@/types/teachdraw'
import { detectBlockKind, normalizeMarkdown, parseBlock, slugId, stripMarkdownMarkers } from './markdownUtils'

const sectionPrefixRegex =
  /^(Concept|Flow|Code|Task|Practice|Assignment|Warning|Mistake|Correct|Compare|Recap|Example|Command|Definition|Meaning|Explanation)\s*:\s*(.+)$/i

export function parseSectionBasedMarkdown(markdown: string): TeachDrawDocument {
  const normalized = normalizeMarkdown(markdown)
  const lines = normalized.split('\n')
  const rawTitle =
    lines
      .map((line) => line.match(/^#\s+(.+)$/)?.[1])
      .find(Boolean)
      ?.trim() || 'Untitled Lesson'

  const sectionIndexes = lines
    .map((line, index) => ({ line, index, match: line.match(/^##\s+(.+)$/) }))
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
    frames = sectionIndexes.map((entry, index) => {
      const originalHeading = entry.match?.[1] ?? `Section ${index + 1}`
      const nextSectionIndex = sectionIndexes[index + 1]?.index ?? lines.length
      const rawContent = lines
        .slice(entry.index + 1, nextSectionIndex)
        .filter((line) => line.trim() !== '---')
        .join('\n')
      const parsedHeading = parseSectionHeading(originalHeading)

      return {
        id: slugId('frame', index, parsedHeading.frameTitle),
        frameNumber: index + 1,
        frameTitle: parsedHeading.frameTitle,
        blocks: [
          parseBlock(
            slugId(`frame-${index + 1}-block`, 0, parsedHeading.blockHeading),
            parsedHeading.blockHeading,
            rawContent,
            parsedHeading.kind
          ),
        ],
      }
    })
  }

  return {
    mode: 'section-based',
    rawTitle: stripMarkdownMarkers(rawTitle),
    boardTitle: stripMarkdownMarkers(rawTitle),
    frames,
  }
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
