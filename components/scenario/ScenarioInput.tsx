// components/scenario/ScenarioInput.tsx
'use client'
import type { UIStrings } from '@/lib/i18n'

interface ScenarioInputProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  disabled: boolean
  isRunning: boolean
  strings: UIStrings
}

export function ScenarioInput({ value, onChange, onRun, disabled, isRunning, strings }: ScenarioInputProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={strings.presetsLabel + '…'}
        rows={3}
        className="w-full rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-[#7c5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#12121c', border: '1px solid #1a1a28' }}
      />
      <button
        onClick={onRun}
        disabled={disabled || !value.trim()}
        className="w-full py-3 rounded-lg font-mono text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        style={{ background: disabled ? '#252535' : 'linear-gradient(135deg, #7c5cf6, #2563eb)' }}
      >
        {isRunning ? strings.running : strings.runButton}
      </button>
    </div>
  )
}
