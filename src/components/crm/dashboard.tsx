'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Wallet,
  Clock,
  Eye,
  EyeOff,
  ShoppingCart,
  UserPlus,
  CalendarDays,
  TestTube,
  Target,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Loader2,
  Receipt,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { getSettings } from '@/lib/settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import { useCrmStore, type SectionKey } from '@/components/crm/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface DashboardStats {
  totalCustomers: number;
  todaySales: number;
  monthlyRevenue: number;
  lowStockAlerts: number;
  pendingLabOrders: number;
  pendingDues: number;
  overdueAppointments?: number;
}

interface CustomerAcquisition {
  thisMonth: number;
  lastMonth: number;
  byGroup: { New: number; Regular: number; Wholesale: number; Premium: number };
}

interface DayRevenue {
  day: string;
  revenue: number;
}

interface Comparison {
  revenueChange: number;
  customerChange: number;
}

interface PendingTasks {
  labOrdersPending: number;
  duesOverdue: number;
  appointmentsToday: number;
  lowStockItems: number;
}

interface SalesTrendPoint {
  date: string;
  revenue: number;
}

interface TopProduct {
  name: string;
  salesCount: number;
}

interface RecentSale {
  invoiceNo: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMode: string;
}

interface Appointment {
  time: string;
  customerName: string;
  purpose: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

interface LowStockProduct {
  name: string;
  stock: number;
  minStock: number;
}

type DateRangePreset = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last3Months';

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(num: number): string {
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// ───────────────────────────────────────────────
// Stat Card Config
// ───────────────────────────────────────────────

interface StatCardConfig {
  key: keyof DashboardStats;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  format: (val: number) => string;
  navigateTo: SectionKey;
}

const statCards: StatCardConfig[] = [
  {
    key: 'totalCustomers',
    label: 'Total Customers',
    icon: Users,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    format: (v) => v.toLocaleString('en-IN'),
    navigateTo: 'customers',
  },
  {
    key: 'todaySales',
    label: "Today's Sales",
    icon: IndianRupee,
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800/50',
    iconColor: 'text-green-600 dark:text-green-400',
    format: (v) => formatCompact(v),
    navigateTo: 'sales',
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Revenue',
    icon: TrendingUp,
    color: 'text-sky-700 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    borderColor: 'border-sky-200 dark:border-sky-800/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
    format: (v) => formatCompact(v),
    navigateTo: 'accounting',
  },
  {
    key: 'lowStockAlerts',
    label: 'Low Stock Alerts',
    icon: AlertTriangle,
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    format: (v) => v.toString(),
    navigateTo: 'inventory',
  },
  {
    key: 'pendingLabOrders',
    label: 'Pending Lab Orders',
    icon: FlaskConical,
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
    format: (v) => v.toString(),
    navigateTo: 'lab-orders',
  },
  {
    key: 'pendingDues',
    label: 'Pending Dues',
    icon: Wallet,
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800/50',
    iconColor: 'text-red-600 dark:text-red-400',
    format: (v) => formatCompact(v),
    navigateTo: 'sales',
  },
];

// ───────────────────────────────────────────────
// Chart Configs
// ───────────────────────────────────────────────

const salesTrendConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(160, 84%, 39%)',
  },
};

const topProductsConfig: ChartConfig = {
  salesCount: {
    label: 'Units Sold',
    color: 'hsl(152, 76%, 36%)',
  },
};

const pieChartConfig: ChartConfig = {
  New: { label: 'New', color: 'hsl(200, 84%, 50%)' },
  Regular: { label: 'Regular', color: 'hsl(152, 76%, 36%)' },
  Wholesale: { label: 'Wholesale', color: 'hsl(38, 92%, 50%)' },
  Premium: { label: 'Premium', color: 'hsl(330, 80%, 55%)' },
};

const PIE_COLORS = ['hsl(200, 84%, 50%)', 'hsl(152, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(330, 80%, 55%)'];

// ───────────────────────────────────────────────
// Sub-Components
// ───────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="mt-2 h-7 w-20" />
      </CardContent>
    </Card>
  );
}

const statCardLeftBorder: Record<string, string> = {
  totalCustomers: 'border-l-4 border-l-violet-500',
  todaySales: 'border-l-4 border-l-emerald-500',
  monthlyRevenue: 'border-l-4 border-l-blue-500',
  lowStockAlerts: 'border-l-4 border-l-red-500',
  pendingLabOrders: 'border-l-4 border-l-amber-500',
  pendingDues: 'border-l-4 border-l-orange-500',
};

function StatCard({ config, value, comparisonBadge, onClick }: { config: StatCardConfig; value: number; comparisonBadge?: { value: number; label: string }; onClick?: () => void }) {
  const Icon = config.icon;
  return (
    <Card
      className={cn(
        'gap-0 py-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow hover-lift touch-manipulation',
        config.borderColor,
        statCardLeftBorder[config.key],
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
    >
      <CardContent className="p-4 min-h-[44px] flex flex-col justify-center">
        <div className="flex items-center justify-between min-h-[44px]">
          <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
          <div className={`rounded-xl p-2.5 ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        </div>
        <p className={`mt-2 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${config.color}`}>
          {config.format(value)}
        </p>
        {comparisonBadge && (
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            comparisonBadge.value >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {comparisonBadge.value >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>{Math.abs(comparisonBadge.value)}% vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesChartSkeleton() {
  return (
    <Card className="h-[200px] sm:h-[280px] lg:h-[320px]">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-full w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TopProductsChartSkeleton() {
  return (
    <Card className="h-[200px] sm:h-[280px] lg:h-[320px]">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-52" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-full w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function RecentSalesSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentsSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-5 w-14 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LowStockSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-52" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const appointmentStatusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  completed: 'secondary',
  pending: 'outline',
  cancelled: 'destructive',
};

const appointmentStatusClass: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  completed: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
};

const datePresets: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
];

// ───────────────────────────────────────────────
// Main Dashboard Component
// ───────────────────────────────────────────────

// Period quick-select options for KPI cards
const KPI_PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
] as const;
type KpiPeriod = (typeof KPI_PERIOD_OPTIONS)[number]['key'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(() => getSettings());
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('thisMonth');
  const DAILY_REVENUE_GOAL = settings.dailyRevenueGoal;

  // Refresh settings on mount (for SSR hydration)
  useEffect(() => {
    setSettings(getSettings());
  }, []);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [duesVisible, setDuesVisible] = useState(false);
  const [customerAcquisition, setCustomerAcquisition] = useState<CustomerAcquisition | null>(null);
  const [revenueByDayOfWeek, setRevenueByDayOfWeek] = useState<DayRevenue[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTasks | null>(null);
  const [todayPaymentModes, setTodayPaymentModes] = useState<{ mode: string; amount: number; count: number }[]>([]);
  const [todayAvgOrderValue, setTodayAvgOrderValue] = useState<number>(0);
  const { setActiveSection } = useCrmStore();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>('thisMonth');
  const [refreshSecondsAgo, setRefreshSecondsAgo] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, trendRes, productsRes] = await Promise.allSettled([
        fetch('/api/dashboard'),
        fetch('/api/reports?type=sales-trend'),
        fetch('/api/reports?type=top-products'),
      ]);

      // Dashboard stats
      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const dashData = await dashRes.value.json();
        setStats(dashData.stats ?? dashData);
        setRecentSales(dashData.recentSales ?? []);
        setAppointments(dashData.appointments ?? []);
        setLowStock(dashData.lowStock ?? []);
        setCustomerAcquisition(dashData.customerAcquisition ?? null);
        setRevenueByDayOfWeek(dashData.revenueByDayOfWeek ?? []);
        setComparison(dashData.comparison ?? null);
        setPendingTasks(dashData.pendingTasks ?? null);
        setTodayPaymentModes(dashData.todayPaymentModes ?? []);
        setTodayAvgOrderValue(dashData.todayAvgOrderValue ?? 0);
      }

      // Sales trend
      if (trendRes.status === 'fulfilled' && trendRes.value.ok) {
        const trendData = await trendRes.value.json();
        setSalesTrend(trendData.data ?? trendData ?? []);
      }

      // Top products
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const prodData = await productsRes.value.json();
        setTopProducts(prodData.data ?? prodData ?? []);
      }
    } catch (err) {
      console.error('[Dashboard] fetch failed:', err);
      toast.error('Failed to load dashboard data. Retrying...');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Timer to update "seconds ago" display
  useEffect(() => {
    const tick = setInterval(() => {
      setRefreshSecondsAgo(Math.floor((Date.now() - lastRefresh.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  // ─── Derived chart data ───

  // API returns { date, total } but chart expects revenue as dataKey
  // Filter out trailing future dates (revenue=0, date > today) for clean chart
  const todayStr = new Date().toISOString().split('T')[0];
  const trendChartData = salesTrend
    .filter((point) => {
      const ptDate = (point as { date?: string }).date ?? '';
      return ptDate <= todayStr; // exclude future dates
    })
    .map((point) => ({
      date: format(parseISO(point.date), 'MMM dd'),
      revenue: (point as { total?: number; revenue?: number }).revenue ?? (point as { total?: number }).total ?? 0,
    }));

  // API returns { name, totalQtySold } but chart uses salesCount
  const productsChartData = topProducts.map((p) => {
    const prod = p as { name: string; salesCount?: number; totalQtySold?: number };
    const name = prod.name.length > 18 ? prod.name.slice(0, 18) + '…' : prod.name;
    return {
      name,
      salesCount: prod.salesCount ?? prod.totalQtySold ?? 0,
    };
  });

  // ─── Render helpers ───

  const renderStatsGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        : stats &&
          statCards.map((cfg) => {
            let badge: { value: number; label: string } | undefined;
            if (comparison) {
              if (cfg.key === 'monthlyRevenue') badge = { value: comparison.revenueChange, label: 'Revenue' };
              if (cfg.key === 'totalCustomers') badge = { value: comparison.customerChange, label: 'Customers' };
            }
            return (
              <StatCard
                key={cfg.key}
                config={cfg}
                value={stats[cfg.key]}
                comparisonBadge={badge}
                onClick={() => setActiveSection(cfg.navigateTo)}
              />
            );
          })}
    </div>
  );

  const renderRefreshIndicator = () => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>Last updated: {formatTimeAgo(refreshSecondsAgo)}</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-1 h-9 min-w-[44px] min-h-[44px] px-2 text-xs touch-manipulation"
        onClick={fetchData}
        disabled={loading}
        aria-label="Refresh dashboard data"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );

  const renderDateRangePresets = () => (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range filter">
      {datePresets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => setSelectedDateRange(preset.key)}
          className={cn(
            'min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation cursor-pointer border',
            selectedDateRange === preset.key
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );

  const renderSalesTrendChart = () => {
    if (loading) return <SalesChartSkeleton />;

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500 h-[200px] sm:h-[280px] lg:h-[320px] flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales Trend</CardTitle>
          <CardDescription>Revenue over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {trendChartData.length > 0 ? (
            <ChartContainer config={salesTrendConfig} className="h-full w-full">
              <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  fontSize={11}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => (
                        <span className="font-mono font-medium">{formatCurrency(value)}</span>
                      )}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No sales trend data yet</p>
                <p className="text-xs mt-1">Create your first sale to see trends here.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('sales')}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Create your first sale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTopProductsChart = () => {
    if (loading) return <TopProductsChartSkeleton />;

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500 h-[200px] sm:h-[280px] lg:h-[320px] flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Selling Products</CardTitle>
          <CardDescription>Top 5 products by sales count</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {productsChartData.length > 0 ? (
            <ChartContainer config={topProductsConfig} className="h-full w-full">
              <BarChart data={productsChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  fontSize={11}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="salesCount"
                  fill="var(--color-salesCount)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
                <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No product data available</p>
                <p className="text-xs mt-1">Start selling products to see rankings here.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('inventory')}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Go to Inventory
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRecentSales = () => {
    if (loading) return <RecentSalesSkeleton />;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
          <CardDescription>Last 5 completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSales.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.invoiceNo}>
                    <TableCell className="font-mono text-xs font-medium">
                      {sale.invoiceNo}
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] truncate">
                      {sale.customerName}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(sale.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {isToday(parseISO(sale.date))
                        ? 'Today'
                        : format(parseISO(sale.date), 'MMM dd')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {sale.paymentMode}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <ShoppingCart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No sales data yet</p>
                <p className="text-xs mt-1">Complete your first sale to see it here.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('sales')}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Create First Sale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAppointments = () => {
    if (loading) return <AppointmentsSkeleton />;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Appointments</CardTitle>
          <CardDescription>
            {appointments.length > 0
              ? `${appointments.length} scheduled for today`
              : 'No appointments scheduled'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {appointments.map((appt, idx) => (
                <div key={idx}>
                  <div className="flex items-start gap-3 py-1">
                    <div className="flex items-center gap-1.5 shrink-0 min-w-[64px]">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-mono font-medium text-foreground">
                        {appt.time}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{appt.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{appt.purpose}</p>
                    </div>
                    <Badge
                      variant={appointmentStatusVariant[appt.status] ?? 'outline'}
                      className={appointmentStatusClass[appt.status] ?? ''}
                    >
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </Badge>
                  </div>
                  {idx < appointments.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No appointments scheduled</p>
                <p className="text-xs mt-0.5">Enjoy your day!</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('appointments')}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Schedule Appointment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLowStock = () => {
    if (loading) return <LowStockSkeleton />;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock Products
          </CardTitle>
          <CardDescription>
            {lowStock.length > 0
              ? `${lowStock.length} products below minimum stock level`
              : 'All products are well-stocked'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {lowStock.map((product, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <span
                          className={`text-sm font-mono font-bold ${
                            product.stock === 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {product.stock}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {' / '}
                          {product.minStock}
                        </span>
                      </div>
                      <Badge
                        variant={product.stock === 0 ? 'destructive' : 'outline'}
                        className={`text-xs ${
                          product.stock === 0
                            ? ''
                            : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                  {idx < lowStock.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">All products are well stocked!</p>
                <p className="text-xs mt-0.5">Great job.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Customer Acquisition Funnel ───
  const renderCustomerAcquisition = () => {
    if (loading) {
      return (
        <Card className="h-[200px] sm:h-[280px] lg:h-[320px]">
          <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-52" /></CardHeader>
          <CardContent><Skeleton className="h-full w-full rounded-lg" /></CardContent>
        </Card>
      );
    }

    const pieData = customerAcquisition
      ? Object.entries(customerAcquisition.byGroup)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value }))
      : [];

    const totalGroups = pieData.reduce((s, d) => s + d.value, 0);

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500 h-[200px] sm:h-[280px] lg:h-[320px] flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer Acquisition</CardTitle>
          <CardDescription>
            {customerAcquisition
              ? `${customerAcquisition.thisMonth} this month vs ${customerAcquisition.lastMonth} last month`
              : 'No customer data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center gap-4">
          {pieData.length > 0 ? (
            <>
              <ChartContainer config={pieChartConfig} className="h-full w-1/2">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.value}</span>
                      <span className="text-xs text-muted-foreground">
                        ({totalGroups > 0 ? Math.round((d.value / totalGroups) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-sky-100 dark:bg-sky-900/30 p-3">
                <Users className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No customer group data</p>
                <p className="text-xs mt-1">Add customers with group info to see this breakdown.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('customers')}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Revenue Heatmap ───
  const renderRevenueHeatmap = () => {
    if (loading) {
      return (
        <Card className="h-[200px] sm:h-[280px] lg:h-[320px]">
          <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-52" /></CardHeader>
          <CardContent><Skeleton className="h-full w-full rounded-lg" /></CardContent>
        </Card>
      );
    }

    const maxRev = Math.max(...revenueByDayOfWeek.map((d) => d.revenue), 1);

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500 h-[200px] sm:h-[280px] lg:h-[320px] flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Day of Week</CardTitle>
          <CardDescription>Average performance — last 3 months</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {revenueByDayOfWeek.length > 0 ? (
            <div className="grid grid-cols-7 gap-2 h-full items-end pb-1">
              {revenueByDayOfWeek.map((d) => {
                const intensity = d.revenue / maxRev;
                const isHighest = d.revenue === maxRev && maxRev > 0;
                return (
                  <div key={d.day} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground leading-tight">
                      {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(0)}K` : '—'}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isHighest
                          ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900'
                          : ''
                      }`}
                      style={{
                        height: `${Math.max(8, intensity * 100)}%`,
                        backgroundColor: intensity > 0
                          ? `hsl(152, 76%, ${30 + (1 - intensity) * 50}%)`
                          : 'hsl(0, 0%, 90%)',
                      }}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                      {d.day.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No sales data for heatmap</p>
                <p className="text-xs mt-1">Sales data will appear here as you record transactions.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('sales')}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Record a Sale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Pending Tasks Widget ───
  const renderPendingTasks = () => {
    if (loading) return null;

    if (!pendingTasks) return null;

    const tasks = [
      {
        label: 'Lab Orders Pending',
        count: pendingTasks.labOrdersPending,
        section: 'lab-orders' as const,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/30',
      },
      {
        label: 'Dues Overdue',
        count: pendingTasks.duesOverdue,
        section: 'accounting' as const,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/30',
      },
      {
        label: "Appointments Today",
        count: pendingTasks.appointmentsToday,
        section: 'appointments' as const,
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-900/30',
      },
      {
        label: 'Low Stock Items',
        count: pendingTasks.lowStockItems,
        section: 'inventory' as const,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
      },
    ];

    const totalPending = tasks.reduce((s, t) => s + t.count, 0);
    if (totalPending === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Tasks
          </CardTitle>
          <CardDescription>{totalPending} items need your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tasks.map((t) => (
              <button
                key={t.section}
                onClick={() => setActiveSection(t.section)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-md min-h-[44px] min-w-[44px] touch-manipulation ${t.bg} border-transparent hover:border-border cursor-pointer text-left`}
              >
                <span className={`text-xl sm:text-2xl font-bold ${t.color}`}>{t.count}</span>
                <span className="text-xs text-muted-foreground text-center leading-tight">{t.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Quick Action Buttons ───
  const renderQuickActions = () => {
    const actions = [
      { label: 'New Sale', icon: ShoppingCart, section: 'sales' as const, color: 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800' },
      { label: 'Add Customer', icon: UserPlus, section: 'customers' as const, color: 'bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-700 dark:hover:bg-sky-800' },
      { label: 'New Appointment', icon: CalendarDays, section: 'appointments' as const, color: 'bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-800' },
      { label: 'Low Stock', icon: AlertTriangle, section: 'inventory' as const, color: 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-800' },
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.section}
              onClick={() => setActiveSection(action.section)}
              className={`${action.color} h-auto py-4 min-h-[44px] min-w-[44px] flex flex-col items-center gap-2 rounded-xl shadow-sm transition-all hover:shadow-md touch-manipulation`}
            >
              <Icon className="size-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  // ─── Overdue Appointments Alert ───
  const renderOverdueAlert = () => {
    const count = stats?.overdueAppointments ?? 0;
    if (loading || count === 0) return null;

    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-300">
          <span className="font-semibold">{count} overdue appointment{count > 1 ? 's' : ''}</span>
          {' '}still pending from previous days. Please follow up with the customers.
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50 min-w-[44px] min-h-[44px] touch-manipulation"
          onClick={() => setActiveSection('appointments')}
        >
          View Appointments
        </Button>
      </Alert>
    );
  };

  // ─── Today's Revenue Goal Progress ───
  const renderRevenueGoal = () => {
    const todaySalesAmount = stats?.todaySales ?? 0;
    const percentage = Math.min(100, Math.round((todaySalesAmount / DAILY_REVENUE_GOAL) * 100));
    const isGoalReached = percentage >= 100;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${isGoalReached ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                <Target className={`h-4 w-4 ${isGoalReached ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Today&apos;s Revenue Goal</p>
                <p className="text-xs text-muted-foreground">
                  Daily target: {formatCurrency(DAILY_REVENUE_GOAL)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold font-mono ${isGoalReached ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                {formatCurrency(todaySalesAmount)}
              </p>
              <p className="text-xs text-muted-foreground">{percentage}%</p>
            </div>
          </div>
          <Progress
            value={percentage}
            className={`h-2.5 ${isGoalReached ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'}`}
          />
        </CardContent>
      </Card>
    );
  };

  // ─── Today's Payment Mode Donut ───
  const PAYMENT_COLORS_DASH: Record<string, string> = { Cash: '#059669', UPI: '#7c3aed', Card: '#2563eb', Credit: '#dc2626' };

  const renderTodayPaymentDonut = () => {
    if (loading) {
      return (
        <Card className="h-[200px]">
          <CardHeader className="pb-2"><Skeleton className="h-5 w-36" /></CardHeader>
          <CardContent><Skeleton className="h-full w-full rounded-lg" /></CardContent>
        </Card>
      );
    }

    const totalAmt = todayPaymentModes.reduce((s, m) => s + m.amount, 0);
    const totalTx = todayPaymentModes.reduce((s, m) => s + m.count, 0);

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Today&apos;s Payment Modes
          </CardTitle>
          <CardDescription>
            {totalTx} transactions totaling {formatCurrency(totalAmt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayPaymentModes.length > 0 ? (
            <div className="flex items-center gap-4">
              <ChartContainer config={{ amount: { label: 'Amount' } }} className="h-[140px] w-[140px] shrink-0">
                <PieChart>
                  <Pie
                    data={todayPaymentModes}
                    dataKey="amount"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    strokeWidth={2}
                  >
                    {todayPaymentModes.map((m) => (
                      <Cell key={m.mode} fill={PAYMENT_COLORS_DASH[m.mode] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2">
                {todayPaymentModes.map((m) => {
                  const pct = totalAmt > 0 ? ((m.amount / totalAmt) * 100).toFixed(0) : '0';
                  return (
                    <div key={m.mode} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PAYMENT_COLORS_DASH[m.mode] || '#94a3b8' }} />
                        <span className="text-muted-foreground">{m.mode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(m.amount)}</span>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-[100px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800/50 p-3">
                <Receipt className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No payment data today</p>
                <p className="text-xs mt-1">Transactions will appear here as sales are made.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setActiveSection('sales')}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Create First Sale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Avg Order Value + Transactions Today ───
  const renderTodayMetrics = () => {
    const todayTx = stats?.todaySales !== undefined
      ? (todayPaymentModes.reduce((s, m) => s + m.count, 0) || (stats.todaySales > 0 && todayAvgOrderValue > 0 ? Math.round(stats.todaySales / todayAvgOrderValue) : 0))
      : 0;

    return (
      <Card className="hover-lift border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Today&apos;s Metrics
          </CardTitle>
          <CardDescription>Key performance indicators for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Total Transactions</p>
              <p className="text-lg font-bold font-mono">{todayTx}</p>
              <p className="text-[10px] text-muted-foreground">Orders placed</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Avg Order Value</p>
              <p className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
                {todayAvgOrderValue > 0 ? formatCurrency(todayAvgOrderValue) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">Per transaction</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Lab Orders Pending</p>
              <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                {pendingTasks?.labOrdersPending ?? stats?.pendingLabOrders ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">In pipeline</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground font-medium">Customer Visits</p>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {todayTx + (pendingTasks?.appointmentsToday ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Sales + appointments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Main Render ───

  return (
    <section className="space-y-6" aria-label="CRM Dashboard">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(startOfDay(new Date()), 'EEEE, MMMM d, yyyy')} — Optical Shop CRM
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Updated {format(lastRefresh, 'hh:mm a')}</span>
            <Button variant="ghost" size="sm" className="h-9 min-w-[44px] px-2 text-xs touch-manipulation" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Period Quick-Select */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="KPI time period">
        {KPI_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setKpiPeriod(opt.key)}
            className={cn(
              'min-w-[44px] min-h-[44px] px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation cursor-pointer border',
              kpiPeriod === opt.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Welcome Banner */}
        <div className="mb-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">
                {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, Ram Kumar!
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Eye className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

      {/* Stats Cards */}
      {renderStatsGrid()}

      {/* Refresh Indicator */}
      {renderRefreshIndicator()}

      {/* Quick Action Buttons */}
      {renderQuickActions()}

      {/* Today's KPIs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderTodayPaymentDonut()}
        {renderTodayMetrics()}
      </div>

      {/* Date Range Presets */}
      {renderDateRangePresets()}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderSalesTrendChart()}
        {renderTopProductsChart()}
      </div>

      {/* Advanced Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderCustomerAcquisition()}
        {renderRevenueHeatmap()}
      </div>

      {/* Pending Tasks Widget */}
      {renderPendingTasks()}

      {/* Today's Revenue Goal */}
      {renderRevenueGoal()}

      {/* Pending Dues Card */}
      {!loading && stats && stats.pendingDues > 0 && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-red-100 dark:bg-red-950/60">
                <Wallet className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Outstanding Dues
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  Total pending payments from customers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-700 dark:text-red-300 font-mono">
                {duesVisible
                  ? formatCurrency(stats.pendingDues)
                  : '₹••••••'}
              </span>
              <button
                onClick={() => setDuesVisible(!duesVisible)}
                className="p-2.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label={duesVisible ? 'Hide dues amount' : 'Show dues amount'}
              >
                {duesVisible ? (
                  <EyeOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Eye className="h-4 w-4 text-red-500" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Appointments Alert */}
      {renderOverdueAlert()}

      {/* Recent Activity Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Sales — wider on desktop */}
          <div className="lg:col-span-1">{renderRecentSales()}</div>

          {/* Today's Appointments */}
          <div>{renderAppointments()}</div>

          <div>{renderLowStock()}</div>
        </div>
      </div>
    </section>
  );
}