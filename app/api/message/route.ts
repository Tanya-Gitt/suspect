import { NextRequest, NextResponse } from "next/server"
import { ALL_CASES } from "@/cases"
import { sendSuspectMessage, classifyMood } from "@/lib/orchestrator"
import { SendMessagePayload, MoodState } from "@/types"

// Stateless — no server-side session lookup needed.
// The client sends caseId, difficulty, and conversationHistory with every request.
// The only secret that stays server-side is the suspect's system prompt,
// which is loaded from the case definition (ALL_CASES).

export const maxDuration = 60 // Vercel Pro: 60s. Hobby: capped at 10s but set the intent.

const MAX_MESSAGE_LENGTH = 500

export async function POST(req: NextRequest) {
  const body = await req.json() as SendMessagePayload
  const {
    suspectId,
    caseId,
    difficulty,
    conversationHistory,
    exchangeCount,
    currentMood,
  } = body
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
  if (!caseId || !difficulty || !suspectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const gameCase = ALL_CASES.find((c) => c.id === caseId)
  if (!gameCase) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const suspect = gameCase.suspects.find((s) => s.id === suspectId)
  if (!suspect) return NextResponse.json({ error: "Suspect not found" }, { status: 404 })

  const isGuilty = suspect.role === "murderer"
  const safeHistory = Array.isArray(conversationHistory) ? conversationHistory : []
  const safeExchangeCount = typeof exchangeCount === "number" ? exchangeCount : safeHistory.length
  const safeMood: MoodState = (currentMood as MoodState) ?? "calm"

  try {
    const stream = await sendSuspectMessage(
      message,
      suspect,
      gameCase,
      difficulty,
      safeHistory
    )

    // Collect full response to extract mood after streaming
    let fullResponse = ""
    const decoder = new TextDecoder()

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk)
        fullResponse += text
        controller.enqueue(chunk)
      },
      flush(controller) {
        const newMood: MoodState = classifyMood(
          fullResponse,
          safeExchangeCount + 1,
          safeMood,
          isGuilty
        )
        // Send mood as a trailing SSE comment so the client can update state
        const moodTag = `\n\n[MOOD:${newMood}]`
        controller.enqueue(new TextEncoder().encode(moodTag))
      },
    })

    const responseStream = stream.pipeThrough(transformStream)

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Suspect-Id": suspectId,
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (err) {
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
