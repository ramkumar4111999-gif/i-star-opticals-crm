#!/usr/bin/env node
// Sales Analytics via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('artifacts', { recursive: true });
const db = new PrismaClient();
try {
  const paymentModes = await db.$queryRaw`
    SELECT paymentMode, COUNT(*) as count, SUM(totalAmount) as total
    FROM Sale GROUP BY paymentMode ORDER BY total DESC
  `;
  const dailySales = await db.$queryRaw`
    SELECT date(createdAt) as date, COUNT(*) as count, SUM(totalAmount) as total
    FROM Sale GROUP BY date(createdAt) ORDER BY date DESC
  `;
  const topProducts = await db.$queryRaw`
    SELECT p.name, p.sku, p.category, SUM(si.qty) as totalQty, SUM(si.total) as revenue
    FROM SaleItem si JOIN Product p ON si.productId = p.id
    GROUP BY si.productId ORDER BY revenue DESC LIMIT 10
  `;
  const analytics = {
    paymentModes: paymentModes.map(p => ({ ...p, total: Number(p.total), count: Number(p.count) })),
    dailySales: dailySales.map(d => ({ ...d, count: Number(d.count), total: Number(d.total) })),
    topProducts: topProducts.map(t => ({ ...t, totalQty: Number(t.totalQty), revenue: Number(t.revenue) }))
  };
  writeFileSync('artifacts/sales-analytics.json', JSON.stringify(analytics, null, 2));
  console.log('Sales analytics exported');
  console.log(`  Payment modes: ${analytics.paymentModes.map(p => p.paymentMode).join(', ')}`);
  console.log(`  Daily sales entries: ${analytics.dailySales.length}`);
  console.log(`  Top products: ${analytics.topProducts.length}`);
} finally {
  await db.$disconnect();
}