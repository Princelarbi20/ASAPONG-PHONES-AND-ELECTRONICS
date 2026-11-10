import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PaginationControls = ({ page, limit, total, totalPages, onPageChange, loading = false }) => {
  const safeTotalPages = Math.max(1, totalPages || 0)
  const firstItem = total > 0 ? (page - 1) * limit + 1 : 0
  const lastItem = Math.min(page * limit, total)

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
      <span>Showing {firstItem}-{lastItem} of {total}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={loading || page <= 1}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="whitespace-nowrap">Page {page} of {safeTotalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={loading || page >= safeTotalPages}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default PaginationControls
