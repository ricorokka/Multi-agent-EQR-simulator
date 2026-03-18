// components/results/SynthesisPanel.tsx
import type { UIStrings } from '@/lib/i18n'

interface SynthesisPanelProps {
  synthesis: string | null
  synthesisError: string | null
  isSynthesizing: boolean
  strings: UIStrings
}

export function SynthesisPanel({ synthesis, synthesisError, isSynthesizing, strings }: SynthesisPanelProps) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
      <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-4">
        {strings.synthesisTitle}
      </h3>
      {isSynthesizing && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cf6] animate-pulse-dot inline-block" />
          {strings.synthesizing}
        </div>
      )}
      {synthesisError && !isSynthesizing && (
        <p className="text-sm text-red-400">{strings.synthesisError}</p>
      )}
      {synthesis && !isSynthesizing && (
        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap text-[13px]">
          {synthesis}
        </div>
      )}
    </div>
  )
}
