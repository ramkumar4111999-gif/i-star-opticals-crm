#!/usr/bin/env node
// Product Categories Analytics via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  const cats = await db.$queryRaw`
    SELECT category, COUNT(*) as count, SUM(stock) as totalStock,
           AVG(price) as avgPrice, MIN(price) as minPrice, MAX(price) as maxPrice,
           SUM(stock * price) as totalValue
    FROM Product WHERE isActive = 1
    GROUP BY category ORDER BY count DESC
  `;
  const cleaned = cats.map(c => ({ ...c, count: Number(c.count), totalStock: Number(c.totalStock), avgPrice: Number(c.avgPrice), minPrice: Number(c.minPrice), maxPrice: Number(c.maxPrice), totalValue: Number(c.totalValue) }));
  writeFileSync('artifacts/product-categories.json', JSON.stringify(cleaned, null, 2));
  console.log('Product categories:');
  cleaned.forEach(c => console.log(`  ${c.category}: ${c.count} products, ₹${Math.round(c.totalValue).toLocaleString()}`));
} finally {
  await db.$disconnect();
}