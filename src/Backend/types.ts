/* ── Domain types for Baloch Export Hub ───────────────────────── */

export type Role = 'buyer' | 'seller' | 'admin'

export interface Profile {
  id: string
  full_name: string
  username: string
  email: string
  avatar_url?: string
  avatar_color: string
  role: Role
  phone?: string
  bio?: string
  location?: string
  is_blocked: boolean
  created_at: string
}

export interface Category {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  image?: string
}

export interface Store {
  id: string
  seller_id: string
  name: string
  slug: string
  description: string
  category_slugs: string[]
  logo_url?: string
  logo_color: string
  logo_initials: string
  banner?: string
  location: string
  rating: number
  total_sales: number
  is_approved: boolean
  blocked?: boolean
  deleted_at?: string | null
  whatsapp_number?: string
  whatsapp_verified?: boolean
  created_at: string
}

export type ProductCondition = 'new' | 'handmade' | 'vintage'
export type ProductStatus = 'active' | 'hidden' | 'pending' | 'rejected'

export interface Product {
  id: string
  store_id: string
  seller_id: string
  name: string
  description: string
  price: number
  currency: 'PKR' | 'USD'
  image: string
  category_slug: string
  stock: number
  condition: ProductCondition
  location: string
  shipping_fee: number
  shipping_days: string
  tags: string[]
  rating: number
  review_count: number
  status: ProductStatus
  sold: number
  created_at: string
}

export interface CartItem { id: string; user_id: string; product_id: string; qty: number; added_at: string }
export interface WishlistItem { id: string; user_id: string; product_id: string; added_at: string }

export interface Address {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string
  line1: string
  city: string
  state: string
  country: string
  email?: string
  is_default: boolean
}

export type CanonicalOrderStatus =
  | 'submitted'
  | 'packaging'
  | 'packed'
  | 'sent_to_platform'
  | 'on_way'
  | 'reached_to_buyer'
  | 'cancelled'

/** Canonical statuses plus legacy aliases still accepted from older rows. */
export type OrderStatus =
  | CanonicalOrderStatus
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
export type PaymentStatus = 'paid' | 'pending' | 'refunded'
export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'sadapay' | 'bank_transfer' | 'cod'

export const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; sub: string }> = [
  { id: 'easypaisa', label: 'Easypaisa', sub: 'Mobile wallet — confirmed after provider callback' },
  { id: 'jazzcash', label: 'JazzCash', sub: 'Mobile wallet — confirmed after provider callback' },
  { id: 'sadapay', label: 'SadaPay', sub: 'Wallet — confirmed after provider callback' },
  { id: 'bank_transfer', label: 'Bank Transfer', sub: 'Upload proof — stays pending until verified' },
  { id: 'cod', label: 'Cash on Delivery', sub: 'Pay the courier — not marked paid until delivery' },
]

export interface OrderStatusHistory {
  id: string
  order_id: string
  order_item_id?: string | null
  from_status?: string | null
  to_status: OrderStatus | string
  changed_by?: string | null
  changed_by_role?: string | null
  note?: string
  created_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  store_id: string
  name: string
  image: string
  qty: number
  price: number
  status: OrderStatus
  tracking_code?: string
  courier?: string
  estimated_delivery?: string
}

export interface Order {
  id: string
  code: string
  buyer_id: string
  buyer_name: string
  status: OrderStatus
  payment: PaymentStatus
  payment_method: string
  subtotal: number
  shipping: number
  total: number
  commission: number
  address: Address
  items: OrderItem[]
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  buyer_id: string
  amount: number
  commission: number
  seller_earnings: number
  method: string
  status: PaymentStatus
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  order_id?: string
  buyer_id: string
  buyer_name: string
  rating: number
  comment: string
  is_approved: boolean
  created_at: string
}

export interface Conversation {
  id: string
  buyer_id: string
  seller_id: string
  product_id?: string
  store_id?: string
  order_id?: string
  order_code?: string
  last_at: string
  buyer_unread: number
  seller_unread: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id?: string
  body: string
  read?: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'order' | 'message' | 'review' | 'system' | 'store' | 'payout'
  title: string
  body: string
  href?: string
  read: boolean
  created_at: string
}

export interface PlatformSettings {
  commission_rate: number
  currency: string
  platform_name: string
  maintenance: boolean
  allow_registrations: boolean
  auto_approve_stores: boolean
}

export interface Report {
  id: string
  title: string
  kind: 'sales' | 'users' | 'products' | 'reviews'
  range: string
  created_at: string
  summary: string
}

export interface DBState {
  version: number
  profiles: Profile[]
  categories: Category[]
  stores: Store[]
  products: Product[]
  cart: CartItem[]
  wishlist: WishlistItem[]
  orders: Order[]
  payments: Payment[]
  reviews: Review[]
  conversations: Conversation[]
  messages: Message[]
  notifications: Notification[]
  addresses: Address[]
  settings: PlatformSettings
  reports: Report[]
}

export const ORDER_FLOW: CanonicalOrderStatus[] = [
  'submitted', 'packaging', 'packed', 'sent_to_platform', 'on_way', 'reached_to_buyer', 'cancelled',
]

export const BUYER_TRACK_STAGES: Array<{
  status: CanonicalOrderStatus
  label: string
  done: string
  waiting: string
}> = [
  { status: 'submitted', label: 'Submitted Order', done: 'Order successfully submitted', waiting: 'Waiting for submission' },
  { status: 'packaging', label: 'Ready to Packing', done: 'Seller is preparing your order', waiting: 'Waiting for the seller' },
  { status: 'packed', label: 'Packed Your Order', done: 'Your order has been packed', waiting: 'Waiting to be packed' },
  { status: 'on_way', label: 'On Way', done: 'Your order is on the way', waiting: 'Waiting for dispatch' },
  { status: 'reached_to_buyer', label: 'Reached to Buyer', done: 'Your order has reached the buyer', waiting: 'Waiting for delivery' },
]
