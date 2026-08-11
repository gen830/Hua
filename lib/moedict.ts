type MoedictDefinition = {
  def?: string
  type?: string
  example?: string[]
}

type MoedictHeteronym = {
  bopomofo?: string
  pinyin?: string
  definitions?: MoedictDefinition[]
}

type MoedictResponse = {
  title?: string
  heteronyms?: MoedictHeteronym[]
  error?: string
}

export type MoedictLookup = {
  hanzi: string
  pinyin: string
  bopomofo: string
  definition: string
  pos: string
}

const MOEDICT_BASE = 'https://www.moedict.tw/uni'
const cache = new Map<string, MoedictLookup | null>()

const POS_MAP: Record<string, string> = {
  動: '動詞',
  名: '名詞',
  形: '形容詞',
  副: '副詞',
  代: '代名詞',
  介: '前置詞',
  連: '接続詞',
  助: '助詞',
  量: '量詞',
  嘆: '感動詞',
  狀: '副詞',
  數: '数詞',
  專: '固有名詞',
}

function mapPos(type: string | undefined): string {
  if (!type?.trim()) return '—'
  return POS_MAP[type.trim()] ?? type
}

function pickHeteronym(entry: MoedictResponse): MoedictHeteronym | null {
  const list = entry.heteronyms
  if (!list?.length) return null
  return list[0] ?? null
}

function pickDefinition(heteronym: MoedictHeteronym): MoedictDefinition | null {
  const list = heteronym.definitions
  if (!list?.length) return null
  return list.find((d) => d.def?.trim()) ?? null
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export async function lookupMoedict(hanzi: string): Promise<MoedictLookup | null> {
  const key = hanzi.trim()
  if (!key) return null

  if (cache.has(key)) {
    return cache.get(key) ?? null
  }

  try {
    const res = await fetch(`${MOEDICT_BASE}/${encodeURIComponent(key)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      cache.set(key, null)
      return null
    }

    const payload = (await res.json()) as MoedictResponse
    if (payload.error || !payload.title) {
      cache.set(key, null)
      return null
    }

    const heteronym = pickHeteronym(payload)
    const definition = heteronym ? pickDefinition(heteronym) : null
    if (!heteronym || !definition?.def?.trim()) {
      cache.set(key, null)
      return null
    }

    const lookup: MoedictLookup = {
      hanzi: payload.title,
      pinyin: normalizeSpaces(heteronym.pinyin ?? ''),
      bopomofo: normalizeSpaces(heteronym.bopomofo ?? ''),
      definition: definition.def.trim(),
      pos: mapPos(definition.type),
    }

    cache.set(key, lookup)
    return lookup
  } catch {
    cache.set(key, null)
    return null
  }
}
