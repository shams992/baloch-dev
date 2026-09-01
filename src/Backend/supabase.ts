/**
 * Supabase client singleton.
 *
 * Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.
 * Exports a lazily-created, shared Supabase browser client.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/** Validate that a URL looks like a real Supabase project URL. */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && /\.supabase\.co$/.test(parsed.hostname)
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && isValidSupabaseUrl(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20,
)

let client: SupabaseClient | null = null

/**
 * Detect and clear stale Supabase sessions stored in localStorage.
 *
 * When `autoRefreshToken` is enabled, Supabase tries to silently refresh
 * expired tokens on client startup.  If the refresh token itself is expired
 * or revoked, the internal refresh can hang indefinitely, causing the
 * 30-second timeout the user sees on subsequent logins.
 *
 * We peek into localStorage (without network calls) to find the stored
 * session and compare `expires_at` against `Date.now()`.  If the session
 * is expired by more than a generous grace window we remove it so the
 * next `signInWithPassword` call starts from a clean slate.
 */
function clearStaleSession() {
  try {
    // Supabase stores the auth token under `sb-<project-ref>-auth-token`
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
    const key = `sb-${projectRef}-auth-token`
    const raw = localStorage.getItem(key)
    if (!raw) return

    const stored = JSON.parse(raw)
    // The expires_at is seconds since epoch for the access token.
    const expiresAt: number | undefined = stored?.expires_at
    if (!expiresAt) return // no expiry info → assume still valid

    // Clear if expired or within 5 minutes of expiry.
    // A near-expiry session is almost certainly going to fail the silent
    // refresh that autoRefreshToken triggers on startup, causing a hang.
    const EXPIRY_WINDOW_MS = 5 * 60_000 // 5 minutes
    if (Date.now() > expiresAt * 1000 - EXPIRY_WINDOW_MS) {
      console.warn('[supabase] Clearing stale session (expired or expiring soon —',
        Math.round((Date.now() - expiresAt * 1000) / 60_000), 'min ago)')
      localStorage.removeItem(key)
      // Also clear the refresh-token key if Supabase created one
      localStorage.removeItem(`${key}-refresh`)
    }
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

/**
 * Remove all Supabase auth tokens from localStorage for this project.
 *
 * This is used before `signInWithPassword` / `signUp` to guarantee that
 * Supabase's `autoRefreshToken` mechanism won't try to refresh a stale or
 * revoked session — which is the primary cause of the 30-second timeout
 * users see on their first login after registering.
 */
export function clearStoredAuthTokens() {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
    const prefix = `sb-${projectRef}-auth-token`
    // Remove main token and any refresh/key-related entries
    localStorage.removeItem(prefix)
    localStorage.removeItem(`${prefix}-refresh`)
    localStorage.removeItem(`${prefix}-code-verifier`)
    localStorage.removeItem(`${prefix}-pkce`)
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

/** Get or create the shared Supabase client. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Set your real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      )
    }
    clearStaleSession()
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
    })
  }
  return client
}
