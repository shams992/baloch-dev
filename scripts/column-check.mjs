/**
 * Check seller_stores columns by attempting targeted selects
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
  console.log('══════ SELLER_STORES COLUMN CHECK ══════')

  // Try selecting specific columns to see which exist
  const colsToCheck = ['banner', 'banner_url', 'logo_url', 'logo_color', 'logo_initials', 'slug', 'seller_id', 'name', 'description', 'category_slugs', 'location', 'rating', 'total_sales', 'is_approved', 'blocked']
  
  for (const col of colsToCheck) {
    const { data, error } = await supabase.from('seller_stores').select(col).limit(1)
    if (error && error.message?.includes(col)) {
      console.log(`  ❌ ${col}: DOES NOT EXIST`)
    } else {
      console.log(`  ✅ ${col}: EXISTS`)
    }
  }

  // Also check product_images structure
  console.log('\n══════ PRODUCT_IMAGES COLUMN CHECK ══════')
  const imgCols = ['id', 'product_id', 'url', 'sort_order']
  for (const col of imgCols) {
    const { data, error } = await supabase.from('product_images').select(col).limit(1)
    if (error && error.message?.includes(col)) {
      console.log(`  ❌ ${col}: DOES NOT EXIST`)
    } else {
      console.log(`  ✅ ${col}: EXISTS`)
    }
  }

  // Check order_items columns
  console.log('\n══════ ORDER_ITEMS COLUMN CHECK ══════')
  const oiCols = ['id', 'order_id', 'product_id', 'store_id', 'name', 'image', 'qty', 'price', 'status', 'tracking_code']
  for (const col of oiCols) {
    const { data, error } = await supabase.from('order_items').select(col).limit(1)
    if (error && error.message?.includes(col)) {
      console.log(`  ❌ ${col}: DOES NOT EXIST`)
    } else {
      console.log(`  ✅ ${col}: EXISTS`)
    }
  }

  // Check reviews columns
  console.log('\n══════ REVIEWS COLUMN CHECK ══════')
  const revCols = ['id', 'product_id', 'order_id', 'buyer_id', 'buyer_name', 'rating', 'comment', 'is_approved', 'created_at']
  for (const col of revCols) {
    const { data, error } = await supabase.from('reviews').select(col).limit(1)
    if (error && error.message?.includes(col)) {
      console.log(`  ❌ ${col}: DOES NOT EXIST`)
    } else {
      console.log(`  ✅ ${col}: EXISTS`)
    }
  }

  // Check notifications columns
  console.log('\n══════ NOTIFICATIONS COLUMN CHECK ══════')
  const notifCols = ['id', 'user_id', 'type', 'title', 'body', 'read', 'created_at']
  for (const col of notifCols) {
    const { data, error } = await supabase.from('notifications').select(col).limit(1)
    if (error && error.message?.includes(col)) {
      console.log(`  ❌ ${col}: DOES NOT EXIST`)
    } else {
      console.log(`  ✅ ${col}: EXISTS`)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
