'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

type Props = {
  open: boolean
  onClose: () => void
  reminderTitle?: string
}

export default function ChatPanel({ open, onClose, reminderTitle }: Props) {
  const params = useParams()
  const reminderId = params.id as string | undefined
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!reminderId) return
    const url = `/api/chat?reminderId=${reminderId}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
    }
  }, [reminderId])

  useEffect(() => {
    if (open) {
      fetchMessages()
    }
  }, [open, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError(null)
    setStreamingContent('')

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage, createdAt: new Date().toISOString() }])

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage, reminderId, enableWebSearch }),
        signal: abortControllerRef.current.signal,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      const assistantMessage = data.content
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantMessage, createdAt: new Date().toISOString() }])
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const clearChat = async () => {
    if (!reminderId) return
    await fetch(`/api/chat?reminderId=${reminderId}`, { method: 'DELETE' })
    setMessages([])
  }

  const webSearchAvailable = process.env.NEXT_PUBLIC_ENABLE_WEB_SEARCH === 'true' && !!process.env.NEXT_PUBLIC_TAVILY_API_KEY

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-150" onClick={onClose} />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-lg flex-col border-l border-cafe-border bg-cafe-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-cafe-border p-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-cafe-cream">Chat</h3>
            {reminderTitle && <p className="text-xs text-cafe-muted">{reminderTitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {webSearchAvailable && (
              <label className="flex items-center gap-2 text-xs text-cafe-muted">
                <input
                  type="checkbox"
                  checked={enableWebSearch}
                  onChange={(e) => setEnableWebSearch(e.target.checked)}
                  className="rounded border-cafe-border text-cafe-sage focus:ring-cafe-sage"
                />
                Search web
              </label>
            )}
            <button onClick={clearChat} className="text-xs text-cafe-muted hover:text-cafe-danger transition-colors duration-150">
              Clear
            </button>
            <button onClick={onClose} className="text-cafe-muted hover:text-cafe-cream" aria-label="Close chat">
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <EmptyState
              title="No messages yet"
              description="Ask a question about your study materials or get help with planning."
            />
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-cafe-mocha text-cafe-cream'
                    : 'bg-cafe-border text-cafe-cream'
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm, rehypeSanitize]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-cafe-border px-4 py-2 text-sm text-cafe-cream">
                <Spinner className="h-4 w-4" />
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-cafe-danger bg-cafe-danger/10 p-3 text-sm text-cafe-danger">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Retry</button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-cafe-border p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask anything..."
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
