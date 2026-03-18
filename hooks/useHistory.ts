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
