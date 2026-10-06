import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { reminderSchema } from '@/lib/validations'

export async function GET() {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { dueAt: 'asc' },
      include: {
        tasks: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true, materials: true, quizzes: true } },
      },
    })
    return NextResponse.json(reminders)
  } catch (error) {
    console.error('GET /api/reminders error:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = reminderSchema.parse(body)

    const data = {
      title: parsed.title,
      type: parsed.type,
      subject: parsed.subject || null,
      dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
      notes: parsed.notes || null,
      completed: parsed.completed ?? false,
    }

    const reminder = await prisma.reminder.create({ data })
    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}
