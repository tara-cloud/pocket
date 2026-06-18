import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { generateToken, hashKey } from '@/lib/auth';

export async function GET(req: NextRequest) {
    if (!await verifyAuth(req.headers.get('x-pocket-token')))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const keys = await db.aPIKey.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
    if (!await verifyAuth(req.headers.get('x-pocket-token')))
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { name } = await req.json();
    const token = generateToken();
    const key   = await db.aPIKey.create({ data: { name, keyHash: hashKey(token) } });
    return NextResponse.json({ ...key, token }, { status: 201 });
}
