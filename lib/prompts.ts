// lib/prompts.ts
import type { Agent, AgentId, AgentResponse, Lang, UploadedFile } from './types'
import { AGENTS } from './agents'
import { EQR_CONTEXT } from './context'

export function buildSystemPrompt(
  agent: Agent,
  lang: Lang,
  uploadedFile?: UploadedFile | null
): string {
  const parts: string[] = [
    agent.systemPrompt[lang],
    '',
    'BACKGROUND CONTEXT:',
    EQR_CONTEXT[lang],
  ]

  if (uploadedFile) {
    parts.push(
      '',
      `ADDITIONAL CONTEXT FROM ${uploadedFile.name}:`,
      uploadedFile.content
    )
  }

  parts.push(
    '',
    'RESPONSE FORMAT — you MUST end your response with exactly these two lines:',
    'Confidence: X%',
    'Price impact: -X% to +X%',
    '(Use negative numbers for bearish price impact, positive for bullish. Example: -15% to +5%)'
  )

  return parts.join('\n')
}

export function buildUserPrompt(scenario: string, lang: Lang): string {
  if (lang === 'fi') {
    return `SKENAARIO: ${scenario}\n\nAnalysoi tämä skenaario. Mitä se tarkoittaa EQ Resourcesille (ASX:EQR)?`
  }
  return `SCENARIO: ${scenario}\n\nAnalyze this scenario. What does it mean for EQ Resources (ASX:EQR)?`
}

export function buildSynthesisPrompt(
  responses: Partial<Record<AgentId, AgentResponse>>,
  lang: Lang
): { system: string; user: string } {
  const system =
    'You are a senior investment strategist. Synthesize the following multi-perspective analysis into a coherent investment report. Highlight where analysts agree, where they diverge, and your net assessment of the scenario\'s impact on EQ Resources (ASX:EQR).'

  const sections: string[] = []
  for (const agent of AGENTS) {
    const response = responses[agent.id]
    if (response && response.error === undefined) {
      sections.push(`[${agent.name[lang]}]\n${response.text}`)
    }
  }

  const user = sections.join('\n\n')
  return { system, user }
}
