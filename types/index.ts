// ─── Difficulty ──────────────────────────────────────────────────────────────
export type DifficultyMode = "rookie" | "detective" | "inspector" | "true_detective"

export const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  rookie: "Greenhorn",
  detective: "Badge & Bone",
  inspector: "Cold Case",
  true_detective: "Obsession Mode",
}

export const DIFFICULTY_DURATIONS: Record<DifficultyMode, string> = {
  rookie: "~30 min",
  detective: "~1 hour",
  inspector: "~2 hours",
  true_detective: "~3–4 hours",
}

// ─── Mood ─────────────────────────────────────────────────────────────────────
export type MoodState = "calm" | "evasive" | "nervous" | "cracking" | "caught"

// ─── Suspects ────────────────────────────────────────────────────────────────
export type SuspectSex = "male" | "female" | "nb"

export interface SuspectPublic {
  id: string
  name: string
  age: number
  sex?: SuspectSex          // used to pick gender-appropriate portrait style
  occupation: string
  appearance: string        // physical description for image generation
  portrait?: string         // generated image URL (populated at runtime)
  backstory: string         // shown on suspect card (public flavor text)
  relationship: string      // relationship to victim
}

export interface SuspectPrivate extends SuspectPublic {
  role: "murderer" | "witness" | "alibi_provider" | "red_herring"
  systemPromptBase: string  // NEVER sent to client
  secretsToReveal: string[] // clues they'll give under pressure
  liesTheyMaintain: string[]
  alibi: string
  motive?: string           // only set if murderer
}

// ─── Clues ───────────────────────────────────────────────────────────────────
export interface Clue {
  id: string
  suspectId: string
  suspectName: string
  quote: string
  timestamp: number
  isKey: boolean            // starred by player
  imageUrl?: string         // optional generated evidence photo
}

// ─── Conversation ────────────────────────────────────────────────────────────
export interface ConversationTurn {
  role: "player" | "suspect"
  content: string
  timestamp: number
  mood?: MoodState
}

// ─── Case ────────────────────────────────────────────────────────────────────
export interface GameCase {
  id: string
  title: string
  tagline: string           // "A family secret. A locked room. Three liars."
  tone: "disturbing" | "sad" | "suspense" | "horror" | "twist"
  era: string               // "1940s", "present day", etc.
  setting: string           // for image generation: "Victorian manor, foggy moors"
  victim: {
    name: string
    age: number
    occupation: string
    description: string
    causeOfDeath: string
    foundAt: string
  }
  knownFacts: string[]      // shown in briefing — public info
  suspects: SuspectPrivate[]
  solution: {               // NEVER sent to client
    suspectId: string
    motive: string
    method: string
    fullTruth: string       // narrative reveal paragraph
  }
  // Per-difficulty overrides. Numbers and frequency are tunable per-case.
  byDifficulty: Record<DifficultyMode, {
    evasiveness: number
    clueFrequency: "high" | "medium" | "low" | "very_low"
    redHerrings: number
  }>
}

// ─── Session (server-side, never expose solution/systemPrompt) ───────────────
export interface GameSession {
  id: string
  caseId: string
  difficulty: DifficultyMode
  startedAt: number
  lastPlayedAt: number
  status: "active" | "completed" | "replaying"
  accusationMade: boolean
  accusedSuspectId?: string
  wasCorrect?: boolean
  suspects: Record<string, SuspectSessionState>
  clues: Clue[]
  playerNotes: string
  currentSuspectId?: string
  backgroundImageUrl?: string
}

export interface SuspectSessionState {
  conversationHistory: ConversationTurn[]
  currentMood: MoodState
  interrogated: boolean
  exchangeCount: number
  keyFactsRevealed: string[]  // for sliding window summary
}

// ─── Client-safe session (solution + systemPrompts stripped) ─────────────────
export type ClientSession = Omit<GameSession, never> & {
  suspects: Record<string, SuspectSessionState>
  casePublic: {
    title: string
    tagline: string
    tone: GameCase["tone"]
    era: string
    setting: string
    victim: GameCase["victim"]
    knownFacts: string[]
    suspects: SuspectPublic[]
    backgroundImageUrl?: string
  }
}

// ─── API payloads ─────────────────────────────────────────────────────────────
export interface SendMessagePayload {
  sessionId: string
  suspectId: string
  message: string
  // Stateless fields — sent by client so server needs no DB lookup
  caseId: string
  difficulty: DifficultyMode
  conversationHistory: ConversationTurn[]
  exchangeCount: number
  currentMood: MoodState
}

export interface AccusePayload {
  sessionId: string
  suspectId: string
  caseId: string   // sent by client so server needs no DB lookup
}

export interface AccuseResult {
  correct: boolean
  accusedName: string
  realMurdererName: string
  fullTruth: string
  motive: string
  method: string
}
