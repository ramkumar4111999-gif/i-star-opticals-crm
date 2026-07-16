#!/usr/bin/env node
// DB Schema Export via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  const tables = await db.$queryRaw`SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name`;
  const schema = tables.map(t => t.sql).join('\n\n');
  writeFileSync('artifacts/schema.sql', schema);
  console.log(`Exported ${tables.length} table definitions`);
} finally {
  await db.$disconnect();
}