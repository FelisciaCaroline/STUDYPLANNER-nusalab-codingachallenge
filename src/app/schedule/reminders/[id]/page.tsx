'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ChatPanel from '@/components/ChatPanel'

type Reminder = {
  id: string
  title: string
  type: 'HOMEWORK' | 'PROJECT' | 'TEST'
  subject: string | null
  dueAt: string | null
  notes: string | null
  completed: boolean
  tasks: { id: string; text: string; done: boolean; order: number }[]
  materials?: { id: string; filename: string; createdAt: string }[]
  quizzes?: {
    id: string
    difficulty: string
    createdAt: string
    questions: { id: string }[]
    attempts: { id: string; score: number; createdAt: string }[]
  }[]
}

export default function ReminderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'materials' | 'quizzes'>('tasks')

  // Task state
  const [newTaskText, setNewTaskText] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)

  // Material state
  const [materials, setMaterials] = useState<{ id: string; filename: string; createdAt: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null)
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false)
  const [materialError, setMaterialError] = useState<string | null>(null)

  // Quiz state
  const [quizzes, setQuizzes] = useState<{ id: string; difficulty: string; createdAt: string; questions: { id: string }[]; attempts: { id: string; score: number; createdAt: string }[] }[]>([])
  const [generating, setGenerating] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState('10')
  const [questionCountError, setQuestionCountError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)

  const fetchReminder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reminderRes, tasksRes, materialsRes, quizzesRes] = await Promise.all([
        fetch(`/api/reminders/${id}`),
        fetch(`/api/reminders/${id}/tasks`),
        fetch(`/api/reminders/${id}/materials`),
        fetch(`/api/quizzes?reminderId=${id}`),
      ])

      if (!reminderRes.ok) throw new Error('Failed to fetch reminder')
      const [reminderData, tasksData, materialsData, quizzesData] = await Promise.all([
        reminderRes.json(),
        tasksRes.json(),
        materialsRes.json(),
        quizzesRes.json().catch(() => []),
      ])

      setReminder({ ...reminderData, tasks: tasksData })
      setMaterials(materialsData)
      setQuizzes(quizzesData)
      if (materialsData.length > 0) {
        setSelectedMaterials([materialsData[0].id])
      }
    } catch {
      setError('Could not load reminder details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReminder()
  }, [fetchReminder])

  // Task handlers
  const addTask = async () => {
    if (!newTaskText.trim() || !reminder) return
    const res = await fetch(`/api/reminders/${reminder.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newTaskText }),
    })
    if (res.ok) {
      const task = await res.json()
      setReminder((prev) => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev)
      setNewTaskText('')
    }
  }

  const updateTask = async (taskId: string, data: { text?: string; done?: boolean }) => {
    if (!reminder) return
    const res = await fetch(`/api/reminders/${reminder.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setReminder((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === taskId ? updated : t) } : prev)
    }
  }

  const deleteTask = async () => {
    if (!deleteTaskId || !reminder) return
    setIsDeletingTask(true)
    try {
      const res = await fetch(`/api/reminders/${reminder.id}/tasks/${deleteTaskId}`, { method: 'DELETE' })
      if (res.ok) {
        setReminder((prev) => prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== deleteTaskId) } : prev)
      }
      setDeleteTaskId(null)
    } finally {
      setIsDeletingTask(false)
    }
  }

  const reorderTasks = async (fromIndex: number, toIndex: number) => {
    if (!reminder) return
    const newTasks = [...reminder.tasks]
    const [moved] = newTasks.splice(fromIndex, 1)
    newTasks.splice(toIndex, 0, moved)
    const taskIds = newTasks.map((t) => t.id)

    const res = await fetch(`/api/reminders/${reminder.id}/tasks/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds }),
    })
    if (res.ok) {
      const ordered = newTasks.map((t, i) => ({ ...t, order: i }))
      setReminder((prev) => prev ? { ...prev, tasks: ordered } : prev)
    }
  }

  const markReminderComplete = async () => {
    if (!reminder) return
    setIsMarkingComplete(true)
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (res.ok) {
        const updated = await res.json()
        setReminder((prev) => prev ? { ...prev, completed: updated.completed } : prev)
      }
    } finally {
      setIsMarkingComplete(false)
    }
  }

  // Material handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !reminder) return
    setUploading(true)
    setMaterialError(null)
    setUploadProgress(0)

    try {
      const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      // Initialize upload
      const initRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId: reminder.id,
          filename: file.name,
          mimeType: file.type,
          totalSize: file.size,
          chunkSize: CHUNK_SIZE,
        }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initialize upload')
      }
      const { uploadId } = initData

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        const chunkRes = await fetch(`/api/upload/chunk/${uploadId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-chunk-number': String(i),
          },
          body: chunk,
        })
        const chunkData = await chunkRes.json()
        if (!chunkRes.ok) {
          throw new Error(chunkData.error || `Chunk ${i} upload failed`)
        }
        setUploadProgress(chunkData.progress)
      }

      // Assemble and process
      const assembleRes = await fetch(`/api/upload/assemble/${uploadId}`, {
        method: 'POST',
      })
      const assembleData = await assembleRes.json()
      if (!assembleRes.ok) {
        throw new Error(assembleData.error || 'Upload processing failed')
      }

      setMaterials((prev) => [assembleData.material, ...prev])
      setSelectedMaterials([assembleData.material.id])
    } catch {
      setMaterialError('Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      e.target.value = ''
    }
  }

  const deleteMaterial = async () => {
    if (!deleteMaterialId || !reminder) return
    setIsDeletingMaterial(true)
    try {
      const res = await fetch(`/api/reminders/${reminder.id}/materials/${deleteMaterialId}`, { method: 'DELETE' })
      if (res.ok) {
        setMaterials((prev) => prev?.filter((m) => m.id !== deleteMaterialId) || [])
      }
      setDeleteMaterialId(null)
    } finally {
      setIsDeletingMaterial(false)
    }
  }

  // Quiz handlers
  const validateQuestionCount = (value: string): boolean => {
    const num = Number(value)
    if (!value || isNaN(num) || !Number.isInteger(num) || num < 1 || num > 50) {
      setQuestionCountError('Enter a whole number between 1 and 50')
      return false
    }
    setQuestionCountError(null)
    return true
  }

  const generateQuiz = async () => {
    if (!reminder || selectedMaterials.length === 0 || !validateQuestionCount(questionCount)) return
    setGenerating(true)
    setQuizError(null)
    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId: reminder.id,
          questionCount: Number(questionCount),
          difficulty,
          materialIds: selectedMaterials,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setQuizError(data.error || 'Failed to generate quiz')
        return
      }
      setQuizzes((prev) => [...prev, data])
      if (data.message) {
        setQuizError(data.message)
      }
    } catch {
      setQuizError('Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !reminder) {
    return (
      <div className="p-8">
        <p className="text-cafe-danger">{error || 'Reminder not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    )
  }

  const completedTasks = reminder.tasks.filter((t) => t.done).length
  const totalTasks = reminder.tasks.length
  const allDone = totalTasks > 0 && completedTasks === totalTasks
  const sortedTasks = [...reminder.tasks].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-cafe-muted hover:text-cafe-cream transition-colors duration-150"
      >
        &larr; Back to Schedule
      </button>

      <div className="rounded-xl border border-cafe-border bg-cafe-surface p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-cafe-cream">{reminder.title}</h2>
            <p className="text-cafe-muted">{reminder.subject || 'No subject'}</p>
          </div>
          <Badge color={reminder.type === 'HOMEWORK' ? 'sage' : reminder.type === 'PROJECT' ? 'mocha' : 'danger'}>
            {reminder.type}
          </Badge>
        </div>
        {reminder.dueAt && (
          <p className="text-sm text-cafe-muted mb-2">Due: {new Date(reminder.dueAt).toLocaleString()}</p>
        )}
        {reminder.notes && (
          <p className="text-sm text-cafe-cream/80 mb-4">{reminder.notes}</p>
        )}
        {totalTasks > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-cafe-muted mb-1">
              <span>Progress</span>
              <span>{completedTasks}/{totalTasks}</span>
            </div>
            <div className="h-2 rounded-full bg-cafe-border">
              <div
                className="h-2 rounded-full bg-cafe-sage transition-all duration-150"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
        )}
        {allDone && !reminder.completed && (
          <Button onClick={markReminderComplete} disabled={isMarkingComplete} className="mt-2">
            Mark Reminder Complete
          </Button>
        )}
        <Button onClick={() => setChatOpen(true)} className="mt-3">Chat</Button>
      </div>

      <div className="rounded-xl border border-cafe-border bg-cafe-surface overflow-hidden">
        <div className="flex border-b border-cafe-border">
          {(['tasks', 'materials', 'quizzes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab
                  ? 'border-b-2 border-cafe-sage text-cafe-cream'
                  : 'text-cafe-muted hover:text-cafe-cream'
              } ${tab === 'quizzes' && reminder.type !== 'TEST' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={tab === 'quizzes' && reminder.type !== 'TEST'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'quizzes' && reminder.type !== 'TEST' && ' (TEST only)'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'tasks' && (
            <div>
              <div className="flex gap-2 mb-6">
                <Input
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add a new task..."
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <Button onClick={addTask}>Add</Button>
              </div>

              {sortedTasks.length === 0 ? (
                <EmptyState
                  title="No tasks yet"
                  description="Add tasks to break down this reminder into actionable steps."
                />
              ) : (
                <ul className="space-y-2">
                  {sortedTasks.map((task, index) => (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-cafe-border bg-cafe-espresso/50 p-3"
                    >
                      <button
                        onClick={() => updateTask(task.id, { done: !task.done })}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${
                          task.done
                            ? 'bg-cafe-sage border-cafe-sage'
                            : 'border-cafe-border hover:border-cafe-mocha'
                        }`}
                        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {task.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cafe-cream">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </button>

                      {editingTaskId === task.id ? (
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => {
                            if (editText.trim()) {
                              updateTask(task.id, { text: editText.trim() })
                            }
                            setEditingTaskId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editText.trim()) {
                              updateTask(task.id, { text: editText.trim() })
                              setEditingTaskId(null)
                            }
                            if (e.key === 'Escape') setEditingTaskId(null)
                          }}
                          autoFocus
                          className="flex-1"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingTaskId(task.id)
                            setEditText(task.text)
                          }}
                          className={`flex-1 cursor-pointer text-sm transition-colors duration-150 ${
                            task.done ? 'text-cafe-muted line-through' : 'text-cafe-cream'
                          }`}
                        >
                          {task.text}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => reorderTasks(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          className="rounded-lg p-1 text-cafe-muted hover:text-cafe-cream disabled:opacity-30 transition-colors duration-150"
                          aria-label="Move up"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => reorderTasks(index, Math.min(sortedTasks.length - 1, index + 1))}
                          disabled={index === sortedTasks.length - 1}
                          className="rounded-lg p-1 text-cafe-muted hover:text-cafe-cream disabled:opacity-30 transition-colors duration-150"
                          aria-label="Move down"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTaskId(task.id)}
                          className="rounded-lg p-1 text-cafe-danger hover:bg-cafe-danger/10 transition-colors duration-150"
                          aria-label="Delete task"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'materials' && reminder.type === 'TEST' && (
            <div>
              <div className="mb-6">
                <label className="block w-full cursor-pointer rounded-xl border border-dashed border-cafe-border bg-cafe-espresso/30 p-6 text-center transition-colors duration-150 hover:border-cafe-mocha">
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-cafe-muted mb-1">Upload PDF, DOCX, TXT, or MD (up to several GB with chunked upload)</p>
                  {uploading && (
                    <div className="mt-2">
                      <Spinner className="mx-auto" />
                      <div className="mt-2 h-2 rounded-full bg-cafe-border">
                        <div
                          className="h-2 rounded-full bg-cafe-sage transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-cafe-muted mt-1">{uploadProgress}%</p>
                    </div>
                  )}
                </label>
                {materialError && (
                  <p className="text-cafe-danger text-sm mt-2">{materialError}</p>
                )}
              </div>

              {(!materials || materials.length === 0) ? (
                <EmptyState title="No materials yet" description="Upload study materials to generate quizzes." />
              ) : (
                <ul className="space-y-2">
                  {materials.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-xl border border-cafe-border bg-cafe-espresso/50 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cafe-cream truncate">{m.filename}</p>
                        <p className="text-xs text-cafe-muted">{new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setDeleteMaterialId(m.id)}
                        className="rounded-lg p-1 text-cafe-danger hover:bg-cafe-danger/10 transition-colors duration-150"
                        aria-label="Delete material"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'quizzes' && reminder.type === 'TEST' && (
            <div>
              {materials && materials.length > 0 && (
                <div className="mb-6 rounded-xl border border-cafe-border bg-cafe-espresso/30 p-4">
                  <h4 className="font-heading text-lg font-semibold text-cafe-cream mb-3">Generate New Quiz</h4>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-cafe-muted mb-1">Questions</label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={questionCount}
                        onChange={(e) => {
                          setQuestionCount(e.target.value)
                          if (questionCountError) validateQuestionCount(e.target.value)
                        }}
                        onBlur={() => validateQuestionCount(questionCount)}
                        className="w-20"
                      />
                      {questionCountError && (
                        <p className="text-cafe-danger text-xs mt-1">{questionCountError}</p>
                      )}
                    </div>
                    <Select
                      label="Difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                      options={[
                        { value: 'Easy', label: 'Easy' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'Hard', label: 'Hard' },
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[5, 10, 20, 30, 50].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => { setQuestionCount(String(preset)); setQuestionCountError(null) }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                          questionCount === String(preset)
                            ? 'bg-cafe-mocha text-cafe-cream'
                            : 'bg-cafe-surface text-cafe-muted border border-cafe-border hover:text-cafe-cream'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-cafe-muted mb-2">Materials</label>
                    <div className="flex flex-wrap gap-2">
                      {materials.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 rounded-lg border border-cafe-border bg-cafe-surface px-3 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterials((prev) => [...prev, m.id])
                              } else {
                                setSelectedMaterials((prev) => prev.filter((id) => id !== m.id))
                              }
                            }}
                            className="rounded border-cafe-border text-cafe-sage focus:ring-cafe-sage"
                          />
                          <span className="text-sm text-cafe-cream">{m.filename}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {quizError && <p className="text-cafe-danger text-sm mb-3">{quizError}</p>}
                  <Button onClick={generateQuiz} disabled={generating || selectedMaterials.length === 0 || !!questionCountError}>
                    {generating ? 'Generating... this can take up to a minute for large quizzes' : 'Generate Quiz'}
                  </Button>
                </div>
              )}

              {(!quizzes || quizzes.length === 0) ? (
                <EmptyState title="No quizzes yet" description="Generate a quiz from your uploaded materials." />
              ) : (
                <ul className="space-y-3">
                  {quizzes.map((q) => (
                    <li key={q.id} className="rounded-xl border border-cafe-border bg-cafe-espresso/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-heading font-semibold text-cafe-cream">{q.difficulty}</span>
                          <span className="text-cafe-muted text-sm ml-2">{q.questions.length} questions</span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/schedule/reminders/${reminder.id}/quiz/${q.id}`}>
                            <Button size="sm" variant="secondary">Take Quiz</Button>
                          </Link>
                        </div>
                      </div>
                      {q.attempts && q.attempts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-cafe-muted mb-1">Recent scores</p>
                          <div className="flex flex-wrap gap-2">
                            {q.attempts.slice(0, 5).map((a) => (
                              <span key={a.id} className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${
                                a.score >= 70 ? 'bg-cafe-sage/20 text-cafe-sage' : 'bg-cafe-danger/20 text-cafe-danger'
                              }`}>
                                {a.score}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'materials' && reminder.type !== 'TEST' && (
            <EmptyState title="Materials are for tests only" description="Switch the reminder type to TEST to upload materials and generate quizzes." />
          )}
          {activeTab === 'quizzes' && reminder.type !== 'TEST' && (
            <EmptyState title="Quizzes are for tests only" description="Switch the reminder type to TEST to generate quizzes from materials." />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={deleteTask}
        title="Delete Task"
        description="Are you sure you want to delete this task?"
        isLoading={isDeletingTask}
      />

      <ConfirmDialog
        open={!!deleteMaterialId}
        onClose={() => setDeleteMaterialId(null)}
        onConfirm={deleteMaterial}
        title="Delete Material"
        description="Are you sure you want to delete this material?"
        isLoading={isDeletingMaterial}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} reminderTitle={reminder.title} />
    </div>
  )
}
