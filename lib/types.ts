// lib/types.ts

export type AgentId =
  | 'institutional'
  | 'retail'
  | 'short_seller'
  | 'analyst'
  | 'defense'
  | 'management'
  | 'macro'

export const AGENT_IDS: AgentId[] = [
  'institutional', 'retail', 'short_seller',
  'analyst', 'defense', 'management', 'macro',
]

export type Lang = 'en' | 'fi'
export type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL'
export type RunStatus = 'idle' | 'running' | 'done' | 'error'

export interface Agent {
  id: AgentId
  name: Record<Lang, string>
  icon: string
  color: string
  systemPrompt: Record<Lang, string>
}

export interface AgentResponse {
  text: string
  sentiment: Sentiment
  confidence: number | null
  priceImpact: { low: number; high: number } | null
  error?: string
}

export interface HistoryRun {
  schemaVersion: 1
  id: string
  timestamp: number
  scenario: string
  lang: Lang
  responses: Record<AgentId, AgentResponse>
  synthesis: string | null
}

export interface UploadedFile {
  name: string
  content: string
}
