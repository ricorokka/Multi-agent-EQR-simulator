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
