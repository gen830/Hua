'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  Eraser,
  GraduationCap,
  Languages,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { type Analysis, chineseStudyPinyin, chineseStudyText, isChineseSourceLang } from '@/lib/huamaster-data'
import { cn } from '@/lib/utils'
import { GrammarCard } from './grammar-card'
import { WordChip } from './word-chip'
import { SpeakerButton } from './speaker-button'

type TranslatorProps = {
  onWordClick: (word: Word) => void
  isSaved: (word: Word) => boolean
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  onSaveSentence: (analysis: Analysis) => void
  isSentenceSaved: (source: string, translation: string) => boolean
}

export function Translator({
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
  const [translating, setTranslating] = useState(false)
  const [wordsLoading, setWordsLoading] = useState(false)
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [grammarError, setGrammarError] = useState<string | null>(null)

  const canAnalyze = input.trim().length > 0
  const analyzing = translating || wordsLoading

  async function fetchWords(source: string, translation: string, sourceLang: string) {
    setWordsLoading(true)
    setWordsError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: source,
          translation,
          sourceLang,
          phase: 'words',
        }),
      })

      const data = (await res.json()) as
        | { words: Analysis['words'] }
        | { error?: string }

      if (!res.ok) {
        throw new Error(
          'error' in data && data.error
            ? data.error
            : '単語の分析に失敗しました',
        )
      }

      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              words: data.words,
            }
          : null,
      )
    } catch (err) {
      setWordsError(
        err instanceof Error ? err.message : '単語の分析に失敗しました',
      )
    } finally {
      setWordsLoading(false)
    }
  }

  async function fetchGrammar() {
    if (!analysis || grammarLoading || analysis.grammar.length > 0) return

    setGrammarLoading(true)
    setGrammarError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: analysis.source,
          translation: analysis.translation,
          phase: 'grammar',
        }),
      })

      const data = (await res.json()) as
        | { grammar: Analysis['grammar'] }
        | { error?: string }

      if (!res.ok) {
        throw new Error(
          'error' in data && data.error
            ? data.error
            : '文法解説の取得に失敗しました',
        )
      }

      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              grammar: data.grammar,
            }
          : null,
      )
    } catch (err) {
      setGrammarError(
        err instanceof Error
          ? err.message
          : '文法解説の取得に失敗しました',
      )
    } finally {
      setGrammarLoading(false)
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze || analyzing) return
    setTranslating(true)
    setWordsLoading(false)
    setGrammarLoading(false)
    setAnalyzeError(null)
    setWordsError(null)
    setGrammarError(null)
    setAnalysis(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, phase: 'translate' }),
      })

      const data = (await res.json()) as Analysis | { error?: string }
      if (!res.ok) {
        throw new Error(
          'error' in data && data.error ? data.error : '翻訳に失敗しました',
        )
      }

      const partial = data as Analysis
      setAnalysis({
        ...partial,
        sourcePinyin: partial.sourcePinyin ?? '',
        words: [],
        grammar: [],
      })

      void fetchWords(
        partial.source,
        partial.translation,
        partial.sourceLang,
      )
    } catch (err) {
      setAnalysis(null)
      setAnalyzeError(
        err instanceof Error ? err.message : '翻訳に失敗しました',
      )
    } finally {
      setTranslating(false)
    }
  }

  function handleClear() {
    setInput('')
    setAnalysis(null)
    setAnalyzeError(null)
    setWordsError(null)
    setGrammarError(null)
  }

  async function handleCopy() {
    if (!analysis) return
    try {
      const text = isChineseSourceLang(analysis.sourceLang)
        ? analysis.source
        : analysis.translation
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  const audioAvailable = audioSupported
  const chineseInput = analysis ? isChineseSourceLang(analysis.sourceLang) : false
  const studyChinese = analysis ? chineseStudyText(analysis) : ''
  const studyPinyin = analysis ? chineseStudyPinyin(analysis) : ''

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

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {translating
              ? '翻訳中…'
              : wordsLoading
                ? '単語を検索中…'
                : '翻訳して分析'}
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
        {wordsError && (
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
            {wordsError}
          </p>
        )}
      </section>

      {/* Output */}
      {analysis ? (
        <div className="flex flex-col gap-6">
          {/* Result card */}
          <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/30 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {chineseInput ? '繁體中文（入力）' : '台湾華語 Taiwanese Mandarin'}
              </span>
              <div className="flex items-center gap-2">
                <SpeakerButton
                  text={studyChinese}
                  speakId="study-chinese"
                  onSpeak={onSpeak}
                  active={speakingKey === 'study-chinese'}
                  disabled={!audioAvailable}
                  label={
                    chineseInput
                      ? 'Play input Traditional Chinese'
                      : 'Play full translation'
                  }
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy Chinese text"
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
              {chineseInput ? analysis.source : analysis.translation}
            </p>
            <p className="mt-2 text-base font-medium text-primary">
              {studyPinyin}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{analysis.sourceLang}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
              <span>{chineseInput ? '日本語' : '繁體中文（台灣）'}</span>
            </div>

            {chineseInput ? (
              <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  日本語訳
                </p>
                <p className="mt-2 text-lg leading-relaxed text-foreground">
                  {analysis.translation}
                </p>
              </div>
            ) : null}

            {(() => {
              const saved = isSentenceSaved(
                analysis.source,
                analysis.translation,
              )
              return (
                <button
                  type="button"
                  onClick={() => onSaveSentence(analysis)}
                  disabled={wordsLoading}
                  className={cn(
                    'mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
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
            {wordsLoading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                辞書検索中
              </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {analysis.words.length} 語
                </span>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {chineseInput
                ? '入力した繁体字の文を分解しています。タップで詳細を表示できます。'
                : '単語をタップすると詳細が表示されます'}
            </p>
            {wordsLoading && analysis.words.length === 0 ? (
              <DetailsSkeleton />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {analysis.words.map((word, i) => (
                  <WordChip
                    key={`${word.hanzi}-${i}`}
                    word={word}
                    index={i}
                    showPinyin
                    showBopomofo
                    saved={isSaved(word)}
                    onClick={() => onWordClick(word)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Grammar (on demand) */}
          {analysis.grammar.length > 0 ? (
            <GrammarCard notes={analysis.grammar} />
          ) : (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      文法解説
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      必要なときだけ Gemini で解説を生成します
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchGrammar()}
                  disabled={grammarLoading || wordsLoading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {grammarLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  {grammarLoading ? '生成中…' : '文法解説を見る'}
                </button>
              </div>
              {grammarError && (
                <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                  {grammarError}
                </p>
              )}
            </section>
          )}
        </div>
      ) : translating ? (
        <AnalyzingState phase="translate" />
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function DetailsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 w-24 animate-pulse rounded-2xl bg-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function AnalyzingState({ phase }: { phase: 'translate' | 'full' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">
        {phase === 'translate'
          ? '台湾華語に翻訳中…'
          : 'Gemini が翻訳と文法解説を生成中…'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
        {phase === 'translate'
          ? '訳文ができ次第すぐ表示します。単語はその後に読み込みます。'
          : '台湾華語の訳・ピンイン・注音・単語カードを作成しています。'}
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
        日本語または繁体字の文を入力して「翻訳して分析」を押すと、台湾華語の訳と単語カードが表示されます。文法解説は必要なときだけ取得できます。
      </p>
    </div>
  )
}
