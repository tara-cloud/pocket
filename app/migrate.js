#!/usr/bin/env node
const { execSync } = require('child_process');
console.log('Running prisma db push...');
try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env } });
    console.log('Schema pushed.');
} catch (e) {
    console.error('Schema push failed:', e.message);
    process.exit(1);
}
