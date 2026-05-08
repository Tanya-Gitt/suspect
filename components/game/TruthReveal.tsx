"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { CheckCircle, XCircle, RotateCcw, Home } from "lucide-react"
import { DifficultyMode, DIFFICULTY_LABELS } from "@/types"
import { proceduralAudio } from "@/lib/audio-engine"

// Typewriter for truth reveal — with subtle ticks
function useTypewriter(text: string, speed = 18, start = false) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!start) return
    setDisplayed("")
    setDone(false)
    let i = 0
    let tick = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      tick++
      if (tick % 4 === 0 && text[i] !== " ") proceduralAudio.typeKey()
      i++
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, start])

  return { displayed, done }
}

export function TruthReveal() {
  const { accuseResult, session, imageUrls, clearSession, setPhase, setSelectedCase, setSelectedDifficulty } = useGameStore()
  const [phase, setRevealPhase] = useState<"verdict" | "truth" | "done">("verdict")
  const [startTyping, setStartTyping] = useState(false)

  const { displayed: truthText, done: truthDone } = useTypewriter(
    accuseResult?.fullTruth ?? "",
    14,
    startTyping
  )

  // Auto-advance to truth after verdict display
  useEffect(() => {
    if (phase === "verdict") {
      const t = setTimeout(() => setRevealPhase("truth"), 3000)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (phase === "truth") {
      const t = setTimeout(() => setStartTyping(true), 500)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (truthDone) {
      const t = setTimeout(() => setRevealPhase("done"), 1000)
      return () => clearTimeout(t)
    }
  }, [truthDone])

  if (!accuseResult || !session) return null

  const { correct, accusedName, realMurdererName, motive, method } = accuseResult
  const murdererSuspect = session.casePublic.suspects.find((s) => s.name === realMurdererName)
  const accusedSuspect = session.casePublic.suspects.find((s) => s.name === accusedName)

  function handlePlayAgain() {
    // Keep same case + difficulty, start fresh
    const caseId = session?.caseId
    const diff = session?.difficulty as DifficultyMode
    clearSession()
    setSelectedCase(caseId ?? null)
    setSelectedDifficulty(diff)
    setPhase("difficulty_select")
  }

  function handleMainMenu() {
    clearSession()
    setPhase("menu")
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-10 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-8">

        {/* Verdict */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative flex flex-col items-center py-12 px-6 rounded-xl border-2 text-center overflow-hidden ${
              correct
                ? "border-[#22C55E]/50 bg-[#22C55E]/05"
                : "border-[#F43F5E]/50 bg-[#F43F5E]/05"
            }`}
          >
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${correct ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.08)"} 0%, transparent 70%)`,
              }}
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            >
              {correct ? (
                <CheckCircle size={64} className="text-[#22C55E] mb-4" />
              ) : (
                <XCircle size={64} className="text-[#F43F5E] mb-4" />
              )}
            </motion.div>

            <h1
              className="text-3xl font-black text-white mb-2"
              style={{
                fontFamily: "var(--font-orbitron)",
                textShadow: `0 0 30px ${correct ? "#22C55E" : "#F43F5E"}60`,
              }}
            >
              {correct ? "Case Closed" : "Wrong Accusation"}
            </h1>

            {correct ? (
              <p className="text-[#22C55E] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
                You identified the killer. Justice will be served.
              </p>
            ) : (
              <p className="text-[#F43F5E] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
                {accusedName} is innocent. The real killer walks free.
              </p>
            )}

            {/* Accused vs real */}
            <div className="flex items-center gap-6 mt-8 flex-wrap justify-center">
              <SuspectTag
                label="You Accused"
                name={accusedName}
                imageUrl={imageUrls[accusedSuspect?.id ?? ""]}
                highlight={correct ? "green" : "red"}
              />
              {!correct && (
                <>
                  <div className="text-[#6B7280] text-xl">→</div>
                  <SuspectTag
                    label="Actual Killer"
                    name={realMurdererName}
                    imageUrl={imageUrls[murdererSuspect?.id ?? ""]}
                    highlight="gold"
                  />
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Motive + Method */}
        {phase !== "verdict" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="noir-card p-5">
              <p className="text-[#6B7280] text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
                Motive
              </p>
              <p className="text-[#E2E8F0] text-sm leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
                {motive}
              </p>
            </div>
            <div className="noir-card p-5">
              <p className="text-[#6B7280] text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
                Method
              </p>
              <p className="text-[#E2E8F0] text-sm leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
                {method}
              </p>
            </div>
          </motion.div>
        )}

        {/* Full truth reveal */}
        {phase !== "verdict" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="noir-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-px h-4 bg-[#7C3AED]" />
              <p className="text-[#7C3AED] text-xs tracking-[0.25em] uppercase" style={{ fontFamily: "var(--font-orbitron)" }}>
                The Full Truth
              </p>
            </div>
            <p
              className={`text-[#E2E8F0] text-sm leading-relaxed ${!truthDone ? "cursor" : ""}`}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              {startTyping ? truthText : ""}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePlayAgain}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-md border border-[#7C3AED]/50 text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all text-sm tracking-[0.12em] uppercase"
              style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
            >
              <RotateCcw size={16} />
              Play This Case Again
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleMainMenu}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-md bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-sm tracking-[0.12em] uppercase transition-all"
              style={{ fontFamily: "var(--font-orbitron)", minHeight: 52 }}
            >
              <Home size={16} />
              Back to Cases
            </motion.button>
          </motion.div>
        )}

        {/* Stats */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-[#6B7280]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            <p>
              Difficulty: <span className="text-[#94A3B8]">{DIFFICULTY_LABELS[session.difficulty as DifficultyMode]}</span>
              {" · "}
              Time played: <span className="text-[#94A3B8]">{formatDuration(Date.now() - session.startedAt)}</span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function SuspectTag({
  label,
  name,
  imageUrl,
  highlight,
}: {
  label: string
  name: string
  imageUrl?: string
  highlight: "green" | "red" | "gold"
}) {
  const colors = { green: "#22C55E", red: "#F43F5E", gold: "#D4A853" }
  const c = colors[highlight]

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs" style={{ color: c, fontFamily: "var(--font-orbitron)", fontSize: "0.6rem", letterSpacing: "0.2em" }}>
        {label}
      </p>
      <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: c }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#1F1F3A]" />
        )}
      </div>
      <p className="text-white text-xs font-bold text-center" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.7rem" }}>
        {name}
      </p>
    </div>
  )
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return `${hours}h ${remaining}m`
}
