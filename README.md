# EQR Multi-Agent Scenario Simulator

A multi-agent AI tool for analyzing investment scenarios for [EQ Resources Limited (ASX:EQR)](https://www.eqresources.com.au/), the largest non-Chinese tungsten producer globally.

Seven AI agents — each with a distinct investment perspective — analyze any scenario in parallel, then a synthesis report and devil's advocate challenge are generated automatically.

## Features

- **7 parallel AI agents** — Institutional Investor, Retail Speculator, Short Seller, Industry Analyst, Defense Procurement, EQR Management, Macro Strategist
- **Synthesis report** — senior strategist synthesizes all agent views into a coherent investment report
- **Devil's advocate** — contrarian analyst challenges the synthesis for overlooked risks
- **Live market data** — EQR share price and AUD/USD fetched automatically from Yahoo Finance (12h cache); APT tungsten price manually editable and persisted in localStorage
- **Comprehensive company fundamentals** — H1 FY2026 production, financials, capital structure, and assets injected into every agent prompt
- **PNG export** — save the full analysis as an image
- **Share export** — copy analysis as formatted text
- **Run history** — browse and replay previous analyses
- **Bilingual** — full Finnish and English UI and agent responses
- **File upload** — attach PDFs, TXT, or MD files as additional context (up to 5 × 10 MB)

## Setup

**1. Clone and install**
```bash
git clone https://github.com/ricorokka/Multi-agent-EQR-simulator.git
cd Multi-agent-EQR-simulator
npm install
```

**2. Configure API key**
```bash
cp .env.example .env.local
```
Get your API key from [console.anthropic.com](https://console.anthropic.com), then paste it into `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Run**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, API routes
- **[Claude API](https://docs.anthropic.com/)** — claude-sonnet-4-6 for all agent and synthesis calls
- **TypeScript** — full type coverage
- **[Tailwind CSS v4](https://tailwindcss.com/)** — styling
- **[Zustand](https://zustand-demo.pmnd.rs/)** — client state
- **[Recharts](https://recharts.org/)** — price impact and confidence visualizations
- **[Radix UI](https://www.radix-ui.com/)** — accessible UI primitives

## APT Tungsten Price

APT (Ammonium Paratungstate) is OTC-traded with no free public API. The share price and AUD/USD rate are fetched live from Yahoo Finance. The APT price defaults to a manually maintained fallback — click the pencil icon next to the APT price in the header to update it. The value persists in `localStorage`.
