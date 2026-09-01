/**
 * Fix missing storage buckets
 * Creates the 4 required storage buckets with correct public access
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

const BUCKETS = [
  { id: 'product-images', name: 'product-images', public: true },
  { id: 'store-branding', name: 'store-branding', public: true },
  { id: 'profile-images', name: 'profile-images', public: true },
  { id: 'category-images', name: 'category-images', public: true },
]

async function main() {
  console.log('Creating storage buckets...\n')

  for (const b of BUCKETS) {
    const { data, error } = await supabase.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })
    if (error) {
      if (error.message?.includes('already exists')) {
        console.log(`  ⚠️  ${b.id}: already exists`)
      } else {
        console.error(`  ❌ ${b.id}: ${error.message}`)
      }
    } else {
      console.log(`  ✅ ${b.id}: created (public: ${b.public})`)
    }
  }

  // Verify
  console.log('\nVerifying buckets...')
  const { data: buckets } = await supabase.storage.listBuckets()
  for (const b of BUCKETS) {
    const found = buckets?.find(x => x.id === b.id)
    console.log(`  ${found ? '✅' : '❌'} ${b.id}: ${found ? `public=${found.public}` : 'MISSING'}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
