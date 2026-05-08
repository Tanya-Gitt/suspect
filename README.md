<div align="center">

```
░██████╗██╗░░░██╗░██████╗██████╗░███████╗░█████╗░████████╗
██╔════╝██║░░░██║██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝
╚█████╗░██║░░░██║╚█████╗░██████╔╝█████╗░░██║░░╚═╝░░░██║░░░
░╚═══██╗██║░░░██║░╚═══██╗██╔═══╝░██╔══╝░░██║░░██╗░░░██║░░░
██████╔╝╚██████╔╝██████╔╝██║░░░░░███████╗╚█████╔╝░░░██║░░░
╚═════╝░░╚═════╝░╚═════╝░╚═╝░░░░░╚══════╝░╚════╝░░░░╚═╝░░░
```

**An AI-powered noir interrogation game. Every suspect lies. Only one killed.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-C9973E?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="https://img.shields.io/badge/─────────────────────────────────────────────────────────────────────────────────────────-C9973E?style=flat-square" width="100%" />
</div>

```
> CASE FILE OPENED ████████████████████████████████████████ 100%
> SUSPECTS LOADED  ░░░░░░░░░░░░░░░░ AWAITING INTERROGATION
> STATUS           CLASSIFIED
```

## ◈ What Is This

**SUSPECT** is a browser-based detective game where you interrogate AI-driven characters to solve a murder. Each suspect is powered by a live language model — they lie, deflect, contradict each other, and crack under pressure. No scripts. No predetermined paths. Every interrogation is different.

You read the case file. You choose who to question. You decide when to accuse.  
Get it wrong and a killer walks free.

---

## ◈ Cases

| # | Case | Setting | Tone | Difficulty |
|---|------|---------|------|------------|
| 01 | **The Red Thread** | Modern apartment building | Suspense | ★★☆☆ |
| 02 | **Blackwood Manor** | 1940s country estate | Classic Noir | ★★★☆ |
| 03 | **Harbor Light** | Contemporary coastal town | Sad | ★★☆☆ |
| 04 | **The Vienna Protocol** | Cold War Vienna, 1963 | Espionage Thriller | ★★★★ |
| 05 | **The Eclipse Protocol** | Near-future tech corp | Sci-Fi Noir | ★★★★ |
| 06 | **The Ashwood Covenant** | 1890s New England | Gothic Horror | ★★★★ |

---

## ◈ Difficulty Modes

```
GREENHORN       — Suspects volunteer hints. No red herrings. ~30 min
BADGE & BONE    — Evasive answers. One planted red herring. ~1 hour  
COLD CASE       — Deliberate misdirection. Two red herrings. ~2 hours
OBSESSION MODE  — Suspects lie about core facts. Trust nothing. ~3–4 hours
```

---

## ◈ Stack

```
Framework    Next.js 16 (App Router, Turbopack)
Language     TypeScript 5
AI Engine    Google Gemini (gemini-2.0-flash-lite → gemini-1.5-flash fallback)
State        Zustand v5
Animation    Framer Motion
Styling      Tailwind CSS v4 + custom Ember design system
Portraits    DiceBear API (deterministic SVG avatars)
Audio        Procedural Web Audio API engine
```

---

## ◈ Architecture

```
suspect/
├── app/
│   ├── api/
│   │   ├── session/          # POST: create game session
│   │   ├── interrogate/      # POST: stream AI suspect response
│   │   └── save/             # POST: server-side session sync
│   ├── globals.css            # Ember design system (CSS variables + utilities)
│   └── layout.tsx
│
├── cases/
│   ├── index.ts              # Case registry
│   ├── blackwood-manor.ts    # Full case definition (suspects, secrets, motives)
│   └── ...                   # 5 more cases
│
├── components/
│   ├── game/
│   │   ├── InterrogationRoom.tsx   # Main game viewport
│   │   ├── SuspectPanel.tsx        # Portrait + mood + pressure meter
│   │   ├── Notebook.tsx            # Clue collector + detective notes
│   │   ├── AccusationScreen.tsx    # Final accusation flow
│   │   ├── CaseBriefing.tsx        # Case file reveal
│   │   └── TruthReveal.tsx         # Endgame resolution
│   └── ui/
│       ├── MainMenu.tsx            # CRT terminal boot screen
│       ├── CaseSelect.tsx          # Case browser
│       └── DifficultySelect.tsx    # Difficulty picker
│
├── store/
│   └── gameStore.ts          # Zustand store (session, suspects, clues, UI state)
│
├── lib/
│   ├── images.ts             # Portrait + scene URL generators
│   └── audio-engine.ts       # Procedural noir soundtrack
│
└── types/
    └── index.ts              # All shared types (GameCase, SuspectPublic, Clue…)
```

---

## ◈ Getting Started

**1. Clone & install**
```bash
git clone https://github.com/yourusername/suspect.git
cd suspect
npm install
```

**2. Set up environment variables**
```bash
cp .env.example .env.local
# Add your Gemini API key — free at https://aistudio.google.com/app/apikey
```

**3. Run**
```bash
npm run dev
# → http://localhost:3000
```

---

## ◈ Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_key_here          # Required — get free at aistudio.google.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> All AI calls are server-side (`/api/interrogate`). The API key is never exposed to the client.

---

## ◈ How the AI Works

Each suspect is given a **private system prompt** containing:
- Their role (murderer / witness / red herring)
- Secrets they'll reveal under pressure
- Lies they maintain until cornered
- Personality and speech patterns

The player never sees this. The AI stays in character across the full session. Mood state (`calm → evasive → nervous → cracking → caught`) is extracted from responses and drives visual changes in the UI — border glow, portrait filter, ambient audio tension.

```
Player question
    ↓
/api/interrogate (POST, streaming)
    ↓
System prompt (suspect persona) + conversation history + difficulty modifier
    ↓
Gemini stream → SSE chunks → typewriter render
    ↓
Mood extraction regex → visual + audio state update
```

---

## ◈ Design System — Ember

The UI uses a custom design system built on warm noir tones:

```css
--noir-bg:       #0A0907   /* Near-black charcoal        */
--noir-primary:  #C9973E   /* Amber gold (primary action) */
--noir-accent:   #B91C1C   /* Blood red (danger / caught) */
--noir-gold:     #D4A853   /* Warm gold (highlights)      */
--noir-text:     #EDE5D5   /* Aged parchment              */
--noir-muted:    #5A5248   /* Faded ink                   */
```

Visual effects: film grain overlay, CRT scanlines, ambient ember glow, vignette, notebook-paper texture, mood-reactive border glows.

---

## ◈ Adding a New Case

```typescript
// cases/your-case.ts
import type { GameCase } from "@/types"

export const yourCase: GameCase = {
  id: "your-case",
  title: "The Case Title",
  tagline: "Three words. One lie.",
  tone: "suspense",
  era: "Present Day",
  setting: "Rain-soaked waterfront, neon reflections",
  victim: { ... },
  knownFacts: [ ... ],
  suspects: [
    {
      id: "suspect-1",
      name: "...",
      role: "murderer",        // only in SuspectPrivate
      systemPromptBase: "...", // never sent to client
      secretsToReveal: [...],
      liesTheyMaintain: [...],
    }
  ],
  solution: { murderer: "suspect-1", method: "...", motive: "..." }
}
```

Then register it in `cases/index.ts`.

---

## ◈ License

MIT — use it, fork it, build your own mysteries.

---

<div align="center">

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓                                                                  ▓
▓   "Everyone is a suspect. The truth costs something."           ▓
▓                                                                  ▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

</div>
