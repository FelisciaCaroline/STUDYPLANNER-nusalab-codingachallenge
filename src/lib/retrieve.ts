export type Doc = { filename: string; text: string }
type Chunk = { file: string; idx: number; t: string }

export function contextBudgetChars(): number {
  const env = Number(process.env.AI_CONTEXT_CHARS)
  if (env > 0) return env
  const p = (process.env.LLM_PROVIDER || '').trim().toLowerCase()
  return p === 'groq' ? 8000 : 100000
}

const WORD_RE = new RegExp('[\\p{L}\\p{N}]{3,}', 'gu')

function tokenize(s: string): string[] {
  return s.toLowerCase().match(WORD_RE) ?? []
}

function splitChunks(text: string, size = 1500): string[] {
  const hard = new RegExp(`[\\s\\S]{1,${size}}`, 'g')
  const pieces = text
    .split(/\n\s*\n/)
    .flatMap((p) => (p.length > size ? p.match(hard) ?? [] : [p]))
  const out: string[] = []
  let cur = ''
  for (const p of pieces) {
    if (cur && cur.length + p.length + 2 > size) {
      out.push(cur)
      cur = p
    } else {
      cur = cur ? cur + '\n\n' + p : p
    }
  }
  if (cur) out.push(cur)
  return out
}

function toChunks(docs: Doc[]): Chunk[] {
  return docs.flatMap((d, di) =>
    splitChunks(d.text).map((t, i) => ({ file: d.filename, idx: di * 1_000_000 + i, t }))
  )
}

function format(picked: Chunk[]): string {
  return [...picked]
    .sort((a, b) => a.idx - b.idx)
    .map((c) => `[${c.file}]\n${c.t}`)
    .join('\n\n---\n\n')
}

/** Spread picks across the whole material. `offset` shifts picks so quiz batches differ. */
export function sampleEvenly(docs: Doc[], budget: number, offset = 0): string {
  const chunks = toChunks(docs)
  if (!chunks.length) return ''
  const avg = Math.max(1, Math.floor(chunks.reduce((n, c) => n + c.t.length, 0) / chunks.length))
  const n = Math.max(1, Math.min(chunks.length, Math.floor(budget / avg)))
  const step = chunks.length / n
  const chosen = new Set<number>()
  for (let k = 0; k < n; k++) chosen.add(Math.floor(k * step + offset * (step / 3)) % chunks.length)
  const picked: Chunk[] = []
  let used = 0
  chosen.forEach((i) => {
    if (used + chunks[i].t.length > budget && picked.length > 0) return
    picked.push(chunks[i])
    used += chunks[i].t.length
  })
  return format(picked)
}

/** Pick the chunks most relevant to the question (TF-IDF style). Falls back to even sampling. */
export function pickRelevant(query: string, docs: Doc[], budget: number): string {
  const chunks = toChunks(docs)
  if (!chunks.length) return ''
  const q = Array.from(new Set(tokenize(query)))
  const toks = chunks.map((c) => tokenize(c.t))
  const df = new Map<string, number>()
  toks.forEach((list) => new Set(list).forEach((t) => df.set(t, (df.get(t) || 0) + 1)))
  const N = chunks.length
  const scored = chunks.map((c, i) => {
    const tf = new Map<string, number>()
    toks[i].forEach((t) => tf.set(t, (tf.get(t) || 0) + 1))
    let s = 0
    for (const term of q) {
      const f = tf.get(term)
      if (f) s += (1 + Math.log(f)) * Math.log(1 + N / (df.get(term) || 1))
    }
    return { c, s }
  })
  if (!scored.some((x) => x.s > 0)) return sampleEvenly(docs, budget)
  const picked: Chunk[] = []
  let used = 0
  for (const { c, s } of scored.sort((a, b) => b.s - a.s)) {
    if (s <= 0) break
    if (used + c.t.length > budget && picked.length > 0) break
    picked.push(c)
    used += c.t.length
  }
  return format(picked)
}