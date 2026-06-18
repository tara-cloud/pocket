import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const artifactCount = await db.artifact.count({ where: { repositoryId: repo.id } });
    return NextResponse.json({ ...repo, artifactCount });
}
