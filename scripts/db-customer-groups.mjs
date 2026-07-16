#!/usr/bin/env node
// Customer Groups Analytics via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  const groups = await db.$queryRaw`
    SELECT "group", COUNT(*) as count, SUM(totalSpent) as totalSpent,
           AVG(loyaltyPoints) as avgLoyalty, AVG(totalSpent) as avgSpent
    FROM Customer GROUP BY "group" ORDER BY count DESC
  `;
  const cleaned = groups.map(g => ({ ...g, count: Number(g.count), totalSpent: Number(g.totalSpent), avgLoyalty: Number(g.avgLoyalty), avgSpent: Number(g.avgSpent) }));
  writeFileSync('artifacts/customer-groups.json', JSON.stringify(cleaned, null, 2));
  console.log('Customer groups:');
  cleaned.forEach(g => console.log(`  ${g.group}: ${g.count} customers, ₹${Math.round(g.totalSpent).toLocaleString()}`));
} finally {
  await db.$disconnect();
}