import { Link, useLocation } from 'react-router-dom'
import { Button, PageHero } from '@/components/ui'
import { settings } from '@/lib/db'

interface Doc {
  eyebrow: string
  title: string
  intro: string
  sections: Array<{ h: string; p: string[] }>
}

const DOCS: Record<string, Doc> = {
  faq: {
    eyebrow: 'Support',
    title: 'Frequently asked questions',
    intro: 'Quick answers to the questions we hear most — from opening a store to tracking a parcel.',
    sections: [
      { h: 'Is it really free to open a store?', p: ['Yes. Creating an account, opening a store and listing products cost nothing. The platform charges an 8% commission only when you make a sale.'] },
      { h: 'What role do I get when I register?', p: ['Every new account starts as a buyer account so you can explore safely. When you’re ready to sell, open “Become a Seller” in your dashboard and your store is created after a short review.'] },
      { h: 'How do I pay for products?', p: ['All purchases go through the platform checkout with your saved address and shipping choice. Never pay a seller outside the platform — off-platform payments are not protected.'] },
      { h: 'How long does delivery take?', p: ['Sellers confirm orders within 24 hours and most national deliveries arrive within 3–7 working days. Each order shows a live status and, once shipped, a tracking code.'] },
      { h: 'Can I talk to a seller before buying?', p: ['Yes — use “Message the seller” on any product page. Conversations stay inside the platform for your protection; sharing external contact details is restricted.'] },
      { h: 'What if something goes wrong with my order?', p: ['Message the seller first — most issues are solved in one conversation. If not, contact support and the team will mediate under the Refund Policy.'] },
      { h: 'Who can review a product?', p: ['Only verified buyers who received that product can review it, which keeps ratings honest.'] },
    ],
  },
  help: {
    eyebrow: 'Help center',
    title: 'Help center',
    intro: 'Guides for buyers and sellers. For anything else, the contact form reaches a human.',
    sections: [
      { h: 'Buyers', p: ['Browse the marketplace at /products or search from the homepage search bar. Add items to your cart or wishlist, check out with a saved address, and track everything under Dashboard → Orders.', 'Your wishlist, addresses, reviews and messages live in your buyer dashboard.'] },
      { h: 'Sellers', p: ['Open Seller Studio to manage products (add photos, prices, stock, shipping), process orders step by step, reply to messages and watch your earnings — the 8% platform fee is already deducted for you.', 'Approve orders within 24 hours and mark them Shipped with a tracking code to keep buyers informed.'] },
      { h: 'Account & security', p: ['Your account role (buyer / seller / admin) controls what you can access. Change your password and notification settings under Dashboard → Settings.', 'If you think someone else has access to your account, change your password immediately and contact support.'] },
      { h: 'Contact options', p: ['Use the contact form, or write to support@balochexporthub.com. For order issues, include your order code (BEH-…).'] },
    ],
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    intro: `The rules of using ${settings.get().platform_name} — written plainly, effective for all accounts.`,
    sections: [
      { h: '1. The platform', p: ['Baloch Export Hub is a multi-vendor marketplace that lets independent creators sell cultural, handmade and creative products. We provide the storefronts, checkout, messaging and delivery tooling; sellers provide the products.'] },
      { h: '2. Accounts & roles', p: ['You must provide accurate information when registering. Accounts start as buyers; sellers gain store tools after their store is approved. You are responsible for activity under your account.', 'Admins may suspend accounts that violate these terms.'] },
      { h: '3. Selling rules', p: ['Sellers may only list products they make or are authorised to sell, described accurately with clear photos. Prohibited: counterfeit goods, unsafe or illegal items, and products that misrepresent Balochi culture or heritage.'] },
      { h: '4. Fees', p: ['The platform charges an 8% commission on each completed sale, deducted automatically. No other fees apply unless separately announced in writing.'] },
      { h: '5. Buying & payment', p: ['All payments run through platform checkout. Prices include applicable product price and displayed shipping fees; taxes, if any, are shown at checkout.'] },
      { h: '6. Communication', p: ['Buyer–seller messaging must stay on-platform. Sharing external contact details or requesting off-platform payment is restricted to protect both sides.'] },
      { h: '7. Liability', p: ['The platform mediates disputes and enforces policies, but sellers are responsible for the accuracy, quality and lawful delivery of their goods.'] },
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    intro: 'What we collect, why we collect it, and the control you keep.',
    sections: [
      { h: 'Data we collect', p: ['Account basics (name, username, email), store and product information you publish, order and address details you enter, and messages you send inside the platform.'] },
      { h: 'How we use it', p: ['To operate your account and store, process orders, provide support, prevent fraud and improve the platform. We never sell your personal data.'] },
      { h: 'What sellers can see', p: ['Sellers see the buyer name, address and phone for orders they must ship — nothing more. Buyers see a seller’s public store profile.'] },
      { h: 'Security', p: ['Sessions are authenticated, data access is role-based and protected by row-level security, and storage uploads are validated by type and size.'] },
      { h: 'Your rights', p: ['You can correct your profile, change your password, export or delete store data, and close your account by contacting support.'] },
    ],
  },
  'refund-policy': {
    eyebrow: 'Legal',
    title: 'Refund Policy',
    intro: 'Fair, transparent refunds for buyers — and clear duties for sellers.',
    sections: [
      { h: 'Cancel before shipping', p: ['Buyers can cancel a pending or confirmed order for a full refund at any time before it is marked shipped.'] },
      { h: 'Damaged or wrong item', p: ['If an item arrives damaged or is not as described, report it within 7 days with photos through platform messaging. The seller arranges a replacement or refund; the platform mediates if needed.'] },
      { h: 'Non-delivery', p: ['If a shipped order is not delivered within 14 days of the stated window and the courier confirms loss, you receive a full refund.'] },
      { h: 'Made-to-order & custom work', p: ['Custom, personalised and made-to-order pieces (such as bespoke Doch embroidery) can only be refunded before production begins — message the seller early.'] },
      { h: 'For sellers', p: ['Refunds are returned from the order amount; the 8% platform commission is returned proportionally on fully refunded orders.'] },
    ],
  },
  'seller-guide': {
    eyebrow: 'Sellers',
    title: 'Seller Guide',
    intro: 'From your first product photo to your hundredth order — how to run a great store.',
    sections: [
      { h: '1. Open your store', p: ['Register, then use Dashboard → Become a Seller. Choose a clear store name, an honest description and your main category. Stores are reviewed by the team, usually within 48 hours.'] },
      { h: '2. Photograph your work', p: ['Natural light, a clean background and 3–5 photos per product. Show details — stitches, hallmarks, texture — and include one photo with a hand or object for scale.'] },
      { h: '3. Write honest listings', p: ['Name the materials, sizes and making time. State what is handmade and what varies piece to piece. Honest listings mean happy buyers and better reviews.'] },
      { h: '4. Price fairly', p: ['Cover your materials, time and shipping. Remember the platform shows buyers the price plus shipping, and your earnings view already nets out the 8% commission.'] },
      { h: '5. Delight on delivery', p: ['Confirm orders within 24 hours, pack with care, ship on time and add the tracking code. Reply to messages quickly — responsiveness is the #1 driver of good reviews.'] },
      { h: '6. Grow', p: ['Request reviews from happy buyers, keep stock fresh, and use store categories so buyers can browse. Your earnings chart shows what works.'] },
    ],
  },
}

export function DocPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '')
  const doc = DOCS[slug]
  if (!doc) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 pt-16 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">Document not found</h1>
          <Button to="/help" variant="gold" className="mt-6">Go to Help center</Button>
        </div>
      </div>
    )
  }
  return (
    <>
      <PageHero eyebrow={doc.eyebrow} title={doc.title} sub={doc.intro} />
      <section className="py-14">
        <div className="mx-auto max-w-3xl space-y-8 px-5 sm:px-8">
          {doc.sections.map((s) => (
            <article key={s.h} className="card p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold text-gold">{s.h}</h2>
              {s.p.map((p, i) => (
                <p key={i} className="mt-2.5 text-[0.92rem] leading-relaxed text-muted">{p}</p>
              ))}
            </article>
          ))}
          <p className="text-center text-sm text-faint">
            Last updated {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · Questions?{' '}
            <Link to="/contact" className="text-brand hover:underline dark:text-gold">Contact us</Link>
          </p>
        </div>
      </section>
    </>
  )
}

export const DOC_ROUTES = Object.keys(DOCS)
