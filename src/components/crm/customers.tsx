'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Eye,
  ShoppingCart,
  FileText,
  Clock,
  IndianRupee,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  X,
  Stethoscope,
  History,
  Receipt,
  Download,
  MessageCircle,
  AlertTriangle,
  Upload,
  Gift,
  Star,
  Check,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useCrmStore } from '@/components/crm/store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  dob?: string | null;
  address?: string | null;
  aadhar?: string | null;
  group: 'New' | 'Regular' | 'Wholesale' | 'Premium';
  loyaltyPoints: number;
  totalSpent: number;
  createdAt: string;
}

interface Prescription {
  id: string;
  customerId: string;
  date: string;
  leftSph?: number | null;
  leftCyl?: number | null;
  leftAxis?: number | null;
  leftPd?: number | null;
  rightSph?: number | null;
  rightCyl?: number | null;
  rightAxis?: number | null;
  rightPd?: number | null;
  notes?: string | null;
}

interface Visit {
  id: string;
  customerId: string;
  date: string;
  purpose: string;
  notes?: string | null;
}

interface Due {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  description?: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  aadhar: string;
  group: Customer['group'];
}

interface PrescriptionFormData {
  date: string;
  leftSph: string;
  leftCyl: string;
  leftAxis: string;
  leftPd: string;
  rightSph: string;
  rightCyl: string;
  rightAxis: string;
  rightPd: string;
  notes: string;
}

interface VisitFormData {
  date: string;
  purpose: string;
  notes: string;
}

interface CustomerPurchase {
  id: string;
  invoiceNo: string;
  total: number;
  status: string;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_BADGE_VARIANT: Record<Customer['group'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  New: 'secondary',
  Regular: 'default',
  Wholesale: 'outline',
  Premium: 'destructive',
};

const GROUP_COLORS: Record<Customer['group'], string> = {
  New: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Regular: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Wholesale: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  Premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

const GROUP_LIST: Customer['group'][] = ['New', 'Regular', 'Wholesale', 'Premium'];

const GROUP_DESCRIPTIONS: Record<Customer['group'], string> = {
  New: 'First-time visitor',
  Regular: 'Repeat customer',
  Wholesale: 'Bulk buyer / B2B',
  Premium: 'VIP / high-value',
};

const QUICK_FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'New', label: 'New' },
  { value: 'Regular', label: 'Regular' },
  { value: 'Wholesale', label: 'Wholesale' },
  { value: 'Premium', label: 'Premium' },
  { value: 'with-dues', label: 'With Dues' },
  { value: 'recent', label: 'Recent' },
] as const;

type QuickFilterValue = (typeof QUICK_FILTER_CHIPS)[number]['value'];

const SORT_OPTIONS = [
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'name:desc', label: 'Name (Z-A)' },
  { value: 'createdAt:desc', label: 'Recent First' },
  { value: 'createdAt:asc', label: 'Oldest First' },
  { value: 'totalSpent:desc', label: 'Total Spent ↑' },
  { value: 'totalSpent:asc', label: 'Total Spent ↓' },
  { value: 'loyaltyPoints:desc', label: 'Points ↑' },
] as const;

const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  dob: '',
  address: '',
  aadhar: '',
  group: 'New',
};

const EMPTY_PRESCRIPTION_FORM: PrescriptionFormData = {
  date: new Date().toISOString().split('T')[0],
  leftSph: '',
  leftCyl: '',
  leftAxis: '',
  leftPd: '',
  rightSph: '',
  rightCyl: '',
  rightAxis: '',
  rightPd: '',
  notes: '',
};

const EMPTY_VISIT_FORM: VisitFormData = {
  date: new Date().toISOString().split('T')[0],
  purpose: '',
  notes: '',
};

const PAGE_LIMIT = 20;

const POWER_PRESET_VALUES = [
  -6.00, -4.00, -2.00, -1.50, -1.00, -0.75, -0.50, -0.25, 0, +0.25, +0.50, +0.75, +1.00, +1.50, +2.00,
];

const VISIT_PURPOSE_OPTIONS = [
  'Eye Check',
  'Frame Selection',
  'Lens Fitting',
  'Delivery',
  'Follow-up',
  'Repair',
  'General',
  'Other',
] as const;

type SortField = 'name' | 'phone' | 'group' | 'loyaltyPoints' | 'totalSpent' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatEyePower(
  sph?: number | null,
  cyl?: number | null,
  axis?: number | null,
  pd?: number | null
): string {
  const parts: string[] = [];
  if (sph !== null && sph !== undefined) parts.push(`SPH ${sph > 0 ? '+' : ''}${sph}`);
  if (cyl !== null && cyl !== undefined && cyl !== 0) parts.push(`CYL ${cyl > 0 ? '+' : ''}${cyl}`);
  if (axis !== null && axis !== undefined && axis !== 0) parts.push(`AX ${axis}°`);
  if (pd !== null && pd !== undefined) parts.push(`PD ${pd}`);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

function getSevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Customers() {
  // List state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Quick filter chips state
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Detail panel state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Customer dialog state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);
  const [customerFormErrors, setCustomerFormErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  // Prescription dialog state
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormData>(EMPTY_PRESCRIPTION_FORM);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);

  // Visit dialog state
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormData>(EMPTY_VISIT_FORM);
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  // Loyalty dialog state
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  const [loyaltyType, setLoyaltyType] = useState<'earn' | 'redeem'>('earn');
  const [loyaltyPoints, setLoyaltyPoints] = useState('');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [loyaltySubmitting, setLoyaltySubmitting] = useState(false);

  // Purchase history state
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  // ─── Quick filter handler ────────────────────────────────────────────

  const handleQuickFilterChange = (value: QuickFilterValue) => {
    setQuickFilter(value);
    setSelectedIds(new Set());
    setPage(1);

    if (value === 'all') {
      setGroupFilter('all');
      setFromDate('');
      setToDate('');
    } else if (value === 'with-dues') {
      // Keep existing group/date filters; the API param handles it
    } else if (value === 'recent') {
      setFromDate(getSevenDaysAgo());
      setToDate('');
      // Don't change group filter
    } else {
      // It's a group name
      setGroupFilter(value);
      setFromDate('');
      setToDate('');
    }
  };

  // Compute derived sort value for the sort dropdown
  const sortValue = `${sortField}:${sortDir}`;

  const handleSortDropdownChange = (value: string) => {
    const [field, dir] = value.split(':') as [SortField, SortDir];
    setSortField(field);
    setSortDir(dir);
    setPage(1);
  };

  // ─── Fetch customers ───────────────────────────────────────────────────

  const handleGroupFilterChange = (value: string) => {
    setGroupFilter(value);
    setPage(1);
    // Sync quick filter: if the value matches a chip, select it; otherwise "all"
    if (value === 'all') {
      if (quickFilter === 'with-dues' || quickFilter === 'recent') {
        // Keep the special quick filter active
      } else {
        setQuickFilter('all');
      }
    } else if (GROUP_LIST.includes(value as Customer['group'])) {
      setQuickFilter(value as QuickFilterValue);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 size-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="ml-1 size-3" /> : <ArrowDown className="ml-1 size-3" />;
  };

  // ─── WhatsApp helper ──────────────────────────────────────────────────
  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${name}, this is i Star Opticals. We value your visit!`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─── CSV Export ───────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async (customerList?: Customer[]) => {
    setExporting(true);
    try {
      if (customerList) {
        // Export specific list (bulk selected)
        const headers = ['Name', 'Phone', 'Email', 'Group', 'Points', 'Total Spent', 'DOB', 'Address', 'Created At'];
        const rows = customerList.map((c) => [
          c.name,
          c.phone,
          c.email || '',
          c.group,
          String(c.loyaltyPoints),
          String(c.totalSpent),
          c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : '',
          c.address || '',
          new Date(c.createdAt).toLocaleDateString('en-IN'),
        ]);
        const csvContent = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_selected_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${customerList.length} customer(s)`);
      } else {
        // Export all based on current filters
        const params = new URLSearchParams({ limit: '9999' });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (groupFilter !== 'all') params.set('group', groupFilter);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
        const res = await fetch(`/api/customers?${params}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json: PaginatedResponse<Customer> = await res.json();
        const allCustomers = json.data;

        const headers = ['Name', 'Phone', 'Email', 'Group', 'Points', 'Total Spent', 'DOB', 'Address', 'Created At'];
        const rows = allCustomers.map((c) => [
          c.name,
          c.phone,
          c.email || '',
          c.group,
          String(c.loyaltyPoints),
          String(c.totalSpent),
          c.dob ? new Date(c.dob).toLocaleDateString('en-IN') : '',
          c.address || '',
          new Date(c.createdAt).toLocaleDateString('en-IN'),
        ]);
        const csvContent = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // ─── Bulk actions ─────────────────────────────────────────────────────

  const toggleSelectCustomer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const handleBulkWhatsApp = () => {
    const selected = customers.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    // Open WhatsApp for the first selected customer
    openWhatsApp(selected[0].phone, selected[0].name);
    if (selected.length > 1) {
      toast.info(`WhatsApp opened for ${selected[0].name}. ${selected.length - 1} more selected.`);
    }
  };

  const handleBulkExport = () => {
    const selected = customers.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    handleExportCSV(selected);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${ids.length} customer(s)? This action cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/customers/${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`Deleted ${ids.length - failed} customer(s). ${failed} failed.`);
      } else {
        toast.success(`Deleted ${ids.length} customer(s) successfully.`);
      }
      setSelectedIds(new Set());
      fetchCustomers();
    } catch {
      toast.error('Failed to delete customers');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (groupFilter !== 'all') params.set('group', groupFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      params.set('sort', `${sortField}:${sortDir}`);
      // Special quick filter params
      if (quickFilter === 'with-dues') params.set('hasDues', 'true');

      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch customers (HTTP ${res.status})`);
      const json: PaginatedResponse<Customer> = await res.json();
      // Duplicate phone detection
      const phoneMap = new Map<string, number>();
      json.data.forEach((c) => {
        const cleaned = c.phone.replace(/\D/g, '');
        phoneMap.set(cleaned, (phoneMap.get(cleaned) || 0) + 1);
      });
      const dupes = Array.from(phoneMap.entries()).filter(([, count]) => count > 1);
      setDuplicateWarning(dupes.length > 0 ? `${dupes.length} duplicate phone number(s) found` : null);
      setCustomers(json.data);
      setTotalPages(json.totalPages);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, groupFilter, sortField, sortDir, fromDate, toDate, quickFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ─── Fetch customer details ────────────────────────────────────────────

  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setPurchases([]);
    try {
      const [prescRes, visitRes, dueRes, purchaseRes] = await Promise.all([
        fetch(`/api/prescriptions?customerId=${customerId}`),
        fetch(`/api/visits?customerId=${customerId}`),
        fetch(`/api/dues?customerId=${customerId}`),
        fetch(`/api/sales?customerId=${customerId}&limit=50`),
      ]);

      if (!prescRes.ok) throw new Error('Failed to fetch prescriptions');
      if (!visitRes.ok) throw new Error('Failed to fetch visit history');
      if (!dueRes.ok) throw new Error('Failed to fetch dues');

      const prescJson = await prescRes.json();
      const visitJson = await visitRes.json();
      const dueJson = await dueRes.json();

      setPrescriptions(Array.isArray(prescJson.data) ? prescJson.data : prescJson || []);
      setVisits(Array.isArray(visitJson.data) ? visitJson.data : visitJson || []);
      setDues(Array.isArray(dueJson.data) ? dueJson.data : dueJson || []);

      // Fetch purchase history
      if (purchaseRes.ok) {
        const purchaseJson = await purchaseRes.json();
        const saleList = Array.isArray(purchaseJson.sales) ? purchaseJson.sales : [];
        setPurchases(saleList.map((s: { id: string; invoiceNo: string; total: number; status: string; createdAt: string }) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          total: s.total,
          status: s.status,
          createdAt: s.createdAt,
        })));
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Debounced search ────────────────────────────────────────────────

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
    // If user manually changes the date, deselect "Recent" quick filter
    if (quickFilter === 'recent' && value !== getSevenDaysAgo()) {
      setQuickFilter('all');
    }
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  const hasActiveFilters = searchQuery || groupFilter !== 'all' || fromDate || toDate || quickFilter === 'with-dues' || quickFilter === 'recent';

  const handleClearFilters = () => {
    setSearchQuery('');
    setGroupFilter('all');
    setFromDate('');
    setToDate('');
    setQuickFilter('all');
    setPage(1);
    setSelectedIds(new Set());
  };

  // ─── Customer form handlers ────────────────────────────────────────────

  const openAddCustomerDialog = () => {
    setEditingCustomer(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormErrors({});
    setCustomerDialogOpen(true);
  };

  const openEditCustomerDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      dob: customer.dob || '',
      address: customer.address || '',
      aadhar: customer.aadhar || '',
      group: customer.group,
    });
    setCustomerFormErrors({});
    setCustomerDialogOpen(true);
  };

  const validateCustomerForm = (): boolean => {
    const errors: Partial<Record<keyof CustomerFormData, string>> = {};
    if (!customerForm.name.trim()) errors.name = 'Name is required';
    if (!customerForm.phone.trim()) errors.phone = 'Phone is required';
    else if (!/^\+?[\d\s-]{7,15}$/.test(customerForm.phone.trim()))
      errors.phone = 'Enter a valid phone number';
    if (customerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email))
      errors.email = 'Enter a valid email';
    // Duplicate phone check (exclude current editing customer)
    const cleaned = customerForm.phone.replace(/\D/g, '');
    const isDuplicate = customers.some(
      (c) => c.phone.replace(/\D/g, '') === cleaned && c.id !== editingCustomer?.id
    );
    if (isDuplicate) errors.phone = 'This phone number already exists!';
    setCustomerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCustomerSubmit = async () => {
    if (!validateCustomerForm()) return;
    setCustomerSubmitting(true);
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to ${editingCustomer ? 'update' : 'create'} customer`);
      }
      setCustomerDialogOpen(false);
      fetchCustomers();
      // If we're editing the currently viewed customer, refresh details
      if (editingCustomer && selectedCustomer?.id === editingCustomer.id) {
        const updated: Customer = { ...editingCustomer, ...customerForm };
        setSelectedCustomer(updated);
      }
    } catch (err) {
      setCustomerFormErrors({
        _form: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setCustomerSubmitting(false);
    }
  };

  // ─── Customer selection (detail panel) ─────────────────────────────────

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetails(customer.id);
  };

  const handleCloseDetail = () => {
    setSelectedCustomer(null);
    setPrescriptions([]);
    setVisits([]);
    setDues([]);
    setDetailError(null);
  };

  // ─── Prescription handlers ─────────────────────────────────────────────

  const openPrescriptionDialog = () => {
    setPrescriptionForm(EMPTY_PRESCRIPTION_FORM);
    setPrescriptionDialogOpen(true);
  };

  const handlePrescriptionSubmit = async () => {
    if (!selectedCustomer || !prescriptionForm.date) return;
    setPrescriptionSubmitting(true);
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          ...prescriptionForm,
          leftSph: prescriptionForm.leftSph ? parseFloat(prescriptionForm.leftSph) : null,
          leftCyl: prescriptionForm.leftCyl ? parseFloat(prescriptionForm.leftCyl) : null,
          leftAxis: prescriptionForm.leftAxis ? parseFloat(prescriptionForm.leftAxis) : null,
          leftPd: prescriptionForm.leftPd ? parseFloat(prescriptionForm.leftPd) : null,
          rightSph: prescriptionForm.rightSph ? parseFloat(prescriptionForm.rightSph) : null,
          rightCyl: prescriptionForm.rightCyl ? parseFloat(prescriptionForm.rightCyl) : null,
          rightAxis: prescriptionForm.rightAxis ? parseFloat(prescriptionForm.rightAxis) : null,
          rightPd: prescriptionForm.rightPd ? parseFloat(prescriptionForm.rightPd) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to add prescription');
      }
      setPrescriptionDialogOpen(false);
      fetchCustomerDetails(selectedCustomer.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prescription');
    } finally {
      setPrescriptionSubmitting(false);
    }
  };

  // ─── Visit handlers ────────────────────────────────────────────────────

  const openVisitDialog = () => {
    setVisitForm(EMPTY_VISIT_FORM);
    setVisitDialogOpen(true);
  };

  const handleVisitSubmit = async () => {
    if (!selectedCustomer || !visitForm.date || !visitForm.purpose.trim()) return;
    setVisitSubmitting(true);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          ...visitForm,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to add visit');
      }
      setVisitDialogOpen(false);
      fetchCustomerDetails(selectedCustomer.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save visit');
    } finally {
      setVisitSubmitting(false);
    }
  };

  // ─── Loyalty handlers ────────────────────────────────────────────────

  const openLoyaltyDialog = (type: 'earn' | 'redeem') => {
    setLoyaltyType(type);
    setLoyaltyPoints('');
    setLoyaltyReason('');
    setLoyaltyDialogOpen(true);
  };

  const handleLoyaltySubmit = async () => {
    if (!selectedCustomer) return;
    const pts = parseInt(loyaltyPoints, 10);
    if (!pts || pts <= 0) {
      toast.error('Please enter valid points');
      return;
    }
    if (loyaltyType === 'redeem' && pts > selectedCustomer.loyaltyPoints) {
      toast.error(`Only ${selectedCustomer.loyaltyPoints} points available`);
      return;
    }
    setLoyaltySubmitting(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/loyalty`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: loyaltyType === 'earn' ? pts : -pts,
          reason: loyaltyReason.trim(),
          type: loyaltyType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to update points');
      }
      const result = await res.json();
      toast.success(result.message);
      setLoyaltyDialogOpen(false);
      // Refresh customer data
      setSelectedCustomer({ ...selectedCustomer, loyaltyPoints: result.loyaltyPoints });
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update loyalty points');
    } finally {
      setLoyaltySubmitting(false);
    }
  };

  // ─── CSV Import handler ──────────────────────────────────────────────

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Import failed');
      }
      const result = await res.json();
      toast.success(`Imported ${result.imported} customers${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
      if (result.errors?.length) {
        toast.warning(`${result.errors.length} row(s) had errors and were skipped`);
      }
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────

  const renderGroupBadge = (group: Customer['group']) => (
    <Badge variant={GROUP_BADGE_VARIANT[group]} className={cn(GROUP_COLORS[group], 'rounded-full')}>
      {group}
    </Badge>
  );

  // ─── Loading skeleton for table ────────────────────────────────────────

  const renderTableSkeleton = () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  // ─── Quick Action Button component for detail panel ───────────────────

  const QuickActionButton = ({ icon: Icon, label, onClick, variant = 'default' }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'whatsapp' | 'call';
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-all duration-150 min-w-[44px] min-h-[44px] touch-manipulation',
        variant === 'whatsapp' && 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-950',
        variant === 'call' && 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950',
        variant === 'default' && 'hover:bg-accent'
      )}
      aria-label={label}
    >
      <Icon className="size-5 shrink-0" />
      <span className="text-[10px] leading-tight font-medium">{label}</span>
    </button>
  );

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-4 md:px-6 py-4 md:py-6">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {total} customer{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={openAddCustomerDialog} className="flex-1 sm:flex-none min-h-[44px] touch-manipulation">
              <Plus className="mr-2 size-4" />
              Add Customer
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none min-h-[44px] touch-manipulation" disabled={importing} onClick={() => importInputRef.current?.click()}>
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Import CSV
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVImport}
            />
            <Button variant="outline" onClick={() => handleExportCSV()} className="flex-1 sm:flex-none min-h-[44px] touch-manipulation" disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              Export CSV
            </Button>
          </div>
      </div>

      {/* ─── Quick Filter Chips ─────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {QUICK_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => handleQuickFilterChange(chip.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors min-w-[44px] min-h-[44px] touch-manipulation border',
              quickFilter === chip.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ─── Search + Filters Bar ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 touch-manipulation"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-end gap-2 flex-shrink-0 flex-wrap">
          {/* Sort Dropdown */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <Select value={sortValue} onValueChange={handleSortDropdownChange}>
              <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
            <SelectTrigger className="w-full sm:w-36 min-h-[44px]">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {GROUP_LIST.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="w-full sm:w-36"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              className="w-full sm:w-36"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="min-h-[44px] touch-manipulation">
              <X className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>
      {duplicateWarning && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            {duplicateWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* ─── Customer Table ────────────────────────────────────────── */}
      <Card className="hover-lift">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all customers"
                    className="size-4"
                  />
                </TableHead>
                <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                </TableHead>
                <TableHead className="min-w-[200px] cursor-pointer select-none" onClick={() => handleSort('phone')}>
                  <div className="flex items-center gap-1">Phone <SortIcon field="phone" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('group')}>
                  <div className="flex items-center gap-1">Group <SortIcon field="group" /></div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('loyaltyPoints')}>
                  <div className="flex items-center justify-end gap-1">Points <SortIcon field="loyaltyPoints" /></div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('totalSpent')}>
                  <div className="flex items-center justify-end gap-1">Total Spent <SortIcon field="totalSpent" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Created <SortIcon field="createdAt" /></div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="size-8 text-destructive" />
                      <p className="text-sm text-destructive">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchCustomers} className="min-h-[44px] touch-manipulation">
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                renderTableSkeleton()
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <User className="size-8" />
                      <p className="text-sm">
                        {searchQuery ? 'No customers found for your search.' : 'No customers yet.'}
                      </p>
                      {!searchQuery && (
                        <Button variant="outline" size="sm" onClick={openAddCustomerDialog} className="min-h-[44px] touch-manipulation">
                          <Plus className="mr-1 size-3" />
                          Add your first customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
                      selectedIds.has(customer.id) && 'bg-primary/5'
                    )}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(customer.id)}
                        onCheckedChange={() => toggleSelectCustomer(customer.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${customer.name}`}
                        className="size-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums">{customer.phone}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(customer.phone, customer.name);
                          }}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors shrink-0 touch-manipulation"
                          aria-label={`WhatsApp ${customer.name}`}
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell><span className="hidden xs:inline-flex">{renderGroupBadge(customer.group)}</span></TableCell>
                    <TableCell className="text-right tabular-nums">
                      {customer.loyaltyPoints.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(customer.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 transition-all duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] touch-manipulation transition-all duration-150"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCustomer(customer);
                          }}
                          aria-label="View details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] touch-manipulation transition-all duration-150"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCustomerDialog(customer);
                          }}
                          aria-label="Edit customer"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>

        {/* ─── Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-w-[44px] min-h-[44px] touch-manipulation"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-w-[44px] min-h-[44px] touch-manipulation"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Bulk Actions Bar ─────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:bottom-6">
          <span className="text-sm font-medium tabular-nums whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkWhatsApp}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <MessageCircle className="mr-1.5 size-4 text-emerald-600" />
            <span className="hidden sm:inline">Send WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkExport}
            disabled={exporting}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
          >
            {exporting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
            <span className="hidden sm:inline">Export Selected</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="min-w-[44px] min-h-[44px] touch-manipulation border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
          >
            {bulkDeleting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Trash2 className="mr-1.5 size-4" />}
            <span className="hidden sm:inline">Delete Selected</span>
            <span className="sm:hidden">Delete</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* ─── Customer Detail Panel (Drawer/Sheet-like) ────────────────── */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) handleCloseDetail();
        }}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          {selectedCustomer ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  {selectedCustomer.name}
                  {renderGroupBadge(selectedCustomer.group)}
                </DialogTitle>
                <DialogDescription>Customer details and history</DialogDescription>
              </DialogHeader>

              {/* Quick Action Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                <QuickActionButton
                  icon={Phone}
                  label="Call"
                  variant="call"
                  onClick={() => {
                    const cleanPhone = selectedCustomer.phone.replace(/\D/g, '');
                    window.open(`tel:+91${cleanPhone}`, '_self');
                  }}
                />
                <QuickActionButton
                  icon={MessageCircle}
                  label="WhatsApp"
                  variant="whatsapp"
                  onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                />
                <QuickActionButton
                  icon={ShoppingCart}
                  label="New Sale"
                  onClick={() => {
                    handleCloseDetail();
                    useCrmStore.getState().setActiveSection('sales');
                  }}
                />
                <QuickActionButton
                  icon={Calendar}
                  label="New Appointment"
                  onClick={() => openVisitDialog()}
                />
                <QuickActionButton
                  icon={FileText}
                  label="New Prescription"
                  onClick={() => openPrescriptionDialog()}
                />
              </div>

              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="text-muted-foreground size-4 shrink-0" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.dob && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="text-muted-foreground size-4 shrink-0" />
                    <span>DOB: {formatDate(selectedCustomer.dob)}</span>
                  </div>
                )}
                {selectedCustomer.aadhar && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="text-muted-foreground size-4 shrink-0" />
                    <span>Aadhar: {selectedCustomer.aadhar}</span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-start gap-2 text-sm sm:col-span-2">
                    <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground text-xs">Points</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedCustomer.loyaltyPoints.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground text-xs">Total Spent</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground text-xs">Outstanding</p>
                  <p className="text-lg font-semibold tabular-nums text-destructive">
                    {formatCurrency(
                      dues
                        .filter((d) => d.status === 'pending' || d.status === 'overdue')
                        .reduce((sum, d) => sum + d.amount, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Additional quick actions */}
              <div className="flex flex-wrap gap-2 transition-all duration-150">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] touch-manipulation transition-all duration-150"
                  onClick={() => openLoyaltyDialog('earn')}
                >
                  <Gift className="mr-1.5 size-3.5" />
                  Earn Points
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] touch-manipulation transition-all duration-150"
                  onClick={() => openLoyaltyDialog('redeem')}
                >
                  <Star className="mr-1.5 size-3.5" />
                  Redeem Points
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] touch-manipulation transition-all duration-150"
                  onClick={() => {
                    setCustomerFormErrors({});
                    openEditCustomerDialog(selectedCustomer);
                  }}
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  Edit Customer
                </Button>
              </div>

              <Separator />

              {/* Tabs: Prescriptions, Visit History, Dues */}
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-muted-foreground size-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <AlertCircle className="size-6 text-destructive" />
                  <p className="text-sm text-destructive">{detailError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchCustomerDetails(selectedCustomer.id)}
                    className="min-h-[44px] touch-manipulation"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="prescriptions" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="prescriptions" className="flex-1">
                      <FileText className="mr-1.5 size-3.5" />
                      Prescriptions
                      {prescriptions.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs rounded-full">
                          {prescriptions.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="visits" className="flex-1">
                      <Clock className="mr-1.5 size-3.5" />
                      Visits
                      {visits.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs rounded-full">
                          {visits.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="purchases" className="flex-1">
                      <Receipt className="mr-1.5 size-3.5" />
                      Purchases
                      {purchases.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs rounded-full">
                          {purchases.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="dues" className="flex-1">
                      <IndianRupee className="mr-1.5 size-3.5" />
                      Dues
                      {dues.filter((d) => d.status !== 'paid').length > 0 && (
                        <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs rounded-full">
                          {dues.filter((d) => d.status !== 'paid').length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Prescriptions Tab */}
                  <TabsContent value="prescriptions">
                    <ScrollArea className="max-h-72">
                      {prescriptions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                          <FileText className="size-8" />
                          <p className="text-sm">No prescriptions recorded yet.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openPrescriptionDialog}
                            className="min-h-[44px] touch-manipulation"
                          >
                            <Plus className="mr-1 size-3" />
                            Add First Prescription
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {prescriptions.map((rx) => (
                            <Card key={rx.id} className="hover-lift">
                              <CardHeader className="p-3 pb-0">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium">
                                    {formatDate(rx.date)}
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
                                      Left Eye
                                    </p>
                                    <p className="text-sm">
                                      {formatEyePower(
                                        rx.leftSph,
                                        rx.leftCyl,
                                        rx.leftAxis,
                                        rx.leftPd
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
                                      Right Eye
                                    </p>
                                    <p className="text-sm">
                                      {formatEyePower(
                                        rx.rightSph,
                                        rx.rightCyl,
                                        rx.rightAxis,
                                        rx.rightPd
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {rx.notes && (
                                  <p className="text-muted-foreground mt-2 border-t pt-2 text-xs">
                                    {rx.notes}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Visits Tab - Timeline View */}
                  <TabsContent value="visits">
                    <ScrollArea className="max-h-72">
                      {visits.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                          <Clock className="size-8" />
                          <p className="text-sm">No visit history yet.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openVisitDialog}
                            className="min-h-[44px] touch-manipulation"
                          >
                            <Plus className="mr-1 size-3" />
                            Add First Visit
                          </Button>
                        </div>
                      ) : (
                        <div className="relative pl-6">
                          {/* Vertical line */}
                          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />
                          <div className="flex flex-col gap-4 py-2">
                            {visits.map((visit) => (
                              <div key={visit.id} className="relative flex gap-3">
                                {/* Dot on the line */}
                                <div className="absolute left-[-15px] top-1.5 size-3.5 rounded-full border-2 border-background bg-emerald-500 z-10" />
                                <div className="flex-1 min-w-0 rounded-lg border p-3">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="text-sm font-medium truncate">
                                      {visit.purpose}
                                    </p>
                                    <span className="text-muted-foreground shrink-0 text-xs">
                                      {formatRelativeTime(visit.date)}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground text-xs mb-1">
                                    {formatDate(visit.date)}
                                  </p>
                                  {visit.notes && (
                                    <p className="text-muted-foreground text-xs line-clamp-2 border-t pt-1 mt-1">
                                      {visit.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Purchases Tab */}
                  <TabsContent value="purchases">
                    <ScrollArea className="max-h-72">
                      {purchases.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                          <Receipt className="size-8" />
                          <p className="text-sm">No purchase history yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Invoice #</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((p) => (
                              <TableRow key={p.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
                                <TableCell className="text-right font-mono text-xs font-medium">
                                  {formatCurrency(p.total)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDate(p.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      p.status === 'Completed' ? 'default' : p.status === 'Pending' ? 'secondary' : 'outline'
                                    }
                                    className="text-[10px] px-1.5 py-0 rounded-full"
                                  >
                                    {p.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Dues Tab */}
                  <TabsContent value="dues">
                    <ScrollArea className="max-h-72">
                      {dues.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                          <Receipt className="size-8" />
                          <p className="text-sm">No dues recorded.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {dues.map((due) => (
                            <div
                              key={due.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                                    due.status === 'paid'
                                      ? 'bg-emerald-100 dark:bg-emerald-900'
                                      : due.status === 'overdue'
                                      ? 'bg-red-100 dark:bg-red-900'
                                      : 'bg-amber-100 dark:bg-amber-900'
                                  }`}
                                >
                                  <IndianRupee
                                    className={`size-4 ${
                                      due.status === 'paid'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : due.status === 'overdue'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {due.description || 'Due payment'}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatDate(due.date)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold tabular-nums">
                                  {formatCurrency(due.amount)}
                                </p>
                                <Badge
                                  variant={
                                    due.status === 'paid'
                                      ? 'default'
                                      : due.status === 'overdue'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-[10px] px-1.5 py-0 rounded-full"
                                >
                                  {due.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Add/Edit Customer Dialog ────────────────────────────────── */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Update customer information below.'
                : 'Fill in the details to add a new customer.'}
            </DialogDescription>
          </DialogHeader>

          {customerFormErrors._form && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {customerFormErrors._form}
            </div>
          )}

          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="cust-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cust-name"
                  placeholder="Customer name"
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, name: e.target.value }))
                  }
                  aria-invalid={!!customerFormErrors.name}
                />
                {customerFormErrors.name && (
                  <p className="text-xs text-destructive">{customerFormErrors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div className="grid gap-2">
                <Label htmlFor="cust-phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cust-phone"
                  placeholder="Phone number"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  aria-invalid={!!customerFormErrors.phone}
                />
                {customerFormErrors.phone && (
                  <p className="text-xs text-destructive">{customerFormErrors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="cust-email">Email</Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="Email address"
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, email: e.target.value }))
                  }
                  aria-invalid={!!customerFormErrors.email}
                />
                {customerFormErrors.email && (
                  <p className="text-xs text-destructive">{customerFormErrors.email}</p>
                )}
              </div>

              {/* DOB */}
              <div className="grid gap-2">
                <Label htmlFor="cust-dob">Date of Birth</Label>
                <Input
                  id="cust-dob"
                  type="date"
                  value={customerForm.dob}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, dob: e.target.value }))
                  }
                />
              </div>

              {/* Address — full width */}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="cust-address">Address</Label>
                <Textarea
                  id="cust-address"
                  placeholder="Full address"
                  rows={2}
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>

              {/* Aadhar — full width */}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="cust-aadhar">Aadhar Number</Label>
                <Input
                  id="cust-aadhar"
                  placeholder="Aadhar number"
                  value={customerForm.aadhar}
                  onChange={(e) =>
                    setCustomerForm((f) => ({ ...f, aadhar: e.target.value }))
                  }
                />
              </div>

              {/* Group — full width, Visual Card Selector */}
              <div className="grid gap-2 sm:col-span-2">
                <Label>Group</Label>
                <div className="grid grid-cols-2 gap-3">
                  {GROUP_LIST.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setCustomerForm((f) => ({
                          ...f,
                          group: g,
                        }))
                      }
                      className={cn(
                        'flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all min-h-[44px] touch-manipulation',
                        customerForm.group === g
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-muted hover:border-muted-foreground/30'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          customerForm.group === g
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {customerForm.group === g && <Check className="size-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{g}</p>
                        <p className="text-xs text-muted-foreground leading-tight">{GROUP_DESCRIPTIONS[g]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCustomerDialogOpen(false)}
              disabled={customerSubmitting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button onClick={handleCustomerSubmit} disabled={customerSubmitting} className="min-h-[44px] min-w-[44px] touch-manipulation">
              {customerSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Loyalty Points Dialog ───────────────────────────────────── */}
      <Dialog open={loyaltyDialogOpen} onOpenChange={setLoyaltyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {loyaltyType === 'earn' ? 'Earn Loyalty Points' : 'Redeem Loyalty Points'}
            </DialogTitle>
            <DialogDescription>
              {loyaltyType === 'earn'
                ? 'Add loyalty points to this customer manually.'
                : `Customer has ${selectedCustomer?.loyaltyPoints ?? 0} points available. 100 points = ₹50 discount.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="loyalty-points">
                Points {loyaltyType === 'earn' ? 'to Add' : 'to Redeem'}
              </Label>
              <Input
                id="loyalty-points"
                type="number"
                min={1}
                max={loyaltyType === 'redeem' ? (selectedCustomer?.loyaltyPoints ?? 0) : undefined}
                placeholder={loyaltyType === 'earn' ? 'e.g. 50' : `Max: ${selectedCustomer?.loyaltyPoints ?? 0}`}
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value)}
              />
              {loyaltyType === 'redeem' && loyaltyPoints && (
                <p className="text-xs text-muted-foreground">
                  Discount value: {formatCurrency(parseInt(loyaltyPoints, 10) * 0.5)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loyalty-reason">Reason</Label>
              <div className="flex flex-wrap gap-1.5 mb-1">
                {['Purchase Bonus', 'Referral', 'Complaint Resolution', 'Special Discount', 'Anniversary Offer'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setLoyaltyReason(reason)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors min-h-[32px] touch-manipulation',
                      loyaltyReason === reason
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-accent'
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Input
                id="loyalty-reason"
                placeholder={loyaltyType === 'earn' ? 'e.g. Referral bonus' : 'e.g. Points redemption'}
                value={loyaltyReason}
                onChange={(e) => setLoyaltyReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setLoyaltyDialogOpen(false)} disabled={loyaltySubmitting} className="min-h-[44px] min-w-[44px] touch-manipulation">
              Cancel
            </Button>
            <Button onClick={handleLoyaltySubmit} disabled={loyaltySubmitting || !loyaltyPoints} className="min-h-[44px] min-w-[44px] touch-manipulation">
              {loyaltySubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loyaltyType === 'earn' ? 'Earn Points' : 'Redeem Points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Prescription Dialog ────────────────────────────────────── */}
      <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Prescription</DialogTitle>
            <DialogDescription>
              Enter the eye power details for the prescription.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="flex flex-col gap-4 p-1">
              {/* Date */}
              <div className="grid gap-2">
                <Label htmlFor="rx-date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rx-date"
                  type="date"
                  value={prescriptionForm.date}
                  onChange={(e) =>
                    setPrescriptionForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>

              <Separator />

              {/* Left Eye */}
              <div>
                <p className="mb-3 text-sm font-medium">Left Eye (OS)</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-l-sph" className="text-xs text-muted-foreground">
                      SPH
                    </Label>
                    <Input
                      id="rx-l-sph"
                      placeholder="0.00"
                      value={prescriptionForm.leftSph}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, leftSph: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-1">
                      {POWER_PRESET_VALUES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPrescriptionForm((f) => ({ ...f, leftSph: String(v) }))}
                          className={cn(
                            'rounded-md border text-[10px] font-medium transition-colors min-h-[32px] min-w-[44px] touch-manipulation',
                            prescriptionForm.leftSph === String(v)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-accent'
                          )}
                        >
                          {v > 0 ? `+${v}` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-l-cyl" className="text-xs text-muted-foreground">
                      CYL
                    </Label>
                    <Input
                      id="rx-l-cyl"
                      placeholder="0.00"
                      value={prescriptionForm.leftCyl}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, leftCyl: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-1">
                      {POWER_PRESET_VALUES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPrescriptionForm((f) => ({ ...f, leftCyl: String(v) }))}
                          className={cn(
                            'rounded-md border text-[10px] font-medium transition-colors min-h-[32px] min-w-[44px] touch-manipulation',
                            prescriptionForm.leftCyl === String(v)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-accent'
                          )}
                        >
                          {v > 0 ? `+${v}` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-l-axis" className="text-xs text-muted-foreground">
                      AXIS
                    </Label>
                    <Input
                      id="rx-l-axis"
                      placeholder="0"
                      value={prescriptionForm.leftAxis}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, leftAxis: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-l-pd" className="text-xs text-muted-foreground">
                      PD
                    </Label>
                    <Input
                      id="rx-l-pd"
                      placeholder="0"
                      value={prescriptionForm.leftPd}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, leftPd: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Right Eye */}
              <div>
                <p className="mb-3 text-sm font-medium">Right Eye (OD)</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-r-sph" className="text-xs text-muted-foreground">
                      SPH
                    </Label>
                    <Input
                      id="rx-r-sph"
                      placeholder="0.00"
                      value={prescriptionForm.rightSph}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, rightSph: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-1">
                      {POWER_PRESET_VALUES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPrescriptionForm((f) => ({ ...f, rightSph: String(v) }))}
                          className={cn(
                            'rounded-md border text-[10px] font-medium transition-colors min-h-[32px] min-w-[44px] touch-manipulation',
                            prescriptionForm.rightSph === String(v)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-accent'
                          )}
                        >
                          {v > 0 ? `+${v}` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-r-cyl" className="text-xs text-muted-foreground">
                      CYL
                    </Label>
                    <Input
                      id="rx-r-cyl"
                      placeholder="0.00"
                      value={prescriptionForm.rightCyl}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, rightCyl: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-1">
                      {POWER_PRESET_VALUES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPrescriptionForm((f) => ({ ...f, rightCyl: String(v) }))}
                          className={cn(
                            'rounded-md border text-[10px] font-medium transition-colors min-h-[32px] min-w-[44px] touch-manipulation',
                            prescriptionForm.rightCyl === String(v)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-accent'
                          )}
                        >
                          {v > 0 ? `+${v}` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-r-axis" className="text-xs text-muted-foreground">
                      AXIS
                    </Label>
                    <Input
                      id="rx-r-axis"
                      placeholder="0"
                      value={prescriptionForm.rightAxis}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, rightAxis: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rx-r-pd" className="text-xs text-muted-foreground">
                      PD
                    </Label>
                    <Input
                      id="rx-r-pd"
                      placeholder="0"
                      value={prescriptionForm.rightPd}
                      onChange={(e) =>
                        setPrescriptionForm((f) => ({ ...f, rightPd: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="rx-notes">Notes</Label>
                <Textarea
                  id="rx-notes"
                  placeholder="Additional notes (optional)"
                  rows={2}
                  value={prescriptionForm.notes}
                  onChange={(e) =>
                    setPrescriptionForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPrescriptionDialogOpen(false)}
              disabled={prescriptionSubmitting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrescriptionSubmit}
              disabled={prescriptionSubmitting || !prescriptionForm.date}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              {prescriptionSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Visit Dialog ───────────────────────────────────────────── */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Visit</DialogTitle>
            <DialogDescription>
              Record a customer visit entry.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="visit-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visit-date"
                type="date"
                value={visitForm.date}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>

            {/* Purpose */}
            <div className="grid gap-2">
              <Label>
                Purpose <span className="text-destructive">*</span>
              </Label>
              <Select
                value={VISIT_PURPOSE_OPTIONS.includes(visitForm.purpose as typeof VISIT_PURPOSE_OPTIONS[number])
                  ? visitForm.purpose
                  : 'Other'}
                onValueChange={(value) =>
                  setVisitForm((f) => ({ ...f, purpose: value === 'Other' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!VISIT_PURPOSE_OPTIONS.includes(visitForm.purpose as typeof VISIT_PURPOSE_OPTIONS[number]) && (
                <Input
                  placeholder="Please specify the purpose"
                  value={visitForm.purpose}
                  onChange={(e) =>
                    setVisitForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  className="mt-1"
                />
              )}
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="visit-notes">Notes</Label>
              <Textarea
                id="visit-notes"
                placeholder="Additional notes (optional)"
                rows={3}
                value={visitForm.notes}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setVisitDialogOpen(false)}
              disabled={visitSubmitting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVisitSubmit}
              disabled={visitSubmitting || !visitForm.date || !visitForm.purpose.trim()}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              {visitSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}