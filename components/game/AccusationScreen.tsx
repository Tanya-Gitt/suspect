"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore, selectAllSuspects } from "@/store/gameStore"
import { ArrowLeft, AlertTriangle, Loader2, User } from "lucide-react"

export function AccusationScreen() {
  const { setPhase, session, imageUrls, setAccuseResult, upsertSaveSlot } = useGameStore()
  const allSuspects = useGameStore(selectAllSuspects)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccuse() {
    if (!selectedId || !session) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/accuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, suspectId: selectedId, caseId: session.caseId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to make accusation")
      }

      const result = await res.json()
      setAccuseResult(result, selectedId)

      // Update save slot to completed
      upsertSaveSlot({
        sessionId: session.id,
        caseId: session.caseId,
        caseTitle: session.casePublic.title,
        difficulty: session.difficulty as any,
        startedAt: session.startedAt,
        lastPlayedAt: Date.now(),
        status: "completed",
        accusationMade: true,
        wasCorrect: result.correct,
        currentSuspectId: selectedId,
      })

      setPhase("reveal")
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong")
      setSubmitting(false)
    }
  }

  const selected = allSuspects.find((s) => s.id === selectedId)
  const interrogatedCount = Object.values(session?.suspects ?? {}).filter((s) => s.interrogated).length
  const totalSuspects = allSuspects.length

  return (
    <div className="min-h-dvh flex flex-col px-4 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => setPhase("interrogation")}
          className="p-2 hover:text-[#C9973E] transition-colors"
          disabled={submitting}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-[#B91C1C] text-xs tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "var(--font-orbitron)" }}>
            ⚖ Final Accusation
          </h2>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-orbitron)" }}>
            Who killed {session?.casePublic.victim.name}?
          </h1>
        </div>
      </motion.div>

      {/* Warning */}
      {interrogatedCount < totalSuspects && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-[#D4A853]/30 bg-[#D4A853]/08"
        >
          <AlertTriangle size={16} className="text-[#D4A853] flex-shrink-0" />
          <p className="text-[#D4A853] text-xs" style={{ fontFamily: "var(--font-jetbrains)" }}>
            You&apos;ve only interrogated {interrogatedCount} of {totalSuspects} suspects. This accusation is final — there&apos;s no going back.
          </p>
        </motion.div>
      )}

      {/* Suspects lineup */}
      <div className="flex flex-col gap-3 mb-8">
        <p className="text-[#9A8F7E] text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-orbitron)" }}>
          Select the killer
        </p>

        {allSuspects.map((s, i) => {
          const isSelected = s.id === selectedId
          const interrogated = session?.suspects[s.id]?.interrogated ?? false

          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => !submitting && setSelectedId(isSelected ? null : s.id)}
              className={`relative flex items-center gap-4 p-5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-[#B91C1C] bg-[#B91C1C]/10"
                  : "border-[#222018] bg-[#141210] hover:border-[#B91C1C]/40"
              }`}
              aria-pressed={isSelected}
              disabled={submitting}
            >
              {/* Portrait */}
              <div
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2"
                style={{ borderColor: isSelected ? "#B91C1C" : "#222018" }}
              >
                {imageUrls[s.id] ? (
                  <img src={imageUrls[s.id]} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1C1917] flex items-center justify-center">
                    <User size={24} className="text-[#5A5248]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold mb-1" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.9rem" }}>
                  {s.name}
                </p>
                <p className="text-[#9A8F7E] text-xs">{s.age} · {s.occupation}</p>
                <p className="text-[#5A5248] text-xs mt-0.5 italic">{s.relationship}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {interrogated ? (
                  <span className="text-[#22C55E] text-xs">✓ Interrogated</span>
                ) : (
                  <span className="text-[#5A5248] text-xs">○ Not questioned</span>
                )}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-[#B91C1C] flex items-center justify-center text-white text-xs"
                  >
                    ✓
                  </motion.div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C] text-xs"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm / accuse */}
      <AnimatePresence mode="wait">
        {selectedId && !confirming && (
          <motion.button
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setConfirming(true)}
            className="w-full py-4 rounded-md text-sm tracking-[0.15em] uppercase border border-[#B91C1C]/50 text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-all"
            style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
          >
            Accuse {selected?.name} →
          </motion.button>
        )}

        {confirming && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-4"
          >
            <div className="px-5 py-4 rounded-lg border border-[#B91C1C]/40 bg-[#B91C1C]/08 text-center">
              <p className="text-[#B91C1C] font-bold mb-1" style={{ fontFamily: "var(--font-orbitron)" }}>
                Final Accusation
              </p>
              <p className="text-[#9A8F7E] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
                You believe <strong className="text-white">{selected?.name}</strong> killed{" "}
                {session?.casePublic.victim.name}. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-md border border-[#222018] text-[#9A8F7E] hover:border-[#5A5248] transition-all text-sm"
                style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.7rem", letterSpacing: "0.1em" }}
              >
                Wait, Go Back
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAccuse}
                disabled={submitting}
                className="flex-1 py-3 rounded-md bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all"
                style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.7rem", minHeight: 48 }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Accusing...
                  </>
                ) : (
                  <span>I&apos;m Certain — Accuse</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
