export type MarkdownFence = {
  marker: '`' | '~'
  length: number
  info: string
}

export type ScannedMarkdownLine = {
  index: number
  text: string
  kind: 'prose' | 'fence-open' | 'fence-content' | 'fence-close'
  fence?: MarkdownFence
}

export type MarkdownScan = {
  lines: ScannedMarkdownLine[]
  unclosedFence?: MarkdownFence
}

/**
 * Scans CommonMark-style backtick and tilde fences while retaining the source
 * line indexes. Structural Markdown consumers should only inspect `prose`
 * lines so headings inside examples can never affect document structure.
 */
export function scanMarkdownLines(markdown: string): MarkdownScan {
  const sourceLines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const lines: ScannedMarkdownLine[] = []
  let activeFence: MarkdownFence | undefined

  sourceLines.forEach((text, index) => {
    if (activeFence) {
      if (isClosingFence(text, activeFence)) {
        lines.push({ index, text, kind: 'fence-close', fence: activeFence })
        activeFence = undefined
      } else {
        lines.push({ index, text, kind: 'fence-content', fence: activeFence })
      }
      return
    }

    const openingFence = parseOpeningFence(text)
    if (openingFence) {
      activeFence = openingFence
      lines.push({ index, text, kind: 'fence-open', fence: openingFence })
      return
    }

    lines.push({ index, text, kind: 'prose' })
  })

  return { lines, unclosedFence: activeFence }
}

function parseOpeningFence(line: string): MarkdownFence | undefined {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  if (!match) return undefined

  const markerText = match[1]
  const info = match[2].trim()
  if (markerText[0] === '`' && info.includes('`')) return undefined

  return {
    marker: markerText[0] as MarkdownFence['marker'],
    length: markerText.length,
    info,
  }
}

function isClosingFence(line: string, openingFence: MarkdownFence): boolean {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
  if (!match) return false

  const markerText = match[1]
  return markerText[0] === openingFence.marker && markerText.length >= openingFence.length
}
