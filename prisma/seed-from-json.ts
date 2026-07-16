import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedFromJSON() {
  const seedPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  if (!fs.existsSync(seedPath)) {
    console.log('No seed-data.json found, skipping seed');
    return;
  }

  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  console.log('Seeding database from seed-data.json...');

  // Order matters due to foreign keys
  const order = ['Staff', 'Customer', 'Product', 'Appointment', 'Prescription', 'Visit', 
                 'Sale', 'SaleItem', 'LabOrder', 'Expense', 'Due', 'Campaign', 'Notification',
                 'Attendance', 'SalaryRecord', 'Return', 'PurchaseOrder'];

  let total = 0;
  for (const table of order) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;
    
    try {
      // Use raw SQL for reliable insertion
      for (const row of rows) {
        const cols = Object.keys(row);
        const vals = Object.values(row);
        const placeholders = cols.map(() => '?').join(', ');
        const colStr = cols.join(', ');
        
        await prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "${table}" (${colStr}) VALUES (${placeholders})`,
          ...vals
        );
      }
      console.log(`  ${table}: ${rows.length} rows`);
      total += rows.length;
    } catch (e: any) {
      console.log(`  ${table}: SKIPPED - ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\nSeed complete: ${total} total rows`);
}

seedFromJSON()
  .catch(console.error)
  .finally(() => prisma.$disconnect());