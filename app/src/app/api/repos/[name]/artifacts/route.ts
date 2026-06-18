import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { lookup } from 'mime-types';
import { safeJson } from '@/lib/serialize';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const url    = req.nextUrl;
    const filter: Record<string, unknown> = { repositoryId: repo.id };
    if (url.searchParams.get('version')) filter.version = url.searchParams.get('version');
    if (url.searchParams.get('q'))       filter.name = { contains: url.searchParams.get('q'), mode: 'insensitive' };

    const artifacts = await db.artifact.findMany({ where: filter, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(safeJson(artifacts));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    if (!await verifyAuth(req.headers.get('x-pocket-token')))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { name } = await params;
    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'repo not found' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const artName = (formData.get('name') as string | null) ?? file.name;
    const version = (formData.get('version') as string | null) ?? 'latest';

    const existing = await db.artifact.findUnique({ where: { repositoryId_name_version: { repositoryId: repo.id, name: artName, version } } });
    if (existing) return NextResponse.json({ error: 'version already exists' }, { status: 409 });

    const { relPath, checksum, size } = await saveFile(name, artName, version, file.name, file.stream());
    const ct = lookup(file.name) || 'application/octet-stream';

    const artifact = await db.artifact.create({
        data: { repositoryId: repo.id, name: artName, version, fileName: file.name, filePath: relPath, size, contentType: ct, checksum },
    });
    return NextResponse.json(safeJson(artifact), { status: 201 });
}
