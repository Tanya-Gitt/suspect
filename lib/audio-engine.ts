/**
 * Procedural Audio Engine — Web Audio API
 *
 * Ambient: layered filtered noise bands (no oscillators = no buzz)
 *          sounds like: distant wind, stone room, unease
 * UI:      short noise bursts shaped with tight envelopes
 * Stingers: enveloped tones with smooth attack/release
 */

import type { MoodState } from "@/types"
import type { GamePhase } from "@/store/gameStore"

// ─── Mood → filter parameters ─────────────────────────────────────────────────
// All noise-based. No oscillators in the ambient layer.
const MOOD: Record<MoodState, {
  lo: number    // low band center Hz  (rumble)
  loGain: number
  mid: number   // mid band center Hz  (presence)
  midGain: number
  hi: number    // hi band center Hz   (unease/air)
  hiGain: number
  sweepRate: number // how fast the filter breathes (Hz)
}> = {
  calm:     { lo: 80,   loGain: 0.40, mid: 300,  midGain: 0.15, hi: 1200, hiGain: 0.05, sweepRate: 0.08 },
  evasive:  { lo: 100,  loGain: 0.45, mid: 500,  midGain: 0.20, hi: 2000, hiGain: 0.08, sweepRate: 0.15 },
  nervous:  { lo: 120,  loGain: 0.50, mid: 700,  midGain: 0.28, hi: 3000, hiGain: 0.12, sweepRate: 0.30 },
  cracking: { lo: 140,  loGain: 0.55, mid: 900,  midGain: 0.35, hi: 4000, hiGain: 0.18, sweepRate: 0.55 },
  caught:   { lo: 60,   loGain: 0.60, mid: 200,  midGain: 0.18, hi: 600,  hiGain: 0.06, sweepRate: 0.06 },
}

const PHASE_MOOD: Partial<Record<GamePhase, MoodState>> = {
  menu: "calm",
  case_select: "calm",
  difficulty_select: "evasive",
  briefing: "evasive",
  accusation: "cracking",
  reveal: "caught",
}

// ─── Shared pink-ish noise buffer (generated once) ────────────────────────────
function makePinkNoise(ctx: AudioContext, seconds = 6): AudioBuffer {
  const rate = ctx.sampleRate
  const len = rate * seconds
  const buf = ctx.createBuffer(2, len, rate)
  // Paul Kellett's pink noise approximation
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buf
}

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null      // ambient master (quiet)
  private fxMaster: GainNode | null = null    // UI/stinger master (louder)

  // Ambient noise bands
  private noiseSrc: AudioBufferSourceNode | null = null
  private loBand: { filter: BiquadFilterNode; gain: GainNode } | null = null
  private midBand: { filter: BiquadFilterNode; gain: GainNode } | null = null
  private hiBand: { filter: BiquadFilterNode; gain: GainNode } | null = null

  // LFO for breathing filter sweep
  private lfoCtx: { osc: OscillatorNode; gain: GainNode } | null = null

  private _enabled = true
  private _volume = 1.0
  private initialized = false
  private currentMood: MoodState | null = null
  private sweepTimer: ReturnType<typeof setInterval> | null = null

  // ── Init ────────────────────────────────────────────────────────────────────

  async resume() {
    if (this.ctx?.state === "suspended") await this.ctx.resume()
    if (!this.initialized) await this._boot()
  }

  private async _boot() {
    if (this.initialized || typeof window === "undefined") return
    try {
      this.ctx = new AudioContext()
      if (this.ctx.state === "suspended") await this.ctx.resume()

      // Two master gains: ambient (soft) and FX (punchy)
      this.master = this.ctx.createGain()
      this.master.gain.value = 0  // will fade in with setMood
      this.master.connect(this.ctx.destination)

      this.fxMaster = this.ctx.createGain()
      this.fxMaster.gain.value = this._enabled ? this._volume * 0.9 : 0
      this.fxMaster.connect(this.ctx.destination)

      this._buildAmbient()
      this.initialized = true
      // Start at current mood (will be set by AudioProvider after boot)
      this.setMood("calm", 1.5)
    } catch (e) {
      console.warn("[Audio] boot failed:", e)
    }
  }

  private _buildAmbient() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const noise = makePinkNoise(ctx, 8)

    this.noiseSrc = ctx.createBufferSource()
    this.noiseSrc.buffer = noise
    this.noiseSrc.loop = true

    const makeband = (type: BiquadFilterType, freq: number, Q: number) => {
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.value = freq
      filter.Q.value = Q
      const gain = ctx.createGain()
      gain.gain.value = 0
      this.noiseSrc!.connect(filter)
      filter.connect(gain)
      gain.connect(this.master!)
      return { filter, gain }
    }

    this.loBand  = makeband("lowpass",  80,  1.2)
    this.midBand = makeband("bandpass", 300, 0.8)
    this.hiBand  = makeband("highpass", 1200, 1.0)

    this.noiseSrc.start()
  }

  // ── Mood transitions ─────────────────────────────────────────────────────────

  setMood(mood: MoodState, fadeSecs = 2.5) {
    if (!this.ctx || !this.initialized) return
    if (mood === this.currentMood && fadeSecs > 0) return
    this.currentMood = mood

    // Resume context if browser suspended it (happens after inactivity)
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }

    const p = MOOD[mood]
    const now = this.ctx.currentTime
    const end = now + Math.max(fadeSecs, 0.1)
    const v = this._enabled ? this._volume : 0

    // Ambient — audible but sits under UI sounds
    const ambLevel = v * 0.45
    this.master?.gain.linearRampToValueAtTime(ambLevel, end)

    this.loBand?.filter.frequency.linearRampToValueAtTime(p.lo, end)
    this.loBand?.gain.gain.linearRampToValueAtTime(p.loGain * v, end)

    this.midBand?.filter.frequency.linearRampToValueAtTime(p.mid, end)
    this.midBand?.gain.gain.linearRampToValueAtTime(p.midGain * v, end)

    this.hiBand?.filter.frequency.linearRampToValueAtTime(p.hi, end)
    this.hiBand?.gain.gain.linearRampToValueAtTime(p.hiGain * v, end)

    // Subtle periodic filter breathe via JS (cleaner than LFO node)
    this._startSweep(p.mid, p.sweepRate)
  }

  setPhaseAtmosphere(phase: GamePhase) {
    const mood = PHASE_MOOD[phase] ?? "calm"
    this.setMood(mood, 3)
  }

  private _startSweep(centerFreq: number, rate: number) {
    if (this.sweepTimer) clearInterval(this.sweepTimer)
    let t = 0
    this.sweepTimer = setInterval(() => {
      if (!this.ctx || !this.midBand) return
      const sweep = centerFreq + Math.sin(t) * (centerFreq * 0.3)
      this.midBand.filter.frequency.setTargetAtTime(sweep, this.ctx.currentTime, 0.5)
      t += rate * 0.25
    }, 250)
  }

  // ── UI Sounds ────────────────────────────────────────────────────────────────

  // Short white-noise click — the most reliable UI feedback sound
  click(vol = 0.6) {
    if (!this.ctx || !this.fxMaster || !this._enabled) return
    const dur = 0.018
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      // Sharp attack, very fast decay
      const env = Math.pow(1 - i / d.length, 6)
      d[i] = (Math.random() * 2 - 1) * env
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const filter = this.ctx.createBiquadFilter()
    filter.type = "highpass"
    filter.frequency.value = 2000

    const g = this.ctx.createGain()
    g.gain.value = vol * this._volume

    src.connect(filter)
    filter.connect(g)
    g.connect(this.fxMaster)
    src.start()
  }

  // Single typewriter key hit — slightly lower than UI click, softer
  typeKey() {
    if (!this.ctx || !this.fxMaster || !this._enabled) return
    const dur = 0.012
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const env = Math.pow(1 - i / d.length, 4)
      d[i] = (Math.random() * 2 - 1) * env * 0.7
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const filter = this.ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 1400
    filter.Q.value = 1.5

    const g = this.ctx.createGain()
    g.gain.value = 0.45 * this._volume

    src.connect(filter)
    filter.connect(g)
    g.connect(this.fxMaster)
    src.start()
  }

  // Soft whoosh for page/step transitions
  whoosh() {
    if (!this.ctx || !this.fxMaster || !this._enabled) return
    const dur = 0.22
    const rate = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, Math.floor(rate * dur), rate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      // Bell-curve envelope — swell then fade
      const env = Math.sin((i / d.length) * Math.PI)
      d[i] = (Math.random() * 2 - 1) * env
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const filter = this.ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 900
    filter.Q.value = 0.6

    const g = this.ctx.createGain()
    g.gain.value = 0.35 * this._volume
    src.connect(filter)
    filter.connect(g)
    g.connect(this.fxMaster)
    src.start()
  }

  // Page-turn for notebook
  pageTurn() {
    if (!this.ctx || !this.fxMaster || !this._enabled) return
    const dur = 0.16
    const rate = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, Math.floor(rate * dur), rate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const env = Math.pow(1 - i / d.length, 2) * Math.sin((i / d.length) * Math.PI * 3)
      d[i] = (Math.random() * 2 - 1) * Math.abs(env)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const hp = this.ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 3000

    const g = this.ctx.createGain()
    g.gain.value = 0.5 * this._volume
    src.connect(hp)
    hp.connect(g)
    g.connect(this.fxMaster)
    src.start()
  }

  // ── Musical stingers ─────────────────────────────────────────────────────────

  private _tone(freq: number, dur: number, type: OscillatorType, vol: number, delayMs = 0) {
    if (!this.ctx || !this.fxMaster || !this._enabled) return
    const play = () => {
      if (!this.ctx || !this.fxMaster) return
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      const now = this.ctx.currentTime
      g.gain.setValueAtTime(0.001, now)
      g.gain.linearRampToValueAtTime(vol * this._volume, now + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + dur)
      osc.connect(g)
      g.connect(this.fxMaster)
      osc.start(now)
      osc.stop(now + dur + 0.05)
    }
    delayMs > 0 ? setTimeout(play, delayMs) : play()
  }

  // 3-note ascending chime — clue found
  playClueFound() {
    this._tone(523, 0.5, "sine", 0.22)
    this._tone(659, 0.5, "sine", 0.20, 110)
    this._tone(784, 0.7, "sine", 0.18, 220)
  }

  // Deep ominous chord — accusation
  playAccusation() {
    this._tone(65, 3.5, "sine", 0.20)
    this._tone(98, 3.0, "sine", 0.14, 300)
    this._tone(49, 4.0, "sine", 0.22, 600)
  }

  // Rising resolution — correct verdict
  playCorrect() {
    this._tone(261, 1.5, "sine", 0.18)
    this._tone(329, 1.5, "sine", 0.16, 130)
    this._tone(392, 1.8, "sine", 0.16, 260)
    this._tone(523, 2.5, "sine", 0.20, 390)
  }

  // Dissonant descent — wrong verdict
  playWrong() {
    this._tone(392, 0.9, "sawtooth", 0.14)
    this._tone(370, 0.9, "sawtooth", 0.12, 160)
    this._tone(311, 1.1, "sawtooth", 0.14, 320)
    this._tone(277, 1.5, "sawtooth", 0.16, 480)
  }

  // Sharp hit — tension / accuse button click
  playTensionSting() {
    this._tone(220, 0.25, "square", 0.20)
    this._tone(185, 0.45, "sawtooth", 0.12, 150)
  }

  // ── Volume / enabled ──────────────────────────────────────────────────────────

  setVolume(v: number) {
    this._volume = v
    if (!this.ctx) return
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(
        this._enabled ? v * 0.22 : 0,
        this.ctx.currentTime + 0.3
      )
    }
    if (this.fxMaster) {
      this.fxMaster.gain.linearRampToValueAtTime(
        this._enabled ? v * 0.9 : 0,
        this.ctx.currentTime + 0.3
      )
    }
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.3
    this.master?.gain.linearRampToValueAtTime(enabled ? this._volume * 0.22 : 0, t)
    this.fxMaster?.gain.linearRampToValueAtTime(enabled ? this._volume * 0.9 : 0, t)
  }

  get enabled() { return this._enabled }
  get volume() { return this._volume }
}

export const proceduralAudio = new ProceduralAudioEngine()
