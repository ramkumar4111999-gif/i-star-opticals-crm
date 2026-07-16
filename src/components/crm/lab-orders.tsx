'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import {
  Plus,
  Search,
  ChevronRight,
  Loader2,
  Eye,
  FlaskConical,
  CalendarDays,
  IndianRupee,
  User,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ClipboardCheck,
  LayoutGrid,
  LayoutList,
  Inbox,
  Copy,
  Ruler,
  History,
  X,
  AlertTriangle,
  Phone,
  MessageSquare,
  Minus,
  Plus as PlusIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type LabOrderStatus = 'Received' | 'Pending' | 'In Lab' | 'Ready' | 'Delivered' | 'Sent' | 'In Progress'

interface LensPower {
  sph: string
  cyl: string
  axis: string
  pd: string
}

interface CustomerOption {
  id: string
  name: string
  phone: string
  lastPrescription: {
    leftSPH: number | null
    leftCYL: number | null
    leftAXIS: number | null
    rightSPH: number | null
    rightCYL: number | null
    rightAXIS: number | null
    date: string
  } | null
}

interface FrameOption {
  id: string
  name: string
  brand: string | null
  price: number
  frameWidth: number | null
  bridge: number | null
  temple: number | null
}

interface PrescriptionRecord {
  id: string
  date: string
  leftSPH: number | null
  leftCYL: number | null
  leftAXIS: number | null
  leftPD: number | null
  rightSPH: number | null
  rightCYL: number | null
  rightAXIS: number | null
  rightPD: number | null
  notes: string | null
}

interface LabOrder {
  id: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  lensType: string
  leftSPH: number | null
  leftCYL: number | null
  leftAXIS: number | null
  leftPD: number | null
  rightSPH: number | null
  rightCYL: number | null
  rightAXIS: number | null
  rightPD: number | null
  frameId: string | null
  frameName: string | null
  status: LabOrderStatus
  costPrice: number
  sellingPrice: number
  dueDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FLOW: LabOrderStatus[] = ['Received', 'Pending', 'In Lab', 'Ready', 'Delivered']

const STATUS_BADGE_CLASS: Record<string, string> = {
  Received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  Pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  'In Lab': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Delivered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
}

const STATUS_ICON: Record<string, typeof Clock> = {
  Received: Inbox,
  Pending: Clock,
  'In Lab': FlaskConical,
  'In Progress': FlaskConical,
  Ready: CheckCircle2,
  Sent: Truck,
  Delivered: Truck,
}

const STATUS_COLOR: Record<string, string> = {
  Received: 'border-indigo-300 dark:border-indigo-800',
  Pending: 'border-slate-300 dark:border-slate-700',
  'In Lab': 'border-amber-300 dark:border-amber-800',
  Ready: 'border-emerald-300 dark:border-emerald-800',
  Delivered: 'border-blue-300 dark:border-blue-800',
}

const LENS_TYPES = [
  'Single Vision',
  'Bifocal',
  'Progressive',
  'Blue-cut',
  'Photochromic',
] as const

function formatPower(sph: number | null, cyl: number | null, axis: number | null): string {
  const parts: string[] = []
  if (sph !== null && sph !== undefined) parts.push(`${sph > 0 ? '+' : ''}${sph}`)
  else parts.push('--')
  if (cyl !== null && cyl !== undefined && cyl !== 0) parts.push(`${cyl > 0 ? '+' : ''}${cyl}`)
  else parts.push('--')
  if (axis !== null && axis !== undefined) parts.push(`x${axis}`)
  return parts.join(' / ')
}

function formatCurrency(value: number): string {
  return `${'\u20B9'}${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function getNextStatus(current: LabOrderStatus): LabOrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

function getDaysInStatus(order: LabOrder): number {
  return differenceInDays(new Date(), new Date(order.updatedAt))
}

function getDaysUntilDue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LabOrders() {
  // State
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [formLensType, setFormLensType] = useState<string>('Single Vision')
  const [formLeft, setFormLeft] = useState<LensPower>({ sph: '', cyl: '', axis: '', pd: '' })
  const [formRight, setFormRight] = useState<LensPower>({ sph: '', cyl: '', axis: '', pd: '' })
  const [formCostPrice, setFormCostPrice] = useState('')
  const [formSellingPrice, setFormSellingPrice] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formFrameId, setFormFrameId] = useState('')

  // Search
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)

  const [frameSearch, setFrameSearch] = useState('')
  const [frameResults, setFrameResults] = useState<FrameOption[]>([])
  const [frameSearching, setFrameSearching] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<FrameOption | null>(null)

  // Prescription auto-fill
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [loadingRx, setLoadingRx] = useState(false)

  const customerSearchRef = useRef<HTMLDivElement>(null)
  const frameSearchRef = useRef<HTMLDivElement>(null)

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeStatus !== 'all') params.set('status', activeStatus)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      params.set('page', String(page))
      const res = await fetch(`/api/lab-orders?${params}`)
      if (!res.ok) throw new Error('Failed to fetch lab orders')
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch {
      toast.error('Failed to load lab orders')
    } finally {
      setLoading(false)
    }
  }, [activeStatus, page, searchQuery])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { setPage(1) }, [activeStatus])
  useEffect(() => { setPage(1) }, [searchQuery])

  // Customer search
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 1) { setCustomerResults([]); return }
    setCustomerSearching(true)
    try {
      const res = await fetch(`/api/lab-orders?searchType=customers&q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCustomerResults(data.results ?? [])
    } catch { setCustomerResults([]) }
    finally { setCustomerSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  // Frame search
  const searchFrames = useCallback(async (query: string) => {
    if (query.length < 1) { setFrameResults([]); return }
    setFrameSearching(true)
    try {
      const res = await fetch(`/api/lab-orders?searchType=frames&q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFrameResults(data.results ?? [])
    } catch { setFrameResults([]) }
    finally { setFrameSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchFrames(frameSearch), 300)
    return () => clearTimeout(timer)
  }, [frameSearch, searchFrames])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) setCustomerResults([])
      if (frameSearchRef.current && !frameSearchRef.current.contains(e.target as Node)) setFrameResults([])
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch prescription history when customer is selected
  const fetchPrescriptions = useCallback(async (customerId: string) => {
    setLoadingRx(true)
    try {
      const res = await fetch(`/api/prescriptions?customerId=${customerId}`)
      if (!res.ok) return
      const data = await res.json()
      setPrescriptions(data.prescriptions ?? [])
    } catch { setPrescriptions([]) }
    finally { setLoadingRx(false) }
  }, [])

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer)
    setFormCustomerId(customer.id)
    setCustomerSearch('')
    setCustomerResults([])
    fetchPrescriptions(customer.id)
    // Instant auto-fill from last prescription embedded in search results
    if (customer.lastPrescription) {
      setFormLeft({
        sph: customer.lastPrescription.leftSPH != null ? String(customer.lastPrescription.leftSPH) : '',
        cyl: customer.lastPrescription.leftCYL != null ? String(customer.lastPrescription.leftCYL) : '',
        axis: customer.lastPrescription.leftAXIS != null ? String(customer.lastPrescription.leftAXIS) : '',
        pd: '',
      })
      setFormRight({
        sph: customer.lastPrescription.rightSPH != null ? String(customer.lastPrescription.rightSPH) : '',
        cyl: customer.lastPrescription.rightCYL != null ? String(customer.lastPrescription.rightCYL) : '',
        axis: customer.lastPrescription.rightAXIS != null ? String(customer.lastPrescription.rightAXIS) : '',
        pd: '',
      })
    }
  }

  const handleAutoFillRx = (rx: PrescriptionRecord) => {
    setFormLeft({
      sph: rx.leftSPH != null ? String(rx.leftSPH) : '',
      cyl: rx.leftCYL != null ? String(rx.leftCYL) : '',
      axis: rx.leftAXIS != null ? String(rx.leftAXIS) : '',
      pd: rx.leftPD != null ? String(rx.leftPD) : '',
    })
    setFormRight({
      sph: rx.rightSPH != null ? String(rx.rightSPH) : '',
      cyl: rx.rightCYL != null ? String(rx.rightCYL) : '',
      axis: rx.rightAXIS != null ? String(rx.rightAXIS) : '',
      pd: rx.rightPD != null ? String(rx.rightPD) : '',
    })
    toast.success('Prescription auto-filled from history')
  }

  // Sorted orders
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [orders])

  // Reset form
  const resetForm = useCallback(() => {
    setFormLensType('Single Vision')
    setFormLeft({ sph: '', cyl: '', axis: '', pd: '' })
    setFormRight({ sph: '', cyl: '', axis: '', pd: '' })
    setFormCostPrice('')
    setFormSellingPrice('')
    setFormDueDate('')
    setFormNotes('')
    setFormCustomerId('')
    setFormFrameId('')
    setCustomerSearch('')
    setFrameSearch('')
    setSelectedCustomer(null)
    setSelectedFrame(null)
    setCustomerResults([])
    setFrameResults([])
    setPrescriptions([])
  }, [])

  // Submit
  const handleSubmit = async () => {
    if (!formCustomerId) { toast.error('Please select a customer'); return }
    if (!formCostPrice || Number(formCostPrice) < 0) { toast.error('Please enter a valid cost price'); return }
    if (!formSellingPrice || Number(formSellingPrice) < 0) { toast.error('Please enter a valid selling price'); return }

    setSubmitting(true)
    try {
      const payload = {
        customerId: formCustomerId,
        lensType: formLensType,
        leftSPH: formLeft.sph ? parseFloat(formLeft.sph) : null,
        leftCYL: formLeft.cyl ? parseFloat(formLeft.cyl) : null,
        leftAXIS: formLeft.axis ? parseFloat(formLeft.axis) : null,
        leftPD: formLeft.pd ? parseFloat(formLeft.pd) : null,
        rightSPH: formRight.sph ? parseFloat(formRight.sph) : null,
        rightCYL: formRight.cyl ? parseFloat(formRight.cyl) : null,
        rightAXIS: formRight.axis ? parseFloat(formRight.axis) : null,
        rightPD: formRight.pd ? parseFloat(formRight.pd) : null,
        frameId: formFrameId || null,
        costPrice: parseFloat(formCostPrice),
        sellingPrice: parseFloat(formSellingPrice),
        dueDate: formDueDate || null,
        notes: formNotes || null,
      }

      const res = await fetch('/api/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create lab order')
      }

      toast.success('Lab order created successfully')
      setDialogOpen(false)
      resetForm()
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lab order')
    } finally {
      setSubmitting(false)
    }
  }

  // Update status
  const handleUpdateStatus = async (order: LabOrder, targetStatus?: LabOrderStatus) => {
    const next = targetStatus || getNextStatus(order.status)
    if (!next) return

    setUpdatingId(order.id)
    try {
      const res = await fetch(`/api/lab-orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error('Failed to update status')

      if (next === 'Delivered') toast.success(`Order ${order.id.slice(-6).toUpperCase()} delivered!`)
      else if (next === 'Ready') toast.success(`Order ${order.id.slice(-6).toUpperCase()} ready for pickup!`)
      else toast.success(`Status updated to "${next}"`)
      fetchOrders()
    } catch { toast.error('Failed to update order status') }
    finally { setUpdatingId(null) }
  }

  const handleMarkReady = async (order: LabOrder) => {
    if (order.status === 'Ready' || order.status === 'Delivered') return
    await handleUpdateStatus(order, 'Ready')
  }

  // Tab counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1
    return counts
  }, [orders])

  // Summary stats
  const summaryStats = useMemo(() => {
    const received = orders.filter(o => o.status === 'Received').length
    const pending = orders.filter(o => o.status === 'Pending').length
    const inLab = orders.filter(o => o.status === 'In Lab').length
    const ready = orders.filter(o => o.status === 'Ready').length
    const overdue = orders.filter(o =>
      o.dueDate && new Date(o.dueDate) < new Date() && o.status !== 'Delivered'
    ).length
    return { received, pending, inLab, ready, overdue, total: orders.length }
  }, [orders])

  // Power stepper helper
  const stepValue = (current: string, step: number, min?: number, max?: number): string => {
    if (current === '') return step > 0 ? String(step) : ''
    const val = parseFloat(current)
    if (isNaN(val)) return String(step)
    let next = parseFloat((val + step).toFixed(2))
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    return String(next)
  }

  // Power input group with stepper buttons
  const renderPowerInputs = (label: string, power: LensPower, onChange: (p: LensPower) => void) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">SPH</Label>
          <div className="flex items-center gap-0.5">
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-l-md border border-r-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, sph: stepValue(power.sph, -0.25) })}><Minus className="h-3 w-3" /></button>
            <Input type="number" step="0.25" placeholder="0.00" value={power.sph} onChange={(e) => onChange({ ...power, sph: e.target.value })} className="h-9 text-sm rounded-none text-center" />
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-r-md border border-l-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, sph: stepValue(power.sph, 0.25) })}><PlusIcon className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">CYL</Label>
          <div className="flex items-center gap-0.5">
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-l-md border border-r-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, cyl: stepValue(power.cyl, -0.25) })}><Minus className="h-3 w-3" /></button>
            <Input type="number" step="0.25" placeholder="0.00" value={power.cyl} onChange={(e) => onChange({ ...power, cyl: e.target.value })} className="h-9 text-sm rounded-none text-center" />
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-r-md border border-l-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, cyl: stepValue(power.cyl, 0.25) })}><PlusIcon className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">AXIS</Label>
          <div className="flex items-center gap-0.5">
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-l-md border border-r-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, axis: stepValue(power.axis, -1, 0, 180) })}><Minus className="h-3 w-3" /></button>
            <Input type="number" step="1" min="0" max="180" placeholder="0" value={power.axis} onChange={(e) => onChange({ ...power, axis: e.target.value })} className="h-9 text-sm rounded-none text-center" />
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-r-md border border-l-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, axis: stepValue(power.axis, 1, 0, 180) })}><PlusIcon className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">PD</Label>
          <div className="flex items-center gap-0.5">
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-l-md border border-r-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, pd: stepValue(power.pd, -0.5, 0) })}><Minus className="h-3 w-3" /></button>
            <Input type="number" step="0.5" placeholder="mm" value={power.pd} onChange={(e) => onChange({ ...power, pd: e.target.value })} className="h-9 text-sm rounded-none text-center" />
            <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-r-md border border-l-0 bg-muted/50 hover:bg-accent transition-colors text-muted-foreground touch-manipulation" onClick={() => onChange({ ...power, pd: stepValue(power.pd, 0.5, 0) })}><PlusIcon className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </div>
  )

  // Kanban card component
  const renderKanbanCard = (order: LabOrder) => {
    const margin = order.sellingPrice - order.costPrice
    const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'Delivered'
    const next = getNextStatus(order.status)
    const StatusIcon = STATUS_ICON[order.status] || Clock

    return (
      <div
        key={order.id}
        className={cn(
          'rounded-xl border p-3 bg-card space-y-2 hover:shadow-md hover-lift transition-shadow cursor-pointer',
          STATUS_COLOR[order.status]
        )}
        onClick={() => { setSelectedOrder(order); setDetailOpen(true) }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</span>
          <Badge variant="outline" className={cn('text-[10px] gap-1 rounded-full', STATUS_BADGE_CLASS[order.status])}>
            <StatusIcon className="h-2.5 w-2.5" />
            {order.status}
          </Badge>
        </div>
        <div>
          <p className="font-medium text-sm">{order.customerName || 'Unknown'}</p>
          {order.customerPhone && <p className="text-xs text-muted-foreground">{order.customerPhone}</p>}
        </div>
        <div className="flex items-center justify-between text-xs">
          <Badge variant="outline" className="text-[10px] rounded-full">{order.lensType}</Badge>
          <span className="font-medium">{formatCurrency(order.sellingPrice)}</span>
        </div>
        {order.dueDate && (
          <div className={cn('text-[10px]', isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
            {isOverdue ? 'Overdue' : `Due in ${getDaysUntilDue(order.dueDate)}d`} &middot; {format(new Date(order.dueDate), 'dd MMM')}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">
          {getDaysInStatus(order)}d in {order.status}
        </div>
        {next && (
          <Button
            size="sm"
            variant="outline"
            className="w-full min-h-[44px] text-xs gap-1 mt-1 touch-manipulation"
            disabled={updatingId === order.id}
            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order) }}
          >
            {updatingId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>{next} <ChevronRight className="h-3 w-3" /></>}
          </Button>
        )}
      </div>
    )
  }

  // Chip filter config
  const statusChips = [
    { value: 'all', label: 'All' },
    { value: 'Received', label: 'Received' },
    { value: 'Pending', label: 'Pending' },
    { value: 'In Lab', label: 'In Lab' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Sent', label: 'Sent' },
  ] as const

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Lab Orders
              {summaryStats.ready > 0 && (
                <Badge className="bg-emerald-600 text-white border-transparent text-xs rounded-full">{summaryStats.ready} Ready</Badge>
              )}
              {summaryStats.overdue > 0 && (
                <Badge variant="destructive" className="text-xs rounded-full">{summaryStats.overdue} Overdue</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Track lens orders: Received &rarr; Pending &rarr; In Lab &rarr; Ready &rarr; Delivered
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5 min-h-[44px] touch-manipulation"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5 min-h-[44px] touch-manipulation"
              onClick={() => setViewMode('timeline')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) resetForm(); setDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button className="gap-2 min-h-[44px] touch-manipulation"><Plus className="h-4 w-4" />New Lab Order</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Lab Order</DialogTitle>
                <DialogDescription>Enter the lens prescription details and submit to the lab.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-2">
                {/* Customer Selection */}
                <div className="space-y-2" ref={customerSearchRef}>
                  <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" />Customer <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    {selectedCustomer ? (
                      <div className="flex items-center h-9 w-full rounded-md border bg-muted/30 pl-3 pr-1 gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{selectedCustomer.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{selectedCustomer.phone}</span>
                        </div>
                        <button
                          type="button"
                          className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation"
                          onClick={() => { setSelectedCustomer(null); setFormCustomerId(''); setCustomerSearch(''); }}
                          title="Clear customer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Input
                          placeholder="Search by name or phone..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-9"
                        />
                        {customerSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                      </>
                    )}
                    {customerResults.length > 0 && !selectedCustomer && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button key={c.id} type="button" className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left min-h-[44px] touch-manipulation" onClick={() => handleSelectCustomer(c)}>
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{c.phone}</span>
                            {c.lastPrescription && (
                              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0 rounded-full">
                                <History className="h-2.5 w-2.5 mr-0.5" />Rx
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Prescription Auto-fill */}
                {selectedCustomer && prescriptions.length > 0 && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        <Copy className="h-3.5 w-3.5" />
                        Previous Prescriptions ({prescriptions.length})
                      </Label>
                      {loadingRx && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prescriptions.slice(0, 3).map((rx) => (
                        <Button
                          key={rx.id}
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] text-xs gap-1 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 touch-manipulation"
                          onClick={() => handleAutoFillRx(rx)}
                        >
                          <Copy className="h-3 w-3" />
                          {format(new Date(rx.date), 'dd MMM yyyy')}
                          {rx.leftSPH != null && <span className="text-muted-foreground">L:{rx.leftSPH} R:{rx.rightSPH}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lens Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><FlaskConical className="h-3.5 w-3.5" />Lens Type <span className="text-destructive">*</span></Label>
                  <Select value={formLensType} onValueChange={setFormLensType}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select lens type" /></SelectTrigger>
                    <SelectContent>{LENS_TYPES.map((lt) => (<SelectItem key={lt} value={lt}>{lt}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                {/* Eye Power */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderPowerInputs('Left Eye (OD)', formLeft, setFormLeft)}
                  {renderPowerInputs('Right Eye (OS)', formRight, setFormRight)}
                </div>

                {/* Frame Selection */}
                <div className="space-y-2" ref={frameSearchRef}>
                  <Label className="flex items-center gap-2"><Package className="h-3.5 w-3.5" />Frame <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search frames by name or brand..."
                      value={selectedFrame ? `${selectedFrame.name}${selectedFrame.brand ? ` (${selectedFrame.brand})` : ''}${selectedFrame.frameWidth ? ` [${selectedFrame.frameWidth}/${selectedFrame.bridge}/${selectedFrame.temple}]` : ''}` : frameSearch}
                      onChange={(e) => { if (selectedFrame) { setSelectedFrame(null); setFormFrameId('') }; setFrameSearch(e.target.value) }}
                      className="pl-9"
                    />
                    {frameSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    {frameResults.length > 0 && !selectedFrame && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {frameResults.map((f) => (
                          <button key={f.id} type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left min-h-[44px] touch-manipulation" onClick={() => { setSelectedFrame(f); setFormFrameId(f.id); setFrameSearch(''); setFrameResults([]) }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate font-medium">{f.name}</span>
                              {f.brand && <span className="text-muted-foreground shrink-0">{f.brand}</span>}
                              {f.frameWidth && (
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  <Ruler className="h-3 w-3 inline mr-0.5" />{f.frameWidth}/{f.bridge}/{f.temple}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground shrink-0">{formatCurrency(f.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" />Cost Price <span className="text-destructive">*</span></Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" />Selling Price <span className="text-destructive">*</span></Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={formSellingPrice} onChange={(e) => setFormSellingPrice(e.target.value)} />
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />Expected Delivery Date</Label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full sm:w-auto" />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional notes or special instructions..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="resize-none" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-h-[44px] touch-manipulation">Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2 min-h-[44px] touch-manipulation">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: 'Received', count: summaryStats.received, icon: Inbox, color: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Pending', count: summaryStats.pending, icon: Clock, color: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400' },
          { label: 'In Lab', count: summaryStats.inLab, icon: FlaskConical, color: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Ready', count: summaryStats.ready, icon: CheckCircle2, color: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Overdue', count: summaryStats.overdue, icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', s.color)}>
              <s.icon className={cn('h-4 w-4', s.iconColor)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-none', s.label === 'Overdue' && s.count > 0 ? 'text-red-600 dark:text-red-400' : '')}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders by ID or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Pipeline Status Chips + Overdue Toggle */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => { setActiveStatus(chip.value); setPage(1) }}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                activeStatus === chip.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {chip.label} ({statusCounts[chip.value] ?? 0})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
              overdueOnly
                ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
            )}
          >
            ⚠️ Overdue Only
          </button>
        </div>
      </div>

      <Tabs value={activeStatus} onValueChange={setActiveStatus}>
        {statusChips.map((chip) => (
          <TabsContent key={chip.value} value={chip.value}>
            {viewMode === 'timeline' ? (
              /* ── Kanban/Timeline View ── */
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {(chip.value === 'all' ? STATUS_FLOW.slice(0, -1) : [chip.value as LabOrderStatus]).map((status) => {
                  const statusOrders = sortedOrders.filter((o) => o.status === status)
                  const StatusIcon = STATUS_ICON[status] || Clock
                  return (
                    <div key={status} className={cn('rounded-lg border-t-4 bg-muted/20 p-3 space-y-3', STATUS_COLOR[status])}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <span className="font-medium text-sm">{status}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px] rounded-full">{statusOrders.length}</Badge>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {statusOrders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                            <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground">No orders</p>
                          </div>
                        ) : (
                          statusOrders.map(renderKanbanCard)
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── Table View ── */
              <>
                <div className="mt-4 overflow-x-auto -mx-4 sm:mx-0">
                  <div className="rounded-lg border">
                  <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px]">Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="hidden md:table-cell">Lens Type</TableHead>
                          <TableHead className="hidden lg:table-cell">Left Power</TableHead>
                          <TableHead className="hidden lg:table-cell">Right Power</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Cost</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Selling</TableHead>
                          <TableHead className="hidden md:table-cell text-right">Margin</TableHead>
                          <TableHead className="hidden md:table-cell">Due Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={11} className="h-48 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Loading lab orders...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : sortedOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="h-48 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <FlaskConical className="h-10 w-10 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">No lab orders found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedOrders.map((order) => {
                            const margin = order.sellingPrice - order.costPrice
                            const next = getNextStatus(order.status)
                            const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'Delivered'
                            const StatusIcon = STATUS_ICON[order.status] || Clock
                            const canMarkReady = order.status !== 'Ready' && order.status !== 'Delivered'

                            return (
                              <TableRow key={order.id} className="group transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                                <TableCell className="font-mono text-xs font-medium">#{order.id.slice(-6).toUpperCase()}</TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm">{order.customerName || '--'}</div>
                                    {order.customerPhone && <div className="text-xs text-muted-foreground">{order.customerPhone}</div>}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="font-normal text-xs rounded-full">{order.lensType}</Badge></TableCell>
                                <TableCell className="hidden lg:table-cell font-mono text-xs">{formatPower(order.leftSPH, order.leftCYL, order.leftAXIS)}</TableCell>
                                <TableCell className="hidden lg:table-cell font-mono text-xs">{formatPower(order.rightSPH, order.rightCYL, order.rightAXIS)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className={cn('text-xs font-medium gap-1 w-fit rounded-full', STATUS_BADGE_CLASS[order.status])}>
                                      <StatusIcon className="h-3 w-3" />{order.status}
                                    </Badge>
                                    {/* Mini pipeline progress dots */}
                                    <div className="flex items-center gap-0.5">
                                      {STATUS_FLOW.map((s, idx) => (
                                        <div
                                          key={s}
                                          className={cn(
                                            'h-1.5 w-1.5 rounded-full',
                                            STATUS_FLOW.indexOf(order.status) >= idx ? 'bg-primary' : 'bg-muted-foreground/20'
                                          )}
                                        />
                                      ))}
                                      <span className="text-[9px] text-muted-foreground ml-1">{getDaysInStatus(order)}d</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-right text-sm">{formatCurrency(order.costPrice)}</TableCell>
                                <TableCell className="hidden sm:table-cell text-right text-sm font-medium">{formatCurrency(order.sellingPrice)}</TableCell>
                                <TableCell className={cn('hidden md:table-cell text-right text-sm font-medium', margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                  {margin >= 0 ? '+' : ''}{formatCurrency(margin)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {order.dueDate ? (
                                    <div className="flex flex-col">
                                      <span className={cn('text-sm', isOverdue && 'text-red-600 dark:text-red-400 font-medium')}>{format(new Date(order.dueDate), 'dd MMM yyyy')}</span>
                                      {!isOverdue && order.status !== 'Delivered' && <span className="text-[10px] text-muted-foreground">{getDaysUntilDue(order.dueDate)}d left</span>}
                                      {isOverdue && <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Overdue</span>}
                                    </div>
                                  ) : <span className="text-sm text-muted-foreground">--</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 opacity-70 group-hover:opacity-100 touch-manipulation" onClick={() => { setSelectedOrder(order); setDetailOpen(true) }} title="View details"><Eye className="h-4 w-4" /></Button>
                                    {canMarkReady && order.status !== 'Pending' && order.status !== 'Received' && (
                                      <Button variant="outline" size="sm" className="h-9 min-w-[44px] min-h-[44px] gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40 touch-manipulation" disabled={updatingId === order.id} onClick={() => handleMarkReady(order)}>
                                        {updatingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><ClipboardCheck className="h-3.5 w-3.5" />Ready</>}
                                      </Button>
                                    )}
                                    {next && (
                                      <Button variant="outline" size="sm" className="h-9 min-w-[44px] min-h-[44px] gap-1 text-xs touch-manipulation" disabled={updatingId === order.id} onClick={() => handleUpdateStatus(order)}>
                                        {updatingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{next}<ChevronRight className="h-3 w-3" /></>}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-w-[44px] min-h-[44px] touch-manipulation">Previous</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="min-w-[44px] min-h-[44px] touch-manipulation">Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" />Order #{selectedOrder?.id.slice(-6).toUpperCase()}</DialogTitle>
            <DialogDescription>Lab order details and prescription information</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Status Flow Progress */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Status Progress</h4>
                <div className="flex items-center gap-1 flex-wrap">
                  {STATUS_FLOW.map((status, idx) => {
                    const StatusIcon = STATUS_ICON[status] || Clock
                    const isActive = STATUS_FLOW.indexOf(selectedOrder.status) >= idx
                    const isCurrent = selectedOrder.status === status
                    return (
                      <React.Fragment key={status}>
                        {idx > 0 && <div className={cn('h-0.5 flex-1 min-w-4', isActive ? 'bg-primary' : 'bg-muted')} />}
                        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', isCurrent && STATUS_BADGE_CLASS[status], isActive && !isCurrent && 'text-primary', !isActive && 'text-muted-foreground')}>
                          <StatusIcon className={cn('h-3 w-3', isCurrent && 'text-current')} />
                          <span className="hidden sm:inline">{status}</span>
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Created {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                  {selectedOrder.dueDate && (
                    <span className={cn(new Date(selectedOrder.dueDate) < new Date() && selectedOrder.status !== 'Delivered' && 'text-red-600 dark:text-red-400 font-medium')}>
                      {' '} &middot; Due {format(new Date(selectedOrder.dueDate), 'dd MMM yyyy')}
                      {selectedOrder.status !== 'Delivered' && (
                        <span> ({differenceInDays(new Date(selectedOrder.dueDate), new Date())}d {differenceInDays(new Date(selectedOrder.dueDate), new Date()) >= 0 ? 'left' : 'ago'})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Customer</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span>{' '}<span className="font-medium">{selectedOrder.customerName || '--'}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span>{' '}<span className="font-medium">{selectedOrder.customerPhone || '--'}</span></div>
                </div>
              </div>

              {/* Prescription */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Prescription</h4>
                  <Badge variant="outline" className="rounded-full">{selectedOrder.lensType}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Left Eye (OD)</p>
                    <p className="font-mono text-sm">{formatPower(selectedOrder.leftSPH, selectedOrder.leftCYL, selectedOrder.leftAXIS)}</p>
                    {selectedOrder.leftPD != null && <p className="text-xs text-muted-foreground">PD: {selectedOrder.leftPD}mm</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Right Eye (OS)</p>
                    <p className="font-mono text-sm">{formatPower(selectedOrder.rightSPH, selectedOrder.rightCYL, selectedOrder.rightAXIS)}</p>
                    {selectedOrder.rightPD != null && <p className="text-xs text-muted-foreground">PD: {selectedOrder.rightPD}mm</p>}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Pricing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-center">
                  <div className="rounded-md bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Cost Price</p><p className="font-semibold">{formatCurrency(selectedOrder.costPrice)}</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Selling Price</p><p className="font-semibold">{formatCurrency(selectedOrder.sellingPrice)}</p></div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className={cn('font-semibold', selectedOrder.sellingPrice - selectedOrder.costPrice >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {selectedOrder.sellingPrice - selectedOrder.costPrice >= 0 ? '+' : ''}{formatCurrency(selectedOrder.sellingPrice - selectedOrder.costPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {selectedOrder.frameName && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Frame</p><p className="font-medium">{selectedOrder.frameName}</p></div>}
                {selectedOrder.dueDate && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className={cn('font-medium', new Date(selectedOrder.dueDate) < new Date() && selectedOrder.status !== 'Delivered' && 'text-red-600 dark:text-red-400')}>{format(new Date(selectedOrder.dueDate), 'dd MMM yyyy')}</p>
                  </div>
                )}
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Time in Status</p>
                  <p className={cn('font-medium', getDaysInStatus(selectedOrder) > 3 && selectedOrder.status !== 'Delivered' && 'text-amber-600 dark:text-amber-400')}>
                    {getDaysInStatus(selectedOrder)} day{getDaysInStatus(selectedOrder) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status !== 'Delivered' && (
                    <Select onValueChange={(val) => { handleUpdateStatus(selectedOrder, val as LabOrderStatus); setDetailOpen(false) }} disabled={updatingId === selectedOrder.id}>
                      <SelectTrigger className="h-[44px] w-auto min-w-[44px] touch-manipulation">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.filter(s => s !== selectedOrder.status).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="Delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {selectedOrder.customerPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                      onClick={() => window.open(`tel:${selectedOrder.customerPhone.replace(/\D/g, '')}`, '_self')}
                    >
                      <Phone className="size-3.5" />
                      Call Customer
                    </Button>
                  )}
                  {selectedOrder.customerPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                      onClick={() => {
                        const cleanPhone = selectedOrder.customerPhone.replace(/\D/g, '')
                        window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi, regarding your lab order #${selectedOrder.id.slice(-6).toUpperCase()} at i Star Opticals.`)}`, '_blank')
                      }}
                    >
                      <MessageSquare className="size-3.5" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                {getNextStatus(selectedOrder.status) && (
                  <Button className="flex-1 gap-2 min-h-[44px] touch-manipulation" disabled={updatingId === selectedOrder.id} onClick={() => handleUpdateStatus(selectedOrder)}>
                    {updatingId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ChevronRight className="h-4 w-4" />Advance to {getNextStatus(selectedOrder.status)}</>}
                  </Button>
                )}
                {selectedOrder.status !== 'Ready' && selectedOrder.status !== 'Delivered' && (
                  <Button variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40 min-h-[44px] touch-manipulation" disabled={updatingId === selectedOrder.id} onClick={() => handleMarkReady(selectedOrder)}>
                    {updatingId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ClipboardCheck className="h-4 w-4" />Mark Ready</>}
                  </Button>
                )}
                </div>
                {/* Jump to any status */}
                {selectedOrder.status !== 'Delivered' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Jump to:</span>
                    <Select onValueChange={(val) => handleUpdateStatus(selectedOrder, val as LabOrderStatus)} disabled={updatingId === selectedOrder.id}>
                      <SelectTrigger className="h-[44px] flex-1 touch-manipulation">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.filter(s => s !== selectedOrder.status && s !== 'Delivered').map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="Delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

