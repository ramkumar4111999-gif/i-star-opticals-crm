#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const cats = await db.$queryRaw`
    SELECT category, COUNT(*) as count, SUM(stock) as totalStock,
           AVG(price) as avgPrice, SUM(stock * price) as totalValue
    FROM Product WHERE isActive = 1 GROUP BY category ORDER BY count DESC`;
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/product-categories.json', JSON.stringify(cats, null, 2));
  console.log('Product categories:');
  cats.forEach(c => console.log('  ' + c.category + ': ' + c.count + ' products'));
})().finally(() => db.$disconnect());