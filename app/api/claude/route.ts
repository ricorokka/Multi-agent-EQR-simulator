// app/api/claude/route.ts
import { NextRequest } from 'next/server'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { system, user } = body

    if (!system || typeof system !== 'string' || !system.trim()) {
      return Response.json({ error: 'Missing required field: system' }, { status: 400 })
    }
    if (!user || typeof user !== 'string' || !user.trim()) {
      return Response.json({ error: 'Missing required field: user' }, { status: 400 })
    }

    const DELAYS = [3000, 6000, 12000]
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      })

      if (response.status === 429 || response.status === 529) {
        lastError = new Error(`Rate limited (${response.status})`)
        if (attempt < 2) await sleep(DELAYS[attempt])
        continue
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error?.message || `API error ${response.status}`)
      }

      const text: string = data.content
        ?.filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n') || ''

      return Response.json({ text })
    }

    throw lastError ?? new Error('Max retries exceeded')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
