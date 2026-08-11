'use client'

import { Gauge, Loader2, Volume2 } from 'lucide-react'
import {
  DEFAULT_SPEECH_RATE,
  formatSpeechRate,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
  SPEECH_RATE_STEP,
} from '@/lib/app-settings'
import { useSettings } from '@/lib/settings-context'

const PREVIEW_TEXT = '你好，歡迎使用 HuaMaster。'

type SettingsPanelProps = {
  onSpeakPreview: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
}

export function SettingsPanel({
  onSpeakPreview,
  speakingKey,
  audioSupported,
}: SettingsPanelProps) {
  const { speechRate, setSpeechRate } = useSettings()
  const previewActive = speakingKey === 'settings-preview'

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">発音スピード</h2>
            <p className="text-xs text-muted-foreground">
              台湾華語の読み上げ速度を調整します（この端末に保存）
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
              現在: {formatSpeechRate(speechRate)}
            </span>
            <span className="text-xs text-muted-foreground">
              {speechRate < DEFAULT_SPEECH_RATE
                ? 'ゆっくり'
                : speechRate > DEFAULT_SPEECH_RATE
                  ? 'はやい'
                  : '標準'}
            </span>
          </div>

          <input
            id="speech-rate"
            type="range"
            min={MIN_SPEECH_RATE}
            max={MAX_SPEECH_RATE}
            step={SPEECH_RATE_STEP}
            value={speechRate}
            onChange={(e) => setSpeechRate(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
            aria-valuemin={MIN_SPEECH_RATE}
            aria-valuemax={MAX_SPEECH_RATE}
            aria-valuenow={speechRate}
          />

          <div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground">
            <span>ゆっくり {formatSpeechRate(MIN_SPEECH_RATE)}</span>
            <span>標準 {formatSpeechRate(DEFAULT_SPEECH_RATE)}</span>
            <span>はやい {formatSpeechRate(MAX_SPEECH_RATE)}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[0.75, 1, 1.25, 1.5].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSpeechRate(preset)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  Math.abs(speechRate - preset) < 0.001
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {formatSpeechRate(preset)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSpeakPreview(PREVIEW_TEXT, 'settings-preview')}
          disabled={!audioSupported || previewActive}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {previewActive ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          )}
          {previewActive ? '試聴中…' : '試聴する'}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">{PREVIEW_TEXT}</p>
      </section>
    </div>
  )
}
