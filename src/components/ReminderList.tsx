'use client'

import { useMemo } from 'react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'

export type ListReminder = {
  id: string
  title: string
  type: 'HOMEWORK' | 'PROJECT' | 'TEST'
  subject: string | null
  dueAt: string | null
  completed: boolean
  tasks: { done: boolean }[]
}

const typeStyle: Record<ListReminder['type'], string> = {
  HOMEWORK: 'bg-ev-homework/20 text-ev-homework',
  PROJECT: 'bg-ev-project/20 text-ev-project',
  TEST: 'bg-ev-test/20 text-ev-test',
}

export default function ReminderList({
  reminders,
  onSelect,
}: {
  reminders: ListReminder[]
  onSelect: (id: string) => void
}) {
  const sorted = useMemo(
    () =>
      [...reminders].sort((a, b) => {
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      }),
    [reminders]
  )
  const now = Date.now()

  return (
    <Card className="flex max-h-[calc(100vh-14rem)] min-h-[16rem] flex-col p-0">
      <div className="flex items-center justify-between border-b border-cafe-border px-5 py-4">
        <h3 className="font-heading text-lg font-bold text-cafe-cream">Reminders</h3>
        <span className="rounded-lg bg-cafe-sage/15 px-2.5 py-0.5 text-xs font-medium text-cafe-sage">
          {reminders.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {sorted.length === 0 && (
          <EmptyState title="No reminders yet" description="Add a reminder and it will show up here and on the calendar." />
        )}
        {sorted.map((r) => {
          const overdue = !!r.dueAt && new Date(r.dueAt).getTime() < now && !r.completed
          const done = r.tasks.filter((t) => t.done).length
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`block w-full rounded-xl border border-cafe-border bg-cafe-espresso/40 p-3 text-left transition-colors duration-150 hover:border-cafe-sage/60 hover:bg-cafe-surface-hi focus:outline-none focus:ring-2 focus:ring-cafe-sage ${
                r.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`font-heading font-semibold text-cafe-cream ${r.completed ? 'line-through' : ''}`}>
                  {r.title}
                </span>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${typeStyle[r.type]}`}>
                  {r.type.charAt(0) + r.type.slice(1).toLowerCase()}
                </span>
              </div>
              {r.subject && <p className="mt-0.5 text-sm text-cafe-muted">{r.subject}</p>}
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className={overdue ? 'text-cafe-danger' : 'text-cafe-muted'}>
                  {r.dueAt ? `${overdue ? 'Overdue · ' : 'Due '}${new Date(r.dueAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : 'No due date'}
                </span>
                {r.tasks.length > 0 && (
                  <span className="text-cafe-muted">{done}/{r.tasks.length} tasks</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}