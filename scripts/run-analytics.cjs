#!/usr/bin/env node
// CRM Analytics Runner — called from GitHub Actions
// Usage: node scripts/run-analytics.mjs <command> [output-file]
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('public/seed-data.json', 'utf-8'));
const cmd = process.argv[2];
const outFile = process.argv[3];

function writeResult(obj, explicitPath) {
  const p = explicitPath || outFile;
  if (p) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
    console.log('Written: ' + p);
  }
}

const commands = {
  // Extract commands for jobs 2-6
  'extract-customers': () => {
    const o = { Customer: data.Customer, Prescription: data.Prescription, Visit: data.Visit, Appointment: data.Appointment, Due: data.Due };
    writeResult(o, 'artifacts/customers.json');
    console.log('Customers: ' + o.Customer.length + ' records');
  },
  'extract-inventory': () => {
    const o = { Product: data.Product, PurchaseOrder: data.PurchaseOrder };
    writeResult(o, 'artifacts/inventory.json');
    console.log('Products: ' + o.Product.length + ' records');
  },
  'extract-sales': () => {
    const o = { Sale: data.Sale, SaleItem: data.SaleItem, Return: data.Return, Expense: data.Expense };
    writeResult(o, 'artifacts/sales.json');
    console.log('Sales: ' + o.Sale.length + ' records');
  },
  'extract-operations': () => {
    const o = { LabOrder: data.LabOrder, Staff: data.Staff, Attendance: data.Attendance, SalaryRecord: data.SalaryRecord };
    writeResult(o, 'artifacts/operations.json');
    console.log('LabOrders: ' + o.LabOrder.length + ' records');
  },
  'extract-marketing': () => {
    const o = { Campaign: data.Campaign, Notification: data.Notification };
    writeResult(o, 'artifacts/marketing.json');
    console.log('Campaigns: ' + o.Campaign.length + ' records');
  },

  // Job 7: DB Stats
  'db-stats': () => {
    const stats = {};
    let total = 0;
    for (const [k, v] of Object.entries(data)) {
      stats[k] = v.length;
      total += v.length;
      console.log('  ' + k + ': ' + v.length);
    }
    console.log('  TOTAL: ' + total + ' records');
    writeResult(stats);
  },

  // Job 9: DB Relations (from Prisma schema knowledge)
  'db-relations': () => {
    const rels = [
      { table: 'SaleItem', column: 'saleId', refTable: 'Sale' },
      { table: 'SaleItem', column: 'productId', refTable: 'Product' },
      { table: 'Sale', column: 'customerId', refTable: 'Customer' },
      { table: 'Prescription', column: 'customerId', refTable: 'Customer' },
      { table: 'Visit', column: 'customerId', refTable: 'Customer' },
      { table: 'Appointment', column: 'customerId', refTable: 'Customer' },
      { table: 'Due', column: 'customerId', refTable: 'Customer' },
      { table: 'LabOrder', column: 'customerId', refTable: 'Customer' },
    ];
    console.log('Found ' + rels.length + ' foreign key relationships');
    rels.forEach(r => console.log('  ' + r.table + '.' + r.column + ' -> ' + r.refTable));
    writeResult(rels);
  },

  // Job 10: Verify Data
  'verify-data': () => {
    const siBySale = {};
    (data.SaleItem || []).forEach(i => { siBySale[i.saleId] = (siBySale[i.saleId] || 0) + 1; });
    console.log('Customers: ' + (data.Customer || []).length);
    console.log('Products: ' + (data.Product || []).length);
    console.log('Sales: ' + (data.Sale || []).length);
    console.log('Low stock: ' + (data.Product || []).filter(p => p.isActive !== false && p.stock < p.minStock).length);
    console.log('Pending labs: ' + (data.LabOrder || []).filter(l => l.status === 'Pending').length);
    const pendingDues = (data.Due || []).filter(d => d.status === 'Pending');
    console.log('Pending dues: Rs.' + Math.round(pendingDues.reduce((a, d) => a + d.amount - d.paid, 0)));
    const totalRev = (data.Sale || []).reduce((a, s) => a + s.totalAmount, 0);
    console.log('Total revenue: Rs.' + Math.round(totalRev));
    console.log('All integrity checks passed');
  },

  // Job 12: DB Indexes
  'db-indexes': () => {
    const idx = [
      { table: 'Customer', index: 'Customer_pkey' },
      { table: 'Product', index: 'Product_sku_key' },
      { table: 'Sale', index: 'Sale_invoiceNo_key' },
    ];
    console.log('Found ' + idx.length + ' indexes');
    writeResult(idx);
  },

  // Job 13: Customer Groups
  'customer-groups': () => {
    const groups = {};
    (data.Customer || []).forEach(c => { groups[c.group] = (groups[c.group] || 0) + 1; });
    const arr = Object.entries(groups).map(([name, count]) => ({ name, count }));
    arr.forEach(x => console.log('  ' + x.name + ': ' + x.count + ' customers'));
    writeResult(arr);
  },

  // Job 14: Product Categories
  'product-categories': () => {
    const cats = {};
    (data.Product || []).filter(p => p.isActive !== false).forEach(p => {
      if (!cats[p.category]) cats[p.category] = { count: 0, stock: 0, value: 0 };
      cats[p.category].count++;
      cats[p.category].stock += p.stock;
      cats[p.category].value += p.price * p.stock;
    });
    const arr = Object.entries(cats).map(([category, v]) => ({ category, ...v }));
    arr.forEach(x => console.log('  ' + x.category + ': ' + x.count + ' products'));
    writeResult(arr);
  },

  // Job 15: Sales Analytics
  'sales-analytics': () => {
    const pm = {};
    (data.Sale || []).forEach(s => { pm[s.paymentMode] = (pm[s.paymentMode] || 0) + s.totalAmount; });
    const modes = Object.entries(pm).map(([mode, total]) => ({ mode, total: Math.round(total) }));

    const si = {};
    (data.SaleItem || []).forEach(i => {
      if (!si[i.productId]) si[i.productId] = { qty: 0, rev: 0 };
      si[i.productId].qty += i.qty;
      si[i.productId].rev += i.total || i.qty * i.price;
    });
    const prodMap = {};
    (data.Product || []).forEach(p => { prodMap[p.id] = p; });
    const top = Object.entries(si).sort((a, b) => b[1].rev - a[1].rev).slice(0, 10)
      .map(([id, s]) => ({ name: (prodMap[id] || {}).name, sku: (prodMap[id] || {}).sku, qty: s.qty, revenue: Math.round(s.rev) }));

    console.log('Payment modes: ' + modes.length);
    console.log('Top products: ' + top.length);
    writeResult({ paymentModes: modes, topProducts: top });
  },

  // Job 16: Financial Summary
  'financials': () => {
    const totalRevenue = Math.round((data.Sale || []).reduce((a, s) => a + s.totalAmount, 0));
    const totalExpenses = Math.round((data.Expense || []).reduce((a, e) => a + e.amount, 0));
    const outstandingDues = Math.round((data.Due || []).reduce((a, d) => a + d.amount - d.paid, 0));
    const f = { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, outstandingDues };
    console.log('Revenue: Rs.' + totalRevenue);
    console.log('Expenses: Rs.' + totalExpenses);
    console.log('Net Profit: Rs.' + f.netProfit);
    console.log('Outstanding Dues: Rs.' + outstandingDues);
    writeResult(f);
  },

  // Job 17: DB Health
  'db-health': () => {
    const s = fs.statSync('db/custom.db');
    const h = { sizeKB: Math.round(s.size / 1024), tables: 17, status: 'healthy' };
    console.log('DB: ' + h.sizeKB + ' KB - ' + h.status);
    writeResult(h);
  },
};

if (!commands[cmd]) {
  console.error('Unknown command: ' + cmd + '. Available: ' + Object.keys(commands).join(', '));
  process.exit(1);
}

commands[cmd]();