import React from 'react'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export default function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full rounded-xl border border-cafe-border bg-cafe-espresso px-4 py-2 text-cafe-cream placeholder:text-cafe-muted focus:outline-none focus:ring-2 focus:ring-cafe-sage disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
