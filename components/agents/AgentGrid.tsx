// components/agents/AgentGrid.tsx
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { AgentCard } from './AgentCard'

interface AgentGridProps {
  responses: Partial<Record<AgentId, AgentResponse>>
  loading: Partial<Record<AgentId, boolean>>
  lang: Lang
  strings: UIStrings
  onRetry: (agentId: AgentId) => void
}

export function AgentGrid({ responses, loading, lang, strings, onRetry }: AgentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {AGENTS.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          response={responses[agent.id]}
          isLoading={!!loading[agent.id]}
          lang={lang}
          strings={strings}
          onRetry={() => onRetry(agent.id)}
        />
      ))}
    </div>
  )
}
