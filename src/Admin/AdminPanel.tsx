import { Link } from 'react-router-dom'
import {
  AlertTriangle, BadgeCheck, BarChart3, Check, Package, ShieldCheck, ShoppingBag,
  Star, Store, TrendingUp, Users, Wallet,
} from 'lucide-react'
import { Badge, Button, EmptyState, Reveal } from '@/components/ui'
import { OrderBadge } from '@/components/shared/OrderBits'
import { AreaChart, BarList } from '@/components/shared/Charts'
import { orders, stats, stores, users } from '@/lib/db'
import { useDb } from '@/lib/providers'
import { formatDate, formatMoney, lastMonths, monthLabel, ORDER_STATUS_LABEL } from '@/lib/util'

/* ── Dashboard ────────────────────────────────────────────────── */
export function AdminOverview() {
  useDb()
  const s = stats.admin()
  const months = lastMonths(6)
  const revenueSeries = stats.monthlySeries(months, (o) => (o.payment === 'paid' ? o.total : 0))
  const commissionSeries = stats.monthlySeries(months, (o) => (o.payment === 'paid' ? o.commission : 0))
  const pendingStores = stores.listAll().filter((st) => !st.is_approved)
  const recentOrders = orders.listAll().slice(0, 6)

  const cards = [
    { label: 'Total users', value: String(s.users), sub: `${s.buyers} buyers · ${s.sellers} sellers`, icon: <Users size={17} />, to: '/admin/users' },
    { label: 'Orders', value: String(s.orders), sub: `${s.ordersByStatus.find((x) => x.key === 'submitted')?.count ?? 0} submitted`, icon: <ShoppingBag size={17} />, to: '/admin/orders' },
    { label: 'Revenue', value: formatMoney(s.revenue), sub: 'gross merchandise value', icon: <TrendingUp size={17} />, to: '/admin/revenue' },
    { label: 'Commission (8%)', value: formatMoney(s.commission), sub: 'platform earnings', icon: <Wallet size={17} />, to: '/admin/revenue' },
  ]

  return (
    <div className="space-y-8">
      {pendingStores.length > 0 && (
        <div className="card flex flex-wrap items-center gap-4 border-amber-500/40 bg-amber-500/5 p-5">
          <AlertTriangle size={20} className="text-amber-500" />
          <p className="flex-1 text-sm font-semibold">
            {pendingStores.length} store application{pendingStores.length === 1 ? '' : 's'} awaiting approval
            <span className="block font-normal text-muted">{pendingStores.map((st) => st.name).join(', ')}</span>
          </p>
          <Button to="/admin/sellers" size="sm" variant="gold">Review now</Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.06}>
            <Link to={c.to} className="group block rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-gold/40">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-onbrand dark:text-gold dark:group-hover:bg-gold dark:group-hover:text-[#241a04]">{c.icon}</span>
              <p className="font-display text-2xl font-semibold leading-none tnum">{c.value}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-faint leading-snug">{c.label}</p>
              <p className="mt-1 text-[0.7rem] text-faint">{c.sub}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-6" aria-labelledby="ad-rev">
          <h3 id="ad-rev" className="font-display text-lg font-semibold">Platform revenue — 6 months</h3>
          <AreaChart className="mt-4" data={revenueSeries} labels={months.map(monthLabel)} format={(n) => formatMoney(n)} />
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">Platform commission in this period</span>
            <strong className="text-gold tnum">{formatMoney(commissionSeries.reduce((a, b) => a + b, 0))}</strong>
          </div>
        </section>

        <section className="card p-6" aria-labelledby="ad-status">
          <h3 id="ad-status" className="font-display text-lg font-semibold">Orders by status</h3>
          <div className="mt-5">
            <BarList items={s.ordersByStatus.map((x) => ({ label: ORDER_STATUS_LABEL[x.key], value: x.count }))} />
          </div>
          <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <p className="flex justify-between"><span className="text-muted">Products live</span><strong className="tnum">{s.activeProducts} / {s.products}</strong></p>
            <p className="flex justify-between"><span className="text-muted">Pending products</span><strong className="tnum">{s.pendingProducts}</strong></p>
            <p className="flex justify-between"><span className="text-muted">Average rating</span><strong className="tnum">{s.avgRating}★</strong></p>
            <p className="flex justify-between"><span className="text-muted">Reviews</span><strong className="tnum">{s.reviews} ({s.pendingReviews} hidden)</strong></p>
          </div>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="ad-orders">
        <div className="flex items-center justify-between">
          <h3 id="ad-orders" className="font-display text-lg font-semibold">Latest orders</h3>
          <Link to="/admin/orders" className="text-sm font-semibold text-brand hover:underline dark:text-gold">All orders</Link>
        </div>
        <div className="mt-4 table-scroll">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="pb-3 pr-4 font-semibold">Order</th>
                <th className="pb-3 pr-4 font-semibold">Buyer</th>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 pr-4 text-right font-semibold">Total</th>
                <th className="pb-3 pr-4 text-right font-semibold">Fee</th>
                <th className="pb-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-semibold">{o.code}</td>
                  <td className="py-3 pr-4 text-muted">{o.buyer_name}</td>
                  <td className="py-3 pr-4 text-muted">{formatDate(o.created_at)}</td>
                  <td className="py-3 pr-4 text-right tnum">{formatMoney(o.total)}</td>
                  <td className="py-3 pr-4 text-right text-gold tnum">{formatMoney(o.commission)}</td>
                  <td className="py-3 text-right"><OrderBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ── Revenue ──────────────────────────────────────────────────── */
export function AdminRevenue() {
  useDb()
  const s = stats.admin()
  const months = lastMonths(6)
  const revenueSeries = stats.monthlySeries(months, (o) => (o.payment === 'paid' ? o.total : 0))
  const allStores = stores.listAll()

  const perStore = allStores
    .map((st) => ({ ...stats.seller(st.id), store: st }))
    .sort((a, b) => b.gross - a.gross)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">GMV (paid orders)</p>
          <p className="mt-2 font-display text-3xl font-semibold tnum">{formatMoney(s.revenue)}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Platform commission</p>
          <p className="mt-2 font-display text-3xl font-semibold text-gold tnum">{formatMoney(s.commission)}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-faint">Paid out to sellers</p>
          <p className="mt-2 font-display text-3xl font-semibold text-emerald-500 tnum">{formatMoney(s.revenue - s.commission)}</p>
        </div>
      </div>

      <section className="card p-6" aria-labelledby="rev-chart">
        <h3 id="rev-chart" className="font-display text-lg font-semibold">GMV trend</h3>
        <AreaChart className="mt-4" data={revenueSeries} labels={months.map(monthLabel)} format={(n) => formatMoney(n)} />
      </section>

      <section className="card table-scroll p-6" aria-labelledby="rev-stores">
        <h3 id="rev-stores" className="font-display text-lg font-semibold">Store earnings</h3>
        <table className="mt-4 w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="pb-3 pr-4 font-semibold">Store</th>
              <th className="pb-3 pr-4 font-semibold">Seller</th>
              <th className="pb-3 pr-4 text-right font-semibold">Orders</th>
              <th className="pb-3 pr-4 text-right font-semibold">Gross</th>
              <th className="pb-3 pr-4 text-right font-semibold">Fee (8%)</th>
              <th className="pb-3 text-right font-semibold">Seller earnings</th>
            </tr>
          </thead>
          <tbody>
            {perStore.map((row) => {
              const store = row.store
              const seller = users.byId(store.seller_id)
              return (
                <tr key={store.id} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-semibold">
                    <Link to={`/store/${store.slug}`} className="hover:text-gold">{store.name}</Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{seller?.full_name}</td>
                  <td className="py-3 pr-4 text-right tnum">{row.orders}</td>
                  <td className="py-3 pr-4 text-right tnum">{formatMoney(row.gross)}</td>
                  <td className="py-3 pr-4 text-right text-gold tnum">{formatMoney(row.commission)}</td>
                  <td className="py-3 text-right font-semibold text-emerald-500 tnum">{formatMoney(row.earnings)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

/* Shared empty state for admin sections */
export function AdminEmpty({ icon, title, sub }: { icon?: React.ReactNode; title: string; sub?: string }) {
  return <EmptyState icon={icon ?? <BarChart3 size={24} />} title={title} sub={sub} />
}

export function ApprovedBadge({ approved }: { approved: boolean }) {
  return approved
    ? <Badge tone="green"><BadgeCheck size={12} /> Approved</Badge>
    : <Badge tone="gold">Pending</Badge>
}

export function StarBadge({ rating }: { rating: number }) {
  return <Badge tone="gold"><Star size={12} className="fill-current" /> {rating || '—'}</Badge>
}

export function StoreIcon() { return <Store size={16} /> }
export function ShieldIcon() { return <ShieldCheck size={16} /> }
export function PackageIcon() { return <Package size={16} /> }
export function CheckIcon() { return <Check size={16} /> }
