import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, CategoryIcon, Field, Modal, StarRating } from '@/components/ui'
import { categories, products, stores } from '@/lib/db'
import { useDb } from '@/lib/providers'
import { formatDate, formatMoney } from '@/lib/util'
import type { Category } from '@/lib/types'

/* ── Products moderation ──────────────────────────────────────── */
export function AdminProducts() {
  useDb()
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'hidden'>('all')
  const all = [...products.list({})]
  const list = filter === 'all' ? all : all.filter((p) => p.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {(['all', 'pending', 'active', 'hidden'] as const).map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${filter === f ? 'border-gold bg-gold/10 text-gold' : 'border-line text-muted hover:border-gold/40'}`}
          >
            {f} {f !== 'all' && <span className="tnum">({all.filter((p) => p.status === f).length})</span>}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[50rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="pb-3 pr-4 font-semibold">Product</th>
              <th className="pb-3 pr-4 font-semibold">Store</th>
              <th className="pb-3 pr-4 font-semibold">Price</th>
              <th className="pb-3 pr-4 font-semibold">Stock</th>
              <th className="pb-3 pr-4 font-semibold">Rating</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const store = stores.byId(p.store_id)
              return (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-3 pr-4">
                    <Link to={`/product/${p.id}`} className="flex items-center gap-3 hover:text-gold">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : null}
                      </span>
                      <span className="max-w-[13rem] truncate font-medium">{p.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{store?.name}</td>
                  <td className="py-3 pr-4 tnum">{formatMoney(p.price, p.currency)}</td>
                  <td className="py-3 pr-4 tnum">{p.stock}</td>
                  <td className="py-3 pr-4"><StarRating rating={p.rating} count={p.review_count} size={12} /></td>
                  <td className="py-3 pr-4">
                    {p.status === 'active' && <Badge tone="green">Live</Badge>}
                    {p.status === 'pending' && <Badge tone="gold">Pending</Badge>}
                    {p.status === 'hidden' && <Badge>Hidden</Badge>}
                    {p.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      {p.status === 'pending' && (
                        <button onClick={() => products.setStatus(p.id, 'active')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20">
                          <Check size={13} /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => products.setStatus(p.id, p.status === 'hidden' ? 'active' : 'hidden')}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
                        aria-label={p.status === 'hidden' ? 'Unhide' : 'Hide'}
                      >
                        {p.status === 'hidden' ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button onClick={() => { if (confirm(`Delete “${p.name}”?`)) products.remove(p.id) }} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-500/10" aria-label={`Delete ${p.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Categories CRUD ──────────────────────────────────────────── */
const ICON_OPTIONS = ['Palette', 'Camera', 'Feather', 'Doch', 'Brush', 'PencilRuler', 'PenTool', 'Shapes', 'Lamp', 'Scroll', 'Leaf', 'ChefHat', 'UtensilsCrossed', 'BookOpen', 'Shirt', 'Gem', 'Hand', 'Landmark']

export function AdminCategories() {
  useDb()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const list = categories.list()

  const blank: Category = { id: '', slug: '', name: '', description: '', icon: 'Shapes' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted tnum">{list.length} categories</p>
        <Button size="sm" variant="gold" onClick={() => setEditing('new')}><Plus size={14} /> New category</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <article key={c.id} className="card flex items-start gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-gold/15 text-brand dark:text-gold">
              <CategoryIcon name={c.icon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{c.description}</p>
              <p className="mt-1 text-[0.65rem] text-faint">/{c.slug}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(c)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-surface-2 dark:text-gold">Edit</button>
              <button onClick={() => { if (confirm(`Delete category “${c.name}”?`)) categories.remove(c.id) }} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10">Delete</button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Edit category'}>
        {editing && (
          <CategoryForm
            initial={editing === 'new' ? blank : editing}
            onSave={(c) => {
              categories.save({ ...c, id: c.id || `c-${Date.now().toString(36)}` })
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function CategoryForm({ initial, onSave, onCancel }: { initial: Category; onSave: (c: Category) => void; onCancel: () => void }) {
  const [f, setF] = useState(initial)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...f, slug: f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
      }}
      className="space-y-4"
    >
      <Field label="Name" required><input id="category-name" name="name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
      <Field label="Slug" hint="Used in the /category/… URL"><input id="category-slug" name="slug" className="field" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
      <Field label="Description" required><textarea id="category-description" name="description" className="field resize-none" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required /></Field>
      <Field label="Icon">
        <select id="category-icon" name="icon" className="field" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })}>
          {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Image URL (optional)"><input id="category-image" name="image" className="field" value={f.image ?? ''} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="/images/…" /></Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="gold">Save</Button>
      </div>
    </form>
  )
}

export { formatDate }
