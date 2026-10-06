'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

type Question = {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

type Quiz = {
  id: string
  difficulty: string
  questions: Question[]
  attempts: { id: string; score: number; createdAt: string }[]
}

type AnswerMap = Record<number, number>

type View = 'quiz' | 'review' | 'result'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const reminderId = params.id as string
  const quizId = params.quizId as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [view, setView] = useState<View>('quiz')
  const [result, setResult] = useState<{ score: number; correct: number; total: number; attemptId: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reminders/${reminderId}/quiz/${quizId}`)
      // Fallback to quiz list if direct fetch not available
      if (!res.ok) {
        const listRes = await fetch(`/api/quizzes?reminderId=${reminderId}`)
        if (!listRes.ok) throw new Error('Failed to fetch quiz')
        const list = await listRes.json()
        const found = list.find((q: Quiz) => q.id === quizId)
        if (!found) throw new Error('Quiz not found')
        setQuiz(found)
      } else {
        setQuiz(await res.json())
      }
    } catch {
      setError('Could not load quiz.')
    } finally {
      setLoading(false)
    }
  }, [reminderId, quizId])

  useEffect(() => {
    fetchQuiz()
  }, [fetchQuiz])

  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const goNext = () => {
    if (quiz && currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleReview = () => {
    setView('review')
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setResult(data)
      setView('result')
    } catch {
      setError('Failed to submit quiz.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="p-8">
        <p className="text-cafe-danger">{error || 'Quiz not found'}</p>
        <Link href={`/schedule/reminders/${reminderId}`}>
          <Button className="mt-4">Go Back</Button>
        </Link>
      </div>
    )
  }

  const sortedQuestions = [...quiz.questions].sort((a, b) => a.id.localeCompare(b.id))
  const currentQuestion = sortedQuestions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === sortedQuestions.length

  if (view === 'result' && result) {
    return (
      <div className="p-6 md:p-8 max-w-2xl">
        <Link href={`/schedule/reminders/${reminderId}`} className="mb-6 inline-block text-sm text-cafe-muted hover:text-cafe-cream">
          &larr; Back to Reminder
        </Link>
        <div className="rounded-xl border border-cafe-border bg-cafe-surface p-6">
          <h2 className="font-heading text-2xl font-bold text-cafe-cream mb-2">Quiz Results</h2>
          <div className={`text-4xl font-bold mb-6 ${result.score >= 70 ? 'text-cafe-sage' : 'text-cafe-danger'}`}>
            {result.score}%
          </div>
          <p className="text-cafe-muted mb-6">You got {result.correct} out of {result.total} questions correct.</p>

          {sortedQuestions.length > 10 && (
            <div className="mb-4 max-h-24 overflow-y-auto rounded-xl border border-cafe-border bg-cafe-espresso/30 p-2">
              <div className="grid grid-cols-10 gap-1">
                {sortedQuestions.map((q, idx) => {
                  const userAnswer = answers[idx]
                  const isCorrect = userAnswer === q.correctIndex
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx)
                        setView('quiz')
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                        isCorrect
                          ? 'bg-cafe-sage/20 text-cafe-sage'
                          : 'bg-cafe-danger/20 text-cafe-danger'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {sortedQuestions.map((q, idx) => {
              const userAnswer = answers[idx]
              const isCorrect = userAnswer === q.correctIndex
              return (
                <div key={q.id} className="rounded-xl border border-cafe-border bg-cafe-espresso/50 p-4">
                  <p className="text-cafe-cream font-medium mb-2">{idx + 1}. {q.prompt}</p>
                  <div className="space-y-1 mb-2">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`text-sm p-2 rounded-lg ${
                          optIdx === q.correctIndex
                            ? 'bg-cafe-sage/20 text-cafe-sage'
                            : optIdx === userAnswer && !isCorrect
                            ? 'bg-cafe-danger/20 text-cafe-danger'
                            : 'text-cafe-muted'
                        }`}
                      >
                        {opt}
                        {optIdx === q.correctIndex && ' ✓'}
                        {optIdx === userAnswer && optIdx !== q.correctIndex && ' ✗'}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-cafe-muted">{q.explanation}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <Link href={`/schedule/reminders/${reminderId}`}>
              <Button variant="secondary">Back to Reminder</Button>
            </Link>
            <Link href={`/schedule/reminders/${reminderId}/quiz/${quizId}`}>
              <Button>Retake Quiz</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'review') {
    return (
      <div className="p-6 md:p-8 max-w-2xl">
        <h2 className="font-heading text-2xl font-bold text-cafe-cream mb-4">Review Answers</h2>

        {sortedQuestions.length > 10 && (
          <div className="mb-4 max-h-24 overflow-y-auto rounded-xl border border-cafe-border bg-cafe-espresso/30 p-2">
            <div className="grid grid-cols-10 gap-1">
              {sortedQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                    currentIndex === idx
                      ? 'bg-cafe-sage text-cafe-cream'
                      : 'bg-cafe-surface text-cafe-muted hover:text-cafe-cream'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {sortedQuestions.map((q, idx) => {
            const userAnswer = answers[idx]
            const isCorrect = userAnswer === q.correctIndex
            return (
              <div key={q.id} className="rounded-xl border border-cafe-border bg-cafe-espresso/50 p-4">
                <p className="text-cafe-cream font-medium mb-2">{idx + 1}. {q.prompt}</p>
                <div className="space-y-1 mb-2">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`text-sm p-2 rounded-lg ${
                        optIdx === q.correctIndex
                          ? 'bg-cafe-sage/20 text-cafe-sage'
                          : optIdx === userAnswer && !isCorrect
                          ? 'bg-cafe-danger/20 text-cafe-danger'
                          : 'text-cafe-muted'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-cafe-muted">{q.explanation}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={() => setView('quiz')}>Back to Quiz</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/schedule/reminders/${reminderId}`} className="text-sm text-cafe-muted hover:text-cafe-cream">
          &larr; Back
        </Link>
        <div className="flex items-center gap-3">
          <Badge color={quiz.difficulty === 'Easy' ? 'sage' : quiz.difficulty === 'Medium' ? 'mocha' : 'danger'}>{quiz.difficulty}</Badge>
          <span className="text-sm text-cafe-muted">{currentIndex + 1} / {sortedQuestions.length}</span>
        </div>
      </div>

      {/* Question jump grid */}
      {sortedQuestions.length > 10 && (
        <div className="mb-4 max-h-24 overflow-y-auto rounded-xl border border-cafe-border bg-cafe-espresso/30 p-2">
          <div className="grid grid-cols-10 gap-1">
            {sortedQuestions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                  currentIndex === idx
                    ? 'bg-cafe-sage text-cafe-cream'
                    : answers[idx] !== undefined
                    ? 'bg-cafe-sage/20 text-cafe-sage'
                    : 'bg-cafe-surface text-cafe-muted hover:text-cafe-cream'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 h-1.5 rounded-full bg-cafe-border">
        <div
          className="h-1.5 rounded-full bg-cafe-sage transition-all duration-150"
          style={{ width: `${((currentIndex + 1) / sortedQuestions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-cafe-border bg-cafe-surface p-6">
        <h3 className="font-heading text-xl font-bold text-cafe-cream mb-6">{currentQuestion.prompt}</h3>
        <div className="space-y-3">
          {currentQuestion.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => selectAnswer(idx)}
              className={`w-full text-left rounded-xl border p-4 transition-colors duration-150 ${
                answers[currentIndex] === idx
                  ? 'border-cafe-sage bg-cafe-sage/10'
                  : 'border-cafe-border hover:border-cafe-mocha'
              }`}
            >
              <span className="text-cafe-cream">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={goBack} disabled={currentIndex === 0}>
          Back
        </Button>
        {currentIndex < sortedQuestions.length - 1 ? (
          <Button onClick={goNext} disabled={answers[currentIndex] === undefined}>
            Next
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleReview} disabled={!allAnswered}>
              Review ({answeredCount}/{sortedQuestions.length})
            </Button>
            <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
