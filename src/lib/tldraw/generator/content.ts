import type { TeachDrawBlock, TeachDrawCodeBlock, TeachDrawFrame } from '@/types/teachdraw'
import { hiddenScreenNoteHeadings } from './constants'
import type { RenderBlockOptions } from './types'

export function cleanFrameTitle(title: string): string {
  return stripMarkdownMarkers(title)
    .replace(/^frame\s+\d+\s*:?\s*/i, '')
    .trim()
}

export function cleanBoardTitleText(title: string): string {
  return stripMarkdownMarkers(title)
    .replace(/^#*\s*/, '')
    .replace(/^tldraw\s+content\s*:\s*/i, '')
    .replace(/^tldraw\s+script\s*:\s*/i, '')
    .replace(/^content\s*:\s*/i, '')
    .replace(/^script\s*:\s*/i, '')
    .trim()
}

export function cleanBlockHeading(heading: string): string {
  const cleaned = stripMarkdownMarkers(heading).replace(/:$/, '').trim()
  if (hiddenScreenNoteHeadings.has(normalizeHeading(cleaned))) return ''
  if (normalizeHeading(cleaned) === 'content') return ''
  return cleaned
}

export function stripMarkdownMarkers(input: string): string {
  return input
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replaceAll('\u2192', '->')
    .replaceAll('\u00e2\u2020\u2019', '->')
    .replaceAll('\u00e2\u20ac\u201d', '-')
    .replaceAll('\u00e2\u20ac\u201c', '-')
    .trim()
}

export function normalizeHeading(heading: string): string {
  return stripMarkdownMarkers(heading).replace(/:$/, '').trim().toLowerCase()
}

export function buildTextCardText(block: TeachDrawBlock, options: RenderBlockOptions = {}): string {
  const heading = options.omitHeading ? '' : options.labelOverride ?? cleanBlockHeading(block.heading)
  const body = buildPlainBody(block)
  return [heading, body].filter(Boolean).join('\n\n')
}

export function buildPlainBody(block: TeachDrawBlock): string {
  const parts: string[] = []
  const text = stripMarkdownMarkers(block.text)
  const bullets = block.bullets.map(stripMarkdownMarkers).filter(Boolean)
  const numbered = block.numberedItems.map(stripMarkdownMarkers).filter(Boolean)

  if (text) parts.push(text)
  if (bullets.length > 0) parts.push(bullets.map((item) => `- ${item}`).join('\n'))
  if (numbered.length > 0) parts.push(numbered.map((item, index) => `${index + 1}. ${item}`).join('\n'))

  return parts.filter(Boolean).join('\n\n')
}

export function hasNonCodeText(block: TeachDrawBlock): boolean {
  const body = buildPlainBody(block)
  if (block.codeBlocks.length === 0 && (block.kind === 'code' || block.kind === 'command' || looksLikeCommandText(body))) return false
  return Boolean(buildPlainBody(block))
}

export function getCodeUnits(block: TeachDrawBlock): TeachDrawCodeBlock[] {
  if (block.codeBlocks.length > 0) return block.codeBlocks

  const content = [block.text, block.bullets.join('\n'), block.numberedItems.join('\n')].filter(Boolean).join('\n')
  return [
    {
      language: block.kind === 'command' || looksLikeCommandText(content) ? 'bash' : 'text',
      content,
    },
  ]
}

export function looksLikeCommandText(text: string): boolean {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.length > 0 && lines.every((line) => /^(npm|npx|pnpm|yarn|pip|python\s+-m|uvicorn|fastapi\s+dev|git|node)\b/i.test(line))
}

export function getFlowSteps(block: TeachDrawBlock): string[] {
  if (block.flowSteps.length > 0) return block.flowSteps.map(stripMarkdownMarkers)
  const body = buildPlainBody(block)
  if (!body) return ['Flow step']
  if (body.includes('->')) return body.split('->').map(stripMarkdownMarkers).filter(Boolean)
  return body.split('\n').map(stripMarkdownMarkers).filter(Boolean)
}

export function getVisibleFrameTitle(frame: TeachDrawFrame): string {
  const titleBlock = frame.blocks.find((block) => block.kind === 'title' && buildPlainBody(block))
  const title = titleBlock ? buildPlainBody(titleBlock) : cleanFrameTitle(frame.frameTitle)
  return title || 'Untitled Section'
}

export function isSimilarText(a: string, b: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalize(a) === normalize(b)
}
