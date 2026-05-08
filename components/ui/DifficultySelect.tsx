"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { DifficultyMode, DIFFICULTY_LABELS, DIFFICULTY_DURATIONS } from "@/types"
import { ArrowLeft, Loader2 } from "lucide-react"

const DIFFICULTIES: {
  mode: DifficultyMode
  description: string
  traits: string[]
  color: string
}[] = [
  {
    mode: "rookie",
    description: "Suspects are cooperative. Clues surface naturally. Great for your first case.",
    traits: ["Suspects volunteer hints", "No red herrings", "Direct storytelling", "Gentle pacing"],
    color: "#22C55E",
  },
  {
    mode: "detective",
    description: "Suspects guard their secrets. You'll need to push harder for the truth.",
    traits: ["Evasive answers", "One planted red herring", "Cross-referencing needed", "Standard challenge"],
    color: "#C9973E",
  },
  {
    mode: "inspector",
    description: "Suspects actively deceive. Contradictions are everywhere. Think carefully.",
    traits: ["Deliberate misdirection", "Two red herrings", "Rare clue drops", "Requires persistence"],
    color: "#D4A853",
  },
  {
    mode: "true_detective",
    description: "Unreliable narrators. Hidden motives. Even the 'truth' may be a lie.",
    traits: [
      "Suspects lie about core facts",
      "Two red herrings planted",
      "Clues require inference",
      "No hand-holding",
    ],
    color: "#B91C1C",
  },
]

export function DifficultySelect() {
  const { setPhase, selectedCaseId, selectedDifficulty, setSelectedDifficulty } = useGameStore()
  const [starting, setStarting] = useState(false)
  const [hoveredMode, setHoveredMode] = useState<DifficultyMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    if (!selectedCaseId || !selectedDifficulty) return
    setStarting(true)
    setError(null)

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId, difficulty: selectedDifficulty }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to start session")
      }

      const session = await res.json()

      // loadSession now derives image URLs atomically — no extra calls needed
      useGameStore.getState().loadSession(session)

      // Save slot
      useGameStore.getState().upsertSaveSlot({
        sessionId: session.id,
        caseId: session.caseId,
        caseTitle: session.casePublic.title,
        difficulty: session.difficulty,
        startedAt: session.startedAt,
        lastPlayedAt: session.lastPlayedAt,
        status: "active",
        accusationMade: false,
        currentSuspectId: session.currentSuspectId,
      })

      // Store for server-side syncing
      sessionStorage.setItem("current_session_id", session.id)

      setPhase("briefing")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setStarting(false)
    }
  }

  const selectedInfo = DIFFICULTIES.find((d) => d.mode === selectedDifficulty)

  return (
    <div className="min-h-dvh flex flex-col px-4 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-10"
      >
        <button
          onClick={() => setPhase("case_select")}
          className="p-2 hover:text-[#C9973E] transition-colors"
          aria-label="Back"
          disabled={starting}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-[#9A8F7E] text-xs tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "var(--font-orbitron)" }}>
            Choose Difficulty
          </h2>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-orbitron)" }}>
            How Deep Do You Dig?
          </h1>
        </div>
      </motion.div>

      {/* Difficulty grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {DIFFICULTIES.map((d, i) => (
          <motion.button
            key={d.mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelectedDifficulty(d.mode)}
            onMouseEnter={() => setHoveredMode(d.mode)}
            onMouseLeave={() => setHoveredMode(null)}
            className={`relative text-left p-5 rounded-lg border transition-all duration-200 ${
              selectedDifficulty === d.mode
                ? "border-opacity-80 bg-opacity-20"
                : "border-[#222018] bg-[#141210] hover:border-opacity-50"
            }`}
            style={{
              borderColor: selectedDifficulty === d.mode ? d.color : undefined,
              backgroundColor: selectedDifficulty === d.mode ? `${d.color}15` : undefined,
              minHeight: 44,
            }}
            aria-pressed={selectedDifficulty === d.mode}
          >
            {/* Selected indicator */}
            {selectedDifficulty === d.mode && (
              <motion.div
                layoutId="selected-diff"
                className="absolute inset-0 rounded-lg"
                style={{ boxShadow: `0 0 20px ${d.color}30` }}
              />
            )}

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs tracking-[0.15em] uppercase font-bold"
                  style={{ color: d.color, fontFamily: "var(--font-orbitron)" }}
                >
                  {DIFFICULTY_LABELS[d.mode]}
                </span>
                <span className="text-xs text-[#5A5248]">
                  {DIFFICULTY_DURATIONS[d.mode]}
                </span>
              </div>
              <p className="text-[#9A8F7E] text-xs leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
                {d.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Traits panel */}
      <AnimatePresence mode="wait">
        {selectedInfo && (
          <motion.div
            key={selectedInfo.mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="noir-card p-5 mb-6"
          >
            <p className="text-[#9A8F7E] text-xs tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-orbitron)" }}>
              What to expect
            </p>
            <div className="grid grid-cols-2 gap-2">
              {selectedInfo.traits.map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs text-[#EDE5D5]">
                  <span style={{ color: selectedInfo.color }}>◆</span>
                  <span style={{ fontFamily: "var(--font-jetbrains)" }}>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C] text-xs"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start button */}
      <motion.button
        whileHover={selectedDifficulty && !starting ? { scale: 1.02 } : {}}
        whileTap={selectedDifficulty && !starting ? { scale: 0.98 } : {}}
        onClick={handleStart}
        disabled={!selectedDifficulty || starting}
        className={`w-full py-4 rounded-md text-sm tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-3 ${
          selectedDifficulty && !starting
            ? "bg-[#C9973E] hover:bg-[#A87B2A] text-white cursor-pointer"
            : "bg-[#222018] text-[#5A5248] cursor-not-allowed"
        }`}
        style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
      >
        {starting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Opening Case File...
          </>
        ) : (
          "Begin Investigation →"
        )}
      </motion.button>

      {!selectedDifficulty && (
        <p className="text-center text-xs text-[#5A5248] mt-3">
          Select a difficulty to continue
        </p>
      )}
    </div>
  )
}
