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
