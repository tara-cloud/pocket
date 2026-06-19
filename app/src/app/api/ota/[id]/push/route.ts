import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth, extractToken } from '@/lib/auth';
import { safeJson } from '@/lib/serialize';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = extractToken(req);
    if (!await verifyAuth(token))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id } = await params;
    const release = await db.oTARelease.findUnique({
        where: { id: Number.parseInt(id) },
        include: { artifact: { include: { repository: true } } },
    });
    if (!release) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const pocketUrl  = process.env.POCKET_URL  ?? 'http://192.168.0.107:30600';
    const electroUrl = process.env.ELECTRO_URL ?? 'http://192.168.0.107:4000';
    const a          = release.artifact;
    const dlUrl      = `${pocketUrl}/api/files/${a.repository.name}/${a.name}/${a.version}/${a.fileName}`;

    // Fetch all registered robots from Electro, filter by deviceType
    const allDevices: { deviceId: string; deviceType: string }[] = await fetch(
        `${electroUrl}/robot`
    ).then(r => r.ok ? r.json() : []).catch(() => []);

    const devices = allDevices.filter(d => d.deviceType === release.deviceType);

    const errors: string[] = [];
    for (const d of devices) {
        const res = await fetch(`${electroUrl}/robot/${d.deviceId}/ota-push`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                version: release.version,
                url:     dlUrl,
                apiKey:  token ?? '',
            }),
        }).catch(() => null);

        if (!res?.ok) errors.push(d.deviceId);
    }

    if (errors.length === devices.length && devices.length > 0) {
        return NextResponse.json({ error: 'all device pushes failed', devices: errors }, { status: 502 });
    }

    const updated = await db.oTARelease.update({
        where: { id: release.id },
        data:  { pushedAt: new Date() },
        include: { artifact: true },
    });
    return NextResponse.json(safeJson(updated));
}
