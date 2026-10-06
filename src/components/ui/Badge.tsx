import React from 'react'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: 'default' | 'sage' | 'mocha' | 'danger'
}

export default function Badge({
  color = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const colors: Record<string, string> = {
    default: 'bg-cafe-border text-cafe-cream',
    sage: 'bg-cafe-sage text-cafe-cream',
    mocha: 'bg-cafe-mocha text-cafe-cream',
    danger: 'bg-cafe-danger text-cafe-cream',
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${colors[color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
