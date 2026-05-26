'use client'
import { useState, useTransition } from 'react'
import { StatusBadge } from './StatusBadge'
import { updateStageDate } from '@/app/actions'
import { visibleStructureStages } from '@/lib/constants'
import type { StageStatusRow, StageTarget } from '@/types'

const DELAY_REASONS = [
  'Contractor delay',
  'Material shortage',
  'Weather',
  'Approvals pending',
  'Design change',
  'Client request',
  'Labour shortage',
  'Other',
]

interface Props {
  projectId: string
  stages: StageStatusRow[]
  targets: StageTarget[]
  mobDate: string | null
  floors: string | null
  stageNotes: Record<string, string | null>
  stagePayments: Record<string, string | null>
}

export function StageEditor({ projectId, stages, targets, mobDate, floors, stageNotes, stagePayments }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [noteValues, setNoteValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(stageNotes).map(([k, v]) => [k, v ?? '']))
  )
  const [paymentValues, setPaymentValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(stagePayments).map(([k, v]) => [k, v ?? '']))
  )
  const [isPending, startTransition] = useTransition()

  const stageMap = Object.fromEntries(stages.map(s => [s.stage_name, s]))
  const allowedStructure = new Set(visibleStructureStages(floors))
  const visibleTargets = targets.filter(t =>
    t.category === 'finishing' || allowedStructure.has(t.stage_name)
  )

  function handleSave(stageName: string, date: string) {
    const note = noteValues[stageName] === 'Other'
      ? (document.getElementById(`note-other-${stageName}`) as HTMLInputElement)?.value || 'Other'
      : noteValues[stageName] || null
    const payment = paymentValues[stageName] || null
    startTransition(async () => {
      await updateStageDate(projectId, stageName, date || null, note, payment)
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
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Payment Date</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Days from Mob</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Target</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Delay</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleTargets.map(t => {
            const s = stageMap[t.stage_name]
            const isEditing = editing === t.stage_name
            const currentDate = s?.completed_date ?? ''
            const savedNote = stageNotes[t.stage_name]
            const savedPayment = stagePayments[t.stage_name]

            return (
              <>
                <tr
                  key={t.stage_name}
                  className={`border-b ${isEditing || savedNote ? 'border-gray-100' : 'border-gray-50'} transition-colors ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <div className="space-y-2">
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
                          <button onClick={() => setEditing(null)} className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700">
                            Cancel
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={noteValues[t.stage_name] ?? ''}
                            onChange={e => setNoteValues(prev => ({ ...prev, [t.stage_name]: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600 bg-white text-gray-600"
                          >
                            <option value="">Reason for delay (optional)</option>
                            {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {noteValues[t.stage_name] === 'Other' && (
                            <input
                              type="text"
                              placeholder="Describe reason…"
                              id={`note-other-${t.stage_name}`}
                              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600 w-40"
                            />
                          )}
                        </div>
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
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="date"
                        value={paymentValues[t.stage_name] ?? ''}
                        onChange={e => setPaymentValues(prev => ({ ...prev, [t.stage_name]: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                      />
                    ) : (
                      <span className="text-gray-600 text-xs">
                        {savedPayment
                          ? new Date(savedPayment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-300">—</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">
                    {s?.days_from_mob != null ? `${s.days_from_mob}d` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{t.target_days}d</td>
                  <td className="px-4 py-2.5 text-center">
                    {s?.delay_days != null && s.delay_days > 0
                      ? <span className="text-red-600 font-medium text-xs">+{s.delay_days}d</span>
                      : s?.stage_status === 'on_time' ? <span className="text-green-600 text-xs">—</span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {s?.stage_status ? <StatusBadge status={s.stage_status} /> : <StatusBadge status="no_data" />}
                  </td>
                </tr>
                {savedNote && !isEditing && (
                  <tr key={`note-${t.stage_name}`} className="border-b border-gray-50 bg-amber-50/40">
                    <td colSpan={8} className="px-4 py-1.5">
                      <span className="text-xs text-amber-700">⚠ Delay reason: {savedNote}</span>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
