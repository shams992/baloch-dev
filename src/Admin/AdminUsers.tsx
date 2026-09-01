import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Check, ShieldCheck, Store, Trash2, User } from 'lucide-react'
import { Avatar, Badge, Button, Field, Modal } from '@/components/ui'
import { stores, users } from '@/lib/db'
import { useDb } from '@/lib/providers'
import { formatDate, formatMoney } from '@/lib/util'
import type { Role } from '@/lib/types'

/* ── Users / Buyers / Sellers ─────────────────────────────────── */
export function AdminUsers({ role }: { role?: Role }) {
  useDb()
  const list = users.list(role)
  const [q, setQ] = useState('')

  const filtered = list.filter((u) =>
    !q || u.full_name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input id="admin-user-search" name="q" className="field" placeholder="Search name, email, @username…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </div>
        <p className="text-sm text-muted tnum">{filtered.length} user{filtered.length === 1 ? '' : 's'}</p>
      </div>

      <div className="card table-scroll p-5">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="pb-3 pr-4 font-semibold">User</th>
              <th className="pb-3 pr-4 font-semibold">Role</th>
              <th className="pb-3 pr-4 font-semibold">Location</th>
              <th className="pb-3 pr-4 font-semibold">Joined</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-line/60">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.full_name} color={u.avatar_color} size={34} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{u.full_name}</p>
                      <p className="truncate text-xs text-faint">{u.email} · @{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <select
                    id={`role-${u.id}`}
                    name="role"
                    className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold"
                    value={u.role}
                    onChange={(e) => users.setRole(u.id, e.target.value as Role)}
                    aria-label={`Role for ${u.full_name}`}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3 pr-4 text-muted">{u.location || '—'}</td>
                <td className="py-3 pr-4 text-muted">{formatDate(u.created_at)}</td>
                <td className="py-3 pr-4">
                  {u.is_blocked ? <Badge tone="red">Blocked</Badge> : <Badge tone="green">Active</Badge>}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => users.setBlocked(u.id, !u.is_blocked)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${u.is_blocked ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-rose-500 hover:bg-rose-500/10'}`}
                  >
                    {u.is_blocked ? <><Check size={13} /> Unblock</> : <><Ban size={13} /> Block</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Sellers with store management ────────────────────────────── */
export function AdminSellers() {
  useDb()
  const list = stores.listAll()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted tnum">{list.length} store{list.length === 1 ? '' : 's'} · {list.filter((s) => !s.is_approved).length} pending approval</p>
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((st) => {
          const seller = users.byId(st.seller_id)
          return (
            <article key={st.id} className={`card p-5 ${!st.is_approved ? 'border-amber-500/40' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${st.logo_color}, ${st.logo_color}bb)` }}>
                    {st.logo_initials}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/store/${st.slug}`} className="font-display text-lg font-semibold hover:text-gold">{st.name}</Link>
                      {st.is_approved ? <Badge tone="green"><Check size={12} /> Live</Badge> : <Badge tone="gold">Pending</Badge>}
                      {st.blocked && <Badge tone="red">Blocked</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-faint">@{seller?.username} · {seller?.email}</p>
                    <p className="mt-1 text-xs text-muted">{st.location} · joined {formatDate(st.created_at)} · {st.total_sales}+ sales</p>
                    <p className="mt-2 line-clamp-2 max-w-md text-sm text-muted">{st.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!st.is_approved ? (
                    <Button size="sm" variant="gold" onClick={() => stores.setApproved(st.id, true)}>Approve store</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => stores.setApproved(st.id, false)}>Suspend</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => stores.setBlocked(st.id, !st.blocked)}>
                    {st.blocked ? 'Unblock' : 'Block seller'}
                  </Button>
                  {!st.deleted_at && (
                    <Button size="sm" variant="ghost" onClick={() => setPendingDelete(st.id)}>
                      <Trash2 size={13} /> Delete store
                    </Button>
                  )}
                  {st.deleted_at && <Badge tone="red">Archived</Badge>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete store?">
        <p className="text-sm text-muted">This archives the store and hides its products. Orders and payment records are kept. This cannot be undone from the seller side.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="gold" disabled={busy} onClick={async () => {
            if (!pendingDelete) return
            setBusy(true)
            try {
              await stores.archive(pendingDelete)
              setPendingDelete(null)
            } catch (e: any) {
              alert(e?.message ?? 'Could not delete store')
            } finally { setBusy(false) }
          }}>{busy ? 'Deleting…' : 'Yes, archive store'}</Button>
        </div>
      </Modal>
    </div>
  )
}

/* ── Platform announcement ────────────────────────────────────── */
export function AdminAnnouncement() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  useDb()

  const send = () => {
    if (!title.trim() || !body.trim()) return
    import('@/lib/db').then(({ notifications }) => {
      for (const u of users.list()) {
        notifications.push({ user_id: u.id, type: 'system', title: title.trim(), body: body.trim() })
      }
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false); setTitle(''); setBody('') }, 1800)
    })
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <ShieldCheck size={14} /> Send announcement
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Platform announcement">
        <div className="space-y-4">
          <Field label="Title" required><input id="announce-title" name="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Message" required><textarea id="announce-body" name="body" className="field resize-none" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required /></Field>
          <p className="text-xs text-faint">Goes to all {users.list().length} users as a notification.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={send}>{sent ? 'Sent ✓' : 'Send to everyone'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export function UserIcon() { return <User size={16} /> }
export function StoreIconSmall() { return <Store size={16} /> }
export { formatMoney }
