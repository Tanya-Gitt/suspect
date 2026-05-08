"use client"

import { useEffect, useRef } from "react"
import { useGameStore } from "@/store/gameStore"
import { proceduralAudio } from "@/lib/audio-engine"
import { setupGlobalClickSound } from "@/components/ui/ClickSound"
import type { MoodState } from "@/types"
import type { GamePhase } from "@/store/gameStore"

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const phase      = useGameStore((s) => s.phase)
  const audio      = useGameStore((s) => s.audio)
  const session    = useGameStore((s) => s.session)
  const suspectId  = useGameStore((s) => s.currentSuspectId)
  const streaming  = useGameStore((s) => s.streamingState)
  const clues      = useGameStore((s) => s.clues)
  const result     = useGameStore((s) => s.accuseResult)

  const prevPhase    = useRef<GamePhase | null>(null)
  const prevMood     = useRef<MoodState | null>(null)
  const prevClues    = useRef(0)
  const prevStream   = useRef(false)
  const booted       = useRef(false)

  // ── Boot on first interaction ──────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      if (booted.current) return
      booted.current = true
      proceduralAudio.setVolume(audio.volume)
      proceduralAudio.setEnabled(audio.enabled)
      await proceduralAudio.resume()
      // Set initial atmosphere
      if (phase === "interrogation" && session && suspectId) {
        const mood = session.suspects[suspectId]?.currentMood ?? "calm"
        proceduralAudio.setMood(mood, 1.5)
      } else {
        proceduralAudio.setPhaseAtmosphere(phase)
      }
    }

    window.addEventListener("click",   boot, { once: true, passive: true })
    window.addEventListener("keydown", boot, { once: true, passive: true })
    return () => {
      window.removeEventListener("click",   boot)
      window.removeEventListener("keydown", boot)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Global click sounds on all buttons (after boot) ───────────────────────
  useEffect(() => {
    // Wait for first interaction, then wire global clicks
    const wire = () => setupGlobalClickSound()
    let cleanup: (() => void) | undefined
    window.addEventListener("click", () => { cleanup = wire() }, { once: true, passive: true })
    return () => { cleanup?.() }
  }, [])

  // ── Volume ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!booted.current) return
    proceduralAudio.setVolume(audio.volume)
  }, [audio.volume])

  // ── Enable / mute ─────────────────────────────────────────────────────────
  useEffect(() => {
    proceduralAudio.setEnabled(audio.enabled)
  }, [audio.enabled])

  // ── Phase → atmosphere ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === prevPhase.current) return
    prevPhase.current = phase
    if (!booted.current) return

    if (phase !== "interrogation") {
      proceduralAudio.setPhaseAtmosphere(phase)
      proceduralAudio.whoosh()
    } else {
      // Force-reset mood tracker so interrogation atmosphere always plays,
      // even if the mood hasn't changed from the menu's "calm"
      prevMood.current = null
    }
    if (phase === "accusation") setTimeout(() => proceduralAudio.playAccusation(), 800)
  }, [phase])

  // ── Interrogation: suspect mood → atmosphere ──────────────────────────────
  useEffect(() => {
    if (phase !== "interrogation" || !session || !suspectId) return
    if (!booted.current) return
    const mood = session.suspects[suspectId]?.currentMood ?? "calm"
    if (mood === prevMood.current) return
    prevMood.current = mood
    proceduralAudio.setMood(mood, 2.5)
  })

  // ── Streaming → typewriter tick (handled per-char in InterrogationRoom) ──────
  useEffect(() => {
    if (!streaming.isStreaming) {
      prevStream.current = false
    }
  }, [streaming.isStreaming])

  // ── New clue ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (clues.length > prevClues.current && booted.current) {
      proceduralAudio.playClueFound()
    }
    prevClues.current = clues.length
  }, [clues.length])

  // ── Verdict ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!result || !booted.current) return
    if (result.correct) setTimeout(() => proceduralAudio.playCorrect(), 1200)
    else                setTimeout(() => proceduralAudio.playWrong(),   900)
  }, [result])

  return <>{children}</>
}
