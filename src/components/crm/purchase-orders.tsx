'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileText,
  Phone,
  RotateCcw,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCrmStore } from '@/components/crm/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface POItem {
  productId: string;
  name: string;
  qty: number;
  costPrice: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierPhone: string | null;
  status: string;
  items: string; // JSON
  totalAmount: number;
  receivedAt: string | null;
  notes: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  costPrice: number | null;
  supplier: string | null;
  supplierPhone: string | null;
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  Pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400', icon: Clock, label: 'Pending' },
  Ordered: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400', icon: Truck, label: 'Ordered' },
  PartiallyReceived: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400', icon: Package, label: 'Partial' },
  Received: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle2, label: 'Received' },
  Cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', icon: XCircle, label: 'Cancelled' },
};

const EMPTY_ITEM: POItem = { productId: '', name: '', qty: 1, costPrice: 0 };

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function PurchaseOrders() {
  const { darkMode } = useCrmStore();

  // List state
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusChipFilter, setStatusChipFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View dialog
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  // Form state
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [items, setItems] = useState<POItem[]>([{ ...EMPTY_ITEM }]);
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  // Inline status editing
  const [inlineStatusOrder, setInlineStatusOrder] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const inlineStatusRef = useRef<HTMLDivElement>(null);

  // Products for lookup
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // ─── Fetch orders ─────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusChipFilter !== 'all') params.set('status', statusChipFilter);
      const res = await fetch(`/api/purchase-orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setOrders(json.purchaseOrders || []);
      setTotalPages(json.totalPages || 1);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusChipFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Fetch products for autocomplete
  const fetchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setProducts([]); return; }
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`);
      if (!res.ok) return;
      const json = await res.json();
      setProducts(Array.isArray(json.products) ? json.products : (Array.isArray(json.data) ? json.data : []));
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch, fetchProducts]);

  // ─── Item handlers ────────────────────────────

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as Record<string, unknown>)[field] = value;
    // Auto-fill cost price from product
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].name = product.name;
        updated[index].costPrice = product.costPrice || 0;
      }
    }
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.qty * item.costPrice, 0);

  // ─── Dialog handlers ──────────────────────────

  const openCreateDialog = () => {
    setEditingOrder(null);
    setSupplier(''); setSupplierPhone(''); setNotes(''); setExpectedDate('');
    setItems([{ ...EMPTY_ITEM }]);
    setDialogOpen(true);
  };

  const openEditDialog = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSupplier(order.supplier);
    setSupplierPhone(order.supplierPhone || '');
    setNotes(order.notes || '');
    setExpectedDate(order.expectedDate ? order.expectedDate.split('T')[0] : '');
    try {
      const parsedItems = JSON.parse(order.items);
      setItems(Array.isArray(parsedItems) ? parsedItems : [{ ...EMPTY_ITEM }]);
    } catch {
      setItems([{ ...EMPTY_ITEM }]);
    }
    setDialogOpen(true);
  };

  // Unique supplier names from current order list (for combobox)
  const supplierSuggestions = useMemo(() => {
    const map = new Map<string, string>(); // name -> phone
    orders.forEach((o) => {
      if (o.supplier) {
        if (!map.has(o.supplier) && o.supplierPhone) {
          map.set(o.supplier, o.supplierPhone);
        }
      }
    });
    return map;
  }, [orders]);

  const supplierNameList = useMemo(() =>
    [...new Set(orders.map((o) => o.supplier).filter(Boolean))],
    [orders]
  );

  const [supplierComboboxOpen, setSupplierComboboxOpen] = useState(false);

  // Inline status handlers
  const startInlineStatusChange = (order: PurchaseOrder) => {
    setInlineStatusOrder(order.id);
    setNewStatus(order.status);
  };

  const confirmInlineStatusChange = async (orderId: string) => {
    if (!newStatus) { setInlineStatusOrder(null); return; }
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === newStatus) { setInlineStatusOrder(null); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, items: JSON.parse(order.items) }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Order ${order.poNumber} → ${newStatus}`);
      fetchOrders();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSubmitting(false);
      setInlineStatusOrder(null);
    }
  };

  // Close inline status on click outside
  useEffect(() => {
    if (!inlineStatusOrder) return;
    const handler = (e: MouseEvent) => {
      if (inlineStatusRef.current && !inlineStatusRef.current.contains(e.target as Node)) {
        setInlineStatusOrder(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inlineStatusOrder]);

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.name && i.qty > 0);
    if (!supplier.trim()) { toast.error('Supplier name is required'); return; }
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }

    setSubmitting(true);
    try {
      const url = editingOrder ? `/api/purchase-orders/${editingOrder.id}` : '/api/purchase-orders';
      const method = editingOrder ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        supplier, supplierPhone, items: validItems, notes, expectedDate,
      };
      if (editingOrder) body.status = editingOrder.status;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(editingOrder ? 'Purchase order updated' : 'Purchase order created');
      setDialogOpen(false);
      fetchOrders();
    } catch {
      toast.error('Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReorder = (order: PurchaseOrder) => {
    setEditingOrder(null);
    setSupplier(order.supplier);
    setSupplierPhone(order.supplierPhone || '');
    setNotes('');
    setExpectedDate('');
    try {
      const parsedItems = JSON.parse(order.items);
      // Reset qty and keep same items for reorder
      setItems(Array.isArray(parsedItems) ? parsedItems.map((i: POItem) => ({ ...i })) : [{ ...EMPTY_ITEM }]);
    } catch {
      setItems([{ ...EMPTY_ITEM }]);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`Delete ${order.poNumber}?`)) return;
    try {
      const res = await fetch(`/api/purchase-orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Purchase order deleted');
      fetchOrders();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Render ───────────────────────────────────

  return (
    <div className="px-3 sm:px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Purchase Orders</h2>
          {orders.length > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full">{orders.length}</Badge>
          )}
        </div>
        <Button onClick={openCreateDialog} className="min-h-[44px] touch-manipulation">
          <Plus className="mr-1 h-4 w-4" /> New PO
        </Button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Pending', 'Ordered', 'Received', 'Cancelled'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusChipFilter(s === 'All' ? 'all' : s); setPage(1); }}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
              statusChipFilter === (s === 'All' ? 'all' : s)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by supplier, PO#..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = orders.filter((o) => o.status === status).length;
          return (
            <Card key={status} className={cn(darkMode && 'border-gray-700 bg-gray-900', 'hover-lift rounded-xl')}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{cfg.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className={cn(darkMode && 'border-gray-700 bg-gray-900', 'hover-lift rounded-xl')}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-4">
              <ShoppingCart className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-base font-medium">No purchase orders found</p>
            <p className="text-sm mt-1 max-w-xs">Create your first purchase order to track supplier orders</p>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn(darkMode && 'border-gray-700 bg-gray-900', 'hover-lift rounded-xl')}>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={order.id} className="hover-lift transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                        <TableCell className="font-mono font-medium">{order.poNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.supplier}</div>
                            {order.supplierPhone && (
                              <div className="text-xs text-muted-foreground">{order.supplierPhone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {inlineStatusOrder === order.id ? (
                            <div ref={inlineStatusRef} className="relative">
                              <Select
                                value={newStatus}
                                onValueChange={(v) => {
                                  setNewStatus(v);
                                  confirmInlineStatusChange(order.id);
                                }}
                                open
                              >
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <button
                              onClick={() => startInlineStatusChange(order)}
                              className={cn('inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity', cfg.color)}
                              aria-label={`Change status from ${order.status}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(order.expectedDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => handleReorder(order)} title="Reorder">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => setViewOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => openEditDialog(order)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => handleDelete(order)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? `Edit ${editingOrder.poNumber}` : 'New Purchase Order'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? 'Update purchase order details' : 'Create a new purchase order to your supplier'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Supplier Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Supplier Name *</Label>
                <Popover open={supplierComboboxOpen} onOpenChange={setSupplierComboboxOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Type or search supplier..."
                        value={supplier}
                        onChange={(e) => {
                          setSupplier(e.target.value);
                          setSupplierComboboxOpen(true);
                        }}
                        onFocus={() => { if (supplierNameList.length > 0) setSupplierComboboxOpen(true); }}
                        className="pl-9"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="Search suppliers..." className="h-9" />
                      <CommandList className="max-h-48">
                        <CommandEmpty>No suppliers found.</CommandEmpty>
                        <CommandGroup>
                          {supplierNameList
                            .filter((s) => s.toLowerCase().includes(supplier.toLowerCase()))
                            .map((s) => (
                              <CommandItem
                                key={s}
                                value={s}
                                onSelect={() => {
                                  setSupplier(s);
                                  const phone = supplierSuggestions.get(s);
                                  if (phone) setSupplierPhone(phone);
                                  setSupplierComboboxOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', supplier === s ? 'opacity-100' : 'opacity-0')} />
                                {s}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Supplier Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  Total: {formatINR(totalAmount)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Items</Label>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg border dark:border-gray-700">
                    <div className="col-span-4">
                      {index === 0 && <Label className="text-xs text-muted-foreground">Product</Label>}
                      <Input
                        placeholder="Search product..."
                        value={item.productId ? item.name : productSearch}
                        onChange={(e) => {
                          if (!item.productId) setProductSearch(e.target.value);
                        }}
                        onFocus={() => { if (item.productId) { updateItem(index, 'productId', ''); setProductSearch(''); } }}
                      />
                      {productSearch && !item.productId && products.length > 0 && (
                        <div className="absolute z-10 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {products.map((p) => (
                            <button
                              key={p.id}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => {
                                updateItem(index, 'productId', p.id);
                                setProductSearch('');
                                setProducts([]);
                              }}
                            >
                              {p.name} <span className="text-muted-foreground">({p.sku})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3">
                      {index === 0 && <Label className="text-xs text-muted-foreground">Name</Label>}
                      <Input
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs text-muted-foreground">Cost Price</Label>}
                      <Input
                        type="number"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => updateItem(index, 'costPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => removeItem(index)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Order notes, payment terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editingOrder ? 'Update PO' : 'Create PO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Dialog ─── */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewOrder?.poNumber}
            </DialogTitle>
          </DialogHeader>
          {viewOrder && (() => {
            const cfg = STATUS_CONFIG[viewOrder.status] || STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            let parsedItems: POItem[] = [];
            try { parsedItems = JSON.parse(viewOrder.items); } catch {}

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Supplier</span>
                    <p className="font-medium">{viewOrder.supplier}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{viewOrder.supplierPhone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p>
                      <Badge className={cn(cfg.color, 'rounded-full text-[10px] sm:text-xs')}>
                        <StatusIcon className="mr-1 h-3 w-3" />{cfg.label}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="font-bold text-lg">{formatINR(viewOrder.totalAmount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected</span>
                    <p>{formatDate(viewOrder.expectedDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p>{formatDate(viewOrder.createdAt)}</p>
                  </div>
                  {viewOrder.receivedAt && (
                    <div>
                      <span className="text-muted-foreground">Received</span>
                      <p>{formatDate(viewOrder.receivedAt)}</p>
                    </div>
                  )}
                </div>

                {parsedItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <Label className="font-medium mb-2 block">Items ({parsedItems.length})</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedItems.map((item, i) => (
                            <TableRow key={i} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">{formatINR(item.costPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatINR(item.qty * item.costPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {viewOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{viewOrder.notes}</p>
                    </div>
                  </>
                )}

                {/* Quick Action Buttons */}
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {viewOrder.status !== 'Received' && viewOrder.status !== 'Cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        onClick={() => {
                          if (viewOrder) {
                            setNewStatus('Received');
                            setInlineStatusOrder(viewOrder.id);
                            setViewOrder(null);
                            // Directly call status change
                            const orderId = viewOrder.id;
                            const orderData = viewOrder;
                            (async () => {
                              setSubmitting(true);
                              try {
                                const res = await fetch(`/api/purchase-orders/${orderId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'Received', items: JSON.parse(orderData.items) }),
                                });
                                if (!res.ok) throw new Error('Failed');
                                toast.success(`Order ${orderData.poNumber} → Received`);
                                fetchOrders();
                              } catch {
                                toast.error('Failed to update status');
                              } finally {
                                setSubmitting(false);
                              }
                            })();
                          }
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Received
                      </Button>
                    )}
                    {parsedItems.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                        disabled
                      >
                        <Package className="h-3.5 w-3.5" />
                        View Items ({parsedItems.length})
                      </Button>
                    )}
                    {viewOrder.supplierPhone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                        onClick={() => window.open(`tel:${viewOrder.supplierPhone.replace(/\D/g, '')}`, '_self')}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Contact Supplier
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}