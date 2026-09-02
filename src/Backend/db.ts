/**
 * Data access layer — backed by Supabase with a synchronous cache.
 *
 * Every exported function name and signature is preserved so no
 * page/component breaks. Data is cached in module-level state and
 * kept in sync via Supabase Realtime. Mutations write to both
 * the cache and Supabase.
 */
import type {
  Address, CanonicalOrderStatus, Category, Conversation, DBState, Message, Notification, Order,
  OrderStatus, OrderStatusHistory, Product, Profile, Report, Review, Role, Store,
} from './types'
import { getSupabase, isSupabaseConfigured, clearStoredAuthTokens, SUPABASE_MISSING_CONFIG_MESSAGE } from './supabase'
import { normalizeOrderStatus, slugify } from './util'

const nowIso = () => new Date().toISOString()
const ACTIVE_STORE_KEY = 'beh-active-store'

function aliveStore(s: Store) {
  return !s.deleted_at
}

async function dispatchOutbox() {
  try {
    const supabase = getSupabase()
    await supabase.functions.invoke('dispatch-notifications', { body: {} })
  } catch { /* provider may be unconfigured; outbox stays queued/skipped */ }
}

/* ════════════════════════════════════════════════════════════════
   CACHE — module-level reactive store
   ════════════════════════════════════════════════════════════════ */

interface CacheState {
  profiles: Profile[]
  categories: Category[]
  stores: Store[]
  products: Product[]
  orders: Order[]
  payments: any[]
  reviews: Review[]
  conversations: Conversation[]
  messages: Message[]
  notifications: Notification[]
  addresses: Address[]
  cart: Array<{ id: string; user_id: string; product_id: string; qty: number; added_at: string }>
  wishlist: Array<{ id: string; user_id: string; product_id: string; added_at: string }>
  settings: { commission_rate: number; currency: string; platform_name: string; maintenance: boolean; allow_registrations: boolean; auto_approve_stores: boolean }
  reports: Report[]
  orderHistory: OrderStatusHistory[]
}

const cache: CacheState = {
  profiles: [],
  categories: [],
  stores: [],
  products: [],
  orders: [],
  payments: [],
  reviews: [],
  conversations: [],
  messages: [],
  notifications: [],
  addresses: [],
  cart: [],
  wishlist: [],
  settings: { commission_rate: 8, currency: 'PKR', platform_name: 'Baloch Export Hub', maintenance: false, allow_registrations: true, auto_approve_stores: false },
  reports: [],
  orderHistory: [],
}

let version = 0
const listeners = new Set<() => void>()
let realtimeChannel: any = null

export function getVersion(): number { return version }
export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function emitChange() {
  version += 1
  listeners.forEach((l) => l())
}

/** Cached profile for synchronous auth.session(). Set by providers. */
let _cachedProfile: Profile | null = null
export function _setCachedProfile(p: Profile | null) { _cachedProfile = p }

/* ════════════════════════════════════════════════════════════════
   INIT — populate cache from Supabase
   ════════════════════════════════════════════════════════════════ */

let _dbInitialized = false

export async function initDb() {
  if (_dbInitialized) return
  if (!isSupabaseConfigured) return
  _dbInitialized = true
  try {
    const supabase = getSupabase()
    const [catRes, storeRes, prodRes, settingsRes, reportRes, msgRes, convRes, profileRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('seller_stores').select('*'),
      supabase.from('products').select('*'),
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').order('created_at'),
      supabase.from('conversations').select('*'),
      supabase.from('public_profiles').select('*'),
    ])
    cache.categories = (catRes.data ?? []) as Category[]
    cache.stores = (storeRes.data ?? []) as Store[]
    cache.products = (prodRes.data ?? []) as Product[]
    if (settingsRes.data) cache.settings = settingsRes.data as any
    cache.reports = (reportRes.data ?? []) as Report[]
    cache.messages = (msgRes.data ?? []) as Message[]
    cache.conversations = (convRes.data ?? []) as Conversation[]
    cache.profiles = (profileRes.data ?? []) as Profile[]

    subscribeRealtime()
    emitChange()
  } catch {
    _dbInitialized = false
  }
}

export async function initUserCache(userId: string) {
  if (!isSupabaseConfigured) return
  try {
    const supabase = getSupabase()
    const [cartRes, wishRes, addrRes, notifRes, convRes, revRes, profileRes] = await Promise.all([
      supabase.from('cart_items').select('*').eq('user_id', userId),
      supabase.from('wishlist').select('*').eq('user_id', userId),
      supabase.from('addresses').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      supabase.from('reviews').select('*'),
      supabase.from('public_profiles').select('*'),
    ])

    cache.cart = (cartRes.data ?? []) as any
    cache.wishlist = (wishRes.data ?? []) as any
    cache.addresses = (addrRes.data ?? []) as Address[]
    cache.notifications = (notifRes.data ?? []) as Notification[]
    cache.conversations = (convRes.data ?? []) as Conversation[]
    cache.reviews = (revRes.data ?? []) as Review[]
    cache.profiles = (profileRes.data ?? []) as Profile[]

    const convIds = cache.conversations.map((c) => c.id)
    if (convIds.length > 0) {
      const { data: msgs } = await supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at')
      cache.messages = (msgs ?? []) as Message[]
    }

    await refreshOrders()
    emitChange()
  } catch (e) {
    console.error('[db] initUserCache failed', e)
  }
}

/* ── Realtime subscription ────────────────────────────────────── */
function subscribeRealtime() {
  if (realtimeChannel) return
  if (!isSupabaseConfigured) return
  try {
    const supabase = getSupabase()

    realtimeChannel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*')
        cache.products = (data ?? []) as Product[]
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        if (_cachedProfile?.id) await refreshOrders()
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async () => {
        if (_cachedProfile?.id) await refreshOrders()
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, async () => {
        if (_cachedProfile?.id) await refreshOrders()
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, async () => {
        const uid = _cachedProfile?.id
        if (uid) {
          const { data } = await supabase.from('cart_items').select('*').eq('user_id', uid)
          cache.cart = (data ?? []) as any
        }
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' }, async () => {
        const uid = _cachedProfile?.id
        if (uid) {
          const { data } = await supabase.from('wishlist').select('*').eq('user_id', uid)
          cache.wishlist = (data ?? []) as any
        }
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        const uid = _cachedProfile?.id
        if (uid) {
          const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false })
          cache.notifications = (data ?? []) as Notification[]
        }
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const uid = _cachedProfile?.id
        if (uid) {
          const { data: convs } = await supabase.from('conversations').select('*').or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          cache.conversations = (convs ?? []) as Conversation[]
        }
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
        const uid = _cachedProfile?.id
        if (uid) {
          const { data } = await supabase.from('conversations').select('*').or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          cache.conversations = (data ?? []) as Conversation[]
        }
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, async () => {
        const { data } = await supabase.from('reviews').select('*')
        cache.reviews = (data ?? []) as Review[]
        // Also refresh products to get updated ratings
        const { data: prods } = await supabase.from('products').select('*')
        cache.products = (prods ?? []) as Product[]
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async () => {
        const { data } = await supabase.from('categories').select('*').order('name')
        cache.categories = (data ?? []) as Category[]
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_stores' }, async () => {
        const { data } = await supabase.from('seller_stores').select('*')
        cache.stores = (data ?? []) as Store[]
        emitChange()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, async () => {
        const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single()
        if (data) cache.settings = data as any
        emitChange()
      })
      .subscribe()
  } catch { /* Supabase not configured */ }
}

function hydrateFetchedOrders(raw: unknown): { orders: Order[]; history: OrderStatusHistory[] } {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { parsed = [] }
  }
  const rows = Array.isArray(parsed) ? parsed : []
  const orders: Order[] = []
  const history: OrderStatusHistory[] = []
  for (const row of rows as any[]) {
    const hist = Array.isArray(row.history) ? row.history as OrderStatusHistory[] : []
    history.push(...hist)
    const items = Array.isArray(row.items) ? row.items : []
    orders.push({
      ...row,
      status: normalizeOrderStatus(row.status),
      items: items.map((i: any) => ({ ...i, status: normalizeOrderStatus(i.status) })),
    } as Order)
  }
  return { orders, history }
}

async function refreshOrders() {
  if (!isSupabaseConfigured) return
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('fetch_my_orders')
    if (error) {
      console.error('[orders] fetch_my_orders failed', error)
      return
    }
    const hydrated = hydrateFetchedOrders(data)
    cache.orders = hydrated.orders
    cache.orderHistory = hydrated.history
  } catch (e) {
    console.error('[orders] refreshOrders failed', e)
  }
}

/** Force a full re-fetch of all cached data. Called after RPC mutations. */
export async function refreshAll() {
  if (!isSupabaseConfigured) return
  try {
    const supabase = getSupabase()
    const [prodRes, storeRes, catRes, settingsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('seller_stores').select('*'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
    ])
    cache.products = (prodRes.data ?? []) as Product[]
    cache.stores = (storeRes.data ?? []) as Store[]
    cache.categories = (catRes.data ?? []) as Category[]
    if (settingsRes.data) cache.settings = settingsRes.data as any
    await refreshOrders()
    if (_cachedProfile) {
      const uid = _cachedProfile.id
      const [cartRes, notifRes] = await Promise.all([
        supabase.from('cart_items').select('*').eq('user_id', uid),
        supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ])
      cache.cart = (cartRes.data ?? []) as any
      cache.notifications = (notifRes.data ?? []) as Notification[]
    }
    emitChange()
  } catch (e) {
    console.error('[db] refreshAll failed', e)
  }
}

/* ════════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════════ */

export const auth = {
  session(): Profile | null {
    return _cachedProfile
  },

  async signIn(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: Profile }> {
    let supabase
    try { supabase = getSupabase() } catch (e: any) { return { ok: false, error: e?.message ?? SUPABASE_MISSING_CONFIG_MESSAGE } }

    // ── Clear any lingering session before signing in ────────────
    // If a previous session is still cached client-side, signInWithPassword
    // can hang indefinitely (Supabase tries to refresh the old token first).
    // We first wipe stored tokens from localStorage so that Supabase's
    // autoRefreshToken mechanism cannot interfere, then call signOut()
    // to clear any in-memory auth state.
    clearStoredAuthTokens()
    try { await supabase.auth.signOut() } catch { /* best-effort */ }

    // ── Auth call with timeout ───────────────────────────────────
    // Use a rejecting timer so we never fabricate a fake Supabase response.
    // If Supabase succeeds first, clearTimeout prevents the timer from firing.
    // If the timer fires first, the Supabase promise is abandoned (no cancel
    // token is available on Supabase auth methods) and we return a clear error.
    const AUTH_TIMEOUT_MS = 30_000
    let _authTimer: ReturnType<typeof setTimeout> | undefined
    let authResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>
    try {
      authResult = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        new Promise<never>((_resolve, reject) => {
          _authTimer = setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT_MS)
        }),
      ])
    } catch (e: any) {
      // Always clean up the timer regardless of which branch fired
      if (_authTimer) { clearTimeout(_authTimer); _authTimer = undefined }

      // Timeout — Supabase did not respond within AUTH_TIMEOUT_MS
      if (e?.message === 'AUTH_TIMEOUT') {
        console.warn('[auth.signIn] Supabase did not respond within', AUTH_TIMEOUT_MS, 'ms')
        return { ok: false, error: 'Connection timed out. Please check your internet connection and try again.' }
      }
      // Real error from Supabase (network failure, DNS, etc.) — surface it as-is
      console.error('[auth.signIn] Unexpected error:', e)
      return { ok: false, error: `Sign-in failed: ${e?.message ?? 'Unknown error'}` }
    }
    // Timer is still alive if Supabase won the race — cancel it
    if (_authTimer) { clearTimeout(_authTimer); _authTimer = undefined }

    const { data, error } = authResult!

    // Real Supabase error (wrong password, unconfirmed email, etc.) — never mask it
    if (error) {
      console.error('[auth.signIn] Supabase error:', error.message, error)
      if (error.message.includes('Invalid login')) return { ok: false, error: 'Invalid email or password.' }
      if (error.message.includes('Email not confirmed')) return { ok: false, error: 'Email not confirmed. Please check your inbox or contact support.' }
      return { ok: false, error: `Sign-in failed: ${error.message}` }
    }

    if (!data?.user) {
      console.error('[auth.signIn] No user in response:', data)
      return { ok: false, error: 'Sign-in succeeded but no user was returned. Please try again.' }
    }

    // ── Profile loading (separate from auth timeout) ──────────────
    const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (pErr || !profile) {
      console.error('[auth.signIn] Profile query failed:', pErr)
      return { ok: false, error: 'Profile not found. Please contact support.' }
    }
    if (profile.is_blocked) { await supabase.auth.signOut(); return { ok: false, error: 'This account has been blocked. Contact support.' } }
    _cachedProfile = profile as Profile
    // Fire-and-forget: onAuthStateChange in providers.tsx also calls initUserCache,
    // so we must not block the login response on this heavy cache population.
    void initUserCache(profile.id)
    return { ok: true, user: profile as Profile }
  },

  async signUp(data: { full_name: string; username: string; email: string; password: string }): Promise<{ ok: boolean; error?: string; user?: Profile }> {
    let supabase
    try { supabase = getSupabase() } catch (e: any) { return { ok: false, error: e?.message ?? SUPABASE_MISSING_CONFIG_MESSAGE } }
    const { data: settings } = await supabase.from('platform_settings').select('allow_registrations').eq('id', 1).single()
    if (settings && !settings.allow_registrations) return { ok: false, error: 'Registrations are temporarily closed.' }
    // Check email/username availability via RPC (bypasses RLS for pre-signup validation)
    const { data: existingEmail } = await supabase.rpc('check_email_exists', { p_email: data.email.trim() })
    if (existingEmail) return { ok: false, error: 'An account with this email already exists.' }
    const { data: existingUser } = await supabase.rpc('check_username_exists', { p_username: data.username.trim() })
    if (existingUser) return { ok: false, error: 'This username is taken.' }

    // ── Clear any lingering session before signing up ──────────
    clearStoredAuthTokens()
    try { await supabase.auth.signOut() } catch { /* best-effort */ }

    // ── Auth call with timeout ───────────────────────────────────
    const AUTH_TIMEOUT_MS = 30_000
    let _authTimer: ReturnType<typeof setTimeout> | undefined
    let authResult: Awaited<ReturnType<typeof supabase.auth.signUp>>
    try {
      authResult = await Promise.race([
        supabase.auth.signUp({
          email: data.email.trim(), password: data.password,
          options: { data: { full_name: data.full_name.trim(), username: slugify(data.username) } },
        }),
        new Promise<never>((_resolve, reject) => {
          _authTimer = setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT_MS)
        }),
      ])
    } catch (e: any) {
      if (_authTimer) { clearTimeout(_authTimer); _authTimer = undefined }
      if (e?.message === 'AUTH_TIMEOUT') {
        console.warn('[auth.signUp] Supabase did not respond within', AUTH_TIMEOUT_MS, 'ms')
        return { ok: false, error: 'Connection timed out. Please check your internet connection and try again.' }
      }
      console.error('[auth.signUp] Unexpected error:', e)
      return { ok: false, error: `Registration failed: ${e?.message ?? 'Unknown error'}` }
    }
    if (_authTimer) { clearTimeout(_authTimer); _authTimer = undefined }

    const { data: authData, error } = authResult!

    if (error) {
      console.error('[auth.signUp] Supabase error:', error.message, error)
      if (error.message.includes('already registered')) return { ok: false, error: 'An account with this email already exists.' }
      return { ok: false, error: `Registration failed: ${error.message}` }
    }
    if (authData.user) {
      if (!authData.session) return { ok: true } // email confirmation pending
      await new Promise((r) => setTimeout(r, 500))
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
      if (profile) { _cachedProfile = profile as Profile; void initUserCache(profile.id); return { ok: true, user: profile as Profile } }
    }
    return { ok: true }
  },

  async signOut() {
    const supabase = getSupabase()
    clearStoredAuthTokens()
    try { await supabase.auth.signOut() } catch { /* best-effort */ }
    _cachedProfile = null
    cache.orders = []; cache.cart = []; cache.wishlist = []; cache.addresses = []; cache.notifications = []; cache.conversations = []; cache.messages = []; cache.reviews = []
    emitChange()
    window.location.assign('/')
  },

  async updateProfile(userId: string, patch: Partial<Profile>) {
    const supabase = getSupabase()
    await supabase.from('profiles').update(patch).eq('id', userId)
    if (_cachedProfile?.id === userId) _cachedProfile = { ..._cachedProfile, ...patch }
    const idx = cache.profiles.findIndex((p) => p.id === userId)
    if (idx >= 0) cache.profiles[idx] = { ...cache.profiles[idx], ...patch }
    emitChange()
  },

  async changePassword(_userId: string, _current: string, next: string): Promise<string | null> {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password: next })
    return error ? error.message : null
  },

  async becomeSeller(userId: string, data: { name: string; description: string; category: string; location: string; logo_color?: string; banner?: string }): Promise<{ ok: boolean; error?: string; store?: Store }> {
    const supabase = getSupabase()
    const { data: existingRows } = await supabase.from('seller_stores').select('id, deleted_at').eq('seller_id', userId)
    const liveCount = (existingRows ?? []).filter((s) => !s.deleted_at).length
    if (liveCount >= 2) return { ok: false, error: 'You can create a maximum of 2 stores per account.' }
    const { data: settings } = await supabase.from('platform_settings').select('auto_approve_stores').eq('id', 1).single()
    let slug = slugify(data.name)
    const { data: slugExists } = await supabase.from('seller_stores').select('id').eq('slug', slug).maybeSingle()
    if (slugExists) slug = `${slug}-${Math.floor(Math.random() * 900 + 100)}`
    const storeData = {
      seller_id: userId, name: data.name.trim(), slug, description: data.description.trim(),
      category_slugs: [data.category], logo_color: data.logo_color ?? '#0d7d76',
      logo_initials: data.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(''),
      banner: data.banner, location: data.location, is_approved: settings?.auto_approve_stores ?? false,
    }
    const { data: store, error } = await supabase.from('seller_stores').insert(storeData).select('*').single()
    if (error) {
      const msg = error.message.includes('maximum of 2 stores')
        ? 'You can create a maximum of 2 stores per account.'
        : error.message
      return { ok: false, error: msg }
    }
    await supabase.from('profiles').update({ role: 'seller' }).eq('id', userId)
    if (_cachedProfile?.id === userId) _cachedProfile.role = 'seller'
    await supabase.from('notifications').insert({ user_id: userId, type: 'store', title: store.is_approved ? 'Your store is live! 🎉' : 'Store submitted for approval', body: store.is_approved ? `${store.name} is now live.` : `${store.name} is under review.` })
    const { data: admins } = await supabase.from('public_profiles').select('id').eq('role', 'admin')
    for (const admin of (admins ?? [])) {
      await supabase.from('notifications').insert({ user_id: admin.id, type: 'store', title: 'New store awaiting approval', body: `${_cachedProfile?.full_name ?? 'A user'} submitted "${store.name}".` })
    }
    // Update local cache
    cache.stores.push(store as Store)
    try { localStorage.setItem(ACTIVE_STORE_KEY, store.id) } catch { /* noop */ }
    emitChange()
    return { ok: true, store: store as Store }
  },
}

/* ════════════════════════════════════════════════════════════════
   CATEGORIES
   ════════════════════════════════════════════════════════════════ */

export const categories = {
  list: () => cache.categories,
  bySlug: (slug: string) => cache.categories.find((c) => c.slug === slug),
  counts(): Record<string, number> {
    const out: Record<string, number> = {}
    for (const p of cache.products) if (p.status === 'active') out[p.category_slug] = (out[p.category_slug] ?? 0) + 1
    return out
  },
  async save(cat: Category) {
    const supabase = getSupabase()
    if (cat.id) await supabase.from('categories').upsert({ ...cat, id: cat.id })
    else await supabase.from('categories').insert({ ...cat })
    const { data } = await supabase.from('categories').select('*').order('name')
    cache.categories = (data ?? []) as Category[]
    emitChange()
  },
  async remove(id: string) {
    const supabase = getSupabase()
    await supabase.from('categories').delete().eq('id', id)
    cache.categories = cache.categories.filter((c) => c.id !== id)
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   STORES
   ════════════════════════════════════════════════════════════════ */

export const stores = {
  listApproved: () => cache.stores.filter((s) => s.is_approved && aliveStore(s) && !s.blocked),
  listAll: () => cache.stores,
  listBySeller: (sellerId: string) => cache.stores.filter((s) => s.seller_id === sellerId && aliveStore(s)),
  bySlug: (slug: string) => cache.stores.find((s) => s.slug === slug && aliveStore(s)),
  byId: (id: string) => cache.stores.find((s) => s.id === id),
  bySeller: (sellerId: string) => cache.stores.find((s) => s.seller_id === sellerId && aliveStore(s)),
  activeId(): string | null {
    try { return localStorage.getItem(ACTIVE_STORE_KEY) } catch { return null }
  },
  setActive(id: string) {
    try { localStorage.setItem(ACTIVE_STORE_KEY, id) } catch { /* noop */ }
    emitChange()
  },
  activeFor(sellerId: string): Store | undefined {
    const owned = stores.listBySeller(sellerId)
    const saved = stores.activeId()
    return owned.find((s) => s.id === saved) ?? owned[0]
  },
  async update(id: string, patch: Partial<Store>) {
    const supabase = getSupabase()
    await supabase.from('seller_stores').update(patch).eq('id', id)
    const idx = cache.stores.findIndex((x) => x.id === id)
    if (idx >= 0) cache.stores[idx] = { ...cache.stores[idx], ...patch }
    emitChange()
  },
  async setApproved(id: string, approved: boolean, actor?: Profile) {
    const supabase = getSupabase()
    await supabase.from('seller_stores').update({ is_approved: approved }).eq('id', id)
    if (approved) await supabase.from('products').update({ status: 'active' }).eq('store_id', id).eq('status', 'pending')
    const { data: store } = await supabase.from('seller_stores').select('seller_id, name').eq('id', id).single()
    if (store) {
      await supabase.from('notifications').insert({ user_id: store.seller_id, type: 'store', title: approved ? 'Your store has been approved 🎉' : 'Store approval withdrawn', body: approved ? `${store.name} is live.` : `Please contact support.` })
    }
    // Refresh cache
    const { data: allStores } = await supabase.from('seller_stores').select('*')
    cache.stores = (allStores ?? []) as Store[]
    const { data: allProds } = await supabase.from('products').select('*')
    cache.products = (allProds ?? []) as Product[]
    emitChange()
    void actor
  },
  async setBlocked(id: string, blocked: boolean) {
    const supabase = getSupabase()
    await supabase.from('seller_stores').update({ blocked }).eq('id', id)
    const idx = cache.stores.findIndex((x) => x.id === id)
    if (idx >= 0) cache.stores[idx] = { ...cache.stores[idx], blocked }
    emitChange()
  },
  async archive(id: string) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('archive_store', { p_store_id: id })
    if (error) throw new Error(error.message)
    const { data: allStores } = await supabase.from('seller_stores').select('*')
    cache.stores = (allStores ?? []) as Store[]
    const { data: allProds } = await supabase.from('products').select('*')
    cache.products = (allProds ?? []) as Product[]
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   PRODUCTS
   ════════════════════════════════════════════════════════════════ */

export interface ProductFilter {
  q?: string; category?: string; storeId?: string
  sort?: 'featured' | 'new' | 'price-asc' | 'price-desc' | 'rating'
  minRating?: number; maxPrice?: number; inStock?: boolean; includeHidden?: boolean
}

export const products = {
  byId: (id: string) => cache.products.find((p) => p.id === id),

  list(filter: ProductFilter = {}): Product[] {
    let out = cache.products.filter((p) =>
      filter.storeId ? true : (filter.includeHidden ? true : p.status === 'active'),
    )
    if (filter.storeId) out = cache.products.filter((p) => p.store_id === filter.storeId)
    if (filter.q) {
      const q = filter.q.toLowerCase()
      out = out.filter((p) => {
        const store = cache.stores.find((st) => st.id === p.store_id)
        const cat = cache.categories.find((c) => c.slug === p.category_slug)
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)) || (cat?.name.toLowerCase().includes(q) ?? false) || (store?.name.toLowerCase().includes(q) ?? false)
      })
    }
    if (filter.category) out = out.filter((p) => p.category_slug === filter.category)
    if (filter.minRating) out = out.filter((p) => p.rating >= filter.minRating!)
    if (filter.maxPrice) out = out.filter((p) => p.price <= filter.maxPrice!)
    if (filter.inStock) out = out.filter((p) => p.stock > 0)
    switch (filter.sort) {
      case 'new': out = [...out].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)); break
      case 'price-asc': out = [...out].sort((a, b) => a.price - b.price); break
      case 'price-desc': out = [...out].sort((a, b) => b.price - a.price); break
      case 'rating': out = [...out].sort((a, b) => b.rating - a.rating); break
      default: out = [...out].sort((a, b) => b.sold * (b.rating + 1) - a.sold * (a.rating + 1))
    }
    return out
  },

  async create(data: Omit<Product, 'id' | 'created_at' | 'rating' | 'review_count' | 'sold' | 'status'> & { status?: Product['status'] }): Promise<Product> {
    const supabase = getSupabase()
    const store = cache.stores.find((st) => st.id === data.store_id)
    const payload = { ...data, rating: 0, review_count: 0, sold: 0, status: data.status ?? (store?.is_approved ? 'active' : 'pending') }
    const { data: product, error } = await supabase.from('products').insert(payload).select('*').single()
    if (error || !product) throw new Error(error?.message || 'Could not create the product.')
    cache.products.push(product as Product)
    emitChange()
    if ((product as Product).status === 'active') void dispatchOutbox()
    return product as Product
  },

  async update(id: string, patch: Partial<Product>) {
    const supabase = getSupabase()
    await supabase.from('products').update(patch).eq('id', id)
    const idx = cache.products.findIndex((x) => x.id === id)
    if (idx >= 0) cache.products[idx] = { ...cache.products[idx], ...patch }
    emitChange()
    if (patch.status === 'active') void dispatchOutbox()
  },

  async remove(id: string) {
    const supabase = getSupabase()
    await supabase.from('products').delete().eq('id', id)
    await supabase.from('cart_items').delete().eq('product_id', id)
    await supabase.from('wishlist').delete().eq('product_id', id)
    cache.products = cache.products.filter((p) => p.id !== id)
    cache.cart = cache.cart.filter((c) => c.product_id !== id)
    cache.wishlist = cache.wishlist.filter((w) => w.product_id !== id)
    emitChange()
  },

  async setStatus(id: string, status: Product['status']) {
    const supabase = getSupabase()
    await supabase.from('products').update({ status }).eq('id', id)
    const idx = cache.products.findIndex((x) => x.id === id)
    if (idx >= 0) cache.products[idx] = { ...cache.products[idx], status }
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   CART & WISHLIST
   ════════════════════════════════════════════════════════════════ */

export const cart = {
  list(userId: string) {
    return cache.cart
      .filter((c) => c.user_id === userId)
      .map((c) => ({ ...c, product: cache.products.find((p) => p.id === c.product_id)! }))
      .filter((c) => c.product)
  },
  count(userId: string) { return cache.cart.filter((c) => c.user_id === userId).length },
  async add(userId: string, productId: string, qty = 1) {
    const supabase = getSupabase()
    const existing = cache.cart.find((c) => c.user_id === userId && c.product_id === productId)
    if (existing) {
      await supabase.from('cart_items').update({ qty: existing.qty + qty }).eq('id', existing.id)
      existing.qty += qty
    } else {
      const { data } = await supabase.from('cart_items').insert({ user_id: userId, product_id: productId, qty }).select('*').single()
      if (data) cache.cart.push(data as any)
    }
    emitChange()
  },
  async setQty(userId: string, productId: string, qty: number) {
    const supabase = getSupabase()
    const c = cache.cart.find((x) => x.user_id === userId && x.product_id === productId)
    if (c) { c.qty = Math.max(1, qty); await supabase.from('cart_items').update({ qty: c.qty }).eq('id', c.id); emitChange() }
  },
  async remove(userId: string, productId: string) {
    const supabase = getSupabase()
    await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId)
    cache.cart = cache.cart.filter((c) => !(c.user_id === userId && c.product_id === productId))
    emitChange()
  },
  async clear(userId: string) {
    const supabase = getSupabase()
    await supabase.from('cart_items').delete().eq('user_id', userId)
    cache.cart = cache.cart.filter((c) => c.user_id !== userId)
    emitChange()
  },
}

export const wishlist = {
  list(userId: string) {
    return cache.wishlist
      .filter((w) => w.user_id === userId)
      .map((w) => ({ ...w, product: cache.products.find((p) => p.id === w.product_id)! }))
      .filter((w) => w.product)
  },
  has(userId: string, productId: string) {
    return cache.wishlist.some((w) => w.user_id === userId && w.product_id === productId)
  },
  async toggle(userId: string, productId: string) {
    const supabase = getSupabase()
    const i = cache.wishlist.findIndex((w) => w.user_id === userId && w.product_id === productId)
    if (i >= 0) { await supabase.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId); cache.wishlist.splice(i, 1) }
    else { const { data } = await supabase.from('wishlist').insert({ user_id: userId, product_id: productId }).select('*').single(); if (data) cache.wishlist.push(data as any) }
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   ADDRESSES
   ════════════════════════════════════════════════════════════════ */

export const addresses = {
  list: (userId: string) => cache.addresses.filter((a) => a.user_id === userId),
  async save(userId: string, addr: Omit<Address, 'id' | 'user_id'> & { id?: string }) {
    const supabase = getSupabase()
    if (addr.id) {
      await supabase.from('addresses').upsert({ ...addr, user_id: userId, id: addr.id })
    } else {
      if (addr.is_default) await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
      await supabase.from('addresses').insert({ ...addr, user_id: userId })
    }
    // Refresh addresses
    const { data } = await supabase.from('addresses').select('*').eq('user_id', userId)
    cache.addresses = cache.addresses.filter((a) => a.user_id !== userId).concat((data ?? []) as Address[])
    emitChange()
  },
  async remove(id: string) {
    const supabase = getSupabase()
    await supabase.from('addresses').delete().eq('id', id)
    cache.addresses = cache.addresses.filter((a) => a.id !== id)
    emitChange()
  },
  async setDefault(userId: string, id: string) {
    const supabase = getSupabase()
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
    await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    cache.addresses.forEach((a) => { if (a.user_id === userId) a.is_default = a.id === id })
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   ORDERS
   ════════════════════════════════════════════════════════════════ */

export const orders = {
  byId: (id: string) => cache.orders.find((o) => o.id === id || o.code === id),
  listByBuyer: (userId: string) => cache.orders.filter((o) => o.buyer_id === userId).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  listByStore: (storeId: string) => cache.orders.filter((o) => o.items.some((i) => i.store_id === storeId)).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  listAll: () => [...cache.orders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),

  async reload() {
    await refreshOrders()
    emitChange()
  },

  async place(input: { buyer: Profile; address: Address; items: Array<{ product: Product; qty: number }>; payment_method: string }): Promise<Order> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('place_order', {
      p_address: { ...input.address, email: input.buyer.email } as any,
      p_payment_method: input.payment_method,
    })
    if (error || !data) {
      console.error('[orders] place_order failed', error)
      throw new Error(error?.message || "We couldn't place your order. Please try again.")
    }
    cache.cart = cache.cart.filter((c) => c.user_id !== input.buyer.id)
    await refreshOrders()
    const { data: prods } = await supabase.from('products').select('*')
    if (prods) cache.products = prods as Product[]
    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', input.buyer.id).order('created_at', { ascending: false })
    if (notifs) cache.notifications = notifs as Notification[]
    emitChange()
    void dispatchOutbox()
    void supabase.functions.invoke('payment-providers', { body: { provider: input.payment_method, order_id: (data as Order).id } }).catch((e) => {
      console.error('[orders] payment-providers', e)
    })
    const placed = cache.orders.find((o) => o.id === (data as any).id || o.code === (data as any).code)
    if (!placed) {
      const fallback: Order = {
        ...(data as Order),
        status: normalizeOrderStatus((data as any).status ?? 'submitted'),
        items: input.items.map((i, idx) => ({
          id: `tmp-${idx}`,
          product_id: i.product.id,
          store_id: i.product.store_id,
          name: i.product.name,
          image: i.product.image,
          qty: i.qty,
          price: i.product.price,
          status: 'submitted',
        })),
      }
      cache.orders.unshift(fallback)
      emitChange()
      return fallback
    }
    return placed
  },

  async setItemStatus(orderId: string, itemId: string, status: OrderStatus) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('set_order_item_status', { p_order_item: itemId, p_status: normalizeOrderStatus(status) })
    if (error) {
      console.error('[orders] set_order_item_status failed', error)
      throw new Error(error.message)
    }
    await refreshOrders()
    emitChange()
  },

  async advance(orderId: string, status: CanonicalOrderStatus) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('advance_order', { p_order_id: orderId, p_to: status })
    if (error) {
      console.error('[orders] advance_order failed', error)
      throw new Error(error.message)
    }
    await refreshOrders()
    const uid = _cachedProfile?.id
    if (uid) {
      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      if (notifs) cache.notifications = notifs as Notification[]
    }
    emitChange()
  },

  history(orderId: string) {
    return cache.orderHistory.filter((h) => h.order_id === orderId).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
  },

  async cancel(orderId: string) {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
    if (error) {
      console.error('[orders] cancel_order failed', error)
      throw new Error(error.message)
    }
    await refreshOrders()
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   REVIEWS
   ════════════════════════════════════════════════════════════════ */

export const reviews = {
  byProduct: (productId: string) => cache.reviews.filter((r) => r.product_id === productId && r.is_approved).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  byBuyer: (buyerId: string) => cache.reviews.filter((r) => r.buyer_id === buyerId),
  listAll: () => [...cache.reviews].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  canReview(buyerId: string, productId: string) {
    return cache.orders.some((o) =>
      o.buyer_id === buyerId && o.items.some((i) => i.product_id === productId && ['reached_to_buyer', 'delivered'].includes(i.status)),
    ) && !cache.reviews.some((r) => r.buyer_id === buyerId && r.product_id === productId)
  },
  async create(input: { productId: string; buyer: Profile; rating: number; comment: string }) {
    const supabase = getSupabase()
    const { data: orderItems } = await supabase
      .from('order_items').select('order_id, orders!inner(buyer_id)')
      .in('status', ['reached_to_buyer', 'delivered'])
    const matchingOrder = (orderItems ?? []).find((oi: any) => oi.orders?.buyer_id === input.buyer.id)
    const { data: review } = await supabase.from('reviews').insert({
      product_id: input.productId, order_id: matchingOrder?.order_id,
      buyer_id: input.buyer.id, buyer_name: input.buyer.full_name,
      rating: input.rating, comment: input.comment.trim(), is_approved: true,
    }).select('*').single()
    cache.reviews.push(review as Review)
    // Refresh products for updated ratings
    const { data: prods } = await supabase.from('products').select('*')
    cache.products = (prods ?? []) as Product[]
    // Notify seller
    const product = cache.products.find((p) => p.id === input.productId)
    if (product) {
      await supabase.from('notifications').insert({ user_id: product.seller_id, type: 'review', title: `New ${input.rating}★ review`, body: `${input.buyer.full_name} reviewed one of your products.` })
    }
    emitChange()
  },
  async setApproved(id: string, approved: boolean) {
    const supabase = getSupabase()
    await supabase.from('reviews').update({ is_approved: approved }).eq('id', id)
    const idx = cache.reviews.findIndex((x) => x.id === id)
    if (idx >= 0) cache.reviews[idx] = { ...cache.reviews[idx], is_approved: approved }
    emitChange()
  },
}

/* ════════════════════════════════════════════════════════════════
   MESSAGING
   ════════════════════════════════════════════════════════════════ */

export const messaging = {
  conversationsFor(userId: string, opts?: { storeId?: string }): Array<Conversation & { counterpart: Profile | undefined }> {
    return cache.conversations
      .filter((c) => {
        if (!(c.buyer_id === userId || c.seller_id === userId)) return false
        if (opts?.storeId && c.store_id && c.store_id !== opts.storeId) return false
        return true
      })
      .map((c) => {
        const counterpartId = c.buyer_id === userId ? c.seller_id : c.buyer_id
        // Look up counterpart from all known profiles (including previously fetched ones)
        const counterpart = cache.profiles.find((p) => p.id === counterpartId) ?? undefined
        return { ...c, counterpart }
      })
      .sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at))
  },
  byId: (id: string) => cache.conversations.find((c) => c.id === id),
  messages: (conversationId: string) =>
    cache.messages.filter((m) => m.conversation_id === conversationId).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
  lastMessage: (conversationId: string) => {
    const list = cache.messages.filter((m) => m.conversation_id === conversationId)
    return list[list.length - 1]
  },

  async start(input: { buyerId: string; sellerId: string; productId?: string; storeId?: string; orderCode?: string; body: string }): Promise<Conversation> {
    const supabase = getSupabase()
    const existing = cache.conversations.find((c) =>
      c.buyer_id === input.buyerId && c.seller_id === input.sellerId && (input.storeId ? c.store_id === input.storeId || !c.store_id : true),
    )
    let convId = existing?.id
    if (!convId) {
      const { data: conv } = await supabase.from('conversations').insert({
        buyer_id: input.buyerId, seller_id: input.sellerId, product_id: input.productId,
        store_id: input.storeId ?? null, order_code: input.orderCode,
      }).select('*').single()
      convId = conv!.id
      cache.conversations.push(conv as Conversation)
    }
    await messaging.send(convId!, input.buyerId, input.body)
    return messaging.byId(convId!)!
  },

  async send(conversationId: string, senderId: string, body: string): Promise<Message> {
    const supabase = getSupabase()
    const { data: msg } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() }).select('*').single()
    cache.messages.push(msg as Message)
    // Update conversation last_at and unread counters
    const conv = cache.conversations.find((x) => x.id === conversationId)
    if (conv) {
      conv.last_at = msg!.created_at
      if (senderId === conv.buyer_id) { conv.seller_unread += 1; conv.buyer_unread = 0 }
      else { conv.buyer_unread += 1; conv.seller_unread = 0 }
    }
    // Fetch sender profile for notifications
    if (!_cachedProfile || _cachedProfile.id !== senderId) {
      const { data: senderProfile } = await supabase.from('public_profiles').select('*').eq('id', senderId).single()
      if (senderProfile && !cache.profiles.find((p) => p.id === senderId)) {
        cache.profiles.push(senderProfile as Profile)
      }
    }
    // Trigger the on_message_sent trigger already handles notifications + unread counters in DB
    // But we also update local cache for immediate UI update
    const recipient = senderId === conv?.buyer_id ? conv.seller_id : conv?.buyer_id
    const senderName = _cachedProfile?.id === senderId ? _cachedProfile.full_name : cache.profiles.find((p) => p.id === senderId)?.full_name ?? 'a user'
    if (recipient && recipient === _cachedProfile?.id) {
      cache.notifications.unshift({
        id: `n-${Date.now().toString(36)}`, user_id: recipient, type: 'message',
        title: `New message from ${senderName}`, body: body.trim().slice(0, 90),
        read: false, created_at: nowIso(),
      })
    }
    emitChange()
    return msg as Message
  },

  async markRead(conversationId: string, userId: string) {
    const supabase = getSupabase()
    const c = cache.conversations.find((x) => x.id === conversationId)
    if (!c) return
    const update: Record<string, number> = {}
    if (c.buyer_id === userId) { c.buyer_unread = 0; update.buyer_unread = 0 }
    if (c.seller_id === userId) { c.seller_unread = 0; update.seller_unread = 0 }
    if (Object.keys(update).length) await supabase.from('conversations').update(update).eq('id', conversationId)
    emitChange()
  },

  listAll() {
    return cache.conversations
      .map((c) => ({
        ...c,
        buyer_name: cache.profiles.find((p) => p.id === c.buyer_id)?.full_name ?? c.buyer_id,
        seller_name: cache.profiles.find((p) => p.id === c.seller_id)?.full_name ?? c.seller_id,
      }))
      .sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at))
  },
}

/* ════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ════════════════════════════════════════════════════════════════ */

export const notifications = {
  list: (userId: string) => cache.notifications.filter((n) => n.user_id === userId).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  unreadCount: (userId: string) => cache.notifications.filter((n) => n.user_id === userId && !n.read).length,
  async markRead(id: string) {
    const supabase = getSupabase()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    const n = cache.notifications.find((x) => x.id === id); if (n) n.read = true
    emitChange()
  },
  async markAllRead(userId: string) {
    const supabase = getSupabase()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    cache.notifications.forEach((n) => { if (n.user_id === userId) n.read = true })
    emitChange()
  },
  async push(input: { user_id: string; type: Notification['type']; title: string; body: string }) {
    const supabase = getSupabase()
    const { data } = await supabase.from('notifications').insert({ ...input, read: false }).select('*').single()
    if (data) cache.notifications.unshift(data as Notification)
    emitChange()
  },
  listAll: () => [...cache.notifications].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
}

export const emailSubscribers = {
  async subscribe(email: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('subscribe_email', { p_email: email })
    if (error) throw new Error(error.message)
    return data as { ok: boolean; email: string; is_subscribed: boolean }
  },
  async unsubscribe(token: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('unsubscribe_email', { p_token: token })
    if (error) throw new Error(error.message)
    return data as { ok: boolean }
  },
}

/* ════════════════════════════════════════════════════════════════
   USERS (admin)
   ════════════════════════════════════════════════════════════════ */

export const users = {
  list: (role?: Role) => cache.profiles.filter((p) => !role || p.role === role),
  byId: (id: string) => cache.profiles.find((p) => p.id === id),
  async setBlocked(id: string, blocked: boolean) {
    const supabase = getSupabase()
    await supabase.from('profiles').update({ is_blocked: blocked }).eq('id', id)
    const u = cache.profiles.find((p) => p.id === id); if (u) u.is_blocked = blocked
    emitChange()
  },
  async setRole(id: string, role: Role) {
    const supabase = getSupabase()
    await supabase.from('profiles').update({ role }).eq('id', id)
    const u = cache.profiles.find((p) => p.id === id); if (u) u.role = role
    emitChange()
  },
}

/** Ensure admin profiles are loaded (called when admin pages mount). */
export async function ensureAdminData() {
  if (!isSupabaseConfigured) return
  try {
    const supabase = getSupabase()
    const [{ data: profiles }, { data: settings }, storesRes, reviewsRes] = await Promise.all([
      supabase.from('public_profiles').select('*'),
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
      supabase.from('seller_stores').select('*'),
      supabase.from('reviews').select('*'),
    ])
  cache.profiles = (profiles ?? []) as Profile[]
  if (settings) cache.settings = settings as any
  cache.stores = (storesRes.data ?? []) as Store[]
  cache.reviews = (reviewsRes.data ?? []) as Review[]
  await refreshOrders()
  emitChange()
} catch { /* Supabase not configured */ }
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS & REPORTS
   ════════════════════════════════════════════════════════════════ */

export const settings = {
  get: () => cache.settings,
  async update(patch: Partial<DBState['settings']>) {
    const supabase = getSupabase()
    await supabase.from('platform_settings').update(patch).eq('id', 1)
    Object.assign(cache.settings, patch)
    emitChange()
  },
}

export const reports = {
  list: () => [...cache.reports].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  async create(kind: Report['kind']): Promise<Report> {
    const supabase = getSupabase()
    const s = await stats.admin()
    const label = { sales: 'Sales & revenue', users: 'Users & sellers', products: 'Products & categories', reviews: 'Reviews' }[kind]
    const summary = {
      sales: `${s.orders} orders · Rs ${Math.round(s.revenue).toLocaleString()} revenue · Rs ${Math.round(s.commission).toLocaleString()} platform commission (8%).`,
      users: `${s.users} users — ${s.buyers} buyers and ${s.sellers} sellers. ${s.pendingStores} store application(s) awaiting approval.`,
      products: `${s.products} products across ${s.categories} categories.`,
      reviews: `${s.reviews} reviews · average rating ${s.avgRating}★.`,
    }[kind]
    const { data: inserted, error: repErr } = await supabase.from('reports').insert({ title: `${label} report`, kind, range: 'Live snapshot', summary }).select('*').single()
    if (repErr || !inserted) throw new Error(repErr?.message ?? 'Failed to create report')
    const rep = inserted as Report
    cache.reports.unshift(rep)
    emitChange()
    return rep
  },
}

/* ════════════════════════════════════════════════════════════════
   STATS (mostly sync reads from cache)
   ════════════════════════════════════════════════════════════════ */

export const stats = {
  landing() {
    const cities = new Set<string>()
    for (const o of cache.orders) if (o.address?.city) cities.add(o.address.city)
    for (const p of cache.profiles) if (p.location) cities.add(p.location)
    return {
      categories: cache.categories.length,
      creators: cache.stores.filter((st) => st.is_approved && !st.deleted_at).length,
      products: cache.products.filter((p) => p.status === 'active').length,
      orders: cache.orders.length,
      cities: cities.size || 6,
    }
  },

  admin() {
    const paid = cache.orders.filter((o) => o.payment === 'paid')
    const revenue = paid.reduce((sum, o) => sum + o.total, 0)
    const commission = paid.reduce((sum, o) => sum + o.commission, 0)
    const ratings = cache.reviews.filter((r) => r.is_approved)
    return {
      users: cache.profiles.length, buyers: cache.profiles.filter((p) => p.role === 'buyer').length,
      sellers: cache.profiles.filter((p) => p.role === 'seller').length, admins: cache.profiles.filter((p) => p.role === 'admin').length,
      pendingStores: cache.stores.filter((st) => !st.is_approved).length,
      products: cache.products.length, activeProducts: cache.products.filter((p) => p.status === 'active').length,
      pendingProducts: cache.products.filter((p) => p.status === 'pending').length, categories: cache.categories.length,
      orders: cache.orders.length, revenue, commission,
      reviews: cache.reviews.length, pendingReviews: cache.reviews.filter((r) => !r.is_approved).length,
      avgRating: ratings.length ? Math.round((ratings.reduce((a, r) => a + r.rating, 0) / ratings.length) * 10) / 10 : 0,
      ordersByStatus: (['submitted', 'packaging', 'packed', 'sent_to_platform', 'on_way', 'reached_to_buyer', 'cancelled'] as OrderStatus[])
        .map((k) => ({ key: k, count: cache.orders.filter((o) => o.status === k).length })),
    }
  },

  seller(storeId: string) {
    const store = cache.stores.find((x) => x.id === storeId)
    const mine = cache.orders.filter((o) => !['cancelled'].includes(o.status) && o.items.some((i) => i.store_id === storeId))
    let gross = 0
    for (const o of mine) for (const i of o.items) if (i.store_id === storeId && i.status !== 'cancelled') gross += i.price * i.qty
    const commission = gross * 0.08
    const prods = cache.products.filter((p) => p.store_id === storeId)
    const reviewsForStore = cache.reviews.filter((r) => prods.some((p) => p.id === r.product_id))
    return {
      store, orders: mine.length, gross, commission, earnings: gross - commission,
      products: prods.length, active: prods.filter((p) => p.status === 'active').length,
      outOfStock: prods.filter((p) => p.stock === 0).length,
      reviews: reviewsForStore.length,
      avgRating: reviewsForStore.length ? Math.round((reviewsForStore.reduce((a, r) => a + r.rating, 0) / reviewsForStore.length) * 10) / 10 : 0,
      customers: new Set(mine.map((o) => o.buyer_id)).size,
    }
  },

  monthlySeries(months: string[], pick: (o: Order) => number) {
    const map = new Map(months.map((m) => [m, 0]))
    for (const o of cache.orders) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + pick(o))
    }
    return months.map((m) => map.get(m) ?? 0)
  },
}

/* ════════════════════════════════════════════════════════════════
   STORAGE — product image uploads (Supabase Storage)
   ════════════════════════════════════════════════════════════════ */

const PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const storage = {
  allowedTypes: PRODUCT_IMAGE_TYPES,
  maxBytes: PRODUCT_IMAGE_MAX_BYTES,

  async uploadProductImage(file: File, sellerId: string): Promise<string> {
    if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
      throw new Error('Please use a JPG, PNG or WEBP image.')
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      throw new Error('Image must be 5 MB or smaller.')
    }
    const supabase = getSupabase()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg')
    const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) throw new Error(error.message || 'Could not upload the image. Please try again.')
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  },

  async uploadPaymentProof(file: File, userId: string, orderId: string): Promise<string> {
    const supabase = getSupabase()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${userId}/${orderId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(error.message || 'Could not upload payment proof.')
    const { data: tx } = await supabase.from('payment_transactions').select('id').eq('order_id', orderId).eq('buyer_id', userId).maybeSingle()
    if (tx) {
      await supabase.from('payment_transactions').update({ proof_url: path, status: 'awaiting_proof', updated_at: new Date().toISOString() }).eq('id', tx.id)
    }
    return path
  },
}
