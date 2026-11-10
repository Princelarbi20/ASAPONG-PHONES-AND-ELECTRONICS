import React, { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { ShoppingBag } from 'lucide-react'
import { Badge, Card, EmptyState } from './ui'
import { getStatusTone, humanize, number } from './formatters'

const TONE_COLORS = {
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#2563eb',
  neutral: '#94a3b8',
}

const toSortedEntries = (counts) =>
  Object.entries(counts ?? {})
    .map(([status, count]) => ({ status, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)

// Donut of stats.orders.byStatus, plus the payment status breakdown.
const OrderStatusChart = ({ byStatus, byPaymentStatus }) => {
  const statuses = useMemo(() => toSortedEntries(byStatus), [byStatus])
  const payments = useMemo(() => toSortedEntries(byPaymentStatus), [byPaymentStatus])
  const total = statuses.reduce((sum, entry) => sum + entry.count, 0)

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
                  data={statuses}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {statuses.map((entry) => (
                    <Cell key={entry.status} fill={TONE_COLORS[getStatusTone(entry.status)]} />
                  ))}
                </Pie>
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
                  style={{ backgroundColor: TONE_COLORS[getStatusTone(status)] }}
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