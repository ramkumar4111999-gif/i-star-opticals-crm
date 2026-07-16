#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Export ALL data from Prisma/SQLite → public/seed-data.json
// Used by GitHub Actions workflow to embed DB data in static site
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const db = new PrismaClient();

const MODELS = [
  'Customer',
  'Prescription',
  'Visit',
  'Product',
  'Sale',
  'SaleItem',
  'Return',
  'LabOrder',
  'Appointment',
  'Expense',
  'Due',
  'Staff',
  'Attendance',
  'SalaryRecord',
  'Campaign',
  'Notification',
  'PurchaseOrder',
];

async function exportAll() {
  console.log('📦 Exporting database to JSON via Prisma...');
  
  // Ensure DATABASE_URL points to the committed DB
  const dbUrl = process.env.DATABASE_URL || `file:${join(ROOT, 'db', 'custom.db')}`;
  console.log(`   DATABASE_URL: ${dbUrl}`);

  const output = {};
  let totalRecords = 0;

  for (const model of MODELS) {
    try {
      // eslint-disable-next-line no-proto
      const records = await db[model].findMany();
      output[model] = records.map(r => {
        // Convert Date objects to ISO strings for JSON serialization
        const clean = {};
        for (const [key, val] of Object.entries(r)) {
          clean[key] = val instanceof Date ? val.toISOString() : val;
        }
        return clean;
      });
      totalRecords += records.length;
      console.log(`   ✓ ${model}: ${records.length} records`);
    } catch (err) {
      console.warn(`   ✗ ${model}: ${err.message}`);
      output[model] = [];
    }
  }

  // Write to both prisma/ and public/ for flexibility
  const json = JSON.stringify(output, null, 2);
  const bytes = Buffer.byteLength(json, 'utf-8');

  mkdirSync(join(ROOT, 'public'), { recursive: true });
  writeFileSync(join(ROOT, 'public', 'seed-data.json'), json, 'utf-8');
  writeFileSync(join(ROOT, 'prisma', 'seed-data.json'), json, 'utf-8');

  console.log(`\n✅ Exported ${totalRecords} records across ${MODELS.length} tables`);
  console.log(`   Output: public/seed-data.json (${(bytes / 1024).toFixed(1)} KB)`);
  console.log(`   Output: prisma/seed-data.json (${(bytes / 1024).toFixed(1)} KB)`);

  // Verify model counts
  for (const [model, records] of Object.entries(output)) {
    if (Array.isArray(records) && records.length > 0) {
      console.log(`   → ${model}: ${records.length}`);
    }
  }
}

exportAll()
  .catch(err => {
    console.error('❌ Export failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());