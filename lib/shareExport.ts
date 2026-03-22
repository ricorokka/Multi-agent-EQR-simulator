// lib/shareExport.ts
const SHARE_WIDTH = 1200
const SHARE_HEIGHT = 1350
const FOOTER_HEIGHT = 50
const CONTENT_HEIGHT = SHARE_HEIGHT - FOOTER_HEIGHT // 1300px usable

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

/**
 * Returns a list of [startY, endY] DOM-px ranges for the element, each fitting
 * within maxSliceHeightDom. Splits at logical paragraph/heading boundaries.
 */
function computeSlices(el: HTMLElement, maxSliceHeightDom: number): Array<[number, number]> {
  const totalHeight = el.offsetHeight
  if (totalHeight <= maxSliceHeightDom) return [[0, totalHeight]]

  const containerRect = el.getBoundingClientRect()
  const bpSet = new Set<number>([0, totalHeight])

  el.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre').forEach(child => {
    const top = Math.round((child as HTMLElement).getBoundingClientRect().top - containerRect.top)
    if (top > 0 && top < totalHeight) bpSet.add(top)
  })

  const bps = [...bpSet].sort((a, b) => a - b)

  const slices: Array<[number, number]> = []
  let start = 0

  while (start < totalHeight) {
    // Walk breakpoints to find the furthest one still within range
    let end = start
    for (const bp of bps) {
      if (bp <= start) continue
      if (bp - start <= maxSliceHeightDom) end = bp
      else break
    }
    if (end === start) {
      // Single block taller than the page — force-cut
      end = Math.min(start + maxSliceHeightDom, totalHeight)
    }
    slices.push([start, end])
    start = end
  }

  return slices
}

async function compositeSlice(
  img: HTMLImageElement,
  pixelRatio: number,
  startY: number,
  endY: number,
  pageIndex: number,
  totalPages: number,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Dark background
  ctx.fillStyle = '#06060a'
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  // Draw slice — img.naturalWidth is already SHARE_WIDTH (1200px), so pixel coords map 1:1
  const srcY = startY * pixelRatio
  const srcH = (endY - startY) * pixelRatio
  ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, SHARE_WIDTH, srcH)

  // Footer bar
  const footerY = SHARE_HEIGHT - FOOTER_HEIGHT
  ctx.fillStyle = '#0d0d14'
  ctx.fillRect(0, footerY, SHARE_WIDTH, FOOTER_HEIGHT)

  ctx.strokeStyle = '#1a1a28'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, footerY + 0.5)
  ctx.lineTo(SHARE_WIDTH, footerY + 0.5)
  ctx.stroke()

  ctx.fillStyle = '#64748b'
  ctx.font = '400 13px "Courier New", monospace'
  ctx.textBaseline = 'middle'
  const midY = footerY + FOOTER_HEIGHT / 2

  ctx.textAlign = 'left'
  ctx.fillText('EQR Multi-Agent Simulator', 24, midY)

  ctx.textAlign = 'right'
  ctx.fillText(`${pageIndex + 1} / ${totalPages}`, SHARE_WIDTH - 24, midY)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => {
        if (!b) return reject(new Error('Canvas PNG export failed'))
        b.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject)
      },
      'image/png',
    )
  })
}

export async function shareAsZip(
  elements: HTMLElement[],
  scenario: string,
): Promise<void> {
  const { zip } = await import('fflate')
  const { toBlob } = await import('html-to-image')

  // Pass 1: measure slices for every element so we know the total image count upfront
  const plan = elements.map(el => {
    const pixelRatio = SHARE_WIDTH / el.offsetWidth
    const maxSliceHeightDom = CONTENT_HEIGHT / pixelRatio
    return { el, pixelRatio, slices: computeSlices(el, maxSliceHeightDom) }
  })
  const totalImages = plan.reduce((n, p) => n + p.slices.length, 0)

  // Pass 2: capture each element once, then composite each of its slices
  const files: Record<string, Uint8Array> = {}
  let pageIndex = 0

  for (const { el, pixelRatio, slices } of plan) {
    const blob = await toBlob(el, { backgroundColor: '#06060a', pixelRatio })
    if (!blob) throw new Error('Capture produced no image data')
    const img = await loadImage(blob)

    for (const [startY, endY] of slices) {
      const png = await compositeSlice(img, pixelRatio, startY, endY, pageIndex, totalImages)
      files[`EQR-share-${String(pageIndex + 1).padStart(2, '0')}.png`] = png
      pageIndex++
    }
  }

  // Zip and trigger download
  const slug = scenario
    .slice(0, 40)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `EQR-${slug}-${date}-share.zip`

  return new Promise((resolve, reject) => {
    zip(files, (err, data) => {
      if (err) return reject(err)
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = filename
      link.href = url
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      resolve()
    })
  })
}
