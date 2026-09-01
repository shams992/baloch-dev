import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ImagePlus, Loader2, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, Field, StarRating } from '@/components/ui'
import { categories, products, storage } from '@/lib/db'
import { useDb } from '@/lib/providers'
import { formatDate, formatMoney } from '@/lib/util'
import type { Product } from '@/lib/types'
import { NoStore, useSellerStore } from './SellerCenter'

const GALLERY = [
  '/images/doch-closeup.jpg', '/images/cat-clothing.jpg', '/images/cat-painting.jpg',
  '/images/cat-calligraphy.jpg', '/images/cat-jewelry.jpg', '/images/cat-herbs.jpg',
  '/images/cat-food.jpg', '/images/cat-books.jpg', '/images/hero-artisan.jpg',
  '/images/artisan-workshop.jpg', '',
]

/* ── Products list ────────────────────────────────────────────── */
export function SellerProducts() {
  useDb()
  const store = useSellerStore()
  if (!store) return <NoStore />
  const list = products.list({ storeId: store.id })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{list.length} product{list.length === 1 ? '' : 's'} · {list.filter((p) => p.status === 'active').length} live</p>
        <Button to="/seller/add-product" variant="gold" size="sm"><Plus size={15} /> Add product</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<PackagePlus size={26} />} title="No products yet"
          sub="List your first piece — photos, price, stock, and it's live." action={<Button to="/seller/add-product" variant="gold" size="sm">Add your first product</Button>} />
      ) : (
        <div className="card overflow-x-auto p-5">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="pb-3 pr-4 font-semibold">Product</th>
                <th className="pb-3 pr-4 font-semibold">Price</th>
                <th className="pb-3 pr-4 font-semibold">Stock</th>
                <th className="pb-3 pr-4 font-semibold">Sold</th>
                <th className="pb-3 pr-4 font-semibold">Rating</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-3 pr-4">
                    <Link to={`/product/${p.id}`} className="flex items-center gap-3 hover:text-gold">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : null}
                      </span>
                      <span className="max-w-[14rem] truncate font-medium">{p.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 tnum">{formatMoney(p.price, p.currency)}</td>
                  <td className={`py-3 pr-4 font-semibold tnum ${p.stock === 0 ? 'text-rose-500' : p.stock <= 3 ? 'text-amber-500' : ''}`}>{p.stock}</td>
                  <td className="py-3 pr-4 text-muted tnum">{p.sold}</td>
                  <td className="py-3 pr-4"><StarRating rating={p.rating} count={p.review_count} size={12} /></td>
                  <td className="py-3 pr-4">
                    {p.status === 'active' && <Badge tone="green">Live</Badge>}
                    {p.status === 'pending' && <Badge tone="gold">Pending</Badge>}
                    {p.status === 'hidden' && <Badge>Hidden</Badge>}
                    {p.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link to={`/seller/add-product?edit=${p.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg" aria-label={`Edit ${p.name}`}><Pencil size={15} /></Link>
                      <button
                        onClick={() => products.setStatus(p.id, p.status === 'hidden' ? 'active' : 'hidden')}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
                      >
                        {p.status === 'hidden' ? 'Unhide' : 'Hide'}
                      </button>
                      <button onClick={() => { if (confirm(`Delete “${p.name}”?`)) products.remove(p.id) }} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-500/10" aria-label={`Delete ${p.name}`}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Add / edit product ───────────────────────────────────────── */
export function SellerAddProduct() {
  useDb()
  const store = useSellerStore()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const existing = editId ? products.byId(editId) : undefined
  const [f, setF] = useState(() => existing ? {
    name: existing.name, description: existing.description, category_slug: existing.category_slug,
    price: existing.price, currency: existing.currency, stock: existing.stock, condition: existing.condition,
    location: existing.location, shipping_fee: existing.shipping_fee, shipping_days: existing.shipping_days,
    tags: existing.tags.join(', '), image: existing.image,
  } : {
    name: '', description: '', category_slug: store?.category_slugs[0] ?? 'balochi-doch',
    price: 0, currency: 'PKR' as const, stock: 1, condition: 'handmade' as const,
    location: store?.location ?? '', shipping_fee: 250, shipping_days: '3–5 days',
    tags: '', image: GALLERY[0],
  })
  const [saved, setSaved] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(existing?.image || GALLERY[0] || null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    return () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview) }
  }, [preview])

  if (!store) return <NoStore />

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    if (!storage.allowedTypes.has(picked.type)) {
      setUploadError('Please choose a JPG, PNG or WEBP image.')
      return
    }
    if (picked.size > storage.maxBytes) {
      setUploadError('Image must be 5 MB or smaller.')
      return
    }
    setUploadError('')
    setFile(picked)
    const url = URL.createObjectURL(picked)
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError('')
    setUploading(true)
    try {
      let image = f.image
      if (file) image = await storage.uploadProductImage(file, store.seller_id)
      const payload = {
        name: f.name.trim(), description: f.description.trim(), category_slug: f.category_slug,
        price: Number(f.price), currency: f.currency, stock: Number(f.stock), condition: f.condition,
        location: f.location, shipping_fee: Number(f.shipping_fee), shipping_days: f.shipping_days,
        tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), image,
      }
      if (existing) await products.update(existing.id, payload)
      else await products.create({ ...payload, seller_id: store.seller_id, store_id: store.id } as Parameters<typeof products.create>[0])
      setSaved(true)
      setTimeout(() => { window.location.hash = ''; window.location.href = '/seller/products' }, 600)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not save the product.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">{existing ? 'Edit product' : 'Add a new product'}</h3>
        {saved && <Badge tone="green">Saved — redirecting…</Badge>}
      </div>

      <div className="card space-y-5 p-6">
        <Field label="Product name" required>
          <input id="product-name" name="name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Festive Doch Dress — Hand-Embroidered" required />
        </Field>
        <Field label="Description" required hint="Materials, sizes, making time — honesty earns reviews.">
          <textarea id="product-description" name="description" className="field resize-none" rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category" required>
            <select id="product-category" name="category_slug" className="field" value={f.category_slug} onChange={(e) => setF({ ...f, category_slug: e.target.value })}>
              {categories.list().map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Price (PKR)" required>
            <input id="product-price" name="price" type="number" min={0} className="field" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} required />
          </Field>
          <Field label="Stock" required>
            <input id="product-stock" name="stock" type="number" min={0} className="field" value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} required />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-4">
          <Field label="Condition">
            <select id="product-condition" name="condition" className="field" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value as Product['condition'] })}>
              <option value="handmade">Handmade</option>
              <option value="new">New</option>
              <option value="vintage">Vintage</option>
            </select>
          </Field>
          <Field label="Location"><input id="product-location" name="location" className="field" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <Field label="Shipping fee (PKR)"><input id="product-shipping-fee" name="shipping_fee" type="number" min={0} className="field" value={f.shipping_fee} onChange={(e) => setF({ ...f, shipping_fee: Number(e.target.value) })} /></Field>
          <Field label="Shipping time"><input id="product-shipping-days" name="shipping_days" className="field" value={f.shipping_days} onChange={(e) => setF({ ...f, shipping_days: e.target.value })} placeholder="3–5 days" /></Field>
        </div>

        <Field label="Tags" hint="Comma-separated — helps buyers find you.">
          <input id="product-tags" name="tags" className="field" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="embroidery, dress, festive" />
        </Field>

        <fieldset>
          <legend className="mb-2 text-[0.8rem] font-semibold text-muted">Product image</legend>
          <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-5 text-center transition hover:border-gold/50">
            <ImagePlus size={22} className="text-gold" />
            <span className="text-sm font-semibold">Upload image from your device</span>
            <span className="text-xs text-faint">JPG, JPEG, PNG or WEBP · up to 5 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          {preview && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <img src={preview} alt="Product preview" className="max-h-56 w-full object-cover" />
            </div>
          )}
          {uploadError && <p className="mt-2 text-sm text-rose-500">{uploadError}</p>}
          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6">
            {GALLERY.map((g, i) => (
              <button key={i} type="button" onClick={() => { setFile(null); setF({ ...f, image: g }); setPreview(g || null) }} aria-label={g ? 'Choose image' : 'No image (icon tile)'}
                className={`grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border-2 transition ${!file && f.image === g ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                {g ? <img src={g} alt="" className="h-full w-full object-cover" /> : <span className="text-[0.6rem] font-bold uppercase text-faint">Icon</span>}
              </button>
            ))}
          </div>
          <input id="product-image" name="image" className="field mt-3" value={f.image} onChange={(e) => { setFile(null); setF({ ...f, image: e.target.value }); setPreview(e.target.value || null) }} placeholder="…or paste an image URL (/images/… or https://)" aria-label="Image URL" />
        </fieldset>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button to="/seller/products" variant="ghost" type="button">Cancel</Button>
          <Button type="submit" variant="gold" disabled={uploading}>
            {uploading ? <><Loader2 size={15} className="animate-spin" /> {file ? 'Uploading…' : 'Saving…'}</> : (existing ? 'Save changes' : 'Publish product')}
          </Button>
        </div>
      </div>
      {existing && <p className="text-xs text-faint">Created {formatDate(existing.created_at)} · {existing.sold} sold</p>}
    </form>
  )
}
