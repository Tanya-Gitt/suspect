"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore, selectCurrentMood, selectConversation, selectAllSuspects } from "@/store/gameStore"
import { Clue, ConversationTurn, MoodState, DifficultyMode } from "@/types"
import { SuspectPanel } from "@/components/game/SuspectPanel"
import { Notebook } from "@/components/game/Notebook"
import { BookMarked, Gavel, Menu, Volume2, VolumeX, User } from "lucide-react"
import { nanoid } from "nanoid"
import { proceduralAudio } from "@/lib/audio-engine"

const MOOD_COLORS: Record<MoodState, string> = {
  calm:     "#C9973E",
  evasive:  "#5A5248",
  nervous:  "#D4A853",
  cracking: "#F97316",
  caught:   "#B91C1C",
}

const MOOD_LABELS: Record<MoodState, string> = {
  calm:     "Calm",
  evasive:  "Evasive",
  nervous:  "Nervous",
  cracking: "Cracking",
  caught:   "Cornered",
}

export function InterrogationRoom() {
  const {
    session,
    currentSuspectId,
    streamingState,
    imageUrls,
    notebookOpen,
    toggleNotebook,
    setCurrentSuspect,
    setStreaming,
    appendStreamChunk,
    finalizeStream,
    addClue,
    setPhase,
    audio,
    setAudioEnabled,
    upsertSaveSlot,
  } = useGameStore()

  const mood = useGameStore(selectCurrentMood)
  const conversation = useGameStore(selectConversation)
  const allSuspects = useGameStore(selectAllSuspects)

  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showSuspectList, setShowSuspectList] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const currentSuspect = allSuspects.find((s) => s.id === currentSuspectId)
  const suspectState = session?.suspects[currentSuspectId ?? ""]

  // Typewriter ticks during AI streaming
  const prevBufLen = useRef(0)
  useEffect(() => {
    if (!streamingState.isStreaming) { prevBufLen.current = 0; return }
    const cur = streamingState.buffer.length
    if (cur > prevBufLen.current) {
      const added = cur - prevBufLen.current
      // Play a tick every ~4 new characters
      if (Math.floor(cur / 4) > Math.floor(prevBufLen.current / 4)) {
        proceduralAudio.typeKey()
      }
      prevBufLen.current = cur
    }
  }, [streamingState.buffer, streamingState.isStreaming])

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation, streamingState.buffer])

  // Auto-save periodically
  useEffect(() => {
    if (!session) return
    const timer = setInterval(async () => {
      try {
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            playerNotes: useGameStore.getState().playerNotes,
            clues: useGameStore.getState().clues,
          }),
        })
        upsertSaveSlot({
          sessionId: session.id,
          caseId: session.caseId,
          caseTitle: session.casePublic.title,
          difficulty: session.difficulty as DifficultyMode,
          startedAt: session.startedAt,
          lastPlayedAt: Date.now(),
          status: "active",
          accusationMade: false,
          currentSuspectId: useGameStore.getState().currentSuspectId ?? undefined,
        })
      } catch {
        // Silently fail
      }
    }, 30000) // every 30s

    return () => clearInterval(timer)
  }, [session, upsertSaveSlot])

  const sendMessage = useCallback(async () => {
    if (!message.trim() || streamingState.isStreaming || !session || !currentSuspectId) return

    const userMsg = message.trim()
    setMessage("")
    setError(null)

    // Optimistically add player turn
    const playerTurn: ConversationTurn = {
      role: "player",
      content: userMsg,
      timestamp: Date.now(),
    }
    useGameStore.getState().appendConversationTurn(currentSuspectId, playerTurn)

    setStreaming({ isStreaming: true, suspectId: currentSuspectId, buffer: "" })

    abortRef.current = new AbortController()

    try {
      // Send full context so the server is stateless (no DB needed)
      const storeSession = useGameStore.getState().session
      const currentConversation = storeSession?.suspects[currentSuspectId]?.conversationHistory ?? []
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          suspectId: currentSuspectId,
          message: userMsg,
          caseId: session.caseId,
          difficulty: session.difficulty,
          conversationHistory: currentConversation,
          exchangeCount: suspectState?.exchangeCount ?? 0,
          currentMood: suspectState?.currentMood ?? "calm",
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Suspect not responding")
      }

      // Stream response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk
        // Don't stream the mood tag to the UI
        if (!chunk.includes("[MOOD:")) appendStreamChunk(chunk)
      }

      // Extract mood from server-appended tag, fall back to client-side guess
      const moodMatch = fullText.match(/\[MOOD:(\w+)\]/)
      const cleanText = fullText.replace(/\n\n\[MOOD:\w+\]$/, "")
      const newMood: MoodState = (moodMatch?.[1] as MoodState) ??
        guessClientMood(cleanText, suspectState?.currentMood ?? "calm", suspectState?.exchangeCount ?? 0)
      finalizeStream(currentSuspectId, cleanText, newMood)
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return
      setError((err as Error).message || "The suspect refused to answer.")
      setStreaming({ isStreaming: false, suspectId: null, buffer: "" })
    }
  }, [message, streamingState.isStreaming, session, currentSuspectId, suspectState, setStreaming, appendStreamChunk, finalizeStream])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleAddClue(quote: string) {
    if (!currentSuspect || !session) return
    const clue: Clue = {
      id: nanoid(),
      suspectId: currentSuspect.id,
      suspectName: currentSuspect.name,
      quote,
      timestamp: Date.now(),
      isKey: false,
    }
    addClue(clue)
    proceduralAudio.playClueFound()
  }

  if (!session || !currentSuspect) return null

  const moodColor = MOOD_COLORS[mood]

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* ─── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#222018] bg-[#0A0907]/95 backdrop-blur-sm z-20">
        <button
          onClick={() => setShowSuspectList(!showSuspectList)}
          className="p-2 hover:text-[#C9973E] transition-colors"
          aria-label="Switch suspect"
        >
          <Menu size={18} />
        </button>

        {/* Current suspect + mood */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: moodColor }}>
            {imageUrls[currentSuspect.id] ? (
              <img src={imageUrls[currentSuspect.id]} alt={currentSuspect.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1C1917] flex items-center justify-center">
                <User size={14} className="text-[#5A5248]" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate" style={{ fontFamily: "var(--font-orbitron)" }}>
              {currentSuspect.name}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: moodColor }} />
              <p className="text-xs" style={{ color: moodColor, fontFamily: "var(--font-jetbrains)" }}>
                {MOOD_LABELS[mood]}
              </p>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { toggleNotebook(); proceduralAudio.pageTurn() }}
            className={`p-2 transition-colors ${notebookOpen ? "text-[#D4A853]" : "hover:text-[#D4A853]"}`}
            aria-label="Toggle notebook"
          >
            <BookMarked size={18} />
          </button>
          <button
            onClick={() => setAudioEnabled(!audio.enabled)}
            className="p-2 hover:text-[#C9973E] transition-colors"
            aria-label={audio.enabled ? "Mute" : "Unmute"}
          >
            {audio.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => { proceduralAudio.playTensionSting(); setTimeout(() => setPhase("accusation"), 300) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#B91C1C]/40 text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-all text-xs ml-1"
            style={{ fontFamily: "var(--font-orbitron)", minHeight: 34 }}
          >
            <Gavel size={13} />
            Accuse
          </button>
        </div>
      </header>

      {/* ─── Suspect switcher drawer ── */}
      <AnimatePresence>
        {showSuspectList && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-b border-[#222018] bg-[#141210] z-10"
          >
            <div className="flex gap-3 px-4 py-3">
              {allSuspects.map((s) => {
                const sMood = session.suspects[s.id]?.currentMood ?? "calm"
                const color = MOOD_COLORS[sMood]
                const isActive = s.id === currentSuspectId
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentSuspect(s.id)
                      setShowSuspectList(false)
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                      isActive ? "bg-[#C9973E]/20 border border-[#C9973E]/50" : "hover:bg-[#1C1917]"
                    }`}
                    style={{ minWidth: 64 }}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: color }}>
                      {imageUrls[s.id] ? (
                        <img src={imageUrls[s.id]} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1C1917] flex items-center justify-center">
                          <User size={12} className="text-[#5A5248]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-[#EDE5D5] leading-tight max-w-[60px] truncate" style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.6rem" }}>
                      {s.name.split(" ")[0]}
                    </p>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Suspect profile panel (left, desktop) */}
        <div className="hidden lg:flex w-72 flex-shrink-0 border-r border-[#222018] flex-col overflow-hidden">
          <SuspectPanel
            suspect={currentSuspect}
            suspectState={suspectState}
            mood={mood}
            imageUrl={imageUrls[currentSuspect.id]}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Conversation */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {/* Empty state */}
            {conversation.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-[#141210] border border-[#222018] flex items-center justify-center">
                  {imageUrls[currentSuspect.id] ? (
                    <img src={imageUrls[currentSuspect.id]} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User size={20} className="text-[#5A5248]" />
                  )}
                </div>
                <p className="text-[#9A8F7E] text-sm" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {currentSuspect.name} is waiting.
                </p>
                <p className="text-[#5A5248] text-xs max-w-xs">
                  Ask them where they were that night. What they know. What they&apos;re hiding.
                </p>
              </motion.div>
            )}

            {/* Messages */}
            {conversation.map((turn, i) => (
              <ChatBubble
                key={i}
                turn={turn}
                suspectName={currentSuspect.name}
                suspectImage={imageUrls[currentSuspect.id]}
                onAddClue={turn.role === "suspect" ? () => handleAddClue(turn.content) : undefined}
              />
            ))}

            {/* Streaming buffer */}
            {streamingState.isStreaming && streamingState.buffer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-2xl"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[#222018]">
                  {imageUrls[currentSuspect.id] ? (
                    <img src={imageUrls[currentSuspect.id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-[#1C1917] flex items-center justify-center rounded-full">
                      <User size={12} className="text-[#5A5248]" />
                    </div>
                  )}
                </div>
                <div
                  className="px-4 py-3 rounded-lg bg-[#141210] border text-sm text-[#EDE5D5] leading-relaxed"
                  style={{ borderColor: moodColor + "40", fontFamily: "var(--font-jetbrains)" }}
                >
                  {streamingState.buffer}
                  <span className="cursor" />
                </div>
              </motion.div>
            )}

            {/* Typing indicator */}
            {streamingState.isStreaming && !streamingState.buffer && (
              <div className="flex gap-2 items-center px-4 py-3 bg-[#141210] rounded-lg w-24 border border-[#222018]">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#5A5248]"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mb-2 px-3 py-2 rounded border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C] text-xs"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-[#222018] bg-[#0A0907]">
            <div
              className="flex gap-3 items-end p-1 rounded-lg border transition-colors focus-within:border-[#C9973E]/60"
              style={{ borderColor: streamingState.isStreaming ? "#222018" : "#222018", background: "#141210" }}
            >
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                maxLength={500}
                disabled={streamingState.isStreaming}
                rows={1}
                className="flex-1 bg-transparent resize-none px-3 py-2.5 text-sm text-[#EDE5D5] placeholder-[#5A5248] focus:outline-none disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  maxHeight: 120,
                  lineHeight: 1.6,
                }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = "auto"
                  t.style.height = Math.min(t.scrollHeight, 120) + "px"
                }}
                aria-label="Message to suspect"
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={sendMessage}
                disabled={streamingState.isStreaming || !message.trim()}
                className={`px-4 py-2.5 rounded-md text-xs tracking-widest uppercase transition-all flex-shrink-0 ${
                  message.trim() && !streamingState.isStreaming
                    ? "bg-[#C9973E] text-white hover:bg-[#A87B2A]"
                    : "bg-[#222018] text-[#5A5248] cursor-not-allowed"
                }`}
                style={{ fontFamily: "var(--font-orbitron)", minHeight: 40, minWidth: 60 }}
                aria-label="Send"
              >
                Send
              </motion.button>
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <p className="text-[#5A5248] text-xs">
                Press Enter to send · Shift+Enter for new line
              </p>
              {message.length > 400 && (
                <p className={`text-xs tabular-nums ${message.length >= 500 ? "text-[#B91C1C]" : "text-[#D4A853]"}`}
                  style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {message.length}/500
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notebook panel */}
        <AnimatePresence>
          {notebookOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="hidden md:flex flex-col border-l border-[#222018] overflow-hidden flex-shrink-0"
            >
              <Notebook />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({
  turn,
  suspectName,
  suspectImage,
  onAddClue,
}: {
  turn: ConversationTurn
  suspectName: string
  suspectImage?: string
  onAddClue?: () => void
}) {
  const [showActions, setShowActions] = useState(false)
  const isPlayer = turn.role === "player"

  if (isPlayer) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="max-w-md px-4 py-3 rounded-lg text-sm text-white leading-relaxed"
          style={{
            background: "linear-gradient(135deg, #C9973E, #A87B2A)",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          {turn.content}
        </div>
      </motion.div>
    )
  }

  const moodColor = turn.mood ? MOOD_COLORS[turn.mood] : MOOD_COLORS.calm

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 max-w-2xl group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: moodColor + "60" }}>
        {suspectImage ? (
          <img src={suspectImage} alt={suspectName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#1C1917] flex items-center justify-center">
            <User size={12} className="text-[#5A5248]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium" style={{ color: moodColor, fontFamily: "var(--font-orbitron)" }}>
            {suspectName}
          </span>
          {turn.mood && (
            <span className="text-xs text-[#5A5248]">· {MOOD_LABELS[turn.mood]}</span>
          )}
        </div>
        <div
          className="px-4 py-3 rounded-lg text-sm text-[#EDE5D5] leading-relaxed border"
          style={{
            background: "#141210",
            borderColor: moodColor + "30",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          {turn.content}
        </div>

        {/* Save as clue */}
        <AnimatePresence>
          {showActions && onAddClue && (
            <motion.button
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onClick={onAddClue}
              className="mt-1.5 text-xs text-[#D4A853] hover:text-white transition-colors flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              <BookMarked size={11} />
              Save as clue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Client-side mood guess (immediate feedback; server updates session truth) ─
function guessClientMood(text: string, current: MoodState, exchangeCount: number): MoodState {
  const lower = text.toLowerCase()
  const nervousWords = ["i don't know", "i can't", "please", "nervous", "shaking", "why are you", "stop"]
  const crackingWords = ["fine", "alright", "yes i was", "you're right", "i admit", "truth is"]
  const caughtWords = ["i did", "i killed", "i poisoned", "it was me", "you know", "you figured"]

  if (caughtWords.some((w) => lower.includes(w))) return "caught"
  if (crackingWords.some((w) => lower.includes(w)) && exchangeCount > 4) return "cracking"
  if (nervousWords.some((w) => lower.includes(w)) || (exchangeCount > 6 && current === "evasive")) return "nervous"
  if (exchangeCount > 3 && current === "calm") return "evasive"
  return current
}
