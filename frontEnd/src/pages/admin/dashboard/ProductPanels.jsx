import React, { useState } from 'react'
import { Boxes, Package, TrendingUp } from 'lucide-react'
import { Badge, Card, EmptyState } from './ui'
import { money, number, resolveImageUrl } from './formatters'

const ProductThumb = ({ src, name }) => {
  const [failed, setFailed] = useState(false)
  const url = resolveImageUrl(src)

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {url && !failed ? (
        <img
          src={url}
          alt={name || 'Product'}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />
      )}
    </span>
  )
}

// stats.products.topSelling
export const TopSellingCard = ({ items = [] }) => {
  const maxUnits = Math.max(...items.map((item) => item.unitsSold), 1)

  return (
    <Card title="Top selling products" subtitle="By units sold, paid orders" className="h-full">
      {items.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No sales yet" message="Best sellers will show up after the first paid orders." />
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.productId || index} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-xs font-medium text-slate-400">{index + 1}</span>
              <ProductThumb src={item.image} name={item.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="shrink-0 text-xs font-semibold text-slate-900">{money(item.revenue)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(item.unitsSold / maxUnits) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{number(item.unitsSold)} sold</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

// stats.products.lowStockItems (+ outOfStock / lowStock counts)
export const LowStockCard = ({ products }) => {
  const items = products?.lowStockItems ?? []

  return (
    <Card
      title="Stock alerts"
      subtitle={`${products?.lowStockThreshold ?? 5} units or fewer`}
      className="h-full"
      action={
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone="danger">{number(products?.outOfStock)} out</Badge>
          <Badge tone="warning">{number(products?.lowStock)} low</Badge>
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={Boxes} title="Stock levels look healthy" message="Products running low will be listed here." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <ProductThumb src={item.image} name={item.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                {item.brand && <p className="truncate text-xs text-slate-500">{item.brand}</p>}
              </div>
              {item.stock <= 0 ? (
                <Badge tone="danger">Out of stock</Badge>
              ) : (
                <Badge tone="warning">{number(item.stock)} left</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const Tile = ({ label, value, tone }) => {
  const toneClass = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-orange-600' : 'text-slate-900'
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

// stats.products totals + byCategory
export const InventoryCard = ({ products }) => {
  const categories = (products?.byCategory ?? []).slice(0, 6)
  const total = products?.total ?? 0

  return (
    <Card title="Inventory" subtitle="Catalogue overview" className="h-full">
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Total products" value={number(total)} />
        <Tile label="Inventory value" value={money(products?.inventoryValue)} />
        <Tile label="Out of stock" value={number(products?.outOfStock)} tone={products?.outOfStock > 0 ? 'danger' : undefined} />
        <Tile label="Low stock" value={number(products?.lowStock)} tone={products?.lowStock > 0 ? 'warning' : undefined} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-500">Products by category</p>
        {categories.length === 0 ? (
          <EmptyState icon={Boxes} title="No categories yet" />
        ) : (
          <ul className="mt-3 space-y-3">
            {categories.map(({ category, count }) => (
              <li key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-700">{category}</span>
                  <span className="ml-2 shrink-0 font-medium text-slate-900">{number(count)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}