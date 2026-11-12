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
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Payment transactions</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Search and review payment attempts recorded by the payment gateway.</p>
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
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-sm"
            />
          </label>
          <select value={status} onChange={updateFilter(setStatus)} aria-label="Filter by status" className="min-h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-400 sm:w-auto sm:text-sm">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
          <select value={method} onChange={updateFilter(setMethod)} aria-label="Filter by payment method" className="min-h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-400 sm:w-auto sm:text-sm">
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
          <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
            {transactions.map((transaction) => {
              const transactionId = transaction.transactionId || transaction.reference || 'N/A'
              const orderId = transaction.order?.orderNumber
                ? `#${transaction.order.orderNumber}`
                : transaction.order?._id?.slice(-8) || 'N/A'

              return (
                <article key={transaction._id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-3.5">
                  <div className="flex min-w-0 items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Transaction ID</p>
                      <p className="mt-0.5 break-all text-xs font-semibold leading-4 text-slate-900 sm:text-sm">{transactionId}</p>
                      {transaction.transactionId && transaction.reference && (
                        <p className="mt-0.5 break-all text-[10px] leading-4 text-slate-500 sm:text-xs">Ref: {transaction.reference}</p>
                      )}
                    </div>
                    <Badge tone={statusTone(transaction.status)} className="shrink-0 text-[10px] sm:text-xs">
                      {humanize(transaction.status)}
                    </Badge>
                  </div>

                  <dl className="mt-2.5 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Customer</dt>
                      <dd className="mt-0.5 break-words text-xs font-medium leading-4 text-slate-800">{transaction.customerType === 'GUEST' && !transaction.user ? 'Guest' : transaction.customerName || transaction.user?.userName || transaction.user?.name || transaction.order?.customerName || transaction.customerEmail || transaction.user?.email || transaction.order?.customerEmail || 'Customer unavailable'}</dd>
                      <dd className="break-all text-[10px] leading-4 text-slate-500 sm:text-xs">{transaction.customerEmail || transaction.user?.email || transaction.order?.customerEmail || 'No email'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Order ID</dt>
                      <dd className="mt-0.5 break-all text-xs leading-4 text-slate-700">{orderId}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Amount</dt>
                      <dd className="mt-0.5 break-words text-xs font-semibold leading-4 text-slate-900">{money(transaction.amount)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Method</dt>
                      <dd className="mt-0.5 break-words text-xs leading-4 text-slate-700">{transaction.serviceProvider ? `${transaction.serviceProvider} Mobile Money` : humanize(transaction.paymentMethod) || 'N/A'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Gateway</dt>
                      <dd className="mt-0.5 break-words text-xs leading-4 text-slate-700">{transaction.provider || 'N/A'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Date</dt>
                      <dd className="mt-0.5 break-words text-xs leading-4 text-slate-500">{formatDateTime(transaction.createdAt) || 'N/A'}</dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}

        {!error && !loading && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:text-sm">
            <span>Showing {firstItem}-{lastItem} of {pagination.total}</span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:px-3 sm:text-sm"><ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Previous</button>
              <span className="px-1">Page {page} of {Math.max(1, pagination.totalPages)}</span>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pagination.totalPages} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:px-3 sm:text-sm">Next<ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
              <button type="button" onClick={() => setReloadKey((current) => current + 1)} aria-label="Refresh transactions" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 sm:h-10 sm:w-10"><RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Transactions
