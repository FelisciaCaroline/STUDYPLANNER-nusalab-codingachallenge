'use client'

import React from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-150"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-cafe-border bg-cafe-surface p-6 shadow-xl">
        {title && (
          <h3 className="font-heading text-xl font-bold text-cafe-cream mb-4">
            {title}
          </h3>
        )}
        {children}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-cafe-muted hover:text-cafe-cream"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
