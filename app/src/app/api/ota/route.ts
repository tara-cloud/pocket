import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { safeJson } from '@/lib/serialize';

export async function GET(req: NextRequest) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const releases = await db.oTARelease.findMany({
        include: { artifact: true },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(safeJson(releases));
}

export async function POST(req: NextRequest) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const artifact = await db.artifact.findUnique({ where: { id: Number.parseInt(body.artifactId) } });
    if (!artifact) return NextResponse.json({ error: 'artifact not found' }, { status: 404 });

    const release = await db.oTARelease.create({
        data: {
            artifactId:   artifact.id,
            deviceType:   body.deviceType ?? 'robot',
            version:      body.version,
            releaseNotes: body.releaseNotes ?? '',
        },
        include: { artifact: true },
    });
    return NextResponse.json(safeJson(release), { status: 201 });
}
