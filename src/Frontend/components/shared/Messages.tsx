import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Package, Search, Send } from 'lucide-react'
import { messaging, products, stores } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { cn, formatDate, timeAgo } from '@/lib/util'
import { Avatar, EmptyState } from '@/components/ui'

/**
 * Shared conversations UI for buyer & seller dashboards.
 * `perspective` decides which unread counter and counterpart to show.
 */
export function MessagesView({ perspective }: { perspective: 'buyer' | 'seller' }) {
  const { user } = useAuth()
  const dbVersion = useDb()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversations = useMemo(() => {
    if (!user) return []
    const store = perspective === 'seller' ? stores.activeFor(user.id) : undefined
    return messaging.conversationsFor(user.id, store ? { storeId: store.id } : undefined).filter((c) =>
      q ? (c.counterpart?.full_name ?? '').toLowerCase().includes(q.toLowerCase()) : true,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, q, dbVersion, activeId, perspective])

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id)
  }, [conversations.length])

  const active = conversations.find((c) => c.id === activeId) ?? null
  const thread = active ? messaging.messages(active.id) : []

  useEffect(() => {
    if (active) messaging.markRead(active.id, user!.id)
  }, [activeId, thread.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [thread.length])

  if (!user) return null

  const send = () => {
    if (!active || !draft.trim()) return
    messaging.send(active.id, user.id, draft)
    setDraft('')
  }

  return (
    <div className="card grid h-[calc(100vh-11rem)] min-h-[30rem] grid-cols-1 overflow-hidden md:grid-cols-[20rem_1fr]">
      {/* conversation list */}
      <div className={`flex flex-col border-line md:border-r ${active ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-line p-3.5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="msg-search"
              name="q"
              className="field pl-9" placeholder="Search conversations…" value={q}
              onChange={(e) => setQ(e.target.value)} aria-label="Search conversations"
            />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">
              No conversations yet. Open a product page and use “Message the seller”.
            </li>
          )}
          {conversations.map((c) => {
            const unread = perspective === 'buyer' ? c.buyer_unread : c.seller_unread
            const last = messaging.lastMessage(c.id)
            const product = c.product_id ? products.byId(c.product_id) : null
            return (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-line/60 px-4 py-3.5 text-left transition hover:bg-surface-2',
                    activeId === c.id && 'bg-brand/5',
                  )}
                >
                  <Avatar name={c.counterpart?.full_name ?? '?'} color={c.counterpart?.avatar_color} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-[0.85rem]', unread ? 'font-bold' : 'font-semibold')}>{c.counterpart?.full_name}</span>
                      <span className="shrink-0 text-[0.65rem] text-faint">{timeAgo(c.last_at)}</span>
                    </span>
                    <span className={cn('mt-0.5 block truncate text-xs', unread ? 'font-medium text-fg' : 'text-muted')}>
                      {last ? `${last.sender_id === user.id ? 'You: ' : ''}${last.body}` : 'Say salaam 👋'}
                    </span>
                    {product && <span className="mt-1 inline-block max-w-full truncate rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.62rem] text-faint">✦ {product.name}</span>}
                  </span>
                  {unread > 0 && <span className="mt-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[0.65rem] font-bold text-white tnum">{unread}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* thread */}
      <div className={`flex min-h-0 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <button className="mr-1 rounded-lg px-2 py-1 text-muted hover:bg-surface-2 md:hidden" onClick={() => setActiveId(null)} aria-label="Back to conversations">←</button>
              <Avatar name={active.counterpart?.full_name ?? '?'} color={active.counterpart?.avatar_color} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{active.counterpart?.full_name}</p>
                {perspective === 'buyer' ? (
                  active.store_id && stores.byId(active.store_id) ? (
                    <Link to={`/store/${stores.byId(active.store_id)!.slug}`} className="text-xs text-brand hover:underline dark:text-gold">
                      View store →
                    </Link>
                  ) : active.seller_id && stores.bySeller(active.seller_id) ? (
                    <Link to={`/store/${stores.bySeller(active.seller_id)!.slug}`} className="text-xs text-brand hover:underline dark:text-gold">
                      View store →
                    </Link>
                  ) : null
                ) : (
                  <p className="text-xs text-faint">Buyer conversation</p>
                )}
              </div>
              {active.product_id && products.byId(active.product_id) && (
                <Link
                  to={`/product/${active.product_id}`}
                  className="ml-auto hidden max-w-[10rem] items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs transition hover:border-gold/50 sm:flex"
                >
                  <Package size={13} className="text-gold" />
                  <span className="truncate">{products.byId(active.product_id)!.name}</span>
                </Link>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-bg-soft/50 px-5 py-5">
              {thread.map((m) => {
                const mine = m.sender_id === user.id
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[78%] rounded-2xl px-4 py-2.5 text-[0.86rem] leading-relaxed shadow-sm',
                      mine
                        ? 'rounded-br-md bg-brand text-onbrand'
                        : 'rounded-bl-md border border-line bg-surface',
                    )}>
                      <p>{m.body}</p>
                      <p className={cn('mt-1 text-right text-[0.62rem]', mine ? 'text-onbrand/60' : 'text-faint')}>
                        {formatDate(m.created_at, true)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-line p-3.5">
              <div className="flex items-end gap-2">
                <textarea
                  id="msg-draft"
                  name="message"
                  className="field min-h-[2.9rem] resize-none py-2.5"
                  rows={1}
                  placeholder="Write a message… (contact details are kept off-platform for safety)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  aria-label="Message text"
                />
                <button onClick={send} disabled={!draft.trim()} className="btn btn-primary h-[2.9rem] w-[2.9rem] !rounded-2xl !p-0 disabled:opacity-40" aria-label="Send message">
                  <Send size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8">
            <EmptyState
              icon={<MessageCircle size={26} />}
              title="Select a conversation"
              sub="Choose a conversation on the left, or start one from any product page."
            />
          </div>
        )}
      </div>
    </div>
  )
}
