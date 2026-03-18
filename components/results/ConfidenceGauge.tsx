// components/results/ConfidenceGauge.tsx
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'

interface ConfidenceGaugeProps {
  responses: Partial<Record<AgentId, AgentResponse>>
  lang: Lang
  strings: UIStrings
}

export function ConfidenceGauge({ responses, lang, strings }: ConfidenceGaugeProps) {
  const agentsWithData = AGENTS.filter(a => {
    const r = responses[a.id]
    return r && !r.error && r.confidence !== null
  })

  if (agentsWithData.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
        <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
          {strings.confidence}
        </h3>
        <p className="text-xs text-slate-600">{strings.noConfidenceData}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
      <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
        {strings.confidence}
      </h3>
      <div className="space-y-2.5">
        {agentsWithData.map(agent => {
          const confidence = responses[agent.id]!.confidence!
          return (
            <div key={agent.id} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-32 shrink-0 truncate">
                {agent.name[lang]}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[#1a1a28] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${confidence}%`, background: agent.color }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-500 w-8 text-right shrink-0">
                {confidence}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
