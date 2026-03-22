// lib/marketData.ts

export interface MarketData {
  sharePrice: number   // AUD
  marketCap: number    // AUD billions
  aptPrice: number     // USD/mtu
  audUsd: number       // exchange rate
  fetchedAt: string    // ISO timestamp
  stale: boolean       // true if fallback was used
}

export const MARKET_DATA_FALLBACK: MarketData = {
  sharePrice: 0.29,
  marketCap: 1.42,
  aptPrice: 2800,
  audUsd: 0.63,
  fetchedAt: new Date(0).toISOString(),
  stale: true,
}

export async function fetchMarketData(): Promise<MarketData> {
  const res = await fetch('/api/market-data')
  if (!res.ok) return MARKET_DATA_FALLBACK
  const data = await res.json().catch(() => null)
  if (!data || data.error) return MARKET_DATA_FALLBACK
  return data as MarketData
}
