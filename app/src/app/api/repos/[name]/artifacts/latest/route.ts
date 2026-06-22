import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/serialize';

function semverGt(a: string, b: string): boolean {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const [aMaj, aMin, aPat] = parse(a);
    const [bMaj, bMin, bPat] = parse(b);
    if (aMaj !== bMaj) return aMaj > bMaj;
    if (aMin !== bMin) return aMin > bMin;
    return aPat > bPat;
}

// GET /api/repos/[name]/artifacts/latest?artifact=ARTIFACT_NAME&current=1.0.0
// Returns { update: true, version, url, fileName, checksum } or { update: false }
export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const artifactName  = req.nextUrl.searchParams.get('artifact');
    const currentVersion = req.nextUrl.searchParams.get('current');

    if (!artifactName || !currentVersion)
        return NextResponse.json({ error: 'artifact and current params required' }, { status: 400 });

    const repo = await db.repository.findUnique({ where: { name } });
    if (!repo) return NextResponse.json({ error: 'repo not found' }, { status: 404 });

    const artifacts = await db.artifact.findMany({
        where: { repositoryId: repo.id, name: artifactName },
        orderBy: { createdAt: 'desc' },
    });

    const newer = artifacts.filter(a => semverGt(a.version, currentVersion));
    if (!newer.length) return NextResponse.json({ update: false });

    // Pick the newest
    const latest = newer.reduce((best, a) => semverGt(a.version, best.version) ? a : best, newer[0]);
    const url = `/api/files/${encodeURIComponent(name)}/${encodeURIComponent(latest.name)}/${encodeURIComponent(latest.version)}/${encodeURIComponent(latest.fileName)}`;

    return NextResponse.json(safeJson({
        update:   true,
        version:  latest.version,
        fileName: latest.fileName,
        checksum: latest.checksum,
        size:     latest.size,
        url,
    }));
}
