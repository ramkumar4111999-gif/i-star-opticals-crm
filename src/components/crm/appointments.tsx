'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  format,
  parseISO,
  isToday,
  isSameMonth,
  startOfWeek,
  addDays,
} from 'date-fns'
import { DayPicker } from 'react-day-picker'
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Pencil,
  Clock,
  Loader2,
  CalendarIcon,
  User,
  FileText,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  MessageSquare,
  Footprints,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Phone,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Types ───────────────────────────────────────────────────────────────────

type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'

type AppointmentPurpose =
  | 'Eye Exam'
  | 'Frame Selection'
  | 'Lens Fitting'
  | 'Delivery'
  | 'Follow-up'
  | 'Walk-in'
  | 'Other'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Appointment {
  id: string
  customerId: string
  customer?: { id: string; name: string; phone?: string; email?: string }
  customerName: string
  customerPhone?: string
  date: string
  time?: string | null
  purpose?: string | null
  status: string
  notes?: string | null
  recurrence?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS: { value: AppointmentPurpose; label: string }[] = [
  { value: 'Eye Exam', label: 'Eye Exam' },
  { value: 'Frame Selection', label: 'Frame Selection' },
  { value: 'Lens Fitting', label: 'Lens Fitting' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Other', label: 'Other' },
]

const PURPOSE_COLORS: Record<string, string> = {
  'Eye Exam': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  'Frame Selection': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  'Lens Fitting': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'Delivery': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'Follow-up': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  'Walk-in': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
}

const PURPOSE_DURATION: Record<string, number> = {
  'Eye Exam': 30,
  'Frame Selection': 45,
  'Lens Fitting': 20,
  'Delivery': 15,
  'Follow-up': 15,
  'Walk-in': 30,
  'Other': 20,
}

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  Scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  Confirmed: {
    label: 'Confirmed',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  },
  Completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  'No-Show': {
    label: 'No-Show',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
}

const STATUS_LIST: string[] = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show']

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
] as const

const WEEK_TIME_SLOTS: string[] = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
]

const WEEK_DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    return format(date, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—'
  try {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  } catch {
    return timeStr
  }
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function transformAppointment(raw: Record<string, unknown>): Appointment {
  const customer = raw.customer as { id: string; name: string; phone?: string; email?: string } | undefined
  return {
    id: raw.id as string,
    customerId: raw.customerId as string,
    customer,
    customerName: customer?.name ?? 'Unknown',
    customerPhone: customer?.phone,
    date: raw.date as string,
    time: (raw.time as string) ?? null,
    purpose: (raw.purpose as string) ?? null,
    status: (raw.status as string) ?? 'Scheduled',
    notes: (raw.notes as string) ?? null,
    recurrence: (raw.recurrence as string) ?? null,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.Scheduled
  return (
    <Badge variant="outline" className={cn('text-[11px] sm:text-xs font-medium shrink-0', config.className)}>
      {config.label}
    </Badge>
  )
}

function PurposeBadge({ purpose }: { purpose: string | null | undefined }) {
  if (!purpose) return null
  return (
    <Badge variant="outline" className={cn('text-[11px] sm:text-xs shrink-0', PURPOSE_COLORS[purpose] ?? PURPOSE_COLORS['Other'])}>
      {purpose}
    </Badge>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}

// ─── Appointment Form Dialog ─────────────────────────────────────────────────

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment | null
  customers: Customer[]
  isWalkIn?: boolean
  onSubmit: (data: {
    customerId: string
    date: string
    time: string
    purpose: string
    status: string
    notes: string
    isWalkIn?: boolean
  }) => Promise<void>
}

function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  customers,
  isWalkIn = false,
  onSubmit,
}: AppointmentFormDialogProps) {
  const isEditing = !!appointment
  const [submitting, setSubmitting] = useState(false)
  const [customerId, setCustomerId] = useState(appointment?.customerId ?? '')
  const [date, setDate] = useState(appointment?.date ? toDateString(parseISO(appointment.date)) : toDateString(new Date()))
  const [time, setTime] = useState(appointment?.time ?? '09:00')
  const [purpose, setPurpose] = useState<string>(appointment?.purpose ?? 'Eye Exam')
  const [status, setStatus] = useState(appointment?.status ?? 'Scheduled')
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [recurrence, setRecurrence] = useState(appointment?.recurrence ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const customerSearchRef = useRef<HTMLDivElement>(null)

  // Customer search via API
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 1) { setCustomerResults([]); return }
    setCustomerSearching(true)
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}&limit=10`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCustomerResults(data.data ?? data.customers ?? [])
    } catch { setCustomerResults([]) }
    finally { setCustomerSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) setCustomerResults([])
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      // If creating a new appointment with walk-in mode, prefill purpose & status
      if (!appointment && isWalkIn) {
        setCustomerId('')
        setDate(toDateString(new Date()))
        setTime(format(new Date(), 'HH:mm'))
        setPurpose('Walk-in')
        setStatus('Completed')
        setNotes('')
      } else {
        setCustomerId(appointment?.customerId ?? '')
        setDate(appointment?.date ? toDateString(parseISO(appointment.date)) : toDateString(new Date()))
        setTime(appointment?.time ?? '09:00')
        setPurpose(appointment?.purpose ?? 'Eye Exam')
        setStatus(appointment?.status ?? 'Scheduled')
        setNotes(appointment?.notes ?? '')
      }
      setCustomerSearch('')
      setCustomerResults([])
      setCustomerSearching(false)
    }
  }, [open, appointment, isWalkIn])

  const selectedCustomer = useMemo(
    () => {
      // First check the pre-loaded customers list (for editing)
      const found = customers.find((c) => c.id === customerId)
      if (found) return found
      // Then check the search results
      return customerResults.find((c) => c.id === customerId) ?? null
    },
    [customers, customerId, customerResults]
  )

  const canSubmit = customerId && date && time && purpose

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit({ customerId, date, time, purpose, status, notes, recurrence, isWalkIn: isEditing ? false : isWalkIn })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Appointment' : isWalkIn ? 'New Walk-in' : 'New Appointment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the appointment details below.'
              : isWalkIn
                ? 'Quickly register a walk-in visit.'
                : 'Schedule a new appointment by filling in the details below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Walk-in indicator */}
          {!isEditing && isWalkIn && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
              <Footprints className="size-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="text-sm text-orange-800 dark:text-orange-300">
                Walk-in mode — purpose and status are auto-set. You can still change them below.
              </span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-2" ref={customerSearchRef}>
            <Label htmlFor="customer" className="flex items-center gap-1.5">
              <User className="size-3.5" />
              Customer <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              {selectedCustomer ? (
                <div className="flex items-center h-9 w-full rounded-md border bg-muted/30 pl-3 pr-1 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span className="text-xs text-muted-foreground shrink-0">{selectedCustomer.phone}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation"
                    onClick={() => { setCustomerId(''); setCustomerSearch(''); setCustomerResults([]) }}
                    title="Clear customer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search customers by name or phone..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerId(''); setCustomerSearch(e.target.value) }}
                    className="pl-9"
                  />
                  {customerSearching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </>
              )}
              {customerResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left min-h-[44px] touch-manipulation"
                      onClick={() => {
                        setCustomerId(customer.id)
                        setCustomerSearch('')
                        setCustomerResults([])
                      }}
                    >
                      <User className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{customer.name}</span>
                      {customer.phone && (
                        <span className="text-muted-foreground">{customer.phone}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Time Slot Quick Picker */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select Time</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {[
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
              ].map((slot) => {
                const [h, m] = slot.split(':').map(Number)
                const period = h >= 12 ? 'PM' : 'AM'
                const displayH = h % 12 || 12
                const label = `${displayH}:${m.toString().padStart(2, '0')} ${period}`
                return (
                  <button
                    key={slot}
                    type="button"
                    className={cn(
                      'text-xs font-medium rounded-md border px-1 py-2 transition-colors min-h-[44px] touch-manipulation text-center',
                      time === slot
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => setTime(slot)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Purpose & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purpose" className="flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Purpose
              </Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="purpose" className="w-full">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes for this appointment..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Recurrence (new appointments only) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger>
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="min-h-[44px] touch-manipulation">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="min-h-[44px] touch-manipulation">
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            {isEditing ? 'Save Changes' : isWalkIn ? 'Register Walk-in' : 'Create Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Calendar Month View ───────────────────────────────────────────────────

interface CalendarViewProps {
  appointments: Appointment[]
  selectedDate: Date | undefined
  onDateSelect: (date: Date) => void
}

function CalendarMonthView({ appointments, selectedDate, onDateSelect }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const appointmentDateMap = useMemo(() => {
    const map: Record<string, { total: number; scheduled: number; completed: number; cancelled: number; confirmed: number; noshow: number }> = {}
    appointments.forEach((apt) => {
      const dateStr = apt.date.startsWith('{') ? '' : apt.date
      const dayOnly = dateStr ? toDateString(parseISO(dateStr)) : ''
      if (!dayOnly) return
      if (!map[dayOnly]) {
        map[dayOnly] = { total: 0, scheduled: 0, completed: 0, cancelled: 0, confirmed: 0, noshow: 0 }
      }
      map[dayOnly].total++
      const s = apt.status.toLowerCase()
      if (s === 'scheduled') map[dayOnly].scheduled++
      else if (s === 'confirmed') map[dayOnly].confirmed++
      else if (s === 'completed') map[dayOnly].completed++
      else if (s === 'cancelled') map[dayOnly].cancelled++
      else if (s === 'no-show') map[dayOnly].noshow++
    })
    return map
  }, [appointments])

  const appointmentDates = useMemo(() => {
    const dates: Set<string> = new Set()
    appointments.forEach((apt) => {
      try {
        const dateStr = apt.date.startsWith('{') ? '' : apt.date
        if (dateStr && isSameMonth(parseISO(dateStr), currentMonth)) {
          dates.add(toDateString(parseISO(dateStr)))
        }
      } catch {
        // skip
      }
    })
    return dates
  }, [appointments, currentMonth])

  const selectedDateApts = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = toDateString(selectedDate)
    return appointments
      .filter((apt) => {
        try {
          return toDateString(parseISO(apt.date)) === dateStr
        } catch {
          return false
        }
      })
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  }, [appointments, selectedDate])

  const dayRender = (day: Date) => {
    const dateStr = toDateString(day)
    const info = appointmentDateMap[dateStr]
    if (!info) return null
    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {(info.scheduled + info.confirmed) > 0 && (
          <span className="size-1 rounded-full bg-blue-500" />
        )}
        {info.completed > 0 && (
          <span className="size-1 rounded-full bg-green-500" />
        )}
        {(info.cancelled + info.noshow) > 0 && (
          <span className="size-1 rounded-full bg-red-500" />
        )}
      </div>
    )
  }

  const totalMonthAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      try {
        return isSameMonth(parseISO(apt.date), currentMonth)
      } catch {
        return false
      }
    }).length
  }, [appointments, currentMonth])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2 hover-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="size-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {totalMonthAppointments} appointment{totalMonthAppointments !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateSelect(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            showOutsideDays
            modifiers={{
              hasAppointments: (day) => appointmentDates.has(toDateString(day)),
            }}
            modifiersStyles={{
              hasAppointments: { fontWeight: '600' },
            }}
            className="mx-auto"
            classNames={{
              day: 'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
            }}
            components={{
              DayContent: ({ date }) => (
                <div className="flex flex-col items-center justify-center w-full h-full py-1">
                  <span>{format(date, 'd')}</span>
                  {dayRender(date)}
                </div>
              ),
            }}
          />
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              Scheduled / Confirmed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" />
              Completed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" />
              Cancelled / No-Show
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card className="hover-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {selectedDate
              ? isToday(selectedDate)
                ? "Today's Appointments"
                : format(selectedDate, 'EEEE, MMM d')
              : 'Select a Date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Click on a date to view appointments.</p>
            </div>
          ) : selectedDateApts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 pr-3">
                {selectedDateApts.map((apt) => (
                  <div
                    key={apt.id}
                    className="hover-lift rounded-xl border p-3 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs sm:text-sm">{formatTime(apt.time)}</span>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="text-sm font-medium">{apt.customerName}</div>
                    {apt.purpose && <PurposeBadge purpose={apt.purpose} />}
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{apt.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Calendar Week View ─────────────────────────────────────────────────────

function CalendarWeekView({ appointments }: { appointments: Appointment[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekDates = useMemo(() => {
    return WEEK_DAYS.map((_, i) => addDays(weekStart, i))
  }, [weekStart])

  const handlePrevWeek = () => setWeekStart((w) => addDays(w, -7))
  const handleNextWeek = () => setWeekStart((w) => addDays(w, 7))
  const handleGoToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Build lookup: { 'yyyy-MM-dd:HH:MM': Appointment[] }
  const slotMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    appointments.forEach((apt) => {
      try {
        const dateStr = apt.date.startsWith('{') ? '' : apt.date
        if (!dateStr) return
        const d = toDateString(parseISO(dateStr))
        const timeKey = apt.time ? apt.time.substring(0, 5) : null
        if (timeKey && WEEK_TIME_SLOTS.includes(timeKey)) {
          const key = `${d}:${timeKey}`
          if (!map[key]) map[key] = []
          map[key].push(apt)
        }
      } catch {
        // skip
      }
    })
    return map
  }, [appointments])

  // For each slot+date, determine if the appointment continues into the next slot
  const continuationMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    appointments.forEach((apt) => {
      try {
        const dateStr = apt.date.startsWith('{') ? '' : apt.date
        if (!dateStr || !apt.time) return
        const d = toDateString(parseISO(dateStr))
        const timeKey = apt.time.substring(0, 5)
        if (!WEEK_TIME_SLOTS.includes(timeKey)) return
        const duration = PURPOSE_DURATION[apt.purpose ?? ''] ?? 30
        const slotMinutes = 60 // each slot is 1 hour
        if (duration > slotMinutes) {
          // This appointment spans multiple slots
          const key = `${d}:${timeKey}`
          map[key] = true
        }
      } catch {
        // skip
      }
    })
    return map
  }, [appointments])

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarRange className="size-5" />
            Week of {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={handleGoToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={handlePrevWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation" onClick={handleNextWeek}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 text-xs font-medium text-muted-foreground text-center border-r">
                Time
              </div>
              {weekDates.map((d, i) => {
                const isDateToday = isToday(d)
                const isSelected = toDateString(d) === toDateString(weekStart)
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-2 text-center border-r last:border-r-0',
                      isDateToday && 'bg-blue-50 dark:bg-blue-950/30'
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{WEEK_DAYS[i]}</div>
                    <div
                      className={cn(
                        'text-sm font-semibold mt-0.5',
                        isDateToday && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {format(d, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            {WEEK_TIME_SLOTS.map((slot, slotIndex) => (
              <div key={slot} className="grid grid-cols-8 border-b last:border-b-0 min-h-[3rem]">
                <div className="p-1.5 text-xs font-mono text-muted-foreground text-center flex items-center justify-center border-r">
                  {formatTime(slot)}
                </div>
                {weekDates.map((d, i) => {
                  const key = `${toDateString(d)}:${slot}`
                  const slotApts = slotMap[key] ?? []
                  const isDateToday = isToday(d)
                  const hasContinuation = continuationMap[key]
                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-0.5 border-r last:border-r-0 border-b relative',
                        isDateToday && 'bg-blue-50/50 dark:bg-blue-950/10'
                      )}
                    >
                      {slotApts.length > 0 ? (
                        <div className="space-y-0.5">
                          {slotApts.map((apt) => {
                            const duration = PURPOSE_DURATION[apt.purpose ?? ''] ?? 30
                            const spansMultiple = duration > 60
                            return (
                              <div
                                key={apt.id}
                                className="rounded px-1.5 py-0.5 text-[10px] leading-tight truncate"
                                style={{
                                  backgroundColor: apt.purpose
                                    ? (apt.status === 'Completed' ? '#dcfce7' : apt.status === 'Cancelled' ? '#fee2e2' : '#dbeafe')
                                    : '#f3f4f6',
                                }}
                              >
                                <span className="font-semibold">{apt.customerName}</span>
                                {apt.purpose && (
                                  <span className="text-muted-foreground ml-0.5">· {apt.purpose}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                      {/* Continuation indicator: a small visual bar at the bottom */}
                      {hasContinuation && (
                        <div className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t-full bg-gradient-to-r from-blue-400 to-purple-400 dark:from-blue-500 dark:to-purple-500 opacity-60" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

type ViewMode = 'list' | 'calendar' | 'week'
type StatusFilter = 'all' | AppointmentStatus

export default function Appointments() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50

  // Walk-in toggle state
  const [isWalkIn, setIsWalkIn] = useState(false)

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false)

  // Filter states
  const [purposeFilter, setPurposeFilter] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('today')

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (datePreset === 'week') {
        const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
        params.set('fromDate', toDateString(ws))
        params.set('toDate', toDateString(addDays(ws, 6)))
      } else if (datePreset === 'month') {
        const now = new Date()
        const mStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
        const mEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
        params.set('fromDate', mStart)
        params.set('toDate', mEnd)
      } else {
        params.set('date', toDateString(selectedDate))
      }
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', pageSize.toString())

      const res = await fetch(`/api/appointments?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        const data = (json.data ?? json.appointments ?? []).map(transformAppointment)
        setAppointments(data.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))
        setTotal(json.pagination?.total ?? data.length)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [selectedDate, statusFilter, pageSize, datePreset])

  const fetchAllAppointments = useCallback(async () => {
    try {
      // Fetch appointments for current month (for calendar dots and stats)
      const now = new Date()
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')

      const params = new URLSearchParams()
      params.set('fromDate', monthStart)
      params.set('toDate', monthEnd)
      params.set('limit', '500')

      const res = await fetch(`/api/appointments?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        const data = (json.data ?? json.appointments ?? []).map(transformAppointment)
        setAllAppointments(data)
      }
    } catch {
      // Silently fail
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=100')
      if (res.ok) {
        const json = await res.json()
        setCustomers(json.data ?? json.customers ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    fetchAppointments()
    fetchAllAppointments()
  }, [fetchAppointments, fetchAllAppointments])

  // ─── Grouped Appointments by Date ─────────────────────────────────────────

  // ─── Filtered Appointments (client-side purpose filter) ───────────────

  const filteredAppointments = useMemo(() => {
    if (purposeFilter === 'all') return appointments
    return appointments.filter((apt) => apt.purpose === purposeFilter)
  }, [appointments, purposeFilter])

  const filteredTodayAppointments = useMemo(() => {
    if (purposeFilter === 'all') return todayAppointments
    return todayAppointments.filter((apt) => apt.purpose === purposeFilter)
  }, [todayAppointments, purposeFilter])

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {}
    filteredAppointments.forEach((apt) => {
      try {
        const key = toDateString(parseISO(apt.date))
        if (!groups[key]) groups[key] = []
        groups[key].push(apt)
      } catch {
        // skip
      }
    })
    return groups
  }, [filteredAppointments])

  // ─── Today's Appointments ───────────────────────────────────────────────

  const todayAppointments = useMemo(() => {
    const todayStr = toDateString(new Date())
    return allAppointments
      .filter((apt) => {
        try {
          return toDateString(parseISO(apt.date)) === todayStr
        } catch {
          return false
        }
      })
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  }, [allAppointments])

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const todayStr = toDateString(new Date())
    const todayApts = allAppointments.filter((a) => {
      try {
        return toDateString(parseISO(a.date)) === todayStr
      } catch {
        return false
      }
    })
    return {
      today: todayApts.length,
      scheduled: todayApts.filter((a) => a.status === 'Scheduled').length,
      completed: todayApts.filter((a) => a.status === 'Completed').length,
    }
  }, [allAppointments])

  // ─── Purpose Stats (today's breakdown by purpose) ───────────────────────

  const purposeStats = useMemo(() => {
    const todayStr = toDateString(new Date())
    const todayApts = allAppointments.filter((a) => {
      try {
        return toDateString(parseISO(a.date)) === todayStr
      } catch {
        return false
      }
    })
    const counts: Record<string, number> = {}
    todayApts.forEach((a) => {
      const purpose = a.purpose ?? 'Other'
      counts[purpose] = (counts[purpose] || 0) + 1
    })
    return counts
  }, [allAppointments])

  // ─── Bulk Reminder eligible appointments ────────────────────────────────

  const bulkReminderCount = useMemo(() => {
    const todayStr = toDateString(new Date())
    return allAppointments.filter((a) => {
      try {
        return (
          toDateString(parseISO(a.date)) === todayStr &&
          (a.status === 'Scheduled' || a.status === 'Confirmed') &&
          (a.customerPhone || a.customer?.phone)
        )
      } catch {
        return false
      }
    }).length
  }, [allAppointments])

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreateAppointment = async (data: {
    customerId: string
    date: string
    time: string
    purpose: string
    status: string
    notes: string
    recurrence: string
    isWalkIn?: boolean
  }) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await Promise.all([fetchAppointments(), fetchAllAppointments()])
        return
      }
    } catch {
      // fallback
    }
  }

  const handleEditAppointment = async (data: {
    customerId: string
    date: string
    time: string
    purpose: string
    status: string
    notes: string
    isWalkIn?: boolean
  }) => {
    if (!editAppointment) return
    try {
      const res = await fetch(`/api/appointments/${editAppointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditAppointment(null)
        await Promise.all([fetchAppointments(), fetchAllAppointments()])
        return
      }
    } catch {
      // fallback
    }
    setEditAppointment(null)
  }

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await Promise.all([fetchAppointments(), fetchAllAppointments()])
        return
      }
    } catch {
      // fallback
    }
  }

  const handleDeleteAppointment = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/appointments/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingId(null)
        await Promise.all([fetchAppointments(), fetchAllAppointments()])
      }
    } catch {
      // fallback
    }
  }

  const handleSMSReminder = (appointment: Appointment) => {
    const phone = appointment.customerPhone || appointment.customer?.phone
    if (!phone) {
      toast.error('No phone number found for this customer')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedDate = formatDate(appointment.date)
    const formattedTime = formatTime(appointment.time)
    const message = encodeURIComponent(
      `Hi ${appointment.customerName}, reminder from i Star Opticals:\nYour appointment is on ${formattedDate}${appointment.time ? ` at ${formattedTime}` : ''}${appointment.purpose ? ` for ${appointment.purpose}` : ''}.\nPlease visit us on time. Thank you!`
    )
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank')
    toast.success('WhatsApp reminder opened', { description: 'Send the message in the opened window' })
  }

  const handleSMSReminderPlaceholder = () => {
    toast.info('SMS gateway integration is not configured. Contact your admin to set up SMS reminders via Twilio/Msg91.')
  }

  const handleBulkReminder = () => {
    const todayStr = toDateString(new Date())
    const eligible = allAppointments.filter((a) => {
      try {
        return (
          toDateString(parseISO(a.date)) === todayStr &&
          (a.status === 'Scheduled' || a.status === 'Confirmed') &&
          (a.customerPhone || a.customer?.phone)
        )
      } catch {
        return false
      }
    })

    let openedCount = 0
    eligible.forEach((apt) => {
      handleSMSReminder(apt)
      openedCount++
    })

    setBulkReminderDialogOpen(false)
    toast.success(`Opened ${openedCount} reminder window(s)`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and schedule customer appointments.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
          {/* Walk-in / Scheduled Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isWalkIn ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsWalkIn(!isWalkIn)}
                className={cn(
                  'gap-1.5 transition-colors min-h-[44px] touch-manipulation',
                  isWalkIn && 'bg-orange-600 hover:bg-orange-700 text-white'
                )}
              >
                <Footprints className="size-3.5" />
                {isWalkIn ? 'Walk-in' : 'Scheduled'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isWalkIn
                ? 'Walk-in mode: new entries auto-set purpose & status'
                : 'Switch to Walk-in mode for quick registration'}
            </TooltipContent>
          </Tooltip>

          {/* Send Reminders Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 min-h-[44px] touch-manipulation"
                onClick={() => {
                  if (bulkReminderCount === 0) {
                    toast.info('No Scheduled/Confirmed appointments with phone numbers for today.')
                    return
                  }
                  setBulkReminderDialogOpen(true)
                }}
              >
                <MessageSquare className="size-3.5" />
                <span className="hidden sm:inline">Send Reminders</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Send WhatsApp reminders to all Scheduled/Confirmed appointments for today
            </TooltipContent>
          </Tooltip>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 min-h-[44px] touch-manipulation"
          >
            <Plus className="size-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2.5">
              <CalendarDays className="size-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today&apos;s Total</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
              <Clock className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2.5">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Purpose Stats Card */}
      {Object.keys(purposeStats).length > 0 && (
        <Card className="p-4 hover-lift">
          <p className="text-sm font-medium text-muted-foreground mb-3">Today&apos;s Appointments by Purpose</p>
          <div className="flex flex-wrap gap-2">
            {PURPOSE_OPTIONS.map((opt) => {
              const count = purposeStats[opt.value] || 0
              if (count === 0) return null
              return (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={cn('text-xs gap-1.5', PURPOSE_COLORS[opt.value])}
                >
                  {opt.label}
                  <span className="font-bold">{count}</span>
                </Badge>
              )
            })}
          </div>
        </Card>
      )}

      {/* Purpose Filter Chips */}
      <Card className="hover-lift">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Filter by Purpose</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setPurposeFilter('all'); setPage(1) }}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                purposeFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
              )}
            >
              All
            </button>
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setPurposeFilter(opt.value); setPage(1) }}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                  purposeFilter === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments Highlighted */}
      {filteredTodayAppointments.length > 0 && viewMode === 'list' && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="size-5 text-blue-600" />
              Today&apos;s Appointments
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {todayAppointments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTodayAppointments.map((apt) => {
                const isWalkInApt = apt.purpose === 'Walk-in'
                return (
                  <div
                    key={apt.id}
                    className="hover-lift flex items-center gap-2 sm:gap-3 rounded-xl border border-blue-100 dark:border-blue-900 p-2 sm:p-3 bg-white dark:bg-slate-900 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => { setDetailAppointment(apt); setDetailOpen(true) }}
                  >
                    <div className="text-xs sm:text-sm font-mono font-medium min-w-[60px] sm:min-w-[70px]">
                      {formatTime(apt.time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{apt.customerName}</p>
                        {/* Appointment type badge */}
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                          isWalkInApt
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'
                        )}>
                          {isWalkInApt ? (
                            <>
                              <Footprints className="size-2.5" />
                              Walk-in
                            </>
                          ) : (
                            <>
                              <CalendarIcon className="size-2.5" />
                              Scheduled
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PurposeBadge purpose={apt.purpose} />
                        {apt.customerPhone && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">{apt.customerPhone}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                    {/* WhatsApp Reminder Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] touch-manipulation text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                          onClick={() => handleSMSReminder(apt)}
                        >
                          <MessageSquare className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>WhatsApp Reminder</TooltipContent>
                    </Tooltip>
                    {/* SMS Reminder Placeholder Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] touch-manipulation text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hidden sm:inline-flex"
                          onClick={handleSMSReminderPlaceholder}
                        >
                          <Phone className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>SMS Reminder</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditAppointment(apt)}>
                          <Pencil className="size-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {apt.status === 'Scheduled' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}>
                            <CheckCircle2 className="size-4 mr-2" /> Confirm
                          </DropdownMenuItem>
                        )}
                        {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Completed')}>
                            <CheckCircle2 className="size-4 mr-2" /> Mark Completed
                          </DropdownMenuItem>
                        )}
                        {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'No-Show')}>
                            <AlertTriangle className="size-4 mr-2" /> Mark No-Show
                          </DropdownMenuItem>
                        )}
                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Cancelled')} className="text-destructive">
                              <XCircle className="size-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card className="hover-lift">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal gap-2 w-full sm:w-auto min-h-[44px] touch-manipulation',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {datePreset === 'today' && selectedDate
                    ? 'Today'
                    : datePreset === 'week'
                      ? 'This Week'
                      : datePreset === 'month'
                        ? 'This Month'
                        : selectedDate
                          ? format(selectedDate, 'MMM d, yyyy')
                          : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setDatePreset('today')
                      setPage(1)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s as StatusFilter); setPage(1) }}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {s === 'all' ? 'All Status' : s}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Date Quick Presets */}
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setDatePreset(preset); setPage(1) }}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                    datePreset === preset
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {preset === 'today' ? 'Today' : preset === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>

            {/* View Toggle: List / Calendar / Week */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none px-3 min-h-[44px] touch-manipulation"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <div className="w-px bg-border" />
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none px-3 min-h-[44px] touch-manipulation"
                onClick={() => setViewMode('calendar')}
              >
                Month
              </Button>
              <div className="w-px bg-border" />
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none px-3 min-h-[44px] touch-manipulation"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Card className="hover-lift">
          <CardContent className="p-4">
            <TableSkeleton />
          </CardContent>
        </Card>
      ) : viewMode === 'week' ? (
        <CalendarWeekView appointments={allAppointments} />
      ) : viewMode === 'calendar' ? (
        <CalendarMonthView
          appointments={allAppointments}
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date)
            setPage(1)
          }}
        />
      ) : (
        <Card className="hover-lift">
          <CardContent className="p-0">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                  <CalendarDays className="size-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No appointments found for this date and filter.</p>
                <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="min-h-[44px] touch-manipulation">
                  <Plus className="size-4 mr-1" />
                  Schedule an Appointment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="hidden md:table-cell">Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Duration</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                    <TableHead className="hidden xl:table-cell">Repeat</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt) => (
                    <TableRow key={apt.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                      <TableCell className="pl-4">
                        <div>
                          <p className="font-medium text-sm">{apt.customerName}</p>
                          {apt.customerPhone && (
                            <p className="text-xs text-muted-foreground">{apt.customerPhone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(apt.date)}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        {formatTime(apt.time)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <PurposeBadge purpose={apt.purpose} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={apt.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {PURPOSE_DURATION[apt.purpose ?? ''] ?? 30} min
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {apt.notes || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {apt.recurrence ? (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-[10px]">
                            {apt.recurrence}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {/* WhatsApp Reminder Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px] touch-manipulation text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                                onClick={() => handleSMSReminder(apt)}
                              >
                                <MessageSquare className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>WhatsApp Reminder</TooltipContent>
                          </Tooltip>
                          {/* SMS Reminder Placeholder Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px] touch-manipulation text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={handleSMSReminderPlaceholder}
                              >
                                <Phone className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>SMS Reminder</TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditAppointment(apt)}>
                                <Pencil className="size-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {apt.status === 'Scheduled' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}>
                                  <CheckCircle2 className="size-4 mr-2" /> Confirm
                                </DropdownMenuItem>
                              )}
                              {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Completed')}>
                                  <CheckCircle2 className="size-4 mr-2" /> Mark Completed
                                </DropdownMenuItem>
                              )}
                              {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'No-Show')}>
                                  <AlertTriangle className="size-4 mr-2" /> Mark No-Show
                                </DropdownMenuItem>
                              )}
                              {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(apt.id, 'Cancelled')} className="text-destructive">
                                    <XCircle className="size-4 mr-2" /> Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setDeletingId(apt.id); setDeleteDialogOpen(true) }} className="text-destructive">
                                <Trash2 className="size-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Appointment Dialog */}
      <AppointmentFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        customers={customers}
        isWalkIn={isWalkIn}
        onSubmit={handleCreateAppointment}
      />

      {/* Edit Appointment Dialog */}
      <AppointmentFormDialog
        open={!!editAppointment}
        onOpenChange={(open) => { if (!open) setEditAppointment(null) }}
        appointment={editAppointment}
        customers={customers}
        isWalkIn={false}
        onSubmit={handleEditAppointment}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="min-h-[44px] touch-manipulation">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAppointment} className="min-h-[44px] touch-manipulation">
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog with Quick Actions */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>View details and take quick actions</DialogDescription>
          </DialogHeader>
          {detailAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{detailAppointment.customerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <p className="font-medium">{detailAppointment.customerPhone || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date & Time</span>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(detailAppointment.date)} {formatTime(detailAppointment.time)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5"><StatusBadge status={detailAppointment.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Purpose</span>
                  <div className="mt-0.5"><PurposeBadge purpose={detailAppointment.purpose} /></div>
                </div>
                {detailAppointment.recurrence && (
                  <div>
                    <span className="text-muted-foreground">Repeat</span>
                    <p className="font-medium">{detailAppointment.recurrence}</p>
                  </div>
                )}
              </div>
              {detailAppointment.notes && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{detailAppointment.notes}</p>
                </div>
              )}
              {/* Quick Action Buttons */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {detailAppointment.customerPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                      onClick={() => {
                        const phone = detailAppointment.customerPhone || detailAppointment.customer?.phone
                        if (phone) window.open(`tel:${phone.replace(/\D/g, '')}`, '_self')
                      }}
                    >
                      <Phone className="size-3.5" />
                      Call Customer
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                    onClick={() => { handleSMSReminder(detailAppointment); setDetailOpen(false) }}
                  >
                    <MessageSquare className="size-3.5" />
                    WhatsApp
                  </Button>
                  {(detailAppointment.status === 'Scheduled' || detailAppointment.status === 'Confirmed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                      onClick={async () => {
                        await handleUpdateStatus(detailAppointment.id, 'Completed')
                        setDetailOpen(false)
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                    onClick={() => {
                      setEditAppointment(detailAppointment)
                      setDetailOpen(false)
                    }}
                  >
                    <CalendarRange className="size-3.5" />
                    Reschedule
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Reminder Confirmation Dialog */}
      <Dialog open={bulkReminderDialogOpen} onOpenChange={setBulkReminderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Send Reminders
            </DialogTitle>
            <DialogDescription>
              Send reminders to all Scheduled/Confirmed appointments for today?
              This will open {bulkReminderCount} WhatsApp window{bulkReminderCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkReminderDialogOpen(false)} className="min-h-[44px] touch-manipulation">Cancel</Button>
            <Button onClick={handleBulkReminder} className="min-h-[44px] touch-manipulation">
              <MessageSquare className="size-4 mr-2" />
              Send {bulkReminderCount} Reminder{bulkReminderCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}