'use client'

import { useMemo, useState } from 'react'
import { type Editor } from 'tldraw'
import { parseTeachDrawMarkdown } from '@/lib/markdown/parseTeachDrawMarkdown'
import {
  clearGeneratedShapes,
  generateTeachDrawBoard,
  type GenerateTeachDrawOptions,
} from '@/lib/tldraw/generateTeachDrawBoard'
import { MarkdownEditorPanel } from './MarkdownEditorPanel'
import { TldrawCanvasPanel } from './TldrawCanvasPanel'

const defaultOptions: GenerateTeachDrawOptions = {
  layoutMode: 'vertical-cards',
  columns: 3,
  flowOrientation: 'auto',
  spacing: 'comfortable',
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

  function handleTemplateSelect(templateId: string, nextMarkdown: string) {
    setSelectedTemplate(templateId)
    setMarkdown(nextMarkdown)
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

