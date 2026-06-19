import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';
import { safeJson } from '@/lib/serialize';

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string; id: string }> }) {
    const { id } = await params;
    const a = await db.artifact.findUnique({ where: { id: Number.parseInt(id) } });
    if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(safeJson(a));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string; id: string }> }) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await params;
    const a = await db.artifact.findUnique({ where: { id: Number.parseInt(id) } });
    if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
    deleteFile(a.filePath);
    await db.artifact.delete({ where: { id: a.id } });
    return NextResponse.json({ ok: true });
}
