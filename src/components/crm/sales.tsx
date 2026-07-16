"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Eye,
  Printer,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
 ShoppingCart,
  FileText,
  UserPlus,
  Trash2,
  IndianRupee,
  Package,
  CreditCard,
  CalendarDays,
  Banknote,
  Smartphone,
  Scissors,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useCrmStore } from "@/components/crm/store";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  group?: string;
}

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  qty: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountType: "percentage" | "flat";
  cgst: number;
  sgst: number;
  total: number;
  paymentMode: "Cash" | "Card" | "UPI" | "Credit" | "Split";
  status: "Completed" | "Pending" | "Return";
  notes?: string;
  createdAt: string;
}

interface SaleListItem {
  id: string;
  invoiceNo: string;
  customerName: string;
  itemsCount: number;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  paymentMode: string;
  status: "Completed" | "Pending" | "Return";
  createdAt: string;
}

interface SalesResponse {
  sales: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateSaleItem {
  productId: string;
  productName: string;
  price: number;
  qty: number;
}

interface ReturnItem {
  saleItemId: string;
  productName: string;
  originalQty: number;
  returnQty: number;
  price: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

function generateInvoiceNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}${d}-${rand}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ---------------------------------------------------------------------------
// Component: Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Completed":
      return (
        <Badge className="rounded-full bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
          Completed
        </Badge>
      );
    case "Pending":
      return (
        <Badge className="rounded-full bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
          Pending
        </Badge>
      );
    case "Return":
      return (
        <Badge className="rounded-full bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
          Return
        </Badge>
      );
    default:
      return <Badge variant="outline" className="rounded-full">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Component: Customer Search/Select
// ---------------------------------------------------------------------------

interface CustomerSelectProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customer: Customer | null) => void;
  onCreateNew: () => void;
}

function CustomerSelect({
  customers,
  selectedCustomerId,
  onSelect,
  onCreateNew,
}: CustomerSelectProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = query
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      )
    : customers;

  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Label className="mb-1.5">Customer</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search customer by name or phone..."
          value={selected ? selected.name : query}
          onChange={(e) => {
            if (selected) {
              onSelect(null);
            }
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-20"
        />
        {selected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
          >
            <X className="size-3" />
          </Button>
        )}
        {!selected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
            onClick={onCreateNew}
          >
            <UserPlus className="size-3 mr-1" />
            New
          </Button>
        )}
      </div>

      {open && !selected && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
              onClick={() => {
                onSelect(c);
                setQuery("");
                setOpen(false);
              }}
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone}</div>
              </div>
              {c.email && (
                <span className="text-xs text-muted-foreground truncate max-w-32">
                  {c.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && !selected && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md p-3 text-sm text-muted-foreground text-center">
          No customers found.
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-1 h-auto p-0 text-primary"
            onClick={onCreateNew}
          >
            Create new customer
          </Button>
        </div>
      )}

      {selected && (
        <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
          <div>
            {selected.phone}
            {selected.email && ` · ${selected.email}`}
          </div>
          {selected.address && <div>{selected.address}</div>}
        </div>
      )}
      <CustomerPurchaseHistory customerId={selected?.id ?? null} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Customer Purchase History (last 3 purchases)
// ---------------------------------------------------------------------------

function CustomerPurchaseHistory({ customerId }: { customerId: string | null }) {
  const [purchases, setPurchases] = React.useState<{ date: string; total: number }[]>([]);

  React.useEffect(() => {
    if (!customerId) {
      setPurchases([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sales?customerId=${customerId}&limit=3`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.sales) ? data.sales : [];
          setPurchases(list.map(function(s) {
            const r = s as Record<string, unknown>;
            return { date: r.createdAt as string, total: r.total as number };
          }));
        }
      } catch {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!customerId || purchases.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-2">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Recent Purchases</p>
      {purchases.map((p, i) => (
        <div key={i} className="flex items-center justify-between text-xs gap-2">
          <span className="text-muted-foreground">
            {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span className="font-mono font-medium">{INR(p.total)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: New Customer Inline Form
// ---------------------------------------------------------------------------

interface NewCustomerFormProps {
  onSave: (customer: Customer) => void;
  onCancel: () => void;
}

function NewCustomerForm({ onSave, onCancel }: NewCustomerFormProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [group, setGroup] = React.useState("New");

  const valid = name.trim().length > 0 && phone.trim().length >= 10;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">New Customer</span>
        <Button type="button" variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={onCancel}>
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="mb-1">Name *</Label>
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1">Phone *</Label>
          <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1">Email</Label>
          <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <Label className="mb-1">Address</Label>
          <Input placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1">Group</Label>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Wholesale">Wholesale</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-[44px] touch-manipulation"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave({
              id: `c-${uid()}`,
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              group,
            });
          }}
        >
          Add Customer
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Product Item Row (for Create Sale)
// ---------------------------------------------------------------------------

interface ItemRowProps {
  row: CreateSaleItem;
  index: number;
  products: Product[];
  onUpdate: (index: number, data: Partial<CreateSaleItem>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function ItemRow({ row, index, products, onUpdate, onRemove, canRemove }: ItemRowProps) {
  const [search, setSearch] = React.useState("");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const rowRef = React.useRef<HTMLTableRowElement>(null);

  const filteredProducts = row.productId
    ? products.filter((p) => p.id === row.productId)
    : search
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase())
        )
      : products;

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedProduct = products.find((p) => p.id === row.productId);

  return (
    <TableRow ref={rowRef} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
      <TableCell className="relative">
        {row.productId ? (
          <div className="flex items-center gap-2 min-w-0">
            <Package className="size-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate max-w-56">{row.productName}</div>
              {selectedProduct?.sku && (
                <div className="text-xs text-muted-foreground">{selectedProduct.sku}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-1">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search product..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                className="h-8 text-sm min-w-[180px]"
              />
            </div>
            {dropdownOpen && filteredProducts.length > 0 && (
              <div className="absolute z-50 left-0 top-full mt-1 w-72 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                    onClick={() => {
                      onUpdate(index, {
                        productId: p.id,
                        productName: p.name,
                        price: p.price,
                      });
                      setSearch("");
                      setDropdownOpen(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.sku} · Stock: {p.stock}
                      </div>
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-2">{INR(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {row.price > 0 ? INR(row.price) : "—"}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={row.qty}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) {
              onUpdate(index, { qty: val });
            }
          }}
          disabled={!row.productId}
          className="h-8 w-20 text-right"
        />
      </TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">
        {row.productId ? INR(row.price * row.qty) : "—"}
      </TableCell>
      <TableCell>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px] touch-manipulation text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Component: Create Sale Dialog
// ---------------------------------------------------------------------------

interface CreateSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateSaleDialog({ open, onOpenChange, onCreated }: CreateSaleDialogProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customersLoaded, setCustomersLoaded] = React.useState(false);
  const [productsLoaded, setProductsLoaded] = React.useState(false);

  // Fetch real customers and products when dialog opens
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch('/api/customers?limit=999'),
          fetch('/api/products?pageSize=999'),
        ]);
        if (cancelled) return;
        if (custRes.ok) {
          const data = await custRes.json();
          const list = Array.isArray(data.data) ? data.data : data || [];
          setCustomers(list);
        }
        if (prodRes.ok) {
          const data = await prodRes.json();
          const list = Array.isArray(data.products) ? data.products : data || [];
          setProducts(list);
        }
      } catch {
        setCustomers([]);
        setProducts([]);
        toast.error('Failed to load customers or products');
      }
      setCustomersLoaded(true);
      setProductsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = React.useState(false);
  const [items, setItems] = React.useState<CreateSaleItem[]>([
    { productId: "", productName: "", price: 0, qty: 1 },
  ]);
  const [discount, setDiscount] = React.useState(0);
  const [discountType, setDiscountType] = React.useState<"percentage" | "flat">("flat");
  const [paymentMode, setPaymentMode] = React.useState<"Cash" | "Card" | "UPI" | "Credit">("Cash");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [splitPayment, setSplitPayment] = React.useState(false);
  const [secondaryPaymentMode, setSecondaryPaymentMode] = React.useState<"Cash" | "Card" | "UPI">("UPI");
  const [secondaryAmount, setSecondaryAmount] = React.useState(0);

  const handleItemUpdate = (index: number, data: Partial<CreateSaleItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...data } : item)));
  };

  const handleItemRemove = (index: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: "", productName: "", price: 0, qty: 1 }]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount =
    discountType === "percentage" ? Math.round((subtotal * discount) / 100) : discount;
  const taxable = Math.max(0, subtotal - discountAmount);
  const cgst = Math.round(taxable * CGST_RATE * 100) / 100;
  const sgst = Math.round(taxable * SGST_RATE * 100) / 100;
  const total = Math.round((taxable + cgst + sgst) * 100) / 100;

  // Split payment derived values
  const canSplit = paymentMode !== "Credit";
  const primaryAmount = splitPayment ? Math.round((total - secondaryAmount) * 100) / 100 : total;
  const splitValid = !splitPayment || (secondaryAmount > 0 && secondaryAmount < total);

  const totalQty = items.reduce((sum, item) => sum + (item.productId ? item.qty : 0), 0);
  const hasValidItems = items.some((item) => item.productId && item.qty > 0);

  const handleCreate = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (!hasValidItems) {
      toast.error("Please add at least one product");
      return;
    }
    if (splitPayment && (secondaryAmount <= 0 || secondaryAmount >= total)) {
      toast.error("Secondary amount must be greater than 0 and less than the total");
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNo = generateInvoiceNo();
      const validItems = items.filter((i) => i.productId && i.qty > 0);

      const payload: Record<string, unknown> = {
        invoiceNo,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
        customerAddress: selectedCustomer.address,
        items: validItems.map((item, idx) => ({
          id: `si-${uid()}-${idx}`,
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          qty: item.qty,
          lineTotal: item.price * item.qty,
        })),
        subtotal,
        discount: discountAmount,
        discountType,
        cgst,
        sgst,
        total,
        paymentMode: splitPayment ? "Split" : paymentMode,
        status: "Completed",
        notes: splitPayment
          ? `Split Payment: ${paymentMode} ${INR(primaryAmount)} + ${secondaryPaymentMode} ${INR(secondaryAmount)}${notes.trim() ? "\n" + notes.trim() : ""}`
          : (notes.trim() || undefined),
      };

      if (splitPayment) {
        payload.paymentModeSplit = {
          primary: paymentMode,
          secondary: secondaryPaymentMode,
          secondaryAmount,
        };
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        toast.success(`Invoice ${invoiceNo} created successfully!`);
        // Auto-earn loyalty points (1 point per ₹100 spent)
        if (selectedCustomer.id && selectedCustomer.id !== 'undefined' && selectedCustomer.id.startsWith('c')) {
          const earnedPoints = Math.floor(total / 100);
          if (earnedPoints > 0) {
            try {
              await fetch(`/api/customers/${selectedCustomer.id}/loyalty`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  points: earnedPoints,
                  reason: `Auto-earned from invoice ${invoiceNo}`,
                  type: "earn",
                }),
              });
            } catch {
              // silently ignore loyalty failure
            }
            toast.info(`+${earnedPoints} loyalty points earned!`);
          }
        }
        resetForm();
        onOpenChange(false);
        onCreated();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setItems([{ productId: "", productName: "", price: 0, qty: 1 }]);
    setDiscount(0);
    setDiscountType("flat");
    setPaymentMode("Cash");
    setNotes("");
    setShowNewCustomer(false);
    setSplitPayment(false);
    setSecondaryPaymentMode("UPI");
    setSecondaryAmount(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Create New Invoice
            </DialogTitle>
            <DialogDescription>
              Add customer and products to generate a sales invoice.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Selection */}
          {showNewCustomer ? (
            <NewCustomerForm
              onSave={(c) => {
                setCustomers((prev) => [c, ...prev]);
                setSelectedCustomer(c);
                setShowNewCustomer(false);
                toast.success(`Customer "${c.name}" added`);
              }}
              onCancel={() => setShowNewCustomer(false)}
            />
          ) : (
            <CustomerSelect
              customers={customers}
              selectedCustomerId={selectedCustomer?.id ?? null}
              onSelect={setSelectedCustomer}
              onCreateNew={() => setShowNewCustomer(true)}
            />
          )}

          <Separator />

          {/* Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={handleAddItem}>
                <Plus className="size-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Popular Items Quick-Pick */}
            {productsLoaded && products.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Popular Items</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {products.slice(0, 15).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-full bg-muted text-xs font-medium whitespace-nowrap hover:bg-muted/80 transition-colors touch-manipulation border border-transparent hover:border-muted-foreground/20 shrink-0"
                      onClick={() => {
                        const newItem: CreateSaleItem = {
                          productId: p.id,
                          productName: p.name,
                          price: p.price,
                          qty: 1,
                        };
                        const existingEmptyIndex = items.findIndex((i) => !i.productId);
                        if (existingEmptyIndex >= 0) {
                          handleItemUpdate(existingEmptyIndex, newItem);
                        } else {
                          setItems((prev) => [...prev, newItem]);
                        }
                        toast.success(`Added ${p.name}`);
                      }}
                    >
                      {p.name} · {INR(p.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border max-h-[50vh] sm:max-h-none overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50%]">Product</TableHead>
                    <TableHead className="text-right w-[15%]">Price</TableHead>
                    <TableHead className="w-[15%]">Qty</TableHead>
                    <TableHead className="text-right w-[15%]">Total</TableHead>
                    <TableHead className="w-[5%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <ItemRow
                      key={idx}
                      row={item}
                      index={idx}
                      products={products}
                      onUpdate={handleItemUpdate}
                      onRemove={handleItemRemove}
                      canRemove={items.length > 1}
                    />
                  ))}
                </TableBody>
                {hasValidItems && (
                  <TableFooter>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={2} className="font-medium text-sm">
                        Totals
                      </TableCell>
                      <TableCell className="text-sm">{totalQty} items</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {INR(subtotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Discount */}
              <div className="space-y-2">
                <Label>Discount</Label>
                {/* Quick Discount Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { label: "No Discount", value: 0, type: "flat" as const },
                    { label: "5%", value: 5, type: "percentage" as const },
                    { label: "10%", value: 10, type: "percentage" as const },
                    { label: "15%", value: 15, type: "percentage" as const },
                    { label: "20%", value: 20, type: "percentage" as const },
                    { label: "₹100", value: 100, type: "flat" as const },
                    { label: "₹200", value: 200, type: "flat" as const },
                    { label: "₹500", value: 500, type: "flat" as const },
                  ]).map((preset) => {
                    const isActive = discount === preset.value && discountType === preset.type;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={cn(
                          "min-h-[44px] px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors touch-manipulation border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:border-muted-foreground/20"
                        )}
                        onClick={() => {
                          setDiscount(preset.value);
                          setDiscountType(preset.type);
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as "percentage" | "flat")}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Mode Quick Select */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { mode: "Cash", Icon: Banknote },
                    { mode: "Card", Icon: CreditCard },
                    { mode: "UPI", Icon: Smartphone },
                    { mode: "Credit", Icon: FileText },
                    { mode: "Split", Icon: Scissors },
                  ] as const).map(({ mode, Icon }) => {
                    const isActive = mode === "Split" ? splitPayment : (!splitPayment && paymentMode === mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={cn(
                          "min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg border-2 flex items-center gap-2 text-sm font-medium transition-colors touch-manipulation",
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                        )}
                        onClick={() => {
                          if (mode === "Split") {
                            if (paymentMode === "Credit") setPaymentMode("Cash");
                            if (!splitPayment) {
                              setSplitPayment(true);
                              setSecondaryAmount(total);
                            }
                          } else {
                            setPaymentMode(mode as typeof paymentMode);
                            setSplitPayment(false);
                          }
                        }}
                      >
                        <Icon className="size-4" />
                        <span>{mode}</span>
                      </button>
                    );
                  })}
                </div>

                {splitPayment && canSplit && (
                  <div className="ml-6 mt-2 space-y-2 rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Primary: {paymentMode} — {INR(primaryAmount)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Secondary Mode</Label>
                        <Select
                          value={secondaryPaymentMode}
                          onValueChange={(v) => setSecondaryPaymentMode(v as "Cash" | "Card" | "UPI")}
                        >
                          <SelectTrigger className="w-28 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["Cash", "Card", "UPI"] as const)
                              .filter((m) => m !== paymentMode)
                              .map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 flex-1 min-w-[120px]">
                        <Label className="text-xs">Secondary Amount</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={secondaryAmount || ""}
                            onChange={(e) => setSecondaryAmount(parseFloat(e.target.value) || 0)}
                            className="pl-8 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    {splitPayment && (secondaryAmount <= 0 || secondaryAmount >= total) && (
                      <p className="text-xs text-destructive">
                        Secondary amount must be between ₹0 and {INR(total)} (exclusive)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="sale-notes">Notes</Label>
                <Textarea
                  id="sale-notes"
                  placeholder="Add any notes for this invoice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-16"
                />
              </div>
            </div>

            {/* Calculated Totals */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2.5 h-fit">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{INR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount
                  {discountType === "percentage" && discount > 0 ? ` (${discount}%)` : ""}
                </span>
                <span className="font-mono text-destructive">- {INR(discountAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-mono">{INR(taxable)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CGST @9%</span>
                <span className="font-mono">{INR(cgst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SGST @9%</span>
                <span className="font-mono">{INR(sgst)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total Amount</span>
                <span className="font-mono text-lg">{INR(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sticky bottom-0">
          <div className="text-xs text-muted-foreground">
            Tax calculated on subtotal minus discount
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={handleCreate}
              disabled={submitting || !selectedCustomer || !hasValidItems || !splitValid}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Create Invoice
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Component: Sale Detail Dialog
// ---------------------------------------------------------------------------

interface SaleDetailDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturn: (sale: Sale) => void;
  onToggleStatus: (sale: Sale) => void;
  onDuplicate: (sale: Sale) => void;
}

function SaleDetailDialog({ sale, open, onOpenChange, onReturn, onToggleStatus, onDuplicate }: SaleDetailDialogProps) {
  if (!sale) return null;

  // Get settings for print (SSR-safe with fallback)
  let settings: { shopName: string; gstin: string; phone: string; address: string };
  try {
    settings = getSettings();
  } catch {
    // Fallback defaults
    settings = { shopName: 'i Star Opticals', gstin: '33BPKPS1234F1Z5', phone: '+91 94432 12345', address: 'Main Road, Sankarankovil - 627751' };
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:border-0 hover-lift" showCloseButton={false}>
        {/* Print-friendly header */}
        <div className="p-6 pb-0 print:p-8 print:pb-2 print:bg-white">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Invoice {sale.invoiceNo}
            </DialogTitle>
            <DialogDescription>Full invoice details</DialogDescription>
          </DialogHeader>

          {/* Print Header */}
          <div className="hidden print:block print:mb-4">
            <div className="border-b-2 border-gray-800 pb-3 mb-4">
              <h1 className="text-xl font-bold tracking-wide text-center">TAX INVOICE</h1>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-bold text-base">{settings.shopName}</p>
                <p className="text-gray-600 mt-0.5">{settings.address}</p>
                <p className="text-gray-600">GSTIN: {settings.gstin}</p>
                <p className="text-gray-600">Ph: {settings.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base">{sale.invoiceNo}</p>
                <p className="text-gray-600">
                  Date: {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="mt-1">
                  <StatusBadge status={sale.status} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-6 print:px-8 print:pb-4 print:space-y-4">
          {/* Invoice Header (screen only) */}
          <div className="print:hidden flex items-start justify-between">
            <div className="space-y-1">
              <StatusBadge status={sale.status} />
              <p className="text-sm text-muted-foreground">
                {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-muted-foreground">Payment: {sale.paymentMode}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg sm:text-xl font-bold">{sale.invoiceNo}</h2>
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-lg border p-4 print:border print:p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Bill To
            </p>
            <p className="font-semibold">{sale.customerName}</p>
            {sale.customerPhone && <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>}
            {sale.customerEmail && <p className="text-sm text-muted-foreground">{sale.customerEmail}</p>}
            {sale.customerAddress && <p className="text-sm text-muted-foreground">{sale.customerAddress}</p>}
          </div>

          {/* Items Table */}
          <div className="rounded-lg border overflow-x-auto overflow-hidden print:border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[10%]">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, idx) => (
                  <TableRow key={item.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{INR(item.price)}</TableCell>
                    <TableCell className="text-right text-sm">{item.qty}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {INR(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 rounded-lg border p-4 print:border print:p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{INR(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-destructive">- {INR(sale.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CGST @9%</span>
                <span className="font-mono">{INR(sale.cgst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SGST @9%</span>
                <span className="font-mono">{INR(sale.sgst)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total</span>
                <span className="font-mono">{INR(sale.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payment Mode</span>
                <span>{sale.paymentMode}</span>
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="rounded-lg border p-4 print:border print:p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm">{sale.notes}</p>
            </div>
          )}

          {/* Thank you (print only) */}
          <div className="hidden print:block text-center pt-6 mt-4 border-t border-gray-200">
            <p className="text-base font-semibold text-gray-800">Thank you for shopping with i Star Opticals!</p>
            <p className="text-xs text-gray-500 mt-1">This is a computer-generated invoice.</p>
            <p className="text-xs text-gray-500">Ph: {settings.phone} · GSTIN: {settings.gstin}</p>
          </div>

          {/* Actions (screen only) */}
          <div className="print:hidden flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={handlePrint}>
              <Printer className="size-3.5 mr-1.5" />
              Print
            </Button>
            {sale.status !== "Return" && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50"
                onClick={() => onReturn(sale)}
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                New Return
              </Button>
            )}
            {sale.customerPhone && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                onClick={() => {
                  const cleanPhone = (sale.customerPhone ?? '').replace(/\D/g, '');
                  const itemLines = sale.items.map((item, i) => `${i + 1}. ${item.productName} x${item.qty} \u2014 ${INR(item.lineTotal)}`).join('\n');
                  const receiptText = `\u{1F9FE} *Invoice ${sale.invoiceNo}*\n${settings.shopName}\n\u{1F4C5} ${new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n\n\u{1F464} ${sale.customerName}\n\n${itemLines}\n\nSubtotal: ${INR(sale.subtotal)}${sale.discount > 0 ? `\nDiscount: -${INR(sale.discount)}` : ""}\nCGST 9%: ${INR(sale.cgst)}\nSGST 9%: ${INR(sale.sgst)}\n*Total: ${INR(sale.total)}*\n\nPayment: ${sale.paymentMode}\n\nThank you for choosing ${settings.shopName}! \u{1F64F}`;
                  window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(receiptText)}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <svg viewBox="0 0 24 24" className="size-3.5 mr-1.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Receipt
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              onClick={() => onDuplicate(sale)}
            >
              <FileText className="size-3.5 mr-1.5" />
              Duplicate Invoice
            </Button>
            {sale.status === "Completed" && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => onToggleStatus(sale)}
              >
                <AlertCircle className="size-3.5 mr-1.5 text-amber-500" />
                Mark as Pending
              </Button>
            )}
            {sale.status === "Pending" && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => onToggleStatus(sale)}
              >
                <AlertCircle className="size-3.5 mr-1.5 text-emerald-500" />
                Mark as Completed
              </Button>
            )}
            <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] ml-auto touch-manipulation" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Component: Return Dialog
// ---------------------------------------------------------------------------

interface ReturnDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed: () => void;
}

function ReturnDialog({ sale, open, onOpenChange, onProcessed }: ReturnDialogProps) {
  const [returnItems, setReturnItems] = React.useState<ReturnItem[]>([]);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (sale && open) {
      setReturnItems(
        sale.items.map((item) => ({
          saleItemId: item.id,
          productName: item.productName,
          originalQty: item.qty,
          returnQty: 0,
          price: item.price,
        }))
      );
      setReason("");
    }
  }, [sale, open]);

  if (!sale) return null;

  const handleReturnQtyChange = (index: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, returnQty: Math.min(Math.max(0, qty), item.originalQty) } : item
      )
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setReturnItems((prev) =>
      prev.map((item) => ({
        ...item,
        returnQty: checked ? item.originalQty : 0,
      }))
    );
  };

  const totalRefund = returnItems.reduce((sum, item) => sum + item.price * item.returnQty, 0);
  const taxRefund = Math.round(totalRefund * (CGST_RATE + SGST_RATE) * 100) / 100;
  const grandRefund = Math.round((totalRefund + taxRefund) * 100) / 100;
  const hasItems = returnItems.some((item) => item.returnQty > 0);

  const handleProcessReturn = async () => {
    if (!hasItems) {
      toast.error("Select at least one item to return");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the return");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sale.id,
          invoiceNo: sale.invoiceNo,
          items: returnItems
            .filter((item) => item.returnQty > 0)
            .map((item) => ({
              saleItemId: item.saleItemId,
              productName: item.productName,
              returnQty: item.returnQty,
              price: item.price,
            })),
          reason: reason.trim(),
          refundAmount: grandRefund,
        }),
      });

      if (res.ok) {
        toast.success(`Return processed for ${sale.invoiceNo}. Refund: ${INR(grandRefund)}`);
        onOpenChange(false);
        onProcessed();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to process return");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5" />
            Process Return
          </DialogTitle>
          <DialogDescription>
            Invoice {sale.invoiceNo} — {sale.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items to return */}
          <div className="rounded-lg border overflow-x-auto overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={returnItems.every((i) => i.returnQty > 0) && returnItems.length > 0}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnItems.map((item, idx) => (
                  <TableRow key={item.saleItemId} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                    <TableCell>
                      <Checkbox
                        checked={item.returnQty > 0}
                        onCheckedChange={(checked) =>
                          handleReturnQtyChange(idx, checked ? item.originalQty : 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-40 truncate">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-right text-sm">{item.originalQty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={item.originalQty}
                        value={item.returnQty || ""}
                        onChange={(e) =>
                          handleReturnQtyChange(idx, parseInt(e.target.value, 10) || 0)
                        }
                        className="h-8 w-16 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {INR(item.price * item.returnQty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Refund Summary */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Refund</span>
              <span className="font-mono">{INR(totalRefund)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Refund (CGST+SGST)</span>
              <span className="font-mono">{INR(taxRefund)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Refund</span>
              <span className="font-mono text-lg">{INR(grandRefund)}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="return-reason">Reason for Return *</Label>
            <Textarea
              id="return-reason"
              placeholder="Describe the reason for this return..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={handleProcessReturn}
            disabled={submitting || !hasItems || !reason.trim()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Process Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Component: Pagination Controls
// ---------------------------------------------------------------------------

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        className="min-w-[44px] min-h-[44px] touch-manipulation"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
        aria-label="First page"
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="min-w-[44px] min-h-[44px] touch-manipulation"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((p, idx) =>
        p === "ellipsis" ? (
          <span key={`el-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="min-w-[44px] min-h-[44px] touch-manipulation"
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className="min-w-[44px] min-h-[44px] touch-manipulation"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="min-w-[44px] min-h-[44px] touch-manipulation"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="Last page"
      >
        <ChevronsRight className="size-4" />
      </Button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Component: Sales Table Skeleton
// ---------------------------------------------------------------------------

function SalesTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="size-8" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component: Sales
// ---------------------------------------------------------------------------

export default function Sales() {
  // -- State --
  const [sales, setSales] = React.useState<SaleListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [todayCount, setTodayCount] = React.useState(0);
  const [todayTotal, setTodayTotal] = React.useState(0);
  const [todayLoading, setTodayLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const { triggerNewSale } = useCrmStore();

  // Listen for triggerNewSale signal from keyboard shortcuts
  React.useEffect(() => {
    if (triggerNewSale > 0) {
      setCreateOpen(true);
    }
  }, [triggerNewSale]);
  const [detailSale, setDetailSale] = React.useState<Sale | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [returnSale, setReturnSale] = React.useState<Sale | null>(null);
  const [returnOpen, setReturnOpen] = React.useState(false);

  const [creditFilter, setCreditFilter] = React.useState(false);
  const [creditTotal, setCreditTotal] = React.useState(0);
  const [summaryPeriod, setSummaryPeriod] = React.useState<"today" | "week" | "month">("today");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Completed" | "Pending" | "Return">("all");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState<"all" | "Cash" | "Card" | "UPI" | "Credit" | "Split">("all");
  const [activeDatePreset, setActiveDatePreset] = React.useState<"today" | "week" | "month" | "lastMonth" | null>(null);

  // -- Fetch Outstanding Credit Total --
  const fetchCreditTotal = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sales?paymentMode=Credit&limit=9999');
      if (res.ok) {
        const data: SalesResponse = await res.json();
        setCreditTotal(data.sales.reduce((sum, s) => sum + s.total, 0));
      }
    } catch {
      // Silent fail
    }
  }, []);

  React.useEffect(() => {
    fetchCreditTotal();
  }, [fetchCreditTotal]);

  const pageSize = 10;

  // -- Fetch Period Summary (Today / This Week / This Month) --
  const fetchTodaySummary = React.useCallback(async () => {
    setTodayLoading(true);
    try {
      const now = new Date();
      let fromDate: string;
      let periodLabel: string;

      if (summaryPeriod === "week") {
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        fromDate = monday.toISOString().split('T')[0];
        periodLabel = "This Week";
      } else if (summaryPeriod === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        periodLabel = "This Month";
      } else {
        fromDate = now.toISOString().split('T')[0];
        periodLabel = "Today";
      }

      const toDate = now.toISOString().split('T')[0];
      const params = new URLSearchParams({
        fromDate,
        toDate,
        limit: '999',
      });
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data: SalesResponse = await res.json();
        setTodayCount(data.sales.length);
        setTodayTotal(data.sales.reduce((sum, s) => sum + s.total, 0));
      }
    } catch {
      // Silent fail - summary is non-critical
    } finally {
      setTodayLoading(false);
    }
  }, [summaryPeriod]);

  React.useEffect(() => {
    fetchTodaySummary();
  }, [fetchTodaySummary]);

  // -- Fetch Sales --
  const fetchSales = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page) params.set("page", page.toString());
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (creditFilter) params.set("paymentMode", "Credit");
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (paymentModeFilter && paymentModeFilter !== "all") params.set("paymentMode", paymentModeFilter);

    try {
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data: SalesResponse = await res.json();
        setSales(data.sales);
        setTotal(data.total);
      } else {
        setSales([]);
        setTotal(0);
        toast.error("Failed to load sales");
      }
    } catch {
      setSales([]);
      setTotal(0);
      toast.error("Network error while loading sales");
    } finally {
      setLoading(false);
      fetchCreditTotal();
    }
  }, [search, page, fromDate, toDate, creditFilter, statusFilter, paymentModeFilter, fetchCreditTotal]);

  React.useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Reset to page 1 when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setActiveDatePreset(null);
    setPage(1);
  };
  const handleToDateChange = (val: string) => {
    setToDate(val);
    setActiveDatePreset(null);
    setPage(1);
  };
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val as "all" | "Completed" | "Pending" | "Return");
    setPage(1);
  };
  const handleDatePreset = (preset: "today" | "week" | "month" | "lastMonth") => {
    const now = new Date();
    let from: string;
    let to: string;
    if (preset === "today") {
      from = now.toISOString().split("T")[0];
      to = from;
    } else if (preset === "week") {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      from = monday.toISOString().split("T")[0];
      to = now.toISOString().split("T")[0];
    } else if (preset === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      to = now.toISOString().split("T")[0];
    } else {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      from = firstDayLastMonth.toISOString().split("T")[0];
      to = lastDayLastMonth.toISOString().split("T")[0];
    }
    setFromDate(from);
    setToDate(to);
    setActiveDatePreset(preset);
    setPage(1);
  };
  const handlePaymentModeFilterChange = (val: string) => {
    setPaymentModeFilter(val as "all" | "Cash" | "Card" | "UPI" | "Credit" | "Split");
    setPage(1);
  };

  const periodLabels: Record<string, string> = {
    today: "Today's Sales",
    week: "This Week's Sales",
    month: "This Month's Sales",
  };
  const periodInvoiceLabels: Record<string, string> = {
    today: "invoices today",
    week: "invoices this week",
    month: "invoices this month",
  };

  const totalPages = Math.ceil(total / pageSize);

  // -- Detail --
  const handleViewDetail = async (saleItem: SaleListItem) => {
    try {
      const res = await fetch(`/api/sales/${saleItem.id}`);
      if (res.ok) {
        const data: Sale = await res.json();
        setDetailSale(data);
      } else {
        toast.error("Failed to load sale details");
      }
    } catch {
      toast.error("Network error");
    }
    setDetailOpen(true);
  };

  // -- Status Toggle --
  const handleToggleStatus = async (sale: Sale) => {
    const newStatus = sale.status === "Completed" ? "Pending" : "Completed";

    try {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setDetailSale((prev) => (prev ? { ...prev, status: newStatus as Sale["status"] } : null));
        toast.success(`Invoice marked as ${newStatus}`);
        fetchSales();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // -- Return --
  const handleOpenReturn = (sale: Sale) => {
    setReturnSale(sale);
    setReturnOpen(true);
  };

  // -- Duplicate Invoice --
  const handleDuplicate = async (sale: Sale) => {
    try {
      const invoiceNo = generateInvoiceNo();
      const payload: Record<string, unknown> = {
        invoiceNo,
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        customerEmail: sale.customerEmail,
        customerAddress: sale.customerAddress,
        items: sale.items.map((item, idx) => ({
          id: `si-${uid()}-${idx}`,
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          qty: item.qty,
          lineTotal: item.lineTotal,
        })),
        subtotal: sale.subtotal,
        discount: sale.discount,
        discountType: sale.discountType,
        cgst: sale.cgst,
        sgst: sale.sgst,
        total: sale.total,
        paymentMode: sale.paymentMode,
        status: "Completed",
        notes: `Duplicated from ${sale.invoiceNo}${sale.notes ? "\n" + sale.notes : ""}`,
      };
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`Duplicated as ${invoiceNo}`);
        setDetailOpen(false);
        setDetailSale(null);
        fetchSales();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to duplicate invoice");
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const handleReturnProcessed = () => {
    setDetailOpen(false);
    setDetailSale(null);
    fetchSales();
  };

  // -- Stats for summary cards --
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const completedCount = sales.filter((s) => s.status === "Completed").length;
  const pendingCount = sales.filter((s) => s.status === "Pending").length;

  // -- Render --
  return (
    <section className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="size-6" />
              Sales & Billing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage invoices, track payments, and process returns.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)} className="min-h-[44px] touch-manipulation">
              <Plus className="size-4" />
              New Invoice
            </Button>
            <Button
              variant={creditFilter ? "default" : "outline"}
              className={cn(
                "shrink-0 min-h-[44px] touch-manipulation",
                creditFilter && "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
              )}
              onClick={() => setCreditFilter((f) => !f)}
            >
              <CreditCard className="size-3.5 mr-1" />
              {creditFilter ? "Showing Credit Only" : "Credit Sales"}
            </Button>
          </div>
        </div>

        {/* Outstanding Credit Alert */}
        {creditTotal > 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-red-100 dark:bg-red-950/60">
                <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Outstanding Credit
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  Total credit amount pending from customers
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-red-700 dark:text-red-300 font-mono">
              {INR(creditTotal)}
            </span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">{periodLabels[summaryPeriod]}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {todayLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                <Select value={summaryPeriod} onValueChange={(v) => setSummaryPeriod(v as typeof summaryPeriod)}>
                  <SelectTrigger className="h-7 w-[110px] text-xs" aria-label="Select period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-2xl font-bold mt-1 font-mono">{INR(todayTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayCount} invoice{todayCount !== 1 ? 's' : ''} {periodInvoiceLabels[summaryPeriod]}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm hover-lift">
            <p className="text-sm font-medium text-muted-foreground">This Page Revenue</p>
            <p className="text-2xl font-bold mt-1 font-mono">{INR(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{sales.length} invoices shown</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm hover-lift">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Fully paid invoices</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm hover-lift">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card shadow-sm hover-lift">
          <div className="p-4 space-y-3">
            {/* Status Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(["all", "Completed", "Pending", "Return"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "min-w-[44px] min-h-[44px] px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation shrink-0",
                    statusFilter === s
                      ? s === "all"
                        ? "bg-primary text-primary-foreground"
                        : s === "Completed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : s === "Pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                  )}
                  onClick={() => handleStatusFilterChange(s)}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice # or customer name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Date Quick Presets */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quick</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { label: "Today", key: "today" as const },
                      { label: "This Week", key: "week" as const },
                      { label: "This Month", key: "month" as const },
                      { label: "Last Month", key: "lastMonth" as const },
                    ]).map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        className={cn(
                          "min-w-[44px] min-h-[44px] px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors touch-manipulation",
                          activeDatePreset === preset.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                        )}
                        onClick={() => handleDatePreset(preset.key)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    className="w-full sm:w-44"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleToDateChange(e.target.value)}
                    className="w-full sm:w-44"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment</Label>
                  <Select value={paymentModeFilter} onValueChange={handlePaymentModeFilterChange}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Split">Split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(search || fromDate || toDate || statusFilter !== "all" || paymentModeFilter !== "all") && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground invisible">Action</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] touch-manipulation"
                      onClick={() => {
                        setSearch("");
                        setFromDate("");
                        setToDate("");
                        setStatusFilter("all");
                        setPaymentModeFilter("all");
                        setActiveDatePreset(null);
                        setPage(1);
                      }}
                    >
                      <X className="size-3.5 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border-t">
            {error && (
              <Alert variant="destructive" className="mx-4 mt-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="p-4">
                <SalesTableSkeleton />
              </div>
            ) : sales.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="size-12 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No invoices found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 min-h-[44px] touch-manipulation"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-3.5 mr-1" />
                  Create First Invoice
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Invoice #</TableHead>
                        <TableHead className="min-w-[150px]">Customer</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow
                          key={sale.id}
                          className="cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                          onClick={() => handleViewDetail(sale)}
                        >
                          <TableCell className="font-mono font-medium text-sm">
                            {sale.invoiceNo}
                          </TableCell>
                          <TableCell className="font-medium">{sale.customerName}</TableCell>
                          <TableCell className="text-right text-sm">{sale.itemsCount}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {INR(sale.subtotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-destructive">
                            {sale.discount > 0 ? `- ${INR(sale.discount)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {INR(sale.cgst + sale.sgst)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {INR(sale.total)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="rounded-full text-xs">
                                {sale.paymentMode}
                              </Badge>
                              {sale.paymentMode === "Credit" && (
                                <Badge className="rounded-full bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 text-[10px] px-1.5 py-0">
                                  CREDIT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sale.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="min-w-[44px] min-h-[44px] touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(sale);
                              }}
                              aria-label={`View invoice ${sale.invoiceNo}`}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="border-t px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
                    {total} invoices
                  </p>
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateSaleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchSales}
      />

      <SaleDetailDialog
        sale={detailSale}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReturn={handleOpenReturn}
        onToggleStatus={handleToggleStatus}
        onDuplicate={handleDuplicate}
      />

      <ReturnDialog
        sale={returnSale}
        open={returnOpen}
        onOpenChange={setReturnOpen}
        onProcessed={handleReturnProcessed}
      />
    </section>
  );
}