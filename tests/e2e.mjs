/**
 * End-to-end smoke suite for Baloch Export Hub (dev server must run on :5173).
 *   npm run test:e2e
 * Uses @sparticuz/chromium + playwright-core (works in sandboxed/CI environments);
 * swap for plain `playwright` locally if you prefer.
 */
import { chromium as pw } from 'playwright-core'
import chromium from '@sparticuz/chromium'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
let pass = 0, fail = 0
const say = (ok, msg) => { console.log((ok ? '✓' : '✗') + ' ' + msg); ok ? pass++ : fail++ }

const run = async (label, session, checks, actions = []) => {
  const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } })
  if (session) await ctx.addInitScript((s) => localStorage.setItem('beh-session', s), session)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  for (const [route, expect] of checks) {
    errs.length = 0
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(600)
      const body = ((await page.textContent('body')) || '').replace(/\s+/g, ' ')
      say(!!expect && body.toLowerCase().includes(expect.toLowerCase()) && !errs.length,
        `${label} ${route}${expect ? ` «${expect}»` : ''}${errs.length ? ' — ' + errs[0].slice(0, 80) : ''}`)
    } catch (e) { say(false, `${label} ${route} — ${String(e).split('\n')[0].slice(0, 90)}`) }
  }
  for (const [name, fn] of actions) {
    try { await fn(page); say(true, name) } catch (e) { say(false, `${name} — ${String(e).split('\n')[0].slice(0, 120)}`) }
  }
  await browser.close().catch(() => {})
}

await run('public', null, [
  ['/', 'Connecting Balochi Creativity'],
  ['/about', 'Balochi makers'], ['/how-it-works', 'five steps'], ['/categories', 'Balochi creativity'],
  ['/trust', 'Trust & safety'], ['/delivery', 'to your door'], ['/become-seller', 'Become a seller'],
  ['/contact', 'Talk to a human'], ['/faq', 'Frequently asked'], ['/terms', 'Terms of Service'],
  ['/privacy', 'Privacy Policy'], ['/refund-policy', 'Refund Policy'], ['/seller-guide', 'Seller Guide'], ['/help', 'Help center'],
  ['/products', 'Balochi creation'], ['/product/p-001', 'Festive Doch Dress'], ['/sellers', 'Meet the creators'],
  ['/store/doch-e-gul', 'Doch e Gul'], ['/search?q=do', 'Results'], ['/category/jewelry', 'Jewelry'],
])

await run('buyer', 'u-buyer', [
  ['/dashboard', 'Salaam'], ['/dashboard/orders', 'BEH-2026'], ['/dashboard/wishlist', 'Wishlist'],
  ['/dashboard/messages', 'Gulnar'], ['/dashboard/reviews', 'review'], ['/dashboard/addresses', 'Pakistan'],
  ['/dashboard/profile', 'Hameed'], ['/dashboard/settings', 'Appearance'], ['/dashboard/become-seller', 'Sell your craft'],
], [
  ['buyer: add to cart → checkout → place order', async (p) => {
    await p.goto(BASE + '/product/p-001', { waitUntil: 'networkidle' })
    await p.click('button:has-text("Add to cart")')
    await p.waitForURL('**/cart', { timeout: 9000 })
    await p.click('text=Proceed to checkout')
    await p.waitForURL('**/checkout', { timeout: 9000 })
    await p.click('button:has-text("Place order")')
    await p.waitForTimeout(1800)
    if (!(await p.textContent('body')).includes('Shukriya')) throw new Error('no confirmation')
  }],
])

await run('seller', 'u-gulnar', [
  ['/seller', 'Gross sales'], ['/seller/products', 'Festive Doch'], ['/seller/add-product', 'Add a new product'],
  ['/seller/orders', 'BEH-2026'], ['/seller/customers', 'spent'], ['/seller/earnings', 'Net earnings'],
  ['/seller/reviews', 'across your products'], ['/seller/messages', 'Hameed'], ['/seller/notifications', 'unread'],
  ['/seller/store-profile', 'Doch e Gul'], ['/seller/settings', 'Appearance'],
])

await run('admin', 'u-admin', [
  ['/admin', 'Platform revenue'], ['/admin/users', 'Hameed'], ['/admin/buyers', 'buyer'],
  ['/admin/sellers', 'store'], ['/admin/products', 'product'], ['/admin/categories', 'categories'],
  ['/admin/orders', 'BEH-2026'], ['/admin/reviews', 'review'], ['/admin/messages', 'conversation'],
  ['/admin/revenue', 'GMV'], ['/admin/reports', 'report'], ['/admin/notifications', 'notification'],
  ['/admin/settings', 'commission'],
])

await run('auth', null, [], [
  ['auth: login form → /dashboard', async (p) => {
    await p.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await p.fill('input[type="email"]', 'buyer@demo.com')
    await p.fill('input[type="password"]', 'demo1234')
    await p.click('button:has-text("Sign in")')
    await p.waitForURL('**/dashboard', { timeout: 9000 })
  }],
  ['auth: register (buyer default) → /dashboard', async (p) => {
    await p.goto(BASE + '/register', { waitUntil: 'networkidle' })
    await p.fill('input[placeholder="e.g. Samina Baloch"]', 'E2E User')
    await p.fill('input[placeholder="samina.embroiders"]', 'e2e.user' + Date.now().toString(36).slice(-4))
    await p.fill('input[type="email"]', `e2e-${Date.now()}@example.com`)
    const pws = p.locator('input[type="password"]')
    await pws.nth(0).fill('testpass123'); await pws.nth(1).fill('testpass123')
    await p.click('button:has-text("Create my free account")')
    await p.waitForURL('**/dashboard', { timeout: 9000 })
  }],
  ['auth: become-seller wizard → Seller Studio', async (p) => {
    await p.goto(BASE + '/dashboard/become-seller', { waitUntil: 'networkidle' })
    await p.click('text=Start creating my store')
    await p.fill('input[placeholder="e.g. Doch e Gul"]', 'E2E Craft Store')
    await p.fill('textarea', 'Created by the automated e2e suite.')
    await p.click('button:has-text("Continue")'); await p.waitForTimeout(300)
    await p.click('button:has-text("Submit my store")'); await p.waitForTimeout(1200)
    if (!(await p.textContent('body')).includes('Store submitted')) throw new Error('wizard incomplete')
    await p.goto(BASE + '/seller', { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
    if (!(await p.textContent('body')).includes('Seller Studio')) throw new Error('studio unreachable')
  }],
])

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
