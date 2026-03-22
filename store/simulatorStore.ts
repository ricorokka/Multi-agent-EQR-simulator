// store/simulatorStore.ts
import { create } from 'zustand'
import type { AgentId, AgentResponse, HistoryRun, Lang, RunStatus, UploadedFile } from '@/lib/types'

interface SimulatorState {
  lang: Lang
  scenario: string
  uploadedFiles: UploadedFile[]
  responses: Partial<Record<AgentId, AgentResponse>>
  loading: Partial<Record<AgentId, boolean>>
  synthesis: string | null
  synthesisLang: Lang | null
  synthesisError: string | null
  isSynthesizing: boolean
  runStatus: RunStatus
  error: string | null
  replayRun: HistoryRun | null
  devilsAdvocate: string | null
  devilsAdvocateError: string | null
  isDevilingAdvocating: boolean

  setLang: (lang: Lang) => void
  setScenario: (text: string) => void
  addUploadedFile: (file: UploadedFile) => void
  removeUploadedFile: (name: string) => void
  clearUploadedFiles: () => void
  setAgentResponse: (agentId: AgentId, response: AgentResponse) => void
  setAgentLoading: (agentId: AgentId, loading: boolean) => void
  setSynthesis: (text: string | null) => void
  setSynthesisLang: (lang: Lang | null) => void
  setSynthesisError: (error: string | null) => void
  setIsSynthesizing: (v: boolean) => void
  setRunStatus: (status: RunStatus) => void
  setError: (error: string | null) => void
  setReplayRun: (run: HistoryRun | null) => void
  setDevilsAdvocate: (text: string | null) => void
  setDevilsAdvocateError: (error: string | null) => void
  setIsDevilingAdvocating: (v: boolean) => void
  reset: () => void
}

const INITIAL_RUN_STATE = {
  responses: {} as Partial<Record<AgentId, AgentResponse>>,
  loading: {} as Partial<Record<AgentId, boolean>>,
  synthesis: null,
  synthesisLang: null,
  synthesisError: null,
  isSynthesizing: false,
  runStatus: 'idle' as RunStatus,
  error: null,
  replayRun: null,
  devilsAdvocate: null,
  devilsAdvocateError: null,
  isDevilingAdvocating: false,
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  lang: 'fi',
  scenario: '',
  uploadedFiles: [],
  ...INITIAL_RUN_STATE,

  setLang: (lang) => set({ lang }),
  setScenario: (scenario) => set({ scenario }),
  addUploadedFile: (file) =>
    set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),
  removeUploadedFile: (name) =>
    set((state) => ({ uploadedFiles: state.uploadedFiles.filter(f => f.name !== name) })),
  clearUploadedFiles: () => set({ uploadedFiles: [] }),
  setAgentResponse: (agentId, response) =>
    set((state) => ({ responses: { ...state.responses, [agentId]: response } })),
  setAgentLoading: (agentId, loading) =>
    set((state) => ({ loading: { ...state.loading, [agentId]: loading } })),
  setSynthesis: (synthesis) => set({ synthesis }),
  setSynthesisLang: (synthesisLang) => set({ synthesisLang }),
  setSynthesisError: (synthesisError) => set({ synthesisError }),
  setIsSynthesizing: (isSynthesizing) => set({ isSynthesizing }),
  setRunStatus: (runStatus) => set({ runStatus }),
  setError: (error) => set({ error }),
  setReplayRun: (replayRun) => set({ replayRun }),
  setDevilsAdvocate: (devilsAdvocate) => set({ devilsAdvocate }),
  setDevilsAdvocateError: (devilsAdvocateError) => set({ devilsAdvocateError }),
  setIsDevilingAdvocating: (isDevilingAdvocating) => set({ isDevilingAdvocating }),
  reset: () => set(INITIAL_RUN_STATE),
}))
