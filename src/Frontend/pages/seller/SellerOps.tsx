import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, FileDown, Package, PackageCheck, Star, Truck } from 'lucide-react'
import { Button, EmptyState, StarRating } from '@/components/ui'
import { OrderBadge, OrderHistoryList } from '@/components/shared/OrderBits'
import { downloadOrderVoucher } from '@/components/shared/OrderVoucher'
import { notifications as notifApi, orders, products, reviews as reviewsApi, stores, users } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatDate, formatMoney, normalizeOrderStatus, paymentMethodLabel, SELLER_NEXT, timeAgo } from '@/lib/util'
import type { Order, OrderItem } from '@/lib/types'
import { NoStore, useSellerStore } from './SellerCenter'

export function SellerOrders() {
  useDb()
  const store = useSellerStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { void orders.reload() }, [])
  if (!store) return <NoStore />
  const list = orders.listByStore(store.id)
  if (list.length === 0) {
    return <EmptyState icon={<Package size={26} />} title="No orders yet" sub="Share your store link — the first order will appear here." />
  }

  const advance = async (orderId: string, to: Parameters<typeof orders.advance>[1]) => {
    setBusy(orderId)
    try { await orders.advance(orderId, to) }
    catch (e: any) { console.error(e); alert(e?.message ?? 'Could not update order status.') }
    finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      {list.map((o) => {
        const mine = o.items.filter((i) => i.store_id === store.id)
        const gross = mine.reduce((s, i) => s + i.price * i.qty, 0)
        const itemStatus = normalizeOrderStatus(mine[0]?.status ?? o.status)
        const next = SELLER_NEXT[itemStatus]
        const open = openId === o.id
        const addr = o.address ?? {} as Order['address']
        const seller = users.byId(store.seller_id)
        return (
          <article key={o.id} className="card overflow-hidden">
            <div className="flex w-full flex-wrap items-center gap-3 p-5">
              <button onClick={() => setOpenId(open ? null : o.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-4 text-left transition" aria-expanded={open}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">New Order #{o.code.replace(/^ORD-/, '')}</span>
                  <span className="text-xs text-faint">Buyer: {o.buyer_name} · {formatDate(o.created_at, true)} · {mine.length} item(s)</span>
                </span>
                <span className="font-display text-lg font-semibold tnum">{formatMoney(gross)}</span>
                <OrderBadge status={itemStatus} />
                <ArrowRight size={16} className={`text-faint transition ${open ? 'rotate-90' : ''}`} />
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadOrderVoucher({
                  order: o,
                  items: mine,
                  store,
                  seller,
                })}
              >
                <FileDown size={14} /> Download Voucher
              </Button>
            </div>
            {open && (
              <div className="space-y-4 border-t border-line p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-surface-2 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">Buyer</p>
                    <p className="mt-1 font-semibold">{addr.full_name || o.buyer_name}</p>
                    {addr.phone && <p className="text-muted">Phone: {addr.phone}</p>}
                    {addr.email && <p className="text-muted">Email: {addr.email}</p>}
                  </div>
                  <div className="rounded-2xl bg-surface-2 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">Shipping address</p>
                    <p className="mt-1 text-muted">{addr.line1}, {addr.city}, {addr.state} {addr.country ? `· ${addr.country}` : ''}</p>
                    <p className="mt-2 text-xs text-faint">Store: {store.name}{seller ? ` · ${seller.full_name}` : ''}</p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Payment: {paymentMethodLabel(o.payment_method)} · {o.payment === 'paid' ? 'Paid' : o.payment === 'refunded' ? 'Refunded' : 'Pending'}
                  {o.shipping ? ` · Shipping ${formatMoney(o.shipping)}` : ''} · Total {formatMoney(o.total)}
                </p>
                {mine.map((i) => <SellerOrderItem key={i.id} item={i} />)}
                {next && (
                  <Button size="sm" variant="primary" disabled={busy === o.id} onClick={() => advance(o.id, next.to)}>
                    {next.to === 'sent_to_platform' ? <Truck size={14} /> : next.to === 'packed' ? <PackageCheck size={14} /> : <Package size={14} />}
                    {busy === o.id ? 'Updating…' : next.label}
                  </Button>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Status history</p>
                  <OrderHistoryList history={orders.history(o.id)} />
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function SellerOrderItem({ item }: { item: OrderItem }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3.5">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <Link to={`/product/${item.product_id}`} className="block truncate text-sm font-semibold hover:text-gold">{item.name}</Link>
        <span className="text-xs text-faint">Qty {item.qty} · {formatMoney(item.price)} each · {formatMoney(item.price * item.qty)}</span>
        {item.tracking_code && <span className="block text-[0.65rem] text-faint tnum">📦 {item.tracking_code}</span>}
      </span>
      <OrderBadge status={item.status} />
    </div>
  )
}

/* ── Reviews (seller view) ────────────────────────────────────── */
export function SellerReviews() {
  useDb()
  const store = useSellerStore()
  if (!store) return <NoStore />
  const mine = products.list({ storeId: store.id })
  const list = reviewsApi.listAll().filter((r) => mine.some((p) => p.id === r.product_id))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Star size={18} className="text-gold" />
        <p className="text-sm text-muted">{list.length} review{list.length === 1 ? '' : 's'} across your products</p>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Star size={26} />} title="No reviews yet" sub="Reviews arrive after your first deliveries." />
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const p = mine.find((x) => x.id === r.product_id)
            return (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    {p && <Link to={`/product/${p.id}`} className="text-sm font-semibold hover:text-gold">{p.name}</Link>}
                  </span>
                  <StarRating rating={r.rating} size={14} />
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{r.comment}</p>
                <p className="mt-2 text-xs text-faint">{r.buyer_name} · {timeAgo(r.created_at)}{!r.is_approved && ' · hidden (moderation)'}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── Notifications (full page) ────────────────────────────────── */
export function SellerNotifications() {
  const { user } = useAuth()
  useDb()
  if (!user) return null
  const list = notifApi.list(user.id)
  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{list.filter((n) => !n.read).length} unread</p>
        <Button size="sm" variant="ghost" onClick={() => notifApi.markAllRead(user.id)}>Mark all read</Button>
      </div>
      {list.length === 0 && <EmptyState icon={<Package size={24} />} title="No notifications" sub="Order and message updates land here." />}
      <ul className="space-y-3">
        {list.map((n) => (
          <li key={n.id}>
            <button onClick={() => {
              notifApi.markRead(n.id)
              if (n.href) window.location.assign(n.href)
            }} className={`card flex w-full gap-3.5 p-4 text-left transition hover:border-gold/40 ${!n.read ? 'border-brand/30 bg-brand/5' : ''}`}>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-line' : 'bg-gold'}`} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{n.body}</span>
                <span className="mt-1 block text-[0.68rem] text-faint">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Store profile ────────────────────────────────────────────── */
const COLORS = ['#0d7d76', '#b9821f', '#a4123f', '#5c4a7d', '#0f5d8a', '#3f7d3a']
const BANNERS = ['/images/doch-closeup.jpg', '/images/cat-painting.jpg', '/images/cat-food.jpg', '/images/cat-jewelry.jpg', '/images/cat-herbs.jpg', '/images/cat-calligraphy.jpg']

export function SellerStoreProfile() {
  useDb()
  const store = useSellerStore()
  const [saved, setSaved] = useState(false)
  const [f, setF] = useState(() => store ? {
    name: store.name, description: store.description, location: store.location,
    category_slugs: store.category_slugs, logo_color: store.logo_color, banner: store.banner ?? '',
    whatsapp_number: store.whatsapp_number ?? '',
  } : null)
  useEffect(() => {
    if (!store) return
    setF({
      name: store.name, description: store.description, location: store.location,
      category_slugs: store.category_slugs, logo_color: store.logo_color, banner: store.banner ?? '',
      whatsapp_number: store.whatsapp_number ?? '',
    })
  }, [store?.id])
  if (!store || !f) return <NoStore />
  const seller = users.byId(store.seller_id)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    stores.update(store.id, { ...f, logo_initials: f.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div className="card overflow-hidden">
        <div className="relative h-36">
          {f.banner ? <img src={f.banner} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-brand/40 to-gold/40" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] to-transparent" aria-hidden />
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl font-display text-lg font-bold text-white" style={{ background: f.logo_color }}>{f.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <p className="font-semibold">{store.name}</p>
                <p className="text-xs text-faint">/{store.slug} · seller: @{seller?.username}</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              {store.is_approved && <Button to={`/store/${store.slug}`} variant="ghost" size="sm">View public store</Button>}
              <BadgeStatus approved={store.is_approved} />
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <Field2 label="Store name" id="store-name" name="name" required value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Field2 label="Description" id="store-description" name="description" required textarea rows={4} value={f.description} onChange={(v) => setF({ ...f, description: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-semibold text-muted">Categories</span>
            <div className="flex flex-wrap gap-2">
              {['balochi-doch', 'traditional-clothing', 'handicrafts', 'jewelry', 'painters', 'calligraphy', 'traditional-food', 'balochi-herbs', 'writers', 'photographers', 'designers', 'handmade-products', 'cultural-products', 'decorative-items'].map((c) => {
                const on = f.category_slugs.includes(c)
                return (
                  <button key={c} type="button"
                    onClick={() => setF({ ...f, category_slugs: on ? f.category_slugs.filter((x) => x !== c) : [...f.category_slugs, c] })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-gold bg-gold/10 text-gold' : 'border-line text-muted hover:border-gold/40'}`}>
                    {c.replace(/-/g, ' ')}
                  </button>
                )
              })}
            </div>
          </label>
          <div className="space-y-5">
            <Field2 label="Location" id="store-location" name="location" required value={f.location} onChange={(v) => setF({ ...f, location: v })} />
            <Field2 label="WhatsApp (optional)" id="store-whatsapp" name="whatsapp" value={f.whatsapp_number} onChange={(v) => setF({ ...f, whatsapp_number: v })} />
            <p className="text-[0.7rem] text-faint">Order WhatsApp alerts are sent only after this number is verified by the platform and a WhatsApp Business integration is configured. Saving a number here does not verify it.</p>
            <fieldset>
              <legend className="mb-2 text-[0.8rem] font-semibold text-muted">Brand colour</legend>
              <div className="flex gap-2.5">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setF({ ...f, logo_color: c })} aria-label={`Colour ${c}`}
                    className={`h-9 w-9 rounded-full transition ${f.logo_color === c ? 'ring-2 ring-gold ring-offset-2 ring-offset-[var(--surface)]' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-[0.8rem] font-semibold text-muted">Banner image</legend>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {BANNERS.map((b) => (
              <button key={b} type="button" onClick={() => setF({ ...f, banner: b })} aria-label="Choose banner"
                className={`aspect-[4/3] overflow-hidden rounded-xl border-2 transition ${f.banner === b ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={b} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-4 border-t border-line pt-5">
          <Button type="submit" variant="primary">Save store profile</Button>
          {saved && <span className="text-sm text-emerald-500">Saved!</span>}
        </div>
      </div>
    </form>
  )
}

function Field2({ label, id, name, value, onChange, required, textarea, rows }: {
  label: string; id?: string; name?: string; value: string; onChange: (v: string) => void; required?: boolean; textarea?: boolean; rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] font-semibold text-muted">{label} {required && <span className="text-crimson">*</span>}</span>
      {textarea
        ? <textarea id={id} name={name} className="field resize-none" rows={rows ?? 3} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
        : <input id={id} name={name} className="field" value={value} onChange={(e) => onChange(e.target.value)} required={required} />}
    </label>
  )
}

function BadgeStatus({ approved }: { approved: boolean }) {
  return approved
    ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500"><Check size={13} /> Approved</span>
    : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">Under review</span>
}
