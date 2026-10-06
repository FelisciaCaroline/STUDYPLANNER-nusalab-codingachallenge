'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

type Reminder = {
  id: string
  title: string
  type: 'HOMEWORK' | 'PROJECT' | 'TEST'
  subject: string | null
  dueAt: string | null
  completed: boolean
  tasks: { done: boolean }[]
}

type ViewMode = 'month' | 'day'

type CalendarViewProps = {
  reminders: Reminder[]
  viewMode?: ViewMode // tampilan awal
  onSelect: (id: string) => void
  onCreate?: (date: Date) => void
}

type LayoutEvent = { reminder: Reminder; start: Date; end: Date; column: number; totalColumns: number }

const HOUR = 64 // px per jam
const DEFAULT_MINUTES = 45

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

function monthCells(date: Date): (Date | null)[] {
  const y = date.getFullYear()
  const m = date.getMonth()
  const cells: (Date | null)[] = Array(new Date(y, m, 1).getDay()).fill(null)
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) cells.push(new Date(y, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const typeStyle: Record<Reminder['type'], { block: string; dot: string }> = {
  HOMEWORK: { block: 'border-ev-homework bg-ev-homework/20', dot: 'bg-ev-homework' },
  PROJECT: { block: 'border-ev-project bg-ev-project/20', dot: 'bg-ev-project' },
  TEST: { block: 'border-ev-test bg-ev-test/20', dot: 'bg-ev-test' },
}
const doneStyle = { block: 'border-ev-done bg-ev-done/15', dot: 'bg-ev-done' }
const styleOf = (r: Reminder) => (r.completed ? doneStyle : typeStyle[r.type])

// Kelompokkan event yang saling tumpang tindih; tiap kelompok berbagi lebar kolom yang sama
// seperti Google Calendar.
function layoutEvents(items: { reminder: Reminder; start: Date; end: Date }[]): LayoutEvent[] {
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime()
  )
  const out: LayoutEvent[] = []
  let cluster: LayoutEvent[] = []
  let colEnds: number[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    cluster.forEach((e) => (e.totalColumns = colEnds.length))
    out.push(...cluster)
    cluster = []
    colEnds = []
    clusterEnd = -Infinity
  }

  for (const ev of sorted) {
    const s = ev.start.getTime()
    if (cluster.length && s >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => s >= end)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(ev.end.getTime())
    } else {
      colEnds[col] = ev.end.getTime()
    }
    cluster.push({ ...ev, column: col, totalColumns: 1 })
    clusterEnd = Math.max(clusterEnd, ev.end.getTime())
  }
  flush()
  return out
}

function dayEvents(reminders: Reminder[], day: Date): LayoutEvent[] {
  return layoutEvents(
    reminders
      .filter((r) => r.dueAt && sameDay(new Date(r.dueAt), day))
      .map((r) => {
        const start = new Date(r.dueAt!)
        return { reminder: r, start, end: new Date(start.getTime() + DEFAULT_MINUTES * 60000) }
      })
  )
}

export default function CalendarView({ reminders, viewMode = 'day', onSelect, onCreate }: CalendarViewProps) {
  const [mode, setMode] = useState<ViewMode>(viewMode)
  const [current, setCurrent] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const move = (dir: number) =>
    setCurrent((p) => (mode === 'day' ? addDays(p, dir) : new Date(p.getFullYear(), p.getMonth() + dir, 1)))

  const title =
    mode === 'day'
      ? current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const navBtn =
    'rounded-lg px-3 py-1.5 text-sm text-cafe-muted transition-colors duration-150 hover:bg-cafe-surface-hi hover:text-cafe-cream focus:outline-none focus:ring-2 focus:ring-cafe-sage'

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cafe-border p-3">
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className={navBtn} aria-label="Previous">&lt;</button>
          <button onClick={() => setCurrent(new Date())} className={navBtn}>Today</button>
          <button onClick={() => move(1)} className={navBtn} aria-label="Next">&gt;</button>
          <h3 className="ml-2 font-heading text-lg font-bold text-cafe-cream">{title}</h3>
        </div>
        <div className="flex rounded-xl border border-cafe-border bg-cafe-espresso/50 p-0.5">
          {(['day', 'month'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-[10px] px-3 py-1 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cafe-sage ${
                mode === m ? 'btn-accent text-white' : 'text-cafe-muted hover:text-cafe-cream'
              }`}
            >
              {m === 'day' ? 'Day' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'month' ? (
        <MonthView
          reminders={reminders}
          current={current}
          now={now}
          onSelect={onSelect}
          onPickDay={(d) => {
            setCurrent(d)
            setMode('day')
          }}
        />
      ) : (
        <DayView reminders={reminders} day={current} now={now} onSelect={onSelect} onCreate={onCreate} />
      )}
    </div>
  )
}

function MonthView({
  reminders, current, now, onSelect, onPickDay,
}: {
  reminders: Reminder[]
  current: Date
  now: Date
  onSelect: (id: string) => void
  onPickDay: (d: Date) => void
}) {
  const cells = useMemo(() => monthCells(current), [current])

  return (
    <div className="grid grid-cols-7">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="border-b border-cafe-border p-2 text-center text-xs text-cafe-muted">{d}</div>
      ))}
      {cells.map((day, i) => {
        if (!day) return <div key={`e${i}`} className="min-h-[88px] border-b border-r border-cafe-border/60 bg-cafe-espresso/20" />
        const today = sameDay(day, now)
        const items = reminders
          .filter((r) => r.dueAt && sameDay(new Date(r.dueAt), day))
          .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
        return (
          <div
            key={day.toDateString()}
            onClick={() => onPickDay(day)}
            className={`min-h-[88px] cursor-pointer border-b border-r border-cafe-border/60 p-1.5 transition-colors duration-150 hover:bg-cafe-surface-hi ${
              today ? 'bg-cafe-sage/10' : ''
            }`}
          >
            <div
              className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                today ? 'btn-accent text-white' : 'text-cafe-muted'
              }`}
            >
              {day.getDate()}
            </div>
            {/* layar kecil: titik; layar lebar: chip judul */}
            <div className="flex flex-wrap gap-1 sm:hidden">
              {items.slice(0, 4).map((r) => (
                <span key={r.id} className={`h-1.5 w-1.5 rounded-full ${styleOf(r).dot}`} />
              ))}
            </div>
            <div className="hidden space-y-0.5 sm:block">
              {items.slice(0, 2).map((r) => {
                const overdue = new Date(r.dueAt!) < now && !r.completed
                return (
                  <button
                    key={r.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(r.id) }}
                    className={`block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] text-cafe-cream focus:outline-none focus:ring-2 focus:ring-cafe-sage ${styleOf(r).block} ${
                      r.completed ? 'line-through opacity-70' : ''
                    } ${overdue ? 'ring-1 ring-cafe-danger/60' : ''}`}
                  >
                    {r.title}
                  </button>
                )
              })}
              {items.length > 2 && <div className="pl-1 text-[11px] text-cafe-muted">+{items.length - 2} more</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({
  reminders, day, now, onSelect, onCreate,
}: {
  reminders: Reminder[]
  day: Date
  now: Date
  onSelect: (id: string) => void
  onCreate?: (date: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const events = useMemo(() => dayEvents(reminders, day), [reminders, day])
  const isToday = sameDay(day, now)

  // Scroll ke reminder pertama hari itu, atau ke jam sekarang / jam 7 pagi
  useEffect(() => {
    if (!scrollRef.current) return
    const focusHour = events.length
      ? Math.min(...events.map((e) => e.start.getHours() + e.start.getMinutes() / 60))
      : isToday ? now.getHours() : 7
    scrollRef.current.scrollTop = Math.max(0, (focusHour - 1) * HOUR)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const slotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCreate) return
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = Math.floor(((e.clientY - rect.top) / HOUR) * 2) * 30
    const d = startOfDay(day)
    d.setMinutes(minutes)
    onCreate(d)
  }

  return (
    <div ref={scrollRef} className="relative overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
      <div className="flex" style={{ height: 24 * HOUR }}>
        <div className="relative w-14 shrink-0">
          {Array.from({ length: 24 }, (_, h) =>
            h === 0 ? null : (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-cafe-muted"
                style={{ top: h * HOUR }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            )
          )}
        </div>

        <div
          className={`relative flex-1 border-l border-cafe-border ${isToday ? 'bg-cafe-sage/5' : ''}`}
          onClick={slotClick}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="border-b border-cafe-border/50" style={{ height: HOUR }} />
          ))}

          {events.map((ev) => {
            const top = ((ev.start.getHours() * 60 + ev.start.getMinutes()) / 60) * HOUR
            const height = (DEFAULT_MINUTES / 60) * HOUR
            const w = 100 / ev.totalColumns
            const r = ev.reminder
            return (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); onSelect(r.id) }}
                className={`absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left shadow-sm transition-[filter] duration-150 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-cafe-sage ${styleOf(r).block} ${
                  r.completed ? 'opacity-70' : ''
                }`}
                style={{
                  top,
                  height: height - 2,
                  left: `calc(${ev.column * w}% + 2px)`,
                  width: `calc(${w}% - 4px)`,
                }}
              >
                <div className={`truncate text-xs font-semibold text-cafe-cream ${r.completed ? 'line-through' : ''}`}>
                  {r.title}
                </div>
                <div className="truncate text-[10px] text-cafe-muted">
                  {ev.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {r.subject ? ` · ${r.subject}` : ''}
                </div>
              </button>
            )
          })}

          {isToday && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 h-0.5 bg-cafe-sage"
              style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }}
            >
              <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-cafe-sage shadow-[0_0_10px_rgb(var(--cafe-sage))]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}