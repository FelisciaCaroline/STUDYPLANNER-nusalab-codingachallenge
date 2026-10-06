import { NextResponse } from 'next/server'
import { getJob, updateJob, createJobDir } from '@/lib/uploads'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params
  const job = getJob(uploadId)
  if (!job) {
    return NextResponse.json({ error: 'Upload not found or expired' }, { status: 404 })
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    let chunkBuffer: ArrayBuffer

    if (contentType.includes('application/octet-stream')) {
      chunkBuffer = await request.arrayBuffer()
    } else {
      const formData = await request.formData()
      const chunk = formData.get('chunk')
      if (!chunk || !(chunk instanceof Blob)) {
        return NextResponse.json({ error: 'Missing chunk data' }, { status: 400 })
      }
      chunkBuffer = await chunk.arrayBuffer()
    }

    const chunkNumber = parseInt(request.headers.get('x-chunk-number') || '0', 10)
    const uploadDir = await createJobDir(uploadId)
    const chunkPath = path.join(uploadDir, `chunk_${chunkNumber}`)

    await fs.writeFile(chunkPath, Buffer.from(chunkBuffer))

    const newReceived = job.receivedSize + chunkBuffer.byteLength
    const progress = Math.min(100, Math.round((newReceived / job.totalSize) * 100))

    updateJob(uploadId, {
      receivedSize: newReceived,
      progress,
      status: newReceived >= job.totalSize ? ('ready' as const) : 'queued',
    })

    return NextResponse.json({ received: newReceived, progress, status: newReceived >= job.totalSize ? 'complete' : 'partial' })
  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json({ error: 'Failed to upload chunk' }, { status: 500 })
  }
}
