import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Heart, MessageCircle, Package, ShoppingBag, Star, Store, Truck, XCircle,
} from 'lucide-react'
import { Badge, Button, EmptyState, Field, Modal, Reveal, StarRating } from '@/components/ui'
import { OrderBadge, OrderTimeline } from '@/components/shared/OrderBits'
import { ProductCard, SellerCard } from '@/components/shared/Market'
import { cart, orders, products, reviews as reviewsApi, wishlist, stores } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatDate, formatMoney, isCancellableOrder, paymentMethodLabel, timeAgo } from '@/lib/util'
import type { Order } from '@/lib/types'

/* ── Overview ─────────────────────────────────────────────────── */
export function BuyerOverview() {
  const { user } = useAuth()
  useDb()
  if (!user) return null
  const myOrders = orders.listByBuyer(user.id)
  const active = myOrders.filter((o) => !['reached_to_buyer', 'delivered', 'cancelled'].includes(o.status))
  const wished = wishlist.list(user.id)
  const recommended = products.list({ sort: 'rating' }).slice(0, 4)
  const featuredSellers = stores.listApproved().slice(0, 4)
  const lastConv = null

  const stats = [
    { label: 'Active orders', value: active.length, icon: <Package size={17} />, to: '/dashboard/orders' },
    { label: 'Wishlist', value: wished.length, icon: <Heart size={17} />, to: '/dashboard/wishlist' },
    { label: 'Total orders', value: myOrders.length, icon: <ShoppingBag size={17} />, to: '/dashboard/orders' },
    { label: 'Cart', value: cart.count(user.id), icon: <ShoppingBag size={17} />, to: '/cart' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Salaam,</p>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{user.full_name.split(' ')[0]} 👋</h2>
        </div>
        <Button to="/products" variant="gold" size="sm">Discover something new <ArrowRight size={14} /></Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <Link to={s.to} className="group block rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-gold/40">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-onbrand dark:text-gold dark:group-hover:bg-gold dark:group-hover:text-[#241a04]">{s.icon}</span>
              <p className="font-display text-3xl font-semibold leading-none tnum">{s.value}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-faint leading-snug">{s.label}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* recent orders */}
        <section className="card p-6" aria-labelledby="ov-orders">
          <div className="flex items-center justify-between">
            <h3 id="ov-orders" className="font-display text-lg font-semibold">Recent orders</h3>
            <Link to="/dashboard/orders" className="text-sm font-semibold text-brand hover:underline dark:text-gold">View all</Link>
          </div>
          {myOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No orders yet — your first parcel is waiting in the marketplace.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myOrders.slice(0, 3).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3.5">
                  <span className="flex -space-x-2">
                    {o.items.slice(0, 3).map((i) => (
                      <span key={i.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-[var(--surface)] bg-surface-2">
                        {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link to={`/order/${o.code}`} className="block truncate text-sm font-semibold hover:text-gold">{o.code}</Link>
                    <span className="text-xs text-faint">{formatDate(o.created_at)} · {o.items.length} item(s) · {formatMoney(o.total)}</span>
                  </span>
                  <OrderBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* quick links */}
        <section className="card p-6" aria-labelledby="ov-quick">
          <h3 id="ov-quick" className="font-display text-lg font-semibold">Quick actions</h3>
          <div className="mt-4 space-y-3">
            <Link to="/dashboard/become-seller" className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gold/15 to-transparent p-4 transition hover:from-gold/25">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/20 text-gold"><Star size={19} /></span>
              <span className="flex-1">
                <span className="block text-sm font-bold">Become a seller</span>
                <span className="block text-xs text-muted">Open your free store in minutes</span>
              </span>
              <ArrowRight size={16} className="text-gold transition group-hover:translate-x-1" />
            </Link>
            {[
              { to: '/dashboard/sellers', icon: <Store size={18} />, title: 'Discover sellers', sub: 'Browse verified store profiles' },
              { to: '/dashboard/messages', icon: <MessageCircle size={18} />, title: 'Messages', sub: 'Talk to sellers safely' },
              { to: '/dashboard/addresses', icon: <Truck size={18} />, title: 'Addresses', sub: 'Manage delivery details' },
              { to: '/dashboard/reviews', icon: <Star size={18} />, title: 'Reviews', sub: 'Share your experience' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="group flex items-center gap-3 rounded-2xl border border-line p-4 transition hover:border-gold/40">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-muted transition group-hover:text-gold">{l.icon}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{l.title}</span>
                  <span className="block text-xs text-muted">{l.sub}</span>
                </span>
                <ArrowRight size={15} className="text-faint transition group-hover:translate-x-1 group-hover:text-gold" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* recommended */}
      <section aria-labelledby="ov-rec">
        <div className="flex items-center justify-between">
          <h3 id="ov-rec" className="font-display text-lg font-semibold">Recommended for you</h3>
          <Link to="/products" className="text-sm font-semibold text-brand hover:underline dark:text-gold">See all</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {featuredSellers.length > 0 && (
        <section aria-labelledby="ov-sellers">
          <div className="flex items-center justify-between">
            <h3 id="ov-sellers" className="font-display text-lg font-semibold">Discover sellers</h3>
            <Link to="/dashboard/sellers" className="text-sm font-semibold text-brand hover:underline dark:text-gold">View all</Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredSellers.map((s) => <SellerCard key={s.id} store={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}

/* ── Seller discovery ─────────────────────────────────────────── */
export function BuyerSellers() {
  useDb()
  const list = stores.listApproved()
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{list.length} verified store{list.length === 1 ? '' : 's'} — view profiles, products, reviews and message the maker.</p>
      {list.length === 0 ? (
        <EmptyState icon={<Store size={26} />} title="No stores yet" sub="Approved sellers will appear here." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SellerCard key={s.id} store={s} />)}
        </div>
      )}
    </div>
  )
}

/* ── Orders ───────────────────────────────────────────────────── */
export function BuyerOrders() {
  const { user } = useAuth()
  useDb()
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => { void orders.reload() }, [])
  if (!user) return null
  const list = orders.listByBuyer(user.id)

  if (list.length === 0) {
    return <EmptyState icon={<Package size={26} />} title="No orders yet"
      sub="When you order, every step lands here." action={<Button to="/products" variant="gold" size="sm">Start shopping</Button>} />
  }

  return (
    <div className="space-y-4">
      {list.map((o) => (
        <OrderCard key={o.id} order={o} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} />
      ))}
    </div>
  )
}

function OrderCard({ order, open, onToggle }: { order: Order; open: boolean; onToggle: () => void }) {
  const cancellable = isCancellableOrder(order.status)
  const firstStore = order.items[0] ? stores.byId(order.items[0].store_id) : undefined
  return (
    <article className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-4 p-5 text-left transition hover:bg-surface-2" aria-expanded={open}>
        <span className="flex -space-x-2">
          {order.items.slice(0, 3).map((i) => (
            <span key={i.id} className="h-11 w-11 overflow-hidden rounded-full border-2 border-[var(--surface)] bg-surface-2">
              {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Order #{order.code.replace(/^ORD-/, '')}</span>
          <span className="text-xs text-faint">
            {order.items[0]?.name ?? 'Order'} · {firstStore ? `Seller: ${firstStore.name}` : null} · Qty {order.items.reduce((s, i) => s + i.qty, 0)}
          </span>
          <span className="block text-xs text-faint">Placed {formatDate(order.created_at, true)}</span>
        </span>
        <span className="font-display text-lg font-semibold tnum">{formatMoney(order.total)}</span>
        <OrderBadge status={order.status} />
        <ArrowRight size={16} className={`text-faint transition ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-line p-5">
          <h4 className="mb-3 text-sm font-semibold">Track Order</h4>
          <OrderTimeline status={order.status} history={orders.history(order.id)} />
          <ul className="mt-6 space-y-3">
            {order.items.map((i) => {
              const store = stores.byId(i.store_id)
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3.5">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link to={`/product/${i.product_id}`} className="block truncate text-sm font-semibold hover:text-gold">{i.name}</Link>
                    <span className="text-xs text-faint">Qty {i.qty} · {formatMoney(i.price * i.qty)}</span>
                    {store && <Link to={`/store/${store.slug}`} className="block text-xs text-brand hover:underline dark:text-gold">{store.name}</Link>}
                  </span>
                  <span className="flex flex-col items-end gap-1.5">
                    <OrderBadge status={i.status} />
                    {i.tracking_code && <span className="text-[0.65rem] text-faint tnum">📦 {i.tracking_code}</span>}
                    {i.courier && <span className="text-[0.65rem] text-faint">{i.courier}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-muted">{paymentMethodLabel(order.payment_method)} · {order.payment === 'paid' ? 'Paid' : order.payment === 'refunded' ? 'Refunded' : 'Payment pending'}</p>
            <div className="flex gap-2.5">
              {cancellable && (
                <Button size="sm" onClick={() => orders.cancel(order.id)}>
                  <XCircle size={14} /> Cancel order
                </Button>
              )}
              <Button to={`/order/${order.code}`} size="sm" variant="ghost">Receipt</Button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

/* ── Reviews ──────────────────────────────────────────────────── */
export function BuyerReviews() {
  const { user } = useAuth()
  useDb()
  const [modal, setModal] = useState<{ productId: string; name: string } | null>(null)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  if (!user) return null

  const mine = reviewsApi.byBuyer(user.id)
  const opportunities = (() => {
    const out: Array<{ productId: string; name: string; image: string }> = []
    for (const o of orders.listByBuyer(user.id)) {
      for (const i of o.items) {
        if (['reached_to_buyer', 'delivered'].includes(i.status) && !reviewsApi.byProduct(i.product_id).some((r) => r.buyer_id === user.id) && !mine.some((r) => r.product_id === i.product_id)) {
          if (!out.some((x) => x.productId === i.product_id)) out.push({ productId: i.product_id, name: i.name, image: i.image })
        }
      }
    }
    return out
  })()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!modal || !text.trim()) return
    reviewsApi.create({ productId: modal.productId, buyer: user, rating, comment: text })
    setModal(null); setText(''); setRating(5)
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="rev-pending">
        <h3 id="rev-pending" className="font-display text-lg font-semibold">Awaiting your review</h3>
        {opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing to review right now — delivered items will appear here.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((o) => (
              <div key={o.productId} className="card flex items-center gap-3 p-4">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {o.image ? <img src={o.image} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{o.name}</span></span>
                <Button size="sm" variant="gold" onClick={() => setModal({ productId: o.productId, name: o.name })}>Review</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="rev-mine">
        <h3 id="rev-mine" className="font-display text-lg font-semibold">Your reviews ({mine.length})</h3>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Your published reviews will live here.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {mine.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link to={`/product/${r.product_id}`} className="text-sm font-semibold hover:text-gold">Product {r.product_id}</Link>
                  <StarRating rating={r.rating} size={14} />
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{r.comment}</p>
                <p className="mt-2 text-xs text-faint">{formatDate(r.created_at)} · {timeAgo(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`Review “${modal?.name ?? ''}”`}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Your rating">
            <StarRating rating={rating} interactive size={26} onChange={setRating} />
          </Field>
          <Field label="Your review" required>
            <textarea id="review-text" name="review" className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell other buyers about the craft, packing and delivery…" required />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" variant="gold">Publish</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
