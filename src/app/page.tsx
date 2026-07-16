'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMockApiFallback } from '@/lib/mock-api-fallback';
import {
  LayoutDashboard, Users, Package, Receipt, FlaskConical, CalendarDays, Wallet,
  BarChart3, UserCog, Megaphone, Menu, Moon, Sun, LogOut, X, Search,
  Database, Settings,
  Loader, Download, Upload, AlertOctagon, TrendingUp, ChevronDown,
  ShoppingCart, Calculator, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { CrmProvider, useCrmStore, type SectionKey } from '@/components/crm/store';
import { getSettings, saveSettings, type CrmSettings } from '@/lib/settings';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import Dashboard from '@/components/crm/dashboard';
import Customers from '@/components/crm/customers';
import Inventory from '@/components/crm/inventory';
import Sales from '@/components/crm/sales';
import LabOrders from '@/components/crm/lab-orders';
import Appointments from '@/components/crm/appointments';
import Accounting from '@/components/crm/accounting';
import Reports from '@/components/crm/reports';
import Staff from '@/components/crm/staff';
import Campaigns from '@/components/crm/campaigns';
import Notifications from '@/components/crm/notifications';
import PurchaseOrders from '@/components/crm/purchase-orders';
import LensCalculator from '@/components/crm/lens-calculator';

// ─── Navigation config ─────────────────────────────────────────────────

interface NavItem {
  key: SectionKey;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays },
  { key: 'lab-orders', label: 'Lab Orders', icon: FlaskConical },
  { key: 'accounting', label: 'Accounting', icon: Wallet },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'staff', label: 'Staff', icon: UserCog },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { key: 'lens-calculator', label: 'Lens Calculator', icon: Calculator },
];

// ─── Section renderer with transition ─────────────────────────────────

function SectionRenderer() {
  const { activeSection, setLoadingBar } = useCrmStore();

  const sectionMap: Record<SectionKey, React.ComponentType> = {
    dashboard: Dashboard,
    customers: Customers,
    sales: Sales,
    inventory: Inventory,
    appointments: Appointments,
    'lab-orders': LabOrders,
    accounting: Accounting,
    reports: Reports,
    staff: Staff,
    campaigns: Campaigns,
    'purchase-orders': PurchaseOrders,
    'lens-calculator': LensCalculator,
  };

  const Component = sectionMap[activeSection] ?? Dashboard;

  useEffect(() => {
    setLoadingBar(true);
    const timer = setTimeout(() => setLoadingBar(false), 800);
    return () => clearTimeout(timer);
  }, [activeSection, setLoadingBar]);

  return (
    <>
      <div key={activeSection} className="section-enter">
        <Component />
      </div>
    </>
  );
}

// ─── Sidebar (Desktop — supports collapsed & expanded) ─────────────────

function Sidebar({ onNav }: { onNav?: () => void }) {
  const {
    activeSection, setActiveSection, darkMode, toggleDarkMode,
    sidebarCollapsed, toggleSidebarCollapsed,
  } = useCrmStore();
  // Quick stats for mobile sidebar
  const [quickStats, setQuickStats] = useState({ todaySales: 0, pendingLab: 0, lowStock: 0, dueAmount: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [salesRes, labRes, lowStockRes, duesRes] = await Promise.allSettled([
          fetch(`/api/sales?fromDate=${today}&toDate=${today}&limit=999`),
          fetch('/api/lab-orders?status=Pending'),
          fetch('/api/products/low-stock'),
          fetch('/api/dues'),
        ]);
        if (cancelled) return;

        let todaySales = 0;
        if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
          const data = await salesRes.value.json();
          const list = Array.isArray(data.sales) ? data.sales : [];
          todaySales = list.reduce((sum: number, s: { total: number }) => sum + (s.total || 0), 0);
        }

        let pendingLab = 0;
        if (labRes.status === 'fulfilled' && labRes.value.ok) {
          const data = await labRes.value.json();
          pendingLab = Array.isArray(data.data) ? data.data.length : Array.isArray(data) ? data.length : 0;
        }

        let lowStock = 0;
        if (lowStockRes.status === 'fulfilled' && lowStockRes.value.ok) {
          const data = await lowStockRes.value.json();
          lowStock = Array.isArray(data.products) ? data.products.length : Array.isArray(data) ? data.length : 0;
        }

        let dueAmount = 0;
        if (duesRes.status === 'fulfilled' && duesRes.value.ok) {
          const data = await duesRes.value.json();
          const list = Array.isArray(data.data) ? data.data : [];
          dueAmount = list.reduce((sum: number, d: { amount: number; paid: number }) => sum + ((d.amount || 0) - (d.paid || 0)), 0);
        }

        if (!cancelled) {
          setQuickStats({ todaySales, pendingLab, lowStock, dueAmount });
          setStatsLoaded(true);
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const navButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeSection === item.key;

    // When collapsed, wrap in tooltip
    const buttonContent = (
      <button
        key={item.key}
        onClick={() => {
          setActiveSection(item.key);
          onNav?.();
        }}
        className={`
          w-full text-left flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] touch-manipulation
          ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'}
          ${isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-l-[3px] border-emerald-500 font-semibold shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 border-l-[3px] border-transparent'
          }
        `}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.key === 'lab-orders' && (
              <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] px-1.5">
                3
              </Badge>
            )}
          </>
        )}
      </button>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.key}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200">
      {/* Brand */}
      <div className={`flex items-center gap-3 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 ${sidebarCollapsed ? 'px-3 py-4 justify-center' : 'px-5 py-5'}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white font-bold text-sm ring-1 ring-white/20 backdrop-blur-sm shrink-0">
          iSO
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white leading-tight tracking-wide">
              i Star
            </span>
            <span className="text-xs text-emerald-100 leading-tight">
              Opticals CRM
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Nav items */}
      <ScrollArea className="flex-1 px-3 py-3">
        {/* Quick Stats - visible on mobile sidebar */}
        {statsLoaded && (
          <div className="mb-3 lg:hidden">
            <button
              className="w-full flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              onClick={(e) => {
                const el = e.currentTarget.nextElementSibling;
                if (el) el.classList.toggle('hidden');
              }}
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Quick Stats
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 p-2.5">
                <p className="text-[10px] text-muted-foreground leading-tight">Today&apos;s Sales</p>
                <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{quickStats.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 p-2.5">
                <p className="text-[10px] text-muted-foreground leading-tight">Pending Lab</p>
                <p className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                  {quickStats.pendingLab}
                </p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 p-2.5">
                <p className="text-[10px] text-muted-foreground leading-tight">Low Stock</p>
                <p className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                  {quickStats.lowStock}
                </p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 p-2.5">
                <p className="text-[10px] text-muted-foreground leading-tight">Due Amount</p>
                <p className="text-sm font-bold font-mono text-orange-600 dark:text-orange-400">
                  ₹{quickStats.dueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => navButton(item))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-3 space-y-1">
        <button
          onClick={toggleDarkMode}
          className={`flex items-center rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 active:bg-emerald-100 dark:active:bg-emerald-900/40 transition-colors min-h-[44px] touch-manipulation ${sidebarCollapsed ? 'justify-center px-0' : 'w-full gap-3 px-3'}`}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          {!sidebarCollapsed && (darkMode ? 'Light Mode' : 'Dark Mode')}
        </button>
        <div className={`flex items-center gap-3 min-h-[44px] ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs font-semibold">
              RK
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">Ram Kumar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Owner</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation" aria-label="Log out" onClick={() => toast.info('Session management is not configured. Contact your admin.')}>
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebarCollapsed}
          className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors min-h-[44px] touch-manipulation"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0 mx-auto" /> : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Global Search ─────────────────────────────────────────────────────

interface SearchResult {
  type: 'customer' | 'product' | 'sale';
  id: string;
  primary: string;
  secondary: string;
  tertiary?: string;
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setActiveSection, setSearchInputRef } = useCrmStore();

  // Expose the ref to the store for keyboard shortcut focus
  useEffect(() => {
    setSearchInputRef(inputRef);
  }, [inputRef, setSearchInputRef]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const [custRes, prodRes, saleRes] = await Promise.allSettled([
        fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`),
        fetch(`/api/products?search=${encodeURIComponent(q)}&pageSize=5`),
        fetch(`/api/sales?search=${encodeURIComponent(q)}&limit=5`),
      ]);

      const found: SearchResult[] = [];

      if (custRes.status === 'fulfilled' && custRes.value.ok) {
        const data = await custRes.value.json();
        const list = Array.isArray(data.data) ? data.data : [];
        list.forEach((c: { id: string; name: string; phone: string }) => {
          found.push({ type: 'customer', id: c.id, primary: c.name, secondary: c.phone });
        });
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
        const data = await prodRes.value.json();
        const list = Array.isArray(data.products) ? data.products : [];
        list.forEach((p: { id: string; name: string; price: number; stock: number }) => {
          found.push({
            type: 'product',
            id: p.id,
            primary: p.name,
            secondary: `₹${p.price.toLocaleString('en-IN')}`,
            tertiary: `Stock: ${p.stock}`,
          });
        });
      }

      if (saleRes.status === 'fulfilled' && saleRes.value.ok) {
        const data = await saleRes.value.json();
        const list = Array.isArray(data.sales) ? data.sales : [];
        list.forEach((s: { id: string; invoiceNo: string; customerName: string; total: number }) => {
          found.push({
            type: 'sale',
            id: s.id,
            primary: s.invoiceNo,
            secondary: s.customerName,
            tertiary: `₹${s.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          });
        });
      }

      setResults(found);
      setOpen(found.length > 0);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }, [doSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    const sectionMap: Record<string, SectionKey> = {
      customer: 'customers',
      product: 'inventory',
      sale: 'sales',
    };
    setActiveSection(sectionMap[result.type] ?? 'dashboard');
    setQuery('');
    setOpen(false);
    setMobileExpanded(false);
  }, [setActiveSection]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setMobileExpanded(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const customers = results.filter((r) => r.type === 'customer');
  const products = results.filter((r) => r.type === 'product');
  const sales = results.filter((r) => r.type === 'sale');
  const hasResults = customers.length > 0 || products.length > 0 || sales.length > 0;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-3.5 w-3.5 text-emerald-500" />;
      case 'product': return <Package className="h-3.5 w-3.5 text-sky-500" />;
      case 'sale': return <Receipt className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Customers';
      case 'product': return 'Products';
      case 'sale': return 'Sales';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Mobile: icon-only, expandable */}
      <div className="lg:hidden">
        {mobileExpanded ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              placeholder="Search..."
              value={query}
              onChange={handleChange}
              autoFocus
              className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 min-w-[44px] min-h-[44px] touch-manipulation"
              onClick={() => { setMobileExpanded(false); setQuery(''); setOpen(false); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setMobileExpanded(true)}
              >
                <Search className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (Ctrl+K)</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Desktop: full search input */}
      <div className="hidden lg:block">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative w-64">
              <Input
                ref={inputRef}
                placeholder="Search..."
                value={query}
                onChange={handleChange}
                onFocus={() => { if (results.length > 0) setOpen(true); }}
                className="h-9 pl-9 pr-16 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <span className="text-xs">⌘</span>K
              </kbd>
              {searching && (
                <Loader className="absolute right-12 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>Ctrl+K to search</TooltipContent>
        </Tooltip>
      </div>

      {/* Dropdown */}
      {open && hasResults && (
        <div className="absolute right-0 lg:right-auto lg:left-0 top-full mt-1.5 w-[calc(100vw-1.5rem)] lg:w-80 z-50 rounded-xl glass shadow-2xl max-h-80 overflow-y-auto">
          {/* Customers group */}
          {customers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Customers
              </div>
              {customers.map((r) => (
                <button
                  key={`cust-${r.id}`}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent active:bg-accent/80 flex items-center gap-2.5 transition-colors min-h-[44px] touch-manipulation"
                  onClick={() => handleSelect(r)}
                >
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-1.5 shrink-0">
                    {typeIcon(r.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.primary}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.secondary}</p>
                  </div>
                </button>
              ))}
              {products.length > 0 && <Separator />}
            </div>
          )}

          {/* Products group */}
          {products.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3 w-3" /> Products
              </div>
              {products.map((r) => (
                <button
                  key={`prod-${r.id}`}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent active:bg-accent/80 flex items-center gap-2.5 transition-colors min-h-[44px] touch-manipulation"
                  onClick={() => handleSelect(r)}
                >
                  <div className="rounded-full bg-sky-100 dark:bg-sky-900/40 p-1.5 shrink-0">
                    {typeIcon(r.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.primary}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.secondary} {r.tertiary ? `· ${r.tertiary}` : ''}
                    </p>
                  </div>
                </button>
              ))}
              {sales.length > 0 && <Separator />}
            </div>
          )}

          {/* Sales group */}
          {sales.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="h-3 w-3" /> Sales
              </div>
              {sales.map((r) => (
                <button
                  key={`sale-${r.id}`}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent active:bg-accent/80 flex items-center gap-2.5 transition-colors min-h-[44px] touch-manipulation"
                  onClick={() => handleSelect(r)}
                >
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-1.5 shrink-0">
                    {typeIcon(r.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.primary}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.secondary} {r.tertiary ? `· ${r.tertiary}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {open && query.length >= 2 && !searching && !hasResults && (
        <div className="absolute right-0 lg:right-auto lg:left-0 top-full mt-1.5 w-[340px] lg:w-80 z-50 rounded-lg border bg-popover shadow-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

// ─── Settings Dialog ───────────────────────────────────────────────────

function SettingsDialog() {
  const { settingsOpen, setSettingsOpen } = useCrmStore();
  const [form, setForm] = useState<CrmSettings>(getSettings());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setForm(getSettings());
    }
  }, [settingsOpen]);

  const handleSave = useCallback(() => {
    setSaving(true);
    // Simulate a tiny delay for UX
    setTimeout(() => {
      saveSettings(form);
      setSaving(false);
      setSettingsOpen(false);
      toast.success('Settings saved successfully');
    }, 200);
  }, [form, setSettingsOpen]);

  const updateField = <K extends keyof CrmSettings>(key: K, value: CrmSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your shop details and preferences. These are used across invoices and reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="setting-shop-name">Shop Name</Label>
            <Input
              id="setting-shop-name"
              value={form.shopName}
              onChange={(e) => updateField('shopName', e.target.value)}
              placeholder="Shop name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-revenue-goal">Daily Revenue Goal (₹)</Label>
            <Input
              id="setting-revenue-goal"
              type="number"
              min={0}
              value={form.dailyRevenueGoal}
              onChange={(e) => updateField('dailyRevenueGoal', parseFloat(e.target.value) || 0)}
              placeholder="25000"
            />
            <p className="text-xs text-muted-foreground">Used by the Dashboard&apos;s revenue goal progress bar.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-gstin">GSTIN</Label>
            <Input
              id="setting-gstin"
              value={form.gstin}
              onChange={(e) => updateField('gstin', e.target.value)}
              placeholder="GST identification number"
            />
            <p className="text-xs text-muted-foreground">Displayed on printed invoices.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-phone">Phone</Label>
            <Input
              id="setting-phone"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+91 94432 12345"
            />
            <p className="text-xs text-muted-foreground">Displayed on printed invoices.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-address">Address</Label>
            <Input
              id="setting-address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Full shop address"
            />
            <p className="text-xs text-muted-foreground">Displayed on printed invoices.</p>
          </div>
        </div>

        <Separator />

        {/* Data Management Section */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </Label>
          <p className="text-xs text-muted-foreground">
            Export or import your entire CRM database as a JSON backup file.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 min-h-[44px] touch-manipulation"
              onClick={async () => {
                try {
                  const res = await fetch('/api/backup');
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.json();
                  const dataStr = JSON.stringify(blob, null, 2);
                  const fileBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(fileBlob);
                  const a = document.createElement('a');
                  const today = new Date().toISOString().split('T')[0];
                  a.href = url;
                  a.download = `sko-crm-backup-${today}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Backup exported successfully!');
                } catch {
                  toast.error('Failed to export backup');
                }
              }}
            >
              <Download className="h-4 w-4" />
              Export Backup
            </Button>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (!data.version || !data.data) {
                      toast.error('Invalid backup file format');
                      return;
                    }
                    const res = await fetch('/api/restore', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
                    if (res.ok) {
                      const result = await res.json().catch(() => ({}));
                      const counts = result.restored;
                      const parts = Object.entries(counts || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
                      toast.success(`Data restored successfully! ${parts ? '(' + parts + ')' : ''} Refreshing...`);
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err.error || 'Failed to restore backup');
                    }
                  } catch {
                    toast.error('Failed to read or restore backup file');
                  }
                  // Reset input
                  e.target.value = '';
                }}
              />
              <span
                role="button"
                tabIndex={0}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] touch-manipulation"
              >
                <Upload className="h-4 w-4" />
                Import Backup
              </span>
            </label>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
            <AlertOctagon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Warning:</span> Importing a backup will REPLACE all current data.
              This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(false)} className="min-h-[44px] min-w-[44px] touch-manipulation">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-h-[44px] min-w-[44px] touch-manipulation">
            {saving ? <Loader className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading Bar ───────────────────────────────────────────────────────

function LoadingBar() {
  const { loadingBar } = useCrmStore();

  return (
    <div
      className={`h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-500 ease-out ${
        loadingBar ? 'w-full opacity-100' : 'w-0 opacity-0'
      }`}
      role="progressbar"
      aria-label="Loading"
    />
  );
}

// ─── Top Bar ────────────────────────────────────────────────────────────

function TopBar() {
  const { activeSection, setSidebarOpen, darkMode, toggleDarkMode, setSettingsOpen, sidebarCollapsed, toggleSidebarCollapsed } = useCrmStore();
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'local'>('loading');

  useEffect(() => {
    const check = () => {
      const cfg = window.__GITHUB_CRM_CONFIG__;
      setDbStatus(cfg?.pat ? 'connected' : 'local');
    };
    check();
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, []);

  const currentLabel = NAV_ITEMS.find((n) => n.key === activeSection)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-12 lg:h-14 items-center gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 md:px-6 pb-0">
      {/* Desktop: hamburger for md→lg range where sidebar is hidden */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex lg:hidden shrink-0 h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop: collapse toggle visible when sidebar is collapsed */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex shrink-0 h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation"
          onClick={toggleSidebarCollapsed}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
      )}

      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base lg:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
          {currentLabel}
        </h1>
        <span className="hidden sm:inline-flex items-center text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        {/* GitHub DB Status */}
        {dbStatus === 'connected' && (
          <span className="github-db-status connected hidden sm:inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            Live
          </span>
        )}
        {dbStatus === 'local' && (
          <span className="github-db-status local hidden sm:inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            Local
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Global Search */}
      <GlobalSearch />

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-11 w-11 lg:h-10 lg:w-10 min-w-[44px] min-h-[44px] touch-manipulation"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
      >
        <Settings className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
      </Button>

      {/* Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-11 w-11 lg:h-10 lg:w-10 min-w-[44px] min-h-[44px] touch-manipulation"
        onClick={toggleDarkMode}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? (
          <Sun className="h-4.5 w-4.5 text-amber-500" />
        ) : (
          <Moon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
        )}
      </Button>

      {/* Notifications */}
      <Notifications />
    </header>
  );
}

// ─── Mobile Sidebar Overlay with transitions ────────────────────────────
// Kept for md→lg range where sidebar is hidden but bottom nav is not shown

function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useCrmStore();

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 md:flex lg:hidden pointer-events-none transition-[visibility,opacity] duration-200 ${
        sidebarOpen ? 'pointer-events-auto !visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {/* Backdrop with fade */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      {/* Sidebar panel with slide */}
      <div
        className={`relative z-10 h-full w-[85vw] max-w-[280px] sm:w-72 transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={handleClose}
          aria-label="Close menu"
          className="absolute top-3 right-3 z-20 rounded-md bg-white/80 dark:bg-slate-800/80 p-2.5 shadow-sm transition-colors hover:bg-white dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
        >
          <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>
        <Sidebar onNav={handleClose} />
      </div>
    </div>
  );
}

// ─── Bottom Navigation Bar (Mobile) ────────────────────────────────────

const BOTTOM_NAV_TABS: { key: SectionKey | 'more'; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'more', label: 'More', icon: MoreHorizontal },
];

function BottomNavBar() {
  const { activeSection, setActiveSection, setMoreSheetOpen } = useCrmStore();

  const handleTabPress = (tab: typeof BOTTOM_NAV_TABS[number]) => {
    if (tab.key === 'more') {
      setMoreSheetOpen(true);
    } else {
      setActiveSection(tab.key);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass border-t border-white/20 dark:border-white/5 bottom-nav-safe h-[calc(4rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around min-h-[64px]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {BOTTOM_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key !== 'more' && activeSection === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabPress(tab)}
              className="flex flex-col items-center justify-center flex-1 min-w-0 min-h-[44px] touch-manipulation relative py-1 transition-colors duration-150"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-colors duration-150 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span
                className={`text-[10px] leading-tight mt-0.5 transition-colors duration-150 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200 shadow-sm shadow-emerald-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── "More" Bottom Sheet (Mobile) ──────────────────────────────────────

function MoreSheet() {
  const { moreSheetOpen, setMoreSheetOpen, activeSection, setActiveSection } = useCrmStore();

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (moreSheetOpen) {
      document.body.classList.add('sheet-open');
    } else {
      document.body.classList.remove('sheet-open');
    }
    return () => {
      document.body.classList.remove('sheet-open');
    };
  }, [moreSheetOpen]);

  const handleSelect = (key: SectionKey) => {
    setActiveSection(key);
    setMoreSheetOpen(false);
  };

  return (
    <Drawer
      open={moreSheetOpen}
      onOpenChange={(open) => {
        setMoreSheetOpen(open);
        if (!open) {
          document.body.classList.remove('sheet-open');
        }
      }}
      dismissible
      handleOnly
    >
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-base">All Sections</DrawerTitle>
          <DrawerDescription className="text-xs">Tap to navigate</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 min-h-[68px] min-w-[44px] touch-manipulation transition-colors duration-150 ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight text-center line-clamp-1">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Dark Mode Effect ───────────────────────────────────────────────────

function DarkModeEffect() {
  const { darkMode } = useCrmStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return null;
}

// ─── Keyboard Shortcuts ────────────────────────────────────────────────

function KeyboardShortcuts() {
  const { focusSearchInput, triggerNewSaleDialog, setSettingsOpen, settingsOpen, setActiveSection } = useCrmStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+K or Cmd+K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        focusSearchInput();
        return;
      }

      // Ctrl+N: New Sale
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        triggerNewSaleDialog();
        return;
      }

      // Escape: Close settings dialog
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
        return;
      }

      // Number keys 1-9: Quick section switch (only when not in input)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && NAV_ITEMS[num - 1]) {
          setActiveSection(NAV_ITEMS[num - 1].key);
          return;
        }
        // 0 = section 10 (Staff)
        if (e.key === '0' && NAV_ITEMS[9]) {
          setActiveSection(NAV_ITEMS[9].key);
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusSearchInput, triggerNewSaleDialog, setSettingsOpen, settingsOpen, setActiveSection]);

  return null;
}

// ─── Main Layout ────────────────────────────────────────────────────────

function CrmLayout() {
  const { sidebarCollapsed } = useCrmStore();

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <DarkModeEffect />
      <KeyboardShortcuts />

      {/* Desktop sidebar — md:w-56 for tablet, lg:w-64/w-16 for desktop */}
      <aside
        className={`hidden md:flex md:w-56 lg:w-64 shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:!w-16' : ''
        }`}
      >
        <Sidebar />
      </aside>

      {/* Mobile/tablet sidebar overlay (md to lg) */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <LoadingBar />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <ErrorBoundary>
            <SectionRenderer />
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Navigation Bar — mobile only */}
      <BottomNavBar />

      {/* More Sheet — mobile only */}
      <MoreSheet />

      {/* Settings Dialog */}
      <SettingsDialog />
    </div>
  );
}


// ─── Root Page ──────────────────────────────────────────────────

export default function Home() {
  useMockApiFallback();
  return (
    <CrmProvider>
      <CrmLayout />
    </CrmProvider>
  );
}