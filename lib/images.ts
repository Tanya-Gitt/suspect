// ─── Pollinations.ai — free, no API key, FLUX model ─────────────────────────

export function suspectPortraitUrl(
  name: string,
  appearance: string,
  era: string,
  seed: number | string
): string {
  const prompt = `Portrait of ${name}. ${appearance}. ${era} setting. Film noir style, dramatic side lighting from single source, painterly illustration, dark background, cinematic, atmospheric, slightly desaturated. Face and shoulders only. No text.`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=640&model=flux&seed=${seed}&nologo=true`
}

export function sceneBackgroundUrl(setting: string, seed: number | string): string {
  const prompt = `${setting}. Film noir, dark atmospheric lighting, cinematic still, empty, no people, moody, fog, shadows, photorealistic.`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`
}

export function evidencePhotoUrl(description: string, seed: number): string {
  const prompt = `Crime scene evidence photograph: ${description}. Black and white, grainy, forensic photography, dark, harsh flash lighting, slightly blurred edges.`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=480&model=flux&seed=${seed}&nologo=true`
}

export function truthRevealUrl(
  murdererName: string,
  method: string,
  setting: string,
  seed: number
): string {
  const prompt = `Cinematic scene: ${murdererName}, ${method}, ${setting}. Film noir, dramatic low-key lighting, painterly illustration, no text, dark, atmospheric.`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`
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
