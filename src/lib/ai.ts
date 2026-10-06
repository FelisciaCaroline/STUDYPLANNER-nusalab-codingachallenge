import { quizOutputSchema, type QuizOutput } from '@/lib/validations'
import { sampleEvenly, contextBudgetChars } from '@/lib/retrieve'

export type AIMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq'

export type AICallOptions = {
  model?: string
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

export type AIResponse = {
  content: string
  usage?: { promptTokens: number; completionTokens: number }
}

const ALIASES: Record<string, AIProvider> = {
  openai: 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  google: 'google',
  gemini: 'google',
  groq: 'groq',
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  groq: 'llama-3.1-8b-instant',
  google: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
}

const LABELS: Record<AIProvider, string> = {
  groq: 'Groq',
  google: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export function resolveProvider(): AIProvider {
  const raw = (process.env.LLM_PROVIDER || '').trim().replace(/^["']|["']$/g, '').toLowerCase()
  const p = ALIASES[raw]
  if (!p) {
    throw new Error(`Unsupported LLM_PROVIDER "${raw}". Use one of: groq, gemini, openai, anthropic.`)
  }
  return p
}

function readApiKey(): string {
  return (process.env.AI_API_KEY || '').trim().replace(/^["']|["']$/g, '')
}

function validateApiKey(provider: AIProvider, apiKey: string): void {
  if (!apiKey) {
    throw new Error('Missing AI_API_KEY in .env.local. Add it and restart the dev server.')
  }
  const rules: Record<AIProvider, [boolean, string]> = {
    openai: [apiKey.startsWith('sk-'), 'OpenAI keys start with "sk-".'],
    anthropic: [apiKey.startsWith('sk-ant-'), 'Anthropic keys start with "sk-ant-".'],
    google: [apiKey.startsWith('AIza') || apiKey.startsWith('AQ.'), 'Google keys start with "AIza" (or "AQ.").'],
    groq: [apiKey.startsWith('gsk_'), 'Groq keys start with "gsk_". Create one at console.groq.com.'],
  }
  if (!rules[provider][0]) {
    throw new Error(`AI_API_KEY does not look like a ${LABELS[provider]} key. ${rules[provider][1]}`)
  }
}

async function postJson(
  label: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  model: string
): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail: string = err?.error?.message || ''
      if (res.status === 401 || res.status === 403 || /api key/i.test(detail)) {
        throw new Error(`${label} rejected the API key. Check AI_API_KEY in .env.local. ${detail}`)
      }
      if (res.status === 404) {
        throw new Error(`Model "${model}" was not found on ${label}. Fix AI_MODEL in .env.local and restart. ${detail}`)
      }
      if (res.status === 413) {
        throw new Error(`${label}: request too large for this model/plan. Lower AI_CONTEXT_CHARS. ${detail}`)
      }
      if (res.status === 429) {
        throw new Error(`${label} rate limit reached. Wait a moment and try again. ${detail}`)
      }
      throw new Error(`${label} error ${res.status}: ${detail || 'unknown error'}`)
    }
    return await res.json()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${label} request timed out. Try again or use a faster model.`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const provider = resolveProvider()
  const apiKey = readApiKey()
  const model = options.model || process.env.AI_MODEL?.trim() || DEFAULT_MODELS[provider]
  validateApiKey(provider, apiKey)

  if (provider === 'openai') return callOpenAICompatible('https://api.openai.com/v1', 'OpenAI', apiKey, model, options)
  if (provider === 'groq') return callOpenAICompatible('https://api.groq.com/openai/v1', 'Groq', apiKey, model, options)
  if (provider === 'anthropic') return callAnthropic(apiKey, model, options)
  return callGoogle(apiKey, model, options)
}

async function callOpenAICompatible(
  baseUrl: string,
  label: string,
  apiKey: string,
  model: string,
  options: AICallOptions
): Promise<AIResponse> {
  const data = await postJson(
    label,
    `${baseUrl}/chat/completions`,
    { Authorization: `Bearer ${apiKey}` },
    {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    },
    model
  )
  const content = data.choices?.[0]?.message?.content || ''
  if (!content) throw new Error(`${label} returned an empty response.`)
  return {
    content,
    usage: data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
      : undefined,
  }
}

async function callAnthropic(apiKey: string, model: string, options: AICallOptions): Promise<AIResponse> {
  const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const messages = options.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }))
  const data = await postJson(
    'Anthropic',
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    {
      model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
    },
    model
  )
  const content = (data.content ?? []).map((p: { text?: string }) => p.text || '').join('')
  if (!content) throw new Error('Anthropic returned an empty response.')
  return {
    content,
    usage: data.usage
      ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
      : undefined,
  }
}

async function callGoogle(apiKey: string, model: string, options: AICallOptions): Promise<AIResponse> {
  const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 2000,
  }
  if (options.responseFormat === 'json') generationConfig.responseMimeType = 'application/json'

  const data = await postJson(
    'Gemini',
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { 'x-goog-api-key': apiKey },
    {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig,
    },
    model
  )
  const content = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text || '')
    .join('')
  if (!content) {
    const why = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'
    throw new Error(`Gemini returned no text (${why}).`)
  }
  return {
    content,
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined,
  }
}

export function parseAiJson(text: string): unknown {
  let trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/)
  if (fenceMatch) trimmed = fenceMatch[1].trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        // fall through
      }
    }
  }
  throw new Error('Unable to parse JSON from AI response.')
}

export async function generateQuizFromMaterial(
  materialExcerpts: string[],
  questionCount: number,
  difficulty: 'Easy' | 'Medium' | 'Hard'
): Promise<QuizOutput> {
  const docs = materialExcerpts.map((text, i) => ({ filename: `Material ${i + 1}`, text }))
  const budget = contextBudgetChars()
  const isGroq = (process.env.LLM_PROVIDER || '').trim().toLowerCase().replace(/["']/g, '') === 'groq'
  const BATCH_SIZE = isGroq ? 5 : 10
  const quizModel = process.env.AI_QUIZ_MODEL?.trim() || undefined // callAI falls back to AI_MODEL

  const rules: Record<string, string> = {
    Easy: 'Focus on recall and comprehension: key facts and definitions. Distractors must still be plausible.',
    Medium: 'Focus on understanding and application: simple examples, comparisons, one-step reasoning.',
    Hard: 'Focus on analysis, multi-step reasoning and scenario questions. Distractors must be common misconceptions.',
  }

  const system =
    'You are an expert educator. Return ONLY raw JSON. No markdown, no code fences, no text before or after.'

  const batches: number[] = []
  for (let i = 0; i < questionCount; i += BATCH_SIZE) {
    batches.push(Math.min(BATCH_SIZE, questionCount - i))
  }

  const all: QuizOutput['questions'] = []
  let lastError = ''

  for (let i = 0; i < batches.length; i++) {
    const material = sampleEvenly(docs, budget, i)
    const avoid = all.slice(-30).map((q) => `- ${q.prompt}`).join('\n')
    const prompt = `Generate ${batches[i]} ${difficulty.toLowerCase()} multiple-choice questions based ONLY on the study material below.
${rules[difficulty]}
- Provide exactly 4 options. Randomize the position of the correct answer.
- Each question needs a short explanation referencing the material.
- Write in the same language as the material.
${avoid ? `- Do NOT repeat these questions:\n${avoid}\n` : ''}
Output STRICT JSON: { "questions": [ { "prompt": "string", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "string" } ] }

Material:
${material}`

    let ok = false
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const res = await callAI({
          model: quizModel,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          maxTokens: isGroq ? 2500 : 8000,
          responseFormat: 'json',
        })
        const parsed = quizOutputSchema.safeParse(parseAiJson(res.content))
        if (!parsed.success) throw new Error('AI returned JSON in the wrong format.')
        all.push(...parsed.data.questions)
        ok = true
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }
    if (isGroq && i < batches.length - 1) await new Promise((r) => setTimeout(r, 2000))
  }

  if (all.length === 0 && lastError) throw new Error(lastError) // surface the REAL error

  const seen = new Set<string>()
  const unique = all.filter((q) => {
    const k = q.prompt.toLowerCase().replace(/\s+/g, ' ').trim()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const message =
    unique.length < questionCount ? `Only ${unique.length} questions could be made from this material.` : undefined
  return { questions: unique, message }
}