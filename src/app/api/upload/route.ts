import { NextResponse } from 'next/server'
import { createJobDir, generateUploadId, setJob } from '@/lib/uploads'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reminderId, filename, mimeType, totalSize, chunkSize = 5 * 1024 * 1024 } = body as {
      reminderId: string
      filename: string
      mimeType: string
      totalSize: number
      chunkSize?: number
    }

    if (!reminderId || !filename || !totalSize) {
      return NextResponse.json({ error: 'Missing required fields: reminderId, filename, totalSize' }, { status: 400 })
    }

    const uploadId = generateUploadId()
    const uploadDir = await createJobDir(uploadId)

    setJob({
      uploadId,
      reminderId,
      filename,
      mimeType: mimeType || 'application/octet-stream',
      totalSize,
      chunkSize,
      receivedSize: 0,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    })

    return NextResponse.json({ uploadId, chunkSize, uploadDir }, { status: 201 })
  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json({ error: 'Failed to initialize upload' }, { status: 500 })
  }
}
