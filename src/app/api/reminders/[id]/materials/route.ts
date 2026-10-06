import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const materials = await prisma.material.findMany({
      where: { reminderId: id },
      select: { id: true, filename: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(materials)
  } catch {
    return NextResponse.json({ error: 'Failed to load materials' }, { status: 500 })
  }
}