// components/scenario/FileUpload.tsx
'use client'
import { useRef, useState } from 'react'
import type { UIStrings } from '@/lib/i18n'
import type { UploadedFile } from '@/lib/types'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_CHARS = 8000
const MAX_FILES = 5

interface FileUploadProps {
  uploadedFiles: UploadedFile[]
  onAdd: (file: UploadedFile) => void
  onRemove: (name: string) => void
  disabled: boolean
  strings: UIStrings
}

export function FileUpload({ uploadedFiles, onAdd, onRemove, disabled, strings }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    if (uploadedFiles.length >= MAX_FILES) {
      setError(strings.uploadErrorMax)
      return
    }
    if (uploadedFiles.some(f => f.name === file.name)) {
      setError(strings.uploadErrorDuplicate)
      return
    }
    if (file.size > MAX_SIZE) {
      setError(strings.uploadErrorSize)
      return
    }
    setExtracting(true)
    try {
      let fullText = ''

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
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
          textParts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
        }
        fullText = textParts.join('\n')
        if (!fullText.trim()) {
          setError('This PDF appears to be scanned (image-only). No text could be extracted.')
          return
        }
      } else {
        fullText = await file.text()
        if (!fullText.trim()) {
          setError('File appears to be empty.')
          return
        }
      }

      const truncated = fullText.length > MAX_CHARS
      const content = truncated ? fullText.slice(0, MAX_CHARS) + ' [truncated]' : fullText
      onAdd({ name: file.name, content })
    } catch {
      setError(strings.uploadErrorText)
    } finally {
      setExtracting(false)
      // Reset input so the same file can be re-selected after removal
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const openPicker = () => {
    if (!disabled && !extracting) inputRef.current?.click()
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.txt,.md"
      className="hidden"
      onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
    />
  )

  // Empty state — show drop zone
  if (uploadedFiles.length === 0) {
    return (
      <div>
        <div
          className="rounded-lg px-4 py-3 text-center cursor-pointer hover:border-slate-600 transition-colors"
          style={{ background: '#0d0d14', border: '1px dashed #1a1a28' }}
          onClick={openPicker}
        >
          <p className="text-xs text-slate-600">
            {extracting ? 'Extracting…' : strings.uploadHint}
          </p>
        </div>
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
        {hiddenInput}
      </div>
    )
  }

  // Files attached — show list
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}
    >
      {uploadedFiles.map((file) => {
        const wasTruncated = file.content.endsWith('[truncated]')
        const chars = wasTruncated ? MAX_CHARS : file.content.length
        return (
          <div
            key={file.name}
            className="flex items-center justify-between px-3 py-2 text-xs border-b"
            style={{ borderColor: '#1a1a28' }}
          >
            <span className="text-slate-400 font-mono truncate flex-1 mr-2">
              {strings.uploadSuccess(file.name, chars, wasTruncated)}
            </span>
            <button
              onClick={() => onRemove(file.name)}
              disabled={disabled}
              className="text-slate-600 hover:text-slate-300 font-mono text-[10px] shrink-0"
            >
              {strings.removeFile}
            </button>
          </div>
        )
      })}
      {uploadedFiles.length < MAX_FILES && (
        <div
          className="px-3 py-2 text-[11px] font-mono text-slate-600 hover:text-slate-400 cursor-pointer transition-colors"
          onClick={openPicker}
        >
          {extracting ? 'Extracting…' : strings.uploadAddAnother}
        </div>
      )}
      {error && <p className="text-[11px] text-red-400 px-3 pb-2">{error}</p>}
      {hiddenInput}
    </div>
  )
}
