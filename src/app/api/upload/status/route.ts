import { NextResponse } from 'next/server'
import { getJob } from '@/lib/uploads'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')

  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId is required' }, { status: 400 })
  }

  const job = getJob(uploadId)
  if (!job) {
    return NextResponse.json({ error: 'Upload not found or expired' }, { status: 404 })
  }

  return NextResponse.json({
    uploadId: job.uploadId,
    status: job.status,
    progress: job.progress,
    filename: job.filename,
    materialId: job.materialId,
    error: job.error,
  })
}
