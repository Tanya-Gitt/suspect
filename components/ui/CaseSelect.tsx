"use client"

import { motion } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react"

const AVAILABLE_CASES = [
  {
    id: "blackwood-manor",
    title: "The Blackwood Inheritance",
    tagline: "A dying man. A forged will. Three people who stood to lose everything.",
    tone: "disturbing",
    era: "Present Day",
    setting: "English countryside manor, autumn, fog",
    victim: "Edmund Blackwood, 78",
    suspects: 3,
    estimatedTime: "30 min – 4 hours",
    contentWarning: "Contains themes of family betrayal, greed, and poisoning",
    locked: false,
  },
  {
    id: "harbor-light",
    title: "The Harbor Light",
    tagline: "A lighthouse keeper. A missing fisherman. An island with no exits.",
    tone: "suspense",
    era: "1947",
    setting: "Remote Scottish island, autumn gale, lighthouse",
    victim: "Hamish McRae, 41",
    suspects: 4,
    estimatedTime: "1 – 3 hours",
    contentWarning: "Cold-blooded killer with a 22-year secret. Witnesses who lie out of grief, not guilt.",
    locked: false,
  },
  {
    id: "red-thread",
    title: "The Red Thread",
    tagline: "A fashion muse. A strangled model. Five people who wanted her gone.",
    tone: "twist",
    era: "Present Day",
    setting: "Paris haute couture, the night before the show",
    victim: "Inès Vexille, 26",
    suspects: 5,
    estimatedTime: "2 – 5 hours",
    contentWarning: "Eight-year revenge plot. Two red herrings. The murderer is not who you think.",
    locked: false,
  },
  {
    id: "vienna-protocol",
    title: "The Vienna Protocol",
    tagline: "A defector. A dead handler. Five agents who all had orders to kill him.",
    tone: "suspense",
    era: "1973",
    setting: "Vienna, Cold War, rain-slicked cobblestones, baroque apartments",
    victim: "Heinrich Brauer, 54",
    suspects: 5,
    estimatedTime: "2 – 5 hours",
    contentWarning: "Cold War intelligence, a mole inside the investigation, and a killer who was never in the building.",
    locked: false,
  },
  {
    id: "eclipse-protocol",
    title: "The Eclipse Protocol",
    tagline: "A biotech CEO. A locked server room. Six people with the formula — and a reason to bury it.",
    tone: "twist",
    era: "Present Day",
    setting: "San Francisco biotech campus, sterile corridors, server room blue light",
    victim: "Dr. Priya Sengupta, 46",
    suspects: 5,
    estimatedTime: "2 – 6 hours",
    contentWarning: "Corporate assassination with a $40B motive. The killer never touched the victim.",
    locked: false,
  },
  {
    id: "ashwood-covenant",
    title: "The Ashwood Covenant",
    tagline: "A cult leader. A missing girl. Six disciples who all swore they were the last to see her alive.",
    tone: "horror",
    era: "Present Day",
    setting: "Remote Pacific Northwest compound, old-growth forest, perpetual grey sky",
    victim: "Rebekah Coles, 24",
    suspects: 5,
    estimatedTime: "3 – 6 hours",
    contentWarning: "Cult dynamics, manipulation, and a killer who has done this before. Most disturbing case in the set.",
    locked: false,
  },
]

const TONE_COLORS: Record<string, string> = {
  disturbing: "#B91C1C",
  horror: "#7F1D1D",
  suspense: "#D4A853",
  sad: "#7EA8C4",
  twist: "#C9973E",
}

export function CaseSelect() {
  const { setPhase, setSelectedCase } = useGameStore()

  function handleSelectCase(caseId: string) {
    setSelectedCase(caseId)
    setPhase("difficulty_select")
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 mb-10"
      >
        <button
          onClick={() => setPhase("menu")}
          className="p-2 hover:text-[#C9973E] transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-[#9A8F7E] text-xs tracking-[0.3em] uppercase mb-1" style={{ fontFamily: "var(--font-orbitron)" }}>
            Case Files
          </h2>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-orbitron)" }}>
            Select Investigation
          </h1>
        </div>
      </motion.div>

      {/* Case grid */}
      <div className="flex flex-col gap-4">
        {AVAILABLE_CASES.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <div
              onClick={() => !c.locked && handleSelectCase(c.id)}
              className={`relative noir-card p-6 transition-all duration-200 ${
                c.locked
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer hover:border-[#C9973E]/50 hover:bg-[#1C1917]"
              }`}
              role={c.locked ? undefined : "button"}
              tabIndex={c.locked ? -1 : 0}
              onKeyDown={(e) => !c.locked && e.key === "Enter" && handleSelectCase(c.id)}
              aria-disabled={c.locked}
            >
              {/* Tone badge */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <span
                  className="text-xs tracking-[0.2em] uppercase px-2 py-1 rounded"
                  style={{
                    color: TONE_COLORS[c.tone] || "#9A8F7E",
                    background: `${TONE_COLORS[c.tone] || "#9A8F7E"}15`,
                    border: `1px solid ${TONE_COLORS[c.tone] || "#9A8F7E"}30`,
                    fontFamily: "var(--font-orbitron)",
                    fontSize: "0.65rem",
                  }}
                >
                  {c.tone}
                </span>
                {c.locked && (
                  <span className="text-xs text-[#5A5248] tracking-widest uppercase">
                    ◉ Coming Soon
                  </span>
                )}
                {!c.locked && (
                  <div className="flex items-center gap-1 text-[#5A5248] text-xs">
                    <Clock size={11} />
                    <span>{c.estimatedTime}</span>
                  </div>
                )}
              </div>

              <h3
                className="text-xl text-white font-bold mb-2 leading-tight"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {c.title}
              </h3>
              <p className="text-[#9A8F7E] text-sm leading-relaxed mb-4" style={{ fontFamily: "var(--font-jetbrains)" }}>
                {c.tagline}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A5248]">
                <span>{c.era}</span>
                <span>·</span>
                <span>{c.suspects} suspects</span>
                <span>·</span>
                <span className="truncate max-w-[200px]">{c.setting}</span>
              </div>

              {/* Content warning */}
              {!c.locked && c.contentWarning && (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#9A8F7E]/80">
                  <AlertTriangle size={11} />
                  <span>{c.contentWarning}</span>
                </div>
              )}

              {/* Hover arrow indicator */}
              {!c.locked && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#C9973E]/40 text-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-xs text-[#5A5248]"
        style={{ fontFamily: "var(--font-jetbrains)" }}
      >
        New cases are added regularly. Each case is a unique handcrafted mystery.
      </motion.p>
    </div>
  )
}
