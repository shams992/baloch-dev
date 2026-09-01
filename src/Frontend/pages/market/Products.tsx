import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, PackageSearch, SlidersHorizontal } from 'lucide-react'
import { Button, CategoryIcon, EmptyState, PageHero, Reveal } from '@/components/ui'
import { ProductCard, SellerCard } from '@/components/shared/Market'
import { categories, products, stores, type ProductFilter } from '@/lib/db'
import { useDb } from '@/lib/providers'

/* ── /products — full marketplace listing ─────────────────────── */
export function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Marketplace"
        title={<>Browse every <span className="text-gradient">Balochi creation</span></>}
        sub="Products from verified stores across Balochistan and beyond — filter, sort and find the piece that speaks to you."
      />
      <ProductBrowser />
    </>
  )
}

/* ── /search?q= ───────────────────────────────────────────────── */
export function SearchPage() {
  const dbVersion = useDb()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const results = useMemo(() => products.list({ q }), [q, dbVersion])
  const storeHits = useMemo(() => {
    if (!q) return []
    const needle = q.toLowerCase()
    return stores.listApproved().filter(
      (s) => s.name.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle) || s.category_slugs.some((c) => c.includes(needle)),
    )
  }, [q, dbVersion])

  return (
    <>
      <PageHero
        eyebrow="Search"
        title={<>Results for <span className="text-gradient">“{q}”</span></>}
        sub={`${results.length} product${results.length === 1 ? '' : 's'} and ${storeHits.length} store${storeHits.length === 1 ? '' : 's'} matched your search.`}
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {storeHits.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-5 font-display text-xl font-semibold">Matching stores</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {storeHits.map((s) => <SellerCard key={s.id} store={s} />)}
              </div>
            </div>
          )}
          <h2 className="mb-5 font-display text-xl font-semibold">Products</h2>
          {results.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={26} />}
              title="No products matched"
              sub={`Nothing found for “${q}”. Try a different word, or browse the categories.`}
              action={<Button to="/categories" variant="gold" size="sm">Browse categories</Button>}
            />
          ) : (
            <ProductBrowser initialQuery={q} hideWhenQuery />
          )}
        </div>
      </section>
    </>
  )
}

/* ── /category/:slug ──────────────────────────────────────────── */
export function CategoryPage() {
  useDb()
  const { slug = '' } = useParams()
  const cat = categories.bySlug(slug)
  if (!cat) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 pt-16 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">Category not found</h1>
          <Button to="/categories" variant="gold" className="mt-6">See all categories</Button>
        </div>
      </div>
    )
  }
  return (
    <>
      <PageHero eyebrow="Category" title={cat.name} sub={cat.description}>
        <nav className="breadcrumbs text-xs text-faint" aria-label="Breadcrumb">
          <Link to="/categories" className="hover:text-gold">Categories</Link>
          <ChevronRight size={12} className="mx-1 inline" />
          <span className="text-fg">{cat.name}</span>
        </nav>
      </PageHero>
      <ProductBrowser fixedCategory={slug} />
    </>
  )
}

/* ── shared filterable browser ────────────────────────────────── */
export function ProductBrowser({ initialQuery = '', fixedCategory, hideWhenQuery }: { initialQuery?: string; fixedCategory?: string; hideWhenQuery?: boolean }) {
  const dbVersion = useDb()
  const [q, setQ] = useState(initialQuery)
  const [cat, setCat] = useState(fixedCategory ?? '')
  const [sort, setSort] = useState<ProductFilter['sort']>('featured')
  const [maxPrice, setMaxPrice] = useState<number>(50000)
  const [minRating, setMinRating] = useState(0)
  const [inStock, setInStock] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const list = useMemo(() => products.list({
    q: q || undefined,
    category: cat || undefined,
    sort, maxPrice, minRating: minRating || undefined, inStock,
  }), [q, cat, sort, maxPrice, minRating, inStock, dbVersion])

  const cats = categories.list()

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-3 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          {/* filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="card space-y-6 p-5 lg:sticky lg:top-24">
              <div>
                <label htmlFor="filter-q" className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-faint">Search</label>
                <input id="filter-q" name="q" className="field" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>

              {!fixedCategory && (
                <div>
                  <label htmlFor="filter-cat" className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-faint">Category</label>
                  <select id="filter-cat" name="category" className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
                    <option value="">All categories</option>
                    {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="filter-price" className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-faint">
                  Max price · <span className="text-fg tnum">Rs {maxPrice.toLocaleString()}</span>
                </label>
                <input id="filter-price" name="max_price" type="range" min={500} max={50000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              </div>

              <div>
                <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-wider text-faint">Rating</span>
                <div className="flex flex-wrap gap-2">
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r} onClick={() => setMinRating(r)}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${minRating === r ? 'border-gold bg-gold/10 text-gold' : 'border-line text-muted hover:border-gold/40'}`}
                    >
                      {r === 0 ? 'All' : `${r}★+`}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                In stock only
                <input id="filter-stock" name="in_stock" type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
              </label>

              <button
                onClick={() => { setQ(''); setCat(fixedCategory ?? ''); setSort('featured'); setMaxPrice(50000); setMinRating(0); setInStock(false) }}
                className="w-full rounded-xl border border-line py-2 text-xs font-semibold text-muted transition hover:border-gold/50 hover:text-gold"
              >
                Reset filters
              </button>
            </div>
          </aside>

          {/* results */}
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted tnum">
                <span className="font-bold text-fg">{list.length}</span> product{list.length === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters((s) => !s)} className="btn btn-ghost px-4 py-2 text-xs lg:hidden" aria-expanded={showFilters}>
                  <SlidersHorizontal size={14} /> Filters
                </button>
                <label htmlFor="sort" className="sr-only">Sort products</label>
                <select id="sort" name="sort" className="field max-w-[10.5rem] !py-2 text-xs sm:!w-auto" value={sort} onChange={(e) => setSort(e.target.value as ProductFilter['sort'])}>
                  <option value="featured">Featured</option>
                  <option value="new">Newest</option>
                  <option value="rating">Top rated</option>
                  <option value="price-asc">Price: low → high</option>
                  <option value="price-desc">Price: high → low</option>
                </select>
              </div>
            </div>

            {list.length === 0 ? (
              <EmptyState
                icon={<PackageSearch size={26} />}
                title="No products match these filters"
                sub="Try widening the price range or clearing the category."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 6) * 0.05}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── /sellers ─────────────────────────────────────────────────── */
export function SellersPage() {
  useDb()
  const list = stores.listApproved()
  return (
    <>
      <PageHero
        eyebrow="Stores"
        title={<>Meet the <span className="text-gradient">creators</span></>}
        sub="Every store is run by a verified Balochi creator. Visit a store to see its story, catalogue and reviews."
      />
      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * 0.06}>
              <SellerCard store={s} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
