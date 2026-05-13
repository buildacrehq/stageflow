'use client'
import { StageStatus } from '@/types'
import { STATUS_COLORS } from '@/lib/constants'

const LABELS: Record<StageStatus, string> = {
  on_time: 'On Time',
  buffer:  'Buffer',
  delayed: 'Delayed',
  no_data: '—',
}

export function StatusBadge({ status }: { status: StageStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>
      {LABELS[status]}
    </span>
  )
}
