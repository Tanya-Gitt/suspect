import { NextRequest, NextResponse } from "next/server"
import { getSession, updateSession } from "@/lib/sessions"
import { sendSuspectMessage, classifyMood } from "@/lib/orchestrator"
import { ALL_CASES } from "@/cases"
import { SendMessagePayload, ConversationTurn, MoodState } from "@/types"

// Simple in-memory rate limiting per session
const inFlight = new Set<string>()

const MAX_MESSAGE_LENGTH = 500

export async function POST(req: NextRequest) {
  const body = await req.json() as SendMessagePayload
  const { sessionId, suspectId } = body
  const message = typeof body.message === "string" ? body.message.trim() : ""

  // Input validation
  if (!message || message.length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
      { status: 400 }
    )
  }
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 64) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 })
  }

  // Rate limit — one request per session at a time
  if (inFlight.has(sessionId)) {
    return NextResponse.json({ error: "Request in progress" }, { status: 429 })
  }

  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.status !== "active") return NextResponse.json({ error: "Session not active" }, { status: 400 })

  const gameCase = ALL_CASES.find((c) => c.id === session.caseId)
  if (!gameCase) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const suspect = gameCase.suspects.find((s) => s.id === suspectId)
  if (!suspect) return NextResponse.json({ error: "Suspect not found" }, { status: 404 })

  const suspectState = session.suspects[suspectId]
  if (!suspectState) return NextResponse.json({ error: "Invalid suspect for this session" }, { status: 400 })

  const isGuilty = suspect.role === "murderer"

  inFlight.add(sessionId)

  // Add player message to history
  const playerTurn: ConversationTurn = {
    role: "player",
    content: message,
    timestamp: Date.now(),
  }
  suspectState.conversationHistory.push(playerTurn)
  suspectState.interrogated = true
  suspectState.exchangeCount += 1
  updateSession(sessionId, {
    suspects: { ...session.suspects, [suspectId]: suspectState },
    currentSuspectId: suspectId,
  })

  try {
    const stream = await sendSuspectMessage(message, suspect, session, gameCase)

    // Collect full response to update session after streaming
    let fullResponse = ""
    const decoder = new TextDecoder()

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk)
        fullResponse += text
        controller.enqueue(chunk)
      },
      flush() {
        // After stream ends, update session with suspect response + new mood
        const newMood: MoodState = classifyMood(
          fullResponse,
          suspectState.exchangeCount,
          suspectState.currentMood,
          isGuilty
        )

        const suspectTurn: ConversationTurn = {
          role: "suspect",
          content: fullResponse,
          timestamp: Date.now(),
          mood: newMood,
        }

        suspectState.conversationHistory.push(suspectTurn)
        suspectState.currentMood = newMood
        updateSession(sessionId, {
          suspects: { ...session.suspects, [suspectId]: suspectState },
        })
        inFlight.delete(sessionId)
      },
    })

    // Wrap the piped stream to ensure inFlight is always cleaned up, even on stream error
    const responseStream = stream.pipeThrough(transformStream)
    const guardedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = responseStream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
          controller.close()
        } catch (err) {
          inFlight.delete(sessionId)
          controller.error(err)
        }
      },
    })

    return new Response(guardedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Suspect-Id": suspectId,
        "X-Session-Id": sessionId,
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (err) {
    inFlight.delete(sessionId)
    const errMsg = (err as Error).message ?? ""
    const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Too Many Requests")
    console.error("Orchestrator error:", errMsg.slice(0, 200))
    return NextResponse.json(
      {
        error: isRateLimit
          ? "AI service is rate-limited right now. Wait a moment and try again."
          : "Suspect unavailable — they are not responding. Try again.",
      },
      { status: isRateLimit ? 429 : 503 }
    )
  }
}
