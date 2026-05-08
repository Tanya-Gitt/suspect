/**
 * Audio Engine — Howler.js wrapper for context-reactive soundscapes
 *
 * Free sounds from Freesound.org (CC0/BY licensed)
 * Atmosphere tracks loop, stingers play once
 */

import { Howl, Howler } from "howler"
import type { MoodState } from "@/types"
import type { GamePhase } from "@/store/gameStore"

// ─── Sound definitions ────────────────────────────────────────────────────────
// Using public domain / royalty-free sounds
const SOUNDS = {
  // Atmosphere loops (looped background ambience)
  menu: {
    src: ["/audio/atmosphere/menu-rain.mp3"],
    loop: true, volume: 0.4,
  },
  briefing: {
    src: ["/audio/atmosphere/briefing-tension.mp3"],
    loop: true, volume: 0.35,
  },
  interrogation_calm: {
    src: ["/audio/atmosphere/interrogation-calm.mp3"],
    loop: true, volume: 0.3,
  },
  interrogation_evasive: {
    src: ["/audio/atmosphere/interrogation-evasive.mp3"],
    loop: true, volume: 0.35,
  },
  interrogation_nervous: {
    src: ["/audio/atmosphere/interrogation-nervous.mp3"],
    loop: true, volume: 0.4,
  },
  interrogation_cracking: {
    src: ["/audio/atmosphere/interrogation-cracking.mp3"],
    loop: true, volume: 0.45,
  },
  interrogation_caught: {
    src: ["/audio/atmosphere/interrogation-caught.mp3"],
    loop: true, volume: 0.5,
  },
  reveal: {
    src: ["/audio/atmosphere/truth-reveal.mp3"],
    loop: true, volume: 0.5,
  },

  // Stingers (one-shot events)
  clue_found: { src: ["/audio/stingers/clue-found.mp3"], loop: false, volume: 0.7 },
  accusation: { src: ["/audio/stingers/accusation.mp3"], loop: false, volume: 0.8 },
  correct: { src: ["/audio/stingers/correct.mp3"], loop: false, volume: 0.9 },
  wrong: { src: ["/audio/stingers/wrong.mp3"], loop: false, volume: 0.9 },
  tension_sting: { src: ["/audio/stingers/tension.mp3"], loop: false, volume: 0.6 },
  typewriter: { src: ["/audio/stingers/typewriter.mp3"], loop: false, volume: 0.4 },
  page_turn: { src: ["/audio/stingers/page-turn.mp3"], loop: false, volume: 0.5 },
  door_open: { src: ["/audio/stingers/door-open.mp3"], loop: false, volume: 0.6 },
} as const

type SoundKey = keyof typeof SOUNDS
type AtmosphereKey = Extract<SoundKey,
  | "menu" | "briefing" | "reveal"
  | `interrogation_${MoodState}`
>

// ─── Audio Engine class ───────────────────────────────────────────────────────
class AudioEngine {
  private howls: Partial<Record<SoundKey, Howl>> = {}
  private currentAtmosphere: AtmosphereKey | null = null
  private globalVolume: number = 0.6
  private enabled: boolean = true
  private initialized: boolean = false

  private getHowl(key: SoundKey): Howl {
    if (!this.howls[key]) {
      const def = SOUNDS[key]
      this.howls[key] = new Howl({
        src: [...def.src] as string[],
        loop: def.loop,
        volume: def.volume * this.globalVolume,
        preload: true,
        html5: true, // stream audio to avoid memory pressure
        onloaderror: (_, err) => {
          // Silently fail — audio is enhancement, not core
          console.warn(`[Audio] Failed to load ${key}:`, err)
        },
      })
    }
    return this.howls[key]!
  }

  init(volume: number, enabled: boolean) {
    this.globalVolume = volume
    this.enabled = enabled
    this.initialized = true
    Howler.volume(volume)
  }

  setVolume(volume: number) {
    this.globalVolume = volume
    Howler.volume(volume)
    // Update playing atmosphere
    if (this.currentAtmosphere) {
      const howl = this.howls[this.currentAtmosphere]
      if (howl) {
        const def = SOUNDS[this.currentAtmosphere]
        howl.volume(def.volume * volume)
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      Howler.mute(true)
    } else {
      Howler.mute(false)
    }
  }

  // Smoothly crossfade to a new atmosphere track
  crossfadeTo(key: AtmosphereKey, fadeDuration: number = 1000) {
    if (!this.enabled || !this.initialized) return
    if (this.currentAtmosphere === key) return

    // Fade out current
    if (this.currentAtmosphere) {
      const prev = this.howls[this.currentAtmosphere]
      if (prev && prev.playing()) {
        prev.fade(prev.volume(), 0, fadeDuration)
        setTimeout(() => prev.stop(), fadeDuration + 100)
      }
    }

    // Fade in new
    const next = this.getHowl(key)
    const def = SOUNDS[key]
    const targetVol = def.volume * this.globalVolume

    next.volume(0)
    if (!next.playing()) next.play()
    next.fade(0, targetVol, fadeDuration)
    this.currentAtmosphere = key
  }

  // Play a one-shot stinger
  playStinger(key: Exclude<SoundKey, AtmosphereKey>) {
    if (!this.enabled || !this.initialized) return
    const howl = this.getHowl(key)
    howl.stop()
    howl.play()
  }

  // Stop all audio
  stopAll(fade: boolean = true) {
    if (fade) {
      Howler.volume(0)
      setTimeout(() => {
        Howler.stop()
        this.currentAtmosphere = null
        Howler.volume(this.globalVolume)
      }, 600)
    } else {
      Howler.stop()
      this.currentAtmosphere = null
    }
  }

  // Map game phase → atmosphere
  setPhaseAtmosphere(phase: GamePhase) {
    const phaseMap: Partial<Record<GamePhase, AtmosphereKey>> = {
      menu: "menu",
      case_select: "menu",
      difficulty_select: "menu",
      briefing: "briefing",
      reveal: "reveal",
    }
    const key = phaseMap[phase]
    if (key) this.crossfadeTo(key)
  }

  // Map suspect mood → atmosphere (during interrogation)
  setMoodAtmosphere(mood: MoodState) {
    const key = `interrogation_${mood}` as AtmosphereKey
    this.crossfadeTo(key)
  }

  // Convenience: play typewriter sound when suspect starts typing
  onSuspectTyping() {
    // Don't spam — only play if stinger isn't already playing
    const h = this.howls["typewriter"]
    if (!h || !h.playing()) this.playStinger("typewriter")
  }
}

// Singleton
export const audioEngine = new AudioEngine()

// ─── React hook ───────────────────────────────────────────────────────────────
// Import in components to get reactive audio
export function initAudio(volume: number, enabled: boolean) {
  audioEngine.init(volume, enabled)
}
