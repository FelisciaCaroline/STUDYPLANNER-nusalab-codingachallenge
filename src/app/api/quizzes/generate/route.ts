import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { quizGenerationSchema, type QuizGenerationInput } from '@/lib/validations'
import { generateQuizFromMaterial } from '@/lib/ai'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = quizGenerationSchema.parse(body) as QuizGenerationInput

    const materials = await prisma.material.findMany({
      where: { id: { in: parsed.materialIds } },
    })

    if (materials.length === 0) {
      return NextResponse.json({ error: 'No materials found' }, { status: 404 })
    }

    const excerpts = materials.map((m) => m.extractedText || '').filter(Boolean)
    if (excerpts.length === 0) {
      return NextResponse.json({ error: 'Selected materials have no extractable text.' }, { status: 400 })
    }

    const quiz = await prisma.quiz.create({
      data: {
        reminderId: parsed.reminderId,
        difficulty: parsed.difficulty,
        questions: {
          create: [],
        },
      },
      include: { questions: true },
    })

    try {
      const generated = await generateQuizFromMaterial(excerpts, parsed.questionCount, parsed.difficulty)

      if (generated.questions.length === 0) {
        await prisma.quiz.delete({ where: { id: quiz.id } })
        return NextResponse.json({ error: 'Could not generate any questions from this material. Try shorter material or fewer questions.' }, { status: 400 })
      }

      await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          questions: {
            create: generated.questions.map((q) => ({
              prompt: q.prompt,
              options: JSON.stringify(q.options),
              correctIndex: q.correctIndex,
              explanation: q.explanation,
            })),
          },
        },
      })

      const fullQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.id },
        include: { questions: true, attempts: true },
      })

      return NextResponse.json({ ...fullQuiz, message: generated.message }, { status: 201 })
    } catch (aiError) {
      await prisma.quiz.delete({ where: { id: quiz.id } })
      throw new Error(aiError instanceof Error ? aiError.message : 'AI generation failed')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 })
    }
    console.error('Quiz generation error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate quiz' }, { status: 500 })
  }
}
