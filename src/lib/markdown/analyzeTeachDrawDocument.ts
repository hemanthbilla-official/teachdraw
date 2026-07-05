import type { TeachDrawBlock, TeachDrawDocument, TeachDrawFrame } from '@/types/teachdraw'
import { getImageUrlIssue } from '@/lib/imageUrlRules'

export type TeachDrawBoardAnalysis = {
  frameCount: number
  blockCount: number
  codeBlockCount: number
  imageBlockCount: number
  flowBlockCount: number
  comparisonBlockCount: number
  warningCount: number
  warnings: string[]
}

const trainerScriptHeadingRegex =
  /^(ask|ask students|question|questions|answer|expected answer|student expected answer|students expected answer|student activity|wait for answers|wait for answer|oral question|trainer note|trainer line|trainer script)\b/i

export function analyzeTeachDrawDocument(document: TeachDrawDocument, markdown: string): TeachDrawBoardAnalysis {
  const frames = document.frames
  const blocks = frames.flatMap((frame) => frame.blocks)
  const warnings = [
    ...analyzeMarkdownFences(markdown),
    ...analyzeFrameStructure(frames),
    ...analyzeBlocks(frames),
  ]

  return {
    frameCount: frames.length,
    blockCount: blocks.length,
    codeBlockCount: blocks.reduce((sum, block) => sum + block.codeBlocks.length, 0),
    imageBlockCount: blocks.reduce((sum, block) => sum + block.imageBlocks.length, 0),
    flowBlockCount: blocks.filter((block) => block.kind === 'flow' || block.kind === 'decision').length,
    comparisonBlockCount: blocks.filter((block) => block.kind === 'compare').length,
    warningCount: warnings.length,
    warnings,
  }
}

function analyzeMarkdownFences(markdown: string): string[] {
  const fenceCount = markdown.split('\n').filter((line) => line.trim().startsWith('```')).length
  return fenceCount % 2 === 1 ? ['One fenced code block is not closed.'] : []
}

function analyzeFrameStructure(frames: TeachDrawFrame[]): string[] {
  if (frames.length === 0) return ['No frames detected yet.']

  const emptyFrames = frames.filter((frame) => frame.blocks.length === 0)
  if (emptyFrames.length === 0) return []

  const names = emptyFrames.slice(0, 2).map((frame) => frame.frameTitle || 'Untitled frame')
  const suffix = emptyFrames.length > 2 ? ` and ${emptyFrames.length - 2} more` : ''
  return [`Empty frame: ${names.join(', ')}${suffix}.`]
}

function analyzeBlocks(frames: TeachDrawFrame[]): string[] {
  const warnings: string[] = []
  const blocks = frames.flatMap((frame) => frame.blocks)
  const hiddenScriptBlocks = blocks.filter((block) => trainerScriptHeadingRegex.test(block.heading.trim()))
  const emptyCodeBlocks = blocks.filter((block) => block.codeBlocks.some((codeBlock) => !codeBlock.content.trim()))
  const imageUrlIssues = blocks.flatMap((block) => block.imageBlocks.map((imageBlock) => getImageUrlIssue(imageBlock.url)).filter(Boolean))
  const unclearComparison = frames.some((frame) => frame.blocks.some((block) => block.kind === 'compare' && !hasComparisonPattern(block)))

  if (hiddenScriptBlocks.length > 0) {
    warnings.push('Trainer-script headings will be skipped on the board.')
  }

  if (emptyCodeBlocks.length > 0) {
    warnings.push('At least one code block is empty.')
  }

  if (imageUrlIssues.includes('invalid')) {
    warnings.push('At least one image URL is not a valid http(s) link.')
  }

  if (imageUrlIssues.includes('search-or-page')) {
    warnings.push('At least one image uses a search/page URL. Use the direct image URL instead.')
  }

  if (imageUrlIssues.includes('thumbnail-proxy')) {
    warnings.push('At least one image uses a Google thumbnail/proxy URL. It may appear cropped or low resolution; use the original direct image URL.')
  }

  if (imageUrlIssues.includes('not-direct-looking')) {
    warnings.push('At least one image URL does not look like a direct image file. Prefer URLs ending in .png, .jpg, .webp, .svg, or a known image CDN URL.')
  }

  if (unclearComparison) {
    warnings.push('A Compare block needs an `A vs B` title or standalone `vs` lines.')
  }

  return warnings
}

function hasComparisonPattern(block: TeachDrawBlock): boolean {
  const source = [block.heading, block.text, ...block.bullets, ...block.numberedItems].join('\n')
  return /\bvs\b|\bversus\b/i.test(source)
}
