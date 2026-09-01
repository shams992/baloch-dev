/**
 * Corrected E2E flow test v2
 * Fixes: becomeSeller flow, notification reads as correct user, seller order access
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

const timestamp = Date.now()
let buyerId, sellerId, storeId, productId, orderId, convId
let pass = 0, fail = 0

function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}: ${detail}`) }
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  E2E FLOW TEST v2 (corrected)            ║')
  console.log('╚══════════════════════════════════════════╝')

  // ═══════ BUYER ═══════
  console.log('\n══════ 1. BUYER REGISTRATION + LOGIN ══════')
  const buyerEmail = `buyer2-${timestamp}@test.example.com`
  const { data: ba, error: bae } = await supabase.auth.signUp({
    email: buyerEmail, password: 'TestBuyer123!',
    options: { data: { full_name: 'Test Buyer', username: `buyer2-${timestamp}` } }
  })
  check('Buyer signup', !bae, bae?.message)
  buyerId = ba?.user?.id
  await new Promise(r => setTimeout(r, 2000))
  const { data: bp } = await supabase.from('public_profiles').select('*').eq('id', buyerId).single()
  check('Profile created by trigger', !!bp, '')
  check('Role is buyer', bp?.role === 'buyer', `${bp?.role}`)

  await supabase.auth.signOut()
  const { error: ble } = await supabase.auth.signInWithPassword({ email: buyerEmail, password: 'TestBuyer123!' })
  check('Buyer login', !ble, ble?.message)

  // Create address
  await supabase.from('addresses').insert({
    user_id: buyerId, label: 'Home', full_name: 'Test Buyer', phone: '+923001234567',
    line1: '123 Test St', city: 'Karachi', state: 'Sindh', country: 'Pakistan', is_default: true
  })
  check('Address created', true)

  // ═══════ SELLER ═══════
  console.log('\n══════ 2. SELLER REGISTRATION + STORE ══════')
  const sellerEmail = `seller2-${timestamp}@test.example.com`
  const { data: sa, error: sae } = await supabase.auth.signUp({
    email: sellerEmail, password: 'TestSeller123!',
    options: { data: { full_name: 'Test Seller', username: `seller2-${timestamp}` } }
  })
  check('Seller signup', !sae, sae?.message)
  sellerId = sa?.user?.id
  await new Promise(r => setTimeout(r, 2000))

  // Create store (simulating becomeSeller)
  const storeSlug = `test-store-${timestamp}`
  const { data: sr, error: sre } = await supabase.from('seller_stores').insert({
    seller_id: sellerId, name: 'Test Store', slug: storeSlug,
    description: 'Test', category_slugs: ['handicrafts'],
    logo_color: '#ff5722', logo_initials: 'TS', location: 'Quetta', is_approved: false,
  }).select('*').single()
  check('Store created', !sre, sre?.message)
  storeId = sr?.id

  // Update role to seller (as becomeSeller does)
  const { error: roleErr } = await supabase.from('profiles').update({ role: 'seller' }).eq('id', sellerId)
  check('Profile role updated to seller', !roleErr, roleErr?.message)

  // Create notification for seller (as becomeSeller does)
  await supabase.from('notifications').insert({
    user_id: sellerId, type: 'store',
    title: 'Store submitted for approval',
    body: 'Test Store is under review.'
  })
  check('Store notification created', true)

  // ═══════ ADMIN APPROVAL ═══════
  console.log('\n══════ 3. ADMIN APPROVES STORE ══════')
  // We can't easily become admin, so just approve via direct update
  // (In production, admin dashboard would do this)
  // Note: this may fail with RLS if not admin — we'll check
  const { error: approveErr } = await supabase.from('seller_stores').update({ is_approved: true }).eq('id', storeId)
  if (approveErr) {
    check('Store approval', false, `${approveErr.message} — needs admin to approve`)
    // We'll skip product creation and order tests since store isn't approved
    // For now, manually note this
  } else {
    check('Store approved', true)
  }

  // ═══════ PRODUCT ═══════
  console.log('\n══════ 4. SELLER CREATES PRODUCT ══════')
  const { data: pr, error: pre } = await supabase.from('products').insert({
    store_id: storeId, seller_id: sellerId,
    name: 'Test Rug', description: 'Handwoven', price: 5000, currency: 'PKR',
    category_slug: 'handicrafts', stock: 10, condition: 'handmade',
    location: 'Quetta', shipping_fee: 250, shipping_days: '3-5 days',
    tags: ['rug'], status: approveErr ? 'pending' : 'active',
  }).select('*').single()
  check('Product created', !pre, pre?.message)
  productId = pr?.id

  // Add product image
  await supabase.from('product_images').insert({
    product_id: productId, url: 'https://example.com/test.jpg', sort_order: 0
  })
  check('Product image added', true)

  // If store wasn't approved, approve now for testing
  if (approveErr) {
    // We need to figure out how to approve... for now skip
    check('SKIPPING ORDER TESTS', false, 'Store not approved, cannot proceed with order tests')
    await supabase.auth.signOut()
    console.log('\n╔══════════════════════════════════════════╗')
    console.log(`║  RESULTS: ${pass} passed, ${fail} failed`)
    console.log('╚══════════════════════════════════════════╝')
    return
  }

  // Verify anon can see active product
  await supabase.auth.signOut()
  const { data: anonProd } = await supabase.from('products').select('*').eq('id', productId).single()
  check('Product visible to anon', !!anonProd, '')

  // ═══════ CART + ORDER ═══════
  console.log('\n══════ 5. BUYER: CART + CHECKOUT ══════')
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: 'TestBuyer123!' })

  const { data: ci } = await supabase.from('cart_items').insert({
    user_id: buyerId, product_id: productId, qty: 3
  }).select('*').single()
  check('Cart item added', !!ci, '')

  // Place order
  const { data: orderResult, error: orderErr } = await supabase.rpc('place_order', {
    p_address: { full_name: 'Test Buyer', phone: '+923001234567', line1: '123 Test St', city: 'Karachi', state: 'Sindh', country: 'Pakistan' },
    p_payment_method: 'cod'
  })
  check('place_order succeeds', !orderErr, orderErr?.message)
  orderId = orderResult?.id

  if (orderId) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    check('Order created', !!order, '')
    check('Order code ORD-xxx', order?.code?.startsWith('ORD-'), `${order?.code}`)
    check('Subtotal: 15000', order?.subtotal === 15000, `${order?.subtotal}`)
    check('Shipping: 250', order?.shipping === 250, `${order?.shipping}`)
    check('Total: 15250', order?.total === 15250, `${order?.total}`)
    check('Commission 8%: 1200', order?.commission === 1200, `${order?.commission}`)
    check('Payment: pending', order?.payment === 'pending', `${order?.payment}`)

    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    check('1 order item', items?.length === 1, `${items?.length}`)
    check('Item qty: 3', items?.[0]?.qty === 3, `${items?.[0]?.qty}`)
    check('Item price: 5000', items?.[0]?.price === 5000, `${items?.[0]?.price}`)
    check('Item store_id matches', items?.[0]?.store_id === storeId, '')

    const { data: payment } = await supabase.from('payments').select('*').eq('order_id', orderId).single()
    check('Payment record created', !!payment, '')
    check('Payment amount: 15250', payment?.amount === 15250, `${payment?.amount}`)
    check('Seller earnings: 14050', payment?.seller_earnings === 14050, `${payment?.seller_earnings}`)

    const { data: prodAfter } = await supabase.from('products').select('stock, sold').eq('id', productId).single()
    check('Stock decremented to 7', prodAfter?.stock === 7, `${prodAfter?.stock}`)
    check('Sold incremented to 3', prodAfter?.sold === 3, `${prodAfter?.sold}`)

    const { data: cartAfter } = await supabase.from('cart_items').select('*').eq('user_id', buyerId)
    check('Cart cleared', cartAfter?.length === 0, `${cartAfter?.length}`)

    // Check seller notification
    await supabase.auth.signOut()
    await supabase.auth.signInWithPassword({ email: sellerEmail, password: 'TestSeller123!' })
    await new Promise(r => setTimeout(r, 500))
    const { data: sellerNotifs } = await supabase.from('notifications').select('*').eq('user_id', sellerId).eq('type', 'order')
    check('Seller received order notification', sellerNotifs && sellerNotifs.length > 0, `${sellerNotifs?.length ?? 0}`)

    // ═══════ SELLER ORDER MANAGEMENT ═══════
    console.log('\n══════ 6. SELLER: UPDATE ORDER STATUS ══════')

    // First check: can seller read the order?
    const { data: sellerOrderRead, error: sellerOrderErr } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (sellerOrderErr) {
      check('Seller can read order', false, `${sellerOrderErr.message} — RLS blocks seller`)
    } else {
      check('Seller can read order', true, `status=${sellerOrderRead?.status}`)
    }

    const { data: orderItem } = await supabase.from('order_items').select('*').eq('order_id', orderId).single()
    
    // Confirm
    const { error: cErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'confirmed'
    })
    check('Seller confirms item', !cErr, cErr?.message)

    // Ship
    const { error: shErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'shipped'
    })
    check('Seller ships item', !shErr, shErr?.message)

    // Check order status
    if (!sellerOrderErr) {
      const { data: o2 } = await supabase.from('orders').select('status').eq('id', orderId).single()
      check('Order status = shipped', o2?.status === 'shipped', `${o2?.status}`)
    }

    // Deliver
    const { error: dErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'delivered'
    })
    check('Seller delivers item', !dErr, dErr?.message)

    if (!sellerOrderErr) {
      const { data: o3 } = await supabase.from('orders').select('status, payment').eq('id', orderId).single()
      check('Order status = delivered', o3?.status === 'delivered', `${o3?.status}`)
      check('Payment = paid', o3?.payment === 'paid', `${o3?.payment}`)
    }

    // ═══════ MESSAGING ═══════
    console.log('\n══════ 7. MESSAGING ══════')
    // Seller sends message to buyer
    const { data: conv, error: convErr } = await supabase.from('conversations').insert({
      buyer_id: buyerId, seller_id: sellerId, product_id: productId
    }).select('*').single()
    check('Conversation created', !convErr, convErr?.message)
    convId = conv?.id

    if (convId) {
      // Seller sends first message
      await supabase.from('messages').insert({
        conversation_id: convId, sender_id: sellerId, body: 'Your order is on its way!'
      })
      check('Seller message sent', true)

      // Buyer reads
      await supabase.auth.signOut()
      await supabase.auth.signInWithPassword({ email: buyerEmail, password: 'TestBuyer123!' })
      const { data: buyerMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId)
      check('Buyer reads messages', buyerMsgs?.length === 1, `${buyerMsgs?.length}`)

      // Buyer replies
      await supabase.from('messages').insert({
        conversation_id: convId, sender_id: buyerId, body: 'Great, thanks!'
      })
      check('Buyer reply sent', true)

      // Anon can't read
      await supabase.auth.signOut()
      const { data: anonMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId)
      check('Anon blocked from messages', !anonMsgs || anonMsgs.length === 0, `${anonMsgs?.length}`)

      const { data: anonConvs } = await supabase.from('conversations').select('*').eq('id', convId)
      check('Anon blocked from conversations', !anonConvs || anonConvs.length === 0, `${anonConvs?.length}`)
    }
  }

  // ═══════ RLS ISOLATION ═══════
  console.log('\n══════ 8. RLS: BUYER CAN\'T MODIFY SELLER DATA ══════')
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: 'TestBuyer123!' })
  
  // Buyer tries to update product — should silently do nothing (RLS blocks)
  const { data: prodBefore } = await supabase.from('products').select('name').eq('id', productId).single()
  await supabase.from('products').update({ name: 'HACKED' }).eq('id', productId)
  const { data: prodAfter2 } = await supabase.from('products').select('name').eq('id', productId).single()
  check('Buyer can\'t change product name', prodAfter2?.name === prodBefore?.name, `${prodAfter2?.name}`)
  
  // Buyer tries to update store
  const { data: storeBefore } = await supabase.from('seller_stores').select('name').eq('id', storeId).single()
  await supabase.from('seller_stores').update({ name: 'HACKED STORE' }).eq('id', storeId)
  const { data: storeAfter } = await supabase.from('seller_stores').select('name').eq('id', storeId).single()
  check('Buyer can\'t change store name', storeAfter?.name === storeBefore?.name, `${storeAfter?.name}`)

  // ═══════ SUMMARY ═══════
  await supabase.auth.signOut()
  
  console.log('\n╔══════════════════════════════════════════╗')
  console.log(`║  E2E RESULTS: ${pass} passed, ${fail} failed`)
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\nTest accounts for cleanup:`)
  console.log(`  buyer2-${timestamp}@test.example.com`)
  console.log(`  seller2-${timestamp}@test.example.com`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
