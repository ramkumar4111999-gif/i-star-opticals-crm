#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const ps = await db.$queryRaw`PRAGMA page_size`;
  const pc = await db.$queryRaw`PRAGMA page_count`;
  const size = ps[0].page_size * pc[0].page_count;
  const integrity = await db.$queryRaw`PRAGMA integrity_check`;
  const health = { sizeKB: Math.round(size / 1024), pageCount: pc[0].page_count, integrity: integrity[0].integrity_check };
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/db-health.json', JSON.stringify(health, null, 2));
  console.log('DB Size: ' + health.sizeKB + ' KB');
  console.log('Integrity: ' + health.integrity);
})().finally(() => db.$disconnect());