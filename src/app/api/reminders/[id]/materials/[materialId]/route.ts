import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const { id, materialId } = await params
  try {
    await prisma.material.deleteMany({ where: { id: materialId, reminderId: id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}