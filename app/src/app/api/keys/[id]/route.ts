import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!await verifyAuth(req.headers.get('x-pocket-token')))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await params;
    await db.aPIKey.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
