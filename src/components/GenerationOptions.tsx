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
          <option value="horizontal-cards">Horizontal Cards</option>
          <option value="vertical-cards">Vertical Cards</option>
        </select>
      </label>

      <label className="text-sm text-slate-700">
        <span className="mb-1 block font-medium">Spacing</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2"
          value={options.spacing}
          onChange={(event) => onChange({ ...options, spacing: event.target.value as GenerateTeachDrawOptions['spacing'] })}
        >
          <option value="spacious">Spacious</option>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
          <option value="extra-compact">Extra Compact</option>
          <option value="extreme-compact">Extreme Compact</option>
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
