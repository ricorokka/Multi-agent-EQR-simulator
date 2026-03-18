// components/scenario/PresetPicker.tsx
import type { Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { PRESETS } from '@/lib/presets'

interface PresetPickerProps {
  lang: Lang
  disabled: boolean
  onSelect: (value: string) => void
  strings: UIStrings
}

export function PresetPicker({ lang, disabled, onSelect, strings }: PresetPickerProps) {
  return (
    <div>
      <p className="font-mono text-[10px] text-slate-600 uppercase tracking-wider mb-2">
        {strings.presetsLabel}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS[lang].map(preset => (
          <button
            key={preset.value}
            onClick={() => onSelect(preset.value)}
            disabled={disabled}
            className="font-mono text-[10px] px-2.5 py-1 rounded-md border border-[#1a1a28] text-slate-400 hover:text-slate-200 hover:border-[#7c5cf6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0d0d14' }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
