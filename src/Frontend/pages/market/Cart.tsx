import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Heart, MapPin, Minus, Package, Plus,
  ShieldCheck, ShoppingBag, Trash2, Truck, Wallet, Building2, Smartphone,
} from 'lucide-react'
import { Button, EmptyState, Field, Reveal } from '@/components/ui'
import { ProductCard } from '@/components/shared/Market'
import { addresses as addrApi, cart as cartApi, orders, storage, wishlist } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatMoney, paymentMethodLabel } from '@/lib/util'
import type { Address, PaymentMethod } from '@/lib/types'
import { PAYMENT_METHODS } from '@/lib/types'

/* ── /cart ────────────────────────────────────────────────────── */
export function CartPage() {
  const { user } = useAuth()
  useDb()
  const navigate = useNavigate()
  if (!user) return <GuardLogin />
  const items = cartApi.list(user.id)
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0)
  const shipping = items.length * 250

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 pt-24 sm:px-8">
      <h1 className="font-display text-3xl font-semibold">Your cart</h1>
      <p className="mt-1.5 text-sm text-muted">{items.length} item{items.length === 1 ? '' : 's'} from {new Set(items.map((i) => i.product.store_id)).size} store(s)</p>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<ShoppingBag size={26} />} title="Your cart is empty"
            sub="Fill it with embroidery, silver, tea or art." action={<Button to="/products" variant="gold" size="sm">Browse marketplace</Button>} />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <ul className="space-y-4">
            {items.map(({ product, qty }) => (
              <li key={product.id} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
                <Link to={`/product/${product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-24 sm:w-24">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    : <span className="grid h-full w-full place-items-center text-faint"><Package size={22} /></span>}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/product/${product.id}`} className="line-clamp-2 font-medium hover:text-gold">{product.name}</Link>
                  <p className="mt-0.5 text-xs text-faint">Ships in {product.shipping_days} · {product.location}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center rounded-xl border border-line">
                      <button onClick={() => cartApi.setQty(user.id, product.id, qty - 1)} className="grid h-9 w-9 place-items-center text-muted hover:text-fg disabled:opacity-40" disabled={qty <= 1} aria-label="Decrease"><Minus size={13} /></button>
                      <span className="w-8 text-center text-sm font-semibold tnum">{qty}</span>
                      <button onClick={() => cartApi.setQty(user.id, product.id, qty + 1)} className="grid h-9 w-9 place-items-center text-muted hover:text-fg disabled:opacity-40" disabled={qty >= product.stock} aria-label="Increase"><Plus size={13} /></button>
                    </div>
                    <p className="font-display text-lg font-semibold tnum">{formatMoney(product.price * qty, product.currency)}</p>
                    <button onClick={() => cartApi.remove(user.id, product.id)} className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-faint transition hover:bg-rose-500/10 hover:text-rose-500" aria-label={`Remove ${product.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold">Summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold tnum">{formatMoney(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="font-semibold tnum">{formatMoney(shipping)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold tnum">{formatMoney(subtotal + shipping)}</dd></div>
            </dl>
            <Button to="/checkout" variant="gold" className="w-full" size="lg">Proceed to checkout <ArrowRight size={16} /></Button>
            <Button to="/products" variant="ghost" className="w-full" size="sm">Continue shopping</Button>
            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-faint"><ShieldCheck size={13} className="text-brand dark:text-gold" /> Protected by buyer protection</p>
          </aside>
        </div>
      )}
    </div>
  )
}

/* ── /wishlist ────────────────────────────────────────────────── */
export function WishlistPage() {
  const { user } = useAuth()
  useDb()
  if (!user) return <GuardLogin />
  const items = wishlist.list(user.id)
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 pt-24 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Wishlist</h1>
          <p className="mt-1.5 text-sm text-muted">Pieces you’re dreaming about — kept safely here.</p>
        </div>
        <Button to="/products" variant="ghost" size="sm">Discover more</Button>
      </div>
      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Heart size={26} />} title="Nothing saved yet"
            sub="Tap the heart on any product to save it." action={<Button to="/products" variant="gold" size="sm">Browse marketplace</Button>} />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── /checkout ────────────────────────────────────────────────── */
export function CheckoutPage() {
  const { user } = useAuth()
  useDb()
  const navigate = useNavigate()
  const [method, setMethod] = useState<PaymentMethod>('cod')
  const [placing, setPlacing] = useState(false)
  const [showAddr, setShowAddr] = useState(false)
  const [proof, setProof] = useState<File | null>(null)
  const [newAddr, setNewAddr] = useState<Omit<Address, 'id' | 'user_id'>>({ label: '', full_name: '', phone: '', line1: '', city: '', state: '', country: 'Pakistan', is_default: false })

  if (!user) return <GuardLogin />
  const items = cartApi.list(user.id)
  const addrList = addrApi.list(user.id)
  const selected = addrList.find((a) => a.is_default) ?? addrList[0]
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0)
  const shipping = items.length * 250
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-24">
        <EmptyState icon={<ShoppingBag size={26} />} title="Nothing to check out"
          sub="Your cart is empty." action={<Button to="/products" variant="gold" size="sm">Browse marketplace</Button>} />
      </div>
    )
  }

  const saveAddr = (e: React.FormEvent) => {
    e.preventDefault()
    addrApi.save(user.id, newAddr)
    setShowAddr(false)
  }

  const place = async () => {
    if (!selected) { setShowAddr(true); return }
    setPlacing(true)
    try {
      const order = await orders.place({
        buyer: user, address: selected,
        items: items.map((i) => ({ product: i.product, qty: i.qty })),
        payment_method: method,
      })
      if (method === 'bank_transfer' && proof) {
        try { await storage.uploadPaymentProof(proof, user.id, order.id) } catch { /* proof can be uploaded later */ }
      }
      navigate(`/order/${order.code}`, { replace: true })
    } catch (e: any) {
      console.error('[checkout] place order failed', e)
      alert("We couldn't place your order. Please try again."); setPlacing(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-8">
      <h1 className="font-display text-3xl font-semibold">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* address */}
          <section className="card p-6" aria-labelledby="co-address">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="co-address" className="flex items-center gap-2 font-display text-lg font-semibold"><MapPin size={17} className="text-gold" /> Delivery address</h2>
              <button onClick={() => setShowAddr((s) => !s)} className="text-sm font-semibold text-brand hover:underline dark:text-gold">
                {showAddr ? 'Cancel' : '+ Add address'}
              </button>
            </div>
            {selected && !showAddr ? (
              <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                <p className="font-semibold">{selected.label} — {selected.full_name}</p>
                <p className="mt-1 text-muted">{selected.line1}, {selected.city}, {selected.state}, {selected.country}</p>
                <p className="mt-1 text-muted">{selected.phone}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No address saved yet — add one to continue.</p>
            )}
            {addrList.length > 1 && !showAddr && (
              <ul className="mt-3 space-y-2">
                {addrList.filter((a) => a.id !== selected?.id).map((a) => (
                  <li key={a.id}>
                    <button onClick={() => addrApi.setDefault(user.id, a.id)} className="w-full rounded-xl border border-line px-4 py-3 text-left text-sm transition hover:border-gold/50">
                      <span className="font-semibold">{a.label}</span> <span className="text-muted">— {a.line1}, {a.city}</span>
                      <span className="ml-2 text-xs text-gold">use this</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showAddr && (
              <form onSubmit={saveAddr} className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Label" required><input id="checkout-addr-label" name="label" className="field" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="Home" required /></Field>
                <Field label="Full name" required><input id="checkout-addr-name" name="full_name" className="field" value={newAddr.full_name} onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })} required /></Field>
                <Field label="Phone" required><input id="checkout-addr-phone" name="phone" className="field" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" required /></Field>
                <Field label="City" required><input id="checkout-addr-city" name="city" className="field" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} required /></Field>
                <Field label="Address line" required><input id="checkout-addr-line1" name="line1" className="field sm:col-span-2" value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} required /></Field>
                <Field label="Province / State" required><input id="checkout-addr-state" name="state" className="field" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} required /></Field>
                <Field label="Country" required><input id="checkout-addr-country" name="country" className="field" value={newAddr.country} onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value })} required /></Field>
                <Button type="submit" variant="primary" className="sm:col-span-2">Save address</Button>
              </form>
            )}
          </section>

          {/* payment */}
          <section className="card p-6" aria-labelledby="co-payment">
            <h2 id="co-payment" className="flex items-center gap-2 font-display text-lg font-semibold"><Wallet size={17} className="text-gold" /> Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${method === m.id ? 'border-gold bg-gold/5' : 'border-line hover:border-gold/40'}`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${method === m.id ? 'bg-gold text-white' : 'bg-surface-2 text-muted'}`}>
                    {m.id === 'cod' ? <Truck size={18} /> : m.id === 'bank_transfer' ? <Building2 size={18} /> : m.id === 'easypaisa' || m.id === 'jazzcash' || m.id === 'sadapay' ? <Smartphone size={18} /> : <Wallet size={18} />}
                  </span>
                  <span><span className="block text-sm font-semibold">{m.label}</span><span className="block text-xs text-faint">{m.sub}</span></span>
                </button>
              ))}
            </div>
            {method === 'bank_transfer' && (
              <div className="mt-4 space-y-2 rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
                <p>Transfer the order total to the platform bank account, then upload a screenshot of the receipt. Your order stays <strong>pending</strong> until an admin confirms the transfer.</p>
                <p>Account title: Baloch Export Hub · Bank: (add in admin settings) · Use your order code as the reference.</p>
                <label className="block pt-1">
                  <span className="mb-1 block font-semibold">Payment proof (optional now)</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}
            {(method === 'easypaisa' || method === 'jazzcash' || method === 'sadapay') && (
              <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
                {paymentMethodLabel(method)} checkout requires merchant credentials. Your order will be created with payment <strong>pending</strong> and will not be marked paid from this page.
              </p>
            )}
            {method === 'cod' && (
              <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
                Cash on delivery: pay the courier. Payment status stays pending until the seller marks the order delivered.
              </p>
            )}
            {method !== 'bank_transfer' && method !== 'easypaisa' && method !== 'jazzcash' && method !== 'sadapay' && method !== 'cod' && (
              <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
                Payments are processed inside the platform — never transfer money to a seller directly.
              </p>
            )}
          </section>

          {/* review */}
          <section className="card p-6" aria-labelledby="co-review">
            <h2 id="co-review" className="font-display text-lg font-semibold">Review items ({items.length})</h2>
            <ul className="mt-4 space-y-3">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-3 text-sm">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-faint"><Package size={14} /></span>}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{product.name}</span><span className="text-xs text-faint">Qty {qty}</span></span>
                  <span className="font-semibold tnum">{formatMoney(product.price * qty, product.currency)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* summary */}
        <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold">Order total</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tnum">{formatMoney(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="tnum">{formatMoney(shipping)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold tnum">{formatMoney(total)}</dd></div>
          </dl>
          <Button onClick={place} variant="gold" className="w-full" size="lg" disabled={placing || !selected}>
            {placing ? 'Placing order…' : <>Place order <CheckCircle2 size={16} /></>}
          </Button>
          <p className="text-center text-[0.7rem] text-faint">By placing an order you agree to our <Link to="/refund-policy" className="underline">Refund Policy</Link>.</p>
        </aside>
      </div>
    </div>
  )
}

/* ── /order/:code — confirmation ──────────────────────────────── */
export function OrderConfirmPage() {
  const { code = '' } = useParams()
  const { user } = useAuth()
  useDb()
  useEffect(() => { void orders.reload() }, [])
  if (!user) return <GuardLogin />
  const order = orders.byId(code)
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-24">
        <EmptyState icon={<Package size={26} />} title="Order not found" action={<Button to="/dashboard/orders" variant="gold" size="sm">My orders</Button>} />
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
      <Reveal>
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-[#0a3733] p-8 text-center text-onbrand dark:from-gold dark:to-[#8a5a0f] dark:text-white">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/15"><CheckCircle2 size={30} /></span>
            <h1 className="font-display text-2xl font-semibold">Shukriya! Order confirmed</h1>
            <p className="mt-2 text-sm opacity-85">Order <strong className="tnum">{order.code}</strong> · {formatMoney(order.total)}</p>
          </div>
          <div className="p-7">
            <ol className="space-y-4">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.name}</span><span className="text-xs text-faint">Qty {i.qty} · {i.status}</span></span>
                  <span className="tnum">{formatMoney(i.price * i.qty)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-2xl bg-surface-2 p-4 text-sm">
              <p className="font-semibold">Delivering to</p>
              <p className="mt-1 text-muted">{order.address.full_name} · {order.address.phone}</p>
              <p className="text-muted">{order.address.line1}, {order.address.city}, {order.address.state}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button to="/dashboard/orders" variant="primary" className="flex-1">Track this order</Button>
              <Button to="/products" variant="ghost" className="flex-1">Keep exploring</Button>
            </div>
            <p className="mt-5 text-center text-xs text-faint">
              {paymentMethodLabel(order.payment_method)} · {order.payment === 'paid' ? 'Paid' : 'Payment pending'}. Sellers confirm every step — you’ll be notified along the way.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

function GuardLogin() {
  return (
    <div className="mx-auto max-w-lg px-5 pb-20 pt-28 text-center">
      <EmptyState icon={<ShieldCheck size={26} />} title="Please sign in"
        sub="This area belongs to your account." action={<Button to="/login" variant="gold" size="sm">Login or register</Button>} />
    </div>
  )
}
