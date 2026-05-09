"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useGameStore, SaveSlot } from "@/store/gameStore"
import { DIFFICULTY_LABELS, DifficultyMode } from "@/types"
import { Volume2, VolumeX } from "lucide-react"

// ─── Boot sequence lines ──────────────────────────────────────────────────────
type BLine = { text: string; delay: number; color: string; speed: number; dim?: boolean; indent?: boolean }

const BOOT_LINES: BLine[] = [
  { text: "HOMICIDE DIVISION — SECURE TERMINAL",       delay: 0,    color: "#2E251A", speed: 0 },
  { text: `SESSION: ${new Date().toISOString().slice(0, 19)}Z`, delay: 0, color: "#2E251A", speed: 0 },
  { text: "",                                           delay: 250,  color: "",        speed: 0 },
  { text: "Establishing encrypted tunnel...",          delay: 400,  color: "#5A5248", speed: 20, dim: true },
  { text: "Handshake OK. Latency: 12ms.",              delay: 900,  color: "#5A5248", speed: 18, dim: true },
  { text: "Verifying credentials...",                  delay: 1400, color: "#5A5248", speed: 20, dim: true },
  { text: "",                                           delay: 1900, color: "",        speed: 0 },
  { text: "OPERATIVE IDENTITY  ·  CONFIRMED",         delay: 2000, color: "#C9973E", speed: 16 },
  { text: "CLEARANCE TIER      ·  DETECTIVE / CLASS-A", delay: 2400, color: "#C9973E", speed: 14 },
  { text: "ACCESS GRANTED.",                           delay: 2900, color: "#D4A853", speed: 12 },
  { text: "",                                           delay: 3300, color: "",        speed: 0 },
  { text: "Retrieving case index...",                  delay: 3500, color: "#5A5248", speed: 18, dim: true },
  { text: "6 cases on file. AI suspects active.",     delay: 3900, color: "#9A8F7E", speed: 14 },
  { text: "",                                           delay: 4300, color: "",        speed: 0 },
  { text: "! ONE ACCUSATION PERMITTED.",               delay: 4500, color: "#B91C1C", speed: 12 },
]

const BOOT_DONE_AT = 5400 // ms after mount when right panel appears
const CMDS_AT      = 5400

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useTyped(text: string, speed: number, active: boolean) {
  const [out, setOut] = useState("")
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) return
    if (speed === 0) { setOut(text); setDone(true); return }
    setOut(""); setDone(false)
    let i = 0
    const iv = setInterval(() => {
      setOut(text.slice(0, i + 1)); i++
      if (i >= text.length) { clearInterval(iv); setDone(true) }
    }, speed)
    return () => clearInterval(iv)
  }, [active, text, speed])
  return { out, done }
}

function BLineRow({ line, active }: { line: BLine; active: boolean }) {
  const { out, done } = useTyped(line.text, line.speed, active)
  if (!active && line.text !== "") return null
  if (line.text === "") return <div style={{ height: "0.7rem" }} />
  return (
    <div style={{
      color: line.color, fontFamily: "var(--font-jetbrains)", fontSize: "0.7rem",
      lineHeight: 1.75, opacity: line.dim ? 0.45 : 1,
      paddingLeft: line.indent ? "1.5rem" : 0, letterSpacing: "0.04em",
    }}>
      {out}
      {!done && <span style={{ color: "#C9973E", animation: "blink 1s step-end infinite" }}>▋</span>}
    </div>
  )
}

function ClockWidget() {
  const [t, setT] = useState("")
  useEffect(() => {
    const tick = () => setT(new Date().toISOString().slice(11, 19) + "Z")
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])
  return (
    <span style={{ color: "#2E251A", fontFamily: "var(--font-jetbrains)", fontSize: "0.55rem", letterSpacing: "0.1em" }}>
      {t}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MainMenu() {
  const { setPhase, saveSlots, removeSaveSlot, audio, setAudioEnabled, loadSession } = useGameStore()

  const activeSlots    = saveSlots.filter((s) => s.status === "active")
  const completedSlots = saveSlots.filter((s) => s.status === "completed" || s.status === "replaying")
  const hasSlots       = saveSlots.length > 0

  const [activeLines,  setActiveLines]  = useState<number[]>([])
  const [showRight,    setShowRight]    = useState(false)
  const [showCmds,     setShowCmds]     = useState(false)

  // Command mode: "main" | "slots" | "reset_confirm"
  const [mode,         setMode]         = useState<"main" | "slots" | "reset_confirm">("main")
  const [typed,        setTyped]        = useState("")
  const [submitted,    setSubmitted]    = useState(false)
  const [hovered,      setHovered]      = useState<string | null>(null)

  // Continue flow
  const [continuingSlot,  setContinuingSlot]  = useState<string | null>(null)
  const [continueError,   setContinueError]   = useState<string | null>(null)
  const [deletingSlot,    setDeletingSlot]    = useState<string | null>(null)

  const logEndRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Boot sequence timers
  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = []
    BOOT_LINES.forEach((l, i) => T.push(setTimeout(() => setActiveLines(p => [...p, i]), l.delay)))
    T.push(setTimeout(() => setShowRight(true), BOOT_DONE_AT))
    T.push(setTimeout(() => setShowCmds(true), CMDS_AT))
    return () => T.forEach(clearTimeout)
  }, [])

  // Auto-scroll log
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [activeLines])

  // Focus input when commands appear
  useEffect(() => { if (showCmds) inputRef.current?.focus() }, [showCmds, mode])

  // ── Continue handler ──────────────────────────────────────────────────────
  const handleContinue = useCallback(async (slot: SaveSlot) => {
    setContinuingSlot(slot.sessionId)
    setContinueError(null)
    try {
      let session: ReturnType<typeof JSON.parse> | null = null
      const res = await fetch(`/api/session?id=${slot.sessionId}`)
      if (res.ok) {
        session = await res.json()
      } else {
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
        useGameStore.getState().upsertSaveSlot({ ...slot, sessionId: session.id, lastPlayedAt: Date.now() })
      }
      loadSession(session)
      sessionStorage.setItem("current_session_id", session.id)
      setPhase("briefing")
    } catch (err: unknown) {
      setContinueError(err instanceof Error ? err.message : "Could not load session.")
      setContinuingSlot(null)
    }
  }, [loadSession, setPhase])

  // ── Delete slot ───────────────────────────────────────────────────────────
  const handleDelete = useCallback((sessionId: string) => {
    setDeletingSlot(sessionId)
    setTimeout(() => {
      removeSaveSlot(sessionId)
      setDeletingSlot(null)
      // If no more slots, go back to main
      if (saveSlots.filter(s => s.sessionId !== sessionId).length === 0) setMode("main")
    }, 300)
  }, [removeSaveSlot, saveSlots])

  // ── Build command list based on mode ─────────────────────────────────────
  type Cmd = { key: string; label: string; desc: string; action: () => void; danger?: boolean }

  const mainCmds: Cmd[] = [
    { key: "1", label: "new investigation", desc: "Open a fresh case file",
      action: () => { setTyped("new investigation"); setSubmitted(true); setTimeout(() => setPhase("case_select"), 800) } },
    ...(activeSlots.length > 0 ? [{
      key: "2", label: `continue  (${activeSlots.length} active)`,
      desc: "Resume an open investigation",
      action: () => setMode("slots"),
    }] : []),
    ...(completedSlots.length > 0 ? [{
      key: activeSlots.length > 0 ? "3" : "2",
      label: `closed cases  (${completedSlots.length})`,
      desc: "Replay a solved case",
      action: () => setMode("slots"),
    }] : []),
    ...(hasSlots ? [{
      key: activeSlots.length > 0 ? (completedSlots.length > 0 ? "4" : "3") : (completedSlots.length > 0 ? "3" : "2"),
      label: "reset progress",
      desc: `Wipe all ${saveSlots.length} save${saveSlots.length !== 1 ? "s" : ""}`,
      action: () => setMode("reset_confirm"),
      danger: true,
    }] : []),
  ]

  const allSlots = [...activeSlots, ...completedSlots]
  const slotCmds: Cmd[] = [
    ...allSlots.map((slot, i) => {
      const daysAgo = Math.floor((Date.now() - slot.lastPlayedAt) / 86400000)
      const when    = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`
      const status  = slot.status === "completed"
        ? (slot.wasCorrect ? "✓ solved" : "✗ failed")
        : "active"
      return {
        key: String(i + 1),
        label: slot.caseTitle,
        desc:  `${DIFFICULTY_LABELS[slot.difficulty as DifficultyMode]} · ${when} · ${status}`,
        action: () => handleContinue(slot),
      }
    }),
    { key: "0", label: "← back", desc: "Return to main menu",
      action: () => { setMode("main"); setContinueError(null) } },
  ]

  const resetCmds: Cmd[] = [
    { key: "y", label: "yes, wipe everything", desc: `Delete all ${saveSlots.length} save${saveSlots.length !== 1 ? "s" : ""} permanently`,
      action: () => {
        useGameStore.setState({ saveSlots: [] })
        setMode("main")
      },
      danger: true },
    { key: "n", label: "cancel", desc: "Keep saves, go back",
      action: () => setMode("main") },
  ]

  const activeCmds = mode === "main" ? mainCmds : mode === "slots" ? slotCmds : resetCmds

  // Keyboard shortcuts
  useEffect(() => {
    if (!showCmds || submitted) return
    const handler = (e: KeyboardEvent) => {
      const cmd = activeCmds.find(c => c.key === e.key.toLowerCase())
      if (cmd) cmd.action()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [showCmds, submitted, activeCmds])

  // ── Mode heading ─────────────────────────────────────────────────────────
  const modeHeading = mode === "slots" ? "SELECT INVESTIGATION" : mode === "reset_confirm" ? "CONFIRM RESET" : "SELECT AN ACTION"
  const modeHint    = mode === "slots" ? "click or press key"  : mode === "reset_confirm" ? "this cannot be undone" : "click or press key"

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col relative" style={{ background: "#050403" }}>

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
      }} />

      {/* Phosphor amber glow */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(201,151,62,0.05) 0%, transparent 70%)",
      }} />

      {/* Corner vignette */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        background: "radial-gradient(ellipse 88% 82% at 50% 50%, transparent 35%, rgba(0,0,0,0.82) 100%)",
      }} />

      {/* ── Two-column layout ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden px-6 md:px-10 lg:px-16 pt-6 pb-4 gap-6 lg:gap-14 max-w-6xl mx-auto w-full">

        {/* LEFT — boot log */}
        <div className="flex flex-col w-72 lg:w-88 flex-shrink-0 overflow-hidden">
          {/* Log header */}
          <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(201,151,62,0.08)" }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9973E]"
                style={{ boxShadow: "0 0 5px rgba(201,151,62,0.6)" }} />
              <span style={{ color: "#2E251A", fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem", letterSpacing: "0.2em" }}>
                SECURE TERMINAL
              </span>
            </div>
            <ClockWidget />
          </div>

          {/* Scrollable log output */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {BOOT_LINES.map((line, i) => (
              <BLineRow key={i} line={line} active={activeLines.includes(i)} />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Vertical divider */}
        <div className="flex-shrink-0 w-px self-stretch" style={{
          background: "linear-gradient(to bottom, transparent, rgba(201,151,62,0.12) 25%, rgba(201,151,62,0.12) 75%, transparent)",
        }} />

        {/* RIGHT — title + commands */}
        <div className="flex-1 flex flex-col justify-center min-w-0 gap-0"
          style={{ opacity: showRight ? 1 : 0, transition: "opacity 0.8s ease" }}>

          {/* Case tag */}
          <p style={{ color: "#B91C1C", fontFamily: "var(--font-orbitron)",
            fontSize: "0.52rem", letterSpacing: "0.4em", marginBottom: "0.6rem" }}>
            ◉ CASE FILE 001 — HOMICIDE DIVISION
          </p>

          {/* Title */}
          <h1 style={{
            fontFamily: "var(--font-orbitron)", fontWeight: 900,
            fontSize: "clamp(2rem, 4vw, 3.4rem)", letterSpacing: "0.1em",
            color: "#EDE5D5", lineHeight: 1,
            textShadow: "0 0 50px rgba(201,151,62,0.25), 0 0 100px rgba(201,151,62,0.08)",
          }}>
            SUSPECT
          </h1>

          {/* Tagline */}
          <p style={{ color: "#3A3028", fontFamily: "var(--font-jetbrains)",
            fontSize: "0.62rem", letterSpacing: "0.2em", marginTop: "0.55rem" }}>
            AI INTERROGATION GAME · EVERYONE IS LYING · ONE ACCUSATION
          </p>

          {/* Divider */}
          <div className="my-5 h-px" style={{
            background: "linear-gradient(to right, rgba(201,151,62,0.18), transparent)",
          }} />

          {/* Commands */}
          <div style={{ opacity: showCmds ? 1 : 0, transition: "opacity 0.5s ease" }}>

            {/* Mode heading */}
            <p style={{ color: "#5A5248", fontFamily: "var(--font-jetbrains)",
              fontSize: "0.6rem", letterSpacing: "0.15em", marginBottom: "0.85rem" }}>
              {modeHeading} <span style={{ color: "#2E251A" }}>· {modeHint}</span>
            </p>

            {/* Command rows */}
            {!submitted && (
              <div className="space-y-1.5 mb-5">
                {activeCmds.map(({ key, label, desc, action, danger }) => {
                  const isLoading = mode === "slots" && continuingSlot === allSlots[parseInt(key) - 1]?.sessionId
                  const isDeleting = mode === "slots" && deletingSlot === allSlots[parseInt(key) - 1]?.sessionId
                  return (
                    <button
                      key={key}
                      onClick={action}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      disabled={!!continuingSlot || isDeleting}
                      className="w-full text-left flex items-center gap-3 py-2 px-2.5 transition-all"
                      style={{
                        background: hovered === key
                          ? danger ? "rgba(185,28,28,0.07)" : "rgba(201,151,62,0.05)"
                          : "transparent",
                        border: `1px solid ${hovered === key
                          ? danger ? "rgba(185,28,28,0.2)" : "rgba(201,151,62,0.15)"
                          : "rgba(201,151,62,0.04)"}`,
                        opacity: (!!continuingSlot && !isLoading) || isDeleting ? 0.4 : 1,
                        transition: "all 0.15s",
                        cursor: !!continuingSlot ? "default" : "pointer",
                      }}
                    >
                      {/* Key badge */}
                      <span style={{
                        color: hovered === key ? (danger ? "#B91C1C" : "#C9973E") : "#3A3028",
                        fontFamily: "var(--font-jetbrains)", fontSize: "0.68rem",
                        border: `1px solid ${hovered === key ? (danger ? "#B91C1C50" : "#C9973E50") : "#3A302850"}`,
                        padding: "1px 5px", minWidth: 20, textAlign: "center",
                        transition: "all 0.15s", flexShrink: 0,
                      }}>{key}</span>

                      {/* Label + desc */}
                      <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                        <span style={{
                          color: hovered === key ? (danger ? "#F87171" : "#EDE5D5") : (danger ? "#B91C1C" : "#9A8F7E"),
                          fontFamily: "var(--font-jetbrains)", fontSize: "0.72rem",
                          letterSpacing: "0.05em", transition: "color 0.15s",
                        }}>
                          {isLoading ? "loading…" : label}
                        </span>
                        <span style={{ color: "#2E251A", fontFamily: "var(--font-jetbrains)", fontSize: "0.6rem" }}>
                          — {desc}
                        </span>
                      </div>

                      {/* Delete button for slot rows */}
                      {mode === "slots" && key !== "0" && !isLoading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(allSlots[parseInt(key) - 1]?.sessionId) }}
                          className="flex-shrink-0 transition-colors"
                          style={{ color: hovered === key ? "#B91C1C50" : "transparent", fontSize: "0.65rem", padding: "2px 4px" }}
                          aria-label="Remove save"
                        >
                          ✕
                        </button>
                      )}

                      {/* Enter arrow */}
                      {!isLoading && (
                        <span style={{
                          color: danger ? "#B91C1C" : "#C9973E",
                          fontFamily: "var(--font-jetbrains)", fontSize: "0.68rem",
                          opacity: hovered === key ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0,
                        }}>↩</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Error */}
            {continueError && (
              <p style={{ color: "#B91C1C", fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem", marginBottom: "0.75rem" }}>
                ! {continueError}
              </p>
            )}

            {/* Input / submitted state */}
            {!submitted ? (
              <div className="flex items-center gap-2 pt-3"
                style={{ borderTop: "1px solid rgba(201,151,62,0.07)" }}>
                <span style={{ color: "#C9973E", fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                  detective@suspect:~$
                </span>
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && typed.trim()) {
                      const match = activeCmds.find(c =>
                        c.key === typed.trim().toLowerCase() ||
                        c.label.toLowerCase().startsWith(typed.trim().toLowerCase())
                      )
                      if (match) match.action()
                      else setTyped("")
                    }
                  }}
                  placeholder={mode === "main" ? "type a command or press a key…" : "press a key or type…"}
                  className="flex-1 bg-transparent outline-none min-w-0"
                  style={{
                    color: "#EDE5D5", fontFamily: "var(--font-jetbrains)", fontSize: "0.72rem",
                    caretColor: "#C9973E", letterSpacing: "0.04em",
                  }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="pt-3 space-y-1" style={{ borderTop: "1px solid rgba(201,151,62,0.07)" }}>
                <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.72rem" }}>
                  <span style={{ color: "#C9973E" }}>detective@suspect:~$ </span>
                  <span style={{ color: "#EDE5D5" }}>{typed}</span>
                </div>
                <div style={{ color: "#D4A853", fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem", letterSpacing: "0.06em" }}>
                  Initiating session
                  <span style={{ color: "#C9973E", animation: "blink 1s step-end infinite" }}> ▋</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom status strip ── */}
      <div className="relative z-10 flex items-center justify-between flex-shrink-0 px-6 md:px-10 lg:px-16 py-2 max-w-6xl mx-auto w-full"
        style={{ borderTop: "1px solid rgba(201,151,62,0.05)" }}>
        <span style={{ color: "#2A221A", fontFamily: "var(--font-jetbrains)",
          fontSize: "0.5rem", letterSpacing: "0.18em" }}>
          CONN: ENCRYPTED · JURISDICTION: CLASSIFIED · CASE: ACTIVE
        </span>
        <div className="flex items-center gap-4">
          {/* Audio toggle */}
          <button
            onClick={() => setAudioEnabled(!audio.enabled)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: "#2A221A" }}
            aria-label={audio.enabled ? "Mute" : "Unmute"}
          >
            {audio.enabled
              ? <Volume2 size={11} />
              : <VolumeX size={11} />}
            <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.5rem",
              letterSpacing: "0.15em" }}>
              {audio.enabled ? "SFX ON" : "SFX OFF"}
            </span>
          </button>
          <span style={{ color: "#2A221A", fontFamily: "var(--font-jetbrains)",
            fontSize: "0.5rem" }}>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
