// ─── Pollinations.ai — free, no API key ──────────────────────────────────────
// NOTE: do NOT use model=flux — it's unreliable (frequent 500s and timeouts).
// The default Pollinations model is fast and reliable.

export function suspectPortraitUrl(
  name: string,
  appearance: string,
  era: string,
  seed: number | string
): string {
  // Keep the prompt short and visual-only — long prompts trigger 500s
  const visualDesc = appearance
    .split(",")
    .slice(0, 3)
    .map((s) => s.trim())
    .join(", ")
  const prompt = `Film noir portrait of ${name}, ${visualDesc}, dramatic side lighting, dark background, painterly, cinematic`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=640&seed=${seed}&nologo=true`
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
