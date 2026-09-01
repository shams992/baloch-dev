-- ═══════════════════════════════════════════════════════════════════
-- BALOCH EXPORT HUB — Supabase schema
-- Run this file in the Supabase SQL editor. It creates every table from
-- the platform spec, with foreign keys, indexes, constraints, RLS
-- policies and storage buckets.
--
-- The demo app (lib/db.ts) mirrors these exact shapes, so going live is
-- a matter of pointing the data layer at Supabase tables.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────
-- One row per auth.users user; created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.-]{3,24}$'),
  email text not null,
  avatar_url text,
  avatar_color text default '#0d7d76',
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  phone text,
  bio text,
  location text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text,1,8)),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── CATEGORIES ──────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'Shapes',
  image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, description, icon, sort_order) values
  ('artists','Artists','Original artwork and creative commissions from Balochi artists.','Palette',1),
  ('photographers','Photographers','Fine-art photography, prints and photo experiences.','Camera',2),
  ('writers','Writers','Books, poetry and written works by Balochi voices.','Feather',3),
  ('balochi-doch','Balochi Doch','Hand-embroidered traditional Doch pieces, stitched motif by motif.','Doch',4),
  ('painters','Painters','Canvas paintings — landscapes, portraits and modern works.','Brush',5),
  ('sketch-artists','Sketch Artists','Pencil, charcoal and ink portraits and scenes.','PencilRuler',6),
  ('designers','Designers','Graphic, textile and cultural design products and services.','PenTool',7),
  ('handicrafts','Handicrafts','Handwoven baskets, rugs and traditional crafts.','Shapes',8),
  ('decorative-items','Decorative Items','Wall hangings, lanterns and handcrafted décor.','Lamp',9),
  ('calligraphy','Calligraphy','Hand-inked Arabic and Urdu calligraphy art.','Scroll',10),
  ('balochi-herbs','Balochi Herbs','Wild herbs, dried flowers and traditional herbal teas.','Leaf',11),
  ('balochi-recipes','Balochi Recipes','Recipe collections, spice kits and traditional blends.','ChefHat',12),
  ('traditional-food','Traditional Food','Sajji kits, Kaak bread and traditional treats.','UtensilsCrossed',13),
  ('books','Books','Novels, history, poetry and children''s books.','BookOpen',14),
  ('traditional-clothing','Traditional Clothing','Embroidered dresses, caps and traditional wear.','Shirt',15),
  ('jewelry','Jewelry','Silver, turquoise and tribal jewelry, made by hand.','Gem',16),
  ('handmade-products','Handmade Products','Everything made by hand, from clutches to boxes.','Hand',17),
  ('cultural-products','Cultural Products','Heritage crafts, prints and collectibles.','Landmark',18)
on conflict (slug) do nothing;

-- ─── SELLER STORES ───────────────────────────────────────────────
create table public.seller_stores (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_slugs text[] not null default '{}',
  logo_url text,
  logo_color text default '#0d7d76',
  logo_initials text default '',
  banner text,
  location text,
  rating numeric(2,1) not null default 0,
  total_sales int not null default 0,
  is_approved boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists seller_stores_seller_idx on public.seller_stores(seller_id);

-- ─── PRODUCTS + IMAGES ───────────────────────────────────────────
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.seller_stores(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'PKR' check (currency in ('PKR','USD')),
  category_slug text not null references public.categories(slug),
  stock int not null default 0 check (stock >= 0),
  condition text not null default 'handmade' check (condition in ('new','handmade','vintage')),
  location text,
  shipping_fee numeric(10,2) not null default 250,
  shipping_days text default '3–5 days',
  tags text[] not null default '{}',
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  status text not null default 'pending' check (status in ('active','hidden','pending','rejected')),
  sold int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_store_idx on public.products(store_id);
create index if not exists products_category_idx on public.products(category_slug);
create index if not exists products_status_idx on public.products(status);

create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);
create index if not exists product_images_product_idx on public.product_images(product_id);

-- ─── CART & WISHLIST ─────────────────────────────────────────────
create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  added_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ─── ADDRESSES ───────────────────────────────────────────────────
create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  full_name text not null,
  phone text not null,
  line1 text not null,
  city text not null,
  state text not null,
  country text not null default 'Pakistan',
  is_default boolean not null default false
);
create index if not exists addresses_user_idx on public.addresses(user_id);

-- ─── ORDERS ──────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  buyer_id uuid not null references public.profiles(id),
  buyer_name text not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment text not null default 'pending' check (payment in ('paid','pending','refunded')),
  payment_method text not null default '',
  subtotal numeric(12,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  address jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists orders_status_idx on public.orders(status);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  store_id uuid not null references public.seller_stores(id),
  name text not null,
  image text,
  qty int not null default 1 check (qty > 0),
  price numeric(12,2) not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  tracking_code text
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_store_idx on public.order_items(store_id);
create index if not exists orders_product_idx on public.order_items(product_id);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null,
  commission numeric(12,2) not null,
  seller_earnings numeric(12,2) not null,
  method text not null default '',
  status text not null default 'pending' check (status in ('paid','pending','refunded')),
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_id);

-- ─── REVIEWS ─────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  buyer_id uuid not null references public.profiles(id),
  buyer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);
create index if not exists reviews_product_idx on public.reviews(product_id);

-- ─── MESSAGING ───────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  product_id uuid references public.products(id) on delete set null,
  order_code text,
  last_at timestamptz not null default now(),
  buyer_unread int not null default 0,
  seller_unread int not null default 0,
  unique (buyer_id, seller_id)
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ─── NOTIFICATIONS / SETTINGS / REPORTS ──────────────────────────
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system' check (type in ('order','message','review','system','store','payout')),
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read);

create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  commission_rate numeric(4,2) not null default 8,
  currency text not null default 'PKR',
  platform_name text not null default 'Baloch Export Hub',
  maintenance boolean not null default false,
  allow_registrations boolean not null default true,
  auto_approve_stores boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  kind text not null check (kind in ('sales','users','products','reviews')),
  range text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.seller_stores     enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.cart_items        enable row level security;
alter table public.wishlist          enable row level security;
alter table public.addresses         enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.reviews           enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.notifications     enable row level security;
alter table public.platform_settings enable row level security;
alter table public.reports           enable row level security;

-- helper: current user's role
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: public read of basic info, self-update, admin all
create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all using (public.my_role() = 'admin');

-- categories: public read, admin write
create policy "categories readable" on public.categories for select using (true);
create policy "admin manages categories" on public.categories for all using (public.my_role() = 'admin');

-- stores: public read approved, seller manages own, admin all
create policy "approved stores readable" on public.seller_stores for select
  using (is_approved or seller_id = auth.uid() or public.my_role() = 'admin');
create policy "seller manages own store" on public.seller_stores for all
  using (seller_id = auth.uid() or public.my_role() = 'admin');

-- products: public read active, seller manages own, admin all
create policy "active products readable" on public.products for select
  using (status = 'active' or seller_id = auth.uid() or public.my_role() = 'admin');
create policy "seller manages own products" on public.products for all
  using (seller_id = auth.uid() or public.my_role() = 'admin');
create policy "product images readable" on public.product_images for select using (true);
create policy "seller manages own product images" on public.product_images for all
  using (exists (select 1 from public.products p where p.id = product_id and (p.seller_id = auth.uid() or public.my_role() = 'admin')));

-- cart & wishlist: strictly owner
create policy "own cart" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- addresses: owner only
create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: buyer reads own; sellers see orders containing their items; admin all
create policy "buyer reads own orders" on public.orders for select
  using (buyer_id = auth.uid() or public.my_role() = 'admin');
create policy "buyer creates orders" on public.orders for insert with check (buyer_id = auth.uid());
create policy "buyer cancels own order" on public.orders for update using (buyer_id = auth.uid() or public.my_role() = 'admin');

create policy "order items readable by parties" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.my_role() = 'admin'))
  or exists (select 1 from public.seller_stores s where s.id = store_id and s.seller_id = auth.uid())
);
create policy "seller updates own order items" on public.order_items for update using (
  exists (select 1 from public.seller_stores s where s.id = store_id and s.seller_id = auth.uid())
  or public.my_role() = 'admin'
);
create policy "buyer creates order items" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);

-- payments: buyer reads own, admin all (sellers read via order_items view)
create policy "buyer reads own payments" on public.payments for select
  using (buyer_id = auth.uid() or public.my_role() = 'admin');

-- reviews: public read approved; buyers insert for purchased products; admin moderate
create policy "approved reviews readable" on public.reviews for select
  using (is_approved or buyer_id = auth.uid() or public.my_role() = 'admin');
create policy "verified buyers review" on public.reviews for insert with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.buyer_id = auth.uid() and oi.product_id = reviews.product_id and oi.status = 'delivered'
  )
);
-- FIX: PostgreSQL requires separate policies for UPDATE and DELETE (cannot use "for update or delete")
create policy "admin updates reviews" on public.reviews for update using (public.my_role() = 'admin');
create policy "admin deletes reviews" on public.reviews for delete using (public.my_role() = 'admin');

-- messaging: only conversation participants
create policy "conversation participants" on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.my_role() = 'admin');
create policy "start conversations" on public.conversations for insert with check (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "conversation participants update" on public.conversations for update
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.my_role() = 'admin');
create policy "messages readable by participants" on public.messages for select using (
  exists (select 1 from public.conversations c
          where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.my_role() = 'admin'))
);
create policy "participants send messages" on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversations c
              where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
);

-- notifications: owner only
create policy "own notifications" on public.notifications for all
  using (user_id = auth.uid() or public.my_role() = 'admin') with check (user_id = auth.uid());

-- settings & reports: public read settings; admin write
create policy "settings readable" on public.platform_settings for select using (true);
create policy "admin manages settings" on public.platform_settings for all using (public.my_role() = 'admin');
create policy "reports admin only" on public.reports for all using (public.my_role() = 'admin');

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (profile images, product images, store logos/banners,
-- category images)
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('store-branding', 'store-branding', true),
  ('profile-images', 'profile-images', true),
  ('category-images', 'category-images', true)
on conflict (id) do nothing;

-- public read for all platform imagery
create policy "public read product images" on storage.objects for select
  using (bucket_id in ('product-images','store-branding','profile-images','category-images'));

-- authenticated uploads, size/extension validated client-side too
create policy "auth users upload product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "sellers upload branding" on storage.objects for insert
  with check (bucket_id = 'store-branding' and auth.role() = 'authenticated');
create policy "users upload avatars" on storage.objects for insert
  with check (bucket_id = 'profile-images' and auth.role() = 'authenticated');
create policy "admins upload category images" on storage.objects for insert
  with check (bucket_id = 'category-images' and public.my_role() = 'admin');

-- owners can update/delete their own objects
create policy "owners update objects" on storage.objects for update using (owner = auth.uid());
create policy "owners delete objects" on storage.objects for delete using (owner = auth.uid() or public.my_role() = 'admin');
