/**
 * Deep audit — check table structures, data counts, trigger functions, etc.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => {
    const [k, ...v] = l.split('=')
    return [k.trim(), v.join('=').trim()]
  })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  DEEP AUDIT                              ║')
  console.log('╚══════════════════════════════════════════╝')

  // 1. Count rows in each table (anon readable ones)
  console.log('\n══════ DATA COUNTS (anon-accessible) ══════')
  for (const table of ['categories', 'products', 'product_images', 'seller_stores', 'reviews', 'platform_settings']) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`  ${table}: ${error ? 'ERROR: ' + error.message : count + ' rows'}`)
  }

  // 2. Count rows in restricted tables (these should be 0 or blocked)
  console.log('\n══════ DATA COUNTS (restricted - anon should see 0) ══════')
  for (const table of ['profiles', 'orders', 'order_items', 'payments', 'messages', 'conversations', 'notifications', 'addresses', 'cart_items', 'wishlist']) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`  ${table}: BLOCKED (${error.code}) — correct`)
    } else {
      console.log(`  ${table}: ${count} rows ${count === 0 ? '(empty)' : '⚠️ anon can see data!'}`)
    }
  }

  // 3. Check public_profiles columns
  console.log('\n══════ PUBLIC_PROFILES VIEW COLUMNS ══════')
  const { data: ppData, error: ppErr } = await supabase.from('public_profiles').select('*').limit(1)
  if (ppErr) {
    console.log(`  ERROR: ${ppErr.message}`)
  } else if (ppData && ppData.length > 0) {
    console.log(`  Columns: ${Object.keys(ppData[0]).join(', ')}`)
  } else {
    console.log('  View exists but no rows — checking column structure via select all...')
    const { data: ppAll } = await supabase.from('public_profiles').select('*')
    if (ppAll && ppAll.length > 0) {
      console.log(`  Columns: ${Object.keys(ppAll[0]).join(', ')}`)
    } else {
      console.log('  No data in profiles/public_profiles')
    }
  }

  // 4. Check if check_email_exists works correctly
  console.log('\n══════ CHECK EMAIL EXISTS RPC TEST ══════')
  const { data: ce1, error: ce1e } = await supabase.rpc('check_email_exists', { p_email: 'test@test.com' })
  console.log(`  check_email_exists('test@test.com'): ${ce1e ? 'ERROR: ' + ce1e.message : ce1}`)
  
  // Check if it does NOT leak user info
  console.log(`  Returns boolean (not user data): ${typeof ce1 === 'boolean' ? '✅ Yes' : '⚠️ Returns: ' + typeof ce1}`)

  // 5. Check if check_username_exists works correctly  
  console.log('\n══════ CHECK USERNAME EXISTS RPC TEST ══════')
  const { data: cu1, error: cu1e } = await supabase.rpc('check_username_exists', { p_username: 'admin' })
  console.log(`  check_username_exists('admin'): ${cu1e ? 'ERROR: ' + cu1e.message : cu1}`)
  console.log(`  Returns boolean (not user data): ${typeof cu1 === 'boolean' ? '✅ Yes' : '⚠️ Returns: ' + typeof cu1}`)

  // 6. Try a test signup to verify trigger works
  console.log('\n══════ AUTH TRIGGER TEST ══════')
  const testEmail = `audit-test-${Date.now()}@test.example.com`
  const testPass = 'TestPassword123!'
  
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPass,
    options: { data: { full_name: 'Audit Test', username: `audituser${Date.now()}` } }
  })
  
  if (signUpErr) {
    console.log(`  Signup error: ${signUpErr.message}`)
  } else if (signUpData?.user) {
    console.log(`  ✅ Auth user created: ${signUpData.user.id}`)
    
    // Wait for trigger
    await new Promise(r => setTimeout(r, 2000))
    
    // Check if profile was created
    const { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id', signUpData.user.id).single()
    if (profErr) {
      console.log(`  ❌ Profile not created: ${profErr.message}`)
    } else {
      console.log(`  ✅ Profile created: id=${prof.id}, username=${prof.username}, role=${prof.role}`)
      console.log(`  Full name: ${prof.full_name}, email: ${prof.email}`)
    }
    
    // Cleanup — sign out
    await supabase.auth.signOut()
    
    // Note: We can't delete the test user via anon key, but that's OK
    console.log(`  ℹ️  Test user created: ${testEmail} (manual cleanup needed)`)
  } else {
    console.log(`  Signup returned no user and no error — email confirmation may be required`)
  }

  // 7. Check the realtime publication
  console.log('\n══════ REALTIME CHECK ══════')
  // We can't check publication via PostgREST, but we can test if the app's realtime setup would work
  console.log('  ℹ️  Realtime publication check requires SQL access (Supabase Dashboard > Database > Replication)')
  console.log('  ℹ️  Verify these tables are in supabase_realtime publication:')
  console.log('     products, orders, order_items, cart_items, wishlist, notifications,')
  console.log('     messages, conversations, reviews, categories, seller_stores, platform_settings')
}

main().catch(err => { console.error(err); process.exit(1) })
