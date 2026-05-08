"use client"

/**
 * ClickSound — wraps any element and plays a click sound on interaction.
 * Also exports useClickSound() hook for imperative use.
 */

import { useCallback } from "react"
import { proceduralAudio } from "@/lib/audio-engine"

export function useClickSound() {
  return useCallback(() => {
    proceduralAudio.click()
  }, [])
}

// Global click listener — fires on EVERY button/a click in the document
// Mounted once in AudioProvider so we don't have to touch every component
export function setupGlobalClickSound() {
  if (typeof window === "undefined") return
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    // Play click if the target (or its parent) is interactive
    const interactive = target.closest("button, a, [role=button], [tabindex]")
    if (interactive) {
      proceduralAudio.click(0.55)
    }
  }
  document.addEventListener("click", handler, { passive: true })
  return () => document.removeEventListener("click", handler)
}
