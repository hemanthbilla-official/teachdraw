'use client'

import { useMemo, useState } from 'react'
import { type Editor } from 'tldraw'
import { analyzeTeachDrawDocument } from '@/lib/markdown/analyzeTeachDrawDocument'
import { parseTeachDrawMarkdown } from '@/lib/markdown/parseTeachDrawMarkdown'
import {
  clearGeneratedShapes,
  generateTeachDrawBoard,
  type GenerateTeachDrawOptions,
} from '@/lib/tldraw/generateTeachDrawBoard'
import { defaultOptions } from '@/lib/tldraw/generator/constants'
import { MarkdownEditorPanel } from './MarkdownEditorPanel'
import { TldrawCanvasPanel } from './TldrawCanvasPanel'

export function TeachDrawApp() {
  const [markdown, setMarkdown] = useState('')
  const [options, setOptions] = useState<GenerateTeachDrawOptions>(defaultOptions)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [status, setStatus] = useState('Ready.')
  const [isGenerating, setIsGenerating] = useState(false)

  const document = useMemo(() => parseTeachDrawMarkdown(markdown), [markdown])
  const analysis = useMemo(() => analyzeTeachDrawDocument(document, markdown), [document, markdown])

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
      await generateTeachDrawBoard(editor, parsed, options)
      const parsedAnalysis = analyzeTeachDrawDocument(parsed, markdown)
      const imageSummary = parsedAnalysis.imageBlockCount > 0 ? `, ${parsedAnalysis.imageBlockCount} images` : ''
      setStatus(`Board generated: ${parsedAnalysis.frameCount} frames, ${parsedAnalysis.codeBlockCount} code blocks${imageSummary}.`)
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
        document={document}
        analysis={analysis}
        status={status}
        options={options}
        isGenerating={isGenerating}
        onMarkdownChange={setMarkdown}
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

