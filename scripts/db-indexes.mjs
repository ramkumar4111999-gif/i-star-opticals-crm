#!/usr/bin/env node
// DB Indexes Export — from Prisma schema and SQLite
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  // Get unique indexes from Prisma schema
  const schemaContent = readFileSync('prisma/schema.prisma', 'utf-8');
  const indexes = [];
  // Parse @unique attributes
  const uniqueRegex = /@unique/g;
  let uMatch;
  while ((uMatch = uniqueRegex.exec(schemaContent)) !== null) {
    const lineStart = schemaContent.lastIndexOf('\n', uMatch.index) + 1;
    const lineEnd = schemaContent.indexOf('\n', uMatch.index);
    const line = schemaContent.slice(lineStart, lineEnd).trim();
    const fieldName = line.split(/\s+/)[0];
    if (fieldName && !fieldName.startsWith('//') && !fieldName.startsWith('model')) {
      indexes.push({ type: 'unique', field: fieldName });
    }
  }
  // Get table row counts
  const models = ['Customer','Prescription','Visit','Product','Sale','SaleItem','Return','LabOrder','Appointment','Expense','Due','Staff','Attendance','SalaryRecord','Campaign','Notification','PurchaseOrder'];
  for (const m of models) {
    try {
      const count = await db[m].count();
      if (count > 0) indexes.push({ type: 'table', model: m, rows: count });
    } catch {}
  }
  writeFileSync('artifacts/indexes.json', JSON.stringify(indexes, null, 2));
  console.log(`Found ${indexes.length} indexes/constraints`);
  indexes.forEach(i => console.log(`  ${i.type}: ${i.field || i.model}`));
} finally {
  await db.$disconnect();
}