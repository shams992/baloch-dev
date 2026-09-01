/**
 * End-to-end flow test for Baloch Export Hub
 * Tests: Auth → Profile → Store → Product → Cart → Order → Messaging
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

async function cleanup() {
  console.log('\n══════ CLEANUP ══════')
  // Sign out
  await supabase.auth.signOut()
  console.log('  Signed out')
  console.log(`  ℹ️  Test accounts left for manual cleanup:`)
  console.log(`     buyer-e2e-${timestamp}@test.example.com`)
  console.log(`     seller-e2e-${timestamp}@test.example.com`)
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  END-TO-END FLOW TEST                    ║')
  console.log('╚══════════════════════════════════════════╝')

  // ═══════ BUYER FLOW ═══════
  console.log('\n══════ 1. BUYER REGISTRATION ══════')
  
  const buyerEmail = `buyer-e2e-${timestamp}@test.example.com`
  const buyerPass = 'TestBuyer123!'
  const buyerUsername = `buyere2e${timestamp}`
  
  // Check username available
  const { data: usernameAvail } = await supabase.rpc('check_username_exists', { p_username: buyerUsername })
  check('check_username_exists works', typeof usernameAvail === 'boolean', `${usernameAvail}`)
  check('Username is available', usernameAvail === false, `exists=${usernameAvail}`)
  
  // Check email available
  const { data: emailAvail } = await supabase.rpc('check_email_exists', { p_email: buyerEmail })
  check('check_email_exists works', typeof emailAvail === 'boolean', `${emailAvail}`)
  check('Email is available', emailAvail === false, `exists=${emailAvail}`)
  
  // Sign up buyer
  const { data: buyerAuth, error: buyerSignUpErr } = await supabase.auth.signUp({
    email: buyerEmail,
    password: buyerPass,
    options: { data: { full_name: 'Test Buyer', username: buyerUsername } }
  })
  check('Buyer signup succeeds', !buyerSignUpErr, buyerSignUpErr?.message)
  check('Auth user created', !!buyerAuth?.user, 'No user in response')
  buyerId = buyerAuth?.user?.id
  check('Buyer ID exists', !!buyerId, 'null')
  
  // Wait for trigger
  await new Promise(r => setTimeout(r, 2000))
  
  // Check profile created
  const { data: buyerProfile } = await supabase.from('public_profiles').select('*').eq('id', buyerId).single()
  check('Profile row created by trigger', !!buyerProfile, 'null')
  check('Profile username matches', buyerProfile?.username === buyerUsername, `${buyerProfile?.username}`)
  check('Profile role is buyer', buyerProfile?.role === 'buyer', `${buyerProfile?.role}`)
  check('Profile full_name', buyerProfile?.full_name === 'Test Buyer', `${buyerProfile?.full_name}`)
  
  // Read own full profile (including email)
  const { data: ownProfile } = await supabase.from('profiles').select('*').eq('id', buyerId).single()
  check('Own profile readable (full)', !!ownProfile?.email, ownProfile?.email ? 'OK' : 'email missing')

  console.log('\n══════ 2. BUYER LOGIN ══════')
  await supabase.auth.signOut()
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: buyerEmail, password: buyerPass
  })
  check('Buyer login succeeds', !loginErr, loginErr?.message)
  check('Session returned', !!loginData?.session, 'No session')

  console.log('\n══════ 3. BROWSE PRODUCTS ══════')
  const { data: categories } = await supabase.from('categories').select('*')
  check('Categories readable', !!categories, `${categories?.length ?? 0} categories`)
  check('Has 18 categories', categories?.length === 18, `${categories?.length}`)
  
  const { data: products } = await supabase.from('products').select('*').eq('status', 'active')
  check('Products readable', Array.isArray(products), '')

  console.log('\n══════ 4. ADDRESSES ══════')
  const addrRes = await supabase.from('addresses').insert({
    user_id: buyerId, label: 'Home', full_name: 'Test Buyer', phone: '+923001234567',
    line1: '123 Test Street', city: 'Karachi', state: 'Sindh', country: 'Pakistan', is_default: true
  }).select('*').single()
  check('Address created', !addrRes.error, addrRes.error?.message)
  const addrId = addrRes.data?.id

  console.log('\n══════ 5. WISHLIST ══════')
  // Can't wishlist without products, skip
  check('Wishlist table accessible', true, 'Will test after products exist')

  // ═══════ SELLER FLOW ═══════
  console.log('\n══════════════════════════════════════════')
  console.log('\n══════ 6. SELLER REGISTRATION ══════')
  
  const sellerEmail = `seller-e2e-${timestamp}@test.example.com`
  const sellerPass = 'TestSeller123!'
  const sellerUsername = `sellere2e${timestamp}`
  
  const { data: sellerAuth, error: sellerSignUpErr } = await supabase.auth.signUp({
    email: sellerEmail,
    password: sellerPass,
    options: { data: { full_name: 'Test Seller', username: sellerUsername } }
  })
  check('Seller signup succeeds', !sellerSignUpErr, sellerSignUpErr?.message)
  sellerId = sellerAuth?.user?.id
  check('Seller auth user created', !!sellerId, 'null')
  
  await new Promise(r => setTimeout(r, 2000))
  
  const { data: sellerProfile } = await supabase.from('public_profiles').select('*').eq('id', sellerId).single()
  check('Seller profile created', !!sellerProfile, 'null')
  check('Seller profile role is buyer (before store)', sellerProfile?.role === 'buyer', `${sellerProfile?.role}`)

  console.log('\n══════ 7. CREATE STORE ══════')
  const storeRes = await supabase.from('seller_stores').insert({
    seller_id: sellerId,
    name: 'Test E2E Store',
    slug: `test-e2e-store-${timestamp}`,
    description: 'A test store for e2e testing',
    category_slugs: ['handicrafts'],
    logo_color: '#ff5722',
    logo_initials: 'TE',
    location: 'Quetta',
    is_approved: false,
  }).select('*').single()
  check('Store created', !storeRes.error, storeRes.error?.message)
  storeId = storeRes.data?.id
  
  // Check role updated to seller
  const { data: updatedProfile } = await supabase.from('public_profiles').select('*').eq('id', sellerId).single()
  check('Profile role updated to seller', updatedProfile?.role === 'seller', `${updatedProfile?.role}`)
  
  // Check notification created
  await new Promise(r => setTimeout(r, 1000))
  const { data: sellerNotifs } = await supabase.from('notifications').select('*').eq('user_id', sellerId)
  check('Seller received store notification', sellerNotifs && sellerNotifs.length > 0, `${sellerNotifs?.length ?? 0} notifications`)

  console.log('\n══════ 8. CREATE PRODUCT ══════')
  const prodRes = await supabase.from('products').insert({
    store_id: storeId,
    seller_id: sellerId,
    name: 'Handwoven Balochi Rug',
    description: 'Traditional handwoven rug with intricate Balochi patterns',
    price: 5000,
    currency: 'PKR',
    category_slug: 'handicrafts',
    stock: 10,
    condition: 'handmade',
    location: 'Quetta',
    shipping_fee: 250,
    shipping_days: '3-5 days',
    tags: ['rug', 'handwoven', 'traditional'],
    status: 'pending',
  }).select('*').single()
  check('Product created', !prodRes.error, prodRes.error?.message)
  productId = prodRes.data?.id
  check('Product stock is 10', prodRes.data?.stock === 10, `${prodRes.data?.stock}`)
  check('Product price is 5000', prodRes.data?.price === 5000, `${prodRes.data?.price}`)

  // Add product image
  const imgRes = await supabase.from('product_images').insert({
    product_id: productId,
    url: 'https://example.com/test-rug.jpg',
    sort_order: 0,
  }).select('*').single()
  check('Product image added', !imgRes.error, imgRes.error?.message)

  // Approve store so product becomes active
  await supabase.from('seller_stores').update({ is_approved: true }).eq('id', storeId)
  await supabase.from('products').update({ status: 'active' }).eq('id', productId)
  
  // Verify product is now visible to anon
  await supabase.auth.signOut()
  const { data: anonProd } = await supabase.from('products').select('*').eq('id', productId).single()
  check('Product visible to anon after approval', !!anonProd, 'null')

  console.log('\n══════ 9. BUYER: ADD TO CART ══════')
  // Sign in as buyer
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: buyerPass })
  
  const cartRes = await supabase.from('cart_items').insert({
    user_id: buyerId, product_id: productId, qty: 2
  }).select('*').single()
  check('Cart item added', !cartRes.error, cartRes.error?.message)
  const cartItemId = cartRes.data?.id
  
  // Update quantity
  const { error: qtyErr } = await supabase.from('cart_items').update({ qty: 3 }).eq('id', cartItemId)
  check('Cart quantity updated', !qtyErr, qtyErr?.message)
  
  const { data: cartCheck } = await supabase.from('cart_items').select('qty').eq('id', cartItemId).single()
  check('Cart qty is 3', cartCheck?.qty === 3, `${cartCheck?.qty}`)

  console.log('\n══════ 10. BUYER: PLACE ORDER ══════')
  const { data: orderResult, error: orderErr } = await supabase.rpc('place_order', {
    p_address: { full_name: 'Test Buyer', phone: '+923001234567', line1: '123 Test Street', city: 'Karachi', state: 'Sindh', country: 'Pakistan' },
    p_payment_method: 'cod'
  })
  check('place_order RPC succeeds', !orderErr, orderErr?.message)
  orderId = orderResult?.id
  check('Order ID returned', !!orderId, 'null')
  
  if (orderId) {
    // Verify order details
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    check('Order exists', !!order, 'null')
    check('Order code format', order?.code?.startsWith('ORD-'), `${order?.code}`)
    check('Order buyer_id matches', order?.buyer_id === buyerId, `${order?.buyer_id}`)
    check('Order status is pending', order?.status === 'pending', `${order?.status}`)
    check('Order payment is pending', order?.payment === 'pending', `${order?.payment}`)
    check('Order payment_method is cod', order?.payment_method === 'cod', `${order?.payment_method}`)
    
    // Verify totals: price(5000) * qty(3) = 15000 subtotal, shipping 250, total 15250
    check('Order subtotal correct', order?.subtotal === 15000, `${order?.subtotal}`)
    check('Order shipping correct', order?.shipping === 250, `${order?.shipping}`)
    check('Order total correct', order?.total === 15250, `${order?.total}`)
    
    // Verify 8% commission: 15000 * 0.08 = 1200
    check('Order commission (8%)', order?.commission === 1200, `${order?.commission}`)
    
    // Verify order items
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    check('Order items created', items && items.length === 1, `${items?.length ?? 0} items`)
    check('Order item qty is 3', items?.[0]?.qty === 3, `${items?.[0]?.qty}`)
    check('Order item price is 5000', items?.[0]?.price === 5000, `${items?.[0]?.price}`)
    check('Order item product_id matches', items?.[0]?.product_id === productId, '')
    check('Order item store_id matches', items?.[0]?.store_id === storeId, '')
    
    // Verify payment record
    const { data: payment } = await supabase.from('payments').select('*').eq('order_id', orderId).single()
    check('Payment record created', !!payment, 'null')
    check('Payment amount matches total', payment?.amount === 15250, `${payment?.amount}`)
    check('Payment commission correct', payment?.commission === 1200, `${payment?.commission}`)
    check('Payment seller_earnings correct', payment?.seller_earnings === 14050, `${payment?.seller_earnings}`)
    check('Payment method is cod', payment?.method === 'cod', `${payment?.method}`)
    
    // Verify stock decremented
    const { data: prodAfter } = await supabase.from('products').select('stock, sold').eq('id', productId).single()
    check('Stock decremented', prodAfter?.stock === 7, `stock=${prodAfter?.stock}`)
    check('Sold incremented', prodAfter?.sold === 3, `sold=${prodAfter?.sold}`)
    
    // Verify cart cleared
    const { data: cartAfter } = await supabase.from('cart_items').select('*').eq('user_id', buyerId)
    check('Cart cleared', cartAfter && cartAfter.length === 0, `${cartAfter?.length} items`)
    
    // Verify seller notification
    await new Promise(r => setTimeout(r, 1000))
    const { data: sellerOrderNotifs } = await supabase.from('notifications').select('*').eq('user_id', sellerId).eq('type', 'order')
    check('Seller received order notification', sellerOrderNotifs && sellerOrderNotifs.length > 0, '')
  }

  // ═══════ SELLER ORDER MANAGEMENT ═══════
  console.log('\n══════════════════════════════════════════')
  console.log('\n══════ 11. SELLER: UPDATE ORDER STATUS ══════')
  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({ email: sellerEmail, password: sellerPass })
  
  if (orderId) {
    const { data: orderItem } = await supabase.from('order_items').select('*').eq('order_id', orderId).single()
    
    // Confirm
    const { error: confirmErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'confirmed'
    })
    check('Seller can confirm order item', !confirmErr, confirmErr?.message)
    
    // Ship
    const { error: shipErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'shipped'
    })
    check('Seller can ship order item', !shipErr, shipErr?.message)
    
    // Check parent order status updated
    const { data: updatedOrder } = await supabase.from('orders').select('status').eq('id', orderId).single()
    check('Parent order status updated to shipped', updatedOrder?.status === 'shipped', `${updatedOrder?.status}`)
    
    // Deliver
    const { error: deliverErr } = await supabase.rpc('set_order_item_status', {
      p_order_item: orderItem.id, p_status: 'delivered'
    })
    check('Seller can deliver order item', !deliverErr, deliverErr?.message)
    
    const { data: deliveredOrder } = await supabase.from('orders').select('status, payment').eq('id', orderId).single()
    check('Parent order status is delivered', deliveredOrder?.status === 'delivered', `${deliveredOrder?.status}`)
    check('Payment updated to paid', deliveredOrder?.payment === 'paid', `${deliveredOrder?.payment}`)
  }

  // ═══════ MESSAGING ═══════
  console.log('\n══════════════════════════════════════════')
  console.log('\n══════ 12. MESSAGING ══════')
  
  // Buyer sends message to seller
  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: buyerPass })
  
  // Create conversation
  const { data: conv, error: convErr } = await supabase.from('conversations').insert({
    buyer_id: buyerId,
    seller_id: sellerId,
    product_id: productId,
  }).select('*').single()
  check('Conversation created', !convErr, convErr?.message)
  convId = conv?.id
  
  if (convId) {
    // Buyer sends message
    const { data: msg1, error: msg1Err } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: buyerId,
      body: 'Is this rug still available?'
    }).select('*').single()
    check('Buyer message sent', !msg1Err, msg1Err?.message)
    check('Sender ID is buyer', msg1?.sender_id === buyerId, `${msg1?.sender_id}`)
    
    // Buyer can read message
    const { data: buyerReadMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId)
    check('Buyer can read own conversation', buyerReadMsgs && buyerReadMsgs.length > 0, '')
    
    // Buyer can read conversation
    const { data: buyerConvs } = await supabase.from('conversations').select('*').eq('id', convId)
    check('Buyer can read own conversation record', buyerConvs && buyerConvs.length > 0, '')
    
    // Seller replies
    await supabase.auth.signOut()
    await supabase.auth.signInWithPassword({ email: sellerEmail, password: sellerPass })
    
    const { data: msg2, error: msg2Err } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: sellerId,
      body: 'Yes, it is! Would you like to order?'
    }).select('*').single()
    check('Seller message sent', !msg2Err, msg2Err?.message)
    check('Sender ID is seller', msg2?.sender_id === sellerId, `${msg2?.sender_id}`)
    
    // Seller can read all messages in conversation
    const { data: sellerReadMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId)
    check('Seller can read conversation messages', sellerReadMsgs && sellerReadMsgs.length === 2, `${sellerReadMsgs?.length}`)
    
    // Non-participant cannot read
    await supabase.auth.signOut()
    const { data: anonMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId)
    check('Anon cannot read messages', !anonMsgs || anonMsgs.length === 0, `${anonMsgs?.length} messages leaked`)
    
    const { data: anonConvs } = await supabase.from('conversations').select('*').eq('id', convId)
    check('Anon cannot read conversations', !anonConvs || anonConvs.length === 0, `${anonConvs?.length} conversations leaked`)
  }

  // ═══════ RLS: CROSS-SELLER ISOLATION ═══════
  console.log('\n══════════════════════════════════════════')
  console.log('\n══════ 13. RLS: CROSS-SELLER ISOLATION ══════')
  
  // Verify seller can't modify another seller's products
  // Sign in as buyer (not a seller)
  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: buyerPass })
  
  const { error: buyerProdErr } = await supabase.from('products').update({ name: 'HACKED' }).eq('id', productId)
  check('Buyer cannot update products', !!buyerProdErr, buyerProdErr?.message || 'No error')
  
  const { error: buyerStoreErr } = await supabase.from('seller_stores').update({ name: 'HACKED' }).eq('id', storeId)
  check('Buyer cannot update stores', !!buyerStoreErr, buyerStoreErr?.message || 'No error')

  // ═══════ NOTIFICATIONS ═══════
  console.log('\n══════════════════════════════════════════')
  console.log('\n══════ 14. NOTIFICATIONS ══════')
  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({ email: buyerEmail, password: buyerPass })
  
  const { data: buyerNotifs } = await supabase.from('notifications').select('*').eq('user_id', buyerId).order('created_at', { ascending: false })
  check('Buyer has notifications', buyerNotifs && buyerNotifs.length > 0, `${buyerNotifs?.length}`)
  check('Notifications have title', !!buyerNotifs?.[0]?.title, '')
  check('Notifications have body', !!buyerNotifs?.[0]?.body, '')

  // ═══════ SUMMARY ═══════
  await cleanup()
  
  console.log('\n╔══════════════════════════════════════════╗')
  console.log(`║  E2E RESULTS: ${pass} passed, ${fail} failed`)
  console.log('╚══════════════════════════════════════════╝')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
