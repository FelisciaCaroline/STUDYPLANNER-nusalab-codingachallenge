import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { taskSchema } from '@/lib/validations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const tasks = await prisma.task.findMany({
      where: { reminderId: id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const parsed = taskSchema.parse(body)

    const count = await prisma.task.count({ where: { reminderId: id } })
    const task = await prisma.task.create({
      data: {
        reminderId: id,
        text: parsed.text,
        done: parsed.done ?? false,
        order: parsed.order ?? count,
      },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
