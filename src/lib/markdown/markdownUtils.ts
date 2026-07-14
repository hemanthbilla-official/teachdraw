import type { TeachDrawBlock, TeachDrawCodeBlock, TeachDrawImageBlock } from '@/types/teachdraw'
import { scanMarkdownLines } from './fenceScanner'

export function normalizeMarkdown(markdown: string): string {
  const normalized = unwrapOuterMarkdownFence(markdown.replace(/\r\n?/g, '\n'))
  const scan = scanMarkdownLines(normalized)

  return scan.lines
    .map((line) => (line.kind === 'prose' ? fixCommonMojibake(line.text) : line.text))
    .join('\n')
}

function unwrapOuterMarkdownFence(markdown: string): string {
  const lines = markdown.split('\n')
  const first = lines.findIndex((line) => line.trim() !== '')
  let last = lines.length - 1
  while (last >= 0 && lines[last].trim() === '') last -= 1

  if (first === -1 || last <= first) return markdown

  const opening = lines[first].match(/^ {0,3}(`{4,}|~{4,})\s*(?:markdown|md)?\s*$/i)
  if (!opening) return markdown

  const marker = opening[1][0]
  const minimumLength = opening[1].length
  const closing = lines[last].match(/^ {0,3}(`{4,}|~{4,})\s*$/)
  if (!closing || closing[1][0] !== marker || closing[1].length < minimumLength) return markdown

  return [...lines.slice(0, first), ...lines.slice(first + 1, last), ...lines.slice(last + 1)].join('\n')
}

function fixCommonMojibake(input: string): string {
  return input
    .replaceAll('\u2192', '->')
    .replaceAll('\u00e2\u2020\u2019', '->')
    .replaceAll('\u00e2\u2020\u201c', '\u2193')
    .replaceAll('\u00e2\u20ac\u201d', '-')
    .replaceAll('\u00e2\u20ac\u201c', '-')
    .replaceAll('\u00e2\u20ac\u2122', "'")
    .replaceAll('\u00e2\u20ac\u0153', '"')
    .replaceAll('\u00e2\u20ac\u009d', '"')
    .replaceAll('\u00e2\u20ac\u02dc', "'")
    .replaceAll('\u00e2\u20ac\u00a2', '-')
    .replaceAll('\u00e2\u201d\u0153\u00e2\u201d\u20ac\u00e2\u201d\u20ac', '|--')
    .replaceAll('\u00e2\u201d\u201d\u00e2\u201d\u20ac\u00e2\u201d\u20ac', '`--')
    .replaceAll('\ud83d\udcc1', '')
    .replaceAll('\ud83d\udcc4', '')
    .replaceAll('\ud83c\udf10', '')
}

export function stripMarkdownMarkers(input: string): string {
  return input
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .trim()
}

export function cleanBoardTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^#*\s*/g, '')
    .replace(/^tldraw\s+script\s*:\s*/i, '')
    .replace(/^tldraw\s+content\s*:\s*/i, '')
    .replace(/^script\s*:\s*/i, '')
    .replace(/^content\s*:\s*/i, '')
    .replace(/\*\*/g, '')
    .trim()
}

export function cleanCodeContent(language: string | undefined, content: string): string {
  void language
  return trimBlankCodeLines(content)
}

function trimBlankCodeLines(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift()
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }

  return lines.join('\n')
}

export function slugId(prefix: string, index: number, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return `${prefix}-${index + 1}${slug ? `-${slug}` : ''}`
}

export function detectBlockKind(heading: string): TeachDrawBlock['kind'] {
  const h = heading.toLowerCase()

  if (h.includes('title')) return 'title'
  if (h.includes('decision')) return 'decision'
  if (h.includes('mistake') || h.includes('wrong') || h.includes('bad approach')) return 'mistake'
  if (h.includes('correct') || h.includes('fix') || h.includes('solution') || h.includes('better approach')) return 'correct'

  if (
    h.includes('before code') ||
    h.includes('after code') ||
    h.includes('code meaning') ||
    h.includes('meaning of code') ||
    h.includes('code explanation')
  ) {
    return 'explanation'
  }

  if (/\b(flow|mapping|condition|branch|if)\b/i.test(h) || /\b(mental model|project view)\b/i.test(h)) {
    return 'flow'
  }

  if (h.includes('code') || h.includes('first code') || h.includes('complete code')) return 'code'
  if (h.includes('image') || h.includes('screenshot') || h.includes('photo') || h.includes('picture')) return 'image'

  if (h === 'request' || h.includes('request body') || h.includes('api request')) return 'request'
  if (h === 'response' || h.includes('api response')) return 'response'

  if (
    h.includes('command') ||
    h.includes('terminal') ||
    h.includes('powershell') ||
    h.includes('bash') ||
    h.includes('cmd')
  ) {
    return 'command'
  }

  if (h.includes('definition')) return 'definition'
  if (h.includes('meaning')) return 'meaning'
  if (h.includes('explanation') || h.includes('explain') || h.includes('walkthrough') || h.includes('what to notice')) {
    return 'explanation'
  }
  if (h.includes('example') || h.includes('preview') || h.includes('use case')) return 'example'
  if (h === 'memory' || h.includes('memory line') || h.includes('remember')) return 'memory'
  if (h.includes('important line') || h === 'important' || h.includes('important')) return 'important'
  if (h.includes('key point') || h.includes('core idea') || h.includes('core formula')) return 'keyPoint'
  if (h.includes('warning') || h.includes('error') || h.includes('common mistake') || h.includes('common error')) {
    return 'warning'
  }
  if (h.includes('practice')) return 'practice'
  if (h.includes('task') || h.includes('student activity')) return 'task'
  if (h.includes('assignment') || h.includes('homework')) return 'assignment'
  if (h.includes('compare') || h.includes('difference') || h.includes('vs')) return 'compare'
  if (h.includes('recap') || h.includes('summary')) return 'recap'

  return 'normal'
}

export function extractCodeBlocks(raw: string): { textWithoutCode: string; codeBlocks: TeachDrawCodeBlock[] } {
  const scan = scanMarkdownLines(raw)
  const textLines: string[] = []
  const codeBlocks: TeachDrawCodeBlock[] = []
  let language = ''
  let label: string | undefined
  let codeLines: string[] = []

  for (const line of scan.lines) {
    if (line.kind === 'fence-open') {
      language = line.fence?.info.trim() ?? ''
      label = takeTrailingCodeLabel(textLines)
      codeLines = []
      continue
    }

    if (line.kind === 'fence-close') {
      codeBlocks.push({ language: language || undefined, label, content: cleanCodeContent(language || undefined, codeLines.join('\n')) })
      language = ''
      label = undefined
      codeLines = []
      continue
    }

    if (line.kind === 'fence-content') {
      codeLines.push(line.text)
    } else {
      textLines.push(line.text)
    }
  }

  if (scan.unclosedFence) {
    codeBlocks.push({ language: language || undefined, label, content: cleanCodeContent(language || undefined, codeLines.join('\n')) })
  }

  return { textWithoutCode: textLines.join('\n'), codeBlocks }
}

export function extractImageBlocks(raw: string): { textWithoutImages: string; imageBlocks: TeachDrawImageBlock[] } {
  const imageBlocks: TeachDrawImageBlock[] = []
  const textWithoutImages = raw.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (_match, alt: string, url: string) => {
    imageBlocks.push({
      alt: stripMarkdownMarkers(alt || '').trim(),
      url: url.trim(),
    })
    return ''
  })

  return {
    textWithoutImages: textWithoutImages.replace(/\n{3,}/g, '\n\n'),
    imageBlocks,
  }
}

function takeTrailingCodeLabel(textLines: string[]): string | undefined {
  let index = textLines.length - 1
  while (index >= 0 && !textLines[index].trim()) index -= 1

  if (index < 0) return undefined

  const candidate = stripMarkdownMarkers(textLines[index]).trim()
  if (!isCodeFenceLabel(candidate)) return undefined

  textLines.splice(index, 1)
  while (textLines.length > 0 && !textLines[textLines.length - 1].trim()) {
    textLines.pop()
  }

  return candidate
}

function isCodeFenceLabel(value: string): boolean {
  if (!/:\s*$/.test(value)) return false
  if (value.length > 80) return false
  return /^[A-Za-z][A-Za-z0-9 /`?()._-]*:\s*$/.test(value)
}

export function parseBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.match(/^\s*[-*•]\s+(.+)$/)?.[1])
    .filter((item): item is string => Boolean(item))
    .map(stripMarkdownMarkers)
}

export function parseNumberedItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.match(/^\s*\d+[.)]\s+(.+)$/)?.[1])
    .filter((item): item is string => Boolean(item))
    .map(stripMarkdownMarkers)
}

export function getMeaningfulLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => stripMarkdownMarkers(line))
    .filter((line) => line && line !== '---' && !/^\s*[-*•]\s+/.test(line) && !/^\s*\d+[.)]\s+/.test(line))
}

export function parseFlowSteps(text: string, bullets: string[]): string[] {
  const clean = stripMarkdownMarkers(text).trim()

  if (!clean && bullets.length > 0) return bullets

  if (clean.includes('\u2193')) {
    return clean
      .split('\n')
      .map((line) => stripMarkdownMarkers(line))
      .filter((line) => line && line !== '\u2193')
  }

  if (clean.includes('↓')) {
    return clean
      .split('\n')
      .map((line) => stripMarkdownMarkers(line))
      .filter((line) => line && line !== '↓')
  }

  const separator = ['->', '→', '=>'].find((item) => clean.includes(item))
  if (separator) {
    return clean
      .split(separator)
      .map((step) => stripMarkdownMarkers(step))
      .filter(Boolean)
  }

  if (bullets.length > 0) return bullets

  return getMeaningfulLines(text).filter((line) => line.length < 120)
}

export function shouldTreatAsUnbulletedList(heading: string, lines: string[]): boolean {
  if (lines.length < 3) return false
  const h = heading.toLowerCase()
  const listHeadings = [
    'uses',
    'required components',
    'responsibility',
    'concepts covered',
    'solves',
    'main actions',
    'apis created',
    'examples',
    'questions',
    'components',
    'steps',
  ]

  return listHeadings.some((item) => h.includes(item)) || lines.every((line) => line.length <= 80)
}

export function parseBlock(id: string, heading: string, rawContent: string, kindOverride?: TeachDrawBlock['kind']): TeachDrawBlock {
  const { textWithoutCode, codeBlocks } = extractCodeBlocks(rawContent)
  const { textWithoutImages, imageBlocks } = extractImageBlocks(textWithoutCode)
  const bullets = parseBullets(textWithoutImages)
  const numberedItems = parseNumberedItems(textWithoutImages)
  const kind = kindOverride ?? detectBlockKind(heading)

  if (kind === 'compare') {
    return {
      id,
      heading: stripMarkdownMarkers(heading),
      kind,
      text: normalizeComparisonText(textWithoutImages),
      bullets: [],
      numberedItems: [],
      codeBlocks,
      imageBlocks,
      flowSteps: [],
    }
  }

  const meaningfulLines = getMeaningfulLines(textWithoutImages)
  const shouldUseUnbulleted = kind !== 'flow' && bullets.length === 0 && shouldTreatAsUnbulletedList(heading, meaningfulLines)
  const finalBullets = shouldUseUnbulleted ? meaningfulLines : bullets
  const text = stripMarkdownMarkers(
    meaningfulLines.filter((line) => !finalBullets.includes(line) && !numberedItems.includes(line)).join('\n\n')
  )

  return {
    id,
    heading: stripMarkdownMarkers(heading),
    kind,
    text,
    bullets: finalBullets,
    numberedItems,
    codeBlocks,
    imageBlocks,
    flowSteps:
      kind === 'flow' || kind === 'decision'
        ? parseFlowSteps(
            [textWithoutImages, ...codeBlocks.map((codeBlock) => codeBlock.content)].filter(Boolean).join('\n'),
            finalBullets
          )
        : [],
  }
}

function normalizeComparisonText(text: string): string {
  return text
    .split('\n')
    .map((line) => stripMarkdownMarkers(line).replace(/^\s*[-*]\s+/, '- ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseBoardTitle(markdownBeforeFrames: string): { rawTitle: string; boardTitle?: string; boardSubtitle?: string } {
  const lines = markdownBeforeFrames.split('\n')
  const firstHeading = lines
    .map((line) => line.match(/^#\s+(.+)$/)?.[1])
    .find((title) => title && !/^Frame(?:\s+\d+\s*:|\s+)/i.test(title))
  const rawTitle = firstHeading ? cleanBoardTitle(firstHeading) || 'Untitled Lesson' : 'Untitled Lesson'

  const boardTitleIndex = lines.findIndex((line) => /^##\s+Board Title\s*$/i.test(line.trim()))
  if (boardTitleIndex === -1) return { rawTitle }

  let boardTitle: string | undefined
  let boardSubtitle: string | undefined
  let readSubtitle = false

  for (const line of lines.slice(boardTitleIndex + 1)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '---') continue
    if (/^#{1,2}\s+/.test(trimmed)) break

    if (/^Subtitle\s*:?\s*$/i.test(trimmed)) {
      readSubtitle = true
      continue
    }

    if (!boardTitle && !readSubtitle) {
      boardTitle = cleanBoardTitle(trimmed)
      continue
    }

    if (readSubtitle && !boardSubtitle) {
      boardSubtitle = stripMarkdownMarkers(trimmed)
      break
    }
  }

  return { rawTitle, boardTitle, boardSubtitle }
}
