import React, { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts'
import { ShoppingBag } from 'lucide-react'
import { Badge, Card, EmptyState } from './ui'
import { getOrderStatusColor, getStatusTone, humanize, number, ORDER_STATUSES } from './formatters'
import { usePrefersReducedMotion } from './motion'

const toSortedEntries = (counts, includeKnownOrderStatuses = false) => {
  const actualEntries = Object.entries(counts ?? {}).map(([status, count]) => ({ status, count: Number(count) || 0 }))
  if (!includeKnownOrderStatuses) return actualEntries.sort((a, b) => b.count - a.count || a.status.localeCompare(b.status))
  const normalizedCounts = new Map(actualEntries.map(({ status, count }) => [
    String(status).toUpperCase().replace(/_/g, ' '), count,
  ]))
  const knownStatuses = ORDER_STATUSES.map((status) => ({ status, count: normalizedCounts.get(status) || 0 }))
  const unknownStatuses = actualEntries
    .filter(({ status }) => !ORDER_STATUSES.includes(String(status).toUpperCase().replace(/_/g, ' ')))
    .filter(({ count }) => count > 0)
  return [...knownStatuses, ...unknownStatuses].sort((a, b) => b.count - a.count || a.status.localeCompare(b.status))
}

const StatusTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { status, count } = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-900 dark:text-slate-100">{humanize(status)}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{number(count)} orders</p>
    </div>
  )
}

const renderActiveShape = (shape) => <Sector {...shape} outerRadius={shape.outerRadius + 4} />

// Donut of stats.orders.byStatus, plus the payment status breakdown.
const OrderStatusChart = ({ byStatus, byPaymentStatus }) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const statuses = useMemo(() => toSortedEntries(byStatus, true), [byStatus])
  const payments = useMemo(() => toSortedEntries(byPaymentStatus), [byPaymentStatus])
  const total = statuses.reduce((sum, entry) => sum + entry.count, 0)
  const chartStatuses = statuses.filter(({ count }) => count > 0)

  return (
    <Card title="Orders by status" subtitle="All orders" className="h-full">
      {total === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" message="Order statuses will be summarised here." />
      ) : (
        <>
          <div className="relative mx-auto h-44 w-44" role="img" aria-label="Orders by status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartStatuses}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={650}
                  activeShape={renderActiveShape}
                >
                  {chartStatuses.map((entry) => (
                    <Cell key={entry.status} fill={getOrderStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900">{number(total)}</span>
              <span className="text-xs text-slate-500">orders</span>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {statuses.map(({ status, count }) => (
              <li key={status} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getOrderStatusColor(status) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-slate-700">{humanize(status)}</span>
                <span className="font-medium text-slate-900">{number(count)}</span>
                <span className="w-10 text-right text-xs text-slate-500">{Math.round((count / total) * 100)}%</span>
              </li>
            ))}
          </ul>

          {payments.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500">Payment status</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {payments.map(({ status, count }) => (
                  <Badge key={status} tone={getStatusTone(status)}>
                    {humanize(status)} · {number(count)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default OrderStatusChart
