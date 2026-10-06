import fs from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

export async function extractText(file: File): Promise<string>
export async function extractText(filePath: string, mimeType?: string, filename?: string): Promise<string>
export async function extractText(fileOrPath: File | string, mimeType?: string, filename?: string): Promise<string> {
  const isPath = typeof fileOrPath === 'string'
  const name = (isPath ? filename || path.basename(fileOrPath) : fileOrPath.name).toLowerCase()

  const readBuffer = async (): Promise<Buffer> =>
    isPath ? fs.readFile(fileOrPath) : Buffer.from(await fileOrPath.arrayBuffer())

  if (name.endsWith('.pdf')) {
    let text = ''
    try {
      const data = await pdf(await readBuffer())
      text = (data.text || '').trim()
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      throw new Error(`Failed to read the PDF (${reason}). It may be corrupted or password-protected.`)
    }
    if (text.length < 10) {
      throw new Error('This PDF has no extractable text (it is probably a scan made of images). Use a text-based PDF.')
    }
    return text
  }

  if (name.endsWith('.docx')) {
    let text = ''
    try {
      const result = await mammoth.extractRawText({ buffer: await readBuffer() })
      text = result.value.trim()
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      throw new Error(`Failed to read the DOCX (${reason}).`)
    }
    if (!text) throw new Error('The DOCX file appears to be empty.')
    return text
  }

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    const text = (await readBuffer()).toString('utf-8').trim()
    if (!text) throw new Error('The text file is empty.')
    return text
  }

  throw new Error('Unsupported file type. Use PDF, DOCX, TXT or MD.')
}

export function chunkText(text: string, maxChunkSize = 4000): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChunkSize && current.length > 0) {
      chunks.push(current)
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }

  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : [text]
}