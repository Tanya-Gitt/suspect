"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { Clue } from "@/types"
import { X, Star } from "lucide-react"

export function Notebook() {
  const {
    clues,
    playerNotes,
    setPlayerNotes,
    toggleClueKey,
    toggleNotebook,
    setNotebookOpen,
  } = useGameStore()

  // Derived directly from the already-subscribed clues array — avoids a second
  // useGameStore(selector) call that returns a new array ref every render,
  // which would cause the "getSnapshot should be cached" infinite loop.
  const keyClues = clues.filter((c) => c.isKey)
  const [activeTab, setActiveTab] = useState<"clues" | "notes">("clues")

  return (
    <div className="flex flex-col h-full bg-[#11110A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4A853]/20">
        <h3
          className="text-[#D4A853] text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Detective&apos;s Notebook
        </h3>
        <button
          onClick={() => setNotebookOpen(false)}
          className="p-1 text-[#5A5248] hover:text-white transition-colors"
          aria-label="Close notebook"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4A853]/20">
        {(["clues", "notes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs tracking-widest uppercase transition-colors ${
              activeTab === tab
                ? "text-[#D4A853] border-b-2 border-[#D4A853]"
                : "text-[#5A5248] hover:text-[#9A8F7E]"
            }`}
            style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}
          >
            {tab === "clues" ? `Clues (${clues.length})` : "Notes"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "clues" ? (
          <CluesTab clues={clues} keyClues={keyClues} onToggleKey={toggleClueKey} />
        ) : (
          <NotesTab notes={playerNotes} onChange={setPlayerNotes} />
        )}
      </div>

      {/* Key clues summary */}
      {keyClues.length > 0 && activeTab === "clues" && (
        <div className="border-t border-[#D4A853]/20 px-4 py-3">
          <p className="text-[#D4A853] text-xs mb-2" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem", letterSpacing: "0.2em" }}>
            ★ KEY EVIDENCE ({keyClues.length})
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {keyClues.map((c) => (
              <p key={c.id} className="text-[#EDE5D5] text-xs truncate" style={{ fontFamily: "var(--font-jetbrains)" }}>
                <span className="text-[#D4A853]/60">{c.suspectName}:</span> &quot;{c.quote.slice(0, 50)}{c.quote.length > 50 ? "…" : ""}&quot;
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CluesTab({
  clues,
  onToggleKey,
}: {
  clues: Clue[]
  keyClues: Clue[]
  onToggleKey: (id: string) => void
}) {
  if (clues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
        <div className="text-4xl opacity-20">📋</div>
        <p className="text-[#5A5248] text-xs leading-relaxed" style={{ fontFamily: "var(--font-jetbrains)" }}>
          Hover over a suspect&apos;s message and click &quot;Save as clue&quot; to add it here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full p-4 space-y-3 notebook-paper">
      <AnimatePresence>
        {clues.map((clue) => (
          <motion.div
            key={clue.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={`p-3 rounded border text-xs transition-all ${
              clue.isKey
                ? "border-[#D4A853]/50 bg-[#D4A853]/05"
                : "border-[#D4A853]/10 bg-[#16160A]/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[#D4A853]/70 font-medium" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
                {clue.suspectName}
              </span>
              <button
                onClick={() => onToggleKey(clue.id)}
                className={`flex-shrink-0 transition-colors ${clue.isKey ? "text-[#D4A853]" : "text-[#5A5248] hover:text-[#D4A853]"}`}
                aria-label={clue.isKey ? "Unstar clue" : "Star clue"}
              >
                <Star size={12} fill={clue.isKey ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="text-[#EDE5D5] leading-relaxed italic" style={{ fontFamily: "var(--font-jetbrains)" }}>
              &quot;{clue.quote.slice(0, 200)}{clue.quote.length > 200 ? "…" : ""}&quot;
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function NotesTab({ notes, onChange }: { notes: string; onChange: (s: string) => void }) {
  return (
    <div className="h-full notebook-paper">
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your observations, suspicions, theories...&#10;&#10;Who had motive? Who's lying? What doesn't add up?"
        className="w-full h-full bg-transparent px-4 text-xs text-[#EDE5D5] placeholder-[#5A5248]/50 focus:outline-none resize-none leading-7"
        style={{ fontFamily: "var(--font-jetbrains)", lineHeight: "28px", paddingTop: "7px", paddingBottom: "28px" }}
        aria-label="Investigation notes"
      />
    </div>
  )
}
