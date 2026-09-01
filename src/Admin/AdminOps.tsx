import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, EyeOff, FileBarChart, XCircle } from 'lucide-react'
import { Badge, Button, EmptyState, StarRating, Toggle } from '@/components/ui'
import { OrderBadge, OrderHistoryList } from '@/components/shared/OrderBits'
import { ensureAdminData, messaging, notifications as notifApi, orders, reports, reviews as reviewsApi, settings, stats, stores, users } from '@/lib/db'
import { useDb } from '@/lib/providers'
import { ADMIN_NEXT, formatDate, formatMoney, normalizeOrderStatus, ORDER_STATUS_LABEL, paymentMethodLabel, timeAgo } from '@/lib/util'
import type { CanonicalOrderStatus } from '@/lib/types'

const ADMIN_FILTERS: Array<{ id: 'all' | CanonicalOrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'packed', label: 'Packed' },
  { id: 'sent_to_platform', label: 'Sent to Platform' },
  { id: 'on_way', label: 'On Way' },
  { id: 'reached_to_buyer', label: 'Reached to Buyer' },
]

export function AdminOrders() {
  useDb()
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof ADMIN_FILTERS)[number]['id']>('all')
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { void ensureAdminData() }, [])
  const list = orders.listAll().filter((o) => filter === 'all' || normalizeOrderStatus(o.status) === filter)

  const advance = async (orderId: string, to: CanonicalOrderStatus) => {
    setBusy(orderId)
    try { await orders.advance(orderId, to) }
    catch (e: any) { console.error(e); alert(e?.message ?? 'Could not update order status.') }
    finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ADMIN_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f.id ? 'border-gold bg-gold/15 text-fg' : 'border-line text-muted hover:border-gold/40'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="p-4 font-semibold">Order</th>
                <th className="p-4 font-semibold">Buyer</th>
                <th className="p-4 font-semibold">Seller / Store</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 text-right font-semibold">Total</th>
                <th className="p-4 text-right font-semibold">Fee</th>
                <th className="p-4 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const store = o.items[0] ? stores.byId(o.items[0].store_id) : undefined
                const seller = store ? users.byId(store.seller_id) : undefined
                const next = ADMIN_NEXT[normalizeOrderStatus(o.status)]
                const addr = o.address
                return (
                  <Fragment key={o.id}>
                    <tr className="cursor-pointer border-b border-line/60 transition hover:bg-surface-2" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                      <td className="p-4 font-semibold">{o.code}</td>
                      <td className="p-4 text-muted">{o.buyer_name}</td>
                      <td className="p-4 text-muted">{store?.name ?? '—'}{seller ? ` · ${seller.full_name}` : ''}</td>
                      <td className="p-4 text-muted">{formatDate(o.created_at)}</td>
                      <td className="p-4 text-right tnum">{formatMoney(o.total)}</td>
                      <td className="p-4 text-right text-gold tnum">{formatMoney(o.commission)}</td>
                      <td className="p-4 text-right"><OrderBadge status={o.status} /></td>
                    </tr>
                    {openId === o.id && (
                      <tr className="border-b border-line/60 bg-surface-2/60">
                        <td colSpan={7} className="p-5">
                          <p className="text-xs text-muted">Shipping: {addr?.full_name} · {addr?.line1}, {addr?.city}, {addr?.state} · {addr?.phone}{addr?.email ? ` · ${addr.email}` : ''}</p>
                          <p className="mt-1 text-xs text-muted">Payment: {paymentMethodLabel(o.payment_method)} · {o.payment} · Current: {ORDER_STATUS_LABEL[normalizeOrderStatus(o.status)]}</p>
                          <ul className="mt-3 space-y-1.5">
                            {o.items.map((i) => (
                              <li key={i.id} className="flex items-center gap-3 text-xs">
                                <span className="h-8 w-8 overflow-hidden rounded-lg bg-surface">
                                  {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                                </span>
                                <Link to={`/product/${i.product_id}`} className="min-w-0 flex-1 truncate font-medium hover:text-gold">{i.name}</Link>
                                <span className="text-faint tnum">×{i.qty}</span>
                                <span className="tnum">{formatMoney(i.price * i.qty)}</span>
                                <OrderBadge status={i.status} />
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Order history</p>
                            <OrderHistoryList history={orders.history(o.id)} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {next && (
                              <Button size="sm" variant="primary" disabled={busy === o.id} onClick={(e) => { e.stopPropagation(); void advance(o.id, next.to) }}>
                                {busy === o.id ? 'Updating…' : next.label}
                              </Button>
                            )}
                            {!['reached_to_buyer', 'cancelled'].includes(normalizeOrderStatus(o.status)) && (
                              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Cancel order ${o.code}?`)) orders.cancel(o.id) }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10">
                                <XCircle size={13} /> Force cancel & refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted">No orders.</p>}
      </div>
    </div>
  )
}

/* ── Reviews moderation ───────────────────────────────────────── */
export function AdminReviews() {
  useDb()
  const list = reviewsApi.listAll()
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted tnum">{list.length} review{list.length === 1 ? '' : 's'} · {list.filter((r) => !r.is_approved).length} hidden</p>
      <ul className="space-y-4">
        {list.map((r) => (
          <li key={r.id} className={`card p-5 ${!r.is_approved ? 'border-amber-500/40' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to={`/product/${r.product_id}`} className="text-sm font-semibold hover:text-gold">Product {r.product_id}</Link>
              <div className="flex items-center gap-3">
                <StarRating rating={r.rating} size={13} />
                <button
                  onClick={() => reviewsApi.setApproved(r.id, !r.is_approved)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${r.is_approved ? 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                >
                  {r.is_approved ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Approve</>}
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">{r.comment}</p>
            <p className="mt-2 text-xs text-faint">
              {r.buyer_name} · {timeAgo(r.created_at)} ·{' '}
              {r.is_approved ? <Badge tone="green" className="ml-1">visible</Badge> : <Badge tone="gold" className="ml-1">hidden</Badge>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Messages monitor ─────────────────────────────────────────── */
export function AdminMessages() {
  useDb()
  const convs = messaging.listAll()
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">All buyer ↔ seller conversations — read-only moderation view.</p>
      {convs.length === 0 && <EmptyState title="No conversations yet" />}
      <ul className="space-y-3">
        {convs.map((c) => {
          const last = messaging.lastMessage(c.id)
          return (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">{c.buyer_name}</span>
                <span className="text-faint">↔</span>
                <span className="text-sm font-semibold">{c.seller_name}</span>
                {c.product_id && <Link to={`/product/${c.product_id}`} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-faint">product {c.product_id}</Link>}
                <span className="ml-auto text-xs text-faint">{timeAgo(c.last_at)}</span>
              </div>
              {last && <p className="mt-2 line-clamp-2 text-sm text-muted">“{last.body}” — {users.byId(last.sender_id)?.full_name ?? ''}</p>}
              <p className="mt-1.5 text-xs text-faint tnum">
                {messaging.messages(c.id).length} messages · unread: buyer {c.buyer_unread} / seller {c.seller_unread}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── Reports ──────────────────────────────────────────────────── */
export function AdminReports() {
  useDb()
  const list = reports.list()
  const s = stats.admin()

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total users', String(s.users)],
      ['Buyers', String(s.buyers)],
      ['Sellers', String(s.sellers)],
      ['Products', String(s.products)],
      ['Categories', String(s.categories)],
      ['Orders', String(s.orders)],
      ['GMV (PKR)', String(Math.round(s.revenue))],
      ['Commission (PKR)', String(Math.round(s.commission))],
      ['Reviews', String(s.reviews)],
      ['Average rating', String(s.avgRating)],
    ]
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `baloch-export-hub-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted">Generate live reports from current platform data, or export a CSV snapshot.</p>
        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" variant="primary" onClick={() => reports.create('sales')}><FileBarChart size={14} /> Sales report</Button>
          <Button size="sm" variant="ghost" onClick={() => reports.create('users')}>Users report</Button>
          <Button size="sm" variant="ghost" onClick={() => reports.create('products')}>Products report</Button>
          <Button size="sm" variant="ghost" onClick={() => reports.create('reviews')}>Reviews report</Button>
          <Button size="sm" variant="gold" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
        </div>
      </div>

      <ul className="space-y-4">
        {list.map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">{r.title}</h3>
              <span className="text-xs text-faint">{r.range} · {formatDate(r.created_at, true)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{r.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Platform notifications log ───────────────────────────────── */
export function AdminNotifications() {
  useDb()
  const recent = notifApi.listAll()
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted">Most recent platform notifications across all users.</p>
      <ul className="space-y-3">
        {recent.slice(0, 25).map((n) => (
          <li key={n.id} className="card flex items-start gap-3.5 p-4">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-line' : 'bg-gold'}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-0.5 text-sm text-muted">{n.body}</p>
              <p className="mt-1 text-[0.68rem] text-faint">→ {users.byId(n.user_id)?.full_name ?? n.user_id} · {timeAgo(n.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Settings ─────────────────────────────────────────────────── */
export function AdminSettings() {
  useDb()
  const s = settings.get()
  return (
    <div className="max-w-2xl space-y-6">
      <section className="card space-y-5 p-6" aria-labelledby="asp-commerce">
        <h3 id="asp-commerce" className="font-display text-lg font-semibold">Commerce</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-semibold text-muted">Platform commission (%)</span>
            <input
              id="setting-commission"
              name="commission_rate"
              type="number" min={0} max={30} className="field"
              value={s.commission_rate}
              onChange={(e) => settings.update({ commission_rate: Math.max(0, Math.min(30, Number(e.target.value))) })}
            />
            <span className="mt-1 block text-xs text-faint">Displayed transparently to sellers (default 8%).</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-semibold text-muted">Platform name</span>
            <input id="setting-platform-name" name="platform_name" className="field" value={s.platform_name} onChange={(e) => settings.update({ platform_name: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="card space-y-5 p-6" aria-labelledby="asp-policy">
        <h3 id="asp-policy" className="font-display text-lg font-semibold">Policies</h3>
        {[
          { key: 'maintenance' as const, label: 'Maintenance mode', sub: 'Show a maintenance notice', value: s.maintenance },
          { key: 'allow_registrations' as const, label: 'Open registrations', sub: 'Allow new account signups', value: s.allow_registrations },
          { key: 'auto_approve_stores' as const, label: 'Auto-approve stores', sub: 'Skip manual store review', value: s.auto_approve_stores },
        ].map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{row.label}</p>
              <p className="text-xs text-muted">{row.sub}</p>
            </div>
            <Toggle checked={row.value} onChange={(v) => settings.update({ [row.key]: v })} label={row.label} />
          </div>
        ))}
      </section>

      <section className="card p-6" aria-labelledby="asp-summary">
        <h3 id="asp-summary" className="font-display text-lg font-semibold">Platform snapshot</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between"><span className="text-muted">Users</span><strong className="tnum">{users.list().length} · {users.list().filter((u) => u.role === 'seller').length} sellers</strong></li>
          <li className="flex justify-between"><span className="text-muted">Commission rate</span><strong className="tnum">{s.commission_rate}%</strong></li>
          <li className="flex justify-between"><span className="text-muted">Currency</span><strong>{s.currency}</strong></li>
        </ul>
      </section>
    </div>
  )
}
