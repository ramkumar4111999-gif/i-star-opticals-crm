"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BarChart3,
  Download,
  Loader2,
  Printer,
  Package,
  AlertTriangle,
  UserPlus,
  Trophy,
  Crown,
  Hash,
} from "lucide-react";
import { format, subDays, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfWeek, startOfYear } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Color Palette ───────────────────────────────────────────────────────────

const COLORS = [
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#047857",
  "#065f46",
  "#d1fae5",
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#86efac",
];

const PAYMENT_COLORS: Record<string, string> = {
  Cash: "#059669",
  UPI: "#7c3aed",
  Card: "#2563eb",
  Credit: "#dc2626",
};

const CHART_GRADIENT_ID = "emeraldGradient";
const THIS_MONTH_COLOR = "#059669";
const LAST_MONTH_COLOR = "#94a3b8";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface ProductSale {
  productId: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  currentStock: number;
  totalQtySold: number;
  totalRevenue: number;
}

interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  group: string;
  loyaltyPoints: number;
  totalSpent: number;
  _count: { sales: number; visits: number; prescriptions: number };
}

interface SaleRecord {
  id: string;
  total: number;
  totalAmount?: number;
  paymentMode: string;
  createdAt: string;
  customerName: string;
  invoiceNo?: string;
  discount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  status?: string;
  customer?: { name: string; phone: string } | null;
  itemsCount?: number;
  subtotal?: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  costPrice: number | null;
  price: number;
}

interface RevenueComparisonSummary {
  thisMonth: { total: number; orders: number; cgst: number; sgst: number; igst: number };
  lastMonth: { total: number; orders: number; cgst: number; sgst: number; igst: number };
  changePercent: number;
}

interface RevenueComparisonDay {
  day: number;
  revenue: number;
  orders: number;
}

interface ProductPerformanceCategory {
  category: string;
  revenue: number;
  qty: number;
  products: number;
}

interface ProductPerformanceItem {
  productId: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  costPrice: number;
  currentStock: number;
  totalQtySold: number;
  totalRevenue: number;
  profitMargin: number;
}

interface CustomerAcquisitionResponse {
  report: string;
  period: string;
  totalNew: number;
  thisWeekNew: number;
  data: Array<{ date: string; newCustomers: number }>;
}

interface DashboardComparisonData {
  comparison?: {
    revenueChange: number;
    customerChange: number;
  };
}

interface InventoryTurnoverItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  costPrice: number;
  currentStock: number;
  minStock: number;
  totalQtySold: number;
  isActive: boolean;
  isLowStock: boolean;
  turnoverRatio: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" className="text-xs">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Chart Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = "",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  valuePrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {valuePrefix}{formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex w-full items-end justify-center gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-8 rounded-t" style={{ height: `${Math.max(40, 60 + Math.random() * 120)}px` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  borderColor?: string;
}

const BORDER_MAP: Record<string, string> = {
  "bg-emerald-600": "border-l-emerald-500",
  "bg-emerald-700": "border-l-emerald-600",
  "bg-teal-600": "border-l-teal-500",
};

function StatCard({ title, value, change, icon, iconBg, borderColor }: StatCardProps) {
  const borderClass = borderColor || BORDER_MAP[iconBg] || "border-l-emerald-500";
  return (
    <Card className={`hover-lift rounded-xl border-l-4 ${borderClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex size-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
          {change !== undefined && (
            <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              change >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            }`}>
              {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

// ─── Data Hooks (plain fetch, no react-query dependency) ──────────────────

function useFetch<T>(url: string | null, fallback: T): { data: T; loading: boolean; error: string | null } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

function useReportsData<T>(type: string, fallbackData: T, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);
  return useFetch<T>(`/api/reports?${params}`, fallbackData);
}

function useSalesData(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams({ limit: "1000" });
  if (dateFrom) params.set("fromDate", dateFrom);
  if (dateTo) params.set("toDate", dateTo);
  return useFetch<{ sales?: SaleRecord[]; data?: SaleRecord[] }>(`/api/sales?${params}`, { sales: [], data: [] });
}

function useProductsData() {
  return useFetch<{ products?: Product[]; data?: Product[] }>("/api/products", { products: [], data: [] });
}

function useTopCustomers() {
  return useFetch<{ data: TopCustomer[] }>("/api/reports?type=top-customers", { data: [] });
}

function useRevenueComparison() {
  return useFetch<{
    summary: RevenueComparisonSummary;
    thisMonthData: RevenueComparisonDay[];
    lastMonthData: RevenueComparisonDay[];
  }>("/api/reports?type=revenue-comparison", { summary: { thisMonth: { total: 0, orders: 0, cgst: 0, sgst: 0, igst: 0 }, lastMonth: { total: 0, orders: 0, cgst: 0, sgst: 0, igst: 0 }, changePercent: 0 }, thisMonthData: [], lastMonthData: [] });
}

function useProductPerformance() {
  return useFetch<{
    categoryData: ProductPerformanceCategory[];
    productData: ProductPerformanceItem[];
    totalProducts: number;
    totalRevenue: number;
  }>("/api/reports?type=product-performance", { categoryData: [], productData: [], totalProducts: 0, totalRevenue: 0 });
}

function useCustomerAcquisitionReport() {
  return useFetch<CustomerAcquisitionResponse>("/api/reports?type=customer-acquisition", { report: "customer-acquisition", period: "last-30-days", totalNew: 0, thisWeekNew: 0, data: [] });
}

function useDashboardComparison() {
  return useFetch<DashboardComparisonData>("/api/dashboard", { salesToday: 0, salesThisMonth: 0, totalCustomers: 0, totalProducts: 0, lowStockCount: 0, pendingAppointments: 0, pendingLabOrders: 0, duesOverdue: 0 });
}

// ─── New Feature Hooks ────────────────────────────────────────────────────

function useAllCustomersForReport() {
  const { data, loading } = useFetch<Record<string, unknown>>("/api/customers?limit=999", {});
  const customers = useMemo(() => {
    const d = data as Record<string, unknown>;
    return (d.data || d.customers || (Array.isArray(d) ? d : [])) as Array<Record<string, unknown>>;
  }, [data]);
  return { data: customers, loading };
}

// ─── Fallback Data ───────────────────────────────────────────────────────────

const FALLBACK_SALES_TREND: SalesTrendPoint[] = [];
const FALLBACK_PRODUCTS: ProductSale[] = [];
const FALLBACK_CUSTOMERS: TopCustomer[] = [];

// ─── PDF Export ───────────────────────────────────────────────────────────────

function usePDFExport() {
  const [exporting, setExporting] = useState(false);

  const exportPDF = useCallback(async (
    title: string,
    elementId: string,
  ) => {
    setExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast.error("Could not find report content to export");
        return;
      }

      // Use browser print as PDF — works universally without extra libs
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups for PDF export");
        return;
      }

      const styles = Array.from(document.styleSheets)
        .map((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
          } catch {
            return "";
          }
        })
        .join("\n");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title} - i Star Opticals</title>
          <style>
            ${styles}
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; color: #111; background: #fff; }
            .print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #059669; padding-bottom: 12px; }
            .print-header h1 { font-size: 20px; margin: 0; color: #059669; }
            .print-header p { font-size: 12px; color: #666; margin: 4px 0 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            tr:nth-child(even) { background: #f9fafb; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .no-print { display: none !important; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>i Star Opticals</h1>
            <p>${title} | Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          ${element.innerHTML}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportPDF };
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Maps tab values to user-friendly report type labels for the dropdown
const REPORT_TYPE_MAP: Record<string, string> = {
  overview: 'sales-trend',
  products: 'top-products',
  acquisition: 'customer-acquisition',
  'top-spenders': 'top-customers',
  'product-perf': 'revenue-comparison',
};

export default function Reports() {
  const today = new Date();
  const defaultFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const defaultTo = format(today, "yyyy-MM-dd");

  const [dateFromInput, setDateFromInput] = useState(defaultFrom);
  const [dateToInput, setDateToInput] = useState(defaultTo);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [activePreset, setActivePreset] = useState<string | null>('thisMonth');
  const [activeTab, setActiveTab] = useState('overview');

  // Quick date range presets
  const datePresets = [
    { key: 'today', label: 'Today', getRange: () => { const d = format(today, "yyyy-MM-dd"); return [d, d]; } },
    { key: 'thisWeek', label: 'This Week', getRange: () => [format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), format(today, "yyyy-MM-dd")] },
    { key: 'thisMonth', label: 'This Month', getRange: () => [format(startOfMonth(today), "yyyy-MM-dd"), format(today, "yyyy-MM-dd")] },
    { key: 'lastMonth', label: 'Last Month', getRange: () => [format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd"), format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd")] },
    { key: 'last3Months', label: 'Last 3 Months', getRange: () => [format(startOfMonth(subMonths(today, 3)), "yyyy-MM-dd"), format(today, "yyyy-MM-dd")] },
    { key: 'thisYear', label: 'This Year', getRange: () => [format(startOfYear(today), "yyyy-MM-dd"), format(today, "yyyy-MM-dd")] },
  ] as const;

  const applyPreset = (preset: (typeof datePresets)[number]) => {
    const [from, to] = preset.getRange();
    setDateFromInput(from); setDateToInput(to);
    setDateFrom(from); setDateTo(to);
    setActivePreset(preset.key);
  };

  const handleApplyDateRange = useCallback(() => {
    setDateFrom(dateFromInput);
    setDateTo(dateToInput);
    setActivePreset(null);
  }, [dateFromInput, dateToInput]);

  const { exporting: csvExporting, exportPDF } = usePDFExport();

  // Fetch data
  const salesTrendQuery = useReportsData<{ data: SalesTrendPoint[] }>("sales-trend", { data: FALLBACK_SALES_TREND }, dateFrom, dateTo);
  const topProductsQuery = useReportsData<{ data: ProductSale[] }>("top-products", { data: FALLBACK_PRODUCTS }, dateFrom, dateTo);
  const topCustomersQuery = useTopCustomers();
  const salesQuery = useSalesData(dateFrom, dateTo);
  const productsQuery = useProductsData();
  const revenueCompQuery = useRevenueComparison();
  const productPerfQuery = useProductPerformance();
  const inventoryTurnoverQuery = useReportsData<{ report: string; totalProducts: number; data: InventoryTurnoverItem[] }>("inventory-turnover", { report: "inventory-turnover", totalProducts: 0, data: [] });
  const customerAcqQuery = useCustomerAcquisitionReport();
  const dashboardQuery = useDashboardComparison();
  const allCustomersQuery = useAllCustomersForReport();

  // Parse raw data with fallbacks
  const salesTrendData = useMemo(() => {
    const raw = salesTrendQuery.data;
    if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return FALLBACK_SALES_TREND;
  }, [salesTrendQuery.data]);

  const topProducts = useMemo(() => {
    const raw = topProductsQuery.data;
    if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return FALLBACK_PRODUCTS;
  }, [topProductsQuery.data]);

  const topCustomers = useMemo(() => {
    const raw = topCustomersQuery.data;
    if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return FALLBACK_CUSTOMERS;
  }, [topCustomersQuery.data]);

  const allSales = useMemo(() => {
    const raw = salesQuery.data;
    if (raw && "sales" in raw && Array.isArray(raw.sales)) return raw.sales;
    if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [] as SaleRecord[];
  }, [salesQuery.data]);

  const allProducts = useMemo(() => {
    const raw = productsQuery.data;
    if (raw && "products" in raw && Array.isArray(raw.products)) return raw.products;
    if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [] as Product[];
  }, [productsQuery.data]);

  // Revenue comparison data
  const revenueComp = useMemo(() => {
    const raw = revenueCompQuery.data;
    if (!raw || !raw.summary) return null;
    return raw as { summary: RevenueComparisonSummary; thisMonthData: RevenueComparisonDay[]; lastMonthData: RevenueComparisonDay[] };
  }, [revenueCompQuery.data]);

  // Product performance data
  const productPerf = useMemo(() => {
    const raw = productPerfQuery.data;
    if (!raw) return null;
    return raw as { categoryData: ProductPerformanceCategory[]; productData: ProductPerformanceItem[]; totalProducts: number; totalRevenue: number };
  }, [productPerfQuery.data]);

  // Customer acquisition report data
  const customerAcqReport = useMemo(() => {
    const raw = customerAcqQuery.data;
    if (!raw || !raw.data) return null;
    return raw;
  }, [customerAcqQuery.data]);

  // Dashboard comparison data
  const dashboardComp = useMemo(() => {
    const raw = dashboardQuery.data;
    if (!raw || !raw.comparison) return null;
    return raw.comparison;
  }, [dashboardQuery.data]);

  // Customer acquisition: this month vs last month from API data
  const customerAcqComparison = useMemo(() => {
    if (!customerAcqReport) return null;
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    let thisMonthNew = 0;
    let lastMonthNew = 0;

    for (const d of customerAcqReport.data) {
      const date = parseISO(d.date);
      if (date >= thisMonthStart) {
        thisMonthNew += d.newCustomers;
      } else if (date >= lastMonthStart && date <= lastMonthEnd) {
        lastMonthNew += d.newCustomers;
      }
    }

    const changePercent = lastMonthNew > 0
      ? Math.round(((thisMonthNew - lastMonthNew) / lastMonthNew) * 100)
      : thisMonthNew > 0 ? 100 : 0;

    return { thisMonthNew, lastMonthNew, changePercent, totalNew: customerAcqReport.totalNew, thisWeekNew: customerAcqReport.thisWeekNew };
  }, [customerAcqReport]);

  // Inventory turnover data
  const inventoryTurnover = useMemo(() => {
    const raw = inventoryTurnoverQuery.data;
    if (!raw || !Array.isArray(raw.data)) return [];
    return raw.data;
  }, [inventoryTurnoverQuery.data]);

  // ─── Revenue Summary from all sales ────────────────────────────────────

  const revenueSummary = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = new Date(dateTo + "T23:59:59");
    const filtered = allSales.filter((s) => {
      try { return isWithinInterval(new Date(s.createdAt), { start: from, end: to }); }
      catch { return false; }
    });
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total || s.totalAmount || 0), 0);
    const numTx = filtered.length;
    const avgValue = numTx > 0 ? Math.round(totalRevenue / numTx) : 0;
    return { totalRevenue, numTx, avgValue };
  }, [allSales, dateFrom, dateTo]);

  // ─── Payment Modes from real sales data ─────────────────────────────────

  const paymentModes = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = new Date(dateTo + "T23:59:59");
    const filtered = allSales.filter((s) => {
      try { return isWithinInterval(new Date(s.createdAt), { start: from, end: to }); }
      catch { return false; }
    });
    const map: Record<string, { mode: string; count: number; amount: number }> = {};
    filtered.forEach((s) => {
      const mode = s.paymentMode || "Cash";
      if (!map[mode]) map[mode] = { mode, count: 0, amount: 0 };
      map[mode].count += 1;
      map[mode].amount += s.total || s.totalAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [allSales, dateFrom, dateTo]);

  // ─── Daily revenue from real data ────────────────────────────────────────

  const dailyRevenue = useMemo((): SalesTrendPoint[] => {
    const from = parseISO(dateFrom);
    const to = new Date(dateTo + "T23:59:59");
    const filtered = allSales.filter((s) => {
      try { return isWithinInterval(new Date(s.createdAt), { start: from, end: to }); }
      catch { return false; }
    });
    const dayMap = new Map<string, { date: string; revenue: number; orders: number }>();
    filtered.forEach((s) => {
      const day = format(new Date(s.createdAt), "yyyy-MM-dd");
      const existing = dayMap.get(day) || { date: day, revenue: 0, orders: 0 };
      existing.revenue += s.total || s.totalAmount || 0;
      existing.orders += 1;
      dayMap.set(day, existing);
    });
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      ...d,
      date: format(parseISO(d.date), "MMM dd"),
    }));
  }, [allSales, dateFrom, dateTo]);

  // ─── Sales by Day of Week ──────────────────────────────────────────────
  const salesByDayOfWeek = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData = dayNames.map((day) => ({ day, revenue: 0, orders: 0 }));
    allSales.forEach((s) => {
      try {
        const d = new Date(s.createdAt);
        const dayIndex = d.getDay();
        dayData[dayIndex].revenue += s.total || s.totalAmount || 0;
        dayData[dayIndex].orders += 1;
      } catch { /* ignore */ }
    });
    // Reorder to start from Monday
    return [...dayData.slice(1), dayData[0]];
  }, [allSales]);

  // ─── Customer acquisition from real sales data ─────────────────────────

  const customerAcquisition = useMemo(() => {
    const seen = new Set<string>();
    const dailyNew: Record<string, number> = {};
    const from = parseISO(dateFrom);
    const to = new Date(dateTo + "T23:59:59");
    allSales
      .filter((s) => {
        try { return isWithinInterval(new Date(s.createdAt), { start: from, end: to }); }
        catch { return false; }
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((s) => {
        const key = s.customer?.name || s.customerName || `anon-${s.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          const day = format(new Date(s.createdAt), "yyyy-MM-dd");
          dailyNew[day] = (dailyNew[day] || 0) + 1;
        }
      });
    return Object.entries(dailyNew)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, newCustomers]) => ({
        date: format(parseISO(date), "MMM dd"),
        newCustomers,
      }));
  }, [allSales, dateFrom, dateTo]);

  // ─── Monthly Customer Acquisition (last 6 months) from /api/customers ──
  const allCustomersList = useMemo(() => {
    const raw = allCustomersQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [allCustomersQuery.data]);

  const monthlyCustomerAcq = useMemo(() => {
    const now = new Date();
    const months: { month: string; newCustomers: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const mStart = startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);
      const mLabel = format(mDate, "MMM yyyy");
      const count = allCustomersList.filter((c) => {
        const createdAt = c.createdAt as string | undefined;
        if (!createdAt) return false;
        try {
          const d = new Date(createdAt);
          return d >= mStart && d <= mEnd;
        } catch {
          return false;
        }
      }).length;
      months.push({ month: mLabel, newCustomers: count });
    }
    return months;
  }, [allCustomersList]);

  const thisMonthNewCustomers = monthlyCustomerAcq[monthlyCustomerAcq.length - 1]?.newCustomers || 0;
  const lastMonthNewCustomers = monthlyCustomerAcq[monthlyCustomerAcq.length - 2]?.newCustomers || 0;
  const customerGrowthPercent = lastMonthNewCustomers > 0
    ? Math.round(((thisMonthNewCustomers - lastMonthNewCustomers) / lastMonthNewCustomers) * 100)
    : thisMonthNewCustomers > 0 ? 100 : 0;

  // ─── Top 10 Products by Inventory Value (price * stock) ────────────────
  const top10InventoryValue = useMemo(() => {
    return [...allProducts]
      .map((p) => ({
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        minStock: p.minStock,
        inventoryValue: p.price * p.stock,
        status: p.stock <= p.minStock ? ("Low Stock" as const) : p.stock > p.minStock * 3 ? ("Overstocked" as const) : ("In Stock" as const),
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 10);
  }, [allProducts]);

  // ─── Top 5 Customers by Spend (from /api/customers) ───────────────────
  const top5CustomersBySpend = useMemo(() => {
    if (!Array.isArray(allCustomersList) || allCustomersList.length === 0) return [];
    return [...allCustomersList]
      .sort((a, b) => ((b.totalSpent as number) || 0) - ((a.totalSpent as number) || 0))
      .slice(0, 5);
  }, [allCustomersList]);

  // ─── Top products by revenue (from real API data) ─────────────────────

  const topProductsByRevenue = useMemo(() => {
    if (topProducts.length === 0) return [];
    return [...topProducts]
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.name || "Unknown",
        revenue: p.totalRevenue || 0,
        quantity: p.totalQtySold || 0,
        category: p.category || "",
      }));
  }, [topProducts]);

  // ─── Monthly revenue for area chart ────────────────────────────────────

  const monthlyRevenue = useMemo((): SalesTrendPoint[] => {
    if (salesTrendData.length === 0) {
      const monthMap = new Map<string, { date: string; revenue: number; orders: number }>();
      allSales.forEach((s) => {
        const month = format(new Date(s.createdAt), "MMM yyyy");
        const existing = monthMap.get(month) || { date: month, revenue: 0, orders: 0 };
        existing.revenue += s.total || s.totalAmount || 0;
        existing.orders += 1;
        monthMap.set(month, existing);
      });
      return Array.from(monthMap.values()).slice(-12);
    }
    return salesTrendData.slice(0, 12).map((d) => ({
      ...d,
      date: format(parseISO(d.date), "MMM yyyy"),
    }));
  }, [salesTrendData, allSales]);

  const totalMonthlyRevenue = monthlyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalMonthlyOrders = monthlyRevenue.reduce((s, d) => s + d.orders, 0);
  const avgMonthlySaleValue = totalMonthlyOrders > 0 ? Math.round(totalMonthlyRevenue / totalMonthlyOrders) : 0;

  // ─── Revenue Comparison Chart Data (merge this month & last month by day) ───

  const comparisonChartData = useMemo(() => {
    if (!revenueComp) return [];
    const maxDays = Math.max(revenueComp.thisMonthData.length, revenueComp.lastMonthData.length);
    const data: { day: number; thisMonth: number; lastMonth: number }[] = [];
    for (let d = 1; d <= maxDays; d++) {
      const tm = revenueComp.thisMonthData.find((x) => x.day === d);
      const lm = revenueComp.lastMonthData.find((x) => x.day === d);
      data.push({
        day: d,
        thisMonth: tm?.revenue || 0,
        lastMonth: lm?.revenue || 0,
      });
    }
    return data;
  }, [revenueComp]);

  // ─── Customer Acquisition Chart Data (this month vs last month daily) ──

  const customerAcqChartData = useMemo(() => {
    if (!customerAcqReport) return [];
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const daysInThisMonth = endOfMonth(now).getDate();
    const daysInLastMonth = lastMonthEnd.getDate();
    const maxDays = Math.max(daysInThisMonth, daysInLastMonth);

    const data: { day: number; thisMonth: number; lastMonth: number }[] = [];
    for (let d = 1; d <= maxDays; d++) {
      // Find this month data
      const thisMonthDate = format(new Date(now.getFullYear(), now.getMonth(), d), "yyyy-MM-dd");
      const thisMonthEntry = customerAcqReport.data.find((x) => x.date === thisMonthDate);
      // Find last month data
      const lastMonthDate = format(new Date(now.getFullYear(), now.getMonth() - 1, d), "yyyy-MM-dd");
      const lastMonthEntry = customerAcqReport.data.find((x) => x.date === lastMonthDate);

      data.push({
        day: d,
        thisMonth: thisMonthEntry?.newCustomers || 0,
        lastMonth: lastMonthEntry?.newCustomers || 0,
      });
    }
    return data;
  }, [customerAcqReport]);

  // ─── CSV Export ──────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleDownloadCSV = useCallback(async () => {
    setExporting(true);
    try {
      const [salesRes, custRes, prodRes] = await Promise.allSettled([
        fetch("/api/sales?limit=999"),
        fetch("/api/customers?limit=999"),
        fetch("/api/products?pageSize=999"),
      ]);

      // ─── Section 1: Sales Summary ───────────────────────────────────
      let salesSheet = "SALES SUMMARY\n";
      salesSheet += "Date,Invoice#,Customer,Items,Subtotal,Discount,Tax,Total,Mode,Status\n";
      if (salesRes.status === "fulfilled" && salesRes.value.ok) {
        const salesData = await salesRes.value.json();
        const list: SaleRecord[] = Array.isArray(salesData.sales) ? salesData.sales : [];
        for (const s of list) {
          const dateStr = s.createdAt ? format(new Date(s.createdAt), "dd-MMM-yyyy") : "";
          const items = s.itemsCount || 0;
          const disc = s.discount || 0;
          const tax = (s.cgst || 0) + (s.sgst || 0) + (s.igst || 0);
          const line = [
            dateStr,
            `"${s.invoiceNo || ""}"`,
            `"${(s.customer?.name || s.customerName || "").replace(/"/g, '""')}"`,
            items,
            s.subtotal || 0,
            disc,
            tax,
            s.total || s.totalAmount || 0,
            s.paymentMode || "",
            s.status || "",
          ].join(",");
          salesSheet += line + "\n";
        }
      }

      // ─── Section 2: Customer Summary ────────────────────────────────
      let customerSheet = "\nCUSTOMER SUMMARY\n";
      customerSheet += "Name,Phone,Group,Orders,Total Spent\n";
      const customersMap = new Map<string, { orders: number; spent: number }>();
      if (salesRes.status === "fulfilled" && salesRes.value.ok) {
        const salesData = await salesRes.value.json();
        const list: SaleRecord[] = Array.isArray(salesData.sales) ? salesData.sales : [];
        for (const s of list) {
          const name = s.customer?.name || s.customerName || "Walk-in";
          const existing = customersMap.get(name) || { orders: 0, spent: 0 };
          existing.orders += 1;
          existing.spent += s.total || s.totalAmount || 0;
          customersMap.set(name, existing);
        }
      }
      if (custRes.status === "fulfilled" && custRes.value.ok) {
        const custData = await custRes.value.json();
        const custList = Array.isArray(custData.data) ? custData.data : [];
        for (const c of custList) {
          const r = c as Record<string, unknown>;
          const stats = customersMap.get(r.name as string) || { orders: 0, spent: 0 };
          const line = [
            `"${(r.name || "").toString().replace(/"/g, '""')}"`,
            `"${(r.phone || "").toString()}"`,
            `"${(r.group || "New").toString()}"`,
            stats.orders,
            stats.spent,
          ].join(",");
          customerSheet += line + "\n";
        }
      }

      // ─── Section 3: Product Performance ─────────────────────────────
      let productSheet = "\nPRODUCT PERFORMANCE\n";
      productSheet += "Name,Category,Price,Stock,Qty Sold,Revenue\n";
      if (prodRes.status === "fulfilled" && prodRes.value.ok) {
        try {
          const perfRes = await fetch("/api/reports?type=product-performance");
          if (perfRes.ok) {
            const perfData = await perfRes.json();
            const perfList = Array.isArray(perfData.data) ? perfData.data : [];
            const perfMap = new Map<string, { qty: number; revenue: number }>();
            if (Array.isArray(perfData.productData)) {
              for (const p of perfData.productData) {
                perfMap.set(p.name, { qty: p.totalQtySold, revenue: p.totalRevenue });
              }
            }
            const prodData = await prodRes.value.json();
            const prodList = Array.isArray(prodData.products) ? prodData.products : [];
            for (const p of prodList) {
              const pr = p as Record<string, unknown>;
              const perf = perfMap.get(pr.name as string) || { qty: 0, revenue: 0 };
              const line = [
                `"${(pr.name || "").toString().replace(/"/g, '""')}"`,
                `"${(pr.category || "").toString()}"`,
                pr.price || 0,
                pr.stock || 0,
                perf.qty,
                perf.revenue,
              ].join(",");
              productSheet += line + "\n";
            }
          }
        } catch {
          for (const p of (await prodRes.value.json()).products || []) {
            const pr = p as Record<string, unknown>;
            const line = [
              `"${(pr.name || "").toString().replace(/"/g, '""')}"`,
              `"${(pr.category || "").toString()}"`,
              pr.price || 0,
              pr.stock || 0,
              0, 0,
            ].join(",");
            productSheet += line + "\n";
          }
        }
      }

      const csvContent = salesSheet + "\n" + customerSheet + "\n" + productSheet;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully!");
    } catch {
      toast.error("Failed to download report");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6 py-4 md:py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Reports &amp; Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Business insights for i Star Opticals
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-h-[44px] touch-manipulation"
            onClick={() => exportPDF("Reports & Analytics", "reports-content")}
            disabled={csvExporting}
          >
            {csvExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-h-[44px] touch-manipulation"
            onClick={handleDownloadCSV}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download CSV
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card className="hover-lift rounded-xl">
        <CardContent className="p-4 space-y-3">
          {/* Quick Preset Pills */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick date range presets">
            {datePresets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset)}
                className={`min-w-[44px] min-h-[44px] px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation cursor-pointer border ${
                  activePreset === preset.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Manual Date Inputs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Custom Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="rpt-from" className="text-xs">From</Label>
                <Input id="rpt-from" type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)} className="h-9 w-[150px] text-xs" />
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="rpt-to" className="text-xs">To</Label>
                <Input id="rpt-to" type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)} className="h-9 w-[150px] text-xs" />
              </div>
              <Button variant="default" size="sm" className="text-xs min-h-[44px] touch-manipulation gap-1.5" onClick={handleApplyDateRange}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(revenueSummary.totalRevenue)} icon={<DollarSign className="size-5 text-white" />} iconBg="bg-emerald-600" />
        <StatCard title="Avg Sale Value" value={formatCurrency(revenueSummary.avgValue)} icon={<IndianRupee className="size-5 text-white" />} iconBg="bg-teal-600" />
        <StatCard title="Transactions" value={formatNumber(revenueSummary.numTx)} icon={<ShoppingCart className="size-5 text-white" />} iconBg="bg-emerald-700" />
      </div>

      {/* Revenue Comparison: This Month vs Last Month */}
      {revenueComp && (
        <Card className="hover-lift rounded-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue Comparison
                </CardTitle>
                <CardDescription>This month vs last month</CardDescription>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(revenueComp.summary.thisMonth.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Month</p>
                  <p className="text-lg font-bold font-mono text-muted-foreground">{formatCurrency(revenueComp.summary.lastMonth.total)}</p>
                </div>
                <Badge className={`rounded-full text-xs ${revenueComp.summary.changePercent >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                  {revenueComp.summary.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> : <ArrowDownRight className="h-3 w-3 inline mr-0.5" />}
                  {Math.abs(revenueComp.summary.changePercent)}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {comparisonChartData.length === 0 ? (
              <ChartSkeleton height={260} />
            ) : (
              <div className="space-y-4">
                {/* Dual-bar chart comparing this month vs last month */}
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      content={<ChartTooltip valuePrefix="₹" />}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "thisMonth" ? "This Month" : "Last Month"]}
                    />
                    <Legend formatter={(v: string) => <span className="text-xs">{v === "thisMonth" ? "This Month" : "Last Month"}</span>} />
                    <Bar dataKey="lastMonth" fill={LAST_MONTH_COLOR} radius={[2, 2, 0, 0]} barSize={14} name="Last Month" opacity={0.7} />
                    <Bar dataKey="thisMonth" fill={THIS_MONTH_COLOR} radius={[2, 2, 0, 0]} barSize={14} name="This Month" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Comparison details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] text-muted-foreground">This Month Orders</p>
                    <p className="text-sm font-bold font-mono">{revenueComp.summary.thisMonth.orders}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] text-muted-foreground">Last Month Orders</p>
                    <p className="text-sm font-bold font-mono text-muted-foreground">{revenueComp.summary.lastMonth.orders}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] text-muted-foreground">Avg Order Value (This)</p>
                    <p className="text-sm font-bold font-mono">
                      {revenueComp.summary.thisMonth.orders > 0 ? formatCurrency(Math.round(revenueComp.summary.thisMonth.total / revenueComp.summary.thisMonth.orders)) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] text-muted-foreground">Avg Order Value (Last)</p>
                    <p className="text-sm font-bold font-mono text-muted-foreground">
                      {revenueComp.summary.lastMonth.orders > 0 ? formatCurrency(Math.round(revenueComp.summary.lastMonth.total / revenueComp.summary.lastMonth.orders)) : "—"}
                    </p>
                  </div>
                </div>

                {/* Customer Change from Dashboard */}
                {dashboardComp && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold">Customer Growth</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customer acquisitions changed by{" "}
                      <span className={`font-semibold ${dashboardComp.customerChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {dashboardComp.customerChange >= 0 ? '+' : ''}{dashboardComp.customerChange}%
                      </span>{" "}
                      compared to last month
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div id="reports-content">
        {/* Report Type Dropdown — discoverable alternative to tabs on mobile */}
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="report-type-select" className="text-sm font-medium whitespace-nowrap">Report Type:</Label>
          <Select
            value={REPORT_TYPE_MAP[activeTab as keyof typeof REPORT_TYPE_MAP] ?? ''}
            onValueChange={(val) => {
              const mapped = Object.entries(REPORT_TYPE_MAP).find(([, v]) => v === val);
              if (mapped) setActiveTab(mapped[0]);
            }}
          >
            <SelectTrigger id="report-type-select" className="w-full sm:w-[220px] h-11 min-h-[44px] touch-manipulation">
              <SelectValue placeholder="Jump to report…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales-trend">Sales Trend</SelectItem>
              <SelectItem value="top-products">Top Products</SelectItem>
              <SelectItem value="customer-acquisition">Customer Acquisition</SelectItem>
              <SelectItem value="revenue-comparison">Revenue Comparison</SelectItem>
              <SelectItem value="top-customers">Top Customers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="overflow-x-auto flex-nowrap h-auto gap-1 w-full">
            <TabsTrigger value="overview" className="gap-1.5 min-h-[44px] touch-manipulation"><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5 min-h-[44px] touch-manipulation"><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Products</span></TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5 min-h-[44px] touch-manipulation"><Users className="h-4 w-4" /><span className="hidden sm:inline">Customers</span></TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 min-h-[44px] touch-manipulation"><Package className="h-4 w-4" /><span className="hidden sm:inline">Inventory</span></TabsTrigger>
            <TabsTrigger value="acquisition" className="gap-1.5 min-h-[44px] touch-manipulation"><UserPlus className="h-4 w-4" /><span className="hidden sm:inline">Acquisition</span></TabsTrigger>
            <TabsTrigger value="product-perf" className="gap-1.5 min-h-[44px] touch-manipulation"><Trophy className="h-4 w-4" /><span className="hidden sm:inline">Performance</span></TabsTrigger>
            <TabsTrigger value="top-spenders" className="gap-1.5 min-h-[44px] touch-manipulation"><Crown className="h-4 w-4" /><span className="hidden sm:inline">Top Spenders</span></TabsTrigger>
            <TabsTrigger value="monthly-acq" className="gap-1.5 min-h-[44px] touch-manipulation"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Monthly Acq.</span></TabsTrigger>
            <TabsTrigger value="inventory-value" className="gap-1.5 min-h-[44px] touch-manipulation"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Inventory Val.</span></TabsTrigger>
            <TabsTrigger value="day-of-week" className="gap-1.5 min-h-[44px] touch-manipulation"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Day of Week</span></TabsTrigger>
          </TabsList>

          {/* ─── Overview Tab ──────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Revenue Trend + Payment Modes */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="hover-lift rounded-xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
                    <CardDescription>Revenue over the past 12 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {monthlyRevenue.length === 0 ? (
                      <ChartSkeleton height={270} />
                    ) : (
                      <ResponsiveContainer width="100%" height={270}>
                        <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip content={<ChartTooltip valuePrefix="₹" />} formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                          <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill={`url(#${CHART_GRADIENT_ID})`} name="Revenue" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Mode Pie Chart */}
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Sales by Payment Mode</CardTitle>
                    <CardDescription>UPI, Cash, Card distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentModes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                        <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                        <p className="text-sm">No sales data in selected period</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={270}>
                        <PieChart>
                          <Pie
                            data={paymentModes}
                            cx="50%"
                            cy="45%"
                            outerRadius={85}
                            innerRadius={40}
                            dataKey="amount"
                            nameKey="mode"
                            labelLine={false}
                            label={renderCustomLabel}
                          >
                            {paymentModes.map((entry) => (
                              <Cell key={entry.mode} fill={PAYMENT_COLORS[entry.mode] || COLORS[paymentModes.indexOf(entry) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<ChartTooltip valuePrefix="₹" />}
                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                          />
                          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-foreground">{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment Mode Bar Chart */}
              {paymentModes.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Payment Mode Breakdown</CardTitle>
                    <CardDescription>Transaction count and revenue by payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={paymentModes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <XAxis dataKey="mode" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number, name: string) => {
                            if (name === "amount") return [formatCurrency(value), "Revenue"];
                            return [formatNumber(value), "Count"];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40} name="Revenue (₹)">
                          {paymentModes.map((entry) => (
                            <Cell key={entry.mode} fill={PAYMENT_COLORS[entry.mode] || COLORS[0]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Daily Revenue Line Chart */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Daily Revenue ({format(parseISO(dateFrom), "dd MMM")} - {format(parseISO(dateTo), "dd MMM yyyy")})</CardTitle>
                  <CardDescription>Daily revenue and transaction count</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyRevenue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] sm:h-[230px] lg:h-[260px] text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No sales data in selected period</p>
                  </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Revenue"];
                            return [formatNumber(value), "Orders"];
                          }}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#059669" }} name="Revenue" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: "#34d399" }} name="Orders" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Products Tab ──────────────────────────────────────────── */}
          <TabsContent value="products">
            <div className="space-y-6">
              {/* Product Performance by Category */}
              {productPerf && productPerf.categoryData.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Revenue by Category</CardTitle>
                        <CardDescription>Total revenue and quantity by product category</CardDescription>
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {formatCurrency(productPerf.totalRevenue)} total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(280, productPerf.categoryData.length * 40 + 20)}>
                      <BarChart data={productPerf.categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={95} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Revenue"];
                            return [formatNumber(value), "Products"];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18} name="Revenue">
                          {productPerf.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Top 10 Products by Revenue</CardTitle>
                  <CardDescription>Highest revenue-generating products</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProductsByRevenue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No product sales data available</p>
                  </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(350, topProductsByRevenue.length * 38 + 20)}>
                      <BarChart data={topProductsByRevenue} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={115} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Revenue"];
                            return [formatNumber(value), "Qty Sold"];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#059669" radius={[0, 4, 4, 0]} barSize={18} name="Revenue (₹)">
                          {topProductsByRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Full Product Performance Table */}
              {productPerf && productPerf.productData.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Product Performance Details</CardTitle>
                    <CardDescription>All products ranked by revenue with margin analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="text-right">Qty Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="hidden md:table-cell text-right">Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productPerf.productData.slice(0, 30).map((p, i) => (
                            <TableRow key={p.productId}>
                              <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(p.totalQtySold)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(p.totalRevenue)}</TableCell>
                              <TableCell className="hidden md:table-cell text-right">
                                <Badge variant="outline" className={`rounded-full text-xs ${p.profitMargin > 40 ? 'text-emerald-600' : p.profitMargin > 20 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {p.profitMargin}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product table */}
              {topProductsByRevenue.length > 0 && !productPerf && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Product Revenue Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProductsByRevenue.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(p.quantity)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(p.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Customers Tab ────────────────────────────────────────── */}
          <TabsContent value="customers">
            <div className="space-y-6">
              {/* Customer Acquisition Chart */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Customer Acquisition</CardTitle>
                  <CardDescription>New customers per day in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {customerAcquisition.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] sm:h-[220px] lg:h-[240px] text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No customer acquisition data in selected period</p>
                  </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={customerAcquisition} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} formatter={(value: number) => [formatNumber(value), "New Customers"]} />
                        <Line type="monotone" dataKey="newCustomers" stroke="#059669" strokeWidth={2.5} dot={{ fill: "#059669", r: 4 }} activeDot={{ r: 6, fill: "#059669" }} name="New Customers" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Customers Table */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Top Customers by Total Spend</CardTitle>
                  <CardDescription>Highest spending customers in the selected period</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {topCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">No customer data available</p>
                    </div>
                  ) : (
                    <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Phone</TableHead>
                            <TableHead className="hidden md:table-cell">Group</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Total Spent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topCustomers.map((c, i) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                              <TableCell className="font-medium text-sm">{c.name}</TableCell>
                              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{c.phone || "—"}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="secondary" className="rounded-full text-xs">{c.group || "New"}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{c._count?.sales ?? 0}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.totalSpent || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Inventory Tab ────────────────────────────────────────── */}
          <TabsContent value="inventory">
            <div className="space-y-6">
              {inventoryTurnover.length === 0 ? (
                <Card className="hover-lift rounded-xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No inventory data available</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Low Stock Alerts */}
                  {inventoryTurnover.filter((p) => p.isLowStock).length > 0 && (
                    <Card className="hover-lift rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Low Stock Alerts
                        </CardTitle>
                        <CardDescription>Products below minimum stock level</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-96 overflow-x-auto overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="hidden md:table-cell">Category</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">Min Stock</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inventoryTurnover.filter((p) => p.isLowStock).slice(0, 20).map((p) => (
                                <TableRow key={p.productId}>
                                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">{p.sku}</TableCell>
                                  <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                                  <TableCell className="text-right font-mono text-sm text-red-600 dark:text-red-400 font-semibold">{p.currentStock}</TableCell>
                                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{p.minStock}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Inventory Turnover Table */}
                  <Card className="hover-lift rounded-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Inventory Turnover</CardTitle>
                          <CardDescription>Products ranked by quantity sold</CardDescription>
                        </div>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {inventoryTurnover.length} products
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead className="hidden sm:table-cell">SKU</TableHead>
                              <TableHead className="hidden md:table-cell">Category</TableHead>
                              <TableHead className="text-right">Qty Sold</TableHead>
                              <TableHead className="text-right">In Stock</TableHead>
                              <TableHead className="hidden lg:table-cell text-right">Turnover</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inventoryTurnover.slice(0, 50).map((p, i) => (
                              <TableRow key={p.productId}>
                                <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                                <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">{p.sku}</TableCell>
                                <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatNumber(p.totalQtySold)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  <span className={p.isLowStock ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{p.currentStock}</span>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-right font-mono text-sm">
                                  {p.turnoverRatio === Infinity ? '∞' : p.turnoverRatio.toFixed(1)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* ─── Customer Acquisition Tab ─────────────────────────────── */}
          <TabsContent value="acquisition">
            <div className="space-y-6">
              {/* Summary Cards: This Month vs Last Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="New Customers (This Month)"
                  value={formatNumber(customerAcqComparison?.thisMonthNew ?? 0)}
                  change={customerAcqComparison?.changePercent}
                  icon={<UserPlus className="size-5 text-white" />}
                  iconBg="bg-emerald-600"
                />
                <Card className="hover-lift rounded-xl border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">New (Last Month)</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(customerAcqComparison?.lastMonthNew ?? 0)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Previous month</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">This Week</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(customerAcqReport?.thisWeekNew ?? 0)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">New this week</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-violet-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">30-Day Total</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(customerAcqReport?.totalNew ?? 0)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Display */}
              {customerAcqComparison && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Month-over-Month Comparison
                    </CardTitle>
                    <CardDescription>This month vs last month new customer acquisition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                      {/* Last Month */}
                      <div className="text-center p-4 rounded-xl border bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Last Month</p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-muted-foreground">{customerAcqComparison.lastMonthNew}</p>
                        <p className="text-xs text-muted-foreground mt-1">new customers</p>
                      </div>
                      {/* Change Arrow */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold ${
                          customerAcqComparison.changePercent >= 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {customerAcqComparison.changePercent >= 0
                            ? <ArrowUpRight className="h-5 w-5" />
                            : <ArrowDownRight className="h-5 w-5" />
                          }
                          {Math.abs(customerAcqComparison.changePercent)}%
                        </div>
                        <p className="text-xs text-muted-foreground">change</p>
                      </div>
                      {/* This Month */}
                      <div className="text-center p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-muted-foreground mb-1">This Month</p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{customerAcqComparison.thisMonthNew}</p>
                        <p className="text-xs text-muted-foreground mt-1">new customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* BarChart: This Month vs Last Month Daily Acquisition */}
              {customerAcqChartData.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Daily Customer Acquisition Comparison</CardTitle>
                    <CardDescription>This month vs last month — daily new customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={customerAcqChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                                <p className="mb-1 text-sm font-medium text-foreground">Day {label}</p>
                                {payload.map((entry, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-muted-foreground">{entry.name}:</span>
                                    <span className="font-medium text-foreground">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend formatter={(v: string) => <span className="text-xs">{v === "thisMonth" ? "This Month" : "Last Month"}</span>} />
                        <Bar dataKey="lastMonth" fill={LAST_MONTH_COLOR} radius={[2, 2, 0, 0]} barSize={14} name="Last Month" opacity={0.7} />
                        <Bar dataKey="thisMonth" fill={THIS_MONTH_COLOR} radius={[2, 2, 0, 0]} barSize={14} name="This Month" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Daily Trend from API */}
              {customerAcqReport && customerAcqReport.data.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Customer Acquisition Trend (Last 30 Days)</CardTitle>
                    <CardDescription>Daily new customer registrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={customerAcqReport.data.map((d) => ({
                          date: format(parseISO(d.date), "MMM dd"),
                          newCustomers: d.newCustomers,
                        }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} formatter={(value: number) => [formatNumber(value), "New Customers"]} />
                        <Line type="monotone" dataKey="newCustomers" stroke="#059669" strokeWidth={2.5} dot={{ fill: "#059669", r: 3 }} activeDot={{ r: 6, fill: "#059669" }} name="New Customers" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Product Performance Tab ─────────────────────────────── */}
          <TabsContent value="product-perf">
            <div className="space-y-6">
              {/* Summary Stats */}
              {productPerf && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="hover-lift rounded-xl border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Products with Sales</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(productPerf.totalProducts)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">of {formatNumber(allProducts.length)} total products</p>
                    </CardContent>
                  </Card>
                  <Card className="hover-lift rounded-xl border-l-4 border-l-teal-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(productPerf.totalRevenue)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">from product sales</p>
                    </CardContent>
                  </Card>
                  <Card className="hover-lift rounded-xl border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Categories</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(productPerf.categoryData.length)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">active categories</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Top Selling Products Table */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Top Selling Products by Revenue
                      </CardTitle>
                      <CardDescription>Product Name, Units Sold, and Revenue</CardDescription>
                    </div>
                    <Badge variant="outline" className="rounded-full text-xs">Top 10</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {productPerf && productPerf.productData.length > 0 ? (
                    <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="hidden md:table-cell">Brand</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productPerf.productData.slice(0, 10).map((p, i) => (
                            <TableRow key={p.productId}>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {i === 0 ? <Crown className="h-4 w-4 text-amber-500" /> : i + 1}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category || "—"}</Badge></TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.brand || "—"}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(p.totalQtySold)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalRevenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : topProductsByRevenue.length > 0 ? (
                    <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProductsByRevenue.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {i === 0 ? <Crown className="h-4 w-4 text-amber-500" /> : i + 1}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatNumber(p.quantity)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">No product performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Category Horizontal Bar Chart */}
              {productPerf && productPerf.categoryData.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Revenue by Category</CardTitle>
                    <CardDescription>Horizontal bar chart of category revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(280, productPerf.categoryData.length * 40 + 20)}>
                      <BarChart data={productPerf.categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={95} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Revenue"];
                            return [formatNumber(value), "Qty"];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18} name="Revenue">
                          {productPerf.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Top Spenders Tab ─────────────────────────────────────── */}
          <TabsContent value="top-spenders">
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="hover-lift rounded-xl border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">#1 Customer</span>
                    </div>
                    {topCustomers.length > 0 ? (
                      <>
                        <p className="text-lg font-bold tracking-tight truncate">{topCustomers[0].name}</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(topCustomers[0].totalSpent || 0)}</p>
                      </>
                    ) : (
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-muted-foreground">—</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Top 10 Spend</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(topCustomers.slice(0, 10).reduce((s, c) => s + (c.totalSpent || 0), 0))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">combined from top 10</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg Spend (Top 10)</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                      {topCustomers.length > 0
                        ? formatCurrency(Math.round(topCustomers.slice(0, 10).reduce((s, c) => s + (c.totalSpent || 0), 0) / Math.min(10, topCustomers.length)))
                        : "—"
                      }
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">per customer average</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top 5 Customers by Spend — Ranked List with Medals */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Top 5 Customers by Spend
                  </CardTitle>
                  <CardDescription>Highest spending customers ranked</CardDescription>
                </CardHeader>
                <CardContent>
                  {top5CustomersBySpend.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No customer data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {top5CustomersBySpend.map((c, i) => {
                        const medals = ["🥇", "🥈", "🥉"];
                        const rankDisplay = i < 3 ? medals[i] : `#${i + 1}`;
                        return (
                          <div
                            key={c.id as string || i}
                            className={`flex items-center gap-4 rounded-xl border p-4 ${
                              i === 0
                                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                : i === 1
                                ? "bg-gray-50/60 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700"
                                : i === 2
                                ? "bg-orange-50/40 dark:bg-orange-950/15 border-orange-200 dark:border-orange-800"
                                : "bg-muted/20"
                            }`}
                          >
                            <span className="text-2xl w-10 text-center flex-shrink-0">{rankDisplay}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{c.name as string}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.phone ? `${c.phone as string}` : "No phone"}
                                {c.group ? ` • ${c.group as string}` : ""}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency((c.totalSpent as number) || 0)}
                              </p>
                              <Badge variant="secondary" className="rounded-full text-[10px] mt-0.5">
                                {(c.group as string) || "New"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Customers Table */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        Top 10 Customers by Total Spent
                      </CardTitle>
                      <CardDescription>Highest lifetime spend customers</CardDescription>
                    </div>
                    <Badge variant="outline" className="rounded-full text-xs">Lifetime</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {topCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">No customer data available</p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Phone</TableHead>
                            <TableHead className="hidden md:table-cell">Group</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Total Spent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topCustomers.slice(0, 10).map((c, i) => (
                            <TableRow key={c.id} className={i === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {i === 0 ? <Crown className="h-4 w-4 text-amber-500" /> : i === 1 ? <Crown className="h-4 w-4 text-gray-400" /> : i === 2 ? <Crown className="h-4 w-4 text-amber-700" /> : i + 1}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{c.name}</TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="secondary" className="rounded-full text-xs">{c.group || "New"}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{c._count?.sales ?? 0}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.totalSpent || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Horizontal Bar Chart: Top 10 by Spend */}
              {topCustomers.length > 0 && (
                <Card className="hover-lift rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Customer Spend Distribution</CardTitle>
                    <CardDescription>Top 10 customers visualized by total spent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(300, topCustomers.slice(0, 10).length * 40 + 20)}>
                      <BarChart
                        data={topCustomers.slice(0, 10).map((c, i) => ({ name: c.name, spent: c.totalSpent || 0, rank: i + 1 }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={115} />
                        <Tooltip
                          content={<ChartTooltip valuePrefix="₹" />}
                          formatter={(value: number) => [formatCurrency(value), "Total Spent"]}
                        />
                        <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={18} name="Total Spent">
                          {topCustomers.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#92400e' : COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Monthly Acquisition Tab ────────────────────────────── */}
          <TabsContent value="monthly-acq">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  title="New Customers This Month"
                  value={formatNumber(thisMonthNewCustomers)}
                  change={customerGrowthPercent}
                  icon={<UserPlus className="size-5 text-white" />}
                  iconBg="bg-emerald-600"
                />
                <Card className="hover-lift rounded-xl border-l-4 border-l-slate-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Last Month New</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(lastMonthNewCustomers)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">for comparison</p>
                  </CardContent>
                </Card>
              </div>

              {/* 6-Month Bar Chart */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    New Customers Per Month (Last 6 Months)
                  </CardTitle>
                  <CardDescription>Monthly new customer registrations from CRM</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyCustomerAcq.length === 0 ? (
                    <ChartSkeleton height={210} />
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={monthlyCustomerAcq} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} formatter={(value: number) => [formatNumber(value), "New Customers"]} />
                        <Bar dataKey="newCustomers" radius={[4, 4, 0, 0]} barSize={32} name="New Customers">
                          {monthlyCustomerAcq.map((_, i) => (
                            <Cell key={i} fill={i === monthlyCustomerAcq.length - 1 ? THIS_MONTH_COLOR : LAST_MONTH_COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Inventory Value Tab ────────────────────────────────── */}
          <TabsContent value="inventory-value">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="hover-lift rounded-xl border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Products</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{formatNumber(allProducts.length)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">in catalogue</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-teal-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Inventory Value</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(allProducts.reduce((s, p) => s + p.price * p.stock, 0))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">price × stock</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift rounded-xl border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">Low Stock Items</span>
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                      {formatNumber(allProducts.filter((p) => p.stock <= p.minStock).length)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">need reordering</p>
                  </CardContent>
                </Card>
              </div>

              {/* Horizontal Bar Chart: Top 10 by Inventory Value */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Top 10 Products by Inventory Value</CardTitle>
                  <CardDescription>Products with highest price × stock value</CardDescription>
                </CardHeader>
                <CardContent>
                  {top10InventoryValue.length === 0 ? (
                    <ChartSkeleton height={210} />
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(250, top10InventoryValue.length * 35 + 20)}>
                      <BarChart data={top10InventoryValue} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={115} />
                        <Tooltip content={<ChartTooltip valuePrefix="₹" />} formatter={(value: number) => [formatCurrency(value), "Inventory Value"]} />
                        <Bar dataKey="inventoryValue" radius={[0, 4, 4, 0]} barSize={18} name="Inventory Value">
                          {top10InventoryValue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Product Inventory Value Table */}
              <Card className="hover-lift rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Inventory Value Details</CardTitle>
                  <CardDescription>Product Name, Category, Price, Stock, Inventory Value, Status</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-x-auto overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Category</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Inventory Value</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {top10InventoryValue.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">{p.name}</TableCell>
                            <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="rounded-full text-xs">{p.category}</Badge></TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(p.price)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatNumber(p.stock)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.inventoryValue)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={p.status === "Low Stock" ? "destructive" : p.status === "Overstocked" ? "secondary" : "outline"} className="rounded-full text-xs">
                                {p.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Day of Week Tab ───────────────────────────────────────── */}
          <TabsContent value="day-of-week">
            <Card className="hover-lift rounded-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Sales by Day of Week
                </CardTitle>
                <CardDescription>Which days generate the most revenue? Use this for staffing and promotions.</CardDescription>
              </CardHeader>
              <CardContent>
                {salesByDayOfWeek.every((d) => d.revenue === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No sales data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={salesByDayOfWeek} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip valuePrefix="₹" />} />
                        <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} barSize={36} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {salesByDayOfWeek.map((d) => {
                        const avg = d.orders > 0 ? Math.round(d.revenue / d.orders) : 0;
                        return (
                          <div key={d.day} className="rounded-xl border p-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground font-medium">{d.day.slice(0, 3)}</p>
                            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(d.revenue)}</p>
                            <p className="text-[10px] text-muted-foreground">{d.orders} orders</p>
                            <p className="text-[10px] text-muted-foreground">Avg: {formatCurrency(avg)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}