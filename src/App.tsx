import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider, AuthProvider } from '@/lib/providers'
import { PublicLayout, NotFound, RequireAuth } from '@/components/layout/PublicLayout'
import { BuyerShell, SellerShell, AdminShell } from '@/components/layout/Shells'

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage = lazy(() => import('@/pages/auth/Auth').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/Auth').then((m) => ({ default: m.RegisterPage })))

const AboutPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.AboutPage })))
const HowItWorksPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.HowItWorksPage })))
const CategoriesPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.CategoriesPage })))
const TrustPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.TrustPage })))
const DeliveryPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.DeliveryPage })))
const BecomeSellerPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.BecomeSellerPage })))
const ContactPage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.ContactPage })))
const UnsubscribePage = lazy(() => import('@/pages/info/InfoPages').then((m) => ({ default: m.UnsubscribePage })))
const DocPage = lazy(() => import('@/pages/info/Docs').then((m) => ({ default: m.DocPage })))

const ProductsPage = lazy(() => import('@/pages/market/Products').then((m) => ({ default: m.ProductsPage })))
const SearchPage = lazy(() => import('@/pages/market/Products').then((m) => ({ default: m.SearchPage })))
const CategoryPage = lazy(() => import('@/pages/market/Products').then((m) => ({ default: m.CategoryPage })))
const SellersPage = lazy(() => import('@/pages/market/Products').then((m) => ({ default: m.SellersPage })))
const ProductPage = lazy(() => import('@/pages/market/ProductPage').then((m) => ({ default: m.ProductPage })))
const StorePage = lazy(() => import('@/pages/market/StorePage').then((m) => ({ default: m.StorePage })))
const StoreBySellerPage = lazy(() => import('@/pages/market/StorePage').then((m) => ({ default: m.StoreBySellerPage })))
const CartPage = lazy(() => import('@/pages/market/Cart').then((m) => ({ default: m.CartPage })))
const WishlistPage = lazy(() => import('@/pages/market/Cart').then((m) => ({ default: m.WishlistPage })))
const CheckoutPage = lazy(() => import('@/pages/market/Cart').then((m) => ({ default: m.CheckoutPage })))
const OrderConfirmPage = lazy(() => import('@/pages/market/Cart').then((m) => ({ default: m.OrderConfirmPage })))

const BuyerOverview = lazy(() => import('@/pages/buyer/BuyerDashboard').then((m) => ({ default: m.BuyerOverview })))
const BuyerOrders = lazy(() => import('@/pages/buyer/BuyerDashboard').then((m) => ({ default: m.BuyerOrders })))
const BuyerReviews = lazy(() => import('@/pages/buyer/BuyerDashboard').then((m) => ({ default: m.BuyerReviews })))
const BuyerSellers = lazy(() => import('@/pages/buyer/BuyerDashboard').then((m) => ({ default: m.BuyerSellers })))
const BuyerProfile = lazy(() => import('@/pages/buyer/BuyerMisc').then((m) => ({ default: m.BuyerProfile })))
const BuyerSettings = lazy(() => import('@/pages/buyer/BuyerMisc').then((m) => ({ default: m.BuyerSettings })))
const BuyerAddresses = lazy(() => import('@/pages/buyer/BuyerMisc').then((m) => ({ default: m.BuyerAddresses })))
const BecomeSeller = lazy(() => import('@/pages/buyer/BuyerMisc').then((m) => ({ default: m.BecomeSeller })))

const SellerOverview = lazy(() => import('@/pages/seller/SellerCenter').then((m) => ({ default: m.SellerOverview })))
const SellerEarnings = lazy(() => import('@/pages/seller/SellerCenter').then((m) => ({ default: m.SellerEarnings })))
const SellerCustomers = lazy(() => import('@/pages/seller/SellerCenter').then((m) => ({ default: m.SellerCustomers })))
const SellerProducts = lazy(() => import('@/pages/seller/SellerProducts').then((m) => ({ default: m.SellerProducts })))
const SellerAddProduct = lazy(() => import('@/pages/seller/SellerProducts').then((m) => ({ default: m.SellerAddProduct })))
const SellerOrders = lazy(() => import('@/pages/seller/SellerOps').then((m) => ({ default: m.SellerOrders })))
const SellerReviews = lazy(() => import('@/pages/seller/SellerOps').then((m) => ({ default: m.SellerReviews })))
const SellerNotifications = lazy(() => import('@/pages/seller/SellerOps').then((m) => ({ default: m.SellerNotifications })))
const SellerStoreProfile = lazy(() => import('@/pages/seller/SellerOps').then((m) => ({ default: m.SellerStoreProfile })))
const MessagesView = lazy(() => import('@/components/shared/Messages').then((m) => ({ default: m.MessagesView })))

const AdminOverview = lazy(() => import('@/pages/admin/AdminPanel').then((m) => ({ default: m.AdminOverview })))
const AdminRevenue = lazy(() => import('@/pages/admin/AdminPanel').then((m) => ({ default: m.AdminRevenue })))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const AdminSellers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminSellers })))
const AdminProducts = lazy(() => import('@/pages/admin/AdminCatalog').then((m) => ({ default: m.AdminProducts })))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCatalog').then((m) => ({ default: m.AdminCategories })))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminOrders })))
const AdminReviews = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminReviews })))
const AdminMessages = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminMessages })))
const AdminReports = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminReports })))
const AdminNotifications = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminNotifications })))
const AdminSettings = lazy(() => import('@/pages/admin/AdminOps').then((m) => ({ default: m.AdminSettings })))

function Fallback() {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center" role="status" aria-label="Loading">
      <svg width="52" height="52" viewBox="0 0 64 64" className="animate-spin-slower">
        <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--gold)" strokeWidth="3" />
        <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--brand)" strokeWidth="3" transform="rotate(45 32 32)" />
        <circle cx="32" cy="32" r="5" fill="var(--crimson)" />
      </svg>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<Fallback />}>
          <Routes>
            {/* Auth — own full-screen layout (branding included) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Public site (landing + info + marketplace) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/trust" element={<TrustPage />} />
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/become-seller" element={<BecomeSellerPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/faq" element={<DocPage />} />
              <Route path="/help" element={<DocPage />} />
              <Route path="/terms" element={<DocPage />} />
              <Route path="/privacy" element={<DocPage />} />
              <Route path="/refund-policy" element={<DocPage />} />
              <Route path="/seller-guide" element={<DocPage />} />

              <Route path="/products" element={<ProductsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/sellers" element={<SellersPage />} />
              <Route path="/store/:slug" element={<StorePage />} />
              <Route path="/seller/:id" element={<StoreBySellerPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:code" element={<OrderConfirmPage />} />

              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Buyer dashboard — any authenticated user */}
            <Route path="/dashboard" element={<RequireAuth><BuyerShell /></RequireAuth>}>
              <Route index element={<BuyerOverview />} />
              <Route path="sellers" element={<BuyerSellers />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="messages" element={<MessagesView perspective="buyer" />} />
              <Route path="reviews" element={<BuyerReviews />} />
              <Route path="addresses" element={<BuyerAddresses />} />
              <Route path="profile" element={<BuyerProfile />} />
              <Route path="settings" element={<BuyerSettings />} />
              <Route path="become-seller" element={<BecomeSeller />} />
            </Route>

            {/* Seller dashboard — sellers (admins can inspect) */}
            <Route path="/seller" element={<RequireAuth roles={['seller', 'admin']}><SellerShell /></RequireAuth>}>
              <Route index element={<SellerOverview />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="add-product" element={<SellerAddProduct />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="customers" element={<SellerCustomers />} />
              <Route path="earnings" element={<SellerEarnings />} />
              <Route path="reviews" element={<SellerReviews />} />
              <Route path="messages" element={<MessagesView perspective="seller" />} />
              <Route path="notifications" element={<SellerNotifications />} />
              <Route path="store-profile" element={<SellerStoreProfile />} />
              <Route path="settings" element={<BuyerSettings />} />
            </Route>

            {/* Admin panel */}
            <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminShell /></RequireAuth>}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="buyers" element={<AdminUsers role="buyer" />} />
              <Route path="sellers" element={<AdminSellers />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}
