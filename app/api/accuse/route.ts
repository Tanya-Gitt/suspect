import { NextRequest, NextResponse } from "next/server"
import { getSession, updateSession } from "@/lib/sessions"
import { ALL_CASES } from "@/cases/blackwood-manor"
import { AccusePayload, AccuseResult } from "@/types"

export async function POST(req: NextRequest) {
  const body = await req.json() as AccusePayload
  const { sessionId, suspectId } = body

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 64) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 })
  }

  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.accusationMade) return NextResponse.json({ error: "Accusation already made" }, { status: 400 })

  const gameCase = ALL_CASES.find((c) => c.id === session.caseId)
  if (!gameCase) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const correct = suspectId === gameCase.solution.suspectId
  const accused = gameCase.suspects.find((s) => s.id === suspectId)
  const realMurderer = gameCase.suspects.find((s) => s.id === gameCase.solution.suspectId)

  updateSession(sessionId, {
    accusationMade: true,
    accusedSuspectId: suspectId,
    wasCorrect: correct,
    status: "completed",
  })

  const result: AccuseResult = {
    correct,
    accusedName: accused?.name ?? "Unknown",
    realMurdererName: realMurderer?.name ?? "Unknown",
    fullTruth: gameCase.solution.fullTruth,
    motive: gameCase.solution.motive,
    method: gameCase.solution.method,
  }

  return NextResponse.json(result)
}
