"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { prefetchCaseImages, sceneBackgroundUrl, suspectPortraitUrl } from "@/lib/images"
import { DifficultyMode, DIFFICULTY_LABELS } from "@/types"
import { ChevronRight, User } from "lucide-react"
import { proceduralAudio } from "@/lib/audio-engine"

// Typewriter hook — plays a key tick every N characters
function useTypewriter(text: string, speed = 22, delay = 0) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    let tickCounter = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1))
        // Play a tick every 3 characters (not every char — avoids rapid fire)
        tickCounter++
        if (tickCounter % 3 === 0 && text[i] !== " ") {
          proceduralAudio.typeKey()
        }
        i++
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [text, speed, delay])

  return { displayed, done }
}

type BriefingStep = "intro" | "victim" | "facts" | "suspects" | "ready"

export function CaseBriefing() {
  const {
    session,
    setPhase,
    setCurrentSuspect,
    setImageUrl,
    setBackgroundUrl,
    setImagesLoaded,
    imageUrls,
    imagesLoaded,
    upsertSaveSlot,
  } = useGameStore()

  const [step, setStep] = useState<BriefingStep>("intro")
  const [resuming, setResuming] = useState(false)

  // Check if we're resuming a session
  useEffect(() => {
    const resumeId = sessionStorage.getItem("resume_session_id")
    if (resumeId && session?.id === resumeId) {
      setResuming(true)
      sessionStorage.removeItem("resume_session_id")
    }
  }, [session?.id])

  // Ensure image URLs are set (they're normally set upstream in DifficultySelect/MainMenu,
  // but this is a safety net for any edge case)
  useEffect(() => {
    if (!session?.casePublic) return
    const { suspects, setting } = session.casePublic
    const seed = session.id.slice(0, 8)
    const numSeed = parseInt(seed, 16) || 1

    if (!useGameStore.getState().backgroundUrl) {
      setBackgroundUrl(sceneBackgroundUrl(setting, seed))
    }
    suspects.forEach((s, i) => {
      if (!useGameStore.getState().imageUrls[s.id]) {
        setImageUrl(s.id, suspectPortraitUrl(s.name, s.appearance, session.casePublic.era ?? "Present Day", numSeed + i + 1))
      }
    })
    setImagesLoaded(true)
  }, [session, setBackgroundUrl, setImageUrl, setImagesLoaded])

  if (!session) return null

  const { casePublic, suspects, difficulty } = session
  const firstSuspect = casePublic.suspects[0]

  function handleBeginInterrogation() {
    if (firstSuspect) setCurrentSuspect(firstSuspect.id)
    // Update save slot
    if (session) {
      upsertSaveSlot({
        sessionId: session.id,
        caseId: session.caseId,
        caseTitle: casePublic.title,
        difficulty: difficulty as DifficultyMode,
        startedAt: session.startedAt,
        lastPlayedAt: Date.now(),
        status: "active",
        accusationMade: false,
        currentSuspectId: firstSuspect?.id,
      })
    }
    setPhase("interrogation")
  }

  const steps: BriefingStep[] = ["intro", "victim", "facts", "suspects", "ready"]
  const currentIdx = steps.indexOf(step)

  function nextStep() {
    if (currentIdx < steps.length - 1) {
      proceduralAudio.whoosh()
      setStep(steps[currentIdx + 1])
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Background image (scene) */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${sceneBackgroundUrl(casePublic.setting, session.id.slice(0, 8))})`,
            filter: "brightness(0.15) blur(2px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F23]/70 via-[#0F0F23]/90 to-[#0F0F23]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 text-xs text-[#6B7280] mb-3">
            <span className="text-[#F43F5E] tracking-widest uppercase" style={{ fontFamily: "var(--font-orbitron)" }}>
              ◉ CASE FILE
            </span>
            <span>·</span>
            <span>{DIFFICULTY_LABELS[difficulty as DifficultyMode]}</span>
            {resuming && (
              <>
                <span>·</span>
                <span className="text-[#D4A853]">Resuming</span>
              </>
            )}
          </div>
          <h1
            className="text-3xl md:text-4xl font-black text-white leading-tight"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            {casePublic.title}
          </h1>
          <p className="text-[#D4A853] mt-2 text-sm italic" style={{ fontFamily: "var(--font-jetbrains)" }}>
            {casePublic.tagline}
          </p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {steps.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                i <= currentIdx - 1 ? "bg-[#7C3AED]" : "bg-[#2A2A4A]"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {step === "intro" && <IntroStep gameCase={casePublic} difficulty={difficulty as DifficultyMode} onNext={nextStep} />}
            {step === "victim" && <VictimStep victim={casePublic.victim} onNext={nextStep} />}
            {step === "facts" && <FactsStep facts={casePublic.knownFacts} onNext={nextStep} />}
            {step === "suspects" && <SuspectsStep suspects={casePublic.suspects} imageUrls={imageUrls} imagesLoaded={imagesLoaded} onNext={nextStep} />}
            {step === "ready" && <ReadyStep onBegin={handleBeginInterrogation} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Step Components ──────────────────────────────────────────────────────────

function IntroStep({
  gameCase,
  difficulty,
  onNext,
}: {
  gameCase: any
  difficulty: DifficultyMode
  onNext: () => void
}) {
  const intro = `${gameCase.setting}. The year is now. A body has been found — and you have been called in to investigate. The victim: ${gameCase.victim.name}, ${gameCase.victim.age} years old. ${gameCase.victim.causeOfDeath}.`
  const { displayed, done } = useTypewriter(intro, 20, 300)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span
          className="text-xs tracking-[0.2em] uppercase px-2 py-1 rounded border"
          style={{
            color: "#D4A853",
            borderColor: "#D4A853",
            background: "rgba(212,168,83,0.08)",
            fontFamily: "var(--font-orbitron)",
            fontSize: "0.65rem",
          }}
        >
          {gameCase.era}
        </span>
        <span
          className="text-xs tracking-[0.2em] uppercase px-2 py-1 rounded border"
          style={{
            color: "#F43F5E",
            borderColor: "#F43F5E",
            background: "rgba(244,63,94,0.08)",
            fontFamily: "var(--font-orbitron)",
            fontSize: "0.65rem",
          }}
        >
          {gameCase.tone}
        </span>
      </div>

      <p
        className="text-lg text-[#E2E8F0] leading-relaxed"
        style={{ fontFamily: "var(--font-jetbrains)" }}
      >
        {displayed}
        {!done && <span className="cursor" />}
      </p>

      {done && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onNext}
          className="mt-4 self-start flex items-center gap-2 btn-primary"
        >
          View Victim Profile <ChevronRight size={16} />
        </motion.button>
      )}
    </div>
  )
}

function VictimStep({ victim, onNext }: { victim: any; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-[#F43F5E] text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-orbitron)" }}>
        ◈ The Victim
      </h3>

      <div className="noir-card p-6">
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Name</p>
            <p className="text-white font-medium">{victim.name}</p>
          </div>
          <div>
            <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Age</p>
            <p className="text-white font-medium">{victim.age}</p>
          </div>
          <div>
            <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Occupation</p>
            <p className="text-white font-medium">{victim.occupation}</p>
          </div>
          <div>
            <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Found at</p>
            <p className="text-white font-medium">{victim.foundAt}</p>
          </div>
        </div>
        <div className="border-t border-[#2A2A4A] pt-4">
          <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-2">Cause of Death</p>
          <p className="text-[#F43F5E] font-medium text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
            {victim.causeOfDeath}
          </p>
        </div>
        {victim.description && (
          <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
            {victim.description}
          </p>
        )}
      </div>

      <button onClick={onNext} className="self-start flex items-center gap-2 btn-primary">
        Known Facts <ChevronRight size={16} />
      </button>
    </div>
  )
}

function FactsStep({ facts, onNext }: { facts: string[]; onNext: () => void }) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (revealed < facts.length) {
      const t = setTimeout(() => setRevealed((r) => r + 1), 500)
      return () => clearTimeout(t)
    }
  }, [revealed, facts.length])

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-[#7C3AED] text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-orbitron)" }}>
        ◈ Known Facts
      </h3>
      <p className="text-[#94A3B8] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
        These facts have been established by investigators. Everything else is up to you to uncover.
      </p>

      <div className="flex flex-col gap-2">
        {facts.map((fact, i) => (
          <AnimatePresence key={i}>
            {i < revealed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-3 rounded bg-[#16162A] border border-[#2A2A4A]"
              >
                <span className="text-[#7C3AED] mt-0.5 text-xs">◆</span>
                <p className="text-sm text-[#E2E8F0]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {fact}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {revealed >= facts.length && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onNext}
          className="self-start flex items-center gap-2 btn-primary"
        >
          Meet the Suspects <ChevronRight size={16} />
        </motion.button>
      )}
    </div>
  )
}

function SuspectsStep({
  suspects,
  imageUrls,
  imagesLoaded,
  onNext,
}: {
  suspects: any[]
  imageUrls: Record<string, string>
  imagesLoaded: boolean
  onNext: () => void
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-[#D4A853] text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-orbitron)" }}>
        ◈ Persons of Interest
      </h3>
      <p className="text-[#94A3B8] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
        You will interrogate each suspect. Tap a name to preview their profile.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {suspects.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
          >
            <button
              onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-lg border transition-all ${
                selectedIdx === i
                  ? "border-[#D4A853]/50 bg-[#D4A853]/08"
                  : "border-[#2A2A4A] bg-[#16162A] hover:border-[#D4A853]/30"
              }`}
            >
              {/* Portrait */}
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#2A2A4A] flex-shrink-0 bg-[#1F1F3A] flex items-center justify-center">
                {imageUrls[s.id] ? (
                  <img
                    src={imageUrls[s.id]}
                    alt={s.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <User size={20} className="text-[#6B7280]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm" style={{ fontFamily: "var(--font-orbitron)" }}>
                  {s.name}
                </p>
                <p className="text-[#94A3B8] text-xs mt-0.5">
                  {s.age} · {s.occupation}
                </p>
                {selectedIdx === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2"
                  >
                    <p className="text-[#94A3B8] text-xs leading-relaxed mb-1" style={{ fontFamily: "var(--font-jetbrains)" }}>
                      {s.relationship}
                    </p>
                    <p className="text-[#E2E8F0] text-xs leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
                      {s.backstory}
                    </p>
                  </motion.div>
                )}
              </div>
              <ChevronRight
                size={14}
                className="text-[#6B7280] flex-shrink-0 transition-transform"
                style={{ transform: selectedIdx === i ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>
          </motion.div>
        ))}
      </div>

      {!imagesLoaded && (
        <p className="text-xs text-[#6B7280] animate-pulse" style={{ fontFamily: "var(--font-jetbrains)" }}>
          ◉ Generating suspect portraits...
        </p>
      )}

      <button onClick={onNext} className="self-start flex items-center gap-2 btn-primary">
        I&apos;m Ready <ChevronRight size={16} />
      </button>
    </div>
  )
}

function ReadyStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <div className="w-20 h-20 rounded-full border-2 border-[#F43F5E] flex items-center justify-center text-3xl mx-auto">
          ⚖
        </div>
      </motion.div>

      <div>
        <h3
          className="text-2xl font-bold text-white mb-3"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          One Accusation
        </h3>
        <p className="text-[#94A3B8] text-sm max-w-sm leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
          You have one chance to accuse the killer. Interrogate every suspect. Look for contradictions. When you&apos;re certain — make your move.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs text-xs text-[#6B7280] text-left">
        <div className="flex items-center gap-2">
          <span className="text-[#7C3AED]">◆</span>
          <span>Bookmark quotes as clues with the notebook</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#7C3AED]">◆</span>
          <span>Switch between suspects freely</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#7C3AED]">◆</span>
          <span>Your progress saves automatically</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#F43F5E]">◆</span>
          <span>Making an accusation ends the investigation</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(244,63,94,0.5)" }}
        whileTap={{ scale: 0.97 }}
        onClick={onBegin}
        className="px-10 py-4 rounded-md text-sm tracking-[0.15em] uppercase font-bold text-white transition-all"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #F43F5E)",
          fontFamily: "var(--font-orbitron)",
          minHeight: 52,
        }}
      >
        Enter Interrogation Room →
      </motion.button>
    </div>
  )
}
