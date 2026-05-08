// ─── Suspect portraits — DiceBear (instant SVG, fully reliable) ──────────────
// Pollinations rate-limits aggressively when 3+ portraits load at once.
// DiceBear returns SVGs in <100ms with no rate limits, no API key.

import type { SuspectSex } from "@/types"

export function suspectPortraitUrl(
  name: string,
  _appearance: string,
  _era: string,
  seed: number | string,
  sex?: SuspectSex,
  age?: number,
): string {
  // Pick a DiceBear style by sex for clear visual gender separation:
  //   female → lorelei (illustrated, softer features, more feminine)
  //   male   → notionists (editorial style, masculine-leaning by default)
  //   nb / unknown → notionists-neutral
  const style = sex === "female" ? "lorelei" : sex === "nb" ? "notionists-neutral" : "notionists"

  // Build a deterministic seed that varies by name + age + seed.
  // Including age ensures young vs old suspects get different appearances.
  const dicebearSeed = `${name}-${age ?? 0}-${seed}`

  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(dicebearSeed)}&backgroundColor=1F1F3A,16162A,2A2A4A&backgroundType=gradientLinear&radius=0`
}

export function sceneBackgroundUrl(setting: string, seed: number | string): string {
  const prompt = `${setting}, film noir, dark atmospheric lighting, cinematic, empty, moody, fog, shadows`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&nologo=true`
}

export function evidencePhotoUrl(description: string, seed: number): string {
  const prompt = `Crime scene evidence photo, ${description}, black and white, grainy, forensic, dark, harsh flash`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=480&seed=${seed}&nologo=true`
}

export function truthRevealUrl(
  murdererName: string,
  method: string,
  setting: string,
  seed: number
): string {
  const prompt = `Cinematic scene, ${murdererName}, ${method}, ${setting}, film noir, dramatic low-key lighting, painterly, dark, atmospheric`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&nologo=true`
}

// Preload into browser cache by creating Image objects
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // silently fail — graceful degradation
    img.src = url
  })
}

// Fire all suspect portrait + background generation in parallel
export async function prefetchCaseImages(
  suspects: { id: string; name: string; appearance: string }[],
  setting: string,
  seed: number | string
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {
    background: sceneBackgroundUrl(setting, seed),
  }

  suspects.forEach((s, i) => {
    const numSeed = typeof seed === "string" ? parseInt(seed, 16) || i + 1 : seed
    urls[s.id] = suspectPortraitUrl(s.name, s.appearance, "present day", numSeed + i + 1)
  })

  // Preload all in parallel — don't await, fire-and-forget
  Object.values(urls).forEach((url) => preloadImage(url))

  return urls
}
