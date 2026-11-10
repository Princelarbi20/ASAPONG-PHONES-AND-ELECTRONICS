import React from 'react'
import { AlertTriangle, Inbox, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { getStatusTone, humanize } from './formatters'

export const cx = (...classes) => classes.filter(Boolean).join(' ')

export const TONE_CLASSES = {
  success: 'bg-green-50 text-green-700 ring-green-600/20',
  warning: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export const Card = ({ title, subtitle, action, children, className = '', bodyClassName = '' }) => (
  <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={cx('p-5', bodyClassName)}>{children}</div>
  </section>
)

export const Skeleton = ({ className = '' }) => (
  <div className={cx('animate-pulse rounded-md bg-slate-200/70', className)} />
)

export const Badge = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={cx(
      'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      TONE_CLASSES[tone],
      className
    )}
  >
    {children}
  </span>
)

export const StatusBadge = ({ status }) => <Badge tone={getStatusTone(status)}>{humanize(status) || 'Unknown'}</Badge>

// Real growth only: `value` comes straight from the API and is null when there is no previous data.
export const GrowthBadge = ({ value }) => {
  if (value === null || value === undefined) {
    return (
      <Badge tone="neutral">
        <Minus className="mr-1 h-3 w-3" aria-hidden="true" />
        No prior data
      </Badge>
    )
  }
  if (value > 0) {
    return (
      <Badge tone="success">
        <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />+{value}%
      </Badge>
    )
  }
  if (value < 0) {
    return (
      <Badge tone="danger">
        <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />
        {value}%
      </Badge>
    )
  }
  return (
    <Badge tone="neutral">
      <Minus className="mr-1 h-3 w-3" aria-hidden="true" />0%
    </Badge>
  )
}

const HINT_TONES = {
  muted: 'text-slate-500',
  success: 'text-green-600',
  warning: 'text-orange-600',
  danger: 'text-red-600',
}

export const StatCard = ({ label, value, icon: Icon, hint, hintTone = 'muted', className = '' }) => (
  <div className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {Icon && (
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      )}
    </div>
    <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">{value}</p>
    {hint && <p className={cx('mt-1 truncate text-xs font-medium', HINT_TONES[hintTone])}>{hint}</p>}
  </div>
)

export const EmptyState = ({ icon: Icon = Inbox, title, message }) => (
  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
    <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
    {message && <p className="mt-1 max-w-xs text-xs text-slate-500">{message}</p>}
  </div>
)

export const ErrorState = ({ message, onRetry, compact = false }) => (
  <div
    role="alert"
    className={cx(
      'flex gap-3 rounded-xl border border-red-200 bg-red-50 text-red-800',
      compact ? 'items-start p-3' : 'flex-col items-center p-10 text-center'
    )}
  >
    <AlertTriangle className={cx('shrink-0 text-red-500', compact ? 'mt-0.5 h-4 w-4' : 'h-8 w-8')} aria-hidden="true" />
    <div className={cx(compact && 'flex-1')}>
      <p className="text-sm font-semibold">{compact ? message : 'Could not load the dashboard'}</p>
      {!compact && <p className="mt-1 text-sm text-red-700">{message}</p>}
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className={cx(
          'inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 bg-white px-3.5 text-sm font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          !compact && 'mt-4'
        )}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
)
