'use client'

import { useEffect, useMemo, useState } from 'react'
import { type Editor } from 'tldraw'
import { teachDrawTemplates } from '@/lib/templates'
import { parseTeachDrawMarkdown } from '@/lib/markdown/parseTeachDrawMarkdown'
import {
  clearGeneratedShapes,
  generateTeachDrawBoard,
  type GenerateTeachDrawOptions,
} from '@/lib/tldraw/generateTeachDrawBoard'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { MarkdownEditorPanel } from './MarkdownEditorPanel'
import { TldrawCanvasPanel } from './TldrawCanvasPanel'

const defaultOptions: GenerateTeachDrawOptions = {
  layoutMode: 'whiteboard-notes',
  columns: 3,
  flowOrientation: 'auto',
  clearBeforeGenerate: true,
}

export function TeachDrawApp() {
  const [markdown, setMarkdown] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [options, setOptions] = useState<GenerateTeachDrawOptions>(defaultOptions)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [status, setStatus] = useState('Ready.')
  const [isGenerating, setIsGenerating] = useState(false)

  const document = useMemo(() => parseTeachDrawMarkdown(markdown), [markdown])

  useEffect(() => {
    const storedMarkdown = readStorage(STORAGE_KEYS.markdown)
    const storedTemplate = readStorage(STORAGE_KEYS.selectedTemplate)
    const storedLayout = readStorage(STORAGE_KEYS.layout)
    const storedColumns = Number(readStorage(STORAGE_KEYS.columns)) as GenerateTeachDrawOptions['columns']
    const storedFlow = readStorage(STORAGE_KEYS.flowOrientation) as GenerateTeachDrawOptions['flowOrientation'] | null

    if (storedMarkdown) setMarkdown(storedMarkdown)
    if (storedTemplate && teachDrawTemplates.some((template) => template.id === storedTemplate)) {
      setSelectedTemplate(storedTemplate)
    }
    setOptions((current) => ({
      ...current,
      layoutMode: normalizeStoredLayoutMode(storedLayout),
      columns: [2, 3, 4].includes(storedColumns) ? storedColumns : current.columns,
      flowOrientation: storedFlow === 'vertical' || storedFlow === 'horizontal' || storedFlow === 'auto' ? storedFlow : current.flowOrientation,
    }))
  }, [])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.markdown, markdown)
  }, [markdown])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.layout, options.layoutMode)
    writeStorage(STORAGE_KEYS.columns, String(options.columns))
    writeStorage(STORAGE_KEYS.flowOrientation, options.flowOrientation)
  }, [options])

  function handleTemplateSelect(templateId: string, nextMarkdown: string) {
    setSelectedTemplate(templateId)
    setMarkdown(nextMarkdown)
    writeStorage(STORAGE_KEYS.selectedTemplate, templateId)
    setStatus('Template loaded.')
  }

  async function handleGenerate() {
    if (isGenerating) return

    if (!editor) {
      setStatus('Canvas is still loading.')
      return
    }

    if (!markdown.trim()) {
      setStatus('No content found.')
      return
    }

    setIsGenerating(true)
    setStatus('Generating board...')
    await waitForPaint()

    try {
      const parsed = parseTeachDrawMarkdown(markdown)
      if (parsed.frames.length === 0) {
        setStatus('No content found.')
        return
      }
      generateTeachDrawBoard(editor, parsed, options)
      setStatus('Board generated successfully.')
    } catch (error) {
      console.error(error)
      setStatus('Could not parse Markdown.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleClear() {
    if (!editor) return
    if (!window.confirm('Clear generated TeachDraw shapes from the board?')) return

    try {
      clearGeneratedShapes(editor)
      setStatus('Board cleared.')
    } catch (error) {
      console.error(error)
      setStatus('Could not clear board.')
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-slate-950 lg:h-screen lg:flex-row lg:overflow-hidden">
      <MarkdownEditorPanel
        markdown={markdown}
        selectedTemplate={selectedTemplate}
        document={document}
        status={status}
        options={options}
        isGenerating={isGenerating}
        onMarkdownChange={setMarkdown}
        onTemplateSelect={handleTemplateSelect}
        onOptionsChange={setOptions}
        onGenerate={handleGenerate}
        onClear={handleClear}
      />
      <TldrawCanvasPanel onMount={setEditor} />
    </main>
  )
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function normalizeStoredLayoutMode(value: string | null): GenerateTeachDrawOptions['layoutMode'] {
  if (value === 'frame-grid' || value === 'whiteboard-notes' || value === 'vertical-cards') return value
  if (value === 'grid') return 'frame-grid'
  if (value === 'vertical') return 'vertical-cards'
  return 'whiteboard-notes'
}
