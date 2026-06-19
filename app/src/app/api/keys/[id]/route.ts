import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await db.aPIKey.delete({ where: { id: Number.parseInt(id) } });
    return NextResponse.json({ ok: true });
}
