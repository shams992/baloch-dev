import { Link, useNavigate } from 'react-router-dom'
import { Heart, MapPin, ShoppingBag } from 'lucide-react'
import type { Product, Store } from '@/lib/types'
import { cart, categories, stores, wishlist } from '@/lib/db'
import { useAuth } from '@/lib/providers'
import { cn, formatMoney } from '@/lib/util'
import { Avatar, Badge, CategoryIcon, StarRating } from '@/components/ui'

/* ── Product card ─────────────────────────────────────────────── */
export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const store = stores.byId(product.store_id)
  const cat = categories.bySlug(product.category_slug)
  const wished = user ? wishlist.has(user.id, product.id) : false

  return (
    <article
      className={cn(
        'group card relative flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)]',
        className,
      )}
    >
      <Link to={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-2" aria-label={product.name}>
        {product.image ? (
          <img
            src={product.image} alt={product.name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand/15 via-surface-2 to-gold/15 text-brand dark:text-gold">
            <span className="animate-floaty"><CategoryIcon name={cat?.icon ?? 'Shapes'} size={54} /></span>
          </span>
        )}
        <span className="absolute left-3 top-3">
          {product.condition === 'handmade' && <Badge tone="gold">✦ Handmade</Badge>}
          {product.stock === 0 && <Badge tone="red">Out of stock</Badge>}
          {product.stock > 0 && product.stock <= 3 && <Badge tone="red">Only {product.stock} left</Badge>}
        </span>
      </Link>

      {user && (
        <button
          onClick={() => wishlist.toggle(user.id, product.id)}
          className={cn(
            'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition-all',
            wished ? 'bg-crimson text-white' : 'bg-black/35 text-white/90 hover:bg-black/55',
          )}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} className={wished ? 'fill-current' : ''} />
        </button>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[0.7rem] text-faint">
          {store && (
            <Link to={`/store/${store.slug}`} className="truncate font-semibold transition hover:text-gold">
              {store.name}
            </Link>
          )}
          <span className="ml-auto inline-flex items-center gap-0.5"><MapPin size={11} /> {product.location}</span>
        </div>
        <Link to={`/product/${product.id}`} className="line-clamp-2 font-medium leading-snug transition group-hover:text-brand dark:group-hover:text-gold">
          {product.name}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <StarRating rating={product.rating} count={product.review_count} size={13} />
          {product.sold > 0 && <span className="text-[0.68rem] text-faint tnum">{product.sold} sold</span>}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <p className="font-display text-lg font-semibold tnum">{formatMoney(product.price, product.currency)}</p>
            <p className="text-[0.68rem] text-faint">+ {formatMoney(product.shipping_fee)} shipping</p>
          </div>
          <button
            onClick={() => (user ? cart.add(user.id, product.id) : navigate('/login', { state: { from: '/products' } }))}
            disabled={product.stock === 0}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand text-onbrand shadow-lg shadow-brand/30 transition hover:scale-110 disabled:opacity-40"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

/* ── Decorative octagram glyph (empty-state art) ──────────────── */
export function PatternGlyph({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="opacity-70">
      <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="1.4" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

/* ── Seller / store card ──────────────────────────────────────── */
export function SellerCard({ store }: { store: Store }) {
  return (
    <Link
      to={`/store/${store.slug}`}
      className="group card relative flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)]"
    >
      <div className="relative h-28 overflow-hidden">
        {store.banner ? (
          <img src={store.banner} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand/30 via-surface-2 to-gold/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>
      <div className="-mt-8 flex flex-1 flex-col px-5 pb-5">
        {store.logo_url ? (
          <img src={store.logo_url} alt="" className="h-[52px] w-[52px] rounded-full object-cover ring-4 ring-[var(--surface)]" />
        ) : (
          <Avatar name={store.logo_initials || store.name} color={store.logo_color} size={52} className="ring-4 ring-[var(--surface)]" />
        )}
        <h3 className="mt-3 font-display text-lg font-semibold transition group-hover:text-brand dark:group-hover:text-gold">{store.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-faint"><MapPin size={11} /> {store.location}</p>
        <p className="mt-2.5 line-clamp-2 text-[0.82rem] leading-relaxed text-muted">{store.description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <StarRating rating={store.rating} size={13} />
          <span className="text-xs font-semibold text-faint tnum">{store.total_sales}+ sales</span>
        </div>
        {store.category_slugs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {store.category_slugs.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.62rem] font-medium capitalize text-muted">
                {c.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
