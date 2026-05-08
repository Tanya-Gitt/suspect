# Contributing to SUSPECT

First off — thanks for being here. SUSPECT is an open playground for anyone who wants to build richer AI interrogation experiences.

## Ways to contribute

### Add a new case (easiest)
Cases are self-contained TypeScript files. Copy any existing case in `cases/`, follow the structure, and open a PR. See the README for the full schema.

**Good case ideas:**
- Different eras (1920s Prohibition, 1970s Italian heist, near-future dystopia)
- Different tones (comedy, horror, political thriller)
- More suspects (the current cases use 3–4; try 5–6 for more complexity)

### Improve the AI prompting
The heart of the game is `app/api/interrogate/route.ts` + each suspect's `systemPromptBase`. Better prompting = more believable characters. If you find a prompt pattern that makes suspects more evasive, contradictory, or dramatically satisfying — open a PR.

### UI/UX improvements
The Ember design system lives in `app/globals.css`. Component files are in `components/`. Anything that makes the interrogation atmosphere more immersive is welcome.

### Bug fixes
Check the Issues tab. Anything tagged `good first issue` is approachable without deep game knowledge.

---

## Setup

```bash
git clone https://github.com/Tanya-Gitt/suspect.git
cd suspect
npm install
cp .env.example .env.local
# Add your free Gemini API key
npm run dev
```

## PR guidelines

- Keep PRs focused — one feature or fix per PR
- New cases should have at least 3 suspects with distinct roles
- Don't commit `.env.local` or any API keys
- Run `npm run build` before opening a PR to catch type errors

---

Questions? Open a Discussion on GitHub.
