'use client'
import type { StageStatusRow } from '@/types'
import { STATUS_COLORS } from '@/lib/constants'

export function ProjectGantt({ stages }: { stages: StageStatusRow[] }) {
  const done = stages.filter(s => s.completed_date && s.days_from_mob !== null)
  if (!done.length) return <p className="text-sm text-gray-400">No stage data yet.</p>

  const maxDays = Math.max(...done.map(s => s.days_from_mob!), 30)

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs text-gray-400 mb-3">
        {(['on_time', 'buffer', 'delayed', 'no_data'] as const).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: STATUS_COLORS[s].dot }} />
            {s === 'on_time' ? 'On time' : s === 'buffer' ? 'Buffer' : s === 'delayed' ? 'Delayed' : 'No target'}
          </span>
        ))}
      </div>
      {done.map(s => {
        const pct = ((s.days_from_mob! / maxDays) * 100).toFixed(1)
        const color = STATUS_COLORS[s.stage_status].dot
        return (
          <div key={s.stage_name} className="flex items-center gap-3">
            <div className="w-36 text-xs text-gray-500 text-right shrink-0 truncate">{s.stage_name}</div>
            <div className="flex-1 relative h-5 bg-gray-100 rounded">
              <div
                className="absolute top-1 h-3 w-3 rounded-sm -translate-x-1/2"
                style={{ left: `${pct}%`, background: color }}
                title={`${s.days_from_mob}d from mob`}
              />
              {/* target marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-300 opacity-60"
                style={{ left: `${((s.target_days / maxDays) * 100).toFixed(1)}%` }}
                title={`Target: ${s.target_days}d`}
              />
            </div>
            <div className="w-20 text-xs text-right shrink-0">
              <span style={{ color }}>{s.days_from_mob}d</span>
              <span className="text-gray-300 mx-1">/</span>
              <span className="text-gray-400">{s.target_days}d</span>
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-3 mt-1">
        <div className="w-36" />
        <div className="flex-1 flex justify-between text-xs text-gray-300 px-0">
          <span>0d</span>
          <span>{Math.round(maxDays / 2)}d</span>
          <span>{maxDays}d</span>
        </div>
        <div className="w-20" />
      </div>
    </div>
  )
}
