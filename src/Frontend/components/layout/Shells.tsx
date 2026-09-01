import {
  Bell, Heart, LayoutDashboard, MapPin, MessageCircle, Package, PackagePlus,
  ShoppingBag, Star, Store, User, Users, Wallet, Settings as SettingsIcon, BarChart3, FolderTree,
  FileBarChart, Eye, Handshake, Compass,
} from 'lucide-react'
import { DashboardLayout } from './DashboardLayout'
import { auth, messaging, notifications, orders } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { StoreSwitcher, useSellerStore } from '@/pages/seller/SellerCenter'

export function BuyerShell() {
  const { user } = useAuth()
  const unread = user ? messaging.conversationsFor(user.id).reduce((s, c) => s + c.buyer_unread, 0) : 0
  return (
    <DashboardLayout
      title="Buyer Dashboard"
      accent="text-brand dark:text-gold"
      homeTo="/dashboard"
      items={[
        { to: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={17} />, end: true },
        { to: '/dashboard/sellers', label: 'Sellers', icon: <Store size={17} /> },
        { to: '/dashboard/orders', label: 'Orders', icon: <Package size={17} /> },
        { to: '/dashboard/wishlist', label: 'Wishlist', icon: <Heart size={17} /> },
        { to: '/dashboard/messages', label: 'Messages', icon: <MessageCircle size={17} />, badge: unread },
        { to: '/dashboard/reviews', label: 'Reviews', icon: <Star size={17} /> },
        { to: '/dashboard/addresses', label: 'Addresses', icon: <MapPin size={17} /> },
        { to: '/dashboard/profile', label: 'Profile', icon: <User size={17} /> },
        { to: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
        { to: '/dashboard/become-seller', label: 'Become a Seller', icon: <Handshake size={17} /> },
      ]}
    />
  )
}

export function SellerShell() {
  const { user } = useAuth()
  useDb()
  const store = useSellerStore()
  const pending = store ? orders.listByStore(store.id).filter((o) => ['submitted', 'pending', 'confirmed'].includes(o.status)).length : 0
  const unread = user ? messaging.conversationsFor(user.id, store ? { storeId: store.id } : undefined).reduce((s, c) => s + c.seller_unread, 0) : 0
  return (
    <DashboardLayout
      title="Seller Studio"
      accent="text-gold"
      homeTo="/seller"
      sidebarSlot={<StoreSwitcher />}
      items={[
        { to: '/seller', label: 'Overview', icon: <LayoutDashboard size={17} />, end: true },
        { to: '/products', label: 'Connect with Marketplace', icon: <Compass size={17} /> },
        { to: '/seller/products', label: 'Products', icon: <Package size={17} /> },
        { to: '/seller/add-product', label: 'Add Product', icon: <PackagePlus size={17} /> },
        { to: '/seller/orders', label: 'Orders', icon: <Package size={17} />, badge: pending },
        { to: '/seller/customers', label: 'Customers', icon: <Users size={17} /> },
        { to: '/seller/earnings', label: 'Earnings', icon: <Wallet size={17} /> },
        { to: '/seller/reviews', label: 'Reviews', icon: <Star size={17} /> },
        { to: '/seller/messages', label: 'Messages', icon: <MessageCircle size={17} />, badge: unread },
        { to: '/seller/notifications', label: 'Notifications', icon: <Bell size={17} /> },
        { to: '/seller/store-profile', label: 'Store Profile', icon: <Store size={17} /> },
        { to: '/dashboard', label: 'Buyer Dashboard', icon: <ShoppingBag size={17} /> },
        { to: '/seller/settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
      ]}
    />
  )
}

export function AdminShell() {
  const { user } = useAuth()
  const unread = user ? notifications.unreadCount(user.id) : 0
  return (
    <DashboardLayout
      title="Admin Panel"
      accent="text-crimson"
      homeTo="/admin"
      items={[
        { to: '/admin', label: 'Dashboard', icon: <BarChart3 size={17} />, end: true },
        { to: '/admin/users', label: 'Users', icon: <Users size={17} /> },
        { to: '/admin/buyers', label: 'Buyers', icon: <User size={17} /> },
        { to: '/admin/sellers', label: 'Sellers', icon: <Store size={17} /> },
        { to: '/admin/products', label: 'Products', icon: <Package size={17} /> },
        { to: '/admin/categories', label: 'Categories', icon: <FolderTree size={17} /> },
        { to: '/admin/orders', label: 'Orders', icon: <PackagePlus size={17} /> },
        { to: '/admin/reviews', label: 'Reviews', icon: <Star size={17} /> },
        { to: '/admin/messages', label: 'Messages', icon: <MessageCircle size={17} /> },
        { to: '/admin/revenue', label: 'Revenue', icon: <Wallet size={17} /> },
        { to: '/admin/reports', label: 'Reports', icon: <FileBarChart size={17} /> },
        { to: '/admin/notifications', label: 'Notifications', icon: <Bell size={17} />, badge: unread },
        { to: '/admin/settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
      ]}
    />
  )
}

export { auth }
export { Eye }
