import { CODE_LINE_HEIGHT, CODE_PADDING_Y } from './constants'

export function estimateCodeHeight(code: string): number {
  const lines = Math.max(1, code.split('\n').length)
  const naturalHeight = lines * CODE_LINE_HEIGHT + CODE_PADDING_Y * 2
  const compactMinimum = lines === 1 ? 102 : lines <= 2 ? 126 : lines <= 5 ? 150 : 190
  return Math.max(compactMinimum, naturalHeight)
}

export function estimateTextCardHeight(
  text: string,
  width: number,
  options: { paddingX: number; paddingY: number; lineHeight: number; minimum: number }
): number {
  const usableWidth = Math.max(180, width - options.paddingX * 2)
  const charsPerLine = Math.max(24, Math.floor(usableWidth / 12))
  const lines = estimateWrappedLines(text, width, charsPerLine)
  return Math.max(options.minimum, lines * options.lineHeight + options.paddingY * 2)
}

export function estimateWrappedLines(text: string, width: number, charsPerLine?: number): number {
  const safeCharsPerLine = charsPerLine ?? Math.max(28, Math.floor(width / 12))
  return text.split('\n').reduce((sum, line) => {
    if (!line.trim()) return sum + 1
    return sum + Math.max(1, Math.ceil(line.length / safeCharsPerLine))
  }, 0)
}

export function shouldBoldFirstLine(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim()
  return Boolean(firstLine && text.includes('\n'))
}
