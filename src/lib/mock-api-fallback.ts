'use client';

import { useEffect } from 'react';
import {
  loadAllTables, store, getTable, insert, update, remove, upsert,
  saveNow, isConnected, type TableName, TABLES,
} from '@/lib/github-db';

// ─── GitHub-Backed API Layer ──────────────────────────────────────────────
// Patches window.fetch to intercept /api/* calls.
// READ:  returns data from in-memory store (synced from GitHub on load).
// WRITE: updates in-memory store + pushes to GitHub via Contents API.
// This means every customer, sale, appointment etc. you save on the UI
// is persisted as a commit in the GitHub repo — GitHub IS your database.
export function useMockApiFallback() {
  useEffect(() => {
    // Load all data from GitHub (or fallback to seed)
    loadAllTables().then(() => {
      // After data is loaded, install the fetch interceptor
      installFetchInterceptor();
    });

    return () => {
      // Restore original fetch on unmount
      const w = window as any;
      if (w.__origFetch) {
        window.fetch = w.__origFetch;
      }
    };
  }, []);
}

// ─── Helper: parse URL params ───
function params(url: string): Record<string, string> {
  const q = url.includes('?') ? url.split('?')[1] : '';
  const p: Record<string, string> = {};
  q.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) p[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return p;
}

function installFetchInterceptor() {
  const origFetch = window.fetch;
  (window as any).__origFetch = origFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    const method = (init?.method || 'GET').toUpperCase();

    // Only intercept /api/* calls
    if (!url.includes('/api/')) {
      return origFetch(input, init);
    }

    // Try real API first (for dev mode)
    if (method === 'GET') {
      try {
        const res = await origFetch(input, init);
        if (res.ok) return res;
      } catch {}
    }

    // Route to handler
    const path = url.includes('?') ? url.split('?')[0] : url;
    const p = params(url);
    const body = init?.body ? JSON.parse(init.body as string) : null;

    let result: any = null;
    let status = 200;

    try {
      // ── Dashboard ──────────────────────────────────────────
      if (path.includes('/api/dashboard')) {
        result = handleDashboard();
      }
      // ── Customers ─────────────────────────────────────────
      else if (path.includes('/api/customers')) {
        result = handleCustomers(method, p, body);
      }
      // ── Sales ─────────────────────────────────────────────
      else if (path.includes('/api/sales')) {
        result = handleSales(method, p, body);
      }
      // ── Products ──────────────────────────────────────────
      else if (path.includes('/api/products/low-stock')) {
        result = handleLowStock();
      }
      else if (path.includes('/api/products')) {
        result = handleProducts(method, p, body);
      }
      // ── Appointments ──────────────────────────────────────
      else if (path.includes('/api/appointments')) {
        result = handleAppointments(method, p, body);
      }
      // ── Lab Orders ────────────────────────────────────────
      else if (path.includes('/api/lab-orders')) {
        result = handleLabOrders(method, p, body);
      }
      // ── Expenses ──────────────────────────────────────────
      else if (path.includes('/api/expenses')) {
        result = handleExpenses(method, p, body);
      }
      // ── Dues ──────────────────────────────────────────────
      else if (path.includes('/api/dues')) {
        result = handleDues(method, p, body);
      }
      // ── Reports ───────────────────────────────────────────
      else if (path.includes('/api/reports')) {
        result = handleReports(p);
      }
      // ── Staff ─────────────────────────────────────────────
      else if (path.includes('/api/staff')) {
        result = handleStaff(method, p, body);
      }
      // ── Notifications ─────────────────────────────────────
      else if (path.includes('/api/notifications')) {
        result = handleNotifications(method, p, body);
      }
      // ── Purchase Orders ───────────────────────────────────
      else if (path.includes('/api/purchase-orders')) {
        result = handlePurchaseOrders(method, p, body);
      }
      // ── Visits ────────────────────────────────────────────
      else if (path.includes('/api/visits')) {
        result = handleVisits(method, p, body);
      }
      // ── Accounting ────────────────────────────────────────
      else if (path.includes('/api/accounting')) {
        result = handleAccounting();
      }
      // ── Campaigns ─────────────────────────────────────────
      else if (path.includes('/api/campaigns')) {
        result = handleCampaigns(method, p, body);
      }
      // ── Prescriptions ─────────────────────────────────────
      else if (path.includes('/api/prescriptions')) {
        result = handlePrescriptions(method, p, body);
      }
      // ── Backup ────────────────────────────────────────────
      else if (path.includes('/api/backup')) {
        result = handleBackup();
      }
      // ── Restore ───────────────────────────────────────────
      else if (path.includes('/api/restore')) {
        result = await handleRestore(body);
      }

      if (result !== null) {
        return new Response(JSON.stringify(result), {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-DB': isConnected() ? 'connected' : 'local',
          },
        });
      }
    } catch (err) {
      console.error('[CRMApi] Handler error:', err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Not handled — pass through
    return origFetch(input, init);
  };

  console.log(`[CRM] API layer active — ${isConnected() ? 'GitHub DB connected' : 'local mode'}`);
}

// ─── Lookup helpers ───
function custMap() {
  const m: Record<string, any> = {};
  getTable('Customer').forEach((c: any) => { m[c.id] = c; });
  return m;
}
function prodMap() {
  const m: Record<string, any> = {};
  getTable('Product').forEach((p: any) => { m[p.id] = p; });
  return m;
}

// ─── Handlers ────────────────────────────────────────────────────────────

function handleDashboard() {
  const customers = getTable('Customer');
  const sales = getTable('Sale');
  const products = getTable('Product');
  const labs = getTable('LabOrder');
  const dues = getTable('Due');
  const appointments = getTable('Appointment');
  const salesItems = getTable('SaleItem');
  const cm = custMap();

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s: any) => (s.createdAt || '').startsWith(todayStr));

  return {
    stats: {
      totalCustomers: customers.length,
      todaySales: Math.round(todaySales.reduce((a: number, s: any) => a + s.totalAmount, 0)),
      monthlyRevenue: Math.round(sales.reduce((a: number, s: any) => a + s.totalAmount, 0)),
      lowStockAlerts: products.filter((p: any) => p.isActive !== false && p.stock < p.minStock).length,
      pendingLabOrders: labs.filter((l: any) => l.status !== 'Delivered').length,
      pendingDues: Math.round(dues.filter((d: any) => d.status === 'Pending' || d.status === 'Partial').reduce((a: number, d: any) => a + d.amount - d.paid, 0)),
      overdueAppointments: 0,
    },
    recentSales: sales.slice(-5).reverse().map((s: any) => ({
      invoiceNo: s.invoiceNo, customerName: cm[s.customerId]?.name || 'Walk-in', amount: s.totalAmount, date: s.createdAt, paymentMode: s.paymentMode,
    })),
    appointments: appointments.map((a: any) => {
      const d = new Date(a.date);
      return { time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), customerName: cm[a.customerId]?.name || 'Unknown', purpose: a.purpose || 'General Visit', status: a.status === 'Confirmed' ? 'confirmed' : 'pending' };
    }),
    lowStock: products.filter((p: any) => p.isActive !== false && p.stock < p.minStock).slice(0, 5).map((p: any) => ({ name: p.name, stock: p.stock, minStock: p.minStock })),
    customerAcquisition: { thisMonth: customers.length, lastMonth: 0, byGroup: { New: customers.length, Regular: 0, Wholesale: 0, Premium: 0 } },
    revenueByDayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
      day, revenue: Math.round(sales.reduce((a, s: any) => a + s.totalAmount, 0)),
    })),
    comparison: { revenueChange: 12, customerChange: 8 },
    pendingTasks: {
      labOrdersPending: labs.filter((l: any) => l.status !== 'Delivered').length,
      duesOverdue: dues.filter((d: any) => d.status === 'Overdue').length,
      appointmentsToday: appointments.filter((a: any) => (a.date || '').startsWith(todayStr)).length,
      lowStockItems: products.filter((p: any) => p.isActive !== false && p.stock < p.minStock).length,
    },
    todayPaymentModes: [
      { mode: 'Cash', amount: Math.round(todaySales.reduce((a: number, s: any) => a + (s.paymentMode === 'Cash' ? s.totalAmount : 0), 0)) },
      { mode: 'UPI', amount: Math.round(todaySales.reduce((a: number, s: any) => a + (s.paymentMode === 'UPI' ? s.totalAmount : 0), 0)) },
      { mode: 'Card', amount: Math.round(todaySales.reduce((a: number, s: any) => a + (s.paymentMode === 'Card' ? s.totalAmount : 0), 0)) },
    ],
    todayAvgOrderValue: todaySales.length ? Math.round(todaySales.reduce((a, s: any) => a + s.totalAmount, 0) / todaySales.length) : 0,
  };
}

function handleCustomers(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Customer', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    const record = update('Customer', body.id, body);
    return { data: record, success: true };
  }
  if (method === 'DELETE' && p.id) {
    remove('Customer', p.id);
    return { success: true };
  }

  const cm = custMap();
  const prescs = getTable('Prescription');
  const visits = getTable('Visit');
  const sales = getTable('Sale');
  const prescCount: Record<string, number> = {};
  prescs.forEach((pr: any) => { prescCount[pr.customerId] = (prescCount[pr.customerId] || 0) + 1; });
  const visitCount: Record<string, number> = {};
  visits.forEach((v: any) => { visitCount[v.customerId] = (visitCount[v.customerId] || 0) + 1; });
  const salesCount: Record<string, number> = {};
  sales.forEach((s: any) => { if (s.customerId) salesCount[s.customerId] = (salesCount[s.customerId] || 0) + 1; });

  const search = (p.search || '').toLowerCase();
  const limit = parseInt(p.limit || '20');
  const page = parseInt(p.page || '1');
  const customers = getTable('Customer');
  const filtered = customers.filter((c: any) => !search || (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search));
  const total = filtered.length;
  const paged = filtered.slice((page - 1) * limit, page * limit).map((c: any) => ({ ...c, _count: { prescriptions: prescCount[c.id] || 0, visits: visitCount[c.id] || 0, sales: salesCount[c.id] || 0 } }));
  return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function handleSales(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const sale = body.sale || body;
    const items = body.items || [];
    const savedSale = insert('Sale', { ...sale, createdAt: Date.now(), updatedAt: Date.now() });
    items.forEach((item: any) => {
      insert('SaleItem', { ...item, saleId: savedSale.id, createdAt: Date.now() });
    });
    // Update product stock
    items.forEach((item: any) => {
      const prod = getTable('Product').find((pr: any) => pr.id === item.productId);
      if (prod) {
        update('Product', item.productId, { stock: Math.max(0, (prod.stock || 0) - (item.qty || 1)) });
      }
    });
    saveNow('Sale');
    saveNow('SaleItem');
    saveNow('Product');
    return { data: savedSale, success: true };
  }
  if (method === 'PUT') {
    update('Sale', body.id, body);
    return { success: true };
  }
  if (method === 'DELETE' && p.id) {
    remove('Sale', p.id);
    return { success: true };
  }

  const cm = custMap();
  const salesItems = getTable('SaleItem');
  const siPerSale: Record<string, number> = {};
  salesItems.forEach((si: any) => { siPerSale[si.saleId] = (siPerSale[si.saleId] || 0) + 1; });

  const limit = parseInt(p.limit || '10');
  const page = parseInt(p.page || '1');
  const sales = [...getTable('Sale')].reverse();
  const paged = sales.slice((page - 1) * limit, page * limit).map((s: any) => ({
    id: s.id, invoiceNo: s.invoiceNo, customerName: cm[s.customerId]?.name || 'Walk-in', itemsCount: siPerSale[s.id] || 0, subtotal: s.subtotal, discount: s.discount, cgst: s.cgst, sgst: s.sgst, total: s.totalAmount, paymentMode: s.paymentMode, status: s.status, createdAt: (s.createdAt || '').toString().slice(0, 10),
  }));
  return { sales: paged, total: sales.length, page, pageSize: limit };
}

function handleProducts(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Product', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Product', body.id, body);
    return { success: true };
  }
  if (method === 'DELETE' && p.id) {
    update('Product', p.id, { isActive: false });
    return { success: true };
  }

  const limit = parseInt(p.pageSize || p.limit || '10');
  const page = parseInt(p.page || '1');
  const search = (p.search || '').toLowerCase();
  const prods = getTable('Product').filter((pr: any) => pr.isActive !== false).reverse();
  const filtered = search ? prods.filter((pr: any) => (pr.name || '').toLowerCase().includes(search) || (pr.sku || '').toLowerCase().includes(search) || (pr.brand || '').toLowerCase().includes(search)) : prods;
  const low = prods.filter((pr: any) => pr.stock < pr.minStock);
  return { products: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, pageSize: limit, totalPages: Math.ceil(filtered.length / limit), lowStockCount: low.length, lowStockItems: low.slice(0, 20) };
}

function handleLowStock() {
  const items = getTable('Product').filter((p: any) => p.isActive !== false && p.stock < p.minStock).map((p: any) => ({
    id: p.id, name: p.name, category: p.category, brand: p.brand, stock: p.stock, minStock: p.minStock, needed: p.minStock - p.stock, sku: p.sku, costPrice: p.costPrice, reorderCost: (p.minStock - p.stock) * (p.costPrice || 0), supplier: p.supplier,
  }));
  return { total: items.length, items };
}

function handleAppointments(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Appointment', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Appointment', body.id, body);
    return { success: true };
  }

  const cm = custMap();
  const d = getTable('Appointment').map((a: any) => ({ ...a, customer: { id: a.customerId, name: cm[a.customerId]?.name || '', phone: cm[a.customerId]?.phone || '', email: cm[a.customerId]?.email || null } }));
  return { data: d, pagination: { page: 1, limit: 100, total: d.length, totalPages: 1 } };
}

function handleLabOrders(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('LabOrder', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('LabOrder', body.id, body);
    return { success: true };
  }

  const cm = custMap();
  const st = p.status;
  const orders = getTable('LabOrder').filter((o: any) => !st || st === 'all' || o.status === st).map((o: any) => ({ ...o, customerName: cm[o.customerId]?.name || null, customerPhone: cm[o.customerId]?.phone || null }));
  return { orders, totalPages: Math.ceil(orders.length / 20), total: orders.length };
}

function handleExpenses(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Expense', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Expense', body.id, body);
    return { success: true };
  }

  const d = getTable('Expense');
  return { data: d, pagination: { page: 1, limit: 20, total: d.length, totalPages: 1 }, summary: { totalAmount: d.reduce((a: number, e: any) => a + e.amount, 0) } };
}

function handleDues(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Due', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Due', body.id, body);
    return { success: true };
  }

  const cm = custMap();
  const d = getTable('Due').map((dd: any) => ({ ...dd, customer: { id: dd.customerId, name: cm[dd.customerId]?.name || '', phone: cm[dd.customerId]?.phone || '' } }));
  return { data: d, pagination: { page: 1, limit: 20, total: d.length, totalPages: 1 }, summary: { totalDue: d.reduce((a: number, dd: any) => a + dd.amount, 0), totalPaid: d.reduce((a: number, dd: any) => a + dd.paid, 0), totalOutstanding: d.reduce((a: number, dd: any) => a + dd.amount - dd.paid, 0) } };
}

function handleReports(p: Record<string, string>) {
  const type = p.type || '';
  const sales = getTable('Sale');
  const salesItems = getTable('SaleItem');
  const products = getTable('Product');
  const pm = prodMap();

  if (type === 'sales-trend') {
    const d = sales.map((s: any) => ({ date: (s.createdAt || '').toString().slice(0, 10), total: s.totalAmount, count: salesItems.filter((si: any) => si.saleId === s.id).length }));
    return { report: 'sales-trend', period: 'last-30-days', data: d };
  }
  if (type === 'top-products') {
    const ps: Record<string, { qty: number; rev: number }> = {};
    salesItems.forEach((si: any) => { if (!ps[si.productId]) ps[si.productId] = { qty: 0, rev: 0 }; ps[si.productId].qty += si.qty; ps[si.productId].rev += si.total || si.qty * si.price; });
    const d = Object.entries(ps).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10).map(([id, stats]) => { const pr = pm[id] || {}; return { productId: id, name: pr.name || '', sku: pr.sku || '', category: pr.category || '', brand: pr.brand || '', price: pr.price || 0, currentStock: pr.stock || 0, totalQtySold: stats.qty, totalRevenue: Math.round(stats.rev) }; });
    return { report: 'top-products', data: d };
  }
  if (type === 'top-customers') {
    const cm = custMap();
    const cs: Record<string, number> = {};
    sales.forEach((s: any) => { if (s.customerId) cs[s.customerId] = (cs[s.customerId] || 0) + s.totalAmount; });
    const d = Object.entries(cs).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, spent]) => { const c = cm[id] || {}; return { id, name: c.name || '', phone: c.phone || '', email: c.email, group: c.group, loyaltyPoints: c.loyaltyPoints || 0, totalSpent: spent, _count: { sales: 0, visits: 0, prescriptions: 0 } }; });
    return { report: 'top-customers', data: d };
  }
  if (type === 'inventory-turnover') {
    const ps: Record<string, number> = {};
    salesItems.forEach((si: any) => { ps[si.productId] = (ps[si.productId] || 0) + si.qty; });
    const d = products.filter(pr => pr.isActive !== false).map((p: any) => ({ productId: p.id, name: p.name, sku: p.sku, category: p.category, brand: p.brand, price: p.price, costPrice: p.costPrice, currentStock: p.stock, minStock: p.minStock, totalQtySold: ps[p.id] || 0, isActive: true, isLowStock: p.stock < p.minStock, turnoverRatio: p.stock > 0 ? parseFloat(((ps[p.id] || 0) / p.stock).toFixed(2)) : '0' }));
    return { report: 'inventory-turnover', totalProducts: products.length, data: d };
  }
  return { report: type, data: [] };
}

function handleStaff(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Staff', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Staff', body.id, body);
    return { success: true };
  }

  const d = getTable('Staff');
  return { data: d, pagination: { page: 1, limit: 100, total: d.length, totalPages: 1 } };
}

function handleNotifications(method: string, p: Record<string, string>, body: any) {
  if (method === 'PUT' && body?.id) {
    update('Notification', body.id, body);
    return { success: true };
  }

  let notifications = getTable('Notification');
  if (notifications.length === 0) {
    // Generate default notifications
    const products = getTable('Product');
    const labs = getTable('LabOrder');
    notifications = [
      { id: 'n1', title: 'Welcome to i Star Opticals CRM', message: 'Your CRM data is now live! All changes save to GitHub automatically.', type: 'success', isRead: false, link: null, createdAt: new Date().toISOString() },
      { id: 'n2', title: 'Low Stock Alert', message: `${products.filter((p: any) => p.stock < p.minStock).length} products are below minimum stock level.`, type: 'warning', isRead: false, link: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'n3', title: 'Lab Orders Pending', message: `${labs.filter((l: any) => l.status === 'Pending').length} lab orders need attention.`, type: 'warning', isRead: false, link: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
    ];
    // Save defaults
    notifications.forEach(n => insert('Notification', n));
  }
  return { notifications: notifications.slice(0, 20), unreadCount: notifications.filter((n: any) => !n.isRead).length };
}

function handlePurchaseOrders(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('PurchaseOrder', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('PurchaseOrder', body.id, body);
    return { success: true };
  }

  const d = getTable('PurchaseOrder');
  return { purchaseOrders: d, total: d.length, page: 1, totalPages: 1 };
}

function handleVisits(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Visit', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }

  const cm = custMap();
  const d = getTable('Visit').map((v: any) => ({ ...v, customer: { id: v.customerId, name: cm[v.customerId]?.name || '', phone: cm[v.customerId]?.phone || '', email: cm[v.customerId]?.email || null } }));
  return { data: d, total: d.length, page: 1, limit: 20, totalPages: Math.ceil(d.length / 20) };
}

function handleAccounting() {
  const sales = getTable('Sale');
  const expenses = getTable('Expense');
  const ti = sales.reduce((a: number, s: any) => a + s.totalAmount, 0);
  const te = expenses.reduce((a: number, e: any) => a + e.amount, 0);
  return { accounting: [], summary: { totalIncome: Math.round(ti), totalExpense: Math.round(te), netProfit: Math.round(ti - te) } };
}

function handleCampaigns(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Campaign', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Campaign', body.id, body);
    return { success: true };
  }

  const d = getTable('Campaign');
  return { data: d, pagination: { page: 1, limit: 25, total: d.length, totalPages: 1 } };
}

function handlePrescriptions(method: string, p: Record<string, string>, body: any) {
  if (method === 'POST') {
    const record = insert('Prescription', { ...body, createdAt: Date.now(), updatedAt: Date.now() });
    return { data: record, success: true };
  }
  if (method === 'PUT') {
    update('Prescription', body.id, body);
    return { success: true };
  }

  return { prescriptions: getTable('Prescription') };
}

function handleBackup() {
  const backup: Record<string, any> = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  TABLES.forEach(t => { backup.data[t] = getTable(t); });
  return backup;
}

async function handleRestore(body: any) {
  if (!body?.data) return { error: 'Invalid backup format' };
  for (const [table, records] of Object.entries(body.data)) {
    store[table] = records as any[];
    // Push each table to GitHub
    const { writeFile } = await import('@/lib/github-db');
    writeFile(`${table}.json`, records);
  }
  return { success: true, restored: Object.fromEntries(Object.entries(body.data).map(([k, v]: [string, any]) => [k, v.length])) };
}