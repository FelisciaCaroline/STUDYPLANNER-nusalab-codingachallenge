'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import Button from '@/components/ui/Button'

// Chat dihapus dari navigasi: chat hanya dibuka dari halaman masing-masing reminder.
const navItems = [{ href: '/schedule', label: 'Schedule' }]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden md:p-3 md:gap-3">
      <aside
        className={`glass fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-150 md:relative md:h-full md:translate-x-0 md:rounded-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6">
          <h1 className="font-heading text-2xl font-bold text-cafe-cream">Study Planner</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-cafe-muted hover:text-cafe-cream"
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>
        <nav className="px-4 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'btn-accent text-white'
                    : 'text-cafe-muted hover:text-cafe-cream hover:bg-cafe-surface-hi'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cafe-border">
          <Button variant="secondary" onClick={toggle} className="w-full">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass flex items-center gap-4 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-cafe-muted hover:text-cafe-cream"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading text-xl font-bold text-cafe-cream">Study Planner</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}