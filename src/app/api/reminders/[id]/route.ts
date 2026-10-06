import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { reminderSchema } from '@/lib/validations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { order: 'asc' } },
        materials: true,
        quizzes: {
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
      },
    })
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }
    return NextResponse.json(reminder)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reminder' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = reminderSchema.partial().parse(body)

    const data: Record<string, unknown> = {}
    if (parsed.title !== undefined) data.title = parsed.title
    if (parsed.type !== undefined) data.type = parsed.type
    if (parsed.subject !== undefined) data.subject = parsed.subject || null
    if (parsed.dueAt !== undefined) data.dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null
    if (parsed.notes !== undefined) data.notes = parsed.notes || null
    if (parsed.completed !== undefined) data.completed = parsed.completed

    const reminder = await prisma.reminder.update({
      where: { id },
      data,
    })
    return NextResponse.json(reminder)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.reminder.delete({ where: { id } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
  }
}
