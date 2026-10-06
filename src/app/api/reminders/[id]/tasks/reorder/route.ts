import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { taskIds } = body as { taskIds: string[] }

    if (!Array.isArray(taskIds)) {
      return NextResponse.json({ error: 'Invalid taskIds' }, { status: 400 })
    }

    await prisma.$transaction(
      taskIds.map((taskId, index) =>
        prisma.task.update({
          where: { id: taskId },
          data: { order: index, reminderId: id },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 })
  }
}
