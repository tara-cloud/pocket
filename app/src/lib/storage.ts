import { createHash } from 'crypto';
import { createWriteStream, mkdirSync, unlinkSync } from 'fs';
import { join, relative } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export const STORAGE_ROOT = process.env.STORAGE_PATH ?? '/data/artifacts';

export function initStorage() {
    mkdirSync(STORAGE_ROOT, { recursive: true });
}

export function absPath(rel: string) {
    return join(STORAGE_ROOT, rel);
}

export async function saveFile(
    repo: string, name: string, version: string, filename: string,
    stream: ReadableStream
): Promise<{ relPath: string; checksum: string; size: number }> {
    const dir = join(STORAGE_ROOT, repo, name, version);
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, filename);

    const hash = createHash('sha256');
    let size = 0;
    const nodeStream = Readable.fromWeb(stream as any);
    const fileStream = createWriteStream(dest);

    nodeStream.on('data', (chunk: Buffer) => { hash.update(chunk); size += chunk.length; });
    await pipeline(nodeStream, fileStream);

    return {
        relPath:  relative(STORAGE_ROOT, dest),
        checksum: hash.digest('hex'),
        size,
    };
}

export function deleteFile(relPath: string) {
    try { unlinkSync(absPath(relPath)); } catch { /* ignore */ }
}
