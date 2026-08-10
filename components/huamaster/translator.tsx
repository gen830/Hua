'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  Eraser,
  Headphones,
  Languages,
  Loader2,
  Sparkles,
  SpellCheck2,
  Type,
} from 'lucide-react'
import {
  EXAMPLE_PROMPTS,
  type Analysis,
  type Word,
} from '@/lib/huamaster-data'
import { cn } from '@/lib/utils'
import { OptionToggle } from './option-toggle'
import { GrammarCard } from './grammar-card'
import { WordChip } from './word-chip'
import { SpeakerButton } from './speaker-button'

type Options = {
  pinyin: boolean
  bopomofo: boolean
  audio: boolean
}

type TranslatorProps = {
  options: Options
  setOptions: (o: Options) => void
  onWordClick: (word: Word) => void
  isSaved: (word: Word) => boolean
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  onSaveSentence: (analysis: Analysis) => void
  isSentenceSaved: (source: string, translation: string) => boolean
}

export function Translator({
  options,
  setOptions,
  onWordClick,
  isSaved,
  onSpeak,
  speakingKey,
  audioSupported,
  onSaveSentence,
  isSentenceSaved,
}: TranslatorProps) {
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [copied, setCopied] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const canAnalyze = input.trim().length > 0

  async function handleAnalyze() {
    if (!canAnalyze || analyzing) return
    setAnalyzing(true)
    setAnalyzeError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      })

      const data = (await res.json()) as Analysis | { error?: string }
      if (!res.ok) {
        throw new Error(
          'error' in data && data.error
            ? data.error
            : '翻訳・分析に失敗しました',
        )
      }

      setAnalysis(data as Analysis)
    } catch (err) {
      setAnalysis(null)
      setAnalyzeError(
        err instanceof Error ? err.message : '翻訳・分析に失敗しました',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function handleClear() {
    setInput('')
    setAnalysis(null)
    setAnalyzeError(null)
  }

  async function handleCopy() {
    if (!analysis) return
    try {
      await navigator.clipboard.writeText(analysis.translation)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  const audioAvailable = options.audio && audioSupported

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <label
          htmlFor="source-text"
          className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
          日本語または繁体字を入力
        </label>
        <textarea
          id="source-text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              (e.metaKey || e.ctrlKey) &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              handleAnalyze()
            }
          }}
          rows={4}
          placeholder="例：牛肉麺が食べたいです"
          className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <OptionToggle
            label="ピンイン"
            icon={Type}
            checked={options.pinyin}
            onChange={(v) => setOptions({ ...options, pinyin: v })}
          />
          <OptionToggle
            label="注音 (Bopomofo)"
            icon={SpellCheck2}
            checked={options.bopomofo}
            onChange={(v) => setOptions({ ...options, bopomofo: v })}
          />
          <OptionToggle
            label="音声再生"
            icon={Headphones}
            checked={options.audio}
            onChange={(v) => setOptions({ ...options, audio: v })}
          />
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {analyzing ? 'Gemini で分析中…' : '翻訳して分析'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            クリア
          </button>
        </div>

        {analyzeError && (
          <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            {analyzeError}
          </p>
        )}
      </section>

      {/* Output */}
      {analysis ? (
        <div className="flex flex-col gap-6">
          {/* Translation card */}
          <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/30 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                台湾華語 Taiwanese Mandarin
              </span>
              <div className="flex items-center gap-2">
                <SpeakerButton
                  text={analysis.translation}
                  speakId="translation"
                  onSpeak={onSpeak}
                  active={speakingKey === 'translation'}
                  disabled={!audioAvailable}
                  label="Play full translation"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy translation"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                  ) : (
                    <Copy className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <p className="mt-4 font-cjk text-3xl font-medium leading-snug text-foreground text-balance sm:text-4xl">
              {analysis.translation}
            </p>
            {options.pinyin && (
              <p className="mt-2 text-base font-medium text-primary">
                {analysis.translationPinyin}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{analysis.sourceLang}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
              <span>繁體中文（台灣）</span>
            </div>

            {(() => {
              const saved = isSentenceSaved(
                analysis.source,
                analysis.translation,
              )
              return (
                <button
                  type="button"
                  onClick={() => onSaveSentence(analysis)}
                  className={cn(
                    'mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    saved
                      ? 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                  aria-pressed={saved}
                >
                  {saved ? (
                    <>
                      <BookmarkCheck className="h-5 w-5" aria-hidden="true" />
                      文章・文法解説を保存済み（タップで削除）
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-5 w-5" aria-hidden="true" />
                      文章・文法解説を保存
                    </>
                  )}
                </button>
              )
            })()}
          </section>

          {/* Word segmentation */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                単語の分解
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {analysis.words.length} 語
              </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              単語をタップすると詳細が表示されます
            </p>
            <div className="flex flex-wrap gap-2.5">
              {analysis.words.map((word, i) => (
                <WordChip
                  key={`${word.hanzi}-${i}`}
                  word={word}
                  index={i}
                  showPinyin={options.pinyin}
                  showBopomofo={options.bopomofo}
                  saved={isSaved(word)}
                  onClick={() => onWordClick(word)}
                />
              ))}
            </div>
          </section>

          {/* Grammar */}
          <GrammarCard notes={analysis.grammar} />
        </div>
      ) : analyzing ? (
        <AnalyzingState />
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">
        Gemini が翻訳と文法解説を生成中…
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
        台湾華語の訳・ピンイン・注音・単語カード・文法ノートを作成しています。
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Languages className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">
        ここに翻訳と分析が表示されます
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
        日本語または繁体字の文を入力して「翻訳して分析」を押すと、台湾華語の訳・文法解説・単語カードが出てきます。
      </p>
    </div>
  )
}
