# EQR Scenario Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional multi-agent investment scenario simulator for EQ Resources (ASX:EQR) as a fresh Next.js 15 app in `/Users/ricorokka/eqr-simulator`.

**Architecture:** Seven AI agents with distinct personas call the Anthropic API in batches of [3,2,2] and reveal results progressively. A Zustand store holds all run state. Pure parsing functions extract structured data from responses. History persists to localStorage.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, Recharts, pdfjs-dist, nanoid, Anthropic claude-sonnet-4-6.

**Spec:** `docs/superpowers/specs/2026-03-18-eqr-simulator-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `app/layout.tsx` | Root HTML shell, fonts, metadata |
| `app/page.tsx` | Dashboard orchestrator — renders panels, reads store |
| `app/globals.css` | Tailwind base + shadcn CSS vars (dark theme) |
| `app/api/claude/route.ts` | Anthropic proxy with backoff |
| `lib/types.ts` | All shared TypeScript types |
| `lib/agents.ts` | Agent definitions (id, name, icon, color, prompts EN/FI) |
| `lib/context.ts` | EQR background context strings (EN/FI) |
| `lib/presets.ts` | 7 preset scenarios (EN/FI) |
| `lib/i18n.ts` | UI string dictionary, `t(lang)` helper |
| `lib/parse.ts` | `parseSentiment`, `parseConfidence`, `parsePriceImpact` |
| `lib/prompts.ts` | `buildSystemPrompt`, `buildUserPrompt`, `buildSynthesisPrompt` |
| `store/simulatorStore.ts` | Zustand store — all run state + actions |
| `hooks/useHistory.ts` | localStorage read/write for HistoryRun[] |
| `hooks/useSimulator.ts` | Run orchestration: batching, AbortController, retry logic |
| `components/ui/` | shadcn primitives (installed via CLI) |
| `components/agents/SentimentBadge.tsx` | BULLISH/BEARISH/NEUTRAL colored chip |
| `components/agents/AgentCard.tsx` | Collapsible card: idle/loading/done/error states |
| `components/agents/AgentGrid.tsx` | 2-col responsive grid of AgentCards |
| `components/scenario/ScenarioInput.tsx` | Textarea + Run button |
| `components/scenario/PresetPicker.tsx` | 7 preset scenario buttons |
| `components/scenario/FileUpload.tsx` | PDF upload + pdfjs-dist extraction |
| `components/results/ConfidenceGauge.tsx` | shadcn Progress bars per agent |
| `components/results/PriceImpactChart.tsx` | Recharts horizontal BarChart |
| `components/results/SynthesisPanel.tsx` | Synthesis report, markdown rendered |
| `components/history/HistoryEntry.tsx` | Single run card with sentiment dots |
| `components/history/HistoryDrawer.tsx` | shadcn Sheet listing history, replay trigger |
| `__tests__/lib/parse.test.ts` | Unit tests for all parse functions |
| `__tests__/lib/prompts.test.ts` | Unit tests for prompt builders |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.local`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/ricorokka/eqr-simulator
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted, accept all defaults. This populates `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/`.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install zustand nanoid recharts pdfjs-dist
npm install @anthropic-ai/sdk
npm install @tailwindcss/typography
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```
When prompted: style=Default, base color=Slate, CSS variables=yes. This creates `components/ui/` and updates `globals.css` and `tailwind.config`.

- [ ] **Step 4: Install required shadcn components**

```bash
npx shadcn@latest add button card badge sheet progress textarea separator
```

- [ ] **Step 5: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
EOF
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p app/api/claude
mkdir -p components/{ui,scenario,agents,results,history}
mkdir -p hooks lib store __tests__/lib
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: server starts on http://localhost:3000 with default Next.js page.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with shadcn/ui, Zustand, Recharts"
```

---

## Task 2: Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Static Data (agents, context, presets, i18n)

**Files:**
- Create: `lib/agents.ts`, `lib/context.ts`, `lib/presets.ts`, `lib/i18n.ts`

- [ ] **Step 1: Write `lib/context.ts`**

```typescript
// lib/context.ts
import type { Lang } from './types'

export const EQR_CONTEXT: Record<Lang, string> = {
  en: `EQ Resources (ASX:EQR) is an Australian tungsten producer operating two mines: Mt Carbine (Queensland, Australia) and Barruecopardo (Spain). Market cap: A$1.75B (share price A$0.36, ~4.88B shares on issue). APT price: ~$2,500/mtu currently (was $1,320/mtu at Dec 2025; +300% from Feb 2025 lows). H1 FY2026 production: 67,126 mtu (Mt Carbine: 10,493 mtu; Barruecopardo: 56,633 mtu). Targeted production: >3,350 tpa (Mt Carbine >175,000 mtu/yr; Barruecopardo >160,000 mtu/yr). CEO: Craig Bradshaw (appointed 1 Oct 2025, previously Non-Executive Director). Financing resolved: A$56.5M raised, Traxys €15M prepayment facility (3yr), Oaktree loan converting to equity. Achieved positive operating cashflow Q2 FY2026: A$1.15M group level. Iolanthe Vein (high-grade, Mt Carbine) targeted for access Q3 FY2026 (~650,000t waste remaining). 5-year Traxys offtake: ~A$678M value at current spot prices. ASX All Ordinaries index inclusion effective 23 March 2026. Key competitor: Almonty Industries (higher market cap, not yet producing). China controls ~80% of global tungsten supply + has implemented export restrictions. US Project Vault: strategic tungsten stockpiling initiative.`,
  fi: `EQ Resources (ASX:EQR) on australialainen wolframin tuottaja, jolla on kaksi kaivosta: Mt Carbine (Queensland, Australia) ja Barruecopardo (Espanja). Markkina-arvo: A$1,75mrd (kurssi A$0,36, ~4,88mrd osaketta). APT-hinta: ~2 500 $/mtu tällä hetkellä (oli 1 320 $/mtu joulukuussa 2025; +300% helmikuun 2025 pohjista). H1 FY2026 tuotanto: 67 126 mtu (Mt Carbine: 10 493 mtu; Barruecopardo: 56 633 mtu). Tuotantotavoite: >3 350 tpa (Mt Carbine >175 000 mtu/v; Barruecopardo >160 000 mtu/v). TJ: Craig Bradshaw (nimitetty 1.10.2025, aiemmin hallituksen jäsen). Rahoitus ratkaistu: A$56,5M kerätty, Traxys €15M ennakkomaksujärjestely (3v), Oaktree-laina muuttuu osakkeiksi. Positiivinen liiketoiminnan kassavirta saavutettu Q2 FY2026: A$1,15M konsernitasolla. Iolanthe Vein (korkealaatuinen, Mt Carbine) tavoitteena avata Q3 FY2026 (~650 000t sivukiveä jäljellä). 5 vuoden Traxys-myyntisopimus: ~A$678M arvo nykyisillä spottihinnoilla. ASX All Ordinaries -indeksiin liittyminen voimaan 23.3.2026. Pääkilpailija: Almonty Industries (korkeampi markkina-arvo, ei vielä tuotannossa). Kiina hallitsee ~80% maailman wolframtarjonnasta + on asettanut vientirajoituksia. US Project Vault: strateginen wolframin varastointiohjelma.`,
}
```

- [ ] **Step 2: Write `lib/presets.ts`**

```typescript
// lib/presets.ts
import type { Lang } from './types'

export interface Preset {
  label: string
  value: string
}

export const PRESETS: Record<Lang, Preset[]> = {
  en: [
    { label: 'China lifts restrictions', value: 'China lifts all tungsten export restrictions. APT could drop significantly from current $2,500/mtu.' },
    { label: 'APT → $4,000', value: 'APT surges to $4,000/mtu due to further geopolitical escalation and supply tightness.' },
    { label: 'Almonty delays', value: 'Almonty announces 18+ month delays at Sangdong mine, removing key future supply.' },
    { label: 'Iolanthe delayed', value: 'EQR delays Iolanthe Vein access by 12+ months due to unexpected ground conditions.' },
    { label: 'Project Vault $5B', value: 'US Project Vault: government commits $5B to tungsten strategic stockpiling, preferring non-Chinese sources.' },
    { label: 'Full run-rate early', value: 'EQR achieves full targeted production run-rate of >3,350 tpa ahead of schedule.' },
    { label: 'Financial crisis', value: 'Financial crisis: equities -40%, liquidity evaporates, correlations go to 1.' },
  ],
  fi: [
    { label: 'Kiina vapauttaa', value: 'Kiina vapauttaa kaikki wolframin vientirajoitukset. APT voi laskea merkittävästi nykyisestä 2 500 $/mtu:sta.' },
    { label: 'APT → $4 000', value: 'APT nousee 4 000 $/mtu:hun geopoliittisten jännitteiden ja tarjonnan kiristymisen vuoksi.' },
    { label: 'Almonty viivästyy', value: 'Almonty ilmoittaa yli 18 kk viivästyksistä Sangdongin kaivoksella, poistaen merkittävää tulevaa tarjontaa.' },
    { label: 'Iolanthe viivästyy', value: 'EQR viivästyttää Iolanthe Vein -suonet avaamista yli 12 kk odottamattomien maasto-olosuhteiden vuoksi.' },
    { label: 'Project Vault $5mrd', value: 'US Project Vault: hallitus sitoutuu $5mrd wolframin strategiseen varastointiin, suosien ei-kiinalaisia lähteitä.' },
    { label: 'Täysi kapasiteetti etuajassa', value: 'EQR saavuttaa täyden tuotantotavoitteen >3 350 tpa etuajassa.' },
    { label: 'Finanssikriisi', value: 'Finanssikriisi: osakkeet -40%, likviditeetti katoaa, korrelaatiot menevät yhteen.' },
  ],
}
```

- [ ] **Step 3: Write `lib/i18n.ts`**

```typescript
// lib/i18n.ts
import type { Lang } from './types'

const UI = {
  en: {
    appTitle: 'EQR Scenario Simulator',
    appSubtitle: 'EQ Resources (ASX:EQR)',
    runButton: 'Run Analysis',
    running: 'Running…',
    analyzing: 'Analyzing…',
    synthesizing: 'Synthesizing…',
    synthesisTitle: 'Synthesis Report',
    synthesisError: 'Synthesis failed. Agent responses are still available above.',
    history: 'History',
    historyEmpty: 'No previous runs.',
    historyReplayBanner: 'Viewing historical run — read only',
    backToLive: 'Back to live view',
    uploadPrompt: 'Upload PDF context',
    uploadHint: 'Drag & drop or click to select (max 10 MB)',
    uploadSuccess: (name: string, chars: number, truncated: boolean) =>
      truncated ? `Context loaded: ${name} (8,000 chars, truncated)` : `Context loaded: ${name} (${chars} chars)`,
    uploadErrorSize: 'File exceeds 10 MB limit.',
    uploadErrorText: 'Could not extract text from this PDF. Only text-layer PDFs are supported.',
    removeFile: 'Remove',
    langToggle: 'FI',
    confidence: 'Confidence',
    priceImpact: 'Price Impact',
    priceImpactAxis: 'Price Impact (%)',
    retryAgent: 'Retry',
    retryAll: 'Retry All',
    allAgentsFailed: 'All agents failed to respond. Check your API key and try again.',
    presetsLabel: 'Quick scenarios',
    expandAnalysis: 'Show full analysis',
    collapseAnalysis: 'Collapse',
    noImpactData: 'No price impact data available.',
    noConfidenceData: 'No confidence scores available.',
  },
  fi: {
    appTitle: 'EQR Skenaariosimulaattori',
    appSubtitle: 'EQ Resources (ASX:EQR)',
    runButton: 'Aja analyysi',
    running: 'Käynnissä…',
    analyzing: 'Analysoi…',
    synthesizing: 'Syntetisoi…',
    synthesisTitle: 'Synteesiraportti',
    synthesisError: 'Synteesi epäonnistui. Agenttien vastaukset ovat saatavilla yllä.',
    history: 'Historia',
    historyEmpty: 'Ei aiempia ajoja.',
    historyReplayBanner: 'Tarkastellaan historiallista ajoa — vain luku',
    backToLive: 'Takaisin live-näkymään',
    uploadPrompt: 'Lataa PDF-konteksti',
    uploadHint: 'Vedä & pudota tai napsauta (enintään 10 Mt)',
    uploadSuccess: (name: string, chars: number, truncated: boolean) =>
      truncated ? `Konteksti ladattu: ${name} (8 000 merkkiä, katkaistu)` : `Konteksti ladattu: ${name} (${chars} merkkiä)`,
    uploadErrorSize: 'Tiedosto ylittää 10 Mt rajan.',
    uploadErrorText: 'PDF:stä ei voitu poimia tekstiä. Vain tekstikerrokselliset PDF:t ovat tuettuja.',
    removeFile: 'Poista',
    langToggle: 'EN',
    confidence: 'Luottamus',
    priceImpact: 'Hintavaikutus',
    priceImpactAxis: 'Hintavaikutus (%)',
    retryAgent: 'Yritä uudelleen',
    retryAll: 'Yritä kaikkia uudelleen',
    allAgentsFailed: 'Kaikki agentit epäonnistuivat. Tarkista API-avaimesi ja yritä uudelleen.',
    presetsLabel: 'Pikaskenaariot',
    expandAnalysis: 'Näytä koko analyysi',
    collapseAnalysis: 'Tiivistä',
    noImpactData: 'Ei hintavaikutustietoja saatavilla.',
    noConfidenceData: 'Ei luottamusarvoja saatavilla.',
  },
} as const

export type UIStrings = typeof UI.en
export const t = (lang: Lang): UIStrings => UI[lang]
```

- [ ] **Step 4: Write `lib/agents.ts`**

```typescript
// lib/agents.ts
import type { Agent, Lang } from './types'

export const AGENTS: Agent[] = [
  {
    id: 'institutional',
    name: { en: 'Institutional Investor', fi: 'Institutionaalinen sijoittaja' },
    icon: '🏦',
    color: '#2563eb',
    systemPrompt: {
      en: 'You are a conservative institutional fund manager (pension fund). Focus on risk-adjusted returns, liquidity, EV/EBITDA multiples, DCF valuation. Skeptical but data-driven. Always assess downside scenarios.',
      fi: 'Olet konservatiivinen institutionaalinen salkunhoitaja (eläkerahasto). Keskityt riskikorjattuihin tuottoihin, likviditeettiin, EV/EBITDA-kertoimiin, DCF-arvostukseen. Skeptinen mutta datapohjainen. Arvioi aina negatiiviset skenaariot.',
    },
  },
  {
    id: 'retail',
    name: { en: 'Retail Speculator', fi: 'Retail-spekulantti' },
    icon: '🎰',
    color: '#f59e0b',
    systemPrompt: {
      en: 'You are an aggressive retail investor. Focus on narrative momentum, supercycle thesis, and multi-bagger potential. Lean toward upside scenarios and growth catalysts.',
      fi: 'Olet aggressiivinen retail-sijoittaja. Keskityt narratiivin momentumiin, supersykliteesiin ja moninkertaistumispotentiaaliin. Painota nousuodotuksia ja kasvukatalysaattoreita.',
    },
  },
  {
    id: 'short_seller',
    name: { en: 'Short Seller', fi: 'Lyhyeksimyyjä' },
    icon: '🐻',
    color: '#ef4444',
    systemPrompt: {
      en: 'You are a forensic short seller. Focus on dilution risk, execution risk, balance sheet weaknesses, and red flags. Look for what the bulls are missing.',
      fi: 'Olet forensinen lyhyeksimyyjä. Keskityt laimennusriskiin, toteutusriskiin, taseen heikkouksiin ja punaisiin lippuihin. Etsi mitä härkäsijoittajat jättävät huomiotta.',
    },
  },
  {
    id: 'analyst',
    name: { en: 'Industry Analyst', fi: 'Toimiala-analyytikko' },
    icon: '📊',
    color: '#8b5cf6',
    systemPrompt: {
      en: 'You are a senior mining analyst covering critical minerals. You have deep knowledge of tungsten supply/demand dynamics, China export policy, and comparable companies (Almonty Industries, Wolf Minerals).',
      fi: 'Olet vanhempi kaivosanalyytikko, joka kattaa kriittiset mineraalit. Sinulla on syvä tuntemus wolframin kysyntä/tarjontadynamiikasta, Kiinan vientipolitiikasta ja vertailuyhtiöistä (Almonty Industries, Wolf Minerals).',
    },
  },
  {
    id: 'defense',
    name: { en: 'Defense Procurement', fi: 'Puolustushankinta' },
    icon: '🛡️',
    color: '#059669',
    systemPrompt: {
      en: 'You are a defense procurement strategist. You care about supply chain security and strategic stockpiling, not stock price. National security implications of non-Chinese tungsten supply are your primary concern.',
      fi: 'Olet puolustushankintojen strategi. Välität toimitusketjun turvallisuudesta ja strategisesta varastoinnista, et osakekurssista. Ei-kiinalaisen wolframtarjonnan kansalliset turvallisuusvaikutukset ovat ensisijainen huolesi.',
    },
  },
  {
    id: 'management',
    name: { en: 'EQR Management', fi: 'EQR:n johto' },
    icon: '⛏️',
    color: '#d97706',
    systemPrompt: {
      en: 'You represent EQR CEO Craig Bradshaw (appointed 1 Oct 2025). You are bullish but operationally grounded. Key metrics: market cap A$1.75B; APT ~$2,500/mtu currently (up +300% from Feb 2025). H1 FY2026 production 67,126 mtu. Targeted run-rate: >3,350 tpa. Iolanthe Vein (high-grade) access targeted Q3 FY2026. Traxys 5yr offtake ~A$678M at spot. Positive operating cashflow achieved Q2 FY2026. Financing fully resolved.',
      fi: 'Edustat EQR:n TJ Craig Bradshaw\'ta (nimitetty 1.10.2025). Olet optimistinen mutta operatiivisesti kiinni todellisuudessa. Avainluvut: markkina-arvo A$1,75mrd; APT ~2 500 $/mtu tällä hetkellä (+300% helmikuusta 2025). H1 FY2026 tuotanto 67 126 mtu. Tuotantotavoite: >3 350 tpa. Iolanthe Vein (korkealaatuinen) tavoitteena avata Q3 FY2026. Traxys 5v myyntisopimus ~A$678M spottihinnoilla. Positiivinen liiketoiminnan kassavirta Q2 FY2026. Rahoitus täysin ratkaistu.',
    },
  },
  {
    id: 'macro',
    name: { en: 'Macro Strategist', fi: 'Makrostrategi' },
    icon: '🌍',
    color: '#0ea5e9',
    systemPrompt: {
      en: 'You are a global macro strategist. Think in terms of interest rates, recession risk, USD strength, black swan events, and liquidity crises. Remember: in crises, correlations go to 1.',
      fi: 'Olet globaali makrostrategi. Ajattelet korkojen, taantuman riskin, dollarin vahvuuden, mustien joutsenten ja likviditeettikriisien termein. Muista: kriiseissä korrelaatiot menevät yhteen.',
    },
  },
]

export const getAgent = (id: string): Agent | undefined =>
  AGENTS.find(a => a.id === id)
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/
git commit -m "feat: add static data — agents, context, presets, i18n"
```

---

## Task 4: Parsing Functions + Tests

**Files:**
- Create: `lib/parse.ts`, `__tests__/lib/parse.test.ts`

- [ ] **Step 1: Install test runner**

```bash
npm install -D jest @types/jest ts-jest
```

Create `jest.config.js`:
```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}
```

- [ ] **Step 2: Write failing tests for `parseSentiment`**

```typescript
// __tests__/lib/parse.test.ts
import { parseSentiment, parseConfidence, parsePriceImpact } from '@/lib/parse'

describe('parseSentiment', () => {
  it('returns BULLISH when text contains BULLISH', () => {
    expect(parseSentiment('This is a BULLISH scenario for EQR.')).toBe('BULLISH')
  })
  it('returns BEARISH when text contains BEARISH', () => {
    expect(parseSentiment('The outlook is BEARISH given macro headwinds.')).toBe('BEARISH')
  })
  it('returns NEUTRAL when neither keyword found', () => {
    expect(parseSentiment('This is ambiguous.')).toBe('NEUTRAL')
  })
  it('returns NEUTRAL for empty string', () => {
    expect(parseSentiment('')).toBe('NEUTRAL')
  })
  it('finds BULLISH case-insensitively (lowercase in text)', () => {
    expect(parseSentiment('bullish on the stock')).toBe('BULLISH')
  })
  it('returns BULLISH for first match when both present', () => {
    expect(parseSentiment('BULLISH short term but BEARISH long term')).toBe('BULLISH')
  })
})

describe('parseConfidence', () => {
  it('parses labeled confidence percentage', () => {
    expect(parseConfidence('My analysis. Confidence: 78%')).toBe(78)
  })
  it('is case-insensitive', () => {
    expect(parseConfidence('CONFIDENCE: 45%')).toBe(45)
  })
  it('clamps to 100', () => {
    expect(parseConfidence('Confidence: 150%')).toBe(100)
  })
  it('clamps to 0', () => {
    expect(parseConfidence('Confidence: -5%')).toBe(0)
  })
  it('returns null when not found', () => {
    expect(parseConfidence('No confidence here.')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseConfidence('')).toBeNull()
  })
})

describe('parsePriceImpact', () => {
  it('parses labeled price impact range', () => {
    expect(parsePriceImpact('Price impact: -10% to +25%')).toEqual({ low: -10, high: 25 })
  })
  it('parses with spaces around label', () => {
    expect(parsePriceImpact('Some text.\nPrice impact: -5% to +15%\n')).toEqual({ low: -5, high: 15 })
  })
  it('parses decimal values', () => {
    expect(parsePriceImpact('Price impact: -2.5% to +7.5%')).toEqual({ low: -2.5, high: 7.5 })
  })
  it('parses negative-only range', () => {
    expect(parsePriceImpact('Price impact: -30% to -5%')).toEqual({ low: -30, high: -5 })
  })
  it('returns null when label absent', () => {
    expect(parsePriceImpact('revenue grew 10% to 15%')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parsePriceImpact('')).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx jest __tests__/lib/parse.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/parse'`

- [ ] **Step 4: Write `lib/parse.ts`**

```typescript
// lib/parse.ts
import type { Sentiment } from './types'

export function parseSentiment(text: string): Sentiment {
  const upper = (text ?? '').toUpperCase()
  if (upper.includes('BULLISH')) return 'BULLISH'
  if (upper.includes('BEARISH')) return 'BEARISH'
  return 'NEUTRAL'
}

export function parseConfidence(text: string): number | null {
  const match = (text ?? '').match(/confidence:\s*(\d{1,3})%/i)
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
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx jest __tests__/lib/parse.test.ts
```
Expected: PASS — 15 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/parse.ts __tests__/lib/parse.test.ts jest.config.js
git commit -m "feat: add parse functions with tests (parseSentiment, parseConfidence, parsePriceImpact)"
```

---

## Task 5: Prompt Builders + Tests

**Files:**
- Create: `lib/prompts.ts`, `__tests__/lib/prompts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/prompts.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/prompts'`

- [ ] **Step 3: Write `lib/prompts.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/prompts.test.ts
```
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts __tests__/lib/prompts.test.ts
git commit -m "feat: add prompt builders with tests"
```

---

## Task 6: API Route

**Files:**
- Create: `app/api/claude/route.ts`

- [ ] **Step 1: Write `app/api/claude/route.ts`**

```typescript
// app/api/claude/route.ts
import { NextRequest } from 'next/server'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { system, user } = body

    if (!system || typeof system !== 'string' || !system.trim()) {
      return Response.json({ error: 'Missing required field: system' }, { status: 400 })
    }
    if (!user || typeof user !== 'string' || !user.trim()) {
      return Response.json({ error: 'Missing required field: user' }, { status: 400 })
    }

    const DELAYS = [3000, 6000, 12000]
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      })

      if (response.status === 429 || response.status === 529) {
        lastError = new Error(`Rate limited (${response.status})`)
        if (attempt < 2) await sleep(DELAYS[attempt])
        continue
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error?.message || `API error ${response.status}`)
      }

      const text: string = data.content
        ?.filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n') || ''

      return Response.json({ text })
    }

    throw lastError ?? new Error('Max retries exceeded')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev
```
Check console for TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/claude/route.ts
git commit -m "feat: add Anthropic API proxy with exponential backoff"
```

---

## Task 7: Zustand Store

**Files:**
- Create: `store/simulatorStore.ts`

- [ ] **Step 1: Write `store/simulatorStore.ts`**

```typescript
// store/simulatorStore.ts
import { create } from 'zustand'
import type { AgentId, AgentResponse, HistoryRun, Lang, RunStatus, UploadedFile } from '@/lib/types'

interface SimulatorState {
  lang: Lang
  scenario: string
  uploadedFile: UploadedFile | null
  responses: Partial<Record<AgentId, AgentResponse>>
  loading: Partial<Record<AgentId, boolean>>
  synthesis: string | null
  synthesisError: string | null
  isSynthesizing: boolean
  runStatus: RunStatus
  error: string | null
  replayRun: HistoryRun | null

  setLang: (lang: Lang) => void
  setScenario: (text: string) => void
  setUploadedFile: (file: UploadedFile | null) => void
  setAgentResponse: (agentId: AgentId, response: AgentResponse) => void
  setAgentLoading: (agentId: AgentId, loading: boolean) => void
  setSynthesis: (text: string) => void
  setSynthesisError: (error: string | null) => void
  setIsSynthesizing: (v: boolean) => void
  setRunStatus: (status: RunStatus) => void
  setError: (error: string | null) => void
  setReplayRun: (run: HistoryRun | null) => void
  reset: () => void
}

const INITIAL_RUN_STATE = {
  responses: {} as Partial<Record<AgentId, AgentResponse>>,
  loading: {} as Partial<Record<AgentId, boolean>>,
  synthesis: null,
  synthesisError: null,
  isSynthesizing: false,
  runStatus: 'idle' as RunStatus,
  error: null,
  replayRun: null,
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  lang: 'fi',
  scenario: '',
  uploadedFile: null,
  ...INITIAL_RUN_STATE,

  setLang: (lang) => set({ lang }),
  setScenario: (scenario) => set({ scenario }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setAgentResponse: (agentId, response) =>
    set((state) => ({ responses: { ...state.responses, [agentId]: response } })),
  setAgentLoading: (agentId, loading) =>
    set((state) => ({ loading: { ...state.loading, [agentId]: loading } })),
  setSynthesis: (synthesis) => set({ synthesis }),
  setSynthesisError: (synthesisError) => set({ synthesisError }),
  setIsSynthesizing: (isSynthesizing) => set({ isSynthesizing }),
  setRunStatus: (runStatus) => set({ runStatus }),
  setError: (error) => set({ error }),
  setReplayRun: (replayRun) => set({ replayRun }),
  reset: () => set(INITIAL_RUN_STATE),
}))
```

Note: `reset()` does not call `abortController.abort()` — the AbortController lives in `useSimulator.ts` (a ref), not the store. `useSimulator.startRun()` calls `abort()` on the ref before calling `store.reset()`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add store/simulatorStore.ts
git commit -m "feat: add Zustand store for simulator state"
```

---

## Task 8: History Hook

**Files:**
- Create: `hooks/useHistory.ts`

- [ ] **Step 1: Write `hooks/useHistory.ts`**

```typescript
// hooks/useHistory.ts
import { useState, useEffect, useCallback } from 'react'
import type { HistoryRun } from '@/lib/types'

const STORAGE_KEY = 'eqr-history'
const MAX_RUNS = 50
const CURRENT_SCHEMA = 1

function loadFromStorage(): HistoryRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Schema version check — wipe on mismatch
    if (parsed.length > 0 && parsed[0].schemaVersion !== CURRENT_SCHEMA) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return parsed as HistoryRun[]
  } catch {
    return []
  }
}

function saveToStorage(runs: HistoryRun[]): void {
  const attempt = (data: HistoryRun[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
  try {
    attempt(runs)
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Prune 5 oldest and retry
      try {
        attempt(runs.slice(5))
      } catch {
        // Silent failure — storage unavailable
      }
    }
  }
}

export function useHistory() {
  const [runs, setRuns] = useState<HistoryRun[]>([])

  useEffect(() => {
    setRuns(loadFromStorage())
  }, [])

  const save = useCallback((run: HistoryRun) => {
    setRuns((prev) => {
      const withoutExisting = prev.filter(r => r.id !== run.id)
      const pruned = withoutExisting.length >= MAX_RUNS
        ? withoutExisting.slice(1)
        : withoutExisting
      const next = [...pruned, run]
      saveToStorage(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setRuns((prev) => {
      const next = prev.filter(r => r.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setRuns([])
  }, [])

  return { runs, save, remove, clear }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useHistory.ts
git commit -m "feat: add useHistory hook with localStorage persistence"
```

---

## Task 9: Simulator Hook

**Files:**
- Create: `hooks/useSimulator.ts`

- [ ] **Step 1: Write `hooks/useSimulator.ts`**

```typescript
// hooks/useSimulator.ts
import { useRef, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, HistoryRun, Lang } from '@/lib/types'
import { AGENT_IDS } from '@/lib/types'
import { buildSystemPrompt, buildUserPrompt, buildSynthesisPrompt } from '@/lib/prompts'
import { parseSentiment, parseConfidence, parsePriceImpact } from '@/lib/parse'
import { useSimulatorStore } from '@/store/simulatorStore'

// NOTE: useHistory is NOT called here — useSimulator accepts a `save` callback
// so the single useHistory() instance in page.tsx owns the runs state.

const BATCHES: AgentId[][] = [
  ['institutional', 'retail', 'short_seller'],
  ['analyst', 'defense'],
  ['management', 'macro'],
]

async function callClaude(system: string, user: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text ?? ''
}

function parseResponse(text: string): AgentResponse {
  return {
    text,
    sentiment: parseSentiment(text),
    confidence: parseConfidence(text),
    priceImpact: parsePriceImpact(text),
  }
}

export function useSimulator(save: (run: HistoryRun) => void) {
  const store = useSimulatorStore()
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef<string>('')
  const snapshotLangRef = useRef<Lang>('fi')

  const runSynthesis = useCallback(async (
    responses: Partial<Record<AgentId, AgentResponse>>,
    lang: Lang,
    runId: string,
    signal: AbortSignal,
    existingResponses: Record<AgentId, AgentResponse>
  ) => {
    store.setRunStatus('running')
    store.setIsSynthesizing(true)
    const { system, user } = buildSynthesisPrompt(responses, lang)
    try {
      const text = await callClaude(system, user, signal)
      store.setSynthesis(text)
      store.setSynthesisError(null)
      const run: HistoryRun = {
        schemaVersion: 1,
        id: runId,
        timestamp: Date.now(),
        scenario: store.scenario,
        lang,
        responses: existingResponses,
        synthesis: text,
      }
      save(run)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      store.setSynthesis(null)
      store.setSynthesisError((err as Error)?.message ?? 'Synthesis failed')
      const run: HistoryRun = {
        schemaVersion: 1,
        id: runId,
        timestamp: Date.now(),
        scenario: store.scenario,
        lang,
        responses: existingResponses,
        synthesis: null,
      }
      save(run)
    } finally {
      store.setIsSynthesizing(false)
      store.setRunStatus('done')
    }
  }, [store, save])

  const startRun = useCallback(async () => {
    // Abort any existing run
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    const lang = store.lang
    snapshotLangRef.current = lang
    const runId = nanoid()
    runIdRef.current = runId
    const uploadedFile = store.uploadedFile

    store.reset()
    store.setRunStatus('running')

    const allResponses: Partial<Record<AgentId, AgentResponse>> = {}

    for (const batch of BATCHES) {
      // Mark batch as loading
      for (const agentId of batch) {
        store.setAgentLoading(agentId, true)
      }

      const results = await Promise.allSettled(
        batch.map(async (agentId) => {
          const agent = AGENTS.find(a => a.id === agentId)!
          const system = buildSystemPrompt(agent, lang, uploadedFile)
          const user = buildUserPrompt(store.scenario, lang)
          const text = await callClaude(system, user, signal)
          return { agentId, text }
        })
      )

      for (let i = 0; i < batch.length; i++) {
        const agentId = batch[i]
        const result = results[i]
        if (result.status === 'fulfilled') {
          const parsed = parseResponse(result.value.text)
          allResponses[agentId] = parsed
          store.setAgentResponse(agentId, parsed)
        } else {
          if ((result.reason as Error)?.name === 'AbortError') {
            store.setAgentLoading(agentId, false)
            continue
          }
          const errResponse: AgentResponse = {
            text: '',
            sentiment: 'NEUTRAL',
            confidence: null,
            priceImpact: null,
            error: (result.reason as Error)?.message ?? 'Failed',
          }
          allResponses[agentId] = errResponse
          store.setAgentResponse(agentId, errResponse)
        }
        store.setAgentLoading(agentId, false)
      }

      if (signal.aborted) return
    }

    // Check if all failed
    const successful = Object.values(allResponses).filter(r => r && !r.error)
    if (successful.length === 0) {
      store.setRunStatus('error')
      store.setError('All agents failed to respond.')
      return
    }

    await runSynthesis(allResponses, lang, runId, signal, allResponses as Record<AgentId, AgentResponse>)
  }, [store, runSynthesis])

  const retryAgent = useCallback(async (agentId: AgentId) => {
    const controller = new AbortController()
    const signal = controller.signal
    const lang = snapshotLangRef.current
    const uploadedFile = store.uploadedFile

    store.setAgentResponse(agentId, { text: '', sentiment: 'NEUTRAL', confidence: null, priceImpact: null })
    store.setAgentLoading(agentId, true)

    try {
      const agent = AGENTS.find(a => a.id === agentId)!
      const system = buildSystemPrompt(agent, lang, uploadedFile)
      const user = buildUserPrompt(store.scenario, lang)
      const text = await callClaude(system, user, signal)
      const parsed = parseResponse(text)
      store.setAgentResponse(agentId, parsed)
    } catch (err: unknown) {
      const errResponse: AgentResponse = {
        text: '',
        sentiment: 'NEUTRAL',
        confidence: null,
        priceImpact: null,
        error: (err as Error)?.message ?? 'Retry failed',
      }
      store.setAgentResponse(agentId, errResponse)
    } finally {
      store.setAgentLoading(agentId, false)
    }

    // Check if synthesis should be re-triggered
    const allResponses = store.responses
    const allDone = AGENT_IDS.every(id => {
      const r = allResponses[id]
      return r !== undefined && r.error === undefined
    })
    const needsSynthesis = store.synthesis === null || store.synthesisError !== null

    if (allDone && needsSynthesis) {
      const retryController = new AbortController()
      await runSynthesis(
        allResponses as Record<AgentId, AgentResponse>,
        lang,
        runIdRef.current,
        retryController.signal,
        allResponses as Record<AgentId, AgentResponse>
      )
    }
  }, [store, runSynthesis])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    store.reset()
  }, [store])

  return { startRun, retryAgent, cancel }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useSimulator.ts hooks/useHistory.ts
git commit -m "feat: add useSimulator hook — batched run, progressive reveal, retry logic"
```

---

## Task 10: Theme & Global CSS

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Update `app/globals.css`**

Replace the entire file with:

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

@layer base {
  :root {
    --background: 0 0% 4%;
    --foreground: 240 10% 88%;
    --card: 240 15% 6%;
    --card-foreground: 240 10% 88%;
    --popover: 240 15% 6%;
    --popover-foreground: 240 10% 88%;
    --primary: 258 88% 66%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 12% 10%;
    --secondary-foreground: 240 10% 70%;
    --muted: 240 12% 12%;
    --muted-foreground: 240 8% 45%;
    --accent: 240 12% 14%;
    --accent-foreground: 240 10% 88%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 14% 11%;
    --input: 240 14% 11%;
    --ring: 258 88% 66%;
    --radius: 0.75rem;
  }
}

@layer base {
  * { box-sizing: border-box; }
  body {
    background-color: #06060a;
    color: hsl(var(--foreground));
    font-family: 'IBM Plex Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #252535; border-radius: 3px; }
}

@layer utilities {
  .font-mono { font-family: 'JetBrains Mono', monospace; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
}

.animate-pulse-dot {
  animation: pulse-dot 1.5s ease-in-out infinite;
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EQR Scenario Simulator',
  description: 'Multi-agent investment scenario analysis for EQ Resources (ASX:EQR)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Verify dev server renders dark background**

```bash
npm run dev
```
Open http://localhost:3000 — page should have near-black background.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: apply dark professional theme with IBM Plex Sans + JetBrains Mono"
```

---

## Task 11: SentimentBadge

**Files:**
- Create: `components/agents/SentimentBadge.tsx`

- [ ] **Step 1: Write `components/agents/SentimentBadge.tsx`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/SentimentBadge.tsx
git commit -m "feat: add SentimentBadge component"
```

---

## Task 12: AgentCard + AgentGrid

**Files:**
- Create: `components/agents/AgentCard.tsx`, `components/agents/AgentGrid.tsx`

- [ ] **Step 1: Write `components/agents/AgentCard.tsx`**

```typescript
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
```

- [ ] **Step 2: Write `components/agents/AgentGrid.tsx`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add components/agents/
git commit -m "feat: add AgentCard and AgentGrid components"
```

---

## Task 13: Scenario Input Components

**Files:**
- Create: `components/scenario/ScenarioInput.tsx`, `components/scenario/PresetPicker.tsx`, `components/scenario/FileUpload.tsx`

- [ ] **Step 1: Write `components/scenario/ScenarioInput.tsx`**

```typescript
// components/scenario/ScenarioInput.tsx
'use client'
import type { UIStrings } from '@/lib/i18n'

interface ScenarioInputProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  disabled: boolean
  isRunning: boolean
  strings: UIStrings
}

export function ScenarioInput({ value, onChange, onRun, disabled, isRunning, strings }: ScenarioInputProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={strings.presetsLabel + '…'}
        rows={3}
        className="w-full rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-[#7c5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#12121c', border: '1px solid #1a1a28' }}
      />
      <button
        onClick={onRun}
        disabled={disabled || !value.trim()}
        className="w-full py-3 rounded-lg font-mono text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        style={{ background: disabled ? '#252535' : 'linear-gradient(135deg, #7c5cf6, #2563eb)' }}
      >
        {isRunning ? strings.running : strings.runButton}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write `components/scenario/PresetPicker.tsx`**

```typescript
// components/scenario/PresetPicker.tsx
import type { Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { PRESETS } from '@/lib/presets'

interface PresetPickerProps {
  lang: Lang
  disabled: boolean
  onSelect: (value: string) => void
  strings: UIStrings
}

export function PresetPicker({ lang, disabled, onSelect, strings }: PresetPickerProps) {
  return (
    <div>
      <p className="font-mono text-[10px] text-slate-600 uppercase tracking-wider mb-2">
        {strings.presetsLabel}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS[lang].map(preset => (
          <button
            key={preset.value}
            onClick={() => onSelect(preset.value)}
            disabled={disabled}
            className="font-mono text-[10px] px-2.5 py-1 rounded-md border border-[#1a1a28] text-slate-400 hover:text-slate-200 hover:border-[#7c5cf6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0d0d14' }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `components/scenario/FileUpload.tsx`**

```typescript
// components/scenario/FileUpload.tsx
'use client'
import { useRef, useState } from 'react'
import type { UIStrings } from '@/lib/i18n'
import type { UploadedFile } from '@/lib/types'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_CHARS = 8000

interface FileUploadProps {
  uploadedFile: UploadedFile | null
  onFile: (file: UploadedFile | null) => void
  disabled: boolean
  strings: UIStrings
}

export function FileUpload({ uploadedFile, onFile, disabled, strings }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    if (file.size > MAX_SIZE) {
      setError(strings.uploadErrorSize)
      return
    }
    setExtracting(true)
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const textParts: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        textParts.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '))
      }
      const fullText = textParts.join('\n')
      if (!fullText.trim()) {
        setError(strings.uploadErrorText)
        return
      }
      const truncated = fullText.length > MAX_CHARS
      const content = truncated ? fullText.slice(0, MAX_CHARS) + ' [truncated]' : fullText
      onFile({ name: file.name, content })
    } catch {
      setError(strings.uploadErrorText)
    } finally {
      setExtracting(false)
    }
  }

  if (uploadedFile) {
    const chars = uploadedFile.content.length
    const wasTruncated = uploadedFile.content.endsWith('[truncated]')
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
        style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
        <span className="text-slate-400 font-mono truncate">
          {strings.uploadSuccess(uploadedFile.name, wasTruncated ? MAX_CHARS : chars, wasTruncated)}
        </span>
        <button
          onClick={() => onFile(null)}
          disabled={disabled}
          className="text-slate-600 hover:text-slate-300 font-mono text-[10px] ml-2 shrink-0"
        >
          {strings.removeFile}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className="rounded-lg px-4 py-3 text-center cursor-pointer hover:border-slate-600 transition-colors"
        style={{ background: '#0d0d14', border: '1px dashed #1a1a28' }}
        onClick={() => !disabled && !extracting && inputRef.current?.click()}
      >
        <p className="text-xs text-slate-600">
          {extracting ? 'Extracting…' : strings.uploadHint}
        </p>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/scenario/
git commit -m "feat: add ScenarioInput, PresetPicker, FileUpload components"
```

---

## Task 14: Results Components

**Files:**
- Create: `components/results/ConfidenceGauge.tsx`, `components/results/PriceImpactChart.tsx`, `components/results/SynthesisPanel.tsx`

- [ ] **Step 1: Write `components/results/ConfidenceGauge.tsx`**

```typescript
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
```

- [ ] **Step 2: Write `components/results/PriceImpactChart.tsx`**

```typescript
// components/results/PriceImpactChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, Lang } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'

interface PriceImpactChartProps {
  responses: Partial<Record<AgentId, AgentResponse>>
  lang: Lang
  strings: UIStrings
}

export function PriceImpactChart({ responses, lang, strings }: PriceImpactChartProps) {
  const data = AGENTS
    .filter(a => {
      const r = responses[a.id]
      return r && !r.error && r.priceImpact !== null
    })
    .map(agent => ({
      name: agent.name[lang].split(' ')[0], // first word for brevity
      low: responses[agent.id]!.priceImpact!.low,
      high: responses[agent.id]!.priceImpact!.high,
      color: agent.color,
    }))

  if (data.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
        <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
          {strings.priceImpact}
        </h3>
        <p className="text-xs text-slate-600">{strings.noImpactData}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
      <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
        {strings.priceImpact}
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a28" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: '#0d0d14', border: '1px solid #1a1a28', borderRadius: 8, fontSize: 11 }}
            formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value}%`, name === 'low' ? 'Low' : 'High']}
            labelStyle={{ color: '#94a3b8' }}
          />
          <ReferenceLine x={0} stroke="#252535" />
          <Bar dataKey="low" name="low" radius={[4, 0, 0, 4]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.5} />
            ))}
          </Bar>
          <Bar dataKey="high" name="high" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Add `@tailwindcss/typography` to `globals.css`**

At the top of `app/globals.css`, add after the existing `@import "tailwindcss"` line:

```css
@plugin "@tailwindcss/typography";
```

This enables the `prose` classes used in SynthesisPanel.

- [ ] **Step 4: Write `components/results/SynthesisPanel.tsx`**

```typescript
// components/results/SynthesisPanel.tsx
import type { UIStrings } from '@/lib/i18n'

interface SynthesisPanelProps {
  synthesis: string | null
  synthesisError: string | null
  isSynthesizing: boolean
  strings: UIStrings
}

export function SynthesisPanel({ synthesis, synthesisError, isSynthesizing, strings }: SynthesisPanelProps) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}>
      <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-4">
        {strings.synthesisTitle}
      </h3>
      {isSynthesizing && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cf6] animate-pulse-dot inline-block" />
          {strings.synthesizing}
        </div>
      )}
      {synthesisError && !isSynthesizing && (
        <p className="text-sm text-red-400">{strings.synthesisError}</p>
      )}
      {synthesis && !isSynthesizing && (
        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap text-[13px]">
          {synthesis}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/results/
git commit -m "feat: add ConfidenceGauge, PriceImpactChart, SynthesisPanel components"
```

---

## Task 15: History Components

**Files:**
- Create: `components/history/HistoryEntry.tsx`, `components/history/HistoryDrawer.tsx`

- [ ] **Step 1: Write `components/history/HistoryEntry.tsx`**

```typescript
// components/history/HistoryEntry.tsx
import type { HistoryRun, Sentiment } from '@/lib/types'
import { AGENTS } from '@/lib/agents'

const DOT_COLORS: Record<Sentiment, string> = {
  BULLISH: '#22c55e',
  BEARISH: '#ef4444',
  NEUTRAL: '#475569',
}

interface HistoryEntryProps {
  run: HistoryRun
  onClick: () => void
}

export function HistoryEntry({ run, onClick }: HistoryEntryProps) {
  const date = new Date(run.timestamp)
  const formatted = date.toLocaleDateString(run.lang === 'fi' ? 'fi-FI' : 'en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 hover:bg-[#12121c] transition-colors"
      style={{ border: '1px solid #1a1a28' }}
    >
      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2">
        {run.scenario.length > 80 ? run.scenario.slice(0, 80) + '…' : run.scenario}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {AGENTS.map(agent => {
            const sentiment = run.responses[agent.id]?.sentiment ?? 'NEUTRAL'
            return (
              <span
                key={agent.id}
                title={agent.name.en}
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: DOT_COLORS[sentiment] }}
              />
            )
          })}
        </div>
        <span className="font-mono text-[10px] text-slate-600">{formatted}</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Write `components/history/HistoryDrawer.tsx`**

```typescript
// components/history/HistoryDrawer.tsx
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { HistoryRun } from '@/lib/types'
import type { UIStrings } from '@/lib/i18n'
import { HistoryEntry } from './HistoryEntry'

interface HistoryDrawerProps {
  open: boolean
  onClose: () => void
  runs: HistoryRun[]
  onSelectRun: (run: HistoryRun) => void
  strings: UIStrings
}

export function HistoryDrawer({ open, onClose, runs, onSelectRun, strings }: HistoryDrawerProps) {
  const sorted = [...runs].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <Sheet open={open} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] flex flex-col"
        style={{ background: '#0a0a12', borderLeft: '1px solid #1a1a28' }}
      >
        <SheetHeader>
          <SheetTitle className="font-mono text-sm text-slate-400 uppercase tracking-wider">
            {strings.history}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-600 text-center mt-8">{strings.historyEmpty}</p>
          ) : (
            sorted.map(run => (
              <HistoryEntry
                key={run.id}
                run={run}
                onClick={() => { onSelectRun(run); onClose() }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/history/
git commit -m "feat: add HistoryEntry and HistoryDrawer components"
```

---

## Task 16: Page Assembly

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write `app/page.tsx`**

```typescript
// app/page.tsx
'use client'
import { useState } from 'react'
import { useSimulatorStore } from '@/store/simulatorStore'
import { useSimulator } from '@/hooks/useSimulator'
import { useHistory } from '@/hooks/useHistory'
import { t } from '@/lib/i18n'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { ScenarioInput } from '@/components/scenario/ScenarioInput'
import { PresetPicker } from '@/components/scenario/PresetPicker'
import { FileUpload } from '@/components/scenario/FileUpload'
import { SynthesisPanel } from '@/components/results/SynthesisPanel'
import { PriceImpactChart } from '@/components/results/PriceImpactChart'
import { ConfidenceGauge } from '@/components/results/ConfidenceGauge'
import { HistoryDrawer } from '@/components/history/HistoryDrawer'

export default function Home() {
  const store = useSimulatorStore()
  const { runs, save } = useHistory()                  // single instance — owns runs state
  const { startRun, retryAgent } = useSimulator(save)  // pass save so hook doesn't need its own instance
  const [historyOpen, setHistoryOpen] = useState(false)

  const strings = t(store.lang)
  const isRunning = store.runStatus === 'running'
  const isReplay = store.replayRun !== null
  const inputsDisabled = isRunning || isReplay

  // Determine what to display: replay or live
  const displayResponses = isReplay ? store.replayRun!.responses : store.responses
  const displaySynthesis = isReplay ? store.replayRun!.synthesis : store.synthesis
  const displaySynthesisError = isReplay ? null : store.synthesisError
  const showResults = isReplay || store.runStatus === 'done'

  return (
    <div className="min-h-screen" style={{ background: '#06060a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-base font-bold text-slate-200">
              {strings.appTitle}
            </h1>
            <p className="font-mono text-[10px] text-slate-600 mt-0.5">{strings.appSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setLang(store.lang === 'en' ? 'fi' : 'en')}
              disabled={isRunning}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
            >
              {strings.langToggle}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {strings.history}
            </button>
          </div>
        </div>

        {/* Replay banner */}
        {isReplay && (
          <div className="flex items-center justify-between px-4 py-2 rounded-lg"
            style={{ background: '#0d0d14', border: '1px solid #252535' }}>
            <span className="font-mono text-xs text-slate-500">{strings.historyReplayBanner}</span>
            <button
              onClick={() => store.setReplayRun(null)}
              className="font-mono text-xs text-[#7c5cf6] hover:text-white transition-colors"
            >
              {strings.backToLive}
            </button>
          </div>
        )}

        {/* Scenario input panel */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}
        >
          <PresetPicker
            lang={store.lang}
            disabled={inputsDisabled}
            onSelect={store.setScenario}
            strings={strings}
          />
          <ScenarioInput
            value={store.scenario}
            onChange={store.setScenario}
            onRun={startRun}
            disabled={inputsDisabled}
            isRunning={isRunning}
            strings={strings}
          />
          <FileUpload
            uploadedFile={store.uploadedFile}
            onFile={store.setUploadedFile}
            disabled={inputsDisabled}
            strings={strings}
          />
        </div>

        {/* All-agents-failed error banner */}
        {store.runStatus === 'error' && store.error && (
          <div className="px-4 py-3 rounded-lg text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {strings.allAgentsFailed}
          </div>
        )}

        {/* Agent grid */}
        <AgentGrid
          responses={displayResponses}
          loading={isReplay ? {} : store.loading}
          strings={strings}
          onRetry={retryAgent}
        />

        {/* Results section */}
        {showResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PriceImpactChart responses={displayResponses} lang={store.lang} strings={strings} />
              <ConfidenceGauge responses={displayResponses} lang={store.lang} strings={strings} />
            </div>
            <SynthesisPanel
              synthesis={displaySynthesis}
              synthesisError={displaySynthesisError}
              isSynthesizing={store.isSynthesizing}
              strings={strings}
            />
          </div>
        )}
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        runs={runs}
        onSelectRun={store.setReplayRun}
        strings={strings}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify full build compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

```bash
npm run dev
```
Open http://localhost:3000. Verify:
- Dark background renders
- Header with language toggle and history button
- Preset buttons visible
- Scenario textarea accepts input
- File upload zone visible
- 7 agent cards in 2-col grid (idle state)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble dashboard page — all panels wired to store"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Set real API key in `.env.local`**

```
ANTHROPIC_API_KEY=sk-ant-YOUR_REAL_KEY
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Run a scenario**

1. Select a preset (e.g. "APT → $4,000")
2. Click "Run Analysis" (or "Aja analyysi" in FI)
3. Verify agents appear progressively in batches of 3, 2, 2
4. Verify each card shows sentiment badge + confidence % when done
5. Verify synthesis panel populates after all agents complete
6. Verify Price Impact chart and Confidence Gauge appear

- [ ] **Step 4: Test history**

1. After run completes, click "History"
2. Verify run appears in drawer with 7 sentiment dots
3. Click the entry
4. Verify replay banner appears
5. Verify "Back to live view" exits replay

- [ ] **Step 5: Test PDF upload**

1. Upload a small text-layer PDF (e.g. any investor report)
2. Verify "Context loaded: filename (X chars)" message
3. Run a scenario — verify run completes with file context

- [ ] **Step 6: Test language toggle**

1. Click language toggle to switch EN↔FI
2. Verify preset labels change language
3. Run a scenario in Finnish — verify Finnish prompts produce Finnish responses

- [ ] **Step 7: Final production build check**

```bash
npm run build
```
Expected: Build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: complete EQR simulator v1 — all features wired and smoke tested"
```

---

## Task 18: Production Build Verification

- [ ] **Step 1: Run full test suite**

```bash
npx jest
```
Expected: All tests pass (parse + prompts suites).

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: Build completes with no TypeScript or lint errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify production build passes"
```

---

## Running All Tests

```bash
npx jest
```
Expected: All unit tests pass (parse + prompts suites).

```bash
npm run build
```
Expected: Production build succeeds with no TypeScript errors.
