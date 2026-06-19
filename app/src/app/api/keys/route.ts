import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, hashKey } from '@/lib/auth';

export async function GET() {
    const keys = await db.aPIKey.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
    const { name, description, validDays } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const expiresAt = validDays ? new Date(Date.now() + validDays * 86_400_000) : null;
    const token = generateToken();
    const key = await db.aPIKey.create({ data: { name, description: description ?? '', keyHash: hashKey(token), expiresAt } });
    return NextResponse.json({ ...key, token }, { status: 201 });
}
