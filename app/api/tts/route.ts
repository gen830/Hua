import { EdgeTTS } from 'edge-tts-universal'
import { TTS_MAX_LENGTH, TTS_VOICE } from '@/lib/tts-config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: unknown }
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.length > TTS_MAX_LENGTH) {
      return Response.json({ error: 'text too long' }, { status: 400 })
    }

    const tts = new EdgeTTS(text, TTS_VOICE)
    const result = await tts.synthesize()

    const audio = result.audio
    const buffer = Buffer.isBuffer(audio)
      ? audio
      : Buffer.from(await audio.arrayBuffer())

    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[tts]', error)
    return Response.json({ error: 'TTS synthesis failed' }, { status: 500 })
  }
}
