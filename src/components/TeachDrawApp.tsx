'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { type Editor } from 'tldraw'
import { analyzeTeachDrawDocument } from '@/lib/markdown/analyzeTeachDrawDocument'
import { parseTeachDrawMarkdown } from '@/lib/markdown/parseTeachDrawMarkdown'
import {
  clearGeneratedShapes,
  generateTeachDrawBoard,
  type FlowOrientation,
} from '@/lib/tldraw/generateTeachDrawBoard'
import { defaultOptions } from '@/lib/tldraw/generator/constants'
import { exportTldr } from '@/lib/tldraw/exportTldr'
import {
  createWorkspaceDraft,
  readWorkspaceDraft,
  WORKSPACE_DRAFT_DEBOUNCE_MS,
  writeWorkspaceDraft,
} from '@/lib/workspace/workspaceDraft'
import { MarkdownEditorPanel } from './MarkdownEditorPanel'
import { TldrawCanvasPanel } from './TldrawCanvasPanel'

export function TeachDrawApp() {
  const [markdown, setMarkdown] = useState('')
  const [flowOrientation, setFlowOrientation] = useState<FlowOrientation>(defaultOptions.flowOrientation)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [status, setStatus] = useState('Ready.')
  const [isGenerating, setIsGenerating] = useState(false)
  const draftReady = useRef(false)

  const document = useMemo(() => parseTeachDrawMarkdown(markdown), [markdown])
  const analysis = useMemo(() => analyzeTeachDrawDocument(document, markdown), [document, markdown])

  useEffect(() => {
    const saved = readWorkspaceDraft()
    if (saved.status === 'loaded') setMarkdown(saved.draft.markdown)
    draftReady.current = true
  }, [])

  useEffect(() => {
    if (!draftReady.current) return
    const timeout = window.setTimeout(() => {
      writeWorkspaceDraft(createWorkspaceDraft(markdown))
    }, WORKSPACE_DRAFT_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [markdown])

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
      await generateTeachDrawBoard(editor, parsed, { flowOrientation })
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

  async function handleDownload() {
    if (!editor) {
      setStatus('Canvas is still loading.')
      return
    }

    try {
      await exportTldr(editor, document.boardTitle || document.rawTitle)
      setStatus('Board downloaded.')
    } catch (error) {
      console.error(error)
      setStatus('Could not download board.')
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-slate-950 lg:h-screen lg:flex-row lg:overflow-hidden">
      <MarkdownEditorPanel
        markdown={markdown}
        document={document}
        analysis={analysis}
        status={status}
        flowOrientation={flowOrientation}
        isGenerating={isGenerating}
        onMarkdownChange={setMarkdown}
        onFlowOrientationChange={setFlowOrientation}
        onGenerate={handleGenerate}
        onClear={handleClear}
        onDownload={handleDownload}
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
