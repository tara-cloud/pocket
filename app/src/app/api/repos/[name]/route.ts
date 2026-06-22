import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';
import { rmSync } from 'fs';
import { join } from 'path';
import { STORAGE_ROOT } from '@/lib/storage';

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const artifactCount = await db.artifact.count({ where: { repositoryId: repo.id } });
    return NextResponse.json({ ...repo, artifactCount });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { name } = await params;
    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const artifacts = await db.artifact.findMany({ where: { repositoryId: repo.id } });
    for (const a of artifacts) deleteFile(a.filePath);

    // Remove the entire repo directory from storage
    try { rmSync(join(STORAGE_ROOT, name), { recursive: true, force: true }); } catch { /* ignore */ }

    await db.artifact.deleteMany({ where: { repositoryId: repo.id } });
    await db.repository.delete({ where: { id: repo.id } });

    return new NextResponse(null, { status: 204 });
}
