'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ─── Mock API: Patch fetch to fallback to seed data on static sites ─────────
// This hook must be called at the TOP of the app (in the root component)
// It patches window.fetch to intercept /api/* calls and return seed data
// when the real API is unavailable (static GitHub Pages deployment)
export function useMockApiFallback() {
  useEffect(() => {
    // Patch fetch globally
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
      if (url && url.includes('/api/')) {
        try {
          const res = await origFetch(input, init);
          if (res.ok) return res;
        } catch {}
        // API unavailable (static site) — return mock data if loaded
        if (window.__CRM_MOCK__) {
          const body = window.__CRM_MOCK__(url);
          if (body) return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
      return origFetch(input, init);
    };

    // Load seed data in background
    fetch('/i-star-opticals-crm/seed-data.json')
      .then(r => { if (r.ok) return r.json(); throw new Error('HTTP ' + r.status); })
      .then(data => {
        window.__CRM_MOCK__ = buildMockData(data);
        console.log('[CRM] Mock API active with', Object.keys(data).length, 'tables');
      })
      .catch(() => console.warn('[CRM] Seed data not available, using empty fallback'));
  }, []);
}

function buildMockData(data: Record<string, any[]>) {
  const custMap: Record<string, any> = {};
  (data.Customer || []).forEach((c: any) => { custMap[c.id] = c; });
  const prodMap: Record<string, any> = {};
  (data.Product || []).forEach((p: any) => { prodMap[p.id] = p; });
  const prescCount: Record<string, number> = {};
  (data.Prescription || []).forEach((p: any) => { prescCount[p.customerId] = (prescCount[p.customerId] || 0) + 1; });
  const visitCount: Record<string, number> = {};
  (data.Visit || []).forEach((v: any) => { visitCount[v.customerId] = (visitCount[v.customerId] || 0) + 1; });
  const salesCount: Record<string, number> = {};
  (data.Sale || []).forEach((s: any) => { if (s.customerId) salesCount[s.customerId] = (salesCount[s.customerId] || 0) + 1; });
  const siPerSale: Record<string, number> = {};
  (data.SaleItem || []).forEach((si: any) => { siPerSale[si.saleId] = (siPerSale[si.saleId] || 0) + 1; });

  const handlers: Record<string, (url: string) => string> = {};

  // Dashboard
  handlers['/api/dashboard'] = () => JSON.stringify({
    stats: {
      totalCustomers: (data.Customer || []).length,
      todaySales: Math.round((data.Sale || []).reduce((a: number, s: any) => a + s.totalAmount, 0)),
      monthlyRevenue: Math.round((data.Sale || []).reduce((a: number, s: any) => a + s.totalAmount, 0)),
      lowStockAlerts: (data.Product || []).filter((p: any) => p.isActive !== false && p.stock < p.minStock).length,
      pendingLabOrders: (data.LabOrder || []).filter((l: any) => l.status !== 'Delivered').length,
      pendingDues: Math.round((data.Due || []).filter((d: any) => d.status === 'Pending' || d.status === 'Partial').reduce((a: number, d: any) => a + d.amount - d.paid, 0)),
      overdueAppointments: 0,
    },
    recentSales: (data.Sale || []).slice(-5).reverse().map((s: any) => ({
      invoiceNo: s.invoiceNo, customerName: custMap[s.customerId]?.name || 'Walk-in', amount: s.totalAmount, date: s.createdAt, paymentMode: s.paymentMode,
    })),
    appointments: (data.Appointment || []).map((a: any) => {
      const d = new Date(a.date);
      return { time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), customerName: custMap[a.customerId]?.name || 'Unknown', purpose: a.purpose || 'General Visit', status: a.status === 'Confirmed' ? 'confirmed' : 'pending' };
    }),
    lowStock: (data.Product || []).filter((p: any) => p.isActive !== false && p.stock < p.minStock).slice(0, 5).map((p: any) => ({ name: p.name, stock: p.stock, minStock: p.minStock })),
    customerAcquisition: { thisMonth: (data.Customer || []).length, lastMonth: 0, byGroup: { New: (data.Customer || []).length, Regular: 0, Wholesale: 0, Premium: 0 } },
    revenueByDayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => ({
      day, revenue: Math.round((data.Sale || []).reduce((a, s) => a + s.totalAmount, 0)),
    })),
    comparison: { revenueChange: 12, customerChange: 8 },
    pendingTasks: {
      labOrdersPending: (data.LabOrder || []).filter((l: any) => l.status !== 'Delivered').length,
      duesOverdue: (data.Due || []).filter((d: any) => d.status === 'Overdue').length,
      appointmentsToday: (data.Appointment || []).length,
      lowStockItems: (data.Product || []).filter((p: any) => p.isActive !== false && p.stock < p.minStock).length,
    },
    todayPaymentModes: [{ mode: 'Cash', amount: Math.round((data.Sale || []).reduce((a: number, s: any) => a + (s.paymentMode === 'Cash' ? s.totalAmount : 0), 0)) }, { mode: 'UPI', amount: Math.round((data.Sale || []).reduce((a: number, s: any) => a + (s.paymentMode === 'UPI' ? s.totalAmount : 0), 0)) }, { mode: 'Card', amount: Math.round((data.Sale || []).reduce((a: number, s: any) => a + (s.paymentMode === 'Card' ? s.totalAmount : 0), 0)) }],
    todayAvgOrderValue: (data.Sale || []).length ? Math.round((data.Sale || []).reduce((a, s: any) => a + s.totalAmount, 0) / (data.Sale || []).length) : 0,
  });

  // Customers
  handlers['/api/customers'] = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const search = (params.get('search') || '').toLowerCase();
    const limit = parseInt(params.get('limit') || '20');
    const page = parseInt(params.get('page') || '1');
    const filtered = (data.Customer || []).filter((c: any) => !search || (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search));
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit).map((c: any) => ({ ...c, _count: { prescriptions: prescCount[c.id] || 0, visits: visitCount[c.id] || 0, sales: salesCount[c.id] || 0 } }));
    return JSON.stringify({ data: paged, total, page, limit, totalPages: Math.ceil(total / limit) });
  };

  // Sales
  handlers['/api/sales'] = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const limit = parseInt(params.get('limit') || '10');
    const page = parseInt(params.get('page') || '1');
    const reversed = [...(data.Sale || [])].reverse();
    const paged = reversed.slice((page - 1) * limit, page * limit).map((s: any) => ({
      id: s.id, invoiceNo: s.invoiceNo, customerName: custMap[s.customerId]?.name || 'Walk-in', itemsCount: siPerSale[s.id] || 0, subtotal: s.subtotal, discount: s.discount, cgst: s.cgst, sgst: s.sgst, total: s.totalAmount, paymentMode: s.paymentMode, status: s.status, createdAt: (s.createdAt || '').slice(0, 10),
    }));
    return JSON.stringify({ sales: paged, total: reversed.length, page, pageSize: limit });
  };

  // Products
  handlers['/api/products'] = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const limit = parseInt(params.get('pageSize') || params.get('limit') || '10');
    const page = parseInt(params.get('page') || '1');
    const prods = (data.Product || []).filter((p: any) => p.isActive !== false).reverse();
    const low = prods.filter((p: any) => p.stock < p.minStock);
    return JSON.stringify({ products: prods.slice((page - 1) * limit, page * limit), total: prods.length, page, pageSize: limit, totalPages: Math.ceil(prods.length / limit), lowStockCount: low.length, lowStockItems: low.slice(0, 20) });
  };

  // Low stock
  handlers['/api/products/low-stock'] = () => {
    const items = (data.Product || []).filter((p: any) => p.isActive !== false && p.stock < p.minStock).map((p: any) => ({
      id: p.id, name: p.name, category: p.category, brand: p.brand, stock: p.stock, minStock: p.minStock, needed: p.minStock - p.stock, sku: p.sku, costPrice: p.costPrice, reorderCost: (p.minStock - p.stock) * (p.costPrice || 0), supplier: p.supplier,
    }));
    return JSON.stringify({ total: items.length, items });
  };

  // Appointments
  handlers['/api/appointments'] = () => {
    const d = (data.Appointment || []).map((a: any) => ({ ...a, customer: { id: a.customerId, name: custMap[a.customerId]?.name || '', phone: custMap[a.customerId]?.phone || '', email: custMap[a.customerId]?.email || null } }));
    return JSON.stringify({ data: d, pagination: { page: 1, limit: 100, total: d.length, totalPages: 1 } });
  };

  // Lab orders
  handlers['/api/lab-orders'] = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const st = params.get('status');
    const orders = (data.LabOrder || []).filter((o: any) => !st || st === 'all' || o.status === st).map((o: any) => ({ ...o, customerName: custMap[o.customerId]?.name || null, customerPhone: custMap[o.customerId]?.phone || null }));
    return JSON.stringify({ orders, totalPages: Math.ceil(orders.length / 20), total: orders.length });
  };

  // Expenses
  handlers['/api/expenses'] = () => {
    const d = data.Expense || [];
    return JSON.stringify({ data: d, pagination: { page: 1, limit: 20, total: d.length, totalPages: 1 }, summary: { totalAmount: d.reduce((a: number, e: any) => a + e.amount, 0) } });
  };

  // Dues
  handlers['/api/dues'] = () => {
    const d = (data.Due || []).map((dd: any) => ({ ...dd, customer: { id: dd.customerId, name: custMap[dd.customerId]?.name || '', phone: custMap[dd.customerId]?.phone || '' } }));
    return JSON.stringify({ data: d, pagination: { page: 1, limit: 20, total: d.length, totalPages: 1 }, summary: { totalDue: d.reduce((a: number, dd: any) => a + dd.amount, 0), totalPaid: d.reduce((a: number, dd: any) => a + dd.paid, 0), totalOutstanding: d.reduce((a: number, dd: any) => a + dd.amount - dd.paid, 0) } });
  };

  // Reports
  handlers['/api/reports'] = (url: string) => {
    const type = new URLSearchParams(url.split('?')[1] || '').get('type') || '';
    if (type === 'sales-trend') {
      const d = (data.Sale || []).map((s: any) => ({ date: (s.createdAt || '').slice(0, 10), total: s.totalAmount, count: (data.SaleItem || []).filter((si: any) => si.saleId === s.id).length }));
      return JSON.stringify({ report: 'sales-trend', period: 'last-30-days', data: d });
    }
    if (type === 'top-products') {
      const ps: Record<string, { qty: number; rev: number }> = {};
      (data.SaleItem || []).forEach((si: any) => { if (!ps[si.productId]) ps[si.productId] = { qty: 0, rev: 0 }; ps[si.productId].qty += si.qty; ps[si.productId].rev += si.total || si.qty * si.price; });
      const d = Object.entries(ps).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10).map(([id, stats]) => { const p = prodMap[id] || {}; return { productId: id, name: p.name || '', sku: p.sku || '', category: p.category || '', brand: p.brand || '', price: p.price || 0, currentStock: p.stock || 0, totalQtySold: stats.qty, totalRevenue: Math.round(stats.rev) }; });
      return JSON.stringify({ report: 'top-products', data: d });
    }
    if (type === 'top-customers') {
      const cs: Record<string, number> = {};
      (data.Sale || []).forEach((s: any) => { if (s.customerId) cs[s.customerId] = (cs[s.customerId] || 0) + s.totalAmount; });
      const d = Object.entries(cs).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, spent]) => { const c = custMap[id] || {}; return { id, name: c.name || '', phone: c.phone || '', email: c.email, group: c.group, loyaltyPoints: c.loyaltyPoints || 0, totalSpent: spent, _count: { sales: 0, visits: 0, prescriptions: 0 } }; });
      return JSON.stringify({ report: 'top-customers', data: d });
    }
    if (type === 'inventory-turnover') {
      const ps: Record<string, number> = {};
      (data.SaleItem || []).forEach((si: any) => { ps[si.productId] = (ps[si.productId] || 0) + si.qty; });
      const d = (data.Product || []).filter(p => p.isActive !== false).map((p: any) => ({ productId: p.id, name: p.name, sku: p.sku, category: p.category, brand: p.brand, price: p.price, costPrice: p.costPrice, currentStock: p.stock, minStock: p.minStock, totalQtySold: ps[p.id] || 0, isActive: true, isLowStock: p.stock < p.minStock, turnoverRatio: p.stock > 0 ? parseFloat(((ps[p.id] || 0) / p.stock).toFixed(2)) : '0' }));
      return JSON.stringify({ report: 'inventory-turnover', totalProducts: (data.Product || []).length, data: d });
    }
    return JSON.stringify({ report: type, data: [] });
  };

  // Staff
  handlers['/api/staff'] = () => JSON.stringify({ data: data.Staff || [], pagination: { page: 1, limit: 100, total: (data.Staff || []).length, totalPages: 1 } });

  // Notifications
  handlers['/api/notifications'] = () => {
    const n = data.Notification || [];
    const demo = n.length > 0 ? n : [
      { id: 'n1', title: 'Welcome to i Star Opticals CRM', message: 'Your demo is loaded with real data. Explore all 12 sections!', type: 'success', isRead: false, link: null, createdAt: new Date().toISOString() },
      { id: 'n2', title: 'Low Stock Alert', message: `${(data.Product || []).filter((p: any) => p.stock < p.minStock).length} products are below minimum stock level.`, type: 'warning', isRead: false, link: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'n3', title: 'Lab Orders Pending', message: `${(data.LabOrder || []).filter((l: any) => l.status === 'Pending').length} lab orders need attention.`, type: 'warning', isRead: false, link: null, createdAt: new Date(Date.now() - 7200000).toISOString() },
    ];
    return JSON.stringify({ notifications: demo.slice(0, 20), unreadCount: demo.filter(x => !x.isRead).length });
  };

  // Purchase orders
  handlers['/api/purchase-orders'] = () => JSON.stringify({ purchaseOrders: data.PurchaseOrder || [], total: (data.PurchaseOrder || []).length, page: 1, totalPages: 1 });

  // Visits
  handlers['/api/visits'] = () => {
    const d = (data.Visit || []).map((v: any) => ({ ...v, customer: { id: v.customerId, name: custMap[v.customerId]?.name || '', phone: custMap[v.customerId]?.phone || '', email: custMap[v.customerId]?.email || null } }));
    return JSON.stringify({ data: d, total: d.length, page: 1, limit: 20, totalPages: Math.ceil(d.length / 20) });
  };

  // Accounting
  handlers['/api/accounting'] = () => {
    const ti = (data.Sale || []).reduce((a: number, s: any) => a + s.totalAmount, 0);
    const te = (data.Expense || []).reduce((a: number, e: any) => a + e.amount, 0);
    return JSON.stringify({ accounting: [], summary: { totalIncome: Math.round(ti), totalExpense: Math.round(te), netProfit: Math.round(ti - te) } });
  };

  // Campaigns
  handlers['/api/campaigns'] = () => JSON.stringify({ data: data.Campaign || [], pagination: { page: 1, limit: 25, total: (data.Campaign || []).length, totalPages: 1 } });

  // Prescriptions
  handlers['/api/prescriptions'] = () => JSON.stringify({ prescriptions: data.Prescription || [] });

  // Return a router function
  return (url: string) => {
    const path = url.includes('?') ? url.split('?')[0] : url;
    for (const route of Object.keys(handlers)) {
      if (path.includes(route)) return handlers[route](url);
    }
    return null;
  };
}