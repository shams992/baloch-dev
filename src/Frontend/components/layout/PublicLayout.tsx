import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { useAuth } from '@/lib/providers'
import type { Role } from '@/lib/types'
import { Button } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function homeFor(role: Role) {
  return role === 'admin' ? '/admin' : role === 'seller' ? '/seller' : '/dashboard'
}

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

export function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-16">
      <div className="text-center">
        <p className="font-display text-[6rem] font-semibold leading-none text-gradient">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">This page wandered off into the Kohsar</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">The page you are looking for does not exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button to="/" variant="gold">Back to home</Button>
          <Button to="/contact" variant="ghost">Contact support</Button>
        </div>
      </div>
    </div>
  )
}

export function Forbidden() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-16">
      <div className="text-center">
        <ShieldAlert size={44} className="mx-auto text-crimson" />
        <h1 className="mt-4 font-display text-2xl font-semibold">You don’t have access to this area</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">Your account role does not permit viewing this page.</p>
        <div className="mt-6 flex justify-center"><Button to="/" variant="gold">Back to home</Button></div>
      </div>
    </div>
  )
}
