'use client'

import React from 'react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  options: { value: string; label: string }[]
}

export default function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-cafe-muted mb-1">
          {label}
        </label>
      )}
      <select
        className="w-full rounded-xl border border-cafe-border bg-cafe-espresso px-4 py-2 text-cafe-cream focus:outline-none focus:ring-2 focus:ring-cafe-sage disabled:opacity-50"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
