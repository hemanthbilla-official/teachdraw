import type { FlowOrientation } from '@/lib/tldraw/generateTeachDrawBoard'

type Props = {
  value: FlowOrientation
  onChange: (value: FlowOrientation) => void
}

export function FlowOptions({ value, onChange }: Props) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span>
        <span className="block font-semibold text-slate-900">Flow direction</span>
        <span className="mt-0.5 block text-xs text-slate-500">Vertical Cards are always used.</span>
      </span>
      <select
        aria-label="Flow direction"
        className="min-w-32 rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 outline-none focus:border-slate-600"
        value={value}
        onChange={(event) => onChange(event.target.value as FlowOrientation)}
      >
        <option value="auto">Auto</option>
        <option value="vertical">Vertical</option>
        <option value="horizontal">Horizontal</option>
      </select>
    </label>
  )
}
