import React from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-cafe-muted mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <h3 className="font-heading text-lg font-semibold text-cafe-cream mb-1">
        {title}
      </h3>
      <p className="text-cafe-muted max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}
