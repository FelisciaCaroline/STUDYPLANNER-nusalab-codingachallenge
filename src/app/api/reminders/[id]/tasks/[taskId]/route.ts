import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { taskSchema } from '@/lib/validations'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  try {
    const body = await request.json()
    const parsed = taskSchema.partial().parse(body)

    const data: Record<string, unknown> = {}
    if (parsed.text !== undefined) data.text = parsed.text
    if (parsed.done !== undefined) data.done = parsed.done
    if (parsed.order !== undefined) data.order = parsed.order

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    })
    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  try {
    await prisma.task.delete({ where: { id: taskId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
