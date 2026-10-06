'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import ReminderList from '@/components/ReminderList'
import CalendarView from '@/components/CalendarView'

type ReminderItem = {
  id: string
  title: string
  type: 'HOMEWORK' | 'PROJECT' | 'TEST'
  subject: string | null
  dueAt: string | null
  completed: boolean
  tasks: { id: string; done: boolean }[]
  _count?: { tasks: number; materials: number; quizzes: number }
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SchedulePage() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'HOMEWORK' | 'PROJECT' | 'TEST'>('HOMEWORK')
  const [subject, setSubject] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reminders')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReminders(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('GET /api/reminders error:', err)
      setError('Could not load reminders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const createReminder = async () => {
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          subject: subject.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to create reminder')
        return
      }
      setReminders((prev) => [...prev, { ...data, tasks: [] }])
      setTitle('')
      setSubject('')
      setDueAt('')
    } catch {
      setFormError('Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  const openReminder = (id: string) => router.push(`/schedule/reminders/${id}`)

  // Klik slot kosong di kalender -> isi kolom Due di form
  const prefillDue = (date: Date) => setDueAt(toLocalInput(date))

  return (
    <div className="p-4 md:p-6">
      <h1 className="font-heading text-3xl font-bold text-cafe-cream mb-6">Schedule</h1>

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-heading text-lg font-semibold text-cafe-cream mb-3">New Reminder</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-cafe-muted mb-1">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Math homework" />
              </div>
              <div>
                <label className="block text-sm font-medium text-cafe-muted mb-1">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'HOMEWORK' | 'PROJECT' | 'TEST')}
                  options={[
                    { value: 'HOMEWORK', label: 'Homework' },
                    { value: 'PROJECT', label: 'Project' },
                    { value: 'TEST', label: 'Test' },
                  ]}
                />
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-medium text-cafe-muted mb-1">Due</label>
                  <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
              </div>
              {formError && <p className="text-cafe-danger text-sm">{formError}</p>}
              <Button onClick={createReminder} disabled={saving}>
                {saving ? 'Saving...' : 'Add Reminder'}
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : error ? (
            <p className="text-cafe-danger">{error}</p>
          ) : (
            <ReminderList reminders={reminders} onSelect={openReminder} />
          )}
        </div>

        <div className="min-w-0">
          <CalendarView reminders={reminders} onSelect={openReminder} onCreate={prefillDue} />
        </div>
      </div>
    </div>
  )
}