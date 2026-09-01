import { CheckCircle2, Circle, XCircle, Truck } from 'lucide-react'
import type { CanonicalOrderStatus, OrderStatus, OrderStatusHistory } from '@/lib/types'
import { BUYER_TRACK_STAGES } from '@/lib/types'
import {
  buyerTrackIndex,
  cn,
  formatDate,
  normalizeOrderStatus,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from '@/lib/util'

export function OrderBadge({ status }: { status: OrderStatus }) {
  const canonical = normalizeOrderStatus(status)
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide sm:px-2.5 sm:text-[0.7rem]', ORDER_STATUS_COLOR[canonical])}>
      {canonical === 'on_way' && <Truck size={12} />}
      {ORDER_STATUS_LABEL[canonical]}
    </span>
  )
}

const FLOW: CanonicalOrderStatus[] = ['submitted', 'packaging', 'packed', 'on_way', 'reached_to_buyer']

export function StatusStepper({ status }: { status: OrderStatus }) {
  const canonical = normalizeOrderStatus(status)
  if (canonical === 'cancelled') {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">
        <XCircle size={16} /> This order was cancelled and refunded.
      </p>
    )
  }
  const idx = buyerTrackIndex(canonical)
  return (
    <ol className="flex items-center overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:items-start" aria-label="Order progress">
      {FLOW.map((s, i) => {
        const done = i <= idx
        const active = i === idx
        return (
          <li key={s} className={cn('flex min-w-0 items-center', i < FLOW.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <span className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all sm:h-8 sm:w-8',
                done ? 'border-brand bg-brand text-onbrand' : 'border-line text-faint',
                active && 'ring-2 ring-gold/50',
              )}>
                {done ? <CheckCircle2 size={15} /> : <Circle size={13} />}
              </span>
              <span className={cn('hidden max-w-[4.5rem] text-center text-[0.58rem] font-semibold uppercase tracking-wide sm:block', done ? 'text-fg' : 'text-faint')}>
                {ORDER_STATUS_LABEL[s]}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <span className={cn('mx-1 h-0.5 min-w-4 flex-1 rounded-full sm:mx-2 sm:-mt-5', i < idx ? 'bg-brand' : 'bg-line')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function OrderTimeline({ status, history = [] }: { status: OrderStatus; history?: OrderStatusHistory[] }) {
  const canonical = normalizeOrderStatus(status)
  if (canonical === 'cancelled') {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">
        <XCircle size={16} /> This order was cancelled and refunded.
      </p>
    )
  }
  const latestByStatus = new Map<string, string>()
  for (const h of history) {
    latestByStatus.set(normalizeOrderStatus(String(h.to_status)), h.created_at)
  }
  if (latestByStatus.has('sent_to_platform') && !latestByStatus.has('packed')) {
    latestByStatus.set('packed', latestByStatus.get('sent_to_platform')!)
  }
  const currentIdx = buyerTrackIndex(canonical)
  return (
    <ol className="space-y-2.5" aria-label="Track order">
      {BUYER_TRACK_STAGES.map((stage, i) => {
        const done = i < currentIdx || (i === currentIdx && canonical === 'reached_to_buyer')
        const active = i === currentIdx && canonical !== 'reached_to_buyer'
        const complete = done || (canonical === 'reached_to_buyer' && i === currentIdx)
        const at = latestByStatus.get(stage.status)
        return (
          <li key={stage.status} className="flex items-start gap-3">
            <span className={cn(
              'mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2',
              complete ? 'border-brand bg-brand text-onbrand' : active ? 'border-gold bg-gold/20 text-gold' : 'border-line text-faint',
            )}>
              {complete ? <CheckCircle2 size={13} /> : <Circle size={11} />}
            </span>
            <span>
              <span className={cn('block text-sm font-semibold', complete || active ? 'text-fg' : 'text-faint')}>{stage.label}</span>
              <span className="block text-[0.7rem] text-muted">{complete ? stage.done : active ? stage.done : stage.waiting}</span>
              {at
                ? <span className="text-[0.7rem] text-muted">{formatDate(at, true)}</span>
                : <span className="text-[0.7rem] text-faint">{complete ? 'Completed' : active ? 'Current stage' : 'Waiting'}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function OrderHistoryList({ history }: { history: OrderStatusHistory[] }) {
  if (!history.length) return <p className="text-xs text-muted">No status history yet.</p>
  return (
    <ol className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="text-xs">
          <span className="font-semibold">{ORDER_STATUS_LABEL[normalizeOrderStatus(String(h.to_status))] ?? h.to_status}</span>
          <span className="text-faint"> · {formatDate(h.created_at, true)}</span>
          {h.changed_by_role && <span className="text-muted"> · {h.changed_by_role}</span>}
        </li>
      ))}
    </ol>
  )
}
