// components/agents/AgentCard.tsx
'use client'
import { useState } from 'react'
import type { Agent, AgentResponse } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { SentimentBadge } from './SentimentBadge'

interface AgentCardProps {
  agent: Agent
  response?: AgentResponse
  isLoading: boolean
  strings: UIStrings
  onRetry: () => void
}

export function AgentCard({ agent, response, isLoading, strings, onRetry }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasError = !!response?.error
  const isDone = !!response && !isLoading && !hasError

  const borderColor = hasError ? '#ef4444' : agent.color

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: '#0d0d14',
        border: `1px solid #1a1a28`,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 select-none"
        style={{ cursor: isDone ? 'pointer' : 'default' }}
        onClick={() => isDone && setExpanded(e => !e)}
      >
        <span className="text-xl" style={{ filter: isLoading ? 'saturate(0.3)' : 'none' }}>
          {agent.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold" style={{ color: agent.color }}>
              {agent.name.en}
            </span>
            {isDone && <SentimentBadge sentiment={response.sentiment} />}
            {isDone && response.confidence !== null && (
              <span className="font-mono text-[10px] text-slate-500">
                {response.confidence}%
              </span>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot inline-block"
                style={{ background: agent.color }}
              />
              <span className="font-mono text-[10px] text-slate-600">{strings.analyzing}</span>
            </div>
          )}
          {hasError && (
            <p className="text-[11px] text-red-400 mt-1 truncate">{response.error}</p>
          )}
        </div>
        {isDone && (
          <span className="text-slate-700 text-sm transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        )}
        {hasError && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry() }}
            className="font-mono text-[10px] px-2 py-1 rounded border border-red-900 text-red-400 hover:bg-red-950 transition-colors"
          >
            {strings.retryAgent}
          </button>
        )}
      </div>

      {/* Collapsed preview */}
      {isDone && !expanded && (
        <div className="px-4 pb-3 pl-12 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {response.text}
        </div>
      )}

      {/* Expanded full text */}
      {isDone && expanded && (
        <div className="px-4 pb-4 pl-12 border-t border-[#1a1a28]">
          <p className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap mt-3">
            {response.text}
          </p>
        </div>
      )}
    </div>
  )
}
