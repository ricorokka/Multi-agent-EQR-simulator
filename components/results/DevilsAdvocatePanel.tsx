// components/results/DevilsAdvocatePanel.tsx
import type { Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'

interface DevilsAdvocatePanelProps {
  devilsAdvocate: string | null
  devilsAdvocateError: string | null
  isDevilingAdvocating: boolean
  synthesisLang: Lang | null
  currentLang: Lang
  strings: UIStrings
  onTrigger: () => void
  disabled: boolean
}

export function DevilsAdvocatePanel({
  devilsAdvocate,
  devilsAdvocateError,
  isDevilingAdvocating,
  synthesisLang,
  currentLang,
  strings,
  onTrigger,
  disabled,
}: DevilsAdvocatePanelProps) {
  const langMismatch = synthesisLang !== null && synthesisLang !== currentLang

  if (!devilsAdvocate && !isDevilingAdvocating && !devilsAdvocateError) {
    return (
      <button
        onClick={onTrigger}
        disabled={disabled}
        className="w-full py-2.5 rounded-lg font-mono text-xs text-red-400 border border-red-900/50 hover:bg-red-950/30 hover:border-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'rgba(239,68,68,0.03)' }}
      >
        ☠️ Devil&apos;s Advocate
      </button>
    )
  }

  return (
    <div className="rounded-xl p-5" style={{ background: '#0d0814', border: '1px solid rgba(239,68,68,0.3)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">☠️</span>
        <h3 className="font-mono text-xs text-red-400 uppercase tracking-wider">Devil&apos;s Advocate</h3>
      </div>
      {isDevilingAdvocating && (
        <div className="flex items-center gap-2 text-xs text-red-400/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot inline-block" />
          Challenging the consensus…
        </div>
      )}
      {devilsAdvocateError && !isDevilingAdvocating && (
        <p className="text-sm text-red-400">{devilsAdvocateError}</p>
      )}
      {devilsAdvocate && !isDevilingAdvocating && (
        <>
          {langMismatch && (
            <p className="font-mono text-[10px] text-amber-600 mb-3">
              {strings.synthesisLangNote}
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-red-100/80 whitespace-pre-wrap">
            {devilsAdvocate}
          </p>
        </>
      )}
    </div>
  )
}
