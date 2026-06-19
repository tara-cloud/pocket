import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { absPath } from '@/lib/storage';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

export async function GET(req: NextRequest, { params }: { params: Promise<{ repo: string; name: string; version: string; filename: string }> }) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { repo, name, version, filename } = await params;

    const repository = await db.repository.findUnique({ where: { name: repo } });
    if (!repository) return NextResponse.json({ error: 'repo not found' }, { status: 404 });

    const artifact = await db.artifact.findFirst({
        where: { repositoryId: repository.id, name, version, fileName: filename },
    });
    if (!artifact) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db.artifact.update({ where: { id: artifact.id }, data: { downloadCount: { increment: 1 } } });

    const abs = absPath(artifact.filePath);
    const stat = statSync(abs);
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
        headers: {
            'Content-Type':        artifact.contentType,
            'Content-Length':      stat.size.toString(),
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Checksum-SHA256':   artifact.checksum,
        },
    });
}
