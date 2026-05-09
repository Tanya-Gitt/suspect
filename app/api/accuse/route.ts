import { NextRequest, NextResponse } from "next/server"
import { ALL_CASES } from "@/cases"
import { AccusePayload, AccuseResult } from "@/types"

// Stateless — caseId sent by client, solution looked up server-side.
// The client never knows the murderer's identity until this endpoint resolves it.

export async function POST(req: NextRequest) {
  const body = await req.json() as AccusePayload
  const { suspectId, caseId } = body

  if (!caseId || typeof caseId !== "string") {
    return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
  }
  if (!suspectId || typeof suspectId !== "string") {
    return NextResponse.json({ error: "Missing suspectId" }, { status: 400 })
  }

  const gameCase = ALL_CASES.find((c) => c.id === caseId)
  if (!gameCase) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const correct = suspectId === gameCase.solution.suspectId
  const accused = gameCase.suspects.find((s) => s.id === suspectId)
  const realMurderer = gameCase.suspects.find((s) => s.id === gameCase.solution.suspectId)

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
