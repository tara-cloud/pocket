import { createHash, randomBytes } from 'crypto';
import { db } from './db';

export function hashKey(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
    return 'pkt_' + randomBytes(32).toString('hex');
}

export async function verifyAuth(token: string | null): Promise<boolean> {
    if (!token) return false;
    const master = process.env.POCKET_MASTER_KEY;
    if (master && token === master) return true;
    const hash = hashKey(token);
    const key = await db.aPIKey.findUnique({ where: { keyHash: hash } });
    return key !== null;
}
