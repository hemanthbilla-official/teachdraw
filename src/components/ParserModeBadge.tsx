import type { TeachDrawDocument } from '@/types/teachdraw'

export function ParserModeBadge({ document }: { document: TeachDrawDocument }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      Detected: {document.mode === 'frame-based' ? 'Frame-based tldraw content' : 'Simple lesson content'}
    </div>
  )
}
