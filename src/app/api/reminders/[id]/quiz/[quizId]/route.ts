import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  const { quizId } = await params
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    return NextResponse.json(quiz)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
