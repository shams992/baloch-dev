# Baloch Export Hub

**A multi-vendor marketplace for Balochi creators, artisans, craftsmen, artists, writers, designers and traditional-product sellers.**
Taking Balochi creativity from local communities to the global marketplace.

> A [BalochDev](https://balochdev.com) project.

---

## What's inside

| Area | Route | What it does |
|---|---|---|
| **Landing page** | `/` | Informational & promotional only — 3D hero, search bar, packing-animation loop, all 18 categories, how-it-works, mission, trust, delivery, communication, benefits, 8% commission, stats counters, CTA. No product grids. |
| Info pages | `/about` `/how-it-works` `/categories` `/trust` `/delivery` `/become-seller` `/contact` `/faq` `/help` `/terms` `/privacy` `/refund-policy` `/seller-guide` | Every navbar & footer link resolves to a real page. |
| Auth | `/login` `/register` | Register defaults to **Buyer** → redirected to `/dashboard`. Login routes by role: buyer → `/dashboard`, seller → `/seller`, admin → `/admin`. |
| **Buyer dashboard** | `/dashboard` | Overview, orders (with status timeline), wishlist, messages, reviews, addresses, profile, settings, **Become a Seller** wizard. |
| **Seller Studio** | `/seller` | Overview + sales chart, products CRUD, add product, order processing (confirm → process → ship → deliver), customers, earnings (8% commission broken out), reviews, messages, notifications, store profile, settings. |
| **Admin panel** | `/admin` | Dashboard with live stats & charts, users/buyers/sellers (approve, block, roles), products & categories moderation, orders, reviews moderation, messages monitor, revenue, reports (+CSV export), notifications, platform settings. |
| Marketplace | `/products` `/product/:id` `/sellers` `/store/:slug` `/seller/:id` `/search?q=` `/category/:slug` | Full marketplace experience lives here — reached by navigating/searching from the landing page. |
| Commerce | `/cart` `/wishlist` `/checkout` `/order/:code` | Cart, wishlist, address + payment checkout, order confirmation — all inside the platform (no WhatsApp checkout). |

**Tech:** React 18 + TypeScript · Vite · Tailwind CSS v4 · React Router · Three.js / React Three Fiber / drei (3D hero + packing loop) · GSAP ScrollTrigger · Framer Motion · lucide-react · Supabase-ready data layer.

## Testing

An automated end-to-end suite covers every route and the core flows (login/register with role redirects, add-to-cart → checkout → order placement, become-seller wizard, seller order processing, admin approvals & reports):

```bash
npm run dev          # suite expects the dev server on :5173
npm run test:e2e     # → 57 checks across public / buyer / seller / admin / auth
```

The suite (`tests/e2e.mjs`) drives a real headless Chromium and fails on any page error, console error or missing content. It also verified: mobile viewport (375 px) has zero horizontal overflow on all key pages, the hamburger menu works, and dark/light mode toggles and persists across reloads.

## Quick start (demo mode — zero config)

```bash
npm install
npm run dev          # http://localhost:5173
```

The app boots in **demo mode** with a fully seeded marketplace (13 users, 9 stores, 48 products across all 18 categories, orders, reviews, conversations) persisted to your browser's localStorage. Sign in with:

| Role | Email | Password |
|---|---|---|
| Buyer | `buyer@demo.com` | `demo1234` |
| Seller | `seller@demo.com` (Doch e Gul) | `demo1234` |
| Admin | `admin@balochexporthub.com` | `demo1234` |

…or register a fresh account (starts as Buyer) and open **Become a Seller** from the dashboard to walk the store-creation flow.

> Demo niceties: seeded sellers auto-reply to messages after ~2 s to demonstrate the messaging/notifications loop; “Reset demo database” lives in Dashboard → Settings.

## Going live with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run **`supabase/schema.sql`** in the SQL editor — it creates all 17 tables (`profiles`, `seller_stores`, `categories`, `products`, `product_images`, `cart_items`, `wishlist`, `orders`, `order_items`, `payments`, `reviews`, `conversations`, `messages`, `notifications`, `addresses`, `platform_settings`, `reports`) with foreign keys, indexes, constraints, **RLS policies**, and the four **storage buckets**.
3. Copy `.env.example` → `.env` and fill in your project URL + **anon** / **publishable** key (never the service-role key).
4. Port the function bodies in `src/lib/db.ts` onto `supabase.from('<table>')` queries — the demo backend was written to mirror the SQL schema 1:1, and `src/lib/supabase.ts` already exposes a lazily-created browser client. Auth moves to `supabase.auth` (the `profiles` trigger in the schema creates the profile row automatically on signup).

### Deploy on Vercel

`.env` is gitignored, so GitHub → Vercel does **not** copy your keys. Login will fail until you add them on Vercel:

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Add (Production + Preview):
   - `VITE_SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — the anon or `sb_publishable_…` key from Supabase → **Project Settings → API**.
3. **Redeploy** (Deployments → ⋮ → Redeploy). Vite only reads `VITE_*` at build time; saving env vars without a rebuild will not fix login.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel domain (`https://your-app.vercel.app`) and add that origin under **Redirect URLs**.

## Design system

- **Cultural identity** — Balochi octagram mark, Doch-inspired geometry, gold/teal/pomegranate palette on warm ivory (light) and deep charcoal-teal (dark). Fraunces display + Inter body (self-hosted, no CDN).
- **Dark & light mode** — persisted per device, respects system preference.
- **Motion** — GSAP ScrollTrigger (step reveals, parallax, line draw), Framer Motion (reveals, hovers, modals), CSS keyframes (marquees, delivery pipeline). `prefers-reduced-motion` disables all of it, and both 3D scenes lazy-load and pause outside the viewport.
- **Accessibility** — semantic landmarks, keyboard-navigable menus/modals with focus rings, aria labels on icon buttons, alt text, skip link, tabular numerals for stats.

## Project structure

```
src/
  lib/            types, seed data, local backend (db.ts), Supabase client, hooks, providers
  components/     ui kit, layout (navbar/footer/shells), shared (cards, charts, messaging, orders)
  three/          HeroScene.tsx, PackingScene.tsx (React Three Fiber)
  pages/
    landing/      hero, packing, informational sections (A–D)
    info/         about, how-it-works, categories, trust, delivery, become-seller, contact, legal docs
    auth/         login & register
    market/       products, search, category, product detail, sellers, store, cart, wishlist, checkout, confirmation
    buyer/        buyer dashboard sections
    seller/       Seller Studio sections
    admin/        Admin panel sections
supabase/
  schema.sql      full production schema (tables, RLS, storage)
public/images/    Balochi cultural imagery (AI-generated for the demo)
```

## Commission model

Transparent by design: **8% of every successful sale** funds checkout, buyer protection, delivery tooling and support. Sellers keep 92%. Example: `Sale $100 → Fee $8 → Seller earns $92` — shown on the landing page, in Seller Studio → Earnings and in Admin → Revenue.

---

© 2026 Baloch Export Hub · A [BalochDev](https://balochdev.com) project.
