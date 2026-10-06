import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-xl border border-cafe-border bg-cafe-espresso px-4 py-2 text-cafe-cream placeholder:text-cafe-muted focus:outline-none focus:ring-2 focus:ring-cafe-sage disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
