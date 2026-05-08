"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { SuspectPublic, SuspectSessionState, MoodState } from "@/types"
import { User } from "lucide-react"

const MOOD_COLORS: Record<MoodState, string> = {
  calm:     "#7C3AED",
  evasive:  "#6B7280",
  nervous:  "#D4A853",
  cracking: "#F97316",
  caught:   "#F43F5E",
}

const MOOD_FILTER: Record<MoodState, string> = {
  calm:     "brightness(1) saturate(1)",
  evasive:  "brightness(0.9) saturate(0.8)",
  nervous:  "brightness(0.85) saturate(1.2)",
  cracking: "brightness(0.75) saturate(1.5) contrast(1.1)",
  caught:   "brightness(0.65) saturate(0.4) contrast(1.3)",
}

interface SuspectPanelProps {
  suspect: SuspectPublic
  suspectState?: SuspectSessionState
  mood: MoodState
  imageUrl?: string
}

export function SuspectPanel({ suspect, suspectState, mood, imageUrl }: SuspectPanelProps) {
  const moodColor = MOOD_COLORS[mood]
  const exchangeCount = suspectState?.exchangeCount ?? 0
  const moodProgress = Math.min(exchangeCount / 100, 1) // 0–1 for visual progress
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when suspect changes
  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
    setRetryCount(0)
  }, [imageUrl])

  // Cleanup timer on unmount
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current) }, [])

  function handleImgError() {
    if (retryCount < 3) {
      // Retry after a delay — Pollinations has transient 500s
      retryTimer.current = setTimeout(() => {
        setImgError(false)  // clear error → triggers re-render → browser re-requests
        setRetryCount((n) => n + 1)
      }, 5000 + retryCount * 3000) // 5s, 8s, 11s
    } else {
      setImgError(true)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Portrait */}
      <div className="relative">
        <motion.div
          className="w-full aspect-square rounded-lg overflow-hidden border-2"
          style={{
            borderColor: moodColor,
            boxShadow: `0 0 20px ${moodColor}30`,
          }}
          animate={{
            borderColor: moodColor,
            boxShadow: `0 0 20px ${moodColor}30`,
          }}
          transition={{ duration: 1 }}
        >
          {/* Placeholder always present — hidden once image loads */}
          {(!imgLoaded || imgError || !imageUrl) && (
            <div className="absolute inset-0 bg-[#16162A] flex flex-col items-center justify-center gap-2">
              {imageUrl && !imgError ? (
                /* Loading shimmer */
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-[#2A2A4A] border-t-[#7C3AED] animate-spin" />
                  <p className="text-[#6B7280] text-xs" style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {retryCount > 0 ? `Retrying… (${retryCount}/3)` : "Generating portrait…"}
                  </p>
                </div>
              ) : (
                <User size={48} className="text-[#2A2A4A]" />
              )}
            </div>
          )}

          {imageUrl && !imgError && (
            <motion.img
              key={`${imageUrl}-${retryCount}`}
              src={retryCount > 0 ? `${imageUrl}&_r=${retryCount}` : imageUrl}
              alt={suspect.name}
              className="w-full h-full object-cover"
              style={{ opacity: imgLoaded ? 1 : 0 }}
              animate={{ filter: MOOD_FILTER[mood], opacity: imgLoaded ? 1 : 0 }}
              transition={{ duration: imgLoaded ? 1.5 : 0.8, ease: "easeInOut" }}
              onLoad={() => setImgLoaded(true)}
              onError={handleImgError}
            />
          )}
        </motion.div>

        {/* Mood badge */}
        <motion.div
          className="absolute bottom-2 left-2 right-2 px-3 py-1 rounded text-center text-xs font-bold tracking-[0.15em] uppercase"
          animate={{ background: moodColor + "CC", color: "#fff" }}
          transition={{ duration: 0.8 }}
          style={{ fontFamily: "var(--font-orbitron)", backdropFilter: "blur(8px)" }}
        >
          {mood}
        </motion.div>
      </div>

      {/* Suspect info */}
      <div>
        <h3 className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-orbitron)" }}>
          {suspect.name}
        </h3>
        <p className="text-[#94A3B8] text-xs mt-0.5">{suspect.age} · {suspect.occupation}</p>
        <p className="text-[#6B7280] text-xs mt-1 italic">{suspect.relationship}</p>
      </div>

      {/* Tension meter */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[#6B7280] text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
            Pressure
          </p>
          <p className="text-xs" style={{ color: moodColor, fontFamily: "var(--font-jetbrains)" }}>
            {exchangeCount} exchanges
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-[#2A2A4A] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #7C3AED, ${moodColor})` }}
            animate={{ width: `${moodProgress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Backstory */}
      <div className="border-t border-[#2A2A4A] pt-3">
        <p className="text-[#6B7280] text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
          Background
        </p>
        <p className="text-[#94A3B8] text-xs leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
          {suspect.backstory}
        </p>
      </div>

      {/* Interrogated indicator */}
      {suspectState?.interrogated && (
        <div className="flex items-center gap-1.5 text-[#22C55E] text-xs">
          <span>✓</span>
          <span style={{ fontFamily: "var(--font-jetbrains)" }}>Interrogated</span>
        </div>
      )}
    </div>
  )
}
