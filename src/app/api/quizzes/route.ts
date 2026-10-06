import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reminderId = searchParams.get('reminderId')

  try {
    const where = reminderId ? { reminderId } : {}
    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        questions: true,
        attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(quizzes)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}
