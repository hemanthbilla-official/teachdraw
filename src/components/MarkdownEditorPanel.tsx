import type { TeachDrawDocument } from '@/types/teachdraw'
import type { TeachDrawBoardAnalysis } from '@/lib/markdown/analyzeTeachDrawDocument'
import type { FlowOrientation } from '@/lib/tldraw/generateTeachDrawBoard'
import { FlowOptions } from './FlowOptions'
import { ParserModeBadge } from './ParserModeBadge'

type Props = {
  markdown: string
  document: TeachDrawDocument
  analysis: TeachDrawBoardAnalysis
  status: string
  flowOrientation: FlowOrientation
  isGenerating: boolean
  onMarkdownChange: (markdown: string) => void
  onFlowOrientationChange: (value: FlowOrientation) => void
  onGenerate: () => void | Promise<void>
  onClear: () => void
  onDownload: () => void | Promise<void>
}

export function MarkdownEditorPanel({
  markdown,
  document,
  analysis,
  status,
  flowOrientation,
  isGenerating,
  onMarkdownChange,
  onFlowOrientationChange,
  onGenerate,
  onClear,
  onDownload,
}: Props) {
  return (
    <aside className="flex min-h-screen w-full flex-col gap-4 overflow-auto border-slate-200 bg-white p-4 lg:h-screen lg:w-[40%] lg:border-r">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">TeachDraw</h1>
        <p className="mt-1 text-sm text-slate-600">Markdown to editable tldraw board</p>
      </div>

      <ParserModeBadge document={document} analysis={analysis} />
      <FlowOptions value={flowOrientation} onChange={onFlowOrientationChange} />

      <textarea
        aria-label="Lesson Markdown source"
        className="min-h-[380px] flex-1 resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-900 outline-none focus:border-slate-700 focus:bg-white"
        value={markdown}
        onChange={(event) => onMarkdownChange(event.target.value)}
        spellCheck={false}
        placeholder="Paste teaching Markdown here..."
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            void onGenerate()
          }
        }}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-500"
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
              Generating...
            </>
          ) : (
            'Generate Board'
          )}
        </button>
        <button
          aria-label="Remove generated cards"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
          type="button"
          onClick={onClear}
        >
          Clear Board
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800" type="button" onClick={onDownload}>
          Download Board
        </button>
      </div>

      <div className="min-h-6 text-sm text-slate-700" role="status" aria-live="polite">{status}</div>
    </aside>
  )
}
