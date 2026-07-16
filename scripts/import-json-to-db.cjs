#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Import data from seed-data.json → Prisma/SQLite database
// Used by GitHub Actions workflow to hydrate the DB before export
// Falls back to creating a fresh DB with seed data if needed
// ─────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const db = new PrismaClient();

// Import order matters: parents before children
const IMPORT_ORDER = [
  { model: 'customer', key: 'Customer' },
  { model: 'staff', key: 'Staff' },
  { model: 'product', key: 'Product' },
  { model: 'prescription', key: 'Prescription' },
  { model: 'visit', key: 'Visit' },
  { model: 'sale', key: 'Sale' },
  { model: 'saleItem', key: 'SaleItem' },
  { model: 'labOrder', key: 'LabOrder' },
  { model: 'appointment', key: 'Appointment' },
  { model: 'expense', key: 'Expense' },
  { model: 'due', key: 'Due' },
  { model: 'attendance', key: 'Attendance' },
  { model: 'salaryRecord', key: 'SalaryRecord' },
  { model: 'campaign', key: 'Campaign' },
  { model: 'notification', key: 'Notification' },
  { model: 'purchaseOrder', key: 'PurchaseOrder' },
  { model: 'return', key: 'Return' },
];

async function importAll() {
  console.log('📥 Importing data from JSON to database via Prisma...');

  // Read seed data
  const seedPaths = [
    path.join(ROOT, 'prisma', 'seed-data.json'),
    path.join(ROOT, 'public', 'seed-data.json'),
  ];
  
  let seedData = null;
  for (const p of seedPaths) {
    if (fs.existsSync(p)) {
      seedData = JSON.parse(fs.readFileSync(p, 'utf-8'));
      console.log(`   Loaded seed data from: ${p}`);
      break;
    }
  }

  if (!seedData) {
    console.error('❌ No seed-data.json found in prisma/ or public/');
    process.exit(1);
  }

  let totalImported = 0;

  for (const { model, key } of IMPORT_ORDER) {
    const records = seedData[key] || [];
    if (records.length === 0) {
      console.log(`   ○ ${key}: 0 records (skipped)`);
      continue;
    }

    try {
      // Delete existing records first
      await db[model].deleteMany();
      
      // Insert all records
      // Convert ISO date strings back to Date objects
      const cleaned = records.map(r => {
        const clean = { ...r };
        for (const [k, v] of Object.entries(clean)) {
          if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
            clean[k] = new Date(v);
          }
        }
        return clean;
      });

      const result = await db[model].createMany({
        data: cleaned,
        skipDuplicates: true,
      });

      totalImported += result.count;
      console.log(`   ✓ ${key}: ${result.count} records imported`);
    } catch (err) {
      console.warn(`   ✗ ${key}: ${err.message}`);
    }
  }

  console.log(`\n✅ Imported ${totalImported} records into database`);
}

importAll()
  .catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());