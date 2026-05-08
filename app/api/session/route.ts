import { NextRequest, NextResponse } from "next/server"
import { createSession, sanitizeSession } from "@/lib/sessions"
import { ALL_CASES } from "@/cases/blackwood-manor"
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
