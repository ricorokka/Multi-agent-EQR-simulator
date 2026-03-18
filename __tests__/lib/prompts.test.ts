// __tests__/lib/prompts.test.ts
import { buildSystemPrompt, buildUserPrompt, buildSynthesisPrompt } from '@/lib/prompts'
import { AGENTS } from '@/lib/agents'
import type { AgentResponse } from '@/lib/types'

const institutional = AGENTS.find(a => a.id === 'institutional')!

describe('buildSystemPrompt', () => {
  it('contains agent persona', () => {
    const prompt = buildSystemPrompt(institutional, 'en')
    expect(prompt).toContain('institutional fund manager')
  })
  it('contains EQR context', () => {
    const prompt = buildSystemPrompt(institutional, 'en')
    expect(prompt).toContain('EQ Resources')
  })
  it('contains format instruction', () => {
    const prompt = buildSystemPrompt(institutional, 'en')
    expect(prompt).toContain('Confidence: X%')
    expect(prompt).toContain('Price impact:')
  })
  it('includes uploaded file content when provided', () => {
    const prompt = buildSystemPrompt(institutional, 'en', { name: 'report.pdf', content: 'Key data here' })
    expect(prompt).toContain('report.pdf')
    expect(prompt).toContain('Key data here')
  })
  it('excludes file section when no file provided', () => {
    const prompt = buildSystemPrompt(institutional, 'en')
    expect(prompt).not.toContain('ADDITIONAL CONTEXT FROM')
  })
  it('uses Finnish when lang is fi', () => {
    const prompt = buildSystemPrompt(institutional, 'fi')
    expect(prompt).toContain('eläkerahasto')
  })
})

describe('buildUserPrompt', () => {
  it('includes scenario text in EN', () => {
    const prompt = buildUserPrompt('APT surges to $4,000', 'en')
    expect(prompt).toContain('APT surges to $4,000')
    expect(prompt).toContain('SCENARIO:')
  })
  it('uses Finnish label when lang is fi', () => {
    const prompt = buildUserPrompt('APT nousee', 'fi')
    expect(prompt).toContain('SKENAARIO:')
  })
})

describe('buildSynthesisPrompt', () => {
  const mockResponses: Partial<Record<string, AgentResponse>> = {
    institutional: { text: 'Institutional view here', sentiment: 'NEUTRAL', confidence: 70, priceImpact: null },
    retail: { text: 'Retail view here', sentiment: 'BULLISH', confidence: 85, priceImpact: { low: 10, high: 40 } },
  }

  it('returns system and user strings', () => {
    const { system, user } = buildSynthesisPrompt(mockResponses as any, 'en')
    expect(system).toBeTruthy()
    expect(user).toBeTruthy()
  })
  it('includes agent names as labels in user prompt', () => {
    const { user } = buildSynthesisPrompt(mockResponses as any, 'en')
    expect(user).toContain('[Institutional Investor]')
    expect(user).toContain('[Retail Speculator]')
  })
  it('includes response text', () => {
    const { user } = buildSynthesisPrompt(mockResponses as any, 'en')
    expect(user).toContain('Institutional view here')
    expect(user).toContain('Retail view here')
  })
  it('excludes errored responses', () => {
    const withError = {
      ...mockResponses,
      short_seller: { text: 'Bear view', sentiment: 'BEARISH' as const, confidence: null, priceImpact: null, error: 'API failed' },
    }
    const { user } = buildSynthesisPrompt(withError as any, 'en')
    expect(user).not.toContain('Bear view')
  })
})
