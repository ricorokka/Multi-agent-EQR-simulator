// app/api/market-data/route.ts
import type { MarketData } from '@/lib/marketData'

const SHARES_ON_ISSUE = 4.88e9 // stable, not fetched live
const CACHE_TTL = 12 * 60 * 60 * 1000

const FALLBACK: MarketData = {
  sharePrice: 0.29,
  marketCap: 1.42,
  aptPrice: 2800,
  audUsd: 0.63,
  fetchedAt: new Date(0).toISOString(),
  stale: true,
}

let cache: { data: MarketData; fetchedAt: number } | null = null

// ── Yahoo Finance v8 chart ─────────────────────────────────────────────────────

async function fetchYahooChart(symbol: string): Promise<number | null> {
  try {
    const encoded = encodeURIComponent(symbol)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; eqr-simulator/1.0)' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    return meta.regularMarketPrice ?? meta.chartPreviousClose ?? null
  } catch {
    return null
  }
}

async function fetchYahoo(): Promise<{ sharePrice: number; audUsd: number } | null> {
  const [sharePrice, audUsd] = await Promise.all([
    fetchYahooChart('EQR.AX'),
    fetchYahooChart('AUDUSD=X'),
  ])

  if (!sharePrice || !audUsd) return null
  if (sharePrice < 0.001 || sharePrice > 100) return null
  if (audUsd < 0.3 || audUsd > 2) return null

  return { sharePrice, audUsd }
}

// ── APT price: Mining.com ─────────────────────────────────────────────────────

async function fetchAPTMiningCom(): Promise<number | null> {
  try {
    const res = await fetch('https://www.mining.com/markets/commodity/tungsten/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; eqr-simulator/1.0)' },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const html = await res.text()

    // Try several patterns that Mining.com might use
    const patterns = [
      /APT[^<]*?([\d,]+(?:\.\d+)?)\s*USD\/mtu/i,
      /tungsten[^<]*?([\d,]+(?:\.\d+)?)\s*(?:USD)?\/mtu/i,
      /([\d,]+(?:\.\d+)?)\s*USD\/mtu/i,
      /"price"[^:]*:\s*"?([\d,]+(?:\.\d+)?)"?/,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''))
        if (price >= 100 && price <= 10_000) return price
      }
    }
    return null
  } catch {
    return null
  }
}

// ── APT price: Fastmarkets (public page) ──────────────────────────────────────

async function fetchAPTFastmarkets(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://www.fastmarkets.com/commodities/minor-metals/ammonium-paratungstate/',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; eqr-simulator/1.0)' },
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null
    const html = await res.text()

    const patterns = [
      /([\d,]+(?:\.\d+)?)\s*USD\/mtu/i,
      /APT[^<]*?([\d,]+(?:\.\d+)?)/i,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''))
        if (price >= 100 && price <= 10_000) return price
      }
    }
    return null
  } catch {
    return null
  }
}

async function fetchAPTPrice(): Promise<number | null> {
  const miningCom = await fetchAPTMiningCom()
  if (miningCom !== null) return miningCom

  const fastmarkets = await fetchAPTFastmarkets()
  if (fastmarkets !== null) return fastmarkets

  return null
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now()

  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return Response.json(cache.data)
  }

  const [yahoo, aptPrice] = await Promise.all([fetchYahoo(), fetchAPTPrice()])

  if (!yahoo) {
    // Complete failure — return fallback but update fetchedAt so UI shows "now"
    const staleData: MarketData = { ...FALLBACK, fetchedAt: new Date(now).toISOString() }
    return Response.json(staleData)
  }

  const data: MarketData = {
    sharePrice: yahoo.sharePrice,
    marketCap: Math.round(((yahoo.sharePrice * SHARES_ON_ISSUE) / 1e9) * 100) / 100,
    aptPrice: aptPrice ?? FALLBACK.aptPrice,
    audUsd: yahoo.audUsd,
    fetchedAt: new Date(now).toISOString(),
    stale: aptPrice === null, // stale only if APT had to fall back
  }

  cache = { data, fetchedAt: now }
  return Response.json(data)
}
