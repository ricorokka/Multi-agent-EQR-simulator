// app/page.tsx
'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useSimulatorStore } from '@/store/simulatorStore'
import { useSimulator } from '@/hooks/useSimulator'
import { fetchMarketData } from '@/lib/marketData'
import type { MarketData } from '@/lib/marketData'
import { useAPTOverride } from '@/hooks/useAPTOverride'
import { useHistory } from '@/hooks/useHistory'
import { t, type UIStrings } from '@/lib/i18n'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { ScenarioInput } from '@/components/scenario/ScenarioInput'
import { PresetPicker } from '@/components/scenario/PresetPicker'
import { FileUpload } from '@/components/scenario/FileUpload'
import { SynthesisPanel } from '@/components/results/SynthesisPanel'
import { PriceImpactChart } from '@/components/results/PriceImpactChart'
import { ConfidenceGauge } from '@/components/results/ConfidenceGauge'
import { DevilsAdvocatePanel } from '@/components/results/DevilsAdvocatePanel'
import { ExportButtons } from '@/components/results/ExportButton'
import { HistoryDrawer } from '@/components/history/HistoryDrawer'

export default function Home() {
  const store = useSimulatorStore()
  const { runs, save } = useHistory()                  // single instance — owns runs state
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const { override: aptOverride, setOverride: setAptOverride } = useAPTOverride()
  const [aptEditing, setAptEditing] = useState(false)
  const [aptEditValue, setAptEditValue] = useState('')

  // Merge APT override into market data for prompt injection
  const effectiveMarketData = useMemo<MarketData | null>(() => {
    if (!marketData) return null
    if (!aptOverride) return marketData
    return { ...marketData, aptPrice: aptOverride.price, stale: false }
  }, [marketData, aptOverride])

  const { startRun, retryAgent, triggerDevilsAdvocate, retrySynthesis } = useSimulator(save, effectiveMarketData)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    fetchMarketData().then(setMarketData)
  }, [])

  function startAPTEdit() {
    const current = aptOverride?.price ?? marketData?.aptPrice ?? 2800
    setAptEditValue(String(current))
    setAptEditing(true)
  }

  function commitAPTEdit() {
    const parsed = parseFloat(aptEditValue)
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 10_000) {
      setAptOverride(parsed)
    }
    setAptEditing(false)
  }

  function handleAPTKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitAPTEdit()
    if (e.key === 'Escape') setAptEditing(false)
  }
  const exportRef = useRef<HTMLDivElement>(null)
  const shareRef1 = useRef<HTMLDivElement>(null) // header + charts
  const shareRef2 = useRef<HTMLDivElement>(null) // agent grid
  const shareRef3 = useRef<HTMLDivElement>(null) // synthesis
  const shareRef4 = useRef<HTMLDivElement>(null) // devil's advocate

  const strings = t(store.lang) as UIStrings
  const isRunning = store.runStatus === 'running'
  const isReplay = store.replayRun !== null
  const inputsDisabled = isRunning || isReplay

  // Determine what to display: replay or live
  const displayResponses = isReplay ? store.replayRun!.responses : store.responses
  const displaySynthesis = isReplay ? store.replayRun!.synthesis : store.synthesis
  const displaySynthesisError = isReplay ? null : store.synthesisError
  const displayDevilsAdvocate = isReplay ? null : store.devilsAdvocate
  const showResults = isReplay || store.runStatus === 'done'

  // Build share refs dynamically — only include sections with actual content
  const activeShareRefs = showResults ? [
    shareRef1,
    shareRef2,
    ...(displaySynthesis ? [shareRef3] : []),
    ...(displayDevilsAdvocate ? [shareRef4] : []),
  ] : []

  return (
    <div className="min-h-screen" style={{ background: '#06060a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-base font-bold text-slate-200">
              {strings.appTitle}
            </h1>
            <p className="font-mono text-[10px] text-slate-600 mt-0.5">{strings.appSubtitle}</p>
            <div className="font-mono text-[10px] text-slate-600 mt-0.5 flex items-center flex-wrap gap-x-1">
              {!marketData ? (
                <span>{strings.marketDataLoading}</span>
              ) : (
                <>
                  {/* Auto-fetched values */}
                  <span>
                    A${marketData.sharePrice.toFixed(3)}
                    {' '}·{' '}
                    A${marketData.marketCap.toFixed(2)}B mcap
                    {' '}·{' '}
                  </span>

                  {/* APT — editable */}
                  <span className="flex items-center gap-1">
                    <span>APT</span>
                    {aptEditing ? (
                      <input
                        type="number"
                        value={aptEditValue}
                        onChange={e => setAptEditValue(e.target.value)}
                        onBlur={commitAPTEdit}
                        onKeyDown={handleAPTKeyDown}
                        autoFocus
                        className="font-mono text-[10px] bg-[#0d0d14] border border-[#3a3a5c] text-slate-300 rounded px-1 w-16 outline-none"
                      />
                    ) : (
                      <button
                        onClick={startAPTEdit}
                        title="Edit APT price"
                        className="group flex items-center gap-0.5 hover:text-slate-300 transition-colors"
                      >
                        <span>${(aptOverride?.price ?? marketData.aptPrice).toLocaleString('en-US')}/mtu</span>
                        <span className="opacity-0 group-hover:opacity-60 transition-opacity text-[9px]">✎</span>
                      </button>
                    )}
                    {/* Source label */}
                    {aptOverride ? (
                      <span className="text-amber-700">
                        manual {new Date(aptOverride.setAt).toLocaleDateString(store.lang === 'fi' ? 'fi-FI' : 'en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : marketData.stale ? (
                      <span className="text-slate-700">{strings.marketDataStale}</span>
                    ) : (
                      <span className="text-emerald-800">live</span>
                    )}
                  </span>

                  {/* Remaining auto values */}
                  <span>
                    {' '}·{' '}
                    AUD/USD {marketData.audUsd.toFixed(4)}
                    {' '}·{' '}
                    {new Date(marketData.fetchedAt).toLocaleDateString(
                      store.lang === 'fi' ? 'fi-FI' : 'en-AU',
                      { day: 'numeric', month: 'short', year: 'numeric' }
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setLang(store.lang === 'en' ? 'fi' : 'en')}
              disabled={isRunning || isReplay}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
            >
              {strings.langToggle}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-[#1a1a28] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {strings.history}
            </button>
          </div>
        </div>

        {/* Replay banner */}
        {isReplay && (
          <div className="flex items-center justify-between px-4 py-2 rounded-lg"
            style={{ background: '#0d0d14', border: '1px solid #252535' }}>
            <span className="font-mono text-xs text-slate-500">{strings.historyReplayBanner}</span>
            <button
              onClick={() => store.setReplayRun(null)}
              className="font-mono text-xs text-[#7c5cf6] hover:text-white transition-colors"
            >
              {strings.backToLive}
            </button>
          </div>
        )}

        {/* Scenario input panel */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: '#0d0d14', border: '1px solid #1a1a28' }}
        >
          <PresetPicker
            lang={store.lang}
            disabled={inputsDisabled}
            onSelect={store.setScenario}
            strings={strings}
          />
          <ScenarioInput
            value={isReplay ? store.replayRun!.scenario : store.scenario}
            onChange={store.setScenario}
            onRun={startRun}
            disabled={inputsDisabled}
            isRunning={isRunning}
            strings={strings}
          />
          <FileUpload
            uploadedFiles={store.uploadedFiles}
            onAdd={store.addUploadedFile}
            onRemove={store.removeUploadedFile}
            disabled={inputsDisabled}
            strings={strings}
          />
        </div>

        {/* All-agents-failed error banner */}
        {store.runStatus === 'error' && store.error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span>{strings.allAgentsFailed}</span>
            <button
              onClick={startRun}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-red-900 text-red-400 hover:bg-red-950 transition-colors ml-4 shrink-0"
            >
              {strings.retryAll}
            </button>
          </div>
        )}

        {/* Agent grid */}
        <div ref={shareRef2} className="rounded-xl p-4" style={{ background: '#06060a' }}>
          <AgentGrid
            responses={displayResponses}
            loading={isReplay ? {} : store.loading}
            lang={store.lang}
            strings={strings}
            onRetry={retryAgent}
          />
        </div>

        {/* Results section */}
        {showResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-600 uppercase tracking-wider">Analysis</span>
              <ExportButtons
                targetRef={exportRef}
                shareRefs={activeShareRefs}
                scenario={store.scenario}
                strings={strings}
              />
            </div>
            <div ref={exportRef} className="space-y-4 rounded-xl p-4" style={{ background: '#06060a' }}>
              {/* shareRef1: header + scenario text + charts */}
              <div ref={shareRef1} className="space-y-4 rounded-xl p-4" style={{ background: '#06060a' }}>
                <div>
                  <h2 className="font-mono text-base font-bold text-slate-200">{strings.appTitle}</h2>
                  <p className="font-mono text-[10px] text-slate-600 mt-0.5">{strings.appSubtitle}</p>
                </div>
                <p className="font-mono text-xs text-slate-400 leading-relaxed">{store.scenario}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PriceImpactChart responses={displayResponses} lang={store.lang} strings={strings} />
                  <ConfidenceGauge responses={displayResponses} lang={store.lang} strings={strings} />
                </div>
              </div>

              {/* shareRef3: synthesis */}
              <div ref={shareRef3}>
                <SynthesisPanel
                  synthesis={displaySynthesis}
                  synthesisError={displaySynthesisError}
                  isSynthesizing={store.isSynthesizing}
                  synthesisLang={isReplay ? store.replayRun!.lang : store.synthesisLang}
                  currentLang={store.lang}
                  strings={strings}
                  onRetry={isReplay ? undefined : retrySynthesis}
                />
              </div>

              {displaySynthesis && (
                /* shareRef4: devil's advocate — only assigned when DA content exists */
                displayDevilsAdvocate ? (
                  <div ref={shareRef4} className="rounded-xl p-4" style={{ background: '#06060a' }}>
                    <DevilsAdvocatePanel
                      devilsAdvocate={store.devilsAdvocate}
                      devilsAdvocateError={store.devilsAdvocateError}
                      isDevilingAdvocating={store.isDevilingAdvocating}
                      synthesisLang={isReplay ? store.replayRun!.lang : store.synthesisLang}
                      currentLang={store.lang}
                      strings={strings}
                      onTrigger={() => triggerDevilsAdvocate(isReplay ? displaySynthesis : undefined)}
                      disabled={isRunning}
                    />
                  </div>
                ) : (
                  <DevilsAdvocatePanel
                    devilsAdvocate={store.devilsAdvocate}
                    devilsAdvocateError={store.devilsAdvocateError}
                    isDevilingAdvocating={store.isDevilingAdvocating}
                    synthesisLang={isReplay ? store.replayRun!.lang : store.synthesisLang}
                    currentLang={store.lang}
                    strings={strings}
                    onTrigger={() => triggerDevilsAdvocate(isReplay ? displaySynthesis : undefined)}
                    disabled={isRunning}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        runs={runs}
        onSelectRun={store.setReplayRun}
        strings={strings}
      />
    </div>
  )
}
