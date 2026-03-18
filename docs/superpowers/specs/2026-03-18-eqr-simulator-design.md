# EQR Scenario Simulator — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Project:** `/Users/ricorokka/eqr-simulator`

---

## Overview

A professional multi-agent investment scenario simulator for EQ Resources (ASX:EQR), a tungsten producer. Seven AI agents with distinct investment perspectives analyze user-defined scenarios and produce a synthesis report. Designed as a personal research tool credible enough to share with a small group of investors.

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Recharts, `pdfjs-dist`, Anthropic claude-sonnet-4-6.

---

## Must-Have Features (v1)

- 7 AI agents with distinct personas
- Synthesis report after all agents complete
- Per-agent confidence scores
- Bilingual UI (English / Finnish)
- PDF file upload as analysis context
- Scenario preset buttons
- History persisted to localStorage (max 50 runs)

## Nice-to-Have (v2, not in scope)

- Debate mode (agents respond to each other)
- Devil's advocate mode
- Chain mode (scenarios remember previous)

---

## Architecture & Folder Structure

```
eqr-simulator/
├── app/
│   ├── layout.tsx               # Root layout, fonts, metadata
│   ├── page.tsx                 # Dashboard shell (thin orchestrator, no business logic)
│   ├── globals.css              # Tailwind base + shadcn CSS vars (dark theme)
│   └── api/
│       └── claude/
│           └── route.ts         # Anthropic proxy: POST {system, user} → {text}
│
├── components/
│   ├── ui/                      # shadcn primitives (Button, Card, Badge, Sheet, Progress, etc.)
│   ├── scenario/
│   │   ├── ScenarioInput.tsx    # Textarea + run button (disabled when runStatus === 'running')
│   │   ├── PresetPicker.tsx     # Preset scenario buttons (EN/FI)
│   │   └── FileUpload.tsx       # PDF upload; extracts text client-side via pdfjs-dist
│   ├── agents/
│   │   ├── AgentGrid.tsx        # Responsive 2-col grid of agent cards
│   │   ├── AgentCard.tsx        # Collapsible card: idle / loading / done / error states
│   │   └── SentimentBadge.tsx   # BULLISH / BEARISH / NEUTRAL chip with color
│   ├── results/
│   │   ├── SynthesisPanel.tsx   # Synthesis report, markdown-rendered
│   │   ├── PriceImpactChart.tsx # Recharts horizontal BarChart, per-agent low/high range
│   │   └── ConfidenceGauge.tsx  # shadcn Progress bars per agent (agent color)
│   └── history/
│       ├── HistoryDrawer.tsx    # shadcn Sheet slide-out, lists past runs
│       └── HistoryEntry.tsx     # Run card: scenario text, date, 7 sentiment dots
│
├── hooks/
│   ├── useSimulator.ts          # Orchestrates run: batching [3,2,2], progressive reveal, AbortController
│   └── useHistory.ts            # Read/write HistoryRun[] to localStorage
│
├── lib/
│   ├── agents.ts                # Agent definitions: id, name EN/FI, icon, color, system prompt EN/FI
│   ├── context.ts               # EQR background context strings (EN + FI)
│   ├── presets.ts               # Preset scenarios (EN + FI arrays)
│   ├── prompts.ts               # buildSystemPrompt(), buildUserPrompt(), buildSynthesisPrompt()
│   ├── parse.ts                 # parseSentiment(), parseConfidence(), parsePriceImpact()
│   ├── i18n.ts                  # UI string dictionary { en: {...}, fi: {...} }
│   └── types.ts                 # Shared TypeScript types
│
├── store/
│   └── simulatorStore.ts        # Zustand store
│
└── public/
```

---

## Data Model

### Core types (`lib/types.ts`)

```typescript
type AgentId =
  | 'institutional'   // Institutional Investor
  | 'retail'          // Retail Speculator
  | 'short_seller'    // Short Seller
  | 'analyst'         // Industry Analyst
  | 'defense'         // Defense Procurement
  | 'management'      // EQR Management
  | 'macro'           // Macro Strategist

type Lang = 'en' | 'fi'
type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL'
type RunStatus = 'idle' | 'running' | 'done' | 'error'

interface Agent {
  id: AgentId
  name: Record<Lang, string>
  icon: string          // emoji
  color: string         // hex, used for border/badge/chart
  systemPrompt: Record<Lang, string>
}

interface AgentResponse {
  text: string
  sentiment: Sentiment
  confidence: number | null      // 0–100, parsed; null if unparseable
  priceImpact: { low: number; high: number } | null  // %, parsed; null if unparseable
  error?: string                 // set if the API call failed
}

interface HistoryRun {
  schemaVersion: 1                          // increment on breaking schema changes; mismatch → wipe localStorage
  id: string                                // nanoid()
  timestamp: number                         // Date.now()
  scenario: string
  lang: Lang                                // lang snapshotted at run start
  responses: Record<AgentId, AgentResponse> // all 7 agents (includes error responses); only saved after all 7 complete
  synthesis: string | null                  // null if synthesis failed or was skipped
}
```

### Zustand store (`store/simulatorStore.ts`)

```typescript
interface SimulatorState {
  // Settings
  lang: Lang

  // Current run
  scenario: string
  uploadedFile: { name: string; content: string } | null  // content = extracted plain text, max 8000 chars
  responses: Record<AgentId, AgentResponse>   // populated progressively during run
  loading: Record<AgentId, boolean>
  synthesis: string | null          // null until synthesis succeeds; null on failure
  synthesisError: string | null     // non-null if synthesis call failed
  isSynthesizing: boolean
  runStatus: RunStatus
  error: string | null              // top-level error (e.g. all agents failed)
  replayRun: HistoryRun | null      // non-null when viewing a history run in read-only mode

  // Actions
  setLang: (lang: Lang) => void
  setScenario: (text: string) => void
  setUploadedFile: (file: { name: string; content: string } | null) => void
  setAgentResponse: (agentId: AgentId, response: AgentResponse) => void
  setAgentLoading: (agentId: AgentId, loading: boolean) => void
  setSynthesis: (text: string) => void
  setSynthesisError: (error: string | null) => void
  setIsSynthesizing: (v: boolean) => void
  setRunStatus: (status: RunStatus) => void
  setError: (error: string | null) => void
  setReplayRun: (run: HistoryRun | null) => void
  // reset(): sets responses: {}, loading: {}, synthesis: null, synthesisError: null,
  //           isSynthesizing: false, runStatus: 'idle', error: null, replayRun: null;
  //           also calls abortController.abort() on the current run AbortController
  reset: () => void
}
```

---

## Agent Definitions (`lib/agents.ts`)

All 7 agents with their personas:

| AgentId | Name EN | Name FI | Icon | Color |
|---|---|---|---|---|
| `institutional` | Institutional Investor | Institutionaalinen sijoittaja | 🏦 | #2563eb |
| `retail` | Retail Speculator | Retail-spekulantti | 🎰 | #f59e0b |
| `short_seller` | Short Seller | Lyhyeksimyyjä | 🐻 | #ef4444 |
| `analyst` | Industry Analyst | Toimiala-analyytikko | 📊 | #8b5cf6 |
| `defense` | Defense Procurement | Puolustushankinta | 🛡️ | #059669 |
| `management` | EQR Management | EQR:n johto | ⛏️ | #d97706 |
| `macro` | Macro Strategist | Makrostrategi | 🌍 | #0ea5e9 |

**System prompt personas (EN):**

- **institutional**: "You are a conservative institutional fund manager (pension fund). Focus on risk-adjusted returns, liquidity, EV/EBITDA multiples, DCF valuation. Skeptical but data-driven. Always assess downside scenarios."
- **retail**: "You are an aggressive retail investor. Focus on narrative momentum, supercycle thesis, and multi-bagger potential. Lean toward upside scenarios and growth catalysts."
- **short_seller**: "You are a forensic short seller. Focus on dilution risk, execution risk, balance sheet weaknesses, and red flags. Look for what the bulls are missing."
- **analyst**: "You are a senior mining analyst covering critical minerals. You have deep knowledge of tungsten supply/demand dynamics, China export policy, and comparable companies (Almonty Industries, Wolf Minerals)."
- **defense**: "You are a defense procurement strategist. You care about supply chain security and strategic stockpiling, not stock price. National security implications of non-Chinese tungsten supply are your primary concern."
- **management**: "You represent EQR CEO Craig Bradshaw (appointed 1 Oct 2025). You are bullish but operationally grounded. Key metrics: market cap A$1.75B; APT ~$2,500/mtu currently (up +300% from Feb 2025). H1 FY2026 production 67,126 mtu. Targeted run-rate: >3,350 tpa. Iolanthe Vein (high-grade) access targeted Q3 FY2026. Traxys 5yr offtake ~A$678M at spot. Positive operating cashflow achieved Q2 FY2026. Financing fully resolved."
- **macro**: "You are a global macro strategist. Think in terms of interest rates, recession risk, USD strength, black swan events, and liquidity crises. Remember: in crises, correlations go to 1."

Each agent has equivalent Finnish system prompts in `lib/agents.ts`.

---

## EQR Background Context (`lib/context.ts`)

**EN:** "EQ Resources (ASX:EQR) is an Australian tungsten producer operating two mines: Mt Carbine (Queensland, Australia) and Barruecopardo (Spain). Market cap: A$1.75B (share price A$0.36, ~4.88B shares on issue). APT price: ~$2,500/mtu currently (was $1,320/mtu at Dec 2025; +300% from Feb 2025 lows). H1 FY2026 production: 67,126 mtu (Mt Carbine: 10,493 mtu; Barruecopardo: 56,633 mtu). Targeted production: >3,350 tpa (Mt Carbine >175,000 mtu/yr; Barruecopardo >160,000 mtu/yr). CEO: Craig Bradshaw (appointed 1 Oct 2025, previously Non-Executive Director). Financing resolved: A$56.5M raised, Traxys €15M prepayment facility (3yr), Oaktree loan converting to equity. Achieved positive operating cashflow Q2 FY2026: A$1.15M group level. Iolanthe Vein (high-grade, Mt Carbine) targeted for access Q3 FY2026 (~650,000t waste remaining). 5-year Traxys offtake: ~A$678M value at current spot prices. ASX All Ordinaries index inclusion effective 23 March 2026. Key competitor: Almonty Industries (higher market cap, not yet producing). China controls ~80% of global tungsten supply + has implemented export restrictions. US Project Vault: strategic tungsten stockpiling initiative."

**FI:** Finnish equivalent stored alongside in `lib/context.ts`.

---

## Preset Scenarios (`lib/presets.ts`)

**EN presets:**
1. "China lifts all tungsten export restrictions. APT could drop significantly from current $2,500/mtu."
2. "APT surges to $4,000/mtu due to further geopolitical escalation and supply tightness."
3. "Almonty announces 18+ month delays at Sangdong mine, removing key future supply."
4. "EQR delays Iolanthe Vein access by 12+ months due to unexpected ground conditions."
5. "US Project Vault: government commits $5B to tungsten strategic stockpiling, preferring non-Chinese sources."
6. "EQR achieves full targeted production run-rate of >3,350 tpa ahead of schedule."
7. "Financial crisis: equities -40%, liquidity evaporates, correlations go to 1."

**FI presets:** Finnish equivalents stored alongside.

---

## Data Flow

### Scenario run orchestration (`hooks/useSimulator.ts`)

```
User clicks RUN
  → create AbortController; store ref for cancellation
  → reset() store (clears previous run)
  → snapshot lang at run start (used for all prompts regardless of mid-run toggle)
  → set runStatus: 'running'
  → split AGENTS (7) into batches: [[institutional, retail, short_seller], [analyst, defense], [management, macro]]
  → for each batch (sequential between batches):
      → mark all agents in batch as loading: true
      → Promise.allSettled(batch.map(agent => callAgent(agent, signal)))
      → for each settled result:
          if fulfilled: parse response → store.setAgentResponse(agentId, parsed)
          if rejected:  store.setAgentResponse(agentId, { error: message, ... })
          → store.setAgentLoading(agentId, false)
          → agent card updates on screen
  → after all 7 complete:
      if 0 agents succeeded: set runStatus: 'error'; return (skip synthesis)
      else:
        → set isSynthesizing: true
        → POST /api/claude with buildSynthesisPrompt(successfulResponses, lang)
          (successfulResponses = responses where error is absent/undefined)
        → on success: store.setSynthesis(text); store.setSynthesisError(null)
        → on failure: store.setSynthesis(null); store.setSynthesisError(errorMessage)
        → set isSynthesizing: false
        → set runStatus: 'done'
        → useHistory.save({ ...run, synthesis: store.synthesis }) → localStorage
          (synthesis saved as null if synthesis failed; run IS saved regardless)
```

**runStatus semantics:**
- `'idle'` — no run in progress
- `'running'` — run in progress (Run button disabled, lang toggle disabled)
- `'done'` — run complete; some agents may have errored but at least one succeeded
- `'error'` — all 7 agents failed; full retry available

**Language toggle:** disabled when `runStatus === 'running'`. The `lang` value is snapshotted at run start and passed explicitly to all prompt builders.

**Cancellation:** `reset()` calls `abortController.abort()`. All fetch calls pass the abort signal. Aborted requests are treated as silent (no error state set).

### Per-agent retry

Retry button (visible on agent error state):
1. Clears that agent's error state, sets `loading[agentId]: true`
2. Creates a new AbortController scoped to this retry call only (independent of the run-level controller)
3. Re-calls API for that agent only
4. On response: `setAgentResponse(agentId, parsed)`, `setAgentLoading(agentId, false)`
5. Check aggregate state: if all 7 agents in `responses` now have `error === undefined` AND (`synthesis === null` OR `synthesisError !== null`):
   - Set `runStatus: 'running'` (to re-enable the synthesizing state and hide stale error banner)
   - Set `isSynthesizing: true`
   - POST /api/claude with `buildSynthesisPrompt(successfulResponses, snapshotLang)`
   - On success: atomically set `synthesis: text` and `synthesisError: null` (clears any prior synthesis error)
   - On failure: `setSynthesis(null)`, `setSynthesisError(errorMessage)`
   - Set `isSynthesizing: false`, `runStatus: 'done'`
   - **Upsert history:** if a history entry with the current run's `id` already exists, update it in place; otherwise, create a new entry. (Run was never saved if it originally ended as `runStatus: 'error'`.)
   - `snapshotLang` is the lang value captured at original run start; store it in a ref alongside the run-level AbortController ref.

### History persistence (`hooks/useHistory.ts`)

- localStorage key: `'eqr-history'`
- Format: `HistoryRun[]` serialized as JSON
- On app load: if stored data has `schemaVersion !== 1`, wipe key and start fresh
- On each save: if `runs.length >= 50`, remove oldest entry before adding new one
- `useHistory()` returns `{ runs, save, remove, clear }`
- History is saved only after all 7 agents complete AND synthesis call returns (success or failure)

---

## Prompt Design (`lib/prompts.ts`)

### `buildSystemPrompt(agent, lang, uploadedFile?)`

```
{agent.systemPrompt[lang]}

BACKGROUND CONTEXT:
{context[lang]}

{if uploadedFile}
ADDITIONAL CONTEXT FROM {uploadedFile.name}:
{uploadedFile.content}
{/if}

RESPONSE FORMAT — you MUST end your response with exactly these two lines:
Confidence: X%
Price impact: -X% to +X%
(Use negative numbers for bearish price impact, positive for bullish. Example: -15% to +5%)
```

### `buildUserPrompt(scenario, lang)`

EN: `SCENARIO: {scenario}\n\nAnalyze this scenario. What does it mean for EQ Resources (ASX:EQR)?`
FI: `SKENAARIO: {scenario}\n\nAnalysoi tämä skenaario. Mitä se tarkoittaa EQ Resourcesille (ASX:EQR)?`

### `buildSynthesisPrompt(responses, lang)`

`responses` parameter type: `Partial<Record<AgentId, AgentResponse>>` — only entries where `error` is absent (i.e. `response.error === undefined`).

System: "You are a senior investment strategist. Synthesize the following multi-perspective analysis into a coherent investment report. Highlight where analysts agree, where they diverge, and your net assessment."
User: Each successful response's `text` field concatenated, prefixed with the agent's name. Example format:
```
[Institutional Investor]
{response.text}

[Short Seller]
{response.text}
...
```

---

## Parsing (`lib/parse.ts`)

All pure functions — no side effects, fully unit-testable.

### `parseSentiment(text: string): Sentiment`

Scans the **full text** (uppercased) for the keywords `BULLISH` or `BEARISH`. Returns first match found. If neither found, returns `'NEUTRAL'`. Fallback for null input: `'NEUTRAL'`.

### `parseConfidence(text: string): number | null`

```typescript
const match = text.match(/confidence:\s*(\d{1,3})%/i)
return match ? Math.min(100, Math.max(0, parseInt(match[1]))) : null
```

### `parsePriceImpact(text: string): { low: number; high: number } | null`

```typescript
// Matches only labeled "Price impact: -10% to +25%" to avoid false positives
// from unrelated percentage ranges in the response text.
// The explicit format instruction in the system prompt enforces this label.
const match = text.match(
  /price\s+impact:\s*([+-]?\d+(?:\.\d+)?)\s*%\s*to\s*([+-]?\d+(?:\.\d+)?)\s*%/i
)
if (!match) return null
return { low: parseFloat(match[1]), high: parseFloat(match[2]) }
```

**When parsing returns null:** `ConfidenceGauge` omits that agent's bar; `PriceImpactChart` omits that agent's bar. `SentimentBadge` defaults to `NEUTRAL` (grey). No errors are thrown.

---

## API Route (`app/api/claude/route.ts`)

**Environment variable:** `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (server-side only, never exposed to client).

**Request body:** `{ system: string; user: string }` — prompts are fully constructed client-side by `lib/prompts.ts` before the fetch. No agentId or metadata passed.

**Non-streaming:** Returns complete response as `{ text: string }`. Progressive reveal is achieved by batch-level parallelism in `useSimulator.ts`, not token-level streaming.

**Implementation:**
- Validates both `system` and `user` are non-empty strings; returns 400 if invalid
- Calls Anthropic API: model `claude-sonnet-4-6`, max_tokens 1200
- Server-side exponential backoff on 429/529: up to 3 retries, delays 3s → 6s → 12s
- Returns `{ text: string }` on success
- Returns `{ error: string }` with status 500 (or 400 for validation) on failure

---

## PDF Handling

**Library:** `pdfjs-dist` (client-side only, loaded dynamically to avoid SSR issues).

**Flow:**
1. User selects a PDF in `FileUpload.tsx`
2. Client-side validation: reject files > 10 MB with a friendly error message
3. `pdfjs-dist` loads the file and extracts text from all pages
4. If extraction fails or yields no text: display "Could not extract text from this PDF. Only text-layer PDFs are supported."
5. Extracted text is truncated to **8,000 characters** at a raw character boundary. If truncated, append `" [truncated]"` to the content so the model knows the input is incomplete.
6. Stored as `{ name: string; content: string }` in `uploadedFile` store field
7. `FileUpload.tsx` displays confirmation using the **post-truncation** length:
   - If not truncated: `"Context loaded: {filename} ({charCount} chars)"`
   - If truncated: `"Context loaded: {filename} (8,000 chars, truncated)"`

---

## UI Design

### Theme

Dark professional dashboard. shadcn/ui with custom CSS variables in `globals.css`:
- Background: `#06060a`
- Card surface: `#0d0d14`
- Border: `#1a1a28`
- Primary accent: `#7c5cf6` (purple)
- Body font: IBM Plex Sans
- Mono font: JetBrains Mono

### Page layout

```
HEADER
  EQR wordmark | "Scenario Simulator" | EN/FI toggle (disabled during run) | History button
────────────────────────────────────────────────────
SCENARIO INPUT PANEL
  Textarea (scenario entry)
  Preset buttons row (7 presets)
  PDF upload zone → shows "Context: {filename}" when loaded
  RUN button (disabled when runStatus === 'running' OR replayRun !== null)
────────────────────────────────────────────────────
AGENT GRID
  2-col desktop, 1-col mobile
  7 × AgentCard [idle | loading | done | error]
────────────────────────────────────────────────────
RESULTS (visible once runStatus === 'done')
  [Price Impact Chart]  [Confidence Scores]
  [Synthesis Report — full width]
────────────────────────────────────────────────────
```

### AgentCard states

| State | Visual |
|---|---|
| Idle | Muted card, no content |
| Loading | Agent-color left border pulse animation, "Analyzing…" text |
| Done | Sentiment badge (colored) + confidence %, 2-line collapsed preview; click to expand full text |
| Error | Red border, error message, "Retry" button |

### PriceImpactChart

Recharts horizontal `BarChart`. One grouped bar per agent showing `low` → `high` price impact range. Color-coded by agent color. X-axis: percentage. Chart only renders when at least one agent has a non-null `priceImpact`.

### ConfidenceGauge

shadcn `Progress` component, one per agent. Agent name label on left, confidence % on right. Bar filled with agent color. Only renders agents with non-null confidence.

### HistoryDrawer

shadcn `Sheet` (right side, 400px wide). Each `HistoryEntry`:
- Scenario text truncated to 80 chars
- Formatted date/time
- Row of 7 colored dots: green = BULLISH, red = BEARISH, grey = NEUTRAL
- Click → calls `store.setReplayRun(run)`; closes drawer

**Replay mode** (`replayRun !== null`):
- Page renders `replayRun.responses` and `replayRun.synthesis` instead of live store state
- All inputs (textarea, preset buttons, file upload, Run button, lang toggle) are disabled
- Run button is disabled while `replayRun !== null`; to start a new run the user must exit replay mode first
- A "Back to live view" button calls `store.setReplayRun(null)` to exit replay mode and re-enable all inputs
- Scenario textarea shows `replayRun.scenario` (read-only)

---

## Localization (`lib/i18n.ts`)

No i18n library. All UI strings are defined in a typed dictionary:

```typescript
// lib/i18n.ts
const UI = {
  en: {
    runButton: 'Run Analysis',
    analyzing: 'Analyzing…',
    synthesis: 'Synthesis Report',
    history: 'History',
    uploadPrompt: 'Upload PDF context',
    langToggle: 'FI',
    confidence: 'Confidence',
    priceImpact: 'Price Impact',
    noHistory: 'No previous runs.',
    retryAgent: 'Retry',
    // … etc.
  },
  fi: {
    runButton: 'Aja analyysi',
    analyzing: 'Analysoi…',
    synthesis: 'Synteesiraportti',
    history: 'Historia',
    uploadPrompt: 'Lataa PDF-konteksti',
    langToggle: 'EN',
    confidence: 'Luottamus',
    priceImpact: 'Hintavaikutus',
    noHistory: 'Ei aiempia ajoja.',
    retryAgent: 'Yritä uudelleen',
    // … etc.
  },
} as const
export const t = (lang: Lang) => UI[lang]
```

Components call `t(lang).runButton` etc. All agent names and system prompts have EN/FI variants in `lib/agents.ts`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Single agent API failure | Card shows error state with "Retry" button; other agents unaffected; run continues |
| 1–6 agents fail | Run continues; `runStatus: 'done'`; synthesis proceeds with available responses |
| All 7 agents fail | `runStatus: 'error'`; top-level error banner; full retry button; synthesis skipped |
| PDF > 10 MB | Client-side validation before extraction; friendly error inline in `FileUpload` |
| Non-text / image PDF | `pdfjs-dist` yields empty string; display "Could not extract text from this PDF" |
| Synthesis fails | Inline error in `SynthesisPanel`; agent responses remain visible; `runStatus: 'done'` |
| localStorage quota exceeded | Catch `QuotaExceededError`; prune 5 oldest runs; retry save; silent to user |
| localStorage schema mismatch | Wipe `'eqr-history'` key; start fresh; silent to user |
| User aborts mid-run | `reset()` → `AbortController.abort()`; aborted fetches silently ignored |

---

## Configuration

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Read server-side only via `process.env.ANTHROPIC_API_KEY` in `app/api/claude/route.ts`. Never referenced in client-side code.

---

## Out of Scope (v1)

- Debate mode
- Devil's advocate
- Chain mode (cumulative context across scenarios)
- Timeline view
- Authentication / multi-user
- Server-side persistence
- Mobile-optimized layout (desktop-first; readable on mobile but not optimized)
- Token-level streaming
- PDF server-side processing
