#!/usr/bin/env node
// DB Relations Export via Prisma — using Prisma model API instead of raw SQL
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  // Extract relations from Prisma schema file directly
  const { readFileSync } = await import('fs');
  const schemaContent = readFileSync('prisma/schema.prisma', 'utf-8');
  const relations = [];
  const relRegex = /@relation\(fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\]/g;
  let match;
  while ((match = relRegex.exec(schemaContent)) !== null) {
    const fields = match[1].trim();
    const refs = match[2].trim();
    relations.push({ fields, references: refs });
  }
  writeFileSync('artifacts/relations.json', JSON.stringify(relations, null, 2));
  console.log(`Found ${relations.length} relations from Prisma schema`);
  relations.forEach(r => console.log(`  ${r.fields} → ${r.references}`));
} finally {
  await db.$disconnect();
}