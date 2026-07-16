'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, startOfDay, isToday, isWithinInterval, startOfMonth, endOfMonth, subMonths, isBefore } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  CalendarDays,
  Filter,
  Receipt,
  CreditCard,
  PieChart as PieChartIcon,
  Banknote,
  CheckCircle2,
  Check,
  RotateCcw,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  FileText,
  BarChart3,
  CircleDollarSign,
  Scale,
  Calculator,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { TooltipContent, TooltipTrigger, Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  createdAt: string;
}

interface Due {
  id: string;
  customer: { name: string; phone: string } | null;
  amount: number;
  paid: number;
  status: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface Sale {
  id: string;
  invoiceNo: string;
  customerName: string;
  customer?: { name: string; phone: string } | null;
  total: number;
  paymentMode: string;
  createdAt: string;
}

interface CashFlowEntry {
  date: string;
  description: string;
  type: 'Income' | 'Expense';
  amount: number;
  balance: number;
}

interface ReturnItem {
  id: string;
  saleId: string;
  reason: string;
  amount: number;
  status: string;
  createdAt: string;
  sale?: {
    id: string;
    invoiceNo: string;
    customer?: { id: string; name: string; phone: string } | null;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Supplies',
  'Marketing',
  'Utilities',
  'Maintenance',
  'Transport',
  'Other',
] as const;

const RETURN_REASONS = [
  'Defective',
  'Wrong Power',
  'Customer Changed Mind',
  'Wrong Frame Size',
  'Lens Scratch',
  'Not Satisfied',
  'Other',
] as const;

const PIE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-1) / 0.6)',
  'hsl(var(--chart-2) / 0.6)',
];

const BAR_CHART_CONFIG: ChartConfig = {
  amount: { label: 'Amount', color: 'hsl(var(--chart-1))' },
};

const PIE_CHART_CONFIG: ChartConfig = {
  value: { label: 'Amount' },
  Rent: { label: 'Rent', color: 'hsl(var(--chart-1))' },
  Salary: { label: 'Salary', color: 'hsl(var(--chart-2))' },
  Supplies: { label: 'Supplies', color: 'hsl(var(--chart-3))' },
  Marketing: { label: 'Marketing', color: 'hsl(var(--chart-4))' },
  Utilities: { label: 'Utilities', color: 'hsl(var(--chart-5))' },
  Transport: { label: 'Transport', color: 'hsl(var(--chart-6))' },
  Maintenance: { label: 'Maintenance', color: 'hsl(var(--chart-1) / 0.6)' },
  Other: { label: 'Other', color: 'hsl(40, 80%, 55%)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, 'dd MMM yyyy');
  } catch {
    return String(dateStr);
  }
}

function toDateString(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return String(dateStr);
  }
}

function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getBudgetKey(): string {
  const now = new Date();
  return `accounting_budget_${now.getFullYear()}_${now.getMonth() + 1}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Invoice GST Report Sub-Component ──────────────────────────────────

function InvoiceGSTReport() {
  const [sales, setSales] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    setLoading(true);
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, '0')}`;
    fetch(`/api/sales?fromDate=${start}&toDate=${end}&limit=500`)
      .then(r => r.ok ? r.json() : [])
      .then(json => {
        const data = json.sales ?? json.data ?? json ?? [];
        setSales(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  const gstSales = sales.filter((s: Record<string, unknown>) => ((s.cgst as number) || 0) + ((s.sgst as number) || 0) + ((s.igst as number) || 0) > 0);
  const totals = gstSales.reduce((acc: Record<string, number>, s: Record<string, unknown>) => {
    acc.subtotal += (s.subtotal as number) || 0;
    acc.cgst += (s.cgst as number) || 0;
    acc.sgst += (s.sgst as number) || 0;
    acc.igst += (s.igst as number) || 0;
    acc.total += (s.totalAmount as number) || 0;
    return acc;
  }, { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

  if (loading) return <div className="flex items-center justify-center py-8"><span className="size-5 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-auto" />
        <p className="text-sm text-muted-foreground">{gstSales.length} invoices with GST</p>
      </div>
      {gstSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No GST invoices for this month</p>
            <p className="text-xs text-muted-foreground mt-1">Invoices with GST breakdown will appear here</p>
          </div>
      ) : (
        <>
          {/* GST Collection Summary Cards (ABOVE table) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="py-3 hover-lift border-l-4 border-l-emerald-500">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground font-medium">Total CGST Collected</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">{formatINR(totals.cgst)}</p>
              </CardContent>
            </Card>
            <Card className="py-3 hover-lift border-l-4 border-l-emerald-500">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground font-medium">Total SGST Collected</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400 font-mono mt-1">{formatINR(totals.sgst)}</p>
              </CardContent>
            </Card>
            <Card className="py-3 hover-lift border-l-4 border-l-emerald-500">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground font-medium">Total IGST Collected</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">{formatINR(totals.igst)}</p>
              </CardContent>
            </Card>
            <Card className="py-3 bg-emerald-50 dark:bg-emerald-950/30 hover-lift border-l-4 border-l-emerald-500">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground font-medium">Total GST Collected</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{formatINR(totals.cgst + totals.sgst + totals.igst)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gstSales.map((s: Record<string, unknown>) => (
                <TableRow key={s.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                  <TableCell className="font-mono text-xs">{s.invoiceNo as string}</TableCell>
                  <TableCell className="text-sm">{(s.customerName as string) || 'Walk-in'}</TableCell>
                  <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR((s.subtotal as number) || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-sm sm:text-base text-blue-600 dark:text-blue-400">{formatINR((s.cgst as number) || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-sm sm:text-base text-blue-600 dark:text-blue-400">{formatINR((s.sgst as number) || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-sm sm:text-base text-purple-600 dark:text-purple-400">{formatINR((s.igst as number) || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-sm sm:text-base font-semibold">{formatINR((s.totalAmount as number) || 0)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR(totals.subtotal)}</TableCell>
                <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR(totals.cgst)}</TableCell>
                <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR(totals.sgst)}</TableCell>
                <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR(totals.igst)}</TableCell>
                <TableCell className="text-right font-mono text-sm sm:text-base">{formatINR(totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">CGST</p>
              <p className="font-mono font-semibold">{formatINR(totals.cgst)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">SGST</p>
              <p className="font-mono font-semibold">{formatINR(totals.sgst)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">IGST</p>
              <p className="font-mono font-semibold">{formatINR(totals.igst)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs text-muted-foreground">Total GST</p>
              <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">{formatINR(totals.cgst + totals.sgst + totals.igst)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Accounting() {
  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);

  // Loading states
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingDues, setLoadingDues] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingReturns, setLoadingReturns] = useState(true);

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [payingDue, setPayingDue] = useState<Due | null>(null);
  const [markPaidLoading, setMarkPaidLoading] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  // Expense form state
  const [expForm, setExpForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: getTodayStr(),
    vendor: '',
  });

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');

  // Return form state
  const [returnForm, setReturnForm] = useState({
    saleSearch: '',
    saleId: '',
    refundAmount: '',
    reason: '',
  });
  const [saleSearchResults, setSaleSearchResults] = useState<Sale[]>([]);
  const [selectedReturnSale, setSelectedReturnSale] = useState<Sale | null>(null);
  const [creatingReturn, setCreatingReturn] = useState(false);
  const saleSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Budget state
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [budgetInput, setBudgetInput] = useState('');

  // Expanded due row (payment history)
  const [expandedDueId, setExpandedDueId] = useState<string | null>(null);

  // P&L collapsible
  const [plOpen, setPlOpen] = useState(false);

  // Filter states
  const [cashFlowFrom, setCashFlowFrom] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [cashFlowTo, setCashFlowTo] = useState(getTodayStr());
  const [dueFilter, setDueFilter] = useState<string>('All');

  // Deleting state
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Vendor combobox state
  const [vendorComboboxOpen, setVendorComboboxOpen] = useState(false);

  // Unique vendors from expenses
  const vendorSuggestions = useMemo(() =>
    [...new Set(expenses.map((e) => e.vendor).filter(Boolean))] as string[],
    [expenses]
  );

  // GST state
  const [gstData, setGstData] = useState<{ cgst: number; sgst: number; igst: number; total: number } | null>(null);
  const [gstLoading, setGstLoading] = useState(false);

  // Daily reconciliation state
  const [reconDate, setReconDate] = useState(getTodayStr());

  // P&L Statement state
  const [plFromDate, setPlFromDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [plToDate, setPlToDate] = useState(getTodayStr());
  const [plRevenue, setPlRevenue] = useState(0);
  const [plLoading, setPlLoading] = useState(false);

  // Cash Reconcile state
  const [actualCashInHand, setActualCashInHand] = useState('');

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    try {
      setLoadingExpenses(true);
      const res = await fetch('/api/expenses?limit=200');
      if (res.ok) {
        const json = await res.json();
        setExpenses(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
      }
    } catch {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  const fetchDues = useCallback(async () => {
    try {
      setLoadingDues(true);
      const res = await fetch('/api/dues?limit=200');
      if (res.ok) {
        const json = await res.json();
        setDues(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
      }
    } catch {
      toast.error('Failed to fetch dues');
    } finally {
      setLoadingDues(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      const res = await fetch('/api/sales?limit=500');
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json.sales) ? json.sales : Array.isArray(json.data) ? json.data : [];
        setSales(arr);
      }
    } catch {
      toast.error('Failed to fetch sales');
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const fetchReturns = useCallback(async () => {
    try {
      setLoadingReturns(true);
      const res = await fetch('/api/returns?limit=50');
      if (res.ok) {
        const json = await res.json();
        setReturns(Array.isArray(json.returns) ? json.returns : Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      toast.error('Failed to fetch returns');
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  // ─── GST Fetch ──────────────────────────────────────────────────────────

  const fetchGST = useCallback(async () => {
    setGstLoading(true);
    try {
      const res = await fetch('/api/reports?type=revenue-comparison');
      if (res.ok) {
        const json = await res.json();
        const summary = json.summary?.thisMonth;
        if (summary) {
          setGstData({
            cgst: summary.cgst || 0,
            sgst: summary.sgst || 0,
            igst: summary.igst || 0,
            total: (summary.cgst || 0) + (summary.sgst || 0) + (summary.igst || 0),
          });
        }
      }
    } catch { /* ignore */ }
    finally { setGstLoading(false); }
  }, []);

  // ─── Daily Cash Reconciliation ──────────────────────────────────────────

  const dailyReconciliation = useMemo(() => {
    const targetDate = startOfDay(parseISO(reconDate));
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const daySales = sales.filter((s) => {
      try {
        const d = new Date(s.createdAt);
        return d >= targetDate && d < nextDay;
      } catch { return false; }
    });

    const dayExpenses = expenses.filter((e) => {
      try {
        const d = new Date(e.date);
        return d >= targetDate && d < nextDay;
      } catch { return false; }
    });

    const cashSales = daySales.filter((s) => (s.paymentMode || '').toLowerCase() === 'cash').reduce((s, x) => s + (x.total || 0), 0);
    const upiSales = daySales.filter((s) => (s.paymentMode || '').toLowerCase() === 'upi').reduce((s, x) => s + (x.total || 0), 0);
    const cardSales = daySales.filter((s) => (s.paymentMode || '').toLowerCase() === 'card').reduce((s, x) => s + (x.total || 0), 0);
    const creditSales = daySales.filter((s) => (s.paymentMode || '').toLowerCase() === 'credit').reduce((s, x) => s + (x.total || 0), 0);
    const otherSales = daySales.filter((s) => {
      const m = (s.paymentMode || '').toLowerCase();
      return !['cash', 'upi', 'card', 'credit'].includes(m);
    }).reduce((s, x) => s + (x.total || 0), 0);

    const totalDayIncome = daySales.reduce((s, x) => s + (x.total || 0), 0);
    const totalDayExpenses = dayExpenses.reduce((s, x) => s + (x.amount || 0), 0);
    const expectedCash = cashSales - totalDayExpenses;

    const dayCGST = daySales.reduce((s, x) => s + ((x as Record<string, unknown>).cgst as number || 0), 0);
    const daySGST = daySales.reduce((s, x) => s + ((x as Record<string, unknown>).sgst as number || 0), 0);
    const dayIGST = daySales.reduce((s, x) => s + ((x as Record<string, unknown>).igst as number || 0), 0);

    return {
      date: reconDate,
      totalTransactions: daySales.length,
      totalIncome: totalDayIncome,
      totalExpenses: totalDayExpenses,
      cashSales,
      upiSales,
      cardSales,
      creditSales,
      otherSales,
      expectedCash,
      dayCGST,
      daySGST,
      dayIGST,
      totalGST: dayCGST + daySGST + dayIGST,
      sales: daySales,
      expenses: dayExpenses,
    };
  }, [sales, expenses, reconDate]);

  // ─── P&L Revenue Fetch ─────────────────────────────────────────────────

  const fetchPLRevenue = useCallback(async () => {
    setPlLoading(true);
    try {
      const res = await fetch(`/api/reports?type=revenue&fromDate=${plFromDate}&toDate=${plToDate}`);
      if (res.ok) {
        const json = await res.json();
        const total = json.total ?? json.revenue ?? json.data?.total ?? json.data?.revenue ?? 0;
        setPlRevenue(typeof total === 'number' ? total : 0);
      }
    } catch { /* ignore */ }
    finally { setPlLoading(false); }
  }, [plFromDate, plToDate]);

  // ─── P&L Expense Grouping ──────────────────────────────────────────────

  const plExpensesByCategory = useMemo(() => {
    const from = startOfDay(parseISO(plFromDate));
    const to = new Date(plToDate + 'T23:59:59');
    const filtered = expenses.filter((e) => {
      try {
        const d = new Date(e.date);
        return d >= from && d <= to;
      } catch { return false; }
    });
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return EXPENSE_CATEGORIES.map((cat) => ({
      category: cat,
      total: map[cat] || 0,
    })).filter((c) => c.total > 0);
  }, [expenses, plFromDate, plToDate]);

  const plTotalExpenses = useMemo(() => {
    return plExpensesByCategory.reduce((s, c) => s + c.total, 0);
  }, [plExpensesByCategory]);

  const plNetProfit = plRevenue - plTotalExpenses;

  // ─── 6-Month P&L Trend Data ──────────────────────────────────────────
  const plTrendData = useMemo(() => {
    const months: { month: string; revenue: number; expenses: number; netProfit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = subMonths(new Date(), i);
      const mStart = startOfMonth(mDate);
      const mEnd = new Date(endOfMonth(mDate).getTime() + 86399999); // include last day
      const mLabel = format(mDate, 'MMM yy');

      const mRevenue = sales
        .filter((s) => { try { const d = new Date(s.createdAt); return d >= mStart && d <= mEnd; } catch { return false; } })
        .reduce((sum, s) => sum + (s.total || 0), 0);

      const mExpenses = expenses
        .filter((e) => { try { const d = new Date(e.date); return d >= mStart && d <= mEnd; } catch { return false; } })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      months.push({ month: mLabel, revenue: mRevenue, expenses: mExpenses, netProfit: mRevenue - mExpenses });
    }
    return months;
  }, [sales, expenses]);

  // ─── Today's Cash Data (for Cash Reconcile) ────────────────────────────

  const todayCashData = useMemo(() => {
    const targetDate = startOfDay(new Date());
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const todaySales = sales.filter((s) => {
      try {
        const d = new Date(s.createdAt);
        return d >= targetDate && d < nextDay;
      } catch { return false; }
    });

    const todayExpenses = expenses.filter((e) => {
      try {
        const d = new Date(e.date);
        return d >= targetDate && d < nextDay;
      } catch { return false; }
    });

    const cashSales = todaySales
      .filter((s) => (s.paymentMode || '').toLowerCase() === 'cash')
      .reduce((s, x) => s + (x.total || 0), 0);

    const cashExpenses = todayExpenses.reduce((s, x) => s + (x.amount || 0), 0);

    return {
      cashSales,
      cashExpenses,
      expectedCash: cashSales - cashExpenses,
    };
  }, [sales, expenses]);

  const cashVariance = useMemo(() => {
    const actual = parseFloat(actualCashInHand);
    if (isNaN(actual)) return null;
    return actual - todayCashData.expectedCash;
  }, [actualCashInHand, todayCashData.expectedCash]);

  // Load budget from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getBudgetKey());
      if (stored) setMonthlyBudget(parseFloat(stored) || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchDues();
    fetchSales();
    fetchReturns();
    fetchGST();
  }, [fetchExpenses, fetchDues, fetchSales, fetchReturns, fetchGST]);

  // Fetch P&L revenue on mount and date change
  useEffect(() => {
    fetchPLRevenue();
  }, [fetchPLRevenue]);

  // Cash variance toast (debounced via ref key)
  const cashVarianceToastKey = useRef<string | null>(null);
  useEffect(() => {
    if (cashVariance !== null && Math.abs(cashVariance) > 500) {
      const key = actualCashInHand;
      if (cashVarianceToastKey.current !== key) {
        cashVarianceToastKey.current = key;
        toast.warning(`Cash variance of ${formatINR(Math.abs(cashVariance))} detected!`, {
          description: `Expected: ${formatINR(todayCashData.expectedCash)}, Actual: ${formatINR(parseFloat(actualCashInHand))}`,
        });
      }
    } else {
      cashVarianceToastKey.current = null;
    }
  }, [cashVariance, todayCashData.expectedCash, actualCashInHand]);

  // ─── Summary Calculations ────────────────────────────────────────────────

  const todayIncome = useMemo(() => {
    return sales
      .filter((s) => {
        try { return isToday(new Date(s.createdAt)); } catch { return false; }
      })
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [sales]);

  const monthlyIncome = useMemo(() => {
    const mStart = startOfMonth(new Date());
    return sales
      .filter((s) => {
        try { return new Date(s.createdAt) >= mStart; } catch { return false; }
      })
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [sales]);

  const lastMonthIncome = useMemo(() => {
    const lastMStart = startOfMonth(subMonths(new Date(), 1));
    const lastMEnd = endOfMonth(subMonths(new Date(), 1));
    return sales
      .filter((s) => {
        try {
          const d = new Date(s.createdAt);
          return d >= lastMStart && d <= lastMEnd;
        } catch { return false; }
      })
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [sales]);

  const monthlyExpensesTotal = useMemo(() => {
    const mStart = startOfMonth(new Date());
    return expenses
      .filter((e) => {
        try { return new Date(e.date) >= mStart; } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((s, e) => s + (e.amount || 0), 0);
  }, [expenses]);

  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        try { return isToday(new Date(e.date)); } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const totalPendingDues = useMemo(() => {
    return dues
      .filter((d) => d.status !== 'Paid')
      .reduce((sum, d) => sum + ((d.amount || 0) - (d.paid || 0)), 0);
  }, [dues]);

  // ─── Returns Summary ────────────────────────────────────────────────────

  const totalReturnRefund = useMemo(() => {
    return returns.reduce((s, r) => s + (r.amount || 0), 0);
  }, [returns]);

  const thisMonthReturns = useMemo(() => {
    const mStart = startOfMonth(new Date());
    return returns.filter((r) => {
      try { return new Date(r.createdAt) >= mStart; } catch { return false; }
    });
  }, [returns]);

  const thisMonthReturnAmount = useMemo(() => {
    return thisMonthReturns.reduce((s, r) => s + (r.amount || 0), 0);
  }, [thisMonthReturns]);

  // ─── P&L Calculations ───────────────────────────────────────────────────

  const netProfit = useMemo(() => {
    return monthlyIncome - monthlyExpensesTotal;
  }, [monthlyIncome, monthlyExpensesTotal]);

  const momChangePercent = useMemo(() => {
    if (lastMonthIncome === 0) return monthlyIncome > 0 ? 100 : 0;
    return Math.round(((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100);
  }, [monthlyIncome, lastMonthIncome]);

  // ─── Cash Flow Calculations ──────────────────────────────────────────────

  const cashFlowData = useMemo((): CashFlowEntry[] => {
    const fromDate = startOfDay(parseISO(cashFlowFrom));
    const toDate = startOfDay(parseISO(cashFlowTo));

    const incomeEntries: CashFlowEntry[] = sales
      .filter((s) => {
        try {
          const d = new Date(s.createdAt);
          return isWithinInterval(d, { start: fromDate, end: new Date(cashFlowTo + 'T23:59:59') });
        } catch { return false; }
      })
      .map((s) => ({
        date: toDateString(s.createdAt),
        description: `Sale - ${s.customer?.name || s.customerName || 'Customer'} (${s.invoiceNo || ''})`,
        type: 'Income' as const,
        amount: s.total || 0,
        balance: 0,
      }));

    const expenseEntries: CashFlowEntry[] = expenses
      .filter((e) => {
        try {
          const d = new Date(e.date);
          return isWithinInterval(d, { start: fromDate, end: new Date(cashFlowTo + 'T23:59:59') });
        } catch { return false; }
      })
      .map((e) => ({
        date: toDateString(e.date),
        description: `${e.category} - ${e.description || e.vendor || 'Expense'}`,
        type: 'Expense' as const,
        amount: e.amount,
        balance: 0,
      }));

    const allEntries = [...incomeEntries, ...expenseEntries].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return a.type === 'Income' ? -1 : 1;
    });

    let runningBalance = 0;
    return allEntries.map((entry) => {
      if (entry.type === 'Income') runningBalance += entry.amount;
      else runningBalance -= entry.amount;
      return { ...entry, balance: runningBalance };
    });
  }, [sales, expenses, cashFlowFrom, cashFlowTo]);

  const cashFlowSummary = useMemo(() => {
    const totalIncome = cashFlowData.filter((e) => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
    const totalExpense = cashFlowData.filter((e) => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [cashFlowData]);

  // ─── Expense Category Summary ────────────────────────────────────────────

  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return EXPENSE_CATEGORIES.map((cat) => ({
      name: cat,
      value: map[cat] || 0,
    })).filter((c) => c.value > 0);
  }, [expenses]);

  // ─── Filtered Dues (with overdue detection) ──────────────────────────────

  const filteredDues = useMemo(() => {
    let filtered = dues;
    if (dueFilter === 'All') {
      // no filter
    } else if (dueFilter === 'Overdue') {
      const todayStr = getTodayStr();
      filtered = dues.filter((d) => {
        if (d.status === 'Paid') return false;
        if (!d.dueDate) return false;
        try {
          return isBefore(parseISO(toDateString(d.dueDate)), parseISO(todayStr));
        } catch { return false; }
      });
    } else {
      filtered = dues.filter((d) => d.status === dueFilter);
    }
    return filtered;
  }, [dues, dueFilter]);

  // ─── Overdue check helper ────────────────────────────────────────────────

  const isDueOverdue = useCallback((due: Due): boolean => {
    if (due.status === 'Paid') return false;
    if (!due.dueDate) return false;
    try {
      return isBefore(parseISO(toDateString(due.dueDate)), parseISO(getTodayStr()));
    } catch { return false; }
  }, []);

  // ─── Expense Form Handlers ───────────────────────────────────────────────

  const resetExpForm = () => {
    setExpForm({ category: '', description: '', amount: '', date: getTodayStr(), vendor: '' });
    setEditingExpense(null);
  };

  const openAddExpense = () => { resetExpForm(); setExpenseDialogOpen(true); };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpForm({
      category: expense.category || '',
      description: expense.description || '',
      amount: String(expense.amount || ''),
      date: toDateString(expense.date),
      vendor: expense.vendor || '',
    });
    setExpenseDialogOpen(true);
  };

  const openRepeatExpense = (expense: Expense) => {
    setEditingExpense(null);
    setExpForm({
      category: expense.category || '',
      description: expense.description || '',
      amount: String(expense.amount || ''),
      date: getTodayStr(),
      vendor: expense.vendor || '',
    });
    setExpenseDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    const amount = parseFloat(expForm.amount);
    if (!expForm.category || !expForm.description || isNaN(amount) || amount <= 0 || !expForm.date) {
      toast.error('Please fill in all required fields with valid data');
      return;
    }
    try {
      const isEdit = !!editingExpense;
      const url = editingExpense ? `/api/expenses?id=${editingExpense.id}` : '/api/expenses';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expForm.category,
          description: expForm.description,
          amount,
          date: expForm.date,
          vendor: expForm.vendor || null,
        }),
      });
      if (res.ok) {
        toast.success(isEdit ? 'Expense updated' : 'Expense added');
        setExpenseDialogOpen(false);
        resetExpForm();
        fetchExpenses();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save expense');
      }
    } catch { toast.error('Network error'); }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpenseId(id);
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Expense deleted'); fetchExpenses(); }
      else toast.error('Failed to delete expense');
    } catch { toast.error('Network error'); }
    finally { setDeletingExpenseId(null); }
  };

  // ─── Payment Handlers ────────────────────────────────────────────────────

  const openPaymentDialog = (due: Due) => {
    setPayingDue(due);
    setPaymentAmount('');
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!payingDue) return;
    const amount = parseFloat(paymentAmount);
    const balance = (payingDue.amount || 0) - (payingDue.paid || 0);
    if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    if (amount > balance) { toast.error('Amount exceeds pending balance'); return; }

    setMarkPaidLoading(true);
    try {
      const res = await fetch(`/api/dues?id=${payingDue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAmount: amount }),
      });
      if (res.ok) {
        toast.success(`Payment of ${formatINR(amount)} recorded`);
        setPaymentDialogOpen(false);
        setPayingDue(null);
        fetchDues();
      } else toast.error('Failed to record payment');
    } catch { toast.error('Network error'); }
    finally { setMarkPaidLoading(false); }
  };

  const handleMarkPaid = async (due: Due) => {
    setMarkPaidLoading(true);
    try {
      const res = await fetch(`/api/dues?id=${due.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });
      if (res.ok) { toast.success(`${due.customer?.name || 'Customer'} marked as paid`); fetchDues(); }
      else toast.error('Failed to update');
    } catch { toast.error('Network error'); }
    finally { setMarkPaidLoading(false); }
  };

  // ─── Return Handlers ─────────────────────────────────────────────────────

  const openCreateReturn = () => {
    setReturnForm({ saleSearch: '', saleId: '', refundAmount: '', reason: '' });
    setSaleSearchResults([]);
    setSelectedReturnSale(null);
    setReturnDialogOpen(true);
  };

  const handleSaleSearch = (query: string) => {
    setReturnForm((f) => ({ ...f, saleSearch: query }));
    if (saleSearchTimeout.current) clearTimeout(saleSearchTimeout.current);
    if (!query.trim()) { setSaleSearchResults([]); return; }
    saleSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sales?search=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          const arr = Array.isArray(json.sales) ? json.sales : Array.isArray(json.data) ? json.data : [];
          setSaleSearchResults(arr);
        }
      } catch { /* ignore */ }
    }, 300);
  };

  const selectReturnSale = (sale: Sale) => {
    setSelectedReturnSale(sale);
    setReturnForm((f) => ({ ...f, saleId: sale.id, refundAmount: String(sale.total || 0) }));
    setSaleSearchResults([]);
  };

  const handleCreateReturn = async () => {
    if (!returnForm.saleId || !returnForm.reason) {
      toast.error('Please select a sale and a reason');
      return;
    }
    const amount = parseFloat(returnForm.refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    setCreatingReturn(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: returnForm.saleId,
          reason: returnForm.reason,
          refundAmount: amount,
        }),
      });
      if (res.ok) {
        toast.success('Return created successfully');
        setReturnDialogOpen(false);
        fetchReturns();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create return');
      }
    } catch { toast.error('Network error'); }
    finally { setCreatingReturn(false); }
  };

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const rows = expenses.map((e) => [
      formatDate(e.date),
      e.category,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
    ]);
    const csv = ['Date,Category,Description,Amount,Vendor', ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${getTodayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // ─── Budget Handlers ─────────────────────────────────────────────────────

  const handleSetBudget = () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    setMonthlyBudget(val);
    localStorage.setItem(getBudgetKey(), String(val));
    setBudgetDialogOpen(false);
    setBudgetInput('');
    toast.success('Monthly budget set to ' + formatINR(val));
  };

  const budgetPercent = monthlyBudget > 0 ? Math.min((monthlyExpensesTotal / monthlyBudget) * 100, 100) : 0;
  const budgetRemaining = monthlyBudget - monthlyExpensesTotal;

  // ─── Status Badges ───────────────────────────────────────────────────────

  const DueStatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Pending: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      Partial: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
      Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      Overdue: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    };
    return (
      <Badge className={styles[status] || 'border'}>
        {status}
      </Badge>
    );
  };

  const ReturnStatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      Pending: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      Rejected: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    };
    return (
      <Badge className={styles[status] || 'border'}>
        {status}
      </Badge>
    );
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
    <div className="space-y-2 px-3 sm:px-4 py-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 bg-muted rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IndianRupee className="h-6 w-6" />
            Accounting & Finance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track income, expenses, and pending dues
          </p>
        </div>
        <Button onClick={openAddExpense} size="sm" className="gap-1.5 w-fit touch-manipulation min-h-[44px] active:scale-95 transition-transform">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* ─── Profit & Loss Card ─────────────────────────────────────────── */}
      <Collapsible open={plOpen} onOpenChange={setPlOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-2 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Profit &amp; Loss Summary</CardTitle>
                    <CardDescription className="text-xs">
                      {format(new Date(), 'MMMM yyyy')} &bull; Net: <span className={netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>{formatINR(netProfit)}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {lastMonthIncome > 0 && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${momChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {momChangePercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(momChangePercent)}% vs last month
                    </div>
                  )}
                  {plOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* P&L Header Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(monthlyIncome)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Monthly collections</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Cost of Goods</p>
                  <p className="text-sm font-bold text-muted-foreground font-mono">Not tracked</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enable product costing</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(monthlyIncome)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Revenue (COGS not tracked)</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">{formatINR(monthlyExpensesTotal)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
                </div>
                <div className={`rounded-xl border p-3 ${netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`text-sm font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(netProfit)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Revenue - Expenses</p>
                </div>
              </div>

              {/* P&L Detail: Expense Category Breakdown */}
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Expense Breakdown by Category</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const catTotal = expenses
                      .filter((e) => {
                        if (e.category !== cat) return false;
                        try { return new Date(e.date) >= startOfMonth(new Date()); } catch { return false; }
                      })
                      .reduce((s, e) => s + (e.amount || 0), 0);
                    if (catTotal === 0) return null;
                    const pct = monthlyExpensesTotal > 0 ? ((catTotal / monthlyExpensesTotal) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={cat} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">{cat}</p>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </div>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">{formatINR(catTotal)}</p>
                        <Progress value={parseFloat(pct)} className="mt-1.5 h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* P&L Bar Chart: Income vs Expenses by category */}
              {categorySummary.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Income vs Expenses (This Month)</h3>
                  <div className="h-[220px]">
                    <ChartContainer config={BAR_CHART_CONFIG} className="h-full w-full">
                      <BarChart data={categorySummary} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28} fill="hsl(var(--chart-1))" />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card className="py-4 hover-lift border-l-4 border-l-emerald-500">
          <CardContent className="px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Today&apos;s Collections</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatINR(todayIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4 hover-lift border-l-4 border-l-emerald-500">
          <CardContent className="px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950">
                <Wallet className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Monthly Collections</p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400 truncate">{formatINR(monthlyIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4 hover-lift border-l-4 border-l-blue-500">
          <CardContent className="px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Outstanding Dues</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 truncate">{formatINR(totalPendingDues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4 hover-lift border-l-4 border-l-red-500">
          <CardContent className="px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 truncate">{formatINR(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList className="flex-wrap overflow-x-auto scrollbar-hide">
          <TabsTrigger value="cashflow" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><Banknote className="h-4 w-4" /><span className="hidden sm:inline">Cash Flow</span><span className="sm:hidden text-xs">Cash</span></TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><Receipt className="h-4 w-4" /><span className="hidden sm:inline">Expenses</span><span className="sm:hidden text-xs">Exp</span></TabsTrigger>
          <TabsTrigger value="gst" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><Target className="h-4 w-4" /><span className="sm:hidden text-xs">GST</span><span className="hidden sm:inline">GST</span></TabsTrigger>
          <TabsTrigger value="pl-statement" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">P&L Statement</span><span className="sm:hidden text-xs">P&L</span></TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><CheckCircle2 className="h-4 w-4" /><span className="hidden sm:inline">Cash Recon</span><span className="sm:hidden text-xs">Recon</span></TabsTrigger>
          <TabsTrigger value="cash-reconcile" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><Calculator className="h-4 w-4" /><span className="hidden sm:inline">Reconcile</span><span className="sm:hidden text-xs">Recon+</span></TabsTrigger>
          <TabsTrigger value="dues" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Dues</span><span className="sm:hidden text-xs">Dues</span></TabsTrigger>
          <TabsTrigger value="returns" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Returns</span><span className="sm:hidden text-xs">Ret</span></TabsTrigger>
          <TabsTrigger value="invoice-gst" className="gap-1.5 touch-manipulation min-h-[44px] shrink-0"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Invoice GST</span><span className="sm:hidden text-xs">Inv GST</span></TabsTrigger>
        </TabsList>

        {/* ─── Cash Flow Tab ────────────────────────────────────────────── */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle className="text-lg">Cash Flow Statement</CardTitle>
                  <CardDescription>Track all income and expense transactions</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="cf-from" className="text-xs whitespace-nowrap"><CalendarDays className="h-3.5 w-3.5 inline mr-1" />From</Label>
                    <Input id="cf-from" type="date" value={cashFlowFrom} onChange={(e) => setCashFlowFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="cf-to" className="text-xs whitespace-nowrap">To</Label>
                    <Input id="cf-to" type="date" value={cashFlowTo} onChange={(e) => setCashFlowTo(e.target.value)} className="h-8 w-[140px] text-xs" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSales || loadingExpenses ? (
                <TableSkeleton rows={6} cols={5} />
              ) : cashFlowData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Wallet className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No transactions found in this period</p>
                  <p className="text-xs text-muted-foreground mt-1">Adjust the date range to see cash flow entries</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashFlowData.map((entry, i) => (
                          <TableRow key={`cf-${i}`} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-xs">{formatDate(entry.date)}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{entry.description}</TableCell>
                            <TableCell>
                              {entry.type === 'Income' ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">Income</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs dark:bg-red-950 dark:text-red-300 dark:border-red-800">Expense</Badge>
                              )}
                            </TableCell>
                            <TableCell className={`text-sm sm:text-base text-right font-mono font-medium ${entry.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {entry.type === 'Income' ? '+' : '-'}{formatINR(entry.amount)}
                            </TableCell>
                            <TableCell className={`text-sm sm:text-base text-right font-mono font-medium ${entry.balance >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
                              {formatINR(entry.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-xs font-semibold">Summary</TableCell>
                          <TableCell className="text-xs text-right">
                            <div className="space-y-0.5">
                              <span className="block text-emerald-600 dark:text-emerald-400 font-mono text-sm sm:text-base">+{formatINR(cashFlowSummary.totalIncome)}</span>
                              <span className="block text-red-600 dark:text-red-400 font-mono text-sm sm:text-base">-{formatINR(cashFlowSummary.totalExpense)}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-sm sm:text-base text-right font-mono font-bold ${cashFlowSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {cashFlowSummary.net >= 0 ? '+' : ''}{formatINR(cashFlowSummary.net)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Income</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(cashFlowSummary.totalIncome)}</p>
                    </div>
                    <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Expense</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">{formatINR(cashFlowSummary.totalExpense)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 text-center ${cashFlowSummary.net >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                      <p className="text-xs text-muted-foreground">Net</p>
                      <p className={`text-sm font-bold font-mono ${cashFlowSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {cashFlowSummary.net >= 0 ? '+' : ''}{formatINR(cashFlowSummary.net)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Expenses Tab ─────────────────────────────────────────────── */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" />Expense Management</CardTitle>
                  <CardDescription>{expenses.length} expense{expenses.length !== 1 ? 's' : ''} totaling {formatINR(totalExpenses)}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Button variant="outline" size="sm" className="gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform" onClick={() => { setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : ''); setBudgetDialogOpen(true); }}>
                    <Target className="h-3.5 w-3.5" />Set Budget
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform" onClick={handleExportCSV} disabled={expenses.length === 0}>
                    <Download className="h-3.5 w-3.5" />CSV
                  </Button>
                  <Button onClick={openAddExpense} size="sm" className="gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform"><Plus className="h-4 w-4" />Add Expense</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Monthly Budget Tracking */}
              {monthlyBudget > 0 && (
                <div className="mb-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Monthly Budget: {formatINR(monthlyBudget)}</span>
                    </div>
                    <span className={`text-xs font-semibold ${budgetRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {budgetRemaining >= 0 ? `${formatINR(budgetRemaining)} remaining` : `${formatINR(Math.abs(budgetRemaining))} over budget`}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={budgetPercent}
                      className={`h-3 ${budgetPercent < 75 ? '[&>div]:bg-emerald-500' : budgetPercent < 100 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{formatINR(monthlyExpensesTotal)} spent this month</span>
                    <span className="text-[11px] text-muted-foreground">{Math.round(budgetPercent)}% used</span>
                  </div>
                </div>
              )}

              {/* Per-Category Spending Alerts */}
              {monthlyExpensesTotal > 0 && (
                <div className="mt-4">
                  <Separator className="mb-4" />
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Category Spending Alerts
                  </h3>
                  <div className="space-y-2">
                    {plExpensesByCategory.map((cat) => {
                      const pct = (cat.total / monthlyExpensesTotal) * 100;
                      const isHigh = pct >= 30;
                      return (
                        <div key={cat.category} className={`rounded-xl border p-3 ${isHigh ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{cat.category}</span>
                              {isHigh && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">{pct.toFixed(0)}% of total</Badge>}
                            </div>
                            <span className="text-xs font-mono font-semibold">{formatINR(cat.total)}</span>
                          </div>
                          <Progress value={Math.min(pct, 100)} className={`h-1.5 ${isHigh ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingExpenses ? (
                <TableSkeleton rows={6} cols={6} />
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No expenses recorded yet</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform" onClick={openAddExpense}><Plus className="h-3.5 w-3.5" />Add your first expense</Button>
                </div>
              ) : (
                <>
                  <div className="max-h-[360px] overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Vendor</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((exp) => (
                          <TableRow key={exp.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-xs">{formatDate(exp.date)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{exp.category}</Badge></TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{exp.description}</TableCell>
                            <TableCell className="text-sm sm:text-base text-right font-mono font-medium text-red-600 dark:text-red-400">{formatINR(exp.amount)}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell max-w-[120px] truncate">{exp.vendor || '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 touch-manipulation active:scale-95 transition-transform" onClick={() => openRepeatExpense(exp)} title="Repeat expense">
                                  <RotateCcw className="h-3.5 w-3.5" /><span className="sr-only">Repeat</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 touch-manipulation active:scale-95 transition-transform" onClick={() => openEditExpense(exp)}><Pencil className="h-3.5 w-3.5" /><span className="sr-only">Edit</span></Button>
                                <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 touch-manipulation active:scale-95 transition-transform" onClick={() => handleDeleteExpense(exp.id)} disabled={deletingExpenseId === exp.id}>
                                  {deletingExpenseId === exp.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {categorySummary.length > 0 && (
                    <div className="mt-6">
                      <Separator className="mb-4" />
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><PieChartIcon className="h-4 w-4" />Expense Distribution by Category</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-center">
                          <ChartContainer config={PIE_CHART_CONFIG} className="h-[250px] w-full max-w-[250px]">
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Pie data={categorySummary} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} strokeWidth={2}>
                                {categorySummary.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                        </div>
                        <div className="space-y-3">
                          <ChartContainer config={BAR_CHART_CONFIG} className="h-[200px] w-full">
                            <BarChart data={categorySummary} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={65} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {categorySummary.map((_, index) => <Cell key={`bar-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GST Collection Tab ────────────────────────────────────────── */}
        <TabsContent value="gst">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      GST Collection Summary
                    </CardTitle>
                    <CardDescription>Current month GST collected on sales</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(), 'MMMM yyyy')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {gstLoading ? (
                  <TableSkeleton rows={3} cols={4} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground font-medium">CGST Collected</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">{formatINR(gstData?.cgst || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Central Goods & Services Tax</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground font-medium">SGST Collected</p>
                      <p className="text-xl font-bold text-violet-600 dark:text-violet-400 font-mono mt-1">{formatINR(gstData?.sgst || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">State Goods & Services Tax</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground font-medium">IGST Collected</p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">{formatINR(gstData?.igst || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Integrated Goods & Services Tax</p>
                    </div>
                    <div className="rounded-xl border p-4 bg-emerald-50 dark:bg-emerald-950/30">
                      <p className="text-xs text-muted-foreground font-medium">Total GST Payable</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{formatINR(gstData?.total || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">CGST + SGST + IGST</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GST Pie Chart */}
            {gstData && gstData.total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">GST Distribution</CardTitle>
                  <CardDescription>Breakdown of GST components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ChartContainer config={PIE_CHART_CONFIG} className="h-full w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                          data={[
                            { name: 'CGST', value: gstData.cgst },
                            { name: 'SGST', value: gstData.sgst },
                            ...(gstData.igst > 0 ? [{ name: 'IGST', value: gstData.igst }] : []),
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={45}
                          dataKey="value"
                          nameKey="name"
                        >
                          <Cell fill="hsl(var(--chart-1))" />
                          <Cell fill="hsl(var(--chart-2))" />
                          {gstData.igst > 0 && <Cell fill="hsl(var(--chart-3))" />}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── P&L Statement Tab ─────────────────────────────────────────── */}
        <TabsContent value="pl-statement">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    P&amp;L Statement
                  </CardTitle>
                  <CardDescription>Profit &amp; Loss for the selected period</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap"><CalendarDays className="h-3.5 w-3.5 inline mr-1" />From</Label>
                    <Input type="date" value={plFromDate} onChange={(e) => setPlFromDate(e.target.value)} className="h-8 w-[140px] text-xs" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap">To</Label>
                    <Input type="date" value={plToDate} onChange={(e) => setPlToDate(e.target.value)} className="h-8 w-[140px] text-xs" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 sm:mt-0">
                    {[
                      { label: 'This Month', getRange: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: getTodayStr() }) },
                      { label: 'Last Month', getRange: () => { const lm = subMonths(new Date(), 1); return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }; } },
                      { label: 'Q1', getRange: () => ({ from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-03-31` }) },
                      { label: 'This Year', getRange: () => ({ from: `${new Date().getFullYear()}-01-01`, to: getTodayStr() }) },
                    ].map((preset) => (
                      <Button key={preset.label} variant="outline" size="sm" className="text-xs h-9 min-w-[44px] min-h-[44px] touch-manipulation active:scale-95 transition-transform"
                        onClick={() => { const r = preset.getRange(); setPlFromDate(r.from); setPlToDate(r.to); }}>
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plLoading ? (
                <TableSkeleton rows={6} cols={3} />
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card className="py-4 hover-lift border-l-4 border-l-emerald-500">
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(plRevenue)}</p>
                            <p className="text-[10px] text-muted-foreground">Sales revenue for the period</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-4 hover-lift border-l-4 border-l-red-500">
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">{formatINR(plTotalExpenses)}</p>
                            <p className="text-[10px] text-muted-foreground">{plExpensesByCategory.length} categor{plExpensesByCategory.length !== 1 ? 'ies' : 'y'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className={`py-4 hover-lift border-l-4 border-l-blue-500 ${plNetProfit >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-red-50/50 dark:bg-red-950/20'}`}>
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${plNetProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'}`}>
                            {plNetProfit >= 0
                              ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                            }
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Net Profit</p>
                            <p className={`text-lg font-bold font-mono ${plNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(plNetProfit)}</p>
                            <p className="text-[10px] text-muted-foreground">Revenue - Total Expenses</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Revenue
                    </h3>
                    <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-sm font-medium">Total Sales Revenue</TableCell>
                            <TableCell className="text-xs text-muted-foreground">Fetched from reports API</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{formatINR(plRevenue)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Expense Breakdown by Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </div>
                      Expenses (by Category)
                    </h3>
                    {plExpensesByCategory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No expenses recorded for this period.</p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Category</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                              <TableHead className="text-xs text-right hidden sm:table-cell">% of Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {plExpensesByCategory.map((cat) => {
                              const pct = plTotalExpenses > 0 ? ((cat.total / plTotalExpenses) * 100).toFixed(1) : '0.0';
                              return (
                                <TableRow key={cat.category} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                  <TableCell className="text-sm font-medium">{cat.category}</TableCell>
                                  <TableCell className="text-sm sm:text-base font-mono text-red-600 dark:text-red-400 text-right">{formatINR(cat.total)}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground text-right font-mono hidden sm:table-cell">{pct}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell className="text-sm">Total Expenses</TableCell>
                              <TableCell className="text-sm sm:text-base font-mono text-red-600 dark:text-red-400 text-right">{formatINR(plTotalExpenses)}</TableCell>
                              <TableCell className="text-sm sm:text-base text-right font-mono hidden sm:table-cell">100%</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Net Profit Card */}
                  <div className={`rounded-xl border p-4 ${plNetProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className={`h-5 w-5 ${plNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                        <span className="text-sm font-semibold">Net Profit</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Revenue: {formatINR(plRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Expenses: -{formatINR(plTotalExpenses)}</p>
                        </div>
                        <p className={`text-xl font-bold font-mono ${plNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatINR(plNetProfit)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 6-Month P&L Trend */}
                  {plTrendData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        6-Month P&amp;L Trend
                      </h3>
                      <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' }, expenses: { label: 'Expenses', color: 'hsl(var(--chart-5))' }, netProfit: { label: 'Net Profit', color: 'hsl(var(--chart-2))' } }} className="h-[260px] w-full">
                        <BarChart data={plTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} barSize={16} />
                          <Bar dataKey="expenses" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} barSize={16} />
                          <Bar dataKey="netProfit" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={16} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Daily Cash Reconciliation Tab ─────────────────────────────── */}
        <TabsContent value="reconciliation">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Daily Cash Reconciliation
                    </CardTitle>
                    <CardDescription>Verify daily cash balance against sales and expenses</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <Label htmlFor="recon-date" className="text-xs whitespace-nowrap">Date:</Label>
                    <Input id="recon-date" type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} className="h-8 w-[150px] text-xs" />
                    <Button variant="outline" size="sm" className="text-xs h-9 min-w-[44px] min-h-[44px] touch-manipulation" onClick={() => setReconDate(getTodayStr())}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales || loadingExpenses ? (
                  <TableSkeleton rows={4} cols={3} />
                ) : (
                  <div className="space-y-4">
                    {/* Reconciliation Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="rounded-xl border p-3">
                        <p className="text-[10px] text-muted-foreground">Total Sales</p>
                        <p className="text-sm font-bold font-mono">{formatINR(dailyReconciliation.totalIncome)}</p>
                        <p className="text-[10px] text-muted-foreground">{dailyReconciliation.totalTransactions} transactions</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-[10px] text-muted-foreground">Cash Sales</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(dailyReconciliation.cashSales)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-[10px] text-muted-foreground">UPI Sales</p>
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400 font-mono">{formatINR(dailyReconciliation.upiSales)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-[10px] text-muted-foreground">Card Sales</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{formatINR(dailyReconciliation.cardSales)}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-[10px] text-muted-foreground">Credit Sales</p>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{formatINR(dailyReconciliation.creditSales)}</p>
                      </div>
                    </div>

                    {/* Reconciliation Detail Table */}
                    <div className="rounded-xl border overflow-x-auto overflow-hidden -mx-4 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right hidden sm:table-cell">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium">Total Income (All Modes)</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400 text-right">{formatINR(dailyReconciliation.totalIncome)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">{dailyReconciliation.totalTransactions} sales</TableCell>
                          </TableRow>
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Cash Received</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400 text-right">+{formatINR(dailyReconciliation.cashSales)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">Cash payments</TableCell>
                          </TableRow>
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium text-violet-600 dark:text-violet-400">UPI Received</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-violet-600 dark:text-violet-400 text-right">+{formatINR(dailyReconciliation.upiSales)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">GPay/PhonePe/Paytm</TableCell>
                          </TableRow>
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium text-blue-600 dark:text-blue-400">Card Received</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-blue-600 dark:text-blue-400 text-right">+{formatINR(dailyReconciliation.cardSales)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">Debit/Credit card</TableCell>
                          </TableRow>
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium text-amber-600 dark:text-amber-400">Credit Given</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-amber-600 dark:text-amber-400 text-right">{formatINR(dailyReconciliation.creditSales)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">Outstanding dues</TableCell>
                          </TableRow>
                          {dailyReconciliation.otherSales > 0 && (
                            <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                              <TableCell className="text-sm font-medium">Other Modes</TableCell>
                              <TableCell className="text-sm sm:text-base font-mono text-right">{formatINR(dailyReconciliation.otherSales)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">Mixed/Split</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">Less: Expenses Paid (Cash)</TableCell>
                            <TableCell className="text-sm sm:text-base font-mono text-red-600 dark:text-red-400 text-right">-{formatINR(dailyReconciliation.totalExpenses)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">{dailyReconciliation.expenses.length} expenses</TableCell>
                          </TableRow>
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell className="text-sm">Expected Cash in Hand</TableCell>
                            <TableCell className={`text-sm sm:text-base font-mono text-right ${dailyReconciliation.expectedCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatINR(dailyReconciliation.expectedCash)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right hidden sm:table-cell">Cash In - Expenses</TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>

                    {/* Day GST */}
                    {dailyReconciliation.totalGST > 0 && (
                      <div className="rounded-xl border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">GST Collected on {formatDate(reconDate)}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">CGST</p>
                            <p className="text-sm font-mono font-semibold">{formatINR(dailyReconciliation.dayCGST)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">SGST</p>
                            <p className="text-sm font-mono font-semibold">{formatINR(dailyReconciliation.daySGST)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">IGST</p>
                            <p className="text-sm font-mono font-semibold">{formatINR(dailyReconciliation.dayIGST)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transaction list for that day */}
                    {dailyReconciliation.sales.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Sales Transactions ({formatDate(reconDate)})</h3>
                        <div className="max-h-60 overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Invoice</TableHead>
                                <TableHead className="text-xs">Customer</TableHead>
                                <TableHead className="text-xs">Mode</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dailyReconciliation.sales.map((s) => (
                                <TableRow key={s.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                  <TableCell className="text-xs font-mono">{s.invoiceNo || '—'}</TableCell>
                                  <TableCell className="text-xs">{s.customer?.name || s.customerName || 'Walk-in'}</TableCell>
                                  <TableCell className="text-xs">
                                    <Badge variant="outline" className="text-[10px]">{s.paymentMode || 'Cash'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm sm:text-base font-mono text-right font-semibold">{formatINR(s.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Cash Reconcile Tab ─────────────────────────────────────── */}
        <TabsContent value="cash-reconcile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cash Reconcile
              </CardTitle>
              <CardDescription>Compare expected cash with actual cash in hand for today</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSales || loadingExpenses ? (
                <TableSkeleton rows={4} cols={2} />
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card className="py-4 hover-lift border-l-4 border-l-emerald-500">
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                            <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Today&apos;s Cash Sales</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(todayCashData.cashSales)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-4 hover-lift border-l-4 border-l-red-500">
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
                            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Today&apos;s Cash Expenses</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">{formatINR(todayCashData.cashExpenses)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-4 hover-lift border-l-4 border-l-blue-500">
                      <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${todayCashData.expectedCash >= 0 ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'}`}>
                            <Wallet className={`h-5 w-5 ${todayCashData.expectedCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Expected Cash in Hand</p>
                            <p className={`text-lg font-bold font-mono ${todayCashData.expectedCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(todayCashData.expectedCash)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actual Cash Input and Variance */}
                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="actual-cash" className="text-sm font-medium">Actual Cash in Hand (₹)</Label>
                        <Input
                          id="actual-cash"
                          type="number"
                          placeholder="Enter actual cash count..."
                          value={actualCashInHand}
                          onChange={(e) => setActualCashInHand(e.target.value)}
                          className="text-lg font-mono"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm font-medium">Variance</Label>
                        <div className={`rounded-xl border p-3 h-[42px] flex items-center justify-center ${cashVariance === null ? 'bg-muted/50' : Math.abs(cashVariance) > 500 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                          {cashVariance === null ? (
                            <span className="text-sm text-muted-foreground">Enter actual cash to calculate</span>
                          ) : (
                            <span className={`text-lg font-bold font-mono ${cashVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {cashVariance >= 0 ? '+' : ''}{formatINR(cashVariance)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {cashVariance !== null && Math.abs(cashVariance) > 500 && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-red-700 dark:text-red-300">
                          <p className="font-semibold">Significant variance detected!</p>
                          <p className="mt-0.5">The difference of {formatINR(Math.abs(cashVariance))} exceeds ₹500. Please verify cash transactions.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculation Breakdown Table */}
                  <div className="rounded-xl border overflow-x-auto overflow-hidden -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-sm font-medium">Today&apos;s Cash Sales</TableCell>
                          <TableCell className="text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400 text-right">+{formatINR(todayCashData.cashSales)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">Less: Today&apos;s Expenses (Cash)</TableCell>
                          <TableCell className="text-sm sm:text-base font-mono text-red-600 dark:text-red-400 text-right">-{formatINR(todayCashData.cashExpenses)}</TableCell>
                        </TableRow>
                        {cashVariance !== null && (
                          <>
                            <TableRow>
                              <TableCell className="text-sm font-medium">Expected Cash in Hand</TableCell>
                              <TableCell className="text-sm sm:text-base font-mono text-right font-semibold">{formatINR(todayCashData.expectedCash)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-sm font-medium">Actual Cash in Hand</TableCell>
                              <TableCell className="text-sm sm:text-base font-mono text-right font-semibold">{formatINR(parseFloat(actualCashInHand))}</TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell className="text-sm">
                            {cashVariance !== null ? 'Variance (Actual \u2212 Expected)' : 'Expected Cash in Hand'}
                          </TableCell>
                          <TableCell className={`text-sm sm:text-base font-mono text-right ${cashVariance === null ? '' : cashVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {cashVariance === null ? formatINR(todayCashData.expectedCash) : `${cashVariance >= 0 ? '+' : ''}${formatINR(cashVariance)}`}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Dues Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="dues">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />Customer Dues</CardTitle>
                  <CardDescription>
                    {filteredDues.length} due{filteredDues.length !== 1 ? 's' : ''} &bull; Pending total: {formatINR(totalPendingDues)}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={dueFilter} onValueChange={setDueFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDues ? (
                <TableSkeleton rows={5} cols={6} />
              ) : filteredDues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Wallet className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No dues found</p>
                  <p className="text-xs text-muted-foreground mt-1">All customer payments are up to date</p>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">Paid</TableHead>
                        <TableHead className="text-xs text-right">Balance</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDues.map((due) => {
                        const balance = (due.amount || 0) - (due.paid || 0);
                        const overdue = isDueOverdue(due);
                        const expanded = expandedDueId === due.id;
                        const partialPayments = due.paid > 0 && due.paid < due.amount ? 1 : 0;
                        return (
                          <React.Fragment key={due.id}>
                            <TableRow
                              className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 cursor-pointer"
                              onClick={() => setExpandedDueId(expanded ? null : due.id)}
                            >
                              <TableCell className="text-xs font-medium">
                                <div className="flex items-center gap-1.5">
                                  {overdue && (
                                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                  )}
                                  {due.customer?.name || 'Unknown'}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{due.customer?.phone || '—'}</TableCell>
                              <TableCell className="text-sm sm:text-base text-right font-mono bg-muted/30 sm:bg-transparent rounded-sm">{formatINR(due.amount || 0)}</TableCell>
                              <TableCell className="text-sm sm:text-base text-right font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 sm:bg-transparent sm:dark:bg-transparent rounded-sm">{formatINR(due.paid || 0)}</TableCell>
                              <TableCell className="text-sm sm:text-base text-right font-mono font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 sm:bg-transparent sm:dark:bg-transparent rounded-sm">{formatINR(balance)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <DueStatusBadge status={due.status} />
                                  {overdue && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 dark:bg-red-950 dark:text-red-300 dark:border-red-800">OVERDUE</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{due.dueDate ? formatDate(due.dueDate) : '—'}</TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                {due.status !== 'Paid' ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={`https://wa.me/91${due.customer?.phone || ''}?text=${encodeURIComponent(
                                            `Dear ${due.customer?.name || 'Customer'},\n\nThis is a friendly reminder from i Star Opticals regarding your pending payment of ${formatINR(balance)}.\n${due.dueDate ? `Due date: ${formatDate(due.dueDate)}\n` : ''}Please clear the balance at your earliest convenience.\n\nThank you!`
                                          )}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 touch-manipulation">
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            <span className="sr-only">WhatsApp Reminder</span>
                                          </Button>
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>Send WhatsApp Reminder</TooltipContent>
                                    </Tooltip>
                                    <Button variant="outline" size="sm" className="h-9 min-w-[44px] min-h-[44px] text-xs gap-1 touch-manipulation active:scale-95 transition-transform" onClick={() => openPaymentDialog(due)}>
                                      <IndianRupee className="h-3 w-3" /> Pay
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-9 min-w-[44px] min-h-[44px] text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1 touch-manipulation active:scale-95 transition-transform" onClick={() => handleMarkPaid(due)} disabled={markPaidLoading}>
                                      <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mark Paid</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                            {/* Payment History Expansion Row */}
                            {expanded && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30 px-6 py-3">
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                    <span>Created: <strong className="text-foreground">{formatDate(due.createdAt)}</strong></span>
                                    {due.updatedAt && due.paid > 0 && (
                                      <span>Last payment: <strong className="text-foreground">{formatDate(due.updatedAt)}</strong></span>
                                    )}
                                    <span>Total paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(due.paid)}</strong> of {formatINR(due.amount)}</span>
                                    {due.paid > 0 && due.paid < due.amount && (
                                      <span>Partial payments made: <strong className="text-foreground">{partialPayments}+</strong> (amount tracked)</span>
                                    )}
                                    {due.notes && <span>Notes: {due.notes}</span>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Returns Tab ──────────────────────────────────────────────── */}
        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><RotateCcw className="h-5 w-5" />Returns Management</CardTitle>
                  <CardDescription>Track product returns and refunds</CardDescription>
                </div>
                <Button onClick={openCreateReturn} size="sm" className="gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform"><Plus className="h-4 w-4" />Create Return</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Returns Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Total Returns</p>
                  <p className="text-lg font-bold font-mono">{returns.length}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Total Refund Amount</p>
                  <p className="text-lg font-bold font-mono text-red-600 dark:text-red-400">{formatINR(totalReturnRefund)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">This Month Returns</p>
                  <p className="text-lg font-bold font-mono">{thisMonthReturns.length} <span className="text-sm text-muted-foreground font-normal">({formatINR(thisMonthReturnAmount)})</span></p>
                </div>
              </div>

              {loadingReturns ? (
                <TableSkeleton rows={5} cols={6} />
              ) : returns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Wallet className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No returns recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Refund transactions will appear here</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 touch-manipulation min-h-[44px] active:scale-95 transition-transform" onClick={openCreateReturn}><Plus className="h-3.5 w-3.5" />Create your first return</Button>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-md border -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Invoice #</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Reason</TableHead>
                        <TableHead className="text-xs text-right">Refund Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((ret) => (
                        <TableRow key={ret.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                          <TableCell className="text-xs font-mono">{ret.sale?.invoiceNo || '—'}</TableCell>
                          <TableCell className="text-xs">{ret.sale?.customer?.name || 'Walk-in'}</TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate">{ret.reason}</TableCell>
                          <TableCell className="text-sm sm:text-base text-right font-mono font-medium text-red-600 dark:text-red-400">{formatINR(ret.amount || 0)}</TableCell>
                          <TableCell><ReturnStatusBadge status={ret.status} /></TableCell>
                          <TableCell className="text-xs">{formatDate(ret.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Invoice GST Tab ──────────────────────────────────────── */}
        <TabsContent value="invoice-gst">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice-wise GST Report</CardTitle>
              <CardDescription>GST breakdown for each sale invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceGSTReport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Expense Dialog ──────────────────────────────────────────────── */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update the expense details below' : 'Record a new expense transaction'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="exp-category">Category *</Label>
              <Select value={expForm.category} onValueChange={(v) => setExpForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger id="exp-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-desc">Description *</Label>
              <Input id="exp-desc" placeholder="What was the expense for?" value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exp-amount">Amount (₹) *</Label>
                <Input id="exp-amount" type="number" min="1" placeholder="0" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exp-date">Date *</Label>
                <Input id="exp-date" type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-vendor">Vendor (optional)</Label>
              <Popover open={vendorComboboxOpen} onOpenChange={setVendorComboboxOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="exp-vendor"
                      placeholder="Type or search vendor..."
                      value={expForm.vendor}
                      onChange={(e) => {
                        setExpForm((f) => ({ ...f, vendor: e.target.value }));
                        setVendorComboboxOpen(true);
                      }}
                      onFocus={() => { if (vendorSuggestions.length > 0) setVendorComboboxOpen(true); }}
                      className="pl-9"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Search vendors..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No vendors found.</CommandEmpty>
                      <CommandGroup>
                        {vendorSuggestions
                          .filter((v) => v.toLowerCase().includes(expForm.vendor.toLowerCase()))
                          .map((v) => (
                            <CommandItem
                              key={v}
                              value={v}
                              onSelect={() => {
                                setExpForm((f) => ({ ...f, vendor: v }));
                                setVendorComboboxOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', expForm.vendor === v ? 'opacity-100' : 'opacity-0')} />
                              {v}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">Cancel</Button>
            <Button onClick={handleSaveExpense} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">{editingExpense ? 'Update Expense' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ──────────────────────────────────────────────── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Collect payment from {payingDue?.customer?.name || 'customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-sm font-bold font-mono">{formatINR(payingDue?.amount || 0)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Pending Balance</p>
                <p className="text-sm font-bold font-mono text-red-600">{formatINR((payingDue?.amount || 0) - (payingDue?.paid || 0))}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-amount">Payment Amount (₹) *</Label>
              <Input id="pay-amount" type="number" min="1" placeholder="Enter amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Already paid: {formatINR(payingDue?.paid || 0)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPaymentAmount(String((payingDue?.amount || 0) - (payingDue?.paid || 0)))} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">
                Set Full Amount
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={markPaidLoading} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">
              {markPaidLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Return Dialog ───────────────────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Return</DialogTitle>
            <DialogDescription>Search for a sale and create a return record</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Sale Search */}
            <div className="grid gap-2 relative">
              <Label htmlFor="return-sale-search">Search Sale by Invoice #</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="return-sale-search"
                  placeholder="Type invoice number..."
                  value={returnForm.saleSearch}
                  onChange={(e) => handleSaleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {/* Search Results Dropdown */}
              {saleSearchResults.length > 0 && !selectedReturnSale && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                  {saleSearchResults.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center justify-between gap-2"
                      onClick={() => selectReturnSale(s)}
                    >
                      <span className="font-mono">{s.invoiceNo}</span>
                      <span className="text-muted-foreground">{s.customer?.name || s.customerName}</span>
                      <span className="font-mono font-medium">{formatINR(s.total)}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Selected Sale */}
              {selectedReturnSale && (
                <div className="rounded-xl border bg-muted/50 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-medium">{selectedReturnSale.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">{selectedReturnSale.customer?.name || selectedReturnSale.customerName}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 touch-manipulation" onClick={() => { setSelectedReturnSale(null); setReturnForm((f) => ({ ...f, saleId: '', saleSearch: '' })); }}>
                    <span className="sr-only">Clear</span>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="grid gap-2">
              <Label>Return Reason *</Label>
              <Select value={returnForm.reason} onValueChange={(v) => setReturnForm((f) => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Refund Amount */}
            <div className="grid gap-2">
              <Label htmlFor="return-amount">Refund Amount (₹) *</Label>
              <Input
                id="return-amount"
                type="number"
                min="1"
                placeholder="0"
                value={returnForm.refundAmount}
                onChange={(e) => setReturnForm((f) => ({ ...f, refundAmount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">Cancel</Button>
            <Button onClick={handleCreateReturn} disabled={creatingReturn} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">
              {creatingReturn ? 'Creating...' : 'Create Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Set Budget Dialog ──────────────────────────────────────────── */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Set Monthly Budget</DialogTitle>
            <DialogDescription>Set a spending limit for {format(new Date(), 'MMMM yyyy')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="budget-amount">Budget Amount (₹)</Label>
              <Input
                id="budget-amount"
                type="number"
                min="1"
                placeholder="Enter budget"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
              {monthlyBudget > 0 && (
                <p className="text-xs text-muted-foreground">Current budget: {formatINR(monthlyBudget)}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {monthlyBudget > 0 && (
              <Button variant="outline" onClick={() => { setMonthlyBudget(0); localStorage.removeItem(getBudgetKey()); setBudgetDialogOpen(false); toast.success('Budget cleared'); }} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">Clear Budget</Button>
            )}
            <Button onClick={handleSetBudget} className="touch-manipulation min-h-[44px] active:scale-95 transition-transform">Save Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}