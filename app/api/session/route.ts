import { NextRequest, NextResponse } from "next/server"
import { createSession, getSession, sanitizeSession } from "@/lib/sessions"
import { ALL_CASES } from "@/cases"
import { DifficultyMode } from "@/types"

export async function POST(req: NextRequest) {
  const { caseId, difficulty } = await req.json() as {
    caseId: string
    difficulty: DifficultyMode
  }

  const gameCase = ALL_CASES.find((c) => c.id === caseId)
  if (!gameCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  const session = createSession(gameCase, difficulty)
  return NextResponse.json(sanitizeSession(session, gameCase))
}

// Resume an existing session by ID
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const session = getSession(id)
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
  }

  const gameCase = ALL_CASES.find((c) => c.id === session.caseId)
  if (!gameCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  return NextResponse.json(sanitizeSession(session, gameCase))
}
