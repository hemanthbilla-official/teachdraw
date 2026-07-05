import type { TeachDrawBlock } from '@/types/teachdraw'
import { cleanBlockHeading, normalizeHeading, stripMarkdownMarkers } from './content'
import type { ComparisonColumn } from './types'

export function getComparisonColumns(block: TeachDrawBlock): ComparisonColumn[] {
  const text = buildComparisonSourceText(block)
  const explicit = splitComparisonByStandaloneVs(text)
  if (explicit.length >= 2) return explicit.map(comparisonPartToColumn)

  const titleColumns = splitHeadingByVs(block.heading)
  const titledSections = splitComparisonBySectionLabels(text)
  if (titledSections.length >= 2) return titledSections

  if (titleColumns.length >= 2) {
    const knownTitleSections = splitComparisonByKnownTitles(text, titleColumns)
    if (knownTitleSections.length >= 2) return knownTitleSections

    const bodyLines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const sectionsByTitle = titleColumns.map((title) => {
      const matching = bodyLines.filter((line) => line.toLowerCase().startsWith(`${title.toLowerCase()}:`))
      const body = matching.map((line) => line.replace(new RegExp(`^${escapeRegExp(title)}:\\s*`, 'i'), '')).join('\n')
      return { title, body }
    })

    if (sectionsByTitle.some((column) => column.body)) return sectionsByTitle
    if (text) return titleColumns.map((title, index) => ({ title, body: index === 0 ? text : '' }))
    return titleColumns.map((title) => ({ title, body: '' }))
  }

  return []
}

function buildComparisonSourceText(block: TeachDrawBlock): string {
  const parts = [block.text]
  if (block.bullets.length > 0) parts.push(block.bullets.map((item) => `- ${item}`).join('\n'))
  if (block.numberedItems.length > 0) parts.push(block.numberedItems.map((item, index) => `${index + 1}. ${item}`).join('\n'))
  return parts.filter(Boolean).join('\n\n').trim()
}

function splitComparisonByStandaloneVs(text: string): string[] {
  return text
    .split(/\n\s*(?:vs|versus)\s*\n/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitHeadingByVs(heading: string): string[] {
  const clean = cleanBlockHeading(heading)
  if (!/\bvs\b|\bversus\b/i.test(clean)) return []
  return clean
    .split(/\s+(?:vs|versus)\s+/i)
    .map(stripMarkdownMarkers)
    .filter((part) => part && normalizeHeading(part) !== 'compare')
    .slice(0, 3)
}

function comparisonPartToColumn(part: string): ComparisonColumn {
  const lines = part.split('\n').map((line) => line.trim()).filter(Boolean)
  const first = lines[0] ?? ''
  const firstIsTitle = first.length <= 60 && !first.startsWith('- ') && !/^\d+[.)]\s+/.test(first)
  if (!firstIsTitle) return { title: '', body: lines.join('\n') }
  return { title: first.replace(/:$/, ''), body: lines.slice(1).join('\n') }
}

function splitComparisonBySectionLabels(text: string): ComparisonColumn[] {
  const lines = text.split('\n')
  const sections: ComparisonColumn[] = []
  let current: ComparisonColumn | null = null

  lines.forEach((line) => {
    const trimmed = line.trim()
    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9 /+()._-]{1,48}):$/)
    if (match) {
      if (current) sections.push(current)
      current = { title: match[1], body: '' }
      return
    }

    if (current) {
      current.body = [current.body, line].filter(Boolean).join('\n')
    }
  })

  if (current) sections.push(current)
  return sections.filter((section) => section.title || section.body).slice(0, 3)
}

function splitComparisonByKnownTitles(text: string, titles: string[]): ComparisonColumn[] {
  const sections: ComparisonColumn[] = []
  let current: ComparisonColumn | null = null

  text.split('\n').forEach((line) => {
    const trimmed = line.trim().replace(/:$/, '')
    const title = titles.find((item) => normalizeHeading(item) === normalizeHeading(trimmed))

    if (title) {
      if (current) sections.push(current)
      current = { title, body: '' }
      return
    }

    if (current) {
      current.body = [current.body, line].filter(Boolean).join('\n')
    }
  })

  if (current) sections.push(current)
  return sections.filter((section) => section.title || section.body).slice(0, 3)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
