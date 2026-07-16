#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
const models = ['Customer','Prescription','Visit','Product','Sale','SaleItem','Return','LabOrder','Appointment','Expense','Due','Staff','Attendance','SalaryRecord','Campaign','Notification','PurchaseOrder'];

(async () => {
  const stats = {}; let total = 0;
  for (const m of models) {
    const c = await db[m].count();
    stats[m] = c; total += c;
    console.log('  ' + m + ': ' + c);
  }
  console.log('  TOTAL: ' + total + ' records');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/db-stats.json', JSON.stringify(stats, null, 2));
})().finally(() => db.$disconnect());