import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  DifficultyMode,
  ClientSession,
  Clue,
  MoodState,
  SuspectPublic,
  AccuseResult,
  ConversationTurn,
} from "@/types"
import { suspectPortraitUrl, sceneBackgroundUrl } from "@/lib/images"

/** Derive image URLs from a session in one shot — no async, no race conditions. */
function deriveImageUrls(session: ClientSession): {
  imageUrls: Record<string, string>
  backgroundUrl: string
} {
  const seed = session.id.slice(0, 8)
  const numSeed = parseInt(seed, 16) || 1
  const imageUrls: Record<string, string> = {}
  session.casePublic.suspects.forEach((s, i) => {
    imageUrls[s.id] = suspectPortraitUrl(
      s.name,
      s.appearance,
      session.casePublic.era ?? "Present Day",
      numSeed + i + 1,
    )
  })
  const backgroundUrl = sceneBackgroundUrl(session.casePublic.setting, seed)
  return { imageUrls, backgroundUrl }
}

// ─── UI Phases ────────────────────────────────────────────────────────────────
export type GamePhase =
  | "menu"
  | "case_select"
  | "difficulty_select"
  | "briefing"
  | "interrogation"
  | "accusation"
  | "reveal"

// ─── Save slot (persisted to localStorage) ───────────────────────────────────
export interface SaveSlot {
  sessionId: string
  caseId: string
  caseTitle: string
  difficulty: DifficultyMode
  startedAt: number
  lastPlayedAt: number
  status: "active" | "completed" | "replaying"
  accusationMade: boolean
  wasCorrect?: boolean
  currentSuspectId?: string
}

// ─── Streaming state ──────────────────────────────────────────────────────────
export interface StreamingState {
  isStreaming: boolean
  suspectId: string | null
  buffer: string
}

// ─── Audio state ──────────────────────────────────────────────────────────────
export interface AudioState {
  enabled: boolean
  volume: number // 0–1
  currentTrack: string | null
}

// ─── Full store state ─────────────────────────────────────────────────────────
interface GameState {
  // UI
  phase: GamePhase
  isTransitioning: boolean

  // Session
  session: ClientSession | null
  selectedCaseId: string | null
  selectedDifficulty: DifficultyMode | null

  // Active interrogation
  currentSuspectId: string | null
  streamingState: StreamingState

  // Images (portrait URLs keyed by suspectId)
  imageUrls: Record<string, string>
  backgroundUrl: string | null
  imagesLoaded: boolean

  // Clues & notes
  clues: Clue[]
  playerNotes: string
  notebookOpen: boolean

  // Accusation / reveal
  accuseResult: AccuseResult | null
  accusedSuspectId: string | null

  // Audio
  audio: AudioState

  // Save slots (persisted)
  saveSlots: SaveSlot[]

  // Actions — Navigation
  setPhase: (phase: GamePhase) => void
  setTransitioning: (v: boolean) => void

  // Actions — Session
  loadSession: (session: ClientSession) => void
  clearSession: () => void
  setSelectedCase: (caseId: string | null) => void
  setSelectedDifficulty: (d: DifficultyMode | null) => void

  // Actions — Interrogation
  setCurrentSuspect: (suspectId: string) => void
  appendConversationTurn: (suspectId: string, turn: ConversationTurn) => void
  updateSuspectMood: (suspectId: string, mood: MoodState) => void
  setStreaming: (state: Partial<StreamingState>) => void
  appendStreamChunk: (chunk: string) => void
  finalizeStream: (suspectId: string, fullContent: string, mood: MoodState) => void

  // Actions — Images
  setImageUrl: (suspectId: string, url: string) => void
  setBackgroundUrl: (url: string) => void
  setImagesLoaded: (v: boolean) => void

  // Actions — Clues & Notes
  addClue: (clue: Clue) => void
  toggleClueKey: (clueId: string) => void
  setPlayerNotes: (notes: string) => void
  toggleNotebook: () => void
  setNotebookOpen: (v: boolean) => void

  // Actions — Accusation
  setAccuseResult: (result: AccuseResult, suspectId: string) => void

  // Actions — Audio
  setAudioEnabled: (v: boolean) => void
  setVolume: (v: number) => void
  setCurrentTrack: (track: string | null) => void

  // Actions — Save slots
  upsertSaveSlot: (slot: SaveSlot) => void
  removeSaveSlot: (sessionId: string) => void
  getSaveSlot: (sessionId: string) => SaveSlot | undefined
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      phase: "menu",
      isTransitioning: false,
      session: null,
      selectedCaseId: null,
      selectedDifficulty: null,
      currentSuspectId: null,
      streamingState: { isStreaming: false, suspectId: null, buffer: "" },
      imageUrls: {},
      backgroundUrl: null,
      imagesLoaded: false,
      clues: [],
      playerNotes: "",
      notebookOpen: false,
      accuseResult: null,
      accusedSuspectId: null,
      audio: { enabled: true, volume: 0.6, currentTrack: null },
      saveSlots: [],

      // ── Navigation ──
      setPhase: (phase) => set({ phase }),
      setTransitioning: (isTransitioning) => set({ isTransitioning }),

      // ── Session ──
      loadSession: (session) => {
        const { imageUrls, backgroundUrl } = deriveImageUrls(session)
        set({
          session,
          currentSuspectId: session.currentSuspectId ?? session.casePublic.suspects[0]?.id ?? null,
          clues: session.clues ?? [],
          playerNotes: session.playerNotes ?? "",
          accuseResult: null,
          accusedSuspectId: null,
          imageUrls,
          backgroundUrl,
          imagesLoaded: true,
          streamingState: { isStreaming: false, suspectId: null, buffer: "" },
        })
      },

      clearSession: () =>
        set({
          session: null,
          currentSuspectId: null,
          clues: [],
          playerNotes: "",
          notebookOpen: false,
          accuseResult: null,
          accusedSuspectId: null,
          imageUrls: {},
          backgroundUrl: null,
          imagesLoaded: false,
          streamingState: { isStreaming: false, suspectId: null, buffer: "" },
          phase: "menu",
        }),

      setSelectedCase: (selectedCaseId) => set({ selectedCaseId }),
      setSelectedDifficulty: (selectedDifficulty) => set({ selectedDifficulty }),

      // ── Interrogation ──
      setCurrentSuspect: (suspectId) => {
        set({ currentSuspectId: suspectId })
        // Update session's currentSuspectId too
        const { session } = get()
        if (session) {
          set({ session: { ...session, currentSuspectId: suspectId } })
        }
      },

      appendConversationTurn: (suspectId, turn) => {
        const { session } = get()
        if (!session) return
        const suspectState = session.suspects[suspectId]
        if (!suspectState) return
        set({
          session: {
            ...session,
            suspects: {
              ...session.suspects,
              [suspectId]: {
                ...suspectState,
                conversationHistory: [...suspectState.conversationHistory, turn],
                interrogated: true,
                exchangeCount: suspectState.exchangeCount + (turn.role === "player" ? 1 : 0),
              },
            },
          },
        })
      },

      updateSuspectMood: (suspectId, mood) => {
        const { session } = get()
        if (!session) return
        const suspectState = session.suspects[suspectId]
        if (!suspectState) return
        set({
          session: {
            ...session,
            suspects: {
              ...session.suspects,
              [suspectId]: { ...suspectState, currentMood: mood },
            },
          },
        })
      },

      setStreaming: (state) =>
        set((prev) => ({ streamingState: { ...prev.streamingState, ...state } })),

      appendStreamChunk: (chunk) =>
        set((prev) => ({
          streamingState: { ...prev.streamingState, buffer: prev.streamingState.buffer + chunk },
        })),

      finalizeStream: (suspectId, fullContent, mood) => {
        const { session } = get()
        if (!session) return
        const suspectState = session.suspects[suspectId]
        if (!suspectState) return

        const turn: ConversationTurn = {
          role: "suspect",
          content: fullContent,
          timestamp: Date.now(),
          mood,
        }

        set({
          streamingState: { isStreaming: false, suspectId: null, buffer: "" },
          session: {
            ...session,
            suspects: {
              ...session.suspects,
              [suspectId]: {
                ...suspectState,
                conversationHistory: [...suspectState.conversationHistory, turn],
                currentMood: mood,
              },
            },
          },
        })
      },

      // ── Images ──
      setImageUrl: (suspectId, url) =>
        set((prev) => ({ imageUrls: { ...prev.imageUrls, [suspectId]: url } })),

      setBackgroundUrl: (backgroundUrl) => set({ backgroundUrl }),
      setImagesLoaded: (imagesLoaded) => set({ imagesLoaded }),

      // ── Clues & Notes ──
      addClue: (clue) =>
        set((prev) => {
          // Avoid dupe clues from the same quote
          const exists = prev.clues.some((c) => c.quote === clue.quote && c.suspectId === clue.suspectId)
          if (exists) return prev
          return { clues: [...prev.clues, clue] }
        }),

      toggleClueKey: (clueId) =>
        set((prev) => ({
          clues: prev.clues.map((c) => (c.id === clueId ? { ...c, isKey: !c.isKey } : c)),
        })),

      setPlayerNotes: (playerNotes) => set({ playerNotes }),
      toggleNotebook: () => set((prev) => ({ notebookOpen: !prev.notebookOpen })),
      setNotebookOpen: (notebookOpen) => set({ notebookOpen }),

      // ── Accusation ──
      setAccuseResult: (accuseResult, accusedSuspectId) => set({ accuseResult, accusedSuspectId }),

      // ── Audio ──
      setAudioEnabled: (enabled) =>
        set((prev) => ({ audio: { ...prev.audio, enabled } })),
      setVolume: (volume) =>
        set((prev) => ({ audio: { ...prev.audio, volume } })),
      setCurrentTrack: (currentTrack) =>
        set((prev) => ({ audio: { ...prev.audio, currentTrack } })),

      // ── Save slots ──
      upsertSaveSlot: (slot) =>
        set((prev) => {
          const existing = prev.saveSlots.findIndex((s) => s.sessionId === slot.sessionId)
          if (existing >= 0) {
            const updated = [...prev.saveSlots]
            updated[existing] = slot
            return { saveSlots: updated }
          }
          return { saveSlots: [slot, ...prev.saveSlots].slice(0, 6) } // max 6 slots
        }),

      removeSaveSlot: (sessionId) =>
        set((prev) => ({ saveSlots: prev.saveSlots.filter((s) => s.sessionId !== sessionId) })),

      getSaveSlot: (sessionId) => get().saveSlots.find((s) => s.sessionId === sessionId),
    }),
    {
      name: "suspect-game",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        saveSlots: state.saveSlots,
        audio: state.audio,
        selectedDifficulty: state.selectedDifficulty,
      }),
    }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCurrentSuspect = (state: GameState): SuspectPublic | undefined => {
  if (!state.session || !state.currentSuspectId) return undefined
  return state.session.casePublic.suspects.find((s) => s.id === state.currentSuspectId)
}

export const selectCurrentSuspectState = (state: GameState) => {
  if (!state.session || !state.currentSuspectId) return undefined
  return state.session.suspects[state.currentSuspectId]
}

export const selectCurrentMood = (state: GameState): MoodState => {
  const suspectState = selectCurrentSuspectState(state)
  return suspectState?.currentMood ?? "calm"
}

export const selectConversation = (state: GameState): ConversationTurn[] => {
  const suspectState = selectCurrentSuspectState(state)
  return suspectState?.conversationHistory ?? []
}

export const selectAllSuspects = (state: GameState): SuspectPublic[] =>
  state.session?.casePublic.suspects ?? []

export const selectInterrogatedCount = (state: GameState): number => {
  if (!state.session) return 0
  return Object.values(state.session.suspects).filter((s) => s.interrogated).length
}

export const selectKeyClues = (state: GameState): Clue[] =>
  state.clues.filter((c) => c.isKey)
