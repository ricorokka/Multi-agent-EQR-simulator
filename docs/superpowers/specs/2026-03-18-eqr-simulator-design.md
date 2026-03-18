# EQR Scenario Simulator — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Project:** `/Users/ricorokka/eqr-simulator`

---

## Overview

A professional multi-agent investment scenario simulator for EQ Resources (ASX:EQR), a tungsten producer. Seven AI agents with distinct investment perspectives analyze user-defined scenarios and produce a synthesis report. Designed as a personal research tool credible enough to share with a small group of investors.

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Recharts, Anthropic claude-sonnet-4-6.

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
│   ├── ui/                      # shadcn primitives (Button, Card, Badge, Sheet, etc.)
│   ├── scenario/
│   │   ├── ScenarioInput.tsx    # Textarea + run button
│   │   ├── PresetPicker.tsx     # Preset scenario buttons (EN/FI)
│   │   └── FileUpload.tsx       # PDF upload, FileReader extraction, 8000-char slice
│   ├── agents/
│   │   ├── AgentGrid.tsx        # Responsive 2-col grid of agent cards
│   │   ├── AgentCard.tsx        # Collapsible card: idle / loading / done states
│   │   └── SentimentBadge.tsx   # BULLISH / BEARISH / NEUTRAL chip with color
│   ├── results/
│   │   ├── SynthesisPanel.tsx   # Synthesis report, markdown-rendered
│   │   ├── PriceImpactChart.tsx # Recharts horizontal BarChart, per-agent low/high range
│   │   └── ConfidenceGauge.tsx  # Horizontal progress bars per agent (agent color)
│   └── history/
│       ├── HistoryDrawer.tsx    # shadcn Sheet slide-out, lists past runs
│       └── HistoryEntry.tsx     # Run card: scenario text, date, 7 sentiment dots
│
├── hooks/
│   ├── useSimulator.ts          # Orchestrates run: batching [3,2,2], progressive reveal
│   └── useHistory.ts            # Read/write HistoryRun[] to localStorage
│
├── lib/
│   ├── agents.ts                # Agent definitions: id, name EN/FI, icon, color, system prompt
│   ├── context.ts               # EQR background context strings (EN + FI)
│   ├── presets.ts               # Preset scenarios (EN + FI arrays)
│   ├── prompts.ts               # buildSystemPrompt(), buildUserPrompt()
│   ├── parse.ts                 # parseSentiment(), parseConfidence(), parsePriceImpact()
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
type AgentId = 'institutional' | 'retail' | 'short_seller' | 'analyst' | 'defense' | 'management' | 'macro'
type Lang = 'en' | 'fi'
type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL'
type RunStatus = 'idle' | 'running' | 'done' | 'error'

interface Agent {
  id: AgentId
  name: Record<Lang, string>
  icon: string
  color: string                  // hex, used for border/badge/chart
  systemPrompt: Record<Lang, string>
}

interface AgentResponse {
  text: string
  sentiment: Sentiment
  confidence: number | null      // 0-100, parsed from response
  priceImpact: { low: number; high: number } | null  // %, parsed from response
}

interface HistoryRun {
  id: string                     // nanoid
  timestamp: number
  scenario: string
  lang: Lang
  responses: Record<AgentId, AgentResponse>
  synthesis: string
}
```

### Zustand store (`store/simulatorStore.ts`)

```typescript
interface SimulatorState {
  lang: Lang
  scenario: string
  uploadedFile: { name: string; content: string } | null
  responses: Record<AgentId, AgentResponse>
  loading: Record<AgentId, boolean>
  synthesis: string
  isSynthesizing: boolean
  runStatus: RunStatus
  error: string | null

  setLang: (lang: Lang) => void
  setScenario: (text: string) => void
  setUploadedFile: (file: { name: string; content: string } | null) => void
  setAgentResponse: (agentId: AgentId, response: AgentResponse) => void
  setAgentLoading: (agentId: AgentId, loading: boolean) => void
  setSynthesis: (text: string) => void
  setRunStatus: (status: RunStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}
```

---

## Data Flow

### Scenario run orchestration (`hooks/useSimulator.ts`)

```
User clicks RUN
  → reset() store
  → set runStatus: 'running'
  → split AGENTS into batches: [[0,1,2], [3,4], [5,6]]
  → for each batch (sequential):
      → mark all agents in batch as loading: true
      → Promise.all(batch.map(agent => callAgent(agent)))
      → as each resolves (via Promise.allSettled per agent):
          → parse response text → AgentResponse
          → store.setAgentResponse(agentId, response)
          → store.setAgentLoading(agentId, false)
          → agent card appears on screen
  → once all 7 done:
      → set isSynthesizing: true
      → call synthesis endpoint
      → store.setSynthesis(text)
      → set isSynthesizing: false
      → set runStatus: 'done'
      → useHistory.save(run) → localStorage
```

### History persistence (`hooks/useHistory.ts`)

- Key: `'eqr-history'` in localStorage
- Format: `HistoryRun[]` serialized as JSON
- Max 50 runs; oldest pruned when limit exceeded
- `useHistory()` returns `{ runs, save, remove, clear }`

---

## Prompt Design (`lib/prompts.ts`)

### System prompt structure

```
{agent persona}

BACKGROUND CONTEXT:
{EQR context — from lib/context.ts, in selected lang}

{if uploadedFile}: ADDITIONAL CONTEXT FROM {filename}:
{uploadedFile.content}

RESPONSE FORMAT:
End your analysis with exactly:
Confidence: X%
Price impact: -X% to +X%
```

The explicit format instruction ensures `lib/parse.ts` reliably extracts structured data from every response.

### User prompt

```
SCENARIO: {scenario text}

Analyze this scenario. What does it mean for EQ Resources (ASX:EQR)?
```

---

## Parsing (`lib/parse.ts`)

All pure functions, no side effects:

| Function | Input | Output |
|---|---|---|
| `parseSentiment` | response text | `'BULLISH' \| 'BEARISH' \| 'NEUTRAL'` |
| `parseConfidence` | response text | `number \| null` (0–100) |
| `parsePriceImpact` | response text | `{ low, high } \| null` |

`parseSentiment`: uppercases first 80 chars, looks for BULLISH/BEARISH keywords.
`parseConfidence`: regex `/confidence:\s*(\d+)%/i`.
`parsePriceImpact`: regex matching patterns like `-10% to +25%`, `+5%→+30%`, `-10%–+20%`.

---

## API Route (`app/api/claude/route.ts`)

- Validates `system` and `user` fields present
- Calls Anthropic API: model `claude-sonnet-4-6`, max_tokens 1200
- Server-side exponential backoff on 429/529 (up to 3 retries, delays: 3s, 6s, 12s)
- Returns `{ text: string }` on success, `{ error: string }` with appropriate status on failure
- API key read from `process.env.ANTHROPIC_API_KEY` (never exposed to client)

---

## UI Design

### Theme

Dark professional dashboard. shadcn/ui with custom CSS variables:
- Background: `#06060a` (near-black)
- Card surface: `#0d0d14`
- Border: `#1a1a28`
- Accent: `#7c5cf6` (purple) for primary actions
- Font: IBM Plex Sans (body), JetBrains Mono (data/code)

### Page layout

```
HEADER: EQR wordmark | "Scenario Simulator" | EN/FI toggle | History button
─────────────────────────────────────────────
SCENARIO INPUT PANEL
  Textarea (scenario entry)
  Preset buttons row
  PDF upload zone
  RUN button
─────────────────────────────────────────────
AGENT GRID (2-col desktop, 1-col mobile)
  7 × AgentCard [idle | loading | done]
─────────────────────────────────────────────
RESULTS (visible after all agents done)
  Price Impact Chart (left) | Confidence Scores (right)
  Synthesis Report (full width)
─────────────────────────────────────────────
```

### AgentCard states

| State | Visual |
|---|---|
| Idle | Muted, no content |
| Loading | Agent-color pulse animation, "Analyzing…" text |
| Done | Sentiment badge + confidence %, 2-line preview, click to expand |

### PriceImpactChart

Recharts horizontal `BarChart`. One bar per agent showing low→high price impact range. Color-coded by agent color. X-axis: percentage. Appears only when at least one agent has a parseable price impact.

### ConfidenceGauge

Horizontal `Progress` bars (shadcn), one per agent, agent color. Label: agent name + confidence %.

### HistoryDrawer

shadcn `Sheet` (right side). Each `HistoryEntry` shows:
- Scenario text (truncated to 80 chars)
- Date/time
- Row of 7 colored sentiment dots (green=BULLISH, red=BEARISH, grey=NEUTRAL)
- Click → reload run into main view (read-only)

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Single agent API failure | Card shows inline error + retry button; other agents unaffected |
| All agents fail | `runStatus: 'error'`, top-level error banner, full retry |
| PDF > 10MB | Client-side validation, friendly error before upload |
| Non-text PDF | Graceful fallback message: "Could not extract text from this PDF" |
| Synthesis fails | Synthesis panel shows error inline; agent responses remain visible |
| localStorage quota exceeded | Prune oldest runs until save succeeds; silent to user |

---

## Out of Scope (v1)

- Debate mode
- Devil's advocate
- Chain mode (cumulative context across scenarios)
- Timeline view
- Authentication / multi-user
- Server-side persistence
- Mobile-optimized layout (desktop-first, readable on mobile)
