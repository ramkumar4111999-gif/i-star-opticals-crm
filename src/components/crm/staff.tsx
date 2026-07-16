'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Loader2,
  Phone,
  Mail,
  UserCircle,
  CalendarCheck,
  CircleDot,
  Clock,
  Lock,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  Receipt,
  CheckCircle2,
  XCircle,
  Trophy,
  History,
  CalendarRange,
  Info,
  Star,
  Search,
  UserCog,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Staff {
  id: string
  name: string
  phone: string
  email: string | null
  role: string
  salary: number
  commission: number
  isActive: boolean
  joinDate: string | null
  createdAt: string
  updatedAt: string
}

interface Sale {
  id: string
  staffId: string | null
  totalAmount: number
  createdAt: string
}

interface StaffFormData {
  name: string
  phone: string
  email: string
  role: string
  salary: string
  commission: string
  isActive: boolean
  joinDate: string
  bankName: string
  bankAccount: string
  bankIfsc: string
  panNumber: string
}

interface StaffPerformance {
  staffId: string
  staffName: string
  staffRole: string
  totalSales: number
  commissionEarned: number
  transactionCount: number
}

interface AttendanceEntry {
  staffId: string
  staffName: string
  clockIn: string
  clockOut: string | null
}

interface AttendanceHistoryRecord {
  id: string
  staffId: string
  staffName: string
  staffRole: string
  clockIn: string
  clockOut: string | null
  date: string
  hoursWorked: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FORM: StaffFormData = {
  name: '',
  phone: '',
  email: '',
  role: 'Sales Staff',
  salary: '',
  commission: '',
  isActive: true,
  joinDate: new Date().toISOString().split('T')[0],
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  panNumber: '',
}

const ROLES = ['Owner', 'Admin', 'Optometrist', 'Sales Staff', 'Assistant'] as const

const ROLE_PERMISSIONS: Record<string, { canManageStaff: boolean; canAccessSalary: boolean; canManageInventory: boolean; canViewReports: boolean; canDeleteSales: boolean; label: string }> = {
  Owner: { canManageStaff: true, canAccessSalary: true, canManageInventory: true, canViewReports: true, canDeleteSales: true, label: 'Full access to all features' },
  Admin: { canManageStaff: true, canAccessSalary: true, canManageInventory: true, canViewReports: true, canDeleteSales: false, label: 'All features except sales deletion' },
  Optometrist: { canManageStaff: false, canAccessSalary: false, canManageInventory: false, canViewReports: true, canDeleteSales: false, label: 'View reports, manage prescriptions' },
  'Sales Staff': { canManageStaff: false, canAccessSalary: false, canManageInventory: true, canViewReports: false, canDeleteSales: false, label: 'Manage sales and inventory' },
  Assistant: { canManageStaff: false, canAccessSalary: false, canManageInventory: false, canViewReports: false, canDeleteSales: false, label: 'Basic view and data entry' },
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  Owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  Optometrist: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  'Sales Staff': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Assistant: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700',
}

const ROLE_ROW_COLORS: Record<string, string> = {
  Owner: 'bg-purple-50/50 dark:bg-purple-950/20',
  Admin: 'bg-red-50/50 dark:bg-red-950/20',
  Optometrist: 'bg-teal-50/50 dark:bg-teal-950/20',
  'Sales Staff': 'bg-emerald-50/50 dark:bg-emerald-950/20',
  Assistant: 'bg-gray-50/50 dark:bg-gray-900/20',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getAttendanceStatus(joinDate: string | null, isActive: boolean): { label: string; color: string } {
  if (!isActive) return { label: 'Inactive', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700' }
  return { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800' }
}

function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function getElapsedSeconds(isoStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000))
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function formatHoursDecimal(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// ─── Salary Management Sub-Component ────────────────────────────────────────

interface SalaryRecord {
  id: string
  staffId: string
  month: string
  basicSalary: number
  commission: number
  deductions: number
  advance: number
  netPay: number
  status: string
  paidAt: string | null
  notes: string | null
  staff: { id: string; name: string; role: string }
}

function SalaryManagementSection({ staffList, performanceData }: { staffList: Staff[]; performanceData: StaffPerformance[] }) {
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [genLoading, setGenLoading] = useState(false)

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/salary?month=${selectedMonth}`)
      if (res.ok) {
        const json = await res.json()
        setRecords(json.data ?? [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [selectedMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleGenerate = async () => {
    setGenLoading(true)
    try {
      for (const staff of staffList.filter(s => s.isActive)) {
        const perf = performanceData.find(p => p.staffId === staff.id)
        const netPay = staff.salary + (perf?.commissionEarned ?? 0)
        const res = await fetch('/api/staff/salary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: staff.id,
            month: selectedMonth,
            basicSalary: staff.salary,
            commission: Math.round(perf?.commissionEarned ?? 0),
            deductions: 0,
            advance: 0,
            netPay: Math.round(netPay),
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed' }))
          toast.error(`Failed to generate salary for ${staff.name}: ${err.error}`)
        }
      }
      await fetchRecords()
      toast.success('Salary generation completed')
    } catch (err) {
      toast.error('Network error while generating salaries')
    } finally { setGenLoading(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch('/api/staff/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Paid' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        toast.error(`Failed to mark as paid: ${err.error}`)
        return
      }
      await fetchRecords()
      toast.success('Salary marked as paid')
    } catch {
      toast.error('Network error while updating salary status')
    }
  }

  const totalNet = records.reduce((sum, r) => sum + r.netPay, 0)
  const paidCount = records.filter(r => r.status === 'Paid').length
  const pendingCount = records.filter(r => r.status === 'Pending').length

  return (
    <Card className="hover-lift">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Receipt className="size-5 text-primary" />
            Salary Management
          </CardTitle>
          <CardDescription>
            {records.length} record{records.length !== 1 ? 's' : ''} for {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            {records.length > 0 && ` — Total: ${formatCurrency(totalNet)}`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto"
          />
          <Button onClick={handleGenerate} disabled={genLoading || staffList.length === 0} variant="outline" className="min-w-[44px] min-h-[44px] touch-manipulation">
            {genLoading ? <span className="size-4 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" /> : <DollarSign className="size-4" />}
            Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="size-5 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <UserCog className="size-12 opacity-30" />
            <p className="text-sm">No salary records for this month.</p>
            <p className="text-xs">Click &quot;Generate&quot; to create salary records for all active staff.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                <CheckCircle2 className="size-3 mr-1" /> {paidCount} Paid
              </Badge>
              <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <XCircle className="size-3 mr-1" /> {pendingCount} Pending
              </Badge>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                    <TableCell className="font-medium">{r.staff.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(r.basicSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(r.commission)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600 dark:text-red-400">{r.deductions > 0 ? formatCurrency(r.deductions) : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(r.netPay)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'Paid' ? 'default' : 'secondary'} className={r.status === 'Paid' ? 'rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'rounded-full'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'Pending' && (
                        <Button size="sm" variant="outline" className="h-9 min-w-[44px] min-h-[44px] text-xs touch-manipulation active:scale-95 transition-transform" onClick={() => handleMarkPaid(r.id)}>
                          <CheckCircle2 className="size-3 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [form, setForm] = useState<StaffFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof StaffFormData, string>>>({})

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [staffSearch, setStaffSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Attendance state
  const [attendanceLog, setAttendanceLog] = useState<AttendanceEntry[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [clockSubmitting, setClockSubmitting] = useState<string | null>(null) // staffId
  const [timerTick, setTimerTick] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Attendance History state
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0])
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [historyRecords, setHistoryRecords] = useState<AttendanceHistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFetched, setHistoryFetched] = useState(false)

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff?limit=100')
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data ?? []
        setStaffList(data)
      }
    } catch {
      // Silently fail
    }
  }, [])

  const fetchSales = useCallback(async () => {
    try {
      const { start, end } = getCurrentMonthRange()
      const from = start.toISOString()
      const to = end.toISOString()
      const res = await fetch(`/api/sales?limit=500&fromDate=${encodeURIComponent(from)}&toDate=${encodeURIComponent(to)}`)
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.sales ?? json.data ?? []
        setSales(data)
      }
    } catch {
      // Silently fail
    }
  }, [])

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/attendance')
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data ?? []
        setAttendanceLog(data)
      }
    } catch {
      // Silently fail
    } finally {
      setAttendanceLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchStaff(), fetchSales(), fetchAttendance()]).finally(() => setLoading(false))
  }, [fetchStaff, fetchSales, fetchAttendance])

  // ─── Live Timer ──────────────────────────────────────────────────────────

  useEffect(() => {
    const hasActive = attendanceLog.some((e) => e.clockOut === null)
    if (hasActive) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimerTick((t) => t + 1)
        }, 1000)
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [attendanceLog])

  // ─── Attendance Helpers ──────────────────────────────────────────────────

  function getActiveAttendance(staffId: string): AttendanceEntry | undefined {
    return attendanceLog.find((e) => e.staffId === staffId && e.clockOut === null)
  }

  function isClockedIn(staffId: string): boolean {
    return !!getActiveAttendance(staffId)
  }

  function getTodayTotalHours(): number {
    let totalMs = 0
    for (const entry of attendanceLog) {
      const start = new Date(entry.clockIn).getTime()
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
      totalMs += Math.max(0, end - start)
    }
    return totalMs / (1000 * 60 * 60)
  }

  function getPresentStaffIds(): Set<string> {
    const ids = new Set<string>()
    for (const entry of attendanceLog) {
      ids.add(entry.staffId)
    }
    return ids
  }

  async function handleClockIn(staff: Staff) {
    setClockSubmitting(staff.id)
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staff.id, action: 'clock-in' }),
      })
      if (res.ok) {
        await fetchAttendance()
      }
    } finally {
      setClockSubmitting(null)
    }
  }

  async function handleClockOut(staff: Staff) {
    setClockSubmitting(staff.id)
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staff.id, action: 'clock-out' }),
      })
      if (res.ok) {
        await fetchAttendance()
      }
    } finally {
      setClockSubmitting(null)
    }
  }

  async function handleClockOutAll() {
    const clockedInStaff = attendanceLog.filter((e) => e.clockOut === null)
    if (clockedInStaff.length === 0) return
    setClockSubmitting('all')
    try {
      await Promise.all(
        clockedInStaff.map((entry) =>
          fetch('/api/staff/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: entry.staffId, action: 'clock-out' }),
          })
        )
      )
      await fetchAttendance()
      toast.success(`Clocked out ${clockedInStaff.length} staff member${clockedInStaff.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to clock out all staff')
    } finally {
      setClockSubmitting(null)
    }
  }

  // ─── Attendance History Fetch ────────────────────────────────────────────

  const fetchAttendanceHistory = useCallback(async () => {
    if (!historyFromDate || !historyToDate) return
    setHistoryLoading(true)
    setHistoryFetched(true)
    try {
      const res = await fetch(`/api/staff/attendance?fromDate=${encodeURIComponent(historyFromDate)}&toDate=${encodeURIComponent(historyToDate)}`)
      if (res.ok) {
        const json = await res.json()
        setHistoryRecords(json.data ?? [])
      } else {
        toast.error('Failed to fetch attendance history')
        setHistoryRecords([])
      }
    } catch {
      toast.error('Network error while fetching attendance history')
      setHistoryRecords([])
    } finally {
      setHistoryLoading(false)
    }
  }, [historyFromDate, historyToDate])

  // ─── Performance Calculation ──────────────────────────────────────────────

  const performanceData: StaffPerformance[] = (() => {
    const { start, end } = getCurrentMonthRange()
    const thisMonthSales = sales.filter((s) => {
      const d = new Date(s.createdAt)
      return d >= start && d <= end && s.staffId
    })

    const staffMap = new Map<string, { total: number; count: number }>()
    for (const sale of thisMonthSales) {
      if (!sale.staffId) continue
      const entry = staffMap.get(sale.staffId) ?? { total: 0, count: 0 }
      entry.total += sale.totalAmount
      entry.count += 1
      staffMap.set(sale.staffId, entry)
    }

    return staffList
      .filter((s) => s.isActive)
      .map((s) => {
        const stats = staffMap.get(s.id) ?? { total: 0, count: 0 }
        return {
          staffId: s.id,
          staffName: s.name,
          staffRole: s.role,
          totalSales: stats.total,
          commissionEarned: stats.total * (s.commission / 100),
          transactionCount: stats.count,
        }
      })
  })()

  // ─── Commission Breakdown ─────────────────────────────────────────────────

  const commissionBreakdown = (() => {
    const sorted = [...performanceData].sort((a, b) => b.commissionEarned - a.commissionEarned)
    return sorted.map((p) => {
      const staff = staffList.find((s) => s.id === p.staffId)
      const avgSaleValue = p.transactionCount > 0 ? p.totalSales / p.transactionCount : 0
      return {
        staffId: p.staffId,
        staffName: p.staffName,
        staffRole: p.staffRole,
        transactionCount: p.transactionCount,
        totalSales: p.totalSales,
        commissionRate: staff?.commission ?? 0,
        commissionEarned: p.commissionEarned,
        avgSaleValue,
      }
    })
  })()

  const topCommissionEarner = commissionBreakdown.length > 0 ? commissionBreakdown[0] : null

  // ─── Filtered Staff List ──────────────────────────────────────────────

  // Debounced staff search (300ms)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(staffSearch.trim().toLowerCase())
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [staffSearch])

  const filteredStaffList = useMemo(() => {
    let list = staffList
    if (roleFilter !== 'all') {
      list = list.filter((s) => s.role === roleFilter)
    }
    if (debouncedSearch) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(debouncedSearch) ||
          s.phone.includes(debouncedSearch)
      )
    }
    return list
  }, [staffList, roleFilter, debouncedSearch])

  // ─── Summary Stats ──────────────────────────────────────────────────────

  const summaryStats = {
    totalStaff: staffList.length,
    activeStaff: staffList.filter((s) => s.isActive).length,
    totalMonthlyPayroll: staffList.filter((s) => s.isActive).reduce((sum, s) => sum + s.salary, 0),
    totalMonthlySales: performanceData.reduce((sum, p) => sum + p.totalSales, 0),
  }

  // Attendance derived data
  const presentStaffIds = getPresentStaffIds()
  const absentStaff = staffList.filter((s) => s.isActive && !presentStaffIds.has(s.id))
  const presentCount = presentStaffIds.size
  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // ─── Quick Stats ──────────────────────────────────────────────────────────

  const avgHoursToday = (() => {
    if (presentCount === 0) return 0
    return getTodayTotalHours() / presentCount
  })()

  const totalCommissionPayable = performanceData.reduce((sum, p) => sum + p.commissionEarned, 0)

  const mostProductiveStaff = (() => {
    if (performanceData.length === 0) return '—'
    const sorted = [...performanceData].sort((a, b) => b.totalSales - a.totalSales)
    return sorted[0].staffName
  })()

  const staffOnLeave = staffList.filter((s) => !s.isActive).length

  // ─── Form Handlers ────────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingStaff(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(staff: Staff) {
    setEditingStaff(staff)
    setForm({
      name: staff.name,
      phone: staff.phone,
      email: staff.email ?? '',
      role: staff.role,
      salary: String(staff.salary),
      commission: String(staff.commission),
      isActive: staff.isActive,
      joinDate: staff.joinDate ? new Date(staff.joinDate).toISOString().split('T')[0] : '',
      bankName: (staff as Record<string, unknown>).bankName as string ?? '',
      bankAccount: (staff as Record<string, unknown>).bankAccount as string ?? '',
      bankIfsc: (staff as Record<string, unknown>).bankIfsc as string ?? '',
      panNumber: (staff as Record<string, unknown>).panNumber as string ?? '',
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  function openDeleteDialog(staff: Staff) {
    setDeletingStaff(staff)
    setDeleteDialogOpen(true)
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof StaffFormData, string>> = {}

    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.phone.trim()) errors.phone = 'Phone is required'
    if (form.salary && isNaN(Number(form.salary)))
      errors.salary = 'Must be a valid number'
    if (form.commission && isNaN(Number(form.commission)))
      errors.commission = 'Must be a valid number'
    if (Number(form.commission) < 0 || Number(form.commission) > 100)
      errors.commission = 'Must be 0-100'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        role: form.role,
        salary: Number(form.salary) || 0,
        commission: Number(form.commission) || 0,
        isActive: form.isActive,
        joinDate: form.joinDate || null,
        bankName: form.bankName.trim() || null,
        bankAccount: form.bankAccount.trim() || null,
        bankIfsc: form.bankIfsc.trim() || null,
        panNumber: form.panNumber.trim() || null,
      }

      if (editingStaff) {
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          await fetchStaff()
          toast.success('Staff member updated')
        }
      } else {
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          await fetchStaff()
          toast.success('Staff member added')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingStaff) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/staff/${deletingStaff.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeletingStaff(null)
        await fetchStaff()
        toast.success('Staff member deleted')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function updateField<K extends keyof StaffFormData>(key: K, value: StaffFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // ─── Role Badge Renderer ─────────────────────────────────────────────────

  function renderRoleBadge(role: string) {
    return (
      <Badge
        variant="outline"
        className={`rounded-full ${ROLE_BADGE_STYLES[role] ?? ''}`}
      >
        {role === 'Admin' && <Lock className="mr-1 size-3" />}
        {role}
      </Badge>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6">
      {/* ── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-muted p-2.5">
              <Users className="size-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold">{summaryStats.totalStaff}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-2.5">
              <CircleDot className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{summaryStats.activeStaff}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2.5">
              <DollarSign className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Payroll</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalMonthlyPayroll)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
              <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Sales</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalMonthlySales)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Staff Quick Stats Summary Row ────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
          <div className="rounded-md bg-sky-100 dark:bg-sky-900/30 p-1.5">
            <Clock className="size-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Avg Hours Today</p>
            <p className="text-sm font-semibold tabular-nums">{avgHoursToday.toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
          <div className="rounded-md bg-violet-100 dark:bg-violet-900/30 p-1.5">
            <DollarSign className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Commission Payable</p>
            <p className="text-sm font-semibold">{formatCurrency(totalCommissionPayable)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
          <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-1.5">
            <Star className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Top Performer</p>
            <p className="text-sm font-semibold truncate">{mostProductiveStaff}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3">
          <div className="rounded-md bg-rose-100 dark:bg-rose-900/30 p-1.5">
            <UserX className="size-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Staff on Leave</p>
            <p className="text-sm font-semibold">{staffOnLeave}</p>
          </div>
        </div>
      </div>

      {/* ── Today's Attendance Card ─────────────────────────────────── */}
      <Card className="hover-lift">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="size-5 text-primary" />
                Today&apos;s Attendance
              </CardTitle>
              <CardDescription className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" />
              {todayDate}
            </span>
            <span className="flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-green-600" />
              {presentCount} Present
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              Total: {getTodayTotalHours().toFixed(1)}h worked
            </span>
            </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] touch-manipulation gap-2"
              disabled={clockSubmitting === 'all' || !attendanceLog.some((e) => e.clockOut === null)}
              onClick={handleClockOutAll}
            >
              {clockSubmitting === 'all' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5" />
              )}
              Clock Out All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading attendance...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Present Staff */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <UserCheck className="size-4 text-green-600" />
                  Present ({presentCount})
                </h4>
                {attendanceLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No one has clocked in yet today.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {attendanceLog.map((entry, idx) => {
                      const active = entry.clockOut === null
                      return (
                        <div
                          key={`${entry.staffId}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-medium truncate">{entry.staffName}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <LogIn className="size-3 text-green-500" />
                                In: {formatTime(entry.clockIn)}
                              </span>
                              {entry.clockOut && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="size-3 text-orange-500" />
                                  Out: {formatTime(entry.clockOut)}
                                </span>
                              )}
                              {!active && entry.clockOut && (
                                <span className="text-muted-foreground">
                                  ({formatElapsed(getElapsedSeconds(entry.clockIn) - getElapsedSeconds(entry.clockOut))} worked)
                                </span>
                              )}
                            </div>
                          </div>
                          {active && (
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <Badge variant="outline" className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px] px-1.5 py-0">
                                Working
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                {formatElapsed(getElapsedSeconds(entry.clockIn))}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Absent Staff */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <UserX className="size-4 text-red-500" />
                  Absent ({absentStaff.length})
                </h4>
                {absentStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {staffList.length === 0 ? 'No staff registered.' : 'All active staff are present!'}
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {absentStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-dashed p-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.role}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 min-w-[44px] min-h-[44px] touch-manipulation"
                          disabled={clockSubmitting === staff.id}
                          onClick={() => handleClockIn(staff)}
                        >
                          {clockSubmitting === staff.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <LogIn className="size-3.5" />
                          )}
                          Clock In
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Role Filter Chips ────────────────────────────────────────── */}
      <Card className="hover-lift">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Filter by Role</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                roleFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
              )}
            >
              All
            </button>
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-w-[44px] min-h-[44px] touch-manipulation',
                  roleFilter === role
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Staff List Card ────────────────────────────────────────────── */}
      <Card className="hover-lift">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="size-5 text-primary" />
              Staff Management
            </CardTitle>
            <CardDescription>
              {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </div>
          <Button onClick={openAddDialog} className="w-full sm:w-auto min-w-[44px] min-h-[44px] touch-manipulation">
            <Plus className="size-4" />
            Add Staff
          </Button>
        </CardHeader>

        <CardContent>
          {/* Staff Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by name or phone..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="pl-9 min-h-[44px] touch-manipulation"
              aria-label="Search staff by name or phone"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading staff...</span>
            </div>
          ) : filteredStaffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <UserCog className="size-12 opacity-30" />
              <p className="text-sm">No staff members found for this role filter.</p>
              <Button variant="outline" size="sm" onClick={openAddDialog} className="min-w-[44px] min-h-[44px] touch-manipulation">
                <Plus className="size-4" />
                Add your first staff member
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-center">Attendance</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaffList.map((staff) => {
                      const attStatus = getAttendanceStatus(staff.joinDate, staff.isActive)
                      const clocked = isClockedIn(staff.id)
                      const activeEntry = getActiveAttendance(staff.id)
                      return (
                        <TableRow key={staff.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{staff.name}</span>
                              {renderRoleBadge(staff.role)}
                              <Badge
                                variant="outline"
                                className={`rounded-full text-[10px] px-1.5 py-0 ${attStatus.color}`}
                              >
                                {attStatus.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{staff.phone}</TableCell>
                          <TableCell>
                            {renderRoleBadge(staff.role)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex items-center gap-1.5">
                              <CalendarCheck className="size-3.5" />
                              {formatDate(staff.joinDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={staff.isActive ? 'default' : 'secondary'}
                              className={
                                staff.isActive
                                  ? 'rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              }
                            >
                              {staff.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(staff.salary)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {staff.commission}%
                          </TableCell>
                          <TableCell className="text-center">
                            {staff.isActive && (
                              clocked ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20 min-w-[44px] min-h-[44px] touch-manipulation"
                                    disabled={clockSubmitting === staff.id}
                                    onClick={() => handleClockOut(staff)}
                                  >
                                    {clockSubmitting === staff.id ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <LogOut className="size-3" />
                                    )}
                                    Clock Out
                                  </Button>
                                  {activeEntry && (
                                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                      {formatElapsed(getElapsedSeconds(activeEntry.clockIn))}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 min-w-[44px] min-h-[44px] touch-manipulation"
                                  disabled={clockSubmitting === staff.id}
                                  onClick={() => handleClockIn(staff)}
                                >
                                  {clockSubmitting === staff.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <LogIn className="size-3" />
                                  )}
                                  Clock In
                                </Button>
                              )
                            )}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px] touch-manipulation"
                                onClick={() => openEditDialog(staff)}
                                aria-label={`Edit ${staff.name}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px] touch-manipulation text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(staff)}
                                aria-label={`Delete ${staff.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {filteredStaffList.map((staff) => {
                  const attStatus = getAttendanceStatus(staff.joinDate, staff.isActive)
                  const clocked = isClockedIn(staff.id)
                  const activeEntry = getActiveAttendance(staff.id)
                  return (
                    <Card key={staff.id} className="p-4 hover-lift">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate font-medium">{staff.name}</p>
                            {renderRoleBadge(staff.role)}
                            <Badge
                              variant="outline"
                              className={`rounded-full shrink-0 text-[10px] px-1.5 py-0 ${attStatus.color}`}
                            >
                              {attStatus.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="size-3.5" />
                              {staff.phone}
                            </span>
                            {staff.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="size-3.5 shrink-0" />
                                {staff.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation"
                            onClick={() => openEditDialog(staff)}
                            aria-label={`Edit ${staff.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] touch-manipulation text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(staff)}
                            aria-label={`Delete ${staff.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Join Date</span>
                          <span className="font-medium">{formatDate(staff.joinDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge
                            variant={staff.isActive ? 'default' : 'secondary'}
                            className={
                              staff.isActive
                                ? 'rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shrink-0'
                                : 'rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700 shrink-0'
                            }
                          >
                            {staff.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Salary</span>
                          <span className="font-mono font-medium">{formatCurrency(staff.salary)}/mo</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Commission</span>
                          <span className="font-mono font-medium">{staff.commission}%</span>
                        </div>
                      </div>
                      {staff.isActive && (
                        <>
                          <Separator className="my-3" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Attendance</span>
                            {clocked ? (
                              <div className="flex items-center gap-2">
                                {activeEntry && (
                                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                    {formatElapsed(getElapsedSeconds(activeEntry.clockIn))}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20 min-w-[44px] min-h-[44px] touch-manipulation"
                                  disabled={clockSubmitting === staff.id}
                                  onClick={() => handleClockOut(staff)}
                                >
                                  {clockSubmitting === staff.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <LogOut className="size-3" />
                                  )}
                                  Clock Out
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 min-w-[44px] min-h-[44px] touch-manipulation"
                                disabled={clockSubmitting === staff.id}
                                onClick={() => handleClockIn(staff)}
                              >
                                {clockSubmitting === staff.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <LogIn className="size-3" />
                                )}
                                Clock In
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Staff Performance Section ───────────────────────────────────── */}
      {performanceData.length > 0 && (
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="size-5 text-primary" />
              Staff Performance
            </CardTitle>
            <CardDescription>
              Monthly sales performance for active staff —{' '}
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Performance Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">This Month&apos;s Commission</TableHead>
                    <TableHead className="pr-4 text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((p) => (
                    <TableRow key={p.staffId} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                      <TableCell className="pl-4 font-medium">{p.staffName}</TableCell>
                      <TableCell>
                        {renderRoleBadge(p.staffRole)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(p.totalSales)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.commissionEarned)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <ShoppingBag className="size-3.5 text-muted-foreground" />
                          {p.transactionCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Performance Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:hidden">
              {performanceData.map((p) => (
                <Card key={p.staffId} className="p-4 hover-lift">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.staffName}</p>
                      {renderRoleBadge(p.staffRole)}
                    </div>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserCircle className="size-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="size-3.5" />
                        Total Sales
                      </span>
                      <span className="font-mono font-medium">{formatCurrency(p.totalSales)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="size-3.5" />
                        This Month&apos;s Commission
                      </span>
                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.commissionEarned)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ShoppingBag className="size-3.5" />
                        Transactions
                      </span>
                      <span className="font-mono font-medium">{p.transactionCount}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Commission Breakdown ───────────────────────────────────────── */}
      {commissionBreakdown.length > 0 && (
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="size-5 text-amber-500" />
              Commission Breakdown
            </CardTitle>
            <CardDescription>
              Detailed commission analysis for active staff — sorted by commission earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Sales Count</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">Commission Earned</TableHead>
                    <TableHead className="pr-4 text-right">Avg Sale Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionBreakdown.map((cb) => {
                    const isTop = topCommissionEarner && cb.staffId === topCommissionEarner.staffId
                    return (
                      <TableRow key={cb.staffId} className={`transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 ${isTop ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            {isTop && <Trophy className="size-4 text-amber-500 shrink-0" />}
                            <span className={`font-medium ${isTop ? 'text-amber-700 dark:text-amber-400' : ''}`}>{cb.staffName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{renderRoleBadge(cb.staffRole)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {cb.transactionCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(cb.totalSales)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {cb.commissionRate}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(cb.commissionEarned)}
                        </TableCell>
                        <TableCell className="pr-4 text-right font-mono">
                          {cb.transactionCount > 0 ? formatCurrency(cb.avgSaleValue) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:hidden">
              {commissionBreakdown.map((cb) => {
                const isTop = topCommissionEarner && cb.staffId === topCommissionEarner.staffId
                return (
                  <Card key={cb.staffId} className={`p-4 hover-lift ${isTop ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex items-center gap-2">
                        {isTop && <Trophy className="size-4 text-amber-500 shrink-0" />}
                        <p className={`truncate font-medium ${isTop ? 'text-amber-700 dark:text-amber-400' : ''}`}>{cb.staffName}</p>
                      </div>
                      {renderRoleBadge(cb.staffRole)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sales Count</span>
                        <span className="font-mono font-medium">{cb.transactionCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Sales</span>
                        <span className="font-mono font-medium">{formatCurrency(cb.totalSales)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-mono font-medium text-muted-foreground">{cb.commissionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Commission</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(cb.commissionEarned)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg Sale</span>
                        <span className="font-mono font-medium">{cb.transactionCount > 0 ? formatCurrency(cb.avgSaleValue) : '—'}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Role-Based Access Reference ─────────────────────────────── */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lock className="size-5 text-primary" />
            Role-Based Access
          </CardTitle>
          <CardDescription>Permission levels for each staff role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Manage Staff</TableHead>
                  <TableHead className="text-center">Access Salary</TableHead>
                  <TableHead className="text-center">Manage Inventory</TableHead>
                  <TableHead className="text-center">View Reports</TableHead>
                  <TableHead className="text-center">Delete Sales</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map((role) => {
                  const perms = ROLE_PERMISSIONS[role]
                  if (!perms) return null
                  return (
                    <TableRow key={role} className={`transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 ${ROLE_ROW_COLORS[role] ?? ''}`}>
                      <TableCell className="font-medium">{renderRoleBadge(role)}</TableCell>
                      <TableCell className="text-center">{perms.canManageStaff ? <CheckCircle2 className="size-4 text-green-600 mx-auto" /> : <XCircle className="size-4 text-red-400 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{perms.canAccessSalary ? <CheckCircle2 className="size-4 text-green-600 mx-auto" /> : <XCircle className="size-4 text-red-400 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{perms.canManageInventory ? <CheckCircle2 className="size-4 text-green-600 mx-auto" /> : <XCircle className="size-4 text-red-400 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{perms.canViewReports ? <CheckCircle2 className="size-4 text-green-600 mx-auto" /> : <XCircle className="size-4 text-red-400 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{perms.canDeleteSales ? <CheckCircle2 className="size-4 text-green-600 mx-auto" /> : <XCircle className="size-4 text-red-400 mx-auto" />}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{perms.label}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Login Placeholder Section */}
          <Separator />
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 dark:bg-sky-900/30 p-2 mt-0.5">
                <Info className="size-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 space-y-1">
                <h4 className="text-sm font-medium">Login Placeholder</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Role-based login is a placeholder for future authentication integration. Currently, all users have full access. Set up NextAuth.js or similar to enable role-based restrictions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const count = staffList.filter((s) => s.role === role).length
                return (
                  <Badge
                    key={role}
                    variant="outline"
                    className={`rounded-full ${ROLE_BADGE_STYLES[role] ?? ''} gap-1.5`}
                  >
                    {role}
                    <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">
                      {count}
                    </span>
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Attendance History ────────────────────────────────────────── */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <History className="size-5 text-primary" />
            Attendance History
          </CardTitle>
          <CardDescription>View attendance records for any date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="history-from" className="text-sm">From Date</Label>
              <Input
                id="history-from"
                type="date"
                value={historyFromDate}
                onChange={(e) => setHistoryFromDate(e.target.value)}
                className="w-full sm:w-auto min-w-[44px] min-h-[44px] touch-manipulation"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="history-to" className="text-sm">To Date</Label>
              <Input
                id="history-to"
                type="date"
                value={historyToDate}
                onChange={(e) => setHistoryToDate(e.target.value)}
                className="w-full sm:w-auto min-w-[44px] min-h-[44px] touch-manipulation"
              />
            </div>
            <Button
              onClick={fetchAttendanceHistory}
              disabled={historyLoading || !historyFromDate || !historyToDate}
              className="w-full sm:w-auto min-w-[44px] min-h-[44px] touch-manipulation"
            >
              {historyLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarRange className="size-4" />
              )}
              View History
            </Button>
          </div>

          {/* History Results */}
          {historyFetched && (
            historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                <UserCog className="size-12 opacity-30" />
                <p className="text-sm">No attendance records found for the selected range.</p>
                <p className="text-xs">Try adjusting the date range.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Staff Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead className="text-right">Total Hours</TableHead>
                        <TableHead className="pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRecords.map((r) => (
                        <TableRow key={r.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                          <TableCell className="pl-4 font-medium">{r.staffName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateShort(r.date)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(r.clockIn)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {r.clockOut ? formatTime(r.clockOut) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {formatHoursDecimal(r.hoursWorked)}
                          </TableCell>
                          <TableCell className="pr-4">
                            {r.clockOut ? (
                              <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="size-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                <Clock className="size-3 mr-1" />
                                In-Progress
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-2 md:hidden">
                  {historyRecords.map((r) => (
                    <div key={r.id} className="rounded-xl border p-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{r.staffName}</span>
                        {r.clockOut ? (
                          <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] shrink-0">
                            <CheckCircle2 className="size-2.5 mr-0.5" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] shrink-0">
                            <Clock className="size-2.5 mr-0.5" />
                            In-Progress
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Date: <span className="text-foreground font-medium">{formatDateShort(r.date)}</span></span>
                        <span>In: <span className="text-foreground font-mono">{formatTime(r.clockIn)}</span></span>
                        <span>Out: <span className="text-foreground font-mono">{r.clockOut ? formatTime(r.clockOut) : '—'}</span></span>
                        <span>Hours: <span className="text-foreground font-mono tabular-nums">{formatHoursDecimal(r.hoursWorked)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Salary Management Section ───────────────────────────────────── */}
      <SalaryManagementSection staffList={staffList} performanceData={performanceData} />

      {/* ── Add / Edit Staff Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !submitting && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? `Update details for ${editingStaff.name}.`
                : 'Fill in the information below to add a new staff member.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="staff-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-name"
                placeholder="e.g., Kumar"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="staff-phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                aria-invalid={!!formErrors.phone}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive">{formErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="staff@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(val) => updateField('role', val)}
              >
                <SelectTrigger id="staff-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Join Date */}
            <div className="grid gap-2">
              <Label htmlFor="staff-join-date">Join Date</Label>
              <Input
                id="staff-join-date"
                type="date"
                value={form.joinDate}
                onChange={(e) => updateField('joinDate', e.target.value)}
              />
            </div>

            {/* Salary & Commission Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="staff-salary">Salary (₹/month)</Label>
                <Input
                  id="staff-salary"
                  type="number"
                  min="0"
                  step="500"
                  placeholder="15000"
                  value={form.salary}
                  onChange={(e) => updateField('salary', e.target.value)}
                  aria-invalid={!!formErrors.salary}
                />
                {formErrors.salary && (
                  <p className="text-xs text-destructive">{formErrors.salary}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staff-commission">Commission (%)</Label>
                <Input
                  id="staff-commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="5"
                  value={form.commission}
                  onChange={(e) => updateField('commission', e.target.value)}
                  aria-invalid={!!formErrors.commission}
                />
                {formErrors.commission && (
                  <p className="text-xs text-destructive">{formErrors.commission}</p>
                )}
                {/* Commission Rate Quick-Pick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[0, 2, 3, 5, 8, 10, 15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => updateField('commission', String(rate))}
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors min-h-[44px] touch-manipulation',
                        String(form.commission) === String(rate)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="staff-active" className="cursor-pointer">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive staff won&apos;t appear in performance reports
                </p>
              </div>
              <Switch
                id="staff-active"
                checked={form.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
              />
            </div>

            {/* Bank Details Section */}
            <div className="space-y-3">
              <Separator />
              <p className="text-sm font-medium">Bank Details (Optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="staff-bank">Bank Name</Label>
                  <Input id="staff-bank" placeholder="SBI, HDFC..." value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff-pan">PAN Number</Label>
                  <Input id="staff-pan" placeholder="ABCDE1234F" value={form.panNumber} onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())} className="uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="staff-account">Account No.</Label>
                  <Input id="staff-account" placeholder="Account number" value={form.bankAccount} onChange={(e) => updateField('bankAccount', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff-ifsc">IFSC Code</Label>
                  <Input id="staff-ifsc" placeholder="SBIN0001234" value={form.bankIfsc} onChange={(e) => updateField('bankIfsc', e.target.value.toUpperCase())} className="uppercase" />
                </div>
              </div>
            </div>
          </div>

          {editingStaff && (
            <div>
              <Separator className="my-2" />
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {editingStaff.isActive && !isClockedIn(editingStaff.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                    disabled={clockSubmitting === editingStaff.id}
                    onClick={async () => { await handleClockIn(editingStaff); setDialogOpen(false) }}
                  >
                    <LogIn className="size-3.5" />
                    Clock In
                  </Button>
                )}
                {isClockedIn(editingStaff.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                    disabled={clockSubmitting === editingStaff.id}
                    onClick={async () => { await handleClockOut(editingStaff); setDialogOpen(false) }}
                  >
                    <LogOut className="size-3.5" />
                    Clock Out
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                  onClick={() => {
                    setDialogOpen(false)
                    toast.info(`Sales report for ${editingStaff.name}: ${performanceData.find(p => p.staffId === editingStaff.id)?.transactionCount ?? 0} transactions this month`)
                  }}
                >
                  <ShoppingBag className="size-3.5" />
                  View Sales
                </Button>
                {editingStaff.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 min-w-[44px] min-h-[44px] touch-manipulation"
                    onClick={() => window.open(`https://wa.me/91${editingStaff.phone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <Mail className="size-3.5" />
                    Message
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="min-w-[44px] min-h-[44px] touch-manipulation">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {editingStaff ? 'Update Staff' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !submitting && setDeleteDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{deletingStaff?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting} className="min-w-[44px] min-h-[44px] touch-manipulation">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}