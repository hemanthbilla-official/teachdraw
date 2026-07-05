import type { TeachDrawDocument } from '@/types/teachdraw'
import type { TeachDrawBoardAnalysis } from '@/lib/markdown/analyzeTeachDrawDocument'

type Props = {
  document: TeachDrawDocument
  analysis: TeachDrawBoardAnalysis
}

export function ParserModeBadge({ document, analysis }: Props) {
  const visibleWarnings = analysis.warnings.slice(0, 2)
  const imageSummary = analysis.imageBlockCount > 0 ? ` · ${analysis.imageBlockCount} images` : ''

  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Detected: {document.mode === 'frame-based' ? 'Frame-based tldraw content' : 'Simple lesson content'}</span>
        <span className="font-medium text-slate-900">
          {analysis.frameCount} frames · {analysis.blockCount} blocks · {analysis.codeBlockCount} code{imageSummary}
        </span>
      </div>

      {visibleWarnings.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
          {visibleWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          {analysis.warningCount > visibleWarnings.length ? <li>{analysis.warningCount - visibleWarnings.length} more issue(s).</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
