"use client"

import { useEffect } from "react"
import { useGameStore } from "@/store/gameStore"
import { MainMenu } from "@/components/ui/MainMenu"
import { CaseSelect } from "@/components/ui/CaseSelect"
import { DifficultySelect } from "@/components/ui/DifficultySelect"
import { CaseBriefing } from "@/components/game/CaseBriefing"
import { InterrogationRoom } from "@/components/game/InterrogationRoom"
import { AccusationScreen } from "@/components/game/AccusationScreen"
import { TruthReveal } from "@/components/game/TruthReveal"
import { AnimatePresence, motion } from "framer-motion"
import { AudioProvider } from "@/components/ui/AudioProvider"

export default function Home() {
  const phase = useGameStore((s) => s.phase)

  // Prevent right-click (minor anti-cheat)
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("contextmenu", handler)
    return () => document.removeEventListener("contextmenu", handler)
  }, [])

  const renderPhase = () => {
    switch (phase) {
      case "menu":              return <MainMenu key="menu" />
      case "case_select":       return <CaseSelect key="case_select" />
      case "difficulty_select": return <DifficultySelect key="difficulty_select" />
      case "briefing":          return <CaseBriefing key="briefing" />
      case "interrogation":     return <InterrogationRoom key="interrogation" />
      case "accusation":        return <AccusationScreen key="accusation" />
      case "reveal":            return <TruthReveal key="reveal" />
      default:                  return <MainMenu key="menu" />
    }
  }

  return (
    <AudioProvider>
      <main className="relative w-full min-h-dvh overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full min-h-dvh"
          >
            {renderPhase()}
          </motion.div>
        </AnimatePresence>
      </main>
    </AudioProvider>
  )
}
