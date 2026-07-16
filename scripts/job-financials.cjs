#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const db = new PrismaClient();
(async () => {
  const rev = (await db.sale.aggregate({ _sum: { totalAmount: true } }))._sum.totalAmount || 0;
  const exp = (await db.expense.aggregate({ _sum: { amount: true } }))._sum.amount || 0;
  const dues = (await db.due.aggregate({ _sum: { amount: true, paid: true } }))._sum;
  const byCat = await db.$queryRaw`SELECT category, SUM(amount) as total FROM Expense GROUP BY category ORDER BY total DESC`;
  const f = {
    totalRevenue: Math.round(rev), totalExpenses: Math.round(exp), netProfit: Math.round(rev - exp),
    outstandingDues: Math.round((dues.amount || 0) - (dues.paid || 0)), expenseByCategory: byCat
  };
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/financials.json', JSON.stringify(f, null, 2));
  console.log('Revenue: Rs.' + f.totalRevenue.toLocaleString());
  console.log('Expenses: Rs.' + f.totalExpenses.toLocaleString());
  console.log('Net Profit: Rs.' + f.netProfit.toLocaleString());
})().finally(() => db.$disconnect());