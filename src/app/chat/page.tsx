'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'

type R = { id: string; title: string; type: string; subject: string | null }

export default function ChatIndexPage() {
  const [reminders, setReminders] = useState<R[] | null>(null)

  useEffect(() => {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((d) => setReminders(Array.isArray(d) ? d : []))
      .catch(() => setReminders([]))
  }, [])

  return (
    <div className="p-6 md:p-8">
      <h2 className="font-heading text-3xl font-bold text-cafe-cream mb-1">Chat</h2>
      <p className="text-cafe-muted mb-6">Pick a reminder. Each one has its own chat and saved history.</p>
      {!reminders ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : reminders.length === 0 ? (
        <EmptyState title="No reminders yet" description="Create a reminder first, then chat about it." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.map((r) => (
            <Link
              key={r.id}
              href={`/schedule/reminders/${r.id}?chat=1`}
              className="rounded-xl border border-cafe-border bg-cafe-surface p-5 hover:border-cafe-mocha transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-semibold text-cafe-cream truncate">{r.title}</h3>
                  <p className="text-sm text-cafe-muted">{r.subject || 'No subject'}</p>
                </div>
                <Badge color="sage">{r.type}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}