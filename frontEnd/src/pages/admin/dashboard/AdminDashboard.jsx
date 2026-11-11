import React from 'react'
import { Link } from 'react-router-dom'
import { Receipt, RefreshCw, ShoppingBag, Users, Wallet } from 'lucide-react'
import RevenueChart from './RevenueChart'
import OrderStatusChart from './OrderStatusChart'
import RecentOrdersTable from './RecentOrdersTable'
import { InventoryCard, LowStockCard, TopSellingCard } from './ProductPanels'
import { Card, ErrorState, Skeleton, StatCard, cx } from './ui'
import useDashboardStats, { RANGE_OPTIONS } from './useDashboardStats'
import { formatDay, formatTime, money, number } from './formatters'

const RangeSelector = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
    {RANGE_OPTIONS.map((days) => {
      const selected = value === days
      return (
        <button
          key={days}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(days)}
          className={cx(
            'min-h-9 min-w-14 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            selected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {days}D
        </button>
      )
    })}
  </div>
)

const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-9 w-40" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Card>
      <Card>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mx-auto mt-6 h-40 w-40 rounded-full" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-full" />
      </Card>
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-4 w-36" />
          {[...Array(4)].map((__, j) => (
            <div key={j} className="mt-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <div className="flex-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-2 h-2 w-full" />
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
    <Card>
      <Skeleton className="h-4 w-32" />
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="mt-4 h-8 w-full" />
      ))}
    </Card>
  </div>
)

const AdminDashboard = () => {
  const { days, setDays, data, loading, error, updatedAt, refetch } = useDashboardStats(30)

  const stats = data?.stats
  const range = data?.range
  const activeDays = range?.days ?? days // labels follow the data that is actually on screen
  const refreshing = loading && Boolean(stats)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Store overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              {range
                ? `Last ${activeDays} days · ${formatDay(range.from)} – ${formatDay(range.to)}`
                : 'Loading store statistics…'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RangeSelector value={days} onChange={setDays} />
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              aria-label="Refresh dashboard"
              title={updatedAt ? `Updated ${formatTime(updatedAt)}` : 'Refresh'}
              className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60"
            >
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!stats && error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !stats ? (
          <DashboardSkeleton />
        ) : (
          <>
            {error && <ErrorState compact message={`${error} Showing the last loaded data.`} onRetry={refetch} />}

            <div key={`${days}-${updatedAt?.getTime() ?? 'initial'}`} className={cx('space-y-6 transition-opacity duration-200', refreshing && 'opacity-60')} aria-busy={refreshing}>
              {/* KPI cards */}
              <div className="admin-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link to="/admin/transactions" aria-label="View all payment transactions" className="block rounded-xl transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <StatCard
                    label="Total revenue"
                    value={money(stats.summary.totalRevenue)}
                    icon={Wallet}
                    hint={`${number(stats.summary.paidOrders)} paid orders`}
                    className="h-full cursor-pointer transition-colors hover:border-indigo-200"
                  />
                </Link>
                <Link to="/admin/orders" aria-label="View all orders" className="block rounded-xl transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <StatCard
                    label="Total orders"
                    value={number(stats.summary.totalOrders)}
                    icon={ShoppingBag}
                    hint={`${number(stats.summary.pendingOrders)} pending`}
                    hintTone={stats.summary.pendingOrders > 0 ? 'warning' : 'muted'}
                    className="h-full cursor-pointer transition-colors hover:border-indigo-200"
                  />
                </Link>
                <StatCard
                  label="Customers"
                  value={number(stats.summary.totalCustomers)}
                  icon={Users}
                  hint={`+${number(stats.summary.newCustomers)} in the last ${activeDays} days`}
                  hintTone={stats.summary.newCustomers > 0 ? 'success' : 'muted'}
                />
                <StatCard
                  label="Average order value"
                  value={money(stats.summary.averageOrderValue)}
                  icon={Receipt}
                  hint={`Across ${number(stats.summary.paidOrders)} paid orders`}
                />
              </div>

              {/* Revenue + order status */}
              <div className="admin-stagger grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <RevenueChart revenue={stats.revenue} days={activeDays} />
                </div>
                <OrderStatusChart byStatus={stats.orders.byStatus} byPaymentStatus={stats.orders.byPaymentStatus} />
              </div>

              {/* Products */}
              <div className="admin-stagger grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <TopSellingCard items={stats.products.topSelling} />
                <LowStockCard products={stats.products} />
                <div className="md:col-span-2 xl:col-span-1">
                  <InventoryCard products={stats.products} />
                </div>
              </div>

              {/* Recent orders */}
              <RecentOrdersTable orders={stats.orders.recent} />
            </div>
          </>
        )}
    </div>
  )
}

export default AdminDashboard
