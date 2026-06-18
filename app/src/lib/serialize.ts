// Serialize Prisma objects that contain BigInt fields (size) to plain JSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeJson(data: any): any {
    return JSON.parse(JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
    ));
}
