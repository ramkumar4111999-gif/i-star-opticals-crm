#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();
(async () => {
  console.log('Running data integrity checks...');
  const sales = await db.sale.findMany({ include: { items: true } });
  const allProducts = await db.product.findMany();
  const lowStock = allProducts.filter(p => p.isActive && p.stock < p.minStock);
  const pendingLabs = await db.labOrder.findMany({ where: { status: 'Pending' } });
  const pendingDues = await db.due.findMany({ where: { status: 'Pending' } });
  const totalDue = pendingDues.reduce((a, d) => a + d.amount - d.paid, 0);
  const totalRev = (await db.sale.aggregate({ _sum: { totalAmount: true } }))._sum.totalAmount || 0;
  const invValue = allProducts.reduce((a, p) => a + p.price * p.stock, 0);
  console.log('  Sales: ' + sales.length + ' (' + sales.filter(s => s.items.length > 0).length + ' with items)');
  console.log('  Low stock: ' + lowStock.length + '/' + allProducts.length + ' products');
  console.log('  Pending lab orders: ' + pendingLabs.length);
  console.log('  Pending dues: Rs.' + Math.round(totalDue).toLocaleString());
  console.log('  Total revenue: Rs.' + Math.round(totalRev).toLocaleString());
  console.log('  Inventory value: Rs.' + Math.round(invValue).toLocaleString());
  console.log('All checks passed!');
})().finally(() => db.$disconnect());