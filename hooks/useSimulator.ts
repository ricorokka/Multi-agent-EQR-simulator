// hooks/useSimulator.ts
import { useRef, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { AGENTS } from '@/lib/agents'
import type { AgentId, AgentResponse, HistoryRun, Lang } from '@/lib/types'
import { AGENT_IDS } from '@/lib/types'
import { buildSystemPrompt, buildUserPrompt, buildSynthesisPrompt, buildDevilsAdvocatePrompt } from '@/lib/prompts'
import { parseSentiment, parseConfidence, parsePriceImpact } from '@/lib/parse'
import { useSimulatorStore } from '@/store/simulatorStore'
import type { MarketData } from '@/lib/marketData'

// NOTE: useHistory is NOT called here — useSimulator accepts a `save` callback
// so the single useHistory() instance in page.tsx owns the runs state.

const BATCHES: AgentId[][] = [
  ['institutional', 'retail', 'short_seller'],
  ['analyst', 'defense'],
  ['management', 'macro'],
]

async function callClaude(system: string, user: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text ?? ''
}

function parseResponse(text: string): AgentResponse {
  return {
    text,
    sentiment: parseSentiment(text),
    confidence: parseConfidence(text),
    priceImpact: parsePriceImpact(text),
  }
}

export function useSimulator(save: (run: HistoryRun) => void, marketData: MarketData | null) {
  const store = useSimulatorStore()
  const marketDataRef = useRef<MarketData | null>(marketData)
  marketDataRef.current = marketData
  const abortRef = useRef<AbortController | null>(null)
  // Separate abort handle for retryAgent so startRun can cancel in-flight retries.
  const retryAbortRef = useRef<AbortController | null>(null)
  const synthRetryAbortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef<string>('')
  const snapshotLangRef = useRef<Lang>('fi')

  const runSynthesis = useCallback(async (
    responses: Partial<Record<AgentId, AgentResponse>>,
    lang: Lang,
    runId: string,
    signal: AbortSignal,
    existingResponses: Record<AgentId, AgentResponse>
  ) => {
    store.setRunStatus('running')
    store.setIsSynthesizing(true)
    const { system, user } = buildSynthesisPrompt(responses, lang)
    try {
      const text = await callClaude(system, user, signal)
      store.setSynthesis(text)
      store.setSynthesisLang(lang)
      store.setSynthesisError(null)
      const run: HistoryRun = {
        schemaVersion: 1,
        id: runId,
        timestamp: Date.now(),
        scenario: store.scenario,
        lang,
        responses: existingResponses,
        synthesis: text,
      }
      save(run)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      store.setSynthesis(null)
      store.setSynthesisLang(null)
      store.setSynthesisError((err as Error)?.message ?? 'Synthesis failed')
      const run: HistoryRun = {
        schemaVersion: 1,
        id: runId,
        timestamp: Date.now(),
        scenario: store.scenario,
        lang,
        responses: existingResponses,
        synthesis: null,
      }
      save(run)
    } finally {
      store.setIsSynthesizing(false)
      store.setRunStatus('done')
    }
  }, [store, save])

  const startRun = useCallback(async () => {
    // Abort any existing run, retries, or synthesis retries
    abortRef.current?.abort()
    retryAbortRef.current?.abort()
    synthRetryAbortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    const lang = store.lang
    snapshotLangRef.current = lang
    const runId = nanoid()
    runIdRef.current = runId
    const uploadedFiles = store.uploadedFiles

    store.reset()
    store.setRunStatus('running')

    const allResponses: Partial<Record<AgentId, AgentResponse>> = {}

    for (const batch of BATCHES) {
      // Mark batch as loading
      for (const agentId of batch) {
        store.setAgentLoading(agentId, true)
      }

      const results = await Promise.allSettled(
        batch.map(async (agentId) => {
          const agent = AGENTS.find(a => a.id === agentId)!
          const system = buildSystemPrompt(agent, lang, uploadedFiles, marketDataRef.current)
          const user = buildUserPrompt(store.scenario, lang)
          const text = await callClaude(system, user, signal)
          return { agentId, text }
        })
      )

      for (let i = 0; i < batch.length; i++) {
        const agentId = batch[i]
        const result = results[i]
        if (result.status === 'fulfilled') {
          const parsed = parseResponse(result.value.text)
          allResponses[agentId] = parsed
          store.setAgentResponse(agentId, parsed)
        } else {
          if ((result.reason as Error)?.name === 'AbortError') {
            store.setAgentLoading(agentId, false)
            continue
          }
          const errResponse: AgentResponse = {
            text: '',
            sentiment: 'NEUTRAL',
            confidence: null,
            priceImpact: null,
            error: (result.reason as Error)?.message ?? 'Failed',
          }
          allResponses[agentId] = errResponse
          store.setAgentResponse(agentId, errResponse)
        }
        store.setAgentLoading(agentId, false)
      }

      if (signal.aborted) return
    }

    // Check if all failed
    const successful = Object.values(allResponses).filter(r => r && !r.error)
    if (successful.length === 0) {
      store.setRunStatus('error')
      store.setError('All agents failed to respond.')
      return
    }

    await runSynthesis(allResponses, lang, runId, signal, allResponses as Record<AgentId, AgentResponse>)
  }, [store, runSynthesis])

  const retryAgent = useCallback(async (agentId: AgentId) => {
    // Cancel any previous retry to prevent stale writes
    retryAbortRef.current?.abort()
    const controller = new AbortController()
    retryAbortRef.current = controller
    const signal = controller.signal

    const lang = snapshotLangRef.current
    const uploadedFiles = store.uploadedFiles

    store.setAgentResponse(agentId, { text: '', sentiment: 'NEUTRAL', confidence: null, priceImpact: null })
    store.setAgentLoading(agentId, true)

    try {
      const agent = AGENTS.find(a => a.id === agentId)!
      const system = buildSystemPrompt(agent, lang, uploadedFiles, marketDataRef.current)
      const user = buildUserPrompt(store.scenario, lang)
      const text = await callClaude(system, user, signal)
      const parsed = parseResponse(text)
      store.setAgentResponse(agentId, parsed)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      const errResponse: AgentResponse = {
        text: '',
        sentiment: 'NEUTRAL',
        confidence: null,
        priceImpact: null,
        error: (err as Error)?.message ?? 'Retry failed',
      }
      store.setAgentResponse(agentId, errResponse)
    } finally {
      store.setAgentLoading(agentId, false)
    }

    // Check if synthesis should be re-triggered
    const allResponses = store.responses
    const allDone = AGENT_IDS.every(id => {
      const r = allResponses[id]
      return r !== undefined && r.error === undefined
    })
    const needsSynthesis = store.synthesis === null || store.synthesisError !== null

    if (allDone && needsSynthesis) {
      const synthController = new AbortController()
      synthRetryAbortRef.current = synthController
      await runSynthesis(
        allResponses as Record<AgentId, AgentResponse>,
        lang,
        runIdRef.current,
        synthController.signal,
        allResponses as Record<AgentId, AgentResponse>
      )
    }
  }, [store, runSynthesis])

  // Retry synthesis independently (e.g. after a network failure).
  // Uses current store.lang so switching language then retrying regenerates in the new language.
  const retrySynthesis = useCallback(async () => {
    const currentResponses = store.responses
    const successful = Object.values(currentResponses).filter(r => r && !r.error)
    if (successful.length === 0) return

    synthRetryAbortRef.current?.abort()
    const controller = new AbortController()
    synthRetryAbortRef.current = controller
    const signal = controller.signal

    const lang = store.lang
    store.setIsSynthesizing(true)
    store.setSynthesisError(null)

    try {
      const { system, user } = buildSynthesisPrompt(currentResponses, lang)
      const text = await callClaude(system, user, signal)
      store.setSynthesis(text)
      store.setSynthesisLang(lang)
      store.setSynthesisError(null)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      store.setSynthesisError((err as Error)?.message ?? 'Synthesis failed')
    } finally {
      store.setIsSynthesizing(false)
    }
  }, [store])

  const triggerDevilsAdvocate = useCallback(async (synthesisOverride?: string) => {
    const synthesis = synthesisOverride ?? store.synthesis
    if (!synthesis) return
    const lang = snapshotLangRef.current
    const controller = new AbortController()

    store.setIsDevilingAdvocating(true)
    store.setDevilsAdvocate(null)
    store.setDevilsAdvocateError(null)
    try {
      const { system, user } = buildDevilsAdvocatePrompt(synthesis, lang)
      const text = await callClaude(system, user, controller.signal)
      store.setDevilsAdvocate(text)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      store.setDevilsAdvocateError((err as Error)?.message ?? 'Devil\'s advocate failed')
    } finally {
      store.setIsDevilingAdvocating(false)
    }
  }, [store])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    retryAbortRef.current?.abort()
    synthRetryAbortRef.current?.abort()
    store.reset()
  }, [store])

  return { startRun, retryAgent, cancel, triggerDevilsAdvocate, retrySynthesis }
}
