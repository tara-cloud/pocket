import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { safeJson } from '@/lib/serialize';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!await verifyAuth(extractToken(req)))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id } = await params;
    const release = await db.oTARelease.findUnique({
        where: { id: Number.parseInt(id) },
        include: { artifact: { include: { repository: true } } },
    });
    if (!release) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const pocketUrl = process.env.POCKET_URL ?? `http://192.168.0.107:30600`;
    const a = release.artifact;
    const dlUrl = `${pocketUrl}/api/files/${a.repository.name}/${a.name}/${a.version}/${a.fileName}`;

    const electroUrl = process.env.ELECTRO_URL ?? 'http://192.168.0.107:4000';
    const res = await fetch(`${electroUrl}/robot/ota/broadcast?deviceType=${release.deviceType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: release.version, url: dlUrl }),
    }).catch(() => null);

    if (res && !res.ok) {
        return NextResponse.json({ error: `electro returned ${res.status}` }, { status: 502 });
    }

    const updated = await db.oTARelease.update({
        where: { id: release.id },
        data: { pushedAt: new Date() },
        include: { artifact: true },
    });
    return NextResponse.json(safeJson(updated));
}
