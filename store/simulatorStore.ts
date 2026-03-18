// store/simulatorStore.ts
import { create } from 'zustand'
import type { AgentId, AgentResponse, HistoryRun, Lang, RunStatus, UploadedFile } from '@/lib/types'

interface SimulatorState {
  lang: Lang
  scenario: string
  uploadedFile: UploadedFile | null
  responses: Partial<Record<AgentId, AgentResponse>>
  loading: Partial<Record<AgentId, boolean>>
  synthesis: string | null
  synthesisError: string | null
  isSynthesizing: boolean
  runStatus: RunStatus
  error: string | null
  replayRun: HistoryRun | null

  setLang: (lang: Lang) => void
  setScenario: (text: string) => void
  setUploadedFile: (file: UploadedFile | null) => void
  setAgentResponse: (agentId: AgentId, response: AgentResponse) => void
  setAgentLoading: (agentId: AgentId, loading: boolean) => void
  setSynthesis: (text: string | null) => void
  setSynthesisError: (error: string | null) => void
  setIsSynthesizing: (v: boolean) => void
  setRunStatus: (status: RunStatus) => void
  setError: (error: string | null) => void
  setReplayRun: (run: HistoryRun | null) => void
  reset: () => void
}

const INITIAL_RUN_STATE = {
  responses: {} as Partial<Record<AgentId, AgentResponse>>,
  loading: {} as Partial<Record<AgentId, boolean>>,
  synthesis: null,
  synthesisError: null,
  isSynthesizing: false,
  runStatus: 'idle' as RunStatus,
  error: null,
  replayRun: null,
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  lang: 'fi',
  scenario: '',
  uploadedFile: null,
  ...INITIAL_RUN_STATE,

  setLang: (lang) => set({ lang }),
  setScenario: (scenario) => set({ scenario }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setAgentResponse: (agentId, response) =>
    set((state) => ({ responses: { ...state.responses, [agentId]: response } })),
  setAgentLoading: (agentId, loading) =>
    set((state) => ({ loading: { ...state.loading, [agentId]: loading } })),
  setSynthesis: (synthesis) => set({ synthesis }),
  setSynthesisError: (synthesisError) => set({ synthesisError }),
  setIsSynthesizing: (isSynthesizing) => set({ isSynthesizing }),
  setRunStatus: (runStatus) => set({ runStatus }),
  setError: (error) => set({ error }),
  setReplayRun: (replayRun) => set({ replayRun }),
  reset: () => set(INITIAL_RUN_STATE),
}))
