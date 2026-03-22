// components/results/ExportButton.tsx
'use client'
import { RefObject, useState } from 'react'
import type { UIStrings } from '@/lib/i18n'
import { shareAsZip } from '@/lib/shareExport'

interface ExportButtonsProps {
  targetRef: RefObject<HTMLDivElement | null>
  shareRefs: RefObject<HTMLDivElement | null>[]
  scenario: string
  strings: UIStrings
}

export function ExportButtons({ targetRef, shareRefs, scenario, strings }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleDownload = async () => {
    const el = targetRef.current
    if (!el) { setExportError('Export target not found.'); return }
    setExporting(true)
    setExportError(null)
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(el, { backgroundColor: '#06060a', pixelRatio: 2 })
      if (!blob) throw new Error('Export produced no image data')
      const slug = scenario.slice(0, 40).replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
      const date = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `EQR-${slug}-${date}.png`
      link.href = url
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setExportError((err as Error)?.message ?? 'Export failed')
      console.error('[ExportButtons] download error:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    const elements = shareRefs.flatMap(r => r.current ? [r.current] : [])
    if (elements.length === 0) { setExportError('No content to share.'); return }
    setSharing(true)
    setExportError(null)
    try {
      await shareAsZip(elements, scenario)
    } catch (err: unknown) {
      setExportError((err as Error)?.message ?? 'Share failed')
      console.error('[ExportButtons] share error:', err)
    } finally {
      setSharing(false)
    }
  }

  const busy = exporting || sharing

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
        >
          {exporting ? '…' : strings.downloadReport}
        </button>
        <button
          onClick={handleShare}
          disabled={busy}
          className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
        >
          {sharing ? '…' : strings.shareButton}
        </button>
      </div>
      {exportError && (
        <span className="font-mono text-[9px] text-red-400">{exportError}</span>
      )}
    </div>
  )
}
