// lib/parse.ts
import type { Sentiment } from './types'

export function parseSentiment(text: string): Sentiment {
  const upper = (text ?? '').toUpperCase()
  if (upper.includes('BULLISH')) return 'BULLISH'
  if (upper.includes('BEARISH')) return 'BEARISH'
  return 'NEUTRAL'
}

export function parseConfidence(text: string): number | null {
  const match = (text ?? '').match(/confidence:\s*([+-]?\d{1,3})%/i)
  if (!match) return null
  return Math.min(100, Math.max(0, parseInt(match[1], 10)))
}

export function parsePriceImpact(text: string): { low: number; high: number } | null {
  const match = (text ?? '').match(
    /price\s+impact:\s*([+-]?\d+(?:\.\d+)?)\s*%\s*to\s*([+-]?\d+(?:\.\d+)?)\s*%/i
  )
  if (!match) return null
  return { low: parseFloat(match[1]), high: parseFloat(match[2]) }
}
