// hooks/useAPTOverride.ts
import { useState, useEffect } from 'react'

export interface APTOverride {
  price: number
  setAt: string // ISO timestamp
}

const STORAGE_KEY = 'eqr-apt-override'

export function useAPTOverride() {
  const [override, setOverrideState] = useState<APTOverride | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setOverrideState(JSON.parse(stored))
    } catch {}
  }, [])

  const setOverride = (price: number) => {
    const val: APTOverride = { price, setAt: new Date().toISOString() }
    setOverrideState(val)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch {}
  }

  const clearOverride = () => {
    setOverrideState(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return { override, setOverride, clearOverride }
}
