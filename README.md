<div align="center">

```
░██████╗██╗░░░██╗░██████╗██████╗░███████╗░█████╗░████████╗
██╔════╝██║░░░██║██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝
╚█████╗░██║░░░██║╚█████╗░██████╔╝█████╗░░██║░░╚═╝░░░██║░░░
░╚═══██╗██║░░░██║░╚═══██╗██╔═══╝░██╔══╝░░██║░░██╗░░░██║░░░
██████╔╝╚██████╔╝██████╔╝██║░░░░░███████╗╚█████╔╝░░░██║░░░
╚═════╝░░╚═════╝░╚═════╝░╚═╝░░░░░╚══════╝░╚════╝░░░░╚═╝░░░
```

**An AI-powered noir interrogation game.**  
**Every suspect lies. Every answer costs something. Only one killed.**

[![Stars](https://img.shields.io/github/stars/Tanya-Gitt/suspect?style=flat-square&color=C9973E&label=★%20Stars)](https://github.com/Tanya-Gitt/suspect/stargazers)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-C9973E?style=flat-square)](LICENSE)

[**▶ Live Demo**](#getting-started) · [**📖 Add a Case**](#adding-a-new-case) · [**⭐ Star this repo**](https://github.com/Tanya-Gitt/suspect/stargazers)

</div>

---

```
> CASE FILE OPENED ████████████████████████████████████████ 100%
> SUSPECTS LOADED  ██████████████████████████████░░░░░░░░░░ LYING
> MURDERER         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ UNKNOWN
```

---

## ◈ What Is This

**SUSPECT** is a browser-based detective game where you interrogate AI-driven characters to uncover a murder. Each suspect is backed by a live Gemini language model — they lie, deflect, contradict each other, and crack under sustained pressure.

**No scripts. No branching dialogue trees. Every interrogation is unrepeatable.**

You read the case file. You choose who to question first. You decide when you have enough to accuse.  
Get it wrong — and a killer walks free.

**Key things that make this different:**

- 🎭 **Characters, not chatbots** — each suspect has a private system prompt with their role, secrets, lies, and personality. The model stays in character for the full session.
- 🧠 **Mood system** — suspects shift from `calm → evasive → nervous → cracking → caught` as you apply pressure. The UI responds: border glow, portrait filter, ambient audio tension.
- 📓 **Detective's Notebook** — save quotes as clues, star key evidence, write your own theories. Your case file builds as you play.
- 🔊 **Procedural audio** — a Web Audio API engine generates live ambient noir soundtrack that intensifies with the mood.
- 🎨 **Ember design system** — custom noir UI built with Tailwind v4. Film grain, CRT scanlines, vignette, phosphor glow.

---

## ◈ Cases

| | Case | Setting | Tone | Time |
|--|------|---------|------|------|
| 01 | **The Red Thread** | Modern apartment building | Suspense | ~1 hr |
| 02 | **Blackwood Manor** | 1940s country estate | Classic Noir | ~1.5 hr |
| 03 | **Harbor Light** | Contemporary coastal town | Melancholy | ~1 hr |
| 04 | **The Vienna Protocol** | Cold War Vienna, 1963 | Espionage Thriller | ~2 hr |
| 05 | **The Eclipse Protocol** | Near-future tech corporation | Sci-Fi Noir | ~2 hr |
| 06 | **The Ashwood Covenant** | 1890s New England | Gothic Horror | ~2.5 hr |

---

## ◈ Difficulty Modes

```
GREENHORN       — Suspects volunteer hints. No red herrings.         ~30 min
BADGE & BONE    — Evasive answers. One planted red herring.          ~1 hour
COLD CASE       — Deliberate misdirection. Two red herrings.         ~2 hours
OBSESSION MODE  — Suspects lie about core facts. Trust nothing.      ~3–4 hours
```

On Obsession Mode, even the person who "seems" to be lying may be telling the truth about something. The real killer is determined at case generation — not by difficulty selection — so the answer is fixed from the moment you start.

---

## ◈ Getting Started

**Prerequisites:** Node.js 18+, a free [Gemini API key](https://aistudio.google.com/app/apikey)

```bash
git clone https://github.com/Tanya-Gitt/suspect.git
cd suspect
npm install
cp .env.example .env.local
# paste your Gemini key into .env.local
npm run dev
```

Open `http://localhost:3000` — the game boots instantly.

---

## ◈ Stack

```
Framework    Next.js 16 (App Router, Turbopack)
Language     TypeScript 5, strict mode
AI Engine    Google Gemini 2.0 Flash → 1.5 Flash fallback (server-side streaming)
State        Zustand v5
Animation    Framer Motion
Styling      Tailwind CSS v4 + custom Ember design system
Portraits    DiceBear API (deterministic SVG avatars, gender-aware)
Audio        Procedural Web Audio API engine (no files, fully generated)
```

---

## ◈ Architecture

```
suspect/
├── app/
│   ├── api/
│   │   ├── session/          # POST: create game session (server-side, secret kept)
│   │   ├── interrogate/      # POST: stream AI response (SSE)
│   │   └── save/             # POST: sync session state
│   └── globals.css           # Ember design system tokens + utilities
│
├── cases/                    # Each case is one .ts file with full case definition
│   ├── blackwood-manor.ts    # suspects, secrets, motives, system prompts
│   └── ... (5 more)
│
├── components/
│   ├── game/
│   │   ├── InterrogationRoom.tsx   # Main game viewport
│   │   ├── SuspectPanel.tsx        # Portrait + mood + pressure meter
│   │   ├── Notebook.tsx            # Clue collector + detective notes
│   │   ├── AccusationScreen.tsx    # Accusation + verdict
│   │   └── TruthReveal.tsx         # Endgame cinematic reveal
│   └── ui/
│       ├── MainMenu.tsx            # CRT terminal boot screen
│       ├── CaseSelect.tsx          # Case browser
│       └── DifficultySelect.tsx    # Difficulty picker
│
├── store/
│   └── gameStore.ts          # Zustand: session, suspects, clues, streaming state
│
└── lib/
    ├── images.ts             # Portrait + scene URL generators
    └── audio-engine.ts       # Procedural noir soundtrack engine
```

---

## ◈ How the AI Works

Each suspect has a private system prompt that is **never sent to the client**. It contains:

- Their exact role: `murderer` / `witness` / `alibi_provider` / `red_herring`
- The secrets they'll give up only under sustained pressure
- The specific lies they maintain until cornered
- Their speech patterns, personality, and emotional state

The prompt is assembled server-side in `/api/interrogate`, combined with the full conversation history and a difficulty modifier, and streamed back via SSE.

```
Player message
    ↓
POST /api/interrogate
    ↓
[secret system prompt] + [conversation history] + [difficulty modifier]
    ↓
Gemini stream → SSE → typewriter render
    ↓
Mood extraction → border glow + portrait filter + audio tension update
```

The client never knows who the murderer is until the accusation is resolved server-side.

---

## ◈ Adding a New Case

Cases are plain TypeScript. The simplest way to contribute is writing a new one:

```typescript
// cases/your-case.ts
import type { GameCase } from "@/types"

export const yourCase: GameCase = {
  id: "your-case",
  title: "The Case Title",
  tagline: "One night. Three lies. Zero alibi.",
  tone: "suspense",
  era: "Present Day",
  setting: "Rain-soaked waterfront, neon reflections",
  victim: {
    name: "...", age: 42, occupation: "...",
    description: "...", causeOfDeath: "...", foundAt: "..."
  },
  knownFacts: ["...", "..."],
  suspects: [
    {
      // Public (shown to player)
      id: "suspect-1", name: "...", age: 38, sex: "female",
      occupation: "...", appearance: "...",
      backstory: "...", relationship: "...",
      // Private (server-side only, never sent to client)
      role: "murderer",
      systemPromptBase: "You are [name]. You killed [victim] because...",
      secretsToReveal: ["Under pressure, you admit you were there at 11pm"],
      liesTheyMaintain: ["You claim you were home all night"],
      alibi: "Claims to have been home alone",
      motive: "...",
    }
  ],
  solution: { murdererId: "suspect-1", method: "...", motive: "..." }
}
```

Register it in `cases/index.ts` and it appears in the case select screen automatically.

---

## ◈ Design System — Ember

Custom noir palette designed for extended sessions in dark environments:

```css
--noir-bg:       #0A0907   /* Near-black charcoal — easy on eyes  */
--noir-primary:  #C9973E   /* Amber gold — primary action         */
--noir-accent:   #B91C1C   /* Blood red — danger, caught state    */
--noir-gold:     #D4A853   /* Warm gold — highlights, stars       */
--noir-text:     #EDE5D5   /* Aged parchment — body text          */
--noir-muted:    #5A5248   /* Faded ink — secondary text          */
```

Atmospheric effects: film grain overlay (SVG filter), CRT scanlines (repeating gradient), ambient ember glow (radial gradient), corner vignette, notebook-paper texture, mood-reactive border glows with `box-shadow`.

---

## ◈ Environment Variables

```bash
GEMINI_API_KEY=your_key_here          # Required. Free at aistudio.google.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

All Gemini calls are server-side. The API key is never sent to the browser.

---

## ◈ Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding new cases is the easiest entry point.

---

## ◈ License

MIT — use it, fork it, build your own mysteries.

---

<div align="center">

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓                                                                  ▓
▓   If this project made you think twice about who the killer      ▓
▓   was — please star the repo. It genuinely helps.               ▓
▓                                                                  ▓
▓   ⭐  github.com/Tanya-Gitt/suspect                             ▓
▓                                                                  ▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

</div>
