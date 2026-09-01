/**
 * Apply RLS fix for seller order access
 * Runs the migration SQL via Supabase SQL API
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
  console.log('Attempting to apply seller orders RLS fix...\n')
  
  const sql = `
    DROP POLICY IF EXISTS "seller reads related orders" ON public.orders;
    CREATE POLICY "seller reads related orders" ON public.orders
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = public.orders.id
            AND EXISTS (
              SELECT 1 FROM public.seller_stores s
              WHERE s.id = oi.store_id AND s.seller_id = auth.uid()
            )
        )
      );

    DROP POLICY IF EXISTS "seller reads related payments" ON public.payments;
    CREATE POLICY "seller reads related payments" ON public.payments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = public.payments.order_id
            AND EXISTS (
              SELECT 1 FROM public.seller_stores s
              WHERE s.id = oi.store_id AND s.seller_id = auth.uid()
            )
        )
      );
  `

  // Try via the Supabase SQL API (rest/v1/rpc approach won't work for DDL)
  // The anon key can't execute DDL. We need the service_role key.
  // Let's try via the management API instead.
  
  const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
  
  // Try the SQL API endpoint
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  
  if (response.ok) {
    const result = await response.json()
    console.log('✅ Migration applied successfully:', result)
  } else {
    const text = await response.text()
    console.log(`⚠️  SQL API returned ${response.status}: ${text}`)
    console.log('\nThe anon key cannot execute DDL statements.')
    console.log('Please run this SQL manually in the Supabase Dashboard SQL Editor:')
    console.log('\n--- START SQL ---')
    console.log(sql)
    console.log('--- END SQL ---')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
