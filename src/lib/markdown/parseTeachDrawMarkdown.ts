import type { TeachDrawDocument } from '@/types/teachdraw'
import { normalizeMarkdown } from './markdownUtils'
import { scanMarkdownLines } from './fenceScanner'
import { parseFrameBasedMarkdown } from './parseFrameBasedMarkdown'
import { parseSectionBasedMarkdown } from './parseSectionBasedMarkdown'

const frameHeadingRegex = /^#{1,2}\s*Frame(?:\s+\d+\s*:|\s+)(.+)$/im

export function parseTeachDrawMarkdown(markdown: string): TeachDrawDocument {
  const normalized = normalizeMarkdown(markdown)

  if (!normalized.trim()) {
    return {
      mode: 'section-based',
      rawTitle: 'Untitled Lesson',
      boardTitle: 'Untitled Lesson',
      frames: [],
    }
  }

  const hasFrameHeading = scanMarkdownLines(normalized).lines.some(
    (line) => line.kind === 'prose' && frameHeadingRegex.test(line.text)
  )

  return hasFrameHeading
    ? parseFrameBasedMarkdown(normalized)
    : parseSectionBasedMarkdown(normalized)
}
