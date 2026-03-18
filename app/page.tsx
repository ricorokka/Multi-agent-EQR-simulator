// app/page.tsx
'use client'
import { useState } from 'react'
import { useSimulatorStore } from '@/store/simulatorStore'
import { useSimulator } from '@/hooks/useSimulator'
import { useHistory } from '@/hooks/useHistory'
import { t, type UIStrings } from '@/lib/i18n'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { ScenarioInput } from '@/components/scenario/ScenarioInput'
import { PresetPicker } from '@/components/scenario/PresetPicker'
import { FileUpload } from '@/components/scenario/FileUpload'
import { SynthesisPanel } from '@/components/results/SynthesisPanel'
import { PriceImpactChart } from '@/components/results/PriceImpactChart'
import { ConfidenceGauge } from '@/components/results/ConfidenceGauge'
import { HistoryDrawer } from '@/components/history/HistoryDrawer'

export default function Home() {
  const store = useSimulatorStore()
  const { runs, save } = useHistory()                  // single instance — owns runs state
  const { startRun, retryAgent } = useSimulator(save)  // pass save so hook doesn't need its own instance
  const [historyOpen, setHistoryOpen] = useState(false)

  const strings = t(store.lang) as UIStrings
  const isRunning = store.runStatus === 'running'
  const isReplay = store.replayRun !== null
  const inputsDisabled = isRunning || isReplay

  // Determine what to display: replay or live
  const displayResponses = isReplay ? store.replayRun!.responses : store.responses
  const displaySynthesis = isReplay ? store.replayRun!.synthesis : store.synthesis
  const displaySynthesisError = isReplay ? null : store.synthesisError
  const showResults = isReplay || store.runStatus === 'done'

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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setLang(store.lang === 'en' ? 'fi' : 'en')}
              disabled={isRunning}
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
            value={store.scenario}
            onChange={store.setScenario}
            onRun={startRun}
            disabled={inputsDisabled}
            isRunning={isRunning}
            strings={strings}
          />
          <FileUpload
            uploadedFile={store.uploadedFile}
            onFile={store.setUploadedFile}
            disabled={inputsDisabled}
            strings={strings}
          />
        </div>

        {/* All-agents-failed error banner */}
        {store.runStatus === 'error' && store.error && (
          <div className="px-4 py-3 rounded-lg text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {strings.allAgentsFailed}
          </div>
        )}

        {/* Agent grid */}
        <AgentGrid
          responses={displayResponses}
          loading={isReplay ? {} : store.loading}
          strings={strings}
          onRetry={retryAgent}
        />

        {/* Results section */}
        {showResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PriceImpactChart responses={displayResponses} lang={store.lang} strings={strings} />
              <ConfidenceGauge responses={displayResponses} lang={store.lang} strings={strings} />
            </div>
            <SynthesisPanel
              synthesis={displaySynthesis}
              synthesisError={displaySynthesisError}
              isSynthesizing={store.isSynthesizing}
              strings={strings}
            />
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
