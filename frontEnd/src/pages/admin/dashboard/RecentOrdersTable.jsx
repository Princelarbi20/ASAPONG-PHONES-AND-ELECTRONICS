import React from 'react'
import { ShoppingBag } from 'lucide-react'
import { Card, EmptyState, StatusBadge } from './ui'
import { formatDateTime, money, number } from './formatters'

const HEADERS = ['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date']

// stats.orders.recent - scrolls horizontally on small screens.
const RecentOrdersTable = ({ orders = [] }) => (
  <Card title="Recent orders" subtitle="Latest 8 orders" bodyClassName="p-0 pt-4">
    {orders.length === 0 ? (
      <EmptyState icon={ShoppingBag} title="No orders yet" message="New orders will appear here as they come in." />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              {HEADERS.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={`whitespace-nowrap px-5 py-2.5 font-medium ${index === 2 || index === 3 ? 'text-right' : ''}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order._id} className="transition-colors hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">#{order.orderNumber}</td>
                <td className="max-w-48 truncate px-5 py-3 text-slate-700">{order.customer}</td>
                <td className="px-5 py-3 text-right text-slate-700">{number(order.itemCount)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-900">{money(order.totalPrice)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={order.paymentStatus} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
)

export default RecentOrdersTable