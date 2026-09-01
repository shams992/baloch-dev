import type { CanonicalOrderStatus, OrderStatus } from './types'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function formatMoney(n: number, currency: 'PKR' | 'USD' = 'PKR'): string {
  if (currency === 'USD') return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!withTime) return date
  return `${date} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' })
}

export function lastMonths(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function normalizeOrderStatus(status: string): CanonicalOrderStatus {
  const map: Record<string, CanonicalOrderStatus> = {
    pending: 'submitted',
    confirmed: 'submitted',
    processing: 'packaging',
    ready_to_packing: 'packaging',
    packed: 'packed',
    shipped: 'sent_to_platform',
    sent_to_platform: 'sent_to_platform',
    out_for_delivery: 'on_way',
    on_way: 'on_way',
    delivered: 'reached_to_buyer',
    reached_to_buyer: 'reached_to_buyer',
    submitted: 'submitted',
    packaging: 'packaging',
    cancelled: 'cancelled',
  }
  return map[status] ?? 'submitted'
}

export function isTerminalOrder(status: string) {
  const s = normalizeOrderStatus(status)
  return s === 'reached_to_buyer' || s === 'cancelled'
}

export function isCancellableOrder(status: string) {
  return normalizeOrderStatus(status) === 'submitted'
}

export function buyerTrackIndex(status: string): number {
  const s = normalizeOrderStatus(status)
  if (s === 'cancelled') return -1
  if (s === 'submitted') return 0
  if (s === 'packaging') return 1
  if (s === 'packed' || s === 'sent_to_platform') return 2
  if (s === 'on_way') return 3
  return 4
}

export const SELLER_NEXT: Partial<Record<CanonicalOrderStatus, { to: CanonicalOrderStatus; label: string }>> = {
  submitted: { to: 'packaging', label: 'Start Packaging' },
  packaging: { to: 'packed', label: 'Packed Your Order' },
  packed: { to: 'sent_to_platform', label: 'Send to Platform Owner' },
}

export const ADMIN_NEXT: Partial<Record<CanonicalOrderStatus, { to: CanonicalOrderStatus; label: string }>> = {
  submitted: { to: 'packaging', label: 'Start Packaging' },
  packaging: { to: 'packed', label: 'Mark Packed' },
  packed: { to: 'sent_to_platform', label: 'Mark Received from Seller' },
  sent_to_platform: { to: 'on_way', label: 'On Way' },
  on_way: { to: 'reached_to_buyer', label: 'Reached to Buyer' },
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: 'Submitted Order',
  packaging: 'Ready to Packing',
  packed: 'Packed Your Order',
  sent_to_platform: 'Sent to Platform',
  on_way: 'On Way',
  reached_to_buyer: 'Reached to Buyer',
  cancelled: 'Cancelled',
  pending: 'Submitted Order',
  confirmed: 'Submitted Order',
  processing: 'Ready to Packing',
  shipped: 'Sent to Platform',
  out_for_delivery: 'On Way',
  delivered: 'Reached to Buyer',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  submitted: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  packaging: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  packed: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  sent_to_platform: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  on_way: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  reached_to_buyer: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  confirmed: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  processing: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  shipped: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  out_for_delivery: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
}

export function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    easypaisa: 'Easypaisa',
    jazzcash: 'JazzCash',
    sadapay: 'SadaPay',
    bank_transfer: 'Bank Transfer',
    cod: 'Cash on Delivery',
    'Cash on delivery': 'Cash on Delivery',
    Card: 'Card',
  }
  return map[method] ?? method
}

export function commissionOf(total: number, rate = 0.08) {
  const commission = Math.round(total * rate * 100) / 100
  return { commission, earnings: Math.round((total - commission) * 100) / 100 }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function stars(rating: number): number[] {
  return [1, 2, 3, 4, 5].map((i) => (rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0))
}
