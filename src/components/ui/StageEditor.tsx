'use client'
import { useState, useTransition } from 'react'
import { StatusBadge } from './StatusBadge'
import { updateStageDate } from '@/app/actions'
import type { StageStatusRow, StageTarget } from '@/types'

interface Props {
  projectId: string
  stages: StageStatusRow[]
  targets: StageTarget[]
  mobDate: string | null
}

export function StageEditor({ projectId, stages, targets, mobDate }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stageMap = Object.fromEntries(stages.map(s => [s.stage_name, s]))

  function handleSave(stageName: string, date: string) {
    startTransition(async () => {
      await updateStageDate(projectId, stageName, date || null)
      setEditing(null)
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-160">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Stage</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Completed Date</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Days from Mob</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Target</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Delay</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {targets.map(t => {
            const s = stageMap[t.stage_name]
            const isEditing = editing === t.stage_name
            const currentDate = s?.completed_date ?? ''

            return (
              <tr
                key={t.stage_name}
                className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                    {t.category}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        defaultValue={currentDate}
                        id={`date-${t.stage_name}`}
                        className="border border-green-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                      />
                      <button
                        disabled={isPending}
                        onClick={() => {
                          const val = (document.getElementById(`date-${t.stage_name}`) as HTMLInputElement).value
                          handleSave(t.stage_name, val)
                        }}
                        className="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(t.stage_name)}
                      className="text-left text-gray-700 hover:text-green-700 transition-colors"
                    >
                      {currentDate
                        ? new Date(currentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-gray-300 italic text-xs">Click to add date</span>
                      }
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center text-gray-600">
                  {s?.days_from_mob !== undefined && s?.days_from_mob !== null ? `${s.days_from_mob}d` : '—'}
                </td>
                <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{t.target_days}d</td>
                <td className="px-4 py-2.5 text-center">
                  {s?.delay_days !== undefined && s?.delay_days !== null && s.delay_days > 0
                    ? <span className="text-red-600 font-medium text-xs">+{s.delay_days}d</span>
                    : s?.stage_status === 'on_time' ? <span className="text-green-600 text-xs">—</span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-2.5 text-center">
                  {s?.stage_status ? <StatusBadge status={s.stage_status} /> : <StatusBadge status="no_data" />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
