'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Loader2,
  IndianRupee,
  Upload,
  FileBarChart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PackagePlus,
  Copy,
  ChevronDown,
  Download,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  sku: string
  name: string
  brand: string | null
  model: string | null
  color: string | null
  size: string | null
  category: string
  price: number
  costPrice: number | null
  stock: number
  minStock: number
  type: string | null
  duration: string | null
  expiryDate: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  // NEW fields returned from API:
  supplier: string | null
  supplierPhone: string | null
  lastRestocked: string | null
  frameWidth: number | null
  bridge: number | null
  temple: number | null
}

interface ProductFormData {
  name: string
  brand: string
  model: string
  color: string
  size: string
  category: string
  price: string
  costPrice: string
  stock: string
  minStock: string
  sku: string
  type: string
  duration: string
  expiryDate: string
  description: string
  supplier: string
  supplierPhone: string
  frameWidth: string
  bridge: string
  temple: string
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  lowStockCount: number
  lowStockItems: Product[]
}

interface LowStockReportItem {
  id: string
  name: string
  category: string
  brand: string | null
  stock: number
  minStock: number
  needed: number
  sku: string
  costPrice: number | null
  reorderCost: number
  supplier: string | null
  supplierPhone: string | null
}

interface LowStockReport {
  total: number
  byCategory: Record<string, number>
  totalReorderValue: number
  items: LowStockReportItem[]
}

interface BulkImportResult {
  created: number
  skipped: number
  errors: string[]
}

type SortField = 'name' | 'price' | 'stock' | 'minStock' | 'createdAt'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'low' | 'out' | 'in'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Frames',
  'Lenses',
  'Sunglasses',
  'Contact Lenses',
  'Accessories',
  'Solutions',
] as const

const CATEGORY_CHIPS = ['All', ...CATEGORIES] as const

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Stock' },
  { value: 'low', label: '⚠️ Low Stock' },
  { value: 'out', label: '🚫 Out of Stock' },
  { value: 'in', label: '✅ In Stock' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'stock-asc', label: 'Stock: Low → High' },
  { value: 'recent', label: 'Recently Added' },
]

const LENS_TYPES = [
  'Single Vision',
  'Bifocal',
  'Progressive',
  'Blue-cut',
  'Photochromic',
] as const

const DURATIONS = [
  'Daily',
  'Bi-weekly',
  'Monthly',
  'Quarterly',
  'Yearly',
] as const

const ITEMS_PER_PAGE = 10

const CSV_SAMPLE = `name,category,brand,model,price,stock,min_stock,supplier
Aviator Classic,Frames,Ray-Ban,RB3025,4500,10,5,Ray-Ban India`

const emptyForm: ProductFormData = {
  name: '',
  brand: '',
  model: '',
  color: '',
  size: '',
  category: '',
  price: '',
  costPrice: '',
  stock: '',
  minStock: '',
  sku: '',
  type: '',
  duration: '',
  expiryDate: '',
  description: '',
  supplier: '',
  supplierPhone: '',
  frameWidth: '',
  bridge: '',
  temple: '',
}

function generateSKU(category: string): string {
  const catPrefix = category.substring(0, 3).toUpperCase()
  const suffix = Date.now().toString(36).toUpperCase()
  return `SKO-${catPrefix}-${suffix}`
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Never'
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Inventory() {
  // List state
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('All')
  const [categorySelect, setCategorySelect] = useState('All')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Alert state
  const [lowStockCount, setLowStockCount] = useState(0)
  const [lowStockItems, setLowStockItems] = useState<Product[]>([])
  const [showAlert, setShowAlert] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  // CSV Import dialog state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvData, setCsvData] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)

  // Low-Stock Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportData, setReportData] = useState<LowStockReport | null>(null)

  // Quick Stock Adjust dialog state
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjusting, setAdjusting] = useState(false)

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk update prices dialog state
  const [updatePricesOpen, setUpdatePricesOpen] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)

  // Bulk delete confirmation
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // File upload for CSV import
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ─── Sorted products ─────────────────────────────────────────────────────

  const sortedProducts = useMemo(() => {
    if (!sortField) return products
    const sorted = [...products].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      if (sortField === 'name') {
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
      } else if (sortField === 'createdAt') {
        aVal = a.createdAt
        bVal = b.createdAt
      } else {
        aVal = a[sortField]
        bVal = b[sortField]
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [products, sortField, sortDirection])

  // ─── Display products (apply client-side status filter) ─────────────────

  const displayProducts = useMemo(() => {
    let result = sortedProducts
    if (statusFilter === 'out') {
      result = result.filter((p) => p.stock === 0)
    } else if (statusFilter === 'in') {
      result = result.filter((p) => p.stock > p.minStock)
    }
    return result
  }, [sortedProducts, statusFilter])

  // ─── Current sort-by value for dropdown ────────────────────────────────

  const currentSortBy = useMemo(() => {
    if (!sortField) return 'name-asc'
    if (sortField === 'createdAt') return 'recent'
    return `${sortField}-${sortDirection}`
  }, [sortField, sortDirection])

  // ─── Selection helpers ─────────────────────────────────────────────────

  const allOnPageSelected =
    displayProducts.length > 0 &&
    displayProducts.every((p) => selectedIds.has(p.id))

  const someOnPageSelected =
    displayProducts.some((p) => selectedIds.has(p.id)) && !allOnPageSelected

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        displayProducts.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        displayProducts.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ─── Fetch products ──────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      // Use categorySelect if it's not 'All', otherwise fall back to activeTab
      const effectiveCategory = categorySelect !== 'All' ? categorySelect : activeTab
      if (effectiveCategory !== 'All') params.set('category', effectiveCategory)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(currentPage))
      params.set('pageSize', String(ITEMS_PER_PAGE))
      if (statusFilter === 'low') params.set('lowStock', 'true')

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data: ProductsResponse = await res.json()

      setProducts(data.products)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setLowStockCount(data.lowStockCount)
      setLowStockItems(data.lowStockItems)
    } catch {
      setProducts([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [activeTab, categorySelect, search, currentPage, statusFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setSectionOpen({ basic: true, pricing: true, frame: false, additional: false })
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      brand: product.brand ?? '',
      model: product.model ?? '',
      color: product.color ?? '',
      size: product.size ?? '',
      category: product.category,
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : '',
      stock: String(product.stock),
      minStock: String(product.minStock),
      sku: product.sku,
      type: product.type ?? '',
      duration: product.duration ?? '',
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().split('T')[0]
        : '',
      description: product.description ?? '',
      supplier: product.supplier ?? '',
      supplierPhone: product.supplierPhone ?? '',
      frameWidth: product.frameWidth != null ? String(product.frameWidth) : '',
      bridge: product.bridge != null ? String(product.bridge) : '',
      temple: product.temple != null ? String(product.temple) : '',
    })
    setSectionOpen({ basic: true, pricing: true, frame: true, additional: true })
    setDialogOpen(true)
  }

  const openCloneDialog = (product: Product) => {
    setEditingProduct(null)
    setForm({
      name: `${product.name} (Copy)`,
      brand: product.brand ?? '',
      model: product.model ?? '',
      color: product.color ?? '',
      size: product.size ?? '',
      category: product.category,
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : '',
      stock: '',
      minStock: String(product.minStock),
      sku: '', // let it auto-generate
      type: product.type ?? '',
      duration: product.duration ?? '',
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().split('T')[0]
        : '',
      description: product.description ?? '',
      supplier: product.supplier ?? '',
      supplierPhone: product.supplierPhone ?? '',
      frameWidth: product.frameWidth != null ? String(product.frameWidth) : '',
      bridge: product.bridge != null ? String(product.bridge) : '',
      temple: product.temple != null ? String(product.temple) : '',
    })
    setSectionOpen({ basic: true, pricing: true, frame: false, additional: false })
    setDialogOpen(true)
  }

  const updateField = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-generate SKU when category changes and SKU is empty
      if (field === 'category' && !prev.sku.trim() && value) {
        updated.sku = generateSKU(value)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.name.trim()) return
    if (!form.category) return
    if (!form.price.trim() || isNaN(Number(form.price))) return
    if (!form.stock.trim() || isNaN(Number(form.stock))) return

    const finalSKU = form.sku.trim() || generateSKU(form.category)

    const body = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      color: form.color.trim() || null,
      size: form.size.trim() || null,
      category: form.category,
      price: Number(form.price),
      costPrice: form.costPrice.trim() ? Number(form.costPrice) : null,
      stock: Number(form.stock),
      minStock: form.minStock.trim() ? Number(form.minStock) : 0,
      sku: finalSKU,
      type: ['Lenses'].includes(form.category) && form.type
        ? form.type
        : null,
      duration: ['Contact Lenses'].includes(form.category) && form.duration
        ? form.duration
        : null,
      expiryDate:
        ['Lenses', 'Contact Lenses'].includes(form.category) &&
        form.expiryDate
          ? new Date(form.expiryDate).toISOString()
          : null,
      description: form.description.trim() || null,
      supplier: form.supplier.trim() || null,
      supplierPhone: form.supplierPhone.trim() || null,
      frameWidth: form.category === 'Frames' && form.frameWidth.trim()
        ? Number(form.frameWidth)
        : null,
      bridge: form.category === 'Frames' && form.bridge.trim()
        ? Number(form.bridge)
        : null,
      temple: form.category === 'Frames' && form.temple.trim()
        ? Number(form.temple)
        : null,
    }

    setSubmitting(true)
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save product')

      setDialogOpen(false)
      setForm(emptyForm)
      setEditingProduct(null)
      fetchProducts()
    } catch {
      // Error handled silently for now
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (product: Product) => {
    setDeletingProduct(product)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete product')
      setDeleteDialogOpen(false)
      setDeletingProduct(null)
      fetchProducts()
    } catch {
      // Error handled silently
    } finally {
      setDeleting(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCategorySelect('All')
    setCurrentPage(1)
    setSelectedIds(new Set())
  }

  const handleCategorySelectChange = (value: string) => {
    setCategorySelect(value)
    // Sync tab to All when using the dropdown
    if (value !== 'All') {
      setActiveTab('All')
    } else {
      // If selecting All in dropdown, keep current tab behavior
    }
    setCurrentPage(1)
    setSelectedIds(new Set())
  }

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value)
    setCurrentPage(1)
    setSelectedIds(new Set())
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
    setSelectedIds(new Set())
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    setSelectedIds(new Set())
  }

  // ─── Sort handler ───────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSortByChange = (value: string) => {
    if (value === 'recent') {
      setSortField('createdAt')
      setSortDirection('desc')
    } else {
      const [field, dir] = value.split('-')
      setSortField(field as SortField)
      setSortDirection(dir as SortDirection)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline opacity-40" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 inline" />
    )
  }

  // ─── CSV Import handler ─────────────────────────────────────────────────

  const openCsvDialog = () => {
    setCsvData('')
    setImportResult(null)
    setCsvDialogOpen(true)
  }

  const handleCsvImport = async () => {
    if (!csvData.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvData.trim() }),
      })
      if (!res.ok) throw new Error('Import failed')
      const data: BulkImportResult = await res.json()
      setImportResult(data)
      if (data.created > 0) {
        fetchProducts()
      }
    } catch {
      setImportResult({ created: 0, skipped: 0, errors: ['Import request failed'] })
    } finally {
      setImporting(false)
    }
  }

  // ─── Low-Stock Report handler ───────────────────────────────────────────

  const openReportDialog = async () => {
    setReportDialogOpen(true)
    setReportLoading(true)
    setReportData(null)
    try {
      const res = await fetch('/api/products/low-stock')
      if (!res.ok) throw new Error('Failed to fetch report')
      const data: LowStockReport = await res.json()
      setReportData(data)
    } catch {
      // handled silently
    } finally {
      setReportLoading(false)
    }
  }

  // ─── Quick Stock Adjust handler ─────────────────────────────────────────

  const openAdjustDialog = (product: Product) => {
    setAdjustProduct(product)
    setAdjustQty(0)
  }

  const handleStockAdjust = async () => {
    if (!adjustProduct || adjustQty === 0) return
    setAdjusting(true)
    try {
      const newStock = Math.max(0, adjustProduct.stock + adjustQty)
      const updatePayload: Record<string, unknown> = { stock: newStock }
      if (adjustQty > 0) updatePayload.lastRestocked = new Date().toISOString()
      const res = await fetch(`/api/products/${adjustProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
      if (!res.ok) throw new Error('Failed to update stock')
      toast.success(`${adjustProduct.name}: stock ${adjustProduct.stock} → ${newStock}`)
      setAdjustProduct(null)
      fetchProducts()
    } catch {
      toast.error('Failed to adjust stock')
    } finally {
      setAdjusting(false)
    }
  }

  // ─── Bulk Action handlers ───────────────────────────────────────────────

  const handleExportSelected = () => {
    const selected = products.filter((p) => selectedIds.has(p.id))
    if (selected.length === 0) return

    const headers = [
      'SKU',
      'Name',
      'Brand',
      'Category',
      'Price',
      'Cost Price',
      'Stock',
      'Min Stock',
      'Supplier',
      'Supplier Phone',
      'Last Restocked',
    ]
    const rows = selected.map((p) => [
      p.sku,
      p.name,
      p.brand || '',
      p.category,
      String(p.price),
      p.costPrice != null ? String(p.costPrice) : '',
      String(p.stock),
      String(p.minStock),
      p.supplier || '',
      p.supplierPhone || '',
      p.lastRestocked || '',
    ])

    const csv =
      [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selected.length} product(s)`)
  }

  const handleBulkUpdatePrices = async () => {
    if (!bulkPrice.trim() || isNaN(Number(bulkPrice)) || Number(bulkPrice) < 0) return
    setBulkUpdating(true)
    let success = 0
    let failed = 0
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: Number(bulkPrice) }),
        })
        if (res.ok) success++
        else failed++
      } catch {
        failed++
      }
    }
    setBulkUpdating(false)
    setUpdatePricesOpen(false)
    setBulkPrice('')
    setSelectedIds(new Set())
    toast.success(
      `Updated price for ${success} product(s)${failed > 0 ? ` (${failed} failed)` : ''}`,
    )
    fetchProducts()
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    let success = 0
    let failed = 0
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        if (res.ok) success++
        else failed++
      } catch {
        failed++
      }
    }
    setBulkDeleting(false)
    setBulkDeleteConfirm(false)
    setSelectedIds(new Set())
    toast.success(
      `Deleted ${success} product(s)${failed > 0 ? ` (${failed} failed)` : ''}`,
    )
    fetchProducts()
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  const isLowStock = (product: Product) => product.stock < product.minStock

  const getStockBarPercentage = (product: Product) => {
    const refMax = Math.max(product.stock, product.minStock * 2, 10)
    return Math.min(100, Math.round((product.stock / refMax) * 100))
  }

  const getStockBarColor = (product: Product) => {
    if (product.stock === 0) return 'bg-red-500'
    if (isLowStock(product)) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getStatusBadge = (product: Product) => {
    if (isLowStock(product)) {
      return (
        <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-0.5">
          Low Stock
        </Badge>
      )
    }
    if (product.stock === 0) {
      return (
        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-0.5 text-muted-foreground">
          Out of Stock
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-600 text-white border-transparent text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-0.5">
        In Stock
      </Badge>
    )
  }

  const showTypeField = form.category === 'Lenses'
  const showDurationField = form.category === 'Contact Lenses'
  const showExpiryField = ['Lenses', 'Contact Lenses'].includes(form.category)
  const showFrameSizeFields = form.category === 'Frames'

  // ─── Render: Pagination ─────────────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return (
      <div className="flex items-center justify-between px-2 py-3">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
          {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} products
        </p>
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Button
            variant="outline"
            size="icon"
            className="min-w-[44px] min-h-[44px] touch-manipulation"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={currentPage === p ? 'default' : 'outline'}
                size="icon"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => goToPage(p)}
                aria-label={`Page ${p}`}
                aria-current={currentPage === p ? 'page' : undefined}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            className="min-w-[44px] min-h-[44px] touch-manipulation"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    )
  }

  // ─── Render: Skeleton Loading ───────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 animate-pulse"
        >
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="ml-auto h-8 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  )

  // ─── Total visible columns count ────────────────────────────────────────

  const TABLE_COLSPAN = 12

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24 md:pb-6 px-3 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your products, track stock levels, and monitor inventory alerts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openReportDialog} className="min-w-[44px] min-h-[44px] touch-manipulation">
            <FileBarChart className="mr-2 h-4 w-4" />
            Low Stock Report
          </Button>
          <Button variant="outline" onClick={openCsvDialog} className="min-w-[44px] min-h-[44px] touch-manipulation">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openCreateDialog} className="min-w-[44px] min-h-[44px] touch-manipulation sm:hidden">
            <Plus className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateDialog} className="min-w-[44px] min-h-[44px] touch-manipulation hidden sm:inline-flex">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stock Alert Section */}
      {lowStockCount > 0 && showAlert && (
        <Alert variant="destructive" className="relative border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} below minimum stock level
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <div className="mt-2">
              <p className="text-xs font-medium mb-1.5 uppercase tracking-wider">
                Items needing reorder:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lowStockItems.slice(0, 8).map((item) => (
                  <Badge
                    key={item.id}
                    variant="outline"
                    className="border-amber-400/50 text-amber-800 dark:text-amber-200 text-xs bg-amber-100/50 dark:bg-amber-900/30"
                  >
                    {item.name} ({item.stock}/{item.minStock})
                  </Badge>
                ))}
                {lowStockItems.length > 8 && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/50 text-amber-800 dark:text-amber-200 text-xs bg-amber-100/50 dark:bg-amber-900/30 cursor-pointer"
                    onClick={() => {
                      setStatusFilter('low')
                      setActiveTab('All')
                      setCategorySelect('All')
                      setCurrentPage(1)
                    }}
                  >
                    +{lowStockItems.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
          <button
            onClick={() => setShowAlert(false)}
            className="absolute top-3 right-3 rounded-sm p-1 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity touch-manipulation"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Alert>
      )}

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Category Quick-Select Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_CHIPS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleTabChange(cat)}
                  className={cn(
                    'flex-shrink-0 min-w-[44px] min-h-[44px] px-3 rounded-full text-sm font-medium transition-colors touch-manipulation',
                    activeTab === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(opt.value)}
                  className={cn(
                    'flex-shrink-0 min-w-[44px] min-h-[44px] px-3 rounded-full text-sm font-medium transition-colors border touch-manipulation',
                    statusFilter === opt.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search, Sort & Category Dropdown Row */}
            <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or brand..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort dropdown */}
                <Select value={currentSortBy} onValueChange={handleSortByChange}>
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Category filter dropdown */}
                <Select value={categorySelect} onValueChange={handleCategorySelectChange}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="hover-lift">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-x-auto overflow-y-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <label className="flex min-w-[44px] min-h-[44px] items-center justify-center cursor-pointer touch-manipulation">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                      />
                    </label>
                  </TableHead>
                  <TableHead className="w-[110px]">SKU</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center hover:text-foreground transition-colors font-semibold text-muted-foreground min-h-[44px] touch-manipulation"
                      onClick={() => handleSort('name')}
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Brand</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="inline-flex items-center hover:text-foreground transition-colors font-semibold text-muted-foreground min-h-[44px] touch-manipulation"
                      onClick={() => handleSort('price')}
                    >
                      Price
                      <SortIcon field="price" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="inline-flex items-center hover:text-foreground transition-colors font-semibold text-muted-foreground min-h-[44px] touch-manipulation"
                      onClick={() => handleSort('stock')}
                    >
                      Stock
                      <SortIcon field="stock" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    <button
                      className="inline-flex items-center hover:text-foreground transition-colors font-semibold text-muted-foreground min-h-[44px] touch-manipulation"
                      onClick={() => handleSort('minStock')}
                    >
                      Min Stock
                      <SortIcon field="minStock" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                  <TableHead className="hidden xl:table-cell">Last Restocked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLSPAN}>{renderSkeleton()}</TableCell>
                  </TableRow>
                ) : displayProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLSPAN} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-40" />
                        <p>No products found.</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={openCreateDialog}
                          className="min-h-[44px] touch-manipulation"
                        >
                          Add your first product
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayProducts.map((product) => (
                    <TableRow key={product.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                      {/* Checkbox */}
                      <TableCell>
                        <label className="flex min-w-[44px] min-h-[44px] items-center justify-center cursor-pointer touch-manipulation">
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelectOne(product.id)}
                          />
                        </label>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product.sku}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        {product.name}
                        {product.category === 'Frames' && (product.frameWidth || product.bridge || product.temple) && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {product.frameWidth}×{product.bridge}×{product.temple} mm
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {product.brand || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1.5">
                            {isLowStock(product) && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                              </span>
                            )}
                            <span
                              className={
                                isLowStock(product)
                                  ? 'text-red-600 dark:text-red-400 font-semibold'
                                  : 'text-emerald-600 dark:text-emerald-400 font-medium'
                              }
                            >
                              {product.stock}
                            </span>
                          </span>
                          {/* Stock Level Visual Indicator */}
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                getStockBarColor(product),
                              )}
                              style={{ width: `${getStockBarPercentage(product)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                        {product.minStock}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {product.supplier || '—'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">
                        {formatDate(product.lastRestocked)}
                      </TableCell>
                      <TableCell>{getStatusBadge(product)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                            onClick={() => openAdjustDialog(product)}
                            aria-label={`Adjust stock for ${product.name}`}
                            title="Quick Stock Adjust"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation"
                            onClick={() => openCloneDialog(product)}
                            aria-label={`Clone ${product.name}`}
                            title="Clone Product"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation"
                            onClick={() => openEditDialog(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {renderPagination()}
        </CardContent>
      </Card>

      {/* ─── Floating Action Button (mobile) ──────────────────────────────── */}
      <button
        type="button"
        onClick={openCreateDialog}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all min-w-[56px] min-h-[56px] md:hidden touch-manipulation"
        aria-label="Add Product"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── Bulk Actions Bar ─────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.1)] md:bottom-auto md:relative md:border md:rounded-lg md:shadow-none md:bg-card md:backdrop-blur-none md:shadow-none md:mb-0">
          <div className="flex items-center justify-between px-4 py-3 gap-3 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="shrink-0">
                {selectedIds.size} selected
              </Badge>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {selectedIds.size === 1
                  ? products.find((p) => selectedIds.has(p.id))?.name
                  : `${selectedIds.size} products selected`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] gap-1.5 touch-manipulation"
                onClick={handleExportSelected}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] gap-1.5 touch-manipulation"
                onClick={() => {
                  setBulkPrice('')
                  setUpdatePricesOpen(true)
                }}
              >
                <IndianRupee className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Update Prices</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-w-[44px] min-h-[44px] gap-1.5 touch-manipulation"
                onClick={() => setBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="min-w-[44px] min-h-[44px] touch-manipulation"
                onClick={() => setSelectedIds(new Set())}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Product Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(false)
          setEditingProduct(null)
          setForm(emptyForm)
        } else {
          setDialogOpen(true)
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details below.'
                : 'Fill in the details to add a new product to inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1 py-2">
            {/* ─── Section 1: Basic Information (always open) ─── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation"
                onClick={() => setSectionOpen((s) => ({ ...s, basic: !s.basic }))}
              >
                <span>Basic Information</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionOpen.basic ? '' : '-rotate-90'}`} />
              </button>
              {sectionOpen.basic && (
                <div className="px-4 pb-4 grid gap-4">
                  {/* Row: Name, Brand */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="product-name"
                        placeholder="e.g. Aviator Classic"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Popover open={brandComboboxOpen} onOpenChange={setBrandComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={brandComboboxOpen}
                            className="w-full justify-between font-normal h-9 min-h-[44px] touch-manipulation"
                          >
                            {form.brand || 'Select or type a brand…'}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search brands…"
                              value={form.brand}
                              onValueChange={(val) => updateField('brand', val)}
                            />
                            <CommandList>
                              <CommandEmpty>No brands found.</CommandEmpty>
                              <CommandGroup>
                                {uniqueBrands
                                  .filter((b) => !form.brand.trim() || b.toLowerCase().includes(form.brand.toLowerCase()))
                                  .map((brand) => (
                                    <CommandItem
                                      key={brand}
                                      value={brand}
                                      onSelect={() => {
                                        updateField('brand', brand)
                                        setBrandComboboxOpen(false)
                                      }}
                                    >
                                      {brand}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {/* Row: SKU, Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-sku">
                        SKU <span className="text-destructive">*</span>
                        <span className="text-muted-foreground text-xs font-normal ml-2">
                          Auto-generated if left empty
                        </span>
                      </Label>
                      <Input
                        id="product-sku"
                        placeholder="e.g. SKO-FRA-XXXXX"
                        value={form.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-category">
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.category}
                        onValueChange={(val) => updateField('category', val)}
                      >
                        <SelectTrigger id="product-category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Section 2: Pricing & Stock (always open) ─── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation"
                onClick={() => setSectionOpen((s) => ({ ...s, pricing: !s.pricing }))}
              >
                <span>Pricing & Stock</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionOpen.pricing ? '' : '-rotate-90'}`} />
              </button>
              {sectionOpen.pricing && (
                <div className="px-4 pb-4 grid gap-4">
                  {/* Row: Price, Cost Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-price">
                        <IndianRupee className="h-3.5 w-3.5" />
                        Price <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="product-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => updateField('price', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-cost-price"><IndianRupee className="h-3.5 w-3.5 mr-1 inline" />Cost Price</Label>
                      <Input
                        id="product-cost-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.costPrice}
                        onChange={(e) => updateField('costPrice', e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Row: Stock, Min Stock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-stock">
                        Stock <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.stock}
                        onChange={(e) => updateField('stock', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-min-stock">Min Stock Level</Label>
                      <Input
                        id="product-min-stock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.minStock}
                        onChange={(e) => updateField('minStock', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Section 3: Frame Details (collapsed by default) ─── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation"
                onClick={() => setSectionOpen((s) => ({ ...s, frame: !s.frame }))}
              >
                <span>Frame Details</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionOpen.frame ? '' : '-rotate-90'}`} />
              </button>
              {sectionOpen.frame && (
                <div className="px-4 pb-4 grid gap-4">
                  {/* Row: Frame Width, Bridge, Temple */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="product-frame-width">Frame Width (mm)</Label>
                      <Input
                        id="product-frame-width"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 140"
                        value={form.frameWidth}
                        onChange={(e) => updateField('frameWidth', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-bridge">Bridge (mm)</Label>
                      <Input
                        id="product-bridge"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 18"
                        value={form.bridge}
                        onChange={(e) => updateField('bridge', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-temple">Temple Length (mm)</Label>
                      <Input
                        id="product-temple"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 145"
                        value={form.temple}
                        onChange={(e) => updateField('temple', e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Row: Size, Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-size">Size</Label>
                      <Input
                        id="product-size"
                        placeholder="e.g. 58-14-135"
                        value={form.size}
                        onChange={(e) => updateField('size', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">(e.g., 52-18-140)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-color">Color</Label>
                      <Input
                        id="product-color"
                        placeholder="e.g. Gold/Green"
                        value={form.color}
                        onChange={(e) => updateField('color', e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors min-h-[36px] min-w-[44px] touch-manipulation ${
                              form.color === preset
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => updateField('color', preset)}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Section 4: Additional Details (collapsed by default) ─── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation"
                onClick={() => setSectionOpen((s) => ({ ...s, additional: !s.additional }))}
              >
                <span>Additional Details</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionOpen.additional ? '' : '-rotate-90'}`} />
              </button>
              {sectionOpen.additional && (
                <div className="px-4 pb-4 grid gap-4">
                  {/* Row: Model */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-model">Model</Label>
                      <Input
                        id="product-model"
                        placeholder="e.g. RB3025"
                        value={form.model}
                        onChange={(e) => updateField('model', e.target.value)}
                      />
                    </div>
                    {/* Lens Type (for Lenses) */}
                    {showTypeField ? (
                      <div className="space-y-2">
                        <Label htmlFor="product-type">Lens Type</Label>
                        <Select
                          value={form.type}
                          onValueChange={(val) => updateField('type', val)}
                        >
                          <SelectTrigger id="product-type" className="w-full">
                            <SelectValue placeholder="Select lens type" />
                          </SelectTrigger>
                          <SelectContent>
                            {LENS_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : showDurationField ? (
                      <div className="space-y-2">
                        <Label htmlFor="product-duration">Duration</Label>
                        <Select
                          value={form.duration}
                          onValueChange={(val) => updateField('duration', val)}
                        >
                          <SelectTrigger id="product-duration" className="w-full">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  {/* Expiry Date (conditional) */}
                  {showExpiryField && (
                    <div className="space-y-2">
                      <Label htmlFor="product-expiry">Expiry Date</Label>
                      <Input
                        id="product-expiry"
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => updateField('expiryDate', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea
                      id="product-description"
                      placeholder="Optional product description..."
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Row: Supplier & Supplier Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-supplier">Supplier</Label>
                      <Input
                        id="product-supplier"
                        placeholder="e.g. Ray-Ban India"
                        value={form.supplier}
                        onChange={(e) => updateField('supplier', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-supplier-phone">Supplier Phone</Label>
                      <Input
                        id="product-supplier-phone"
                        placeholder="e.g. +91 98765 43210"
                        value={form.supplierPhone}
                        onChange={(e) => updateField('supplierPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setEditingProduct(null)
                setForm(emptyForm)
              }}
              disabled={submitting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !form.name.trim() ||
                !form.category ||
                !form.price.trim() ||
                !form.stock.trim()
              }
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingProduct?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingProduct(null)
              }}
              disabled={deleting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk CSV Import Dialog ───────────────────────────────────────── */}
      <Dialog open={csvDialogOpen} onOpenChange={(open) => {
        setCsvDialogOpen(open)
        if (!open) {
          setCsvData('')
          setImportResult(null)
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Import CSV
              </span>
            </DialogTitle>
            <DialogDescription>
              Paste your CSV data below to import products in bulk. The first row must be the header.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sample format hint */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Sample CSV Format
              </p>
              <pre className="text-xs text-foreground/80 overflow-x-auto whitespace-pre">
                {CSV_SAMPLE}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Required columns: name, category, price. Optional: brand, model, stock, min_stock, supplier, supplier_phone, cost_price, sku, color, size, type, duration.
              </p>
            </div>

            {/* CSV textarea */}
            <div className="space-y-2">
              <Label htmlFor="csv-data">
                CSV Data <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="csv-data"
                placeholder="Paste your CSV data here, including the header row..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            </div>

            {/* Import results */}
            {importResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Import Results</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span><strong>{importResult.created}</strong> created</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span><strong>{importResult.skipped}</strong> skipped</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span><strong>{importResult.errors.length}</strong> errors</span>
                    </div>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCsvDialogOpen(false)
                setCsvData('')
                setImportResult(null)
              }}
              disabled={importing}
              className="min-h-[44px] touch-manipulation"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2 min-h-[44px] touch-manipulation"
            >
              <Upload className="h-4 w-4" />
              Upload .csv File
            </Button>
            <Button
              onClick={handleCsvImport}
              disabled={importing || !csvData.trim()}
              className="min-h-[44px] touch-manipulation"
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Products
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  setCsvData(text)
                  toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
                } catch {
                  toast.error('Failed to read file')
                }
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Low-Stock Report Dialog ──────────────────────────────────────── */}
      <Dialog open={reportDialogOpen} onOpenChange={(open) => {
        setReportDialogOpen(open)
        if (!open) {
          setReportData(null)
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                Low Stock Report
              </span>
            </DialogTitle>
            <DialogDescription>
              Overview of all products that need reordering.
            </DialogDescription>
          </DialogHeader>

          {reportLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reportData ? (
            <div className="space-y-6 py-2">
              {/* Summary cards */}
              {/* Reorder urgency bar */}
              {reportData.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Reorder Urgency</span>
                    <span className="font-medium">{Math.min(100, Math.round((reportData.total / Math.max(1, total)) * 100))}% of inventory needs reorder</span>
                  </div>
                  <Progress value={Math.min(100, (reportData.total / Math.max(1, total)) * 100)} className="h-2" />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="hover-lift">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Low-Stock Items</p>
                    <p className="text-3xl font-bold mt-1">{reportData.total}</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Categories Affected</p>
                    <p className="text-3xl font-bold mt-1">{Object.keys(reportData.byCategory).length}</p>
                  </CardContent>
                </Card>
                <Card className="hover-lift">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Reorder Value</p>
                    <p className="text-3xl font-bold mt-1 flex items-center gap-1">
                      <IndianRupee className="h-5 w-5" />
                      {reportData.totalReorderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* By-category breakdown */}
              <div>
                <h3 className="text-sm font-semibold mb-2">By Category</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(reportData.byCategory).map(([category, count]) => (
                    <Badge key={category} variant="secondary" className="text-sm px-3 py-1">
                      {category}: <strong className="ml-1">{count}</strong>
                    </Badge>
                  ))}
                  {Object.keys(reportData.byCategory).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center w-full">
                      <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm text-muted-foreground">No categories affected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              {reportData.items.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Items Needing Reorder</h3>
                  <div className="max-h-[400px] overflow-x-auto overflow-y-auto rounded-lg border -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Category</TableHead>
                          <TableHead className="hidden md:table-cell">Brand</TableHead>
                          <TableHead className="text-right">Stock / Min</TableHead>
                          <TableHead className="text-right">Needed</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Reorder Cost</TableHead>
                          <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                          <TableHead className="hidden lg:table-cell">Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.items.map((item) => (
                          <TableRow key={item.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {item.brand || '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                {item.stock}
                              </span>
                              <span className="text-muted-foreground"> / {item.minStock}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.needed}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right font-medium">
                              {formatINR(item.reorderCost)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {item.supplier || '—'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                              {item.supplierPhone || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No items are currently below minimum stock levels.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Failed to load report.</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogOpen(false)
                setReportData(null)
              }}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Quick Stock Adjust Dialog ────────────────────────────────── */}
      <Dialog open={!!adjustProduct} onOpenChange={(open) => { if (!open) setAdjustProduct(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Stock Adjust</DialogTitle>
            <DialogDescription>
              {adjustProduct && (
                <span className="font-medium">{adjustProduct.name}</span>
              )}
              {' '}— Current stock: <span className="font-mono font-semibold">{adjustProduct?.stock ?? 0}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-10 w-10 text-lg min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => setAdjustQty(q => q - 1)} disabled={adjustQty <= -99}>
                −
              </Button>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                className="text-center text-xl font-mono h-10"
              />
              <Button variant="outline" size="icon" className="h-10 w-10 text-lg min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => setAdjustQty(q => q + 1)} disabled={adjustQty >= 999}>
                +
              </Button>
            </div>
            {adjustProduct && adjustQty !== 0 && (
              <p className="text-sm text-center">
                New stock: <span className="font-mono font-bold text-lg">{Math.max(0, (adjustProduct.stock ?? 0) + adjustQty)}</span>
                {adjustProduct.minStock > 0 && Math.max(0, (adjustProduct.stock ?? 0) + adjustQty) < adjustProduct.minStock && (
                  <span className="ml-2 text-red-600 dark:text-red-400">(below min: {adjustProduct.minStock})</span>
                )}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdjustQty(Math.max(0, -(adjustProduct?.stock ?? 0)))} className="flex-1 min-h-[44px] touch-manipulation">
                Set to 0
              </Button>
              <Button variant="outline" size="sm" onClick={() => { if (adjustProduct) setAdjustQty(adjustProduct.minStock - (adjustProduct.stock ?? 0)) }} className="flex-1 min-h-[44px] touch-manipulation">
                Set to Min ({adjustProduct?.minStock ?? 0})
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustProduct(null)} className="min-h-[44px] min-w-[44px] touch-manipulation">Cancel</Button>
            <Button onClick={handleStockAdjust} disabled={adjusting || !adjustProduct || adjustQty === 0} className="min-h-[44px] min-w-[44px] touch-manipulation gap-2">
              {adjusting && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Update Prices Dialog ────────────────────────────────── */}
      <Dialog open={updatePricesOpen} onOpenChange={(open) => {
        setUpdatePricesOpen(open)
        if (!open) setBulkPrice('')
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Prices</DialogTitle>
            <DialogDescription>
              Set a new selling price for all {selectedIds.size} selected product(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-price">
                <IndianRupee className="h-3.5 w-3.5" />
                New Price
              </Label>
              <Input
                id="bulk-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="text-lg font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdatePricesOpen(false)
                setBulkPrice('')
              }}
              disabled={bulkUpdating}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdatePrices}
              disabled={bulkUpdating || !bulkPrice.trim() || isNaN(Number(bulkPrice)) || Number(bulkPrice) < 0}
              className="min-h-[44px] min-w-[44px] touch-manipulation gap-2"
            >
              {bulkUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              Update {selectedIds.size} Price(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Delete Confirmation Dialog ──────────────────────────── */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Products</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {selectedIds.size} product(s)
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteConfirm(false)}
              disabled={bulkDeleting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              {bulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedIds.size} Product(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}