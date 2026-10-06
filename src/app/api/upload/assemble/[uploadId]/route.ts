import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getJob, updateJob, cleanupJob, UPLOAD_ROOT } from '@/lib/uploads'
import prisma from '@/lib/db'
import { extractText } from '@/lib/extract'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params
  const job = getJob(uploadId)
  if (!job) {
    return NextResponse.json({ error: 'Upload not found or expired. Please upload the file again.' }, { status: 404 })
  }

  const fail = async (message: string, status: number) => {
    updateJob(uploadId, { status: 'failed', error: message })
    await cleanupJob(uploadId)
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: job.reminderId }, select: { id: true } })
    if (!reminder) return fail('Reminder not found.', 404)

    const uploadDir = path.join(UPLOAD_ROOT, uploadId)
    const safeName = path.basename(job.filename).replace(/[^\p{L}\p{N}._\- ]+/gu, '_')
    const finalPath = path.join(uploadDir, `assembled_${safeName}`)

    const files = await fs.readdir(uploadDir)
    const chunkFiles = files
      .filter((f) => f.startsWith('chunk_'))
      .sort((a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10))

    if (chunkFiles.length === 0) return fail('No chunks received.', 400)

    await fs.writeFile(finalPath, '')
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(uploadDir, chunkFile)
      await fs.appendFile(finalPath, await fs.readFile(chunkPath))
      await fs.unlink(chunkPath).catch(() => {})
    }

    updateJob(uploadId, { status: 'processing', progress: 50, tempPath: finalPath })

    let extractedText: string
    try {
      extractedText = await extractText(finalPath, job.mimeType, job.filename)
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Extraction failed', 400)
    }

    console.log(`[upload] ${job.filename}: extracted ${extractedText.length} characters`)

    const material = await prisma.material.create({
      data: { reminderId: job.reminderId, filename: job.filename, extractedText },
      select: { id: true, filename: true, createdAt: true },
    })

    updateJob(uploadId, { status: 'done', progress: 100, materialId: material.id, finalPath })
    await cleanupJob(uploadId)

    return NextResponse.json({ material, message: 'Upload and extraction complete' }, { status: 201 })
  } catch (error) {
    console.error('Assemble error:', error)
    return fail(error instanceof Error ? error.message : 'Assembly failed', 500)
  }
}