import React, { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Building2, ClipboardList, CreditCard, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Store, UserPlus, Users, X,
} from 'lucide-react'
import Logo from '@/component/Logo'
import { cx } from './ui'
import axiosInstance from '@/lib/axios'
import { authAction } from '@/redux/store'

// Sidebar links - these match the routes nested under /admin in App.jsx.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Catalogue & sales',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/admin/transactions', label: 'Transactions', icon: CreditCard },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/add-user', label: 'Add user', icon: UserPlus },
    ],
  },
  {
    label: 'Shops',
    items: [
      { to: '/admin/shop-request', label: 'Shop requests', icon: ClipboardList },
      { to: '/admin/registered-shops', label: 'Registered shops', icon: Building2 },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

const findCurrentItem = (pathname) =>
  ALL_ITEMS.find((item) =>
    item.end ? pathname === item.to || pathname === `${item.to}/` : pathname.startsWith(item.to)
  )

const SidebarContent = ({ onNavigate, onLogout }) => (
  <div className="flex h-full flex-col">
    <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-5">
      <Logo />
    </div>

    <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div className="border-t border-slate-200 p-3">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Store className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        Back to store
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        Log out
      </button>
    </div>
  </div>
)

// Used as the layout route for /admin: the active admin page renders through <Outlet />.
const DashboardLayout = ({ title, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const displayName = user?.userName || 'Admin'
  const pageTitle = title ?? findCurrentItem(location.pathname)?.label ?? 'Admin'

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/user-log-out')
    } catch {
      // Clear the local admin session even if the server session has expired.
    } finally {
      dispatch(authAction.logout())
      setDrawerOpen(false)
      navigate('/auth/login', { replace: true })
    }
  }

  // close the drawer after navigating
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // lock page scroll and allow Escape to close while the drawer is open
  useEffect(() => {
    if (!drawerOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => event.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [drawerOpen])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent onLogout={handleLogout} />
      </aside>

      {/* Tablet / mobile drawer */}
      <div className={cx('fixed inset-0 z-50 lg:hidden', drawerOpen ? 'visible' : 'invisible')} aria-hidden={!drawerOpen}>
        <div
          className={cx('absolute inset-0 bg-slate-900/40 transition-opacity duration-200', drawerOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={cx(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-200 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-2 grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="truncate text-base font-semibold text-slate-900">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden max-w-40 truncate text-sm font-medium text-slate-600 sm:block">{displayName}</span>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
