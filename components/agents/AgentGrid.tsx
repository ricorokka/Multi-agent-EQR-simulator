// components/agents/AgentGrid.tsx
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { AgentCard } from './AgentCard'

interface AgentGridProps {
  responses: Partial<Record<AgentId, AgentResponse>>
  loading: Partial<Record<AgentId, boolean>>
  strings: UIStrings
  onRetry: (agentId: AgentId) => void
}

export function AgentGrid({ responses, loading, strings, onRetry }: AgentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {AGENTS.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          response={responses[agent.id]}
          isLoading={!!loading[agent.id]}
          strings={strings}
          onRetry={() => onRetry(agent.id)}
        />
      ))}
    </div>
  )
}
