import type { GenerateTeachDrawOptions } from '@/lib/tldraw/generateTeachDrawBoard'

type Props = {
  options: GenerateTeachDrawOptions
  onChange: (options: GenerateTeachDrawOptions) => void
}

export function GenerationOptions({ options, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="text-sm text-slate-700">
        <span className="mb-1 block font-medium">Canvas Style</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2"
          value={options.layoutMode}
          onChange={(event) => onChange({ ...options, layoutMode: event.target.value as GenerateTeachDrawOptions['layoutMode'] })}
        >
          <option value="whiteboard-notes">Whiteboard Notes</option>
          <option value="frame-grid">Frame Grid</option>
          <option value="vertical-cards">Vertical Cards</option>
        </select>
      </label>

      <label className={`text-sm text-slate-700 ${options.layoutMode === 'frame-grid' ? '' : 'hidden sm:block sm:opacity-40'}`}>
        <span className="mb-1 block font-medium">Columns</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2"
          value={options.columns}
          disabled={options.layoutMode !== 'frame-grid'}
          onChange={(event) => onChange({ ...options, columns: Number(event.target.value) as 2 | 3 | 4 })}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>

      <label className="text-sm text-slate-700">
        <span className="mb-1 block font-medium">Flow</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2"
          value={options.flowOrientation}
          onChange={(event) =>
            onChange({ ...options, flowOrientation: event.target.value as GenerateTeachDrawOptions['flowOrientation'] })
          }
        >
          <option value="auto">Auto</option>
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </select>
      </label>
    </div>
  )
}
