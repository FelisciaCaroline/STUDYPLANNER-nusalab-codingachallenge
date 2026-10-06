import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { callAI, type AIMessage } from '@/lib/ai'
import { searchWeb } from '@/lib/search'
import { chatMessageSchema } from '@/lib/validations'
import { pickRelevant, contextBudgetChars } from '@/lib/retrieve'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reminderId = searchParams.get('reminderId')
  if (!reminderId) {
    return NextResponse.json({ error: 'reminderId is required' }, { status: 400 })
  }
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { reminderId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const reminderId = searchParams.get('reminderId')
  if (!reminderId) {
    return NextResponse.json({ error: 'reminderId is required' }, { status: 400 })
  }
  try {
    await prisma.chatMessage.deleteMany({ where: { reminderId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, reminderId } = body as { content: string; reminderId?: string }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }
    if (!reminderId) {
      return NextResponse.json({ error: 'Chat is only available inside a reminder.' }, { status: 400 })
    }

    const parsed = chatMessageSchema.safeParse({ content, role: 'user', reminderId })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.message }, { status: 400 })
    }

    if (!process.env.AI_API_KEY) {
      return NextResponse.json(
        { error: 'AI is not configured. Missing: AI_API_KEY. Set it in .env.local and restart the dev server.' },
        { status: 500 }
      )
    }

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        tasks: true,
        materials: { select: { filename: true, extractedText: true } },
      },
    })
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const docs = reminder.materials
      .filter((m) => m.extractedText)
      .map((m) => ({ filename: m.filename, text: m.extractedText as string }))
    const materialContext = pickRelevant(content, docs, contextBudgetChars())

    const systemPrompt = `You are a careful, accurate study assistant focused on ONE study reminder.

Title: ${reminder.title}
Type: ${reminder.type}
Subject: ${reminder.subject || 'N/A'}
Due: ${reminder.dueAt ? new Date(reminder.dueAt).toLocaleString() : 'N/A'}
Notes: ${reminder.notes || 'N/A'}
Tasks: ${reminder.tasks.map((t) => `- ${t.text} (${t.done ? 'done' : 'pending'})`).join('\n') || 'None'}
Uploaded files: ${reminder.materials.map((m) => m.filename).join(', ') || 'none'}

Relevant excerpts from the uploaded material:
${materialContext || '(no extractable text uploaded yet)'}

Instructions:
- Help with studying, explaining the material, making plans, practice questions and ideas for this reminder.
- Prioritize the reminder details and uploaded material above.
- If you use information from outside the uploaded material, clearly mark it as external information.
- Never invent facts, sources or citations. If the material does not contain the answer, say so plainly.
- Reply in the same language the user writes in.`

    const recent = await prisma.chatMessage.findMany({
      where: { reminderId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recent.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ]

    if (process.env.ENABLE_WEB_SEARCH === 'true' && process.env.TAVILY_API_KEY) {
      try {
        const results = await searchWeb(content)
        const ctx = results.map((r) => `[${r.title}](${r.url})\n${r.content}`).join('\n\n')
        aiMessages[aiMessages.length - 1] = {
          role: 'user',
          content: `${content}\n\nWeb search results:\n${ctx}\n\nUse the search results if relevant.`,
        }
      } catch {
        // continue without web search
      }
    }

    const isGroq = (process.env.LLM_PROVIDER || '').trim().toLowerCase().replace(/["']/g, '') === 'groq'
    const aiResponse = await callAI({
      messages: aiMessages,
      temperature: 0.7,
      maxTokens: isGroq ? 1200 : 3000,
    })

    await prisma.chatMessage.createMany({
      data: [
        { reminderId, role: 'user', content },
        { reminderId, role: 'assistant', content: aiResponse.content },
      ],
    })

    return NextResponse.json({ content: aiResponse.content })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Chat failed' }, { status: 500 })
  }
}