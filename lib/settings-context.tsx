'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clampSpeechRate,
  DEFAULT_SPEECH_RATE,
  loadAppSettings,
  saveAppSettings,
} from './app-settings'

type SettingsContextValue = {
  speechRate: number
  setSpeechRate: (rate: number) => void
  ready: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [speechRate, setSpeechRateState] = useState(DEFAULT_SPEECH_RATE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const settings = loadAppSettings()
    setSpeechRateState(settings.speechRate)
    setReady(true)
  }, [])

  const setSpeechRate = useCallback((rate: number) => {
    const next = clampSpeechRate(rate)
    setSpeechRateState(next)
    saveAppSettings({ speechRate: next })
  }, [])

  const value = useMemo(
    () => ({ speechRate, setSpeechRate, ready }),
    [speechRate, setSpeechRate, ready],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return ctx
}
