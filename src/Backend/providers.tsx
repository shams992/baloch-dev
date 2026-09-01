import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { _setCachedProfile, initDb, initUserCache, subscribe, getVersion } from './db'
import type { Profile } from './types'

/* ── Theme ────────────────────────────────────────────────────── */
export type AppTheme = 'original' | 'light' | 'alternative'
export const THEME_OPTIONS: Array<{ id: AppTheme; label: string; hint: string }> = [
  { id: 'original', label: 'Original', hint: 'Signature charcoal & gold' },
  { id: 'light', label: 'Light', hint: 'Soft off-white marketplace' },
  { id: 'alternative', label: 'Alternative', hint: 'Ink & copper' },
]

const ThemeCtx = createContext<{
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  toggle: () => void
}>({ theme: 'original', setTheme: () => {}, toggle: () => {} })

function migrateTheme(raw: string | null): AppTheme | null {
  if (raw === 'original' || raw === 'light' || raw === 'alternative') return raw
  if (raw === 'dark') return 'original'
  return null
}

function initialTheme(): AppTheme {
  try {
    const saved = migrateTheme(localStorage.getItem('beh-theme'))
    if (saved) return saved
  } catch { /* noop */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'original'
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme !== 'light')
  try { localStorage.setItem('beh-theme', theme) } catch { /* noop */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const setTheme = useCallback((t: AppTheme) => setThemeState(t), [])
  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle: () => setThemeState((t) => (t === 'light' ? 'original' : 'light')),
    }),
    [theme, setTheme],
  )
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}
export const useTheme = () => useContext(ThemeCtx)

/* ── Auth ─────────────────────────────────────────────────────── */
const AuthCtx = createContext<{ user: Profile | null; loading: boolean; refreshProfile: () => Promise<void> }>({ user: null, loading: true, refreshProfile: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let supabase: ReturnType<typeof getSupabase>
    try {
      supabase = getSupabase()
    } catch {
      setLoading(false)
      return
    }

    // Initialize the Supabase-backed cache
    initDb().then(async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchProfile(supabase, session.user.id, setUser)
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(supabase, session.user.id, setUser)
      } else {
        setUser(null)
        _setCachedProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) return
    let supabase: ReturnType<typeof getSupabase>
    try { supabase = getSupabase() } catch { return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await fetchProfile(supabase, session.user.id, setUser)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, refreshProfile }), [user, loading, refreshProfile])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export const useAuth = () => useContext(AuthCtx)

/** Fetch the profiles row and populate user cache for a given auth user id. */
async function fetchProfile(supabase: ReturnType<typeof getSupabase>, userId: string, setUser: (p: Profile | null) => void) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    setUser(null)
    _setCachedProfile(null)
    return
  }

  if (data.is_blocked) {
    setUser(null)
    _setCachedProfile(null)
    return
  }

  _setCachedProfile(data as Profile)
  setUser(data as Profile)

  // Populate user-specific cache (orders, cart, etc.) — fire-and-forget
  // so setLoading(false) in the caller is never blocked by heavy queries.
  void initUserCache(userId)
}

/* ── Live DB access (re-renders on any data mutation) ─────────── */
export function useDb() {
  return useSyncExternalStore(subscribe, getVersion)
}
