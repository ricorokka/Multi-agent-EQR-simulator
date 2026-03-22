// lib/prompts.ts
import type { Agent, AgentId, AgentResponse, Lang, UploadedFile } from './types'
import type { MarketData } from './marketData'
import { AGENTS } from './agents'
import { EQR_COMPANY_DATA } from './companyData'

function buildMarketDataSection(data: MarketData, lang: Lang): string {
  const date = new Date(data.fetchedAt).toLocaleDateString(
    lang === 'fi' ? 'fi-FI' : 'en-AU',
    { day: 'numeric', month: 'short', year: 'numeric' }
  )
  const apt = data.aptPrice.toLocaleString('en-US')

  if (lang === 'fi') {
    return [
      `AJANKOHTAISET MARKKINATIEDOT (haettu ${date}${data.stale ? ', osittain arvioitu' : ''}):`,
      `- EQR:n kurssi: A$${data.sharePrice.toFixed(3)} (ASX:EQR)`,
      `- EQR:n markkina-arvo: A$${data.marketCap.toFixed(2)}mrd`,
      `- APT-wolframin hinta: $${apt}/mtu`,
      `- AUD/USD: ${data.audUsd.toFixed(4)}`,
      'Käytä näitä lukuja ensisijaisesti — ne korvaavat taustamateriaalissa mainitut arvot.',
    ].join('\n')
  }

  return [
    `CURRENT MARKET DATA (fetched ${date}${data.stale ? ', APT price estimated' : ''}):`,
    `- EQR share price: A$${data.sharePrice.toFixed(3)} (ASX:EQR)`,
    `- EQR market cap: A$${data.marketCap.toFixed(2)}B`,
    `- APT tungsten price: $${apt}/mtu`,
    `- AUD/USD: ${data.audUsd.toFixed(4)}`,
    'Use these figures as the primary source — they supersede any values in the background context.',
  ].join('\n')
}

export function buildSystemPrompt(
  agent: Agent,
  lang: Lang,
  uploadedFiles?: UploadedFile[],
  marketData?: MarketData | null
): string {
  const langInstruction = lang === 'fi' ? 'Vastaa suomeksi.' : 'Respond in English.'

  const parts: string[] = [
    langInstruction,
    '',
    '---',
    'MANDATORY OUTPUT FORMAT — your response MUST end with EXACTLY these two lines.',
    'The labels "Confidence" and "Price impact" are ALWAYS in English, even if you respond in Finnish.',
    'Replace the numbers with your actual assessment. Do not add any text after these two lines.',
    '',
    'Confidence: 72%',
    'Price impact: -15% to +5%',
    '',
    'Constraints: Confidence is 0–100. Price impact low is the bearish case, high is the bullish case.',
    'Both values in price impact must include a sign (+ or -). Example bearish: -30% to -10%',
    '---',
    '',
    agent.systemPrompt[lang],
  ]

  if (marketData && !isNaN(new Date(marketData.fetchedAt).getTime())) {
    parts.push('', buildMarketDataSection(marketData, lang))
  }

  parts.push('', 'COMPANY FUNDAMENTALS:', EQR_COMPANY_DATA)

  if (uploadedFiles && uploadedFiles.length > 0) {
    for (const file of uploadedFiles) {
      parts.push(
        '',
        `ADDITIONAL CONTEXT FROM ${file.name}:`,
        file.content
      )
    }
  }

  return parts.join('\n')
}

export function buildUserPrompt(scenario: string, lang: Lang): string {
  if (lang === 'fi') {
    return `SKENAARIO: ${scenario}\n\nAnalysoi tämä skenaario. Mitä se tarkoittaa EQ Resourcesille (ASX:EQR)?`
  }
  return `SCENARIO: ${scenario}\n\nAnalyze this scenario. What does it mean for EQ Resources (ASX:EQR)?`
}

export function buildDevilsAdvocatePrompt(
  synthesis: string,
  lang: Lang
): { system: string; user: string } {
  const system = lang === 'fi'
    ? 'Vastaa suomeksi. Olet skeptinen, kontraarinen analyytikko. Tehtäväsi on haastaa alla oleva synteesi. Etsi loogisia virheitä, huomiotta jätettyjä riskejä ja liiallista optimismia tai pessimismiä. Ole tarkka ja kriittinen.'
    : 'Respond in English. You are a skeptical, contrarian analyst. Your job is to challenge the synthesis below. Find logical flaws, overlooked risks, and overoptimism or overpessimism. Be sharp and direct.'

  const user = lang === 'fi'
    ? `SYNTEESI HAASTETTAVAKSI:\n\n${synthesis}\n\nHaasta tämä analyysi. Mitä se jättää huomiotta? Missä se on liian optimistinen tai pessimistinen? Mitkä ovat suurimmat riskit tai heikkoudet tässä näkemyksessä?`
    : `SYNTHESIS TO CHALLENGE:\n\n${synthesis}\n\nChallenge this analysis. What does it overlook? Where is it overoptimistic or overpessimistic? What are the biggest flaws or risks in this view?`

  return { system, user }
}

export function buildSynthesisPrompt(
  responses: Partial<Record<AgentId, AgentResponse>>,
  lang: Lang
): { system: string; user: string } {
  const system = lang === 'fi'
    ? 'Vastaa suomeksi. Olet senior-sijoitusstrategi. Syntetisoi seuraava moniperspektiivinen analyysi yhtenäiseksi sijoitusraportiksi suomen kielellä. Korosta missä analyytikot ovat samaa mieltä, missä he eroavat, ja anna kokonaisarviosi skenaarion vaikutuksesta EQ Resourcesiin (ASX:EQR).'
    : 'Respond in English. You are a senior investment strategist. Synthesize the following multi-perspective analysis into a coherent investment report. Highlight where analysts agree, where they diverge, and your net assessment of the scenario\'s impact on EQ Resources (ASX:EQR).'

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
