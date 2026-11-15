import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LineChart as LineChartIcon } from 'lucide-react'
import { Card, EmptyState, GrowthBadge } from './ui'
import { compactNumber, formatDay, money, number } from './formatters'

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-900">{formatDay(point.date)}</p>
      <p className="mt-1 text-slate-600">
        Revenue: <span className="font-semibold text-slate-900">{money(point.revenue)}</span>
      </p>
      <p className="text-slate-600">
        Paid orders: <span className="font-semibold text-slate-900">{number(point.orders)}</span>
      </p>
    </div>
  )
}

// Revenue for the selected range, built only from stats.revenue returned by the API.
const RevenueChart = ({ revenue, days }) => {
  const series = revenue?.series ?? []
  const hasSales = series.some((point) => point.revenue > 0)

  return (
    <Card
      title="Revenue"
      subtitle={`Paid orders in the last ${days} days`}
      className="h-full"
      bodyClassName="pt-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">{money(revenue?.periodRevenue)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {number(revenue?.periodOrders)} paid {revenue?.periodOrders === 1 ? 'order' : 'orders'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <GrowthBadge value={revenue?.growthPercent} />
          <p className="text-xs text-slate-500">
            vs {money(revenue?.previousPeriodRevenue)} in the previous {days} days
          </p>
        </div>
      </div>

      <div className="mt-5 h-64 w-full sm:h-72" role="img" aria-label={`Daily revenue for the last ${days} days`}>
        {hasSales ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={compactNumber}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#revenueFill)"
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={LineChartIcon}
            title="No revenue in this period"
            message="Paid orders will appear here as soon as customers complete payment."
          />
        )}
      </div>
    </Card>
  )
}

export default RevenueChart