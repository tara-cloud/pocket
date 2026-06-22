import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';

export async function GET() {
    const repos = await db.repository.findMany({ orderBy: { createdAt: 'desc' } });
    const result = await Promise.all(repos.map(async r => ({
        ...r,
        size: undefined,
        artifactCount: await db.artifact.count({ where: { repositoryId: r.id } }),
        latestVersion: (await db.artifact.findFirst({ where: { repositoryId: r.id }, orderBy: { createdAt: 'desc' } }))?.version ?? '',
    })));
    return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const repo = await db.repository.create({
        data: {
            name:        body.name,
            description: body.description ?? '',
            repoType:    body.repoType ?? 'generic',
            isPublic:    body.isPublic ?? true,
            tags:        Array.isArray(body.tags) ? body.tags : [],
            keepLatest:  typeof body.keepLatest === 'number' ? body.keepLatest : 0,
        },
    });
    return NextResponse.json(repo, { status: 201 });
}
