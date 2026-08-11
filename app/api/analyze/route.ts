import { ApiError } from '@google/genai'
import {
  analyzeDetailsWithGemini,
  isZeroQuotaError,
} from '@/lib/gemini-analyze'
import {
  describeApiKeyFormat,
  resolveGeminiApiKey,
} from '@/lib/gemini-client'
import {
  resolveGoogleTranslateApiKey,
  translateWithGoogle,
} from '@/lib/google-translate'
import type { Analysis } from '@/lib/huamaster-data'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_INPUT_LENGTH = 2000

function formatGeminiError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return 'Gemini の応答形式が不正でした（JSON の解析に失敗）。もう一度お試しください。'
  }

  if (error instanceof ApiError) {
    if (error.status === 429) {
      if (isZeroQuotaError(error)) {
        return 'この Gemini モデルには無料枠が割り当てられていません（limit: 0）。使い切ったわけではありません。Google AI Studio で gemini-2.5-flash など利用可能なモデルを .env.local の GEMINI_MODEL に設定するか、請求設定を確認してください。'
      }
      return 'Gemini API のリクエスト上限に達しました。1〜2 分待ってから再試行してください。'
    }
    if (error.status === 404) {
      return '指定した Gemini モデルが利用できません。.env.local の GEMINI_MODEL を gemini-2.5-flash に変更してください。'
    }
    if (error.status === 401 || error.status === 403) {
      return 'Gemini API キーが無効です。Google AI Studio でキーを再確認し、Vercel の GEMINI_API_KEY が最新か確認してください。'
    }
    if (error.message) {
      return `Gemini API エラー (${error.status}): ${error.message}`
    }
  }

  if (error instanceof Error) {
    const msg = error.message
    if (/api.?key|unauthorized|permission denied/i.test(msg)) {
      return 'Gemini API キーが無効です。Vercel → GEMINI_API_KEY を確認して Redeploy してください。'
    }
    if (/quota|rate limit|429/i.test(msg)) {
      return 'Gemini API のリクエスト上限に達しました。1〜2 分待ってから再試行してください。'
    }
    if (msg && msg.length <= 180) {
      return `翻訳・文法分析に失敗しました: ${msg}`
    }
  }

  return '翻訳・文法分析に失敗しました。しばらくしてから再試行してください。'
}

type AnalyzeBody = {
  text?: unknown
  phase?: unknown
  translation?: unknown
}

function translateKeyHint(): string {
  return process.env.VERCEL === '1'
    ? 'Vercel → Settings → Environment Variables に GOOGLE_TRANSLATE_API_KEY を追加（Production にチェック）→ Redeploy してください。/api/health で googleTranslate: true を確認できます。'
    : 'GOOGLE_TRANSLATE_API_KEY を .env.local に追加し、dev サーバーを再起動してください。'
}

function geminiKeyHint(): string {
  return process.env.VERCEL === '1'
    ? 'Vercel → Settings → Environment Variables に GEMINI_API_KEY（NEXT_PUBLIC_ なし）を追加し、Production にチェックして Redeploy してください。/api/health で gemini: true になるか確認できます。'
    : 'GEMINI_API_KEY を .env.local に追加し、dev サーバーを再起動してください。'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const phase = body.phase === 'details' ? 'details' : 'translate'
    const translation =
      typeof body.translation === 'string' ? body.translation.trim() : ''

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.length > MAX_INPUT_LENGTH) {
      return Response.json({ error: 'text too long' }, { status: 400 })
    }

    if (phase === 'details') {
      const geminiKey = resolveGeminiApiKey()
      if (!geminiKey) {
        return Response.json({ error: geminiKeyHint() }, { status: 503 })
      }

      if (process.env.NODE_ENV === 'development') {
        console.info(
          `[analyze/details] Using Gemini key format: ${describeApiKeyFormat(geminiKey)}`,
        )
      }

      if (!translation) {
        return Response.json(
          { error: 'translation is required for details phase' },
          { status: 400 },
        )
      }

      const details = await analyzeDetailsWithGemini(text, translation)
      return Response.json(details)
    }

    if (!resolveGoogleTranslateApiKey()) {
      return Response.json({ error: translateKeyHint() }, { status: 503 })
    }

    const translated = await translateWithGoogle(text)
    const analysis: Analysis = {
      source: text,
      ...translated,
      words: [],
      grammar: [],
    }

    return Response.json(analysis)
  } catch (error) {
    console.error('[analyze]', error)
    return Response.json({ error: formatGeminiError(error) }, { status: 500 })
  }
}
