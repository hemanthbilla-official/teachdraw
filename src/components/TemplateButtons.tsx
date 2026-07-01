import { teachDrawTemplates } from '@/lib/templates'

type Props = {
  selectedTemplate: string
  onSelect: (templateId: string, markdown: string) => void
}

export function TemplateButtons({ selectedTemplate, onSelect }: Props) {
  if (teachDrawTemplates.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2">
      {teachDrawTemplates.map((template) => (
        <button
          key={template.id}
          type="button"
          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
            selectedTemplate === template.id
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
          }`}
          onClick={() => onSelect(template.id, template.markdown)}
        >
          {template.name}
        </button>
      ))}
    </div>
  )
}
