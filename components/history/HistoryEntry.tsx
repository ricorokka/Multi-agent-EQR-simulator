// components/history/HistoryEntry.tsx
import type { HistoryRun, Sentiment } from '@/lib/types'
import { AGENTS } from '@/lib/agents'

const DOT_COLORS: Record<Sentiment, string> = {
  BULLISH: '#22c55e',
  BEARISH: '#ef4444',
  NEUTRAL: '#475569',
}

interface HistoryEntryProps {
  run: HistoryRun
  onClick: () => void
}

export function HistoryEntry({ run, onClick }: HistoryEntryProps) {
  const date = new Date(run.timestamp)
  const formatted = date.toLocaleDateString(run.lang === 'fi' ? 'fi-FI' : 'en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 hover:bg-[#12121c] transition-colors"
      style={{ border: '1px solid #1a1a28' }}
    >
      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2">
        {run.scenario.length > 80 ? run.scenario.slice(0, 80) + '…' : run.scenario}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {AGENTS.map(agent => {
            const sentiment = run.responses[agent.id]?.sentiment ?? 'NEUTRAL'
            return (
              <span
                key={agent.id}
                title={agent.name.en}
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: DOT_COLORS[sentiment] }}
              />
            )
          })}
        </div>
        <span className="font-mono text-[10px] text-slate-600">{formatted}</span>
      </div>
    </button>
  )
}
