import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, MapPin, MessageCircle, Package, Star } from 'lucide-react'
import { Badge, Button, EmptyState, Modal, Reveal, StarRating } from '@/components/ui'
import { ProductCard } from '@/components/shared/Market'
import { messaging, products, reviews as reviewsApi, stores } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatDate } from '@/lib/util'

/* ── /store/:slug — public storefront ─────────────────────────── */
export function StorePage() {
  const { slug = '' } = useParams()
  const store = stores.bySlug(slug)
  const { user } = useAuth()
  const navigate = useNavigate()
  useDb()
  const [tab, setTab] = useState<'seller' | 'products' | 'reviews'>('products')
  const [askOpen, setAskOpen] = useState(false)
  const [ask, setAsk] = useState('Salaam — I’d like to know more about your store.')

  if (!store || !store.is_approved) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 pt-16">
        <EmptyState icon={<Package size={26} />} title="Store not found"
          sub="This store doesn’t exist or isn’t live yet." action={<Button to="/sellers" variant="gold" size="sm">Browse stores</Button>} />
      </div>
    )
  }

  const list = products.list({ storeId: store.id }).filter((p) => p.status === 'active')
  const featured = [...list].sort((a, b) => b.sold - a.sold)
  const storeReviews = reviewsApi.listAll().filter((r) => r.is_approved && products.list({ storeId: store.id }).some((p) => p.id === r.product_id))
  const isOwn = user?.id === store.seller_id

  const sendAsk = () => {
    if (!user) return navigate('/login', { state: { from: `/store/${store.slug}` } })
    if (!ask.trim()) return
    messaging.start({ buyerId: user.id, sellerId: store.seller_id, storeId: store.id, body: ask.trim() })
    setAskOpen(false)
    navigate('/dashboard/messages')
  }

  return (
    <>
      <header className="relative overflow-hidden pt-16">
        <div className="relative h-56 sm:h-72">
          {store.banner ? (
            <img src={store.banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand/40 via-surface-2 to-gold/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" aria-hidden />
        </div>

        <div className="relative mx-auto -mt-16 max-w-7xl px-5 sm:px-8">
          <div className="card p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                {store.logo_url ? (
                  <img src={store.logo_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-xl" />
                ) : (
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${store.logo_color}, ${store.logo_color}bb)` }}>
                    {store.logo_initials}
                  </span>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl font-semibold tracking-tight">{store.name}</h1>
                    {store.is_approved && <Badge tone="brand"><BadgeCheck size={13} /> Verified store</Badge>}
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin size={13} /> {store.location}</span>
                    <span className="inline-flex items-center gap-1"><Star size={13} className="fill-gold text-gold" /> {store.rating || '—'} store rating</span>
                    <span className="inline-flex items-center gap-1"><Package size={13} /> {list.length} products</span>
                  </p>
                  <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-muted">{store.description}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {isOwn ? (
                  <Button to="/seller/store-profile" variant="ghost" size="sm">Edit store</Button>
                ) : (
                  <Button onClick={() => (user ? setAskOpen(true) : navigate('/login', { state: { from: `/store/${store.slug}` } }))} variant="gold" size="sm">
                    <MessageCircle size={15} /> Message Seller
                  </Button>
                )}
                <p className="text-center text-[0.68rem] text-faint tnum">{store.total_sales}+ sales</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
              {store.category_slugs.map((c) => (
                <Link key={c} to={`/category/${c}`} className="rounded-full border border-line px-3 py-1 text-xs font-medium capitalize text-muted transition hover:border-gold/50 hover:text-gold">
                  {c.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {([
                ['seller', 'View Seller'],
                ['products', 'View Products'],
                ['reviews', 'View Reviews'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-gold text-[#241a04]' : 'border border-line text-muted hover:text-fg'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {tab === 'seller' && (
            <div className="card max-w-3xl space-y-3 p-7">
              <h2 className="font-display text-2xl font-semibold">{store.name}</h2>
              <p className="text-sm text-muted">{store.description || 'This maker hasn’t added a longer story yet.'}</p>
              <p className="text-sm text-muted"><MapPin size={13} className="mr-1 inline" /> {store.location || 'Location not listed'}</p>
              <p className="text-sm text-muted">{store.total_sales}+ sales · {storeReviews.length} review{storeReviews.length === 1 ? '' : 's'}</p>
              {!isOwn && (
                <Button onClick={() => (user ? setAskOpen(true) : navigate('/login', { state: { from: `/store/${store.slug}` } }))} variant="primary" size="sm" className="mt-2">
                  <MessageCircle size={15} /> Message Seller
                </Button>
              )}
            </div>
          )}

          {tab === 'products' && (
            <>
              <h2 className="mb-6 font-display text-2xl font-semibold">Products</h2>
              {featured.length === 0 ? (
                <EmptyState icon={<Package size={26} />} title="No products yet" sub="This store is just getting started." />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {featured.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 0.05}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'reviews' && (
            <>
              <h2 className="mb-6 font-display text-2xl font-semibold">Reviews ({storeReviews.length})</h2>
              {storeReviews.length === 0 ? (
                <p className="text-sm text-muted">No public reviews yet for this store.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {storeReviews.map((r, i) => {
                    const product = products.byId(r.product_id)
                    return (
                      <Reveal key={r.id} delay={(i % 4) * 0.05}>
                        <article className="card p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              <span className="block text-sm font-semibold">{r.buyer_name}</span>
                              {product && <Link to={`/product/${product.id}`} className="text-xs text-faint hover:text-gold">{product.name}</Link>}
                            </span>
                            <StarRating rating={r.rating} size={13} />
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-muted">{r.comment}</p>
                          <p className="mt-2 text-[0.68rem] text-faint">{formatDate(r.created_at)}</p>
                        </article>
                      </Reveal>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Modal open={askOpen} onClose={() => setAskOpen(false)} title={`Message ${store.name}`}>
        <p className="text-sm text-muted">Conversations stay on the platform for your safety. Only public store details are shown here.</p>
        <textarea id="store-message" name="message" className="field mt-4" rows={4} value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Your message" />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setAskOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={sendAsk} disabled={!ask.trim()}>Send message</Button>
        </div>
      </Modal>
    </>
  )
}

/* ── /seller/:id — resolves a seller id to their public store ──── */
export function StoreBySellerPage() {
  const { id = '' } = useParams()
  const store = stores.bySeller(id) ?? stores.byId(id)
  if (store) return <Navigate to={`/store/${store.slug}`} replace />
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 pt-16">
      <EmptyState icon={<Package size={26} />} title="Seller not found"
        action={<Button to="/sellers" variant="gold" size="sm">Browse stores</Button>} />
    </div>
  )
}
