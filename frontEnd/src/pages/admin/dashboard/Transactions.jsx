import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, RefreshCw, Search } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Badge, Card, EmptyState, ErrorState, Skeleton } from './ui'
import { formatDateTime, humanize, money } from './formatters'

const PAGE_SIZE = 20
const STATUS_OPTIONS = ['PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED', 'ABANDONED']

const statusTone = (status) => {
  if (status === 'SUCCESSFUL') return 'success'
  if (status === 'PENDING') return 'warning'
  if (status === 'REFUNDED') return 'info'
  if (status === 'FAILED' || status === 'ABANDONED') return 'danger'
  return 'neutral'
}

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [methods, setMethods] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const loadTransactions = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await axiosInstance.get('/transactions', {
          params: { page, limit: PAGE_SIZE, search: search.trim(), status, method },
          signal: controller.signal,
        })
        setTransactions(data.transactions || [])
        setMethods(data.methods || [])
        setPagination(data.pagination || { page, total: 0, totalPages: 0 })
      } catch (requestError) {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.message || 'Unable to load payment transactions.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadTransactions()
    return () => controller.abort()
  }, [page, search, status, method, reloadKey])

  const updateFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  const firstItem = pagination.total ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastItem = Math.min(page * PAGE_SIZE, pagination.total)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Payment transactions</h2>
        <p className="mt-1 text-sm text-slate-500">Search and review payment attempts recorded by the payment gateway.</p>
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder="Search customer, order or reference"
              aria-label="Search transactions"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <select value={status} onChange={updateFilter(setStatus)} aria-label="Filter by status" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
          <select value={method} onChange={updateFilter(setMethod)} aria-label="Filter by payment method" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400">
            <option value="">All methods</option>
            {methods.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
        </div>

        {error ? (
          <div className="p-4"><ErrorState compact message={error} onRetry={() => setReloadKey((current) => current + 1)} /></div>
        ) : loading ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading payment transactions">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={CreditCard} title="No transactions found" message="Payment attempts will appear here once customers start checkout." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  {['Transaction ID', 'Customer', 'Order ID', 'Amount', 'Method', 'Gateway', 'Date', 'Status'].map((heading) => (
                    <th key={heading} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-slate-50/70">
                    <td className="max-w-56 px-4 py-3">
                      <p className="truncate font-medium text-slate-900">{transaction.transactionId || transaction.reference}</p>
                      {transaction.transactionId && <p className="mt-0.5 truncate text-xs text-slate-500">Ref: {transaction.reference}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{transaction.user?.userName || 'Unknown customer'}</p>
                      <p className="text-xs text-slate-500">{transaction.user?.email || ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{transaction.order?.orderNumber ? `#${transaction.order.orderNumber}` : transaction.order?._id?.slice(-8) || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{money(transaction.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{transaction.serviceProvider ? `${transaction.serviceProvider} Mobile Money` : humanize(transaction.paymentMethod) || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{transaction.provider || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(transaction.createdAt) || 'N/A'}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(transaction.status)}>{humanize(transaction.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && !loading && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {firstItem}-{lastItem} of {pagination.total}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" />Previous</button>
              <span className="px-1">Page {page} of {Math.max(1, pagination.totalPages)}</span>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pagination.totalPages} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next<ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => setReloadKey((current) => current + 1)} aria-label="Refresh transactions" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Transactions
