import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from './db';

export function hashKey(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
    return 'pkt_' + randomBytes(32).toString('hex');
}

export function extractToken(req: NextRequest): string | null {
    return req.headers.get('x-pocket-token') ?? req.nextUrl.searchParams.get('token');
}

export async function verifyAuth(token: string | null): Promise<boolean> {
    if (!token) return false;
    const hash = hashKey(token);
    const key = await db.aPIKey.findUnique({ where: { keyHash: hash } });
    if (!key) return false;
    if (key.expiresAt && key.expiresAt < new Date()) return false;
    return true;
}
