import { NextRequest, NextResponse } from "next/server"
import { getSession, updateSession } from "@/lib/sessions"
import { Clue } from "@/types"

const MAX_NOTES_LENGTH = 5000
const MAX_CLUES = 50
const MAX_CLUE_QUOTE_LENGTH = 500

// Save player notes + sync session state from client
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sessionId } = body

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 64) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 })
  }

  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  // Sanitize playerNotes
  let playerNotes = ""
  if (typeof body.playerNotes === "string") {
    playerNotes = body.playerNotes.slice(0, MAX_NOTES_LENGTH)
  }

  // Sanitize clues
  let clues: Clue[] = []
  if (Array.isArray(body.clues)) {
    clues = (body.clues as Clue[])
      .slice(0, MAX_CLUES)
      .map((c) => ({
        ...c,
        quote: typeof c.quote === "string" ? c.quote.slice(0, MAX_CLUE_QUOTE_LENGTH) : "",
        suspectName: typeof c.suspectName === "string" ? c.suspectName.slice(0, 100) : "",
      }))
  }

  updateSession(sessionId, { playerNotes, clues })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("id")
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ lastPlayedAt: session.lastPlayedAt, status: session.status })
}
