// components/results/SynthesisPanel.tsx
'use client'
import ReactMarkdown from 'react-markdown'
import type { Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'

interface SynthesisPanelProps {
  synthesis: string | null
  synthesisError: string | null
  isSynthesizing: boolean
  synthesisLang: Lang | null
  currentLang: Lang
  strings: UIStrings
  onRetry?: () => void
}

export function SynthesisPanel({
  synthesis,
  synthesisError,
  isSynthesizing,
  synthesisLang,
  currentLang,
  strings,
  onRetry,
}: SynthesisPanelProps) {
  const langMismatch = synthesisLang !== null && synthesisLang !== currentLang

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
        <div className="flex items-center gap-3">
          <p className="text-sm text-red-400 flex-1">{strings.synthesisError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-950 transition-colors shrink-0"
            >
              {strings.retrySynthesis}
            </button>
          )}
        </div>
      )}
      {synthesis && !isSynthesizing && (
        <>
          {langMismatch && (
            <p className="font-mono text-[10px] text-amber-600 mb-3">
              {strings.synthesisLangNote}
            </p>
          )}
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed text-[13px]">
            <ReactMarkdown>{synthesis}</ReactMarkdown>
          </div>
        </>
      )}
    </div>
  )
}
