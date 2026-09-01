import { Link } from 'react-router-dom'
import {
  AlertTriangle, BadgeCheck, Package, PackagePlus, Star, Store, TrendingUp, Users, Wallet,
} from 'lucide-react'
import { Button, EmptyState, Reveal, StarRating } from '@/components/ui'
import { OrderBadge } from '@/components/shared/OrderBits'
import { AreaChart } from '@/components/shared/Charts'
import { lastMonths, monthLabel } from '@/lib/util'
import { orders, products, stats, stores } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatDate, formatMoney } from '@/lib/util'

export function useSellerStore() {
  const { user } = useAuth()
  useDb()
  if (!user) return null
  return stores.activeFor(user.id) ?? null
}

export function StoreSwitcher() {
  const { user } = useAuth()
  useDb()
  if (!user) return null
  const owned = stores.listBySeller(user.id)
  const active = stores.activeFor(user.id)
  if (owned.length < 2) return null
  return (
    <div className="px-5 pb-3">
      <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-faint">My Stores</p>
      <div className="space-y-1.5">
        {owned.map((s) => {
          const on = active?.id === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => stores.setActive(s.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition ${on ? 'border-gold bg-gold/10 font-semibold' : 'border-line text-muted hover:border-gold/40'}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[0.65rem] font-bold text-white" style={{ background: s.logo_color }}>{s.logo_initials}</span>
              <span className="min-w-0 truncate">{s.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Overview ─────────────────────────────────────────────────── */
export function SellerOverview() {
  const { user } = useAuth()
  useDb()
  const store = useSellerStore()
  if (!user || !store) return <NoStore />
  const s = stats.seller(store.id)
  const months = lastMonths(6)
  const revenueSeries = stats.monthlySeries(months, (o) =>
    o.items.filter((i) => i.store_id === store.id && i.status !== 'cancelled').reduce((sum, i) => sum + i.price * i.qty, 0))
  const myOrders = orders.listByStore(store.id)
  const lowStock = products.list({ storeId: store.id }).filter((p) => p.stock <= 3)
  const cards = [
    { label: 'Gross sales', value: formatMoney(s.gross), icon: <TrendingUp size={17} />, sub: 'before commission' },
    { label: 'Your earnings', value: formatMoney(s.earnings), icon: <Wallet size={17} />, sub: 'after 8% fee' },
    { label: 'Orders', value: String(s.orders), icon: <Package size={17} />, sub: `${s.customers} customers` },
    { label: 'Rating', value: s.avgRating ? `${s.avgRating}★` : '—', icon: <Star size={17} />, sub: `${s.reviews} reviews` },
  ]

  return (
    <div className="space-y-8">
      {!store.is_approved && (
        <div className="card flex items-start gap-4 border-amber-500/40 bg-amber-500/5 p-5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold">Store under review</p>
            <p className="mt-1 text-sm text-muted">Your store and products become public once the platform team approves them (usually within 48 hours). You can keep setting up in the meantime.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Your catalogue is live on the marketplace as soon as a product is approved.</p>
        <Button to="/products" variant="gold" size="sm">Connect with Marketplace</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.06}>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-gold">{c.icon}</span>
              <p className="font-display text-2xl font-semibold leading-none tnum">{c.value}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-faint leading-snug">{c.label}</p>
              <p className="mt-1 text-[0.7rem] text-faint">{c.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-6" aria-labelledby="sv-rev">
          <div className="flex items-center justify-between">
            <h3 id="sv-rev" className="font-display text-lg font-semibold">Sales — last 6 months</h3>
            <span className="text-xs text-faint">commission excluded in earnings</span>
          </div>
          <AreaChart className="mt-4" data={revenueSeries} labels={months.map(monthLabel)} format={(n) => formatMoney(n)} />
        </section>

        <section className="card p-6" aria-labelledby="sv-low">
          <h3 id="sv-low" className="font-display text-lg font-semibold">Stock alerts</h3>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">All products comfortably in stock. 👍</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                  <span className={`text-xs font-bold tnum ${p.stock === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                    {p.stock === 0 ? 'Out' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button to="/seller/products" variant="ghost" size="sm" className="mt-4 w-full">Manage products</Button>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="sv-orders">
        <div className="flex items-center justify-between">
          <h3 id="sv-orders" className="font-display text-lg font-semibold">Recent orders</h3>
          <Link to="/seller/orders" className="text-sm font-semibold text-brand hover:underline dark:text-gold">View all</Link>
        </div>
        {myOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No orders yet — share your store link to get the first one.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {myOrders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{o.code} · {o.buyer_name}</span>
                  <span className="text-xs text-faint">{formatDate(o.created_at)} · {o.items.filter((i) => i.store_id === store.id).length} item(s)</span>
                </span>
                <span className="font-semibold tnum">
                  {formatMoney(o.items.filter((i) => i.store_id === store.id).reduce((sum, i) => sum + i.price * i.qty, 0))}
                </span>
                <OrderBadge status={o.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ── Earnings ─────────────────────────────────────────────────── */
export function SellerEarnings() {
  useDb()
  const store = useSellerStore()
  if (!store) return <NoStore />
  const s = stats.seller(store.id)
  const months = lastMonths(6)
  const series = stats.monthlySeries(months, (o) =>
    o.items.filter((i) => i.store_id === store.id && i.status !== 'cancelled').reduce((sum, i) => sum + i.price * i.qty, 0))
  const myOrders = orders.listByStore(store.id).filter((o) => o.payment === 'paid')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Gross sales</p>
          <p className="mt-2 font-display text-3xl font-semibold tnum">{formatMoney(s.gross)}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Platform commission (8%)</p>
          <p className="mt-2 font-display text-3xl font-semibold text-crimson tnum">− {formatMoney(s.commission)}</p>
        </div>
        <div className="card border-emerald-500/30 bg-emerald-500/5 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Net earnings</p>
          <p className="mt-2 font-display text-3xl font-semibold text-emerald-500 tnum">{formatMoney(s.earnings)}</p>
        </div>
      </div>

      <section className="card p-6" aria-labelledby="earn-chart">
        <h3 id="earn-chart" className="font-display text-lg font-semibold">Monthly gross sales</h3>
        <AreaChart className="mt-4" data={series} labels={months.map(monthLabel)} format={(n) => formatMoney(n)} />
      </section>

      <section className="card overflow-x-auto p-6" aria-labelledby="earn-table">
        <h3 id="earn-table" className="font-display text-lg font-semibold">Per-order breakdown</h3>
        <table className="mt-4 w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="pb-3 pr-4 font-semibold">Order</th>
              <th className="pb-3 pr-4 font-semibold">Date</th>
              <th className="pb-3 pr-4 font-semibold">Your items</th>
              <th className="pb-3 pr-4 text-right font-semibold">Gross</th>
              <th className="pb-3 pr-4 text-right font-semibold">Fee (8%)</th>
              <th className="pb-3 text-right font-semibold">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {myOrders.map((o) => {
              const gross = o.items.filter((i) => i.store_id === store.id && i.status !== 'cancelled').reduce((sum, i) => sum + i.price * i.qty, 0)
              if (!gross) return null
              const fee = Math.round(gross * 0.08 * 100) / 100
              return (
                <tr key={o.id} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-semibold">{o.code}</td>
                  <td className="py-3 pr-4 text-muted">{formatDate(o.created_at)}</td>
                  <td className="py-3 pr-4 text-muted tnum">{o.items.filter((i) => i.store_id === store.id).length}</td>
                  <td className="py-3 pr-4 text-right tnum">{formatMoney(gross)}</td>
                  <td className="py-3 pr-4 text-right text-crimson tnum">− {formatMoney(fee)}</td>
                  <td className="py-3 text-right font-semibold text-emerald-500 tnum">{formatMoney(gross - fee)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {myOrders.length === 0 && <p className="mt-4 text-sm text-muted">No paid orders yet.</p>}
      </section>
    </div>
  )
}

/* ── Customers ────────────────────────────────────────────────── */
export function SellerCustomers() {
  useDb()
  const store = useSellerStore()
  if (!store) return <NoStore />
  const myOrders = orders.listByStore(store.id)
  const map = new Map<string, { name: string; orders: number; spent: number; last: string }>()
  for (const o of myOrders) {
    const gross = o.items.filter((i) => i.store_id === store.id && i.status !== 'cancelled').reduce((s, i) => s + i.price * i.qty, 0)
    const prev = map.get(o.buyer_id)
    map.set(o.buyer_id, {
      name: o.buyer_name,
      orders: (prev?.orders ?? 0) + 1,
      spent: (prev?.spent ?? 0) + gross,
      last: prev && prev.last > o.created_at ? prev.last : o.created_at,
    })
  }
  const list = [...map.entries()].sort((a, b) => b[1].spent - a[1].spent)

  return (
    <div>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="No customers yet" sub="Your first order will introduce them." />
      ) : (
        <div className="card overflow-x-auto p-6">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="pb-3 pr-4 font-semibold">Customer</th>
                <th className="pb-3 pr-4 text-right font-semibold">Orders</th>
                <th className="pb-3 pr-4 text-right font-semibold">Total spent</th>
                <th className="pb-3 text-right font-semibold">Last order</th>
              </tr>
            </thead>
            <tbody>
              {list.map(([id, c]) => (
                <tr key={id} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-semibold">{c.name}</td>
                  <td className="py-3 pr-4 text-right tnum">{c.orders}</td>
                  <td className="py-3 pr-4 text-right tnum">{formatMoney(c.spent)}</td>
                  <td className="py-3 text-right text-muted">{formatDate(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function NoStore() {
  return (
    <EmptyState
      icon={<Store size={26} />}
      title="You don't have a store yet"
      sub="Open your free store to start listing products."
      action={<Button to="/dashboard/become-seller" variant="gold" size="sm"><PackagePlus size={14} /> Create your store</Button>}
    />
  )
}

export function SellerRating({ rating, count }: { rating: number; count?: number }) {
  return <StarRating rating={rating} count={count} size={14} />
}

export function VerifiedBadge() {
  return <BadgeCheck size={16} className="text-emerald-500" />
}
