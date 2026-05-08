"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore, SaveSlot } from "@/store/gameStore"
import { DIFFICULTY_LABELS, DifficultyMode } from "@/types"
import { BookOpen, Play, RotateCcw, Volume2, VolumeX, Trash2 } from "lucide-react"
import { suspectPortraitUrl, sceneBackgroundUrl } from "@/lib/images"

const TAGLINE_PHRASES = [
  "Everyone is lying.",
  "The truth is buried.",
  "You have one accusation.",
  "Choose wisely.",
]

export function MainMenu() {
  const { setPhase, saveSlots, removeSaveSlot, audio, setAudioEnabled, loadSession } = useGameStore()
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [showSlots, setShowSlots] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [continuingSlot, setContinuingSlot] = useState<string | null>(null)
  const [continueError, setContinueError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cycle taglines
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTaglineIdx((i) => (i + 1) % TAGLINE_PHRASES.length)
    }, 2800)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const activeSlots = saveSlots.filter((s) => s.status === "active")
  const completedSlots = saveSlots.filter((s) => s.status === "completed" || s.status === "replaying")

  function handleResetProgress() {
    if (!confirmReset) {
      setConfirmReset(true)
      // Auto-cancel after 4s if user doesn't confirm
      setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    // Wipe all save slots from store (persisted to localStorage)
    useGameStore.setState({ saveSlots: [] })
    setConfirmReset(false)
    setShowSlots(false)
  }

  async function handleContinue(slot: SaveSlot) {
    setContinuingSlot(slot.sessionId)
    setContinueError(null)
    try {
      // Try to fetch the existing session from the server
      let session: ReturnType<typeof JSON.parse> | null = null
      const res = await fetch(`/api/session?id=${slot.sessionId}`)

      if (res.ok) {
        session = await res.json()
      } else {
        // Session expired (server restarted) — silently recreate it
        // so the user doesn't lose their save slot metadata
        const recreateRes = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: slot.caseId, difficulty: slot.difficulty }),
        })
        if (!recreateRes.ok) {
          const err = await recreateRes.json()
          throw new Error(err.error || "Failed to resume session")
        }
        session = await recreateRes.json()
        // Update the slot with the new sessionId
        useGameStore.getState().upsertSaveSlot({
          ...slot,
          sessionId: session.id,
          lastPlayedAt: Date.now(),
        })
      }

      // Load into store so briefing can render immediately
      loadSession(session)
      // Pre-generate image URLs so portraits are ready
      const seed = session.id.slice(0, 8)
      const numSeed = parseInt(seed, 16) || 1
      useGameStore.getState().setBackgroundUrl(sceneBackgroundUrl(session.casePublic.setting, seed))
      session.casePublic.suspects.forEach((s: { id: string; name: string; appearance: string }, i: number) => {
        useGameStore.getState().setImageUrl(
          s.id,
          suspectPortraitUrl(s.name, s.appearance, session.casePublic.era ?? "Present Day", numSeed + i + 1)
        )
      })
      sessionStorage.setItem("current_session_id", session.id)
      setPhase("briefing")
    } catch (err: unknown) {
      setContinueError(err instanceof Error ? err.message : "Could not load session. Try starting a new investigation.")
    } finally {
      setContinuingSlot(null)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh px-4 overflow-hidden">
      {/* Background atmospheric gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(244,63,94,0.08) 0%, transparent 60%)
          `,
        }}
      />

      {/* Red detective tape accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F43F5E] to-transparent opacity-60" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-2 text-center max-w-2xl w-full"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="text-[#F43F5E] text-xs tracking-[0.4em] uppercase mb-3 font-mono">
            ▸ Case File 001
          </div>
          <h1
            className="text-7xl md:text-9xl font-black tracking-widest text-white leading-none"
            style={{
              fontFamily: "var(--font-orbitron)",
              textShadow: "0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(124,58,237,0.2)",
            }}
          >
            SUSPECT
          </h1>
        </motion.div>

        {/* Animated tagline */}
        <div className="h-8 mt-2 mb-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-[#D4A853] text-sm tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              {TAGLINE_PHRASES[taglineIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent mb-8" />

        {/* CTA buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(124,58,237,0.5)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPhase("case_select")}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-md border border-[#7C3AED] bg-[#7C3AED]/20 text-white text-sm tracking-[0.15em] uppercase transition-all"
            style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
          >
            <Play size={16} />
            New Investigation
          </motion.button>

          {activeSlots.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSlots(!showSlots)}
              className="flex items-center justify-center gap-3 w-full py-4 rounded-md border border-[#D4A853]/40 bg-[#D4A853]/10 text-[#D4A853] text-sm tracking-[0.15em] uppercase transition-all"
              style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
            >
              <BookOpen size={16} />
              Continue ({activeSlots.length})
            </motion.button>
          )}

          {completedSlots.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSlots(!showSlots)}
              className="flex items-center justify-center gap-3 w-full py-4 rounded-md border border-[#6B7280]/30 bg-[#6B7280]/10 text-[#94A3B8] text-sm tracking-[0.15em] uppercase transition-all"
              style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
            >
              <RotateCcw size={16} />
              Closed Cases ({completedSlots.length})
            </motion.button>
          )}
        </div>

        {/* Save slots panel */}
        <AnimatePresence>
          {showSlots && saveSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="w-full max-w-sm overflow-hidden"
            >
              <div className="noir-card p-3 flex flex-col gap-2">
                <p className="text-[#94A3B8] text-xs tracking-widest uppercase mb-2">
                  Active Cases
                </p>
                {saveSlots.map((slot) => (
                  <SaveSlotRow
                    key={slot.sessionId}
                    slot={slot}
                    onContinue={() => handleContinue(slot)}
                    onDelete={() => {
                      setDeletingSlot(slot.sessionId)
                      setTimeout(() => {
                        removeSaveSlot(slot.sessionId)
                        setDeletingSlot(null)
                      }, 300)
                    }}
                    deleting={deletingSlot === slot.sessionId}
                    loading={continuingSlot === slot.sessionId}
                  />
                ))}
                {continueError && (
                  <p className="text-[#F43F5E] text-xs mt-1 px-1" style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {continueError}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-[#6B7280] text-xs">
            <button
              onClick={() => setAudioEnabled(!audio.enabled)}
              className="flex items-center gap-2 hover:text-[#94A3B8] transition-colors p-2"
              aria-label={audio.enabled ? "Mute audio" : "Enable audio"}
            >
              {audio.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="tracking-widest uppercase" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.65rem" }}>
                {audio.enabled ? "Sound On" : "Sound Off"}
              </span>
            </button>
            <span className="opacity-40">•</span>
            <span style={{ fontFamily: "var(--font-jetbrains)" }}>AI Interrogation Game</span>
          </div>

          {/* Reset progress */}
          {saveSlots.length > 0 && (
            <AnimatePresence mode="wait">
              {!confirmReset ? (
                <motion.button
                  key="reset-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleResetProgress}
                  className="flex items-center gap-2 text-[#6B7280]/60 hover:text-[#F43F5E] transition-colors text-xs p-1"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  <Trash2 size={11} />
                  Reset all progress
                </motion.button>
              ) : (
                <motion.div
                  key="reset-confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[#F43F5E] text-xs" style={{ fontFamily: "var(--font-jetbrains)" }}>
                    Erase all {saveSlots.length} save{saveSlots.length !== 1 ? "s" : ""}?
                  </span>
                  <button
                    onClick={handleResetProgress}
                    className="px-3 py-1 rounded text-xs bg-[#F43F5E] text-white hover:bg-[#e11d48] transition-colors"
                    style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem", letterSpacing: "0.1em" }}
                  >
                    Yes, wipe it
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 rounded text-xs border border-[#2A2A4A] text-[#6B7280] hover:text-[#94A3B8] transition-colors"
                    style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem", letterSpacing: "0.1em" }}
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Decorative corner elements */}
      <div className="absolute top-6 left-6 text-[#7C3AED]/30 text-xs font-mono select-none">
        CLASSIFIED
      </div>
      <div className="absolute top-6 right-6 text-[#7C3AED]/30 text-xs font-mono select-none">
        ◈ EYES ONLY
      </div>
      <div className="absolute bottom-6 left-6 text-[#6B7280]/30 text-xs font-mono select-none">
        v1.0.0
      </div>
      <div className="absolute bottom-6 right-6 text-[#6B7280]/30 text-xs font-mono select-none">
        ◈ ACTIVE
      </div>
    </div>
  )
}

function SaveSlotRow({
  slot,
  onContinue,
  onDelete,
  deleting,
  loading,
}: {
  slot: SaveSlot
  onContinue: () => void
  onDelete: () => void
  deleting: boolean
  loading?: boolean
}) {
  const daysAgo = Math.floor((Date.now() - slot.lastPlayedAt) / 86400000)
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`

  return (
    <motion.div
      animate={{ opacity: deleting ? 0 : 1, x: deleting ? -20 : 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded bg-[#1F1F3A] border border-[#2A2A4A] hover:border-[#7C3AED]/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate" style={{ fontFamily: "var(--font-orbitron)" }}>
          {slot.caseTitle}
        </p>
        <p className="text-[#94A3B8] text-xs mt-0.5">
          {DIFFICULTY_LABELS[slot.difficulty as DifficultyMode]} · {timeLabel}
          {slot.status === "completed" && (
            <span className={`ml-2 ${slot.wasCorrect ? "text-green-400" : "text-[#F43F5E]"}`}>
              {slot.wasCorrect ? "✓ Solved" : "✗ Failed"}
            </span>
          )}
        </p>
      </div>
      <button
        onClick={onContinue}
        disabled={loading}
        className={`text-xs px-3 py-1.5 border rounded transition-all flex items-center gap-1.5 ${
          loading
            ? "text-[#6B7280] border-[#2A2A4A] cursor-not-allowed"
            : "text-[#7C3AED] hover:text-white border-[#7C3AED]/40 hover:bg-[#7C3AED]"
        }`}
        style={{ minWidth: 70, minHeight: 32 }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Loading…
          </>
        ) : (
          slot.status === "active" ? "Continue" : "Replay"
        )}
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="text-[#6B7280] hover:text-[#F43F5E] transition-colors p-1.5 disabled:opacity-30"
        aria-label="Delete save"
      >
        ✕
      </button>
    </motion.div>
  )
}
