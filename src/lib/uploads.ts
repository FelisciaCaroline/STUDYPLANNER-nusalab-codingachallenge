import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

export type UploadStatus = 'queued' | 'ready' | 'processing' | 'done' | 'failed'

export type UploadJob = {
  uploadId: string
  reminderId: string
  filename: string
  mimeType: string
  totalSize: number
  chunkSize: number
  receivedSize: number
  status: UploadStatus
  progress: number
  createdAt: number
  error?: string
  tempPath?: string
  finalPath?: string
  materialId?: string
}

// Keep jobs on globalThis so Next.js hot reload doesn't wipe them in dev.
const g = globalThis as unknown as { __uploadJobs?: Map<string, UploadJob> }
const jobs = g.__uploadJobs ?? (g.__uploadJobs = new Map<string, UploadJob>())

export const UPLOAD_ROOT = path.join(os.tmpdir(), 'study-planner-uploads')

export function generateUploadId(): string {
  return crypto.randomUUID()
}

export async function createJobDir(uploadId: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, uploadId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function setJob(job: UploadJob): void {
  jobs.set(job.uploadId, job)
}

export function getJob(uploadId: string): UploadJob | undefined {
  return jobs.get(uploadId)
}

export function updateJob(uploadId: string, patch: Partial<UploadJob>): UploadJob | undefined {
  const job = jobs.get(uploadId)
  if (!job) return undefined
  const next = { ...job, ...patch }
  jobs.set(uploadId, next)
  return next
}

export async function cleanupJob(uploadId: string): Promise<void> {
  await fs.rm(path.join(UPLOAD_ROOT, uploadId), { recursive: true, force: true }).catch(() => {})
  setTimeout(() => jobs.delete(uploadId), 60_000)
}