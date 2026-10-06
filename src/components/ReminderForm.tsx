'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { reminderSchema, type ReminderInput } from '@/lib/validations'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'

function toLocalDatetimeInput(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoString(localDatetime: string): string {
  if (!localDatetime) return ''
  return new Date(localDatetime).toISOString()
}

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: ReminderInput) => Promise<void>
  initial?: Partial<ReminderInput>
  isLoading?: boolean
}

export default function ReminderForm({ open, onClose, onSubmit, initial, isLoading }: Props) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderInput['type']>('HOMEWORK')
  const [subject, setSubject] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const defaults = initial || {}
      setTitle(defaults.title || '')
      setType(defaults.type || 'HOMEWORK')
      setSubject(defaults.subject || '')
      setDueAt(toLocalDatetimeInput(defaults.dueAt))
      setNotes(defaults.notes || '')
      setErrors({})
    }
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = reminderSchema.safeParse({
      title,
      type,
      subject: subject || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      notes: notes || undefined,
      completed: initial?.completed || false,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    await onSubmit(result.data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Reminder' : 'New Reminder'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          {errors.title && <p className="text-cafe-danger text-xs mt-1">{errors.title}</p>}
        </div>
        <div>
          <Select value={type} onChange={(e) => setType(e.target.value as ReminderInput['type'])} label="Type" options={[
            { value: 'HOMEWORK', label: 'Homework' },
            { value: 'PROJECT', label: 'Project' },
            { value: 'TEST', label: 'Test' },
          ]} />
          {errors.type && <p className="text-cafe-danger text-xs mt-1">{errors.type}</p>}
        </div>
        <div>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" />
          {errors.subject && <p className="text-cafe-danger text-xs mt-1">{errors.subject}</p>}
        </div>
        <div>
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          {errors.dueAt && <p className="text-cafe-danger text-xs mt-1">{errors.dueAt}</p>}
        </div>
        <div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3} />
          {errors.notes && <p className="text-cafe-danger text-xs mt-1">{errors.notes}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
