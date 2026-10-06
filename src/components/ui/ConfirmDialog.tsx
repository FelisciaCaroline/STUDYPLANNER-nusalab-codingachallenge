'use client'

import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-150"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-cafe-border bg-cafe-surface p-6 shadow-xl">
        <h3 className="font-heading text-xl font-bold text-cafe-cream mb-2">{title}</h3>
        <p className="text-cafe-muted mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Deleting...' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
