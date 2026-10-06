import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { attemptSubmitSchema } from '@/lib/validations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  try {
    const attempts = await prisma.attempt.findMany({
      where: { quizId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(attempts)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  try {
    const body = await request.json()
    const parsed = attemptSubmitSchema.parse(body)

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    let correct = 0
    const sortedQuestions = [...quiz.questions].sort((a, b) => a.id.localeCompare(b.id))

    for (let i = 0; i < sortedQuestions.length; i++) {
      const q = sortedQuestions[i]
      const userAnswer = parsed.answers[i]
      if (userAnswer === q.correctIndex) {
        correct++
      }
    }

    const score = Math.round((correct / sortedQuestions.length) * 100)

    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        answers: JSON.stringify(parsed.answers),
        score,
      },
    })

    return NextResponse.json({ ...attempt, correct, total: sortedQuestions.length }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to submit attempt' }, { status: 500 })
  }
}
