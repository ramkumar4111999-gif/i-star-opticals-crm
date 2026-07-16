#!/usr/bin/env node
// DB Health Check via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  const pageSize = await db.$queryRaw`PRAGMA page_size`;
  const pageCount = await db.$queryRaw`PRAGMA page_count`;
  const integrity = await db.$queryRaw`PRAGMA integrity_check`;
  const journalMode = await db.$queryRaw`PRAGMA journal_mode`;

  const pageSizeBytes = Number(pageSize[0].page_size);
  const pageCountNum = Number(pageCount[0].page_count);
  const dbSizeBytes = pageSizeBytes * pageCountNum;

  const health = {
    dbSizeBytes,
    dbSizeKB: Math.round(dbSizeBytes / 1024),
    pageSize: pageSizeBytes,
    pageCount: pageCountNum,
    integrity: integrity[0].integrity_check,
    journalMode: journalMode[0].journal_mode,
  };
  writeFileSync('artifacts/db-health.json', JSON.stringify(health, null, 2));
  console.log('Database health:');
  console.log(`  Size: ${health.dbSizeKB} KB`);
  console.log(`  Pages: ${health.pageCount}`);
  console.log(`  Integrity: ${health.integrity}`);
  console.log(`  Journal: ${health.journalMode}`);
} finally {
  await db.$disconnect();
}