// components/agents/SentimentBadge.tsx
import type { Sentiment } from '@/lib/types'

const CONFIG: Record<Sentiment, { label: string; color: string; bg: string }> = {
  BULLISH: { label: 'BULLISH', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  BEARISH: { label: 'BEARISH', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  NEUTRAL: { label: 'NEUTRAL', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}

interface SentimentBadgeProps {
  sentiment: Sentiment
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const { label, color, bg } = CONFIG[sentiment]
  return (
    <span
      className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  )
}
