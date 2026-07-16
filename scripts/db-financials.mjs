#!/usr/bin/env node
// Financial Summary via Prisma
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

const db = new PrismaClient();
try {
  mkdirSync('artifacts', { recursive: true });
  const totalRevenue = (await db.sale.aggregate({ _sum: { totalAmount: true } }))._sum.totalAmount || 0;
  const totalExpenses = (await db.expense.aggregate({ _sum: { amount: true } }))._sum.amount || 0;
  const totalDues = (await db.due.aggregate({ _sum: { amount: true, paid: true } }))._sum;
  const expenseByCategory = await db.$queryRaw`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM Expense GROUP BY category ORDER BY total DESC
  `;
  const financials = {
    totalRevenue: Math.round(Number(totalRevenue)),
    totalExpenses: Math.round(Number(totalExpenses)),
    netProfit: Math.round(Number(totalRevenue) - Number(totalExpenses)),
    totalDuesAmount: Math.round(Number(totalDues.amount || 0)),
    totalDuesPaid: Math.round(Number(totalDues.paid || 0)),
    totalDuesOutstanding: Math.round(Number(totalDues.amount || 0) - Number(totalDues.paid || 0)),
    expenseByCategory: expenseByCategory.map(e => ({ ...e, total: Number(e.total), count: Number(e.count) }))
  };
  writeFileSync('artifacts/financials.json', JSON.stringify(financials, null, 2));
  console.log('Financial summary:');
  console.log(`  Revenue: ₹${financials.totalRevenue.toLocaleString()}`);
  console.log(`  Expenses: ₹${financials.totalExpenses.toLocaleString()}`);
  console.log(`  Net Profit: ₹${financials.netProfit.toLocaleString()}`);
  console.log(`  Outstanding Dues: ₹${financials.totalDuesOutstanding.toLocaleString()}`);
} finally {
  await db.$disconnect();
}