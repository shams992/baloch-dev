import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BadgeCheck, Heart, MapPin, MessageCircle, Minus, Package, Plus, ShieldCheck,
  ShoppingBag, Star, Truck, User,
} from 'lucide-react'
import { Badge, Button, CategoryIcon, EmptyState, Field, Modal, Reveal, StarRating } from '@/components/ui'
import { ProductCard } from '@/components/shared/Market'
import { cart, categories, messaging, orders, products, reviews as reviewsApi, stores, users, wishlist } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { formatDate, formatMoney } from '@/lib/util'

export function ProductPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const dbVersion = useDb()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [askOpen, setAskOpen] = useState(false)
  const [ask, setAsk] = useState('Salaam! Is this piece available?')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const product = products.byId(id)
  const list = useMemo(() => (product ? reviewsApi.byProduct(product.id) : []), [product?.id, product, dbVersion])

  if (!product) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 pt-16">
        <EmptyState icon={<Package size={26} />} title="Product not found"
          sub="It may have been removed by its seller." action={<Button to="/products" variant="gold" size="sm">Browse marketplace</Button>} />
      </div>
    )
  }

  const store = stores.byId(product.store_id)!
  const seller = users.byId(product.seller_id)
  const cat = categories.bySlug(product.category_slug)
  const related = products.list({ category: product.category_slug, sort: 'rating' }).filter((p) => p.id !== product.id).slice(0, 4)
  const wished = user ? wishlist.has(user.id, product.id) : false
  const canReview = user ? reviewsApi.canReview(user.id, product.id) : false
  const deliveredOrder = user ? orders.listByBuyer(user.id).find((o) => o.items.some((i) => i.product_id === product.id && ['reached_to_buyer', 'delivered'].includes(i.status))) : undefined

  const addToCart = () => {
    if (!user) return navigate('/login', { state: { from: `/product/${product.id}` } })
    cart.add(user.id, product.id, qty)
    navigate('/cart')
  }

  const buyNow = () => {
    if (!user) return navigate('/login', { state: { from: `/product/${product.id}` } })
    cart.add(user.id, product.id, qty)
    navigate('/checkout')
  }

  const sendAsk = () => {
    if (!user) return navigate('/login', { state: { from: `/product/${product.id}` } })
    messaging.start({ buyerId: user.id, sellerId: product.seller_id, productId: product.id, storeId: product.store_id, body: ask })
    setAskOpen(false)
    navigate('/dashboard/messages')
  }

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !reviewText.trim()) return
    reviewsApi.create({ productId: product.id, buyer: user, rating: reviewRating, comment: reviewText })
    setReviewOpen(false)
    setReviewText('')
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <nav className="mb-7 flex flex-wrap items-center gap-1.5 text-xs text-faint" aria-label="Breadcrumb">
          <Link to="/products" className="hover:text-gold">Marketplace</Link> <span>/</span>
          <Link to={`/category/${product.category_slug}`} className="hover:text-gold">{cat?.name}</Link> <span>/</span>
          <span className="text-fg">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* image */}
          <div>
            <div className="card relative aspect-[4/3] overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand/15 via-surface-2 to-gold/15 text-brand dark:text-gold">
                  <CategoryIcon name={cat?.icon ?? 'Shapes'} size={110} />
                </div>
              )}
              {product.condition === 'handmade' && (
                <span className="absolute left-4 top-4"><Badge tone="gold">✦ Handmade by the seller</Badge></span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-center text-[0.72rem] text-muted sm:grid-cols-3">
              <p className="card flex items-center justify-center gap-2 p-3"><ShieldCheck size={15} className="shrink-0 text-brand dark:text-gold" /> Buyer protection</p>
              <p className="card flex items-center justify-center gap-2 p-3"><Truck size={15} className="shrink-0 text-brand dark:text-gold" /> {product.shipping_days}</p>
              <p className="card flex items-center justify-center gap-2 p-3"><BadgeCheck size={15} className="shrink-0 text-brand dark:text-gold" /> Verified store</p>
            </div>
          </div>

          {/* details */}
          <div>
            <Link to={`/store/${store.slug}`} className="group inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${store.logo_color}, ${store.logo_color}bb)` }}>
                {store.logo_initials}
              </span>
              <span>
                <span className="block text-sm font-semibold transition group-hover:text-gold">{store.name}</span>
                <span className="flex items-center gap-1 text-xs text-faint"><MapPin size={11} /> {store.location} · <StarRating rating={store.rating} size={11} /></span>
              </span>
            </Link>

            <h1 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <StarRating rating={product.rating} count={product.review_count} size={16} />
              <span className="text-xs text-faint tnum">{product.sold} sold</span>
              {product.stock > 0
                ? <Badge tone="green">{product.stock} in stock</Badge>
                : <Badge tone="red">Out of stock</Badge>}
            </div>

            <p className="mt-5 font-display text-3xl font-semibold tnum sm:text-4xl">
              {formatMoney(product.price, product.currency)}
              <span className="ml-2 align-middle text-xs font-normal text-faint">+ {formatMoney(product.shipping_fee, product.currency)} shipping</span>
            </p>

            <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-relaxed text-muted">{product.description}</p>

            {product.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">#{t}</span>
                ))}
              </div>
            )}

            {/* purchase panel */}
            <div className="card mt-7 space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center rounded-xl border border-line">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-10 place-items-center text-muted hover:text-fg disabled:opacity-40" disabled={qty <= 1} aria-label="Decrease quantity"><Minus size={15} /></button>
                  <span className="w-10 text-center font-semibold tnum" aria-live="polite">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} className="grid h-11 w-10 place-items-center text-muted hover:text-fg disabled:opacity-40" disabled={qty >= product.stock} aria-label="Increase quantity"><Plus size={15} /></button>
                </div>
                <p className="text-sm text-muted">Total: <strong className="text-fg tnum">{formatMoney(product.price * qty, product.currency)}</strong></p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={addToCart} variant="primary" className="flex-1" disabled={product.stock === 0}>
                  <ShoppingBag size={17} /> Add to cart
                </Button>
                <Button onClick={buyNow} variant="gold" className="flex-1" disabled={product.stock === 0}>Buy now</Button>
                <Button onClick={() => (user ? wishlist.toggle(user.id, product.id) : navigate('/login'))} variant="ghost" ariaLabel="Toggle wishlist"
                  className="!px-4">
                  <Heart size={17} className={wished ? 'fill-crimson text-crimson' : ''} />
                </Button>
              </div>
              <Button onClick={() => setAskOpen(true)} variant="ghost" className="w-full">
                <MessageCircle size={16} /> Message the seller
              </Button>
              <p className="text-center text-[0.7rem] text-faint">
                Secure in-platform checkout · order tracked from studio to door
              </p>
            </div>
          </div>
        </div>

        {/* reviews */}
        <section className="mt-16" aria-labelledby="reviews">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="reviews" className="font-display text-2xl font-semibold">Reviews ({list.length})</h2>
            {canReview && (
              <Button variant="gold" size="sm" onClick={() => setReviewOpen(true)}>
                <Star size={14} /> Write a review
              </Button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No reviews yet — verified buyers who receive this piece can be the first.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {list.map((r, i) => (
                <Reveal key={r.id} delay={(i % 4) * 0.06}>
                  <article className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-brand dark:text-gold"><User size={15} /></span>
                        <span>
                          <span className="block text-sm font-semibold">{r.buyer_name}</span>
                          <span className="block text-[0.68rem] text-faint">{formatDate(r.created_at)}</span>
                        </span>
                      </span>
                      <StarRating rating={r.rating} size={13} />
                    </div>
                    <p className="mt-3.5 text-sm leading-relaxed text-muted">{r.comment}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
          {deliveredOrder && !canReview && (
            <p className="mt-4 text-xs text-faint">You already reviewed this product — thank you!</p>
          )}
        </section>

        {/* related */}
        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related">
            <h2 id="related" className="font-display text-2xl font-semibold">More from {cat?.name}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* message seller modal */}
      <Modal open={askOpen} onClose={() => setAskOpen(false)} title={`Message ${store.name}`}>
        <p className="text-sm text-muted">Ask about availability, custom options or delivery — conversations stay on the platform for your safety.</p>
        <textarea id="ask-message" name="message" className="field mt-4" rows={4} value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Your message" />
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setAskOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={sendAsk}>Send message</Button>
        </div>
      </Modal>

      {/* review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Write a review">
        <form onSubmit={submitReview} className="space-y-4">
          <p className="text-sm text-muted">You received this product in order {deliveredOrder?.code} — your honest review helps the maker and future buyers.</p>
          <Field label="Your rating">
            <StarRating rating={reviewRating} interactive size={26} onChange={setReviewRating} />
          </Field>
          <Field label="Your review" required>
            <textarea id="review-text" name="review" className="field" rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="How was the piece, the packing, the delivery?" required />
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gold">Publish review</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
