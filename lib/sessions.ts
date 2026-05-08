import { GameCase, GameSession, DifficultyMode, SuspectSessionState } from "@/types"

// In-memory store (server-side, per process)
// For production: swap with Redis or Supabase
const sessions = new Map<string, GameSession>()

export function createSession(gameCase: GameCase, difficulty: DifficultyMode): GameSession {
  const id = crypto.randomUUID()
  const now = Date.now()

  const suspectStates: Record<string, SuspectSessionState> = {}
  gameCase.suspects.forEach((s) => {
    suspectStates[s.id] = {
      conversationHistory: [],
      currentMood: "calm",
      interrogated: false,
      exchangeCount: 0,
      keyFactsRevealed: [],
    }
  })

  const session: GameSession = {
    id,
    caseId: gameCase.id,
    difficulty,
    startedAt: now,
    lastPlayedAt: now,
    status: "active",
    accusationMade: false,
    suspects: suspectStates,
    clues: [],
    playerNotes: "",
    currentSuspectId: gameCase.suspects[0].id,
  }

  sessions.set(id, session)
  return session
}

export function getSession(id: string): GameSession | undefined {
  return sessions.get(id)
}

export function updateSession(id: string, updates: Partial<GameSession>): GameSession | null {
  const session = sessions.get(id)
  if (!session) return null
  const updated = { ...session, ...updates, lastPlayedAt: Date.now() }
  sessions.set(id, updated)
  return updated
}

export function deleteSession(id: string): void {
  sessions.delete(id)
}

// Strip private data before sending to client
export function sanitizeSession(session: GameSession, gameCase: GameCase) {
  return {
    id: session.id,
    caseId: session.caseId,
    difficulty: session.difficulty,
    startedAt: session.startedAt,
    lastPlayedAt: session.lastPlayedAt,
    status: session.status,
    accusationMade: session.accusationMade,
    suspects: session.suspects,
    clues: session.clues,
    playerNotes: session.playerNotes,
    currentSuspectId: session.currentSuspectId,
    backgroundImageUrl: session.backgroundImageUrl,
    // Public case data only — no solution, no systemPrompts
    casePublic: {
      title: gameCase.title,
      tagline: gameCase.tagline,
      tone: gameCase.tone,
      era: gameCase.era,
      setting: gameCase.setting,
      victim: gameCase.victim,
      knownFacts: gameCase.knownFacts,
      suspects: gameCase.suspects.map(({ id, name, age, sex, occupation, appearance, backstory, relationship, portrait }) => ({
        id, name, age, sex, occupation, appearance, backstory, relationship, portrait,
      })),
    },
  }
}
