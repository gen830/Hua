export const SETTINGS_STORAGE_KEY = 'hua-master-settings-v1'

export const DEFAULT_SPEECH_RATE = 1
export const MIN_SPEECH_RATE = 0.6
export const MAX_SPEECH_RATE = 1.6
export const SPEECH_RATE_STEP = 0.05

export type AppSettings = {
  speechRate: number
}

export function clampSpeechRate(rate: number): number {
  return Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate))
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return { speechRate: DEFAULT_SPEECH_RATE }
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { speechRate: DEFAULT_SPEECH_RATE }

    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const speechRate =
      typeof parsed.speechRate === 'number'
        ? clampSpeechRate(parsed.speechRate)
        : DEFAULT_SPEECH_RATE

    return { speechRate }
  } catch {
    return { speechRate: DEFAULT_SPEECH_RATE }
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      speechRate: clampSpeechRate(settings.speechRate),
    }),
  )
}

export function formatSpeechRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}
