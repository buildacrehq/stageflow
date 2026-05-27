'use client'
import { useState, useTransition, useEffect } from 'react'
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
  const [dateValues, setDateValues] = useState<Record<string, string>>(
    Object.fromEntries(stages.map(s => [s.stage_name, s.completed_date ?? '']))
  )
  const [noteError, setNoteError] = useState<string | null>(null)
  const [paymentEditing, setPaymentEditing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setNoteValues(Object.fromEntries(Object.entries(stageNotes).map(([k, v]) => [k, v ?? ''])))
  }, [stageNotes])
  useEffect(() => {
    setPaymentValues(Object.fromEntries(Object.entries(stagePayments).map(([k, v]) => [k, v ?? ''])))
  }, [stagePayments])

  const stageMap = Object.fromEntries(stages.map(s => [s.stage_name, s]))
  const allowedStructure = new Set(visibleStructureStages(floors))
  const visibleTargets = targets.filter(t =>
    t.category === 'finishing' || allowedStructure.has(t.stage_name)
  )

  function willBeDelayed(stageName: string, date: string): boolean {
    if (!mobDate || !date) return false
    const s = stageMap[stageName]
    if (!s) return false
    const days = Math.round((new Date(date).getTime() - new Date(mobDate).getTime()) / 86400000)
    return days > s.target_days + s.buffer_days
  }

  function openEdit(stageName: string) {
    setNoteError(null)
    setDateValues(prev => ({ ...prev, [stageName]: stageMap[stageName]?.completed_date ?? '' }))
    setEditing(stageName)
  }

  function handleStructureSave(stageName: string) {
    const date = dateValues[stageName] ?? ''
    const rawNote = noteValues[stageName]
    const note = rawNote === 'Other'
      ? (document.getElementById(`note-other-${stageName}`) as HTMLInputElement)?.value?.trim() || 'Other'
      : rawNote || null

    if (date && willBeDelayed(stageName, date) && !note) {
      setNoteError('Delay reason is required when stage is delayed.')
      return
    }
    setNoteError(null)
    const payment = paymentValues[stageName]?.trim() || null
    startTransition(async () => {
      await updateStageDate(projectId, stageName, date || null, note, payment)
      setEditing(null)
    })
  }

  function handleFinishingToggle(stageName: string, checked: boolean) {
    const today = new Date().toISOString().split('T')[0]
    const date = checked ? today : null
    startTransition(async () => {
      await updateStageDate(projectId, stageName, date, null, null)
    })
  }

  const structureTargets = visibleTargets.filter(t => t.category === 'structure')
  const finishingTargets = visibleTargets.filter(t => t.category === 'finishing')

  function renderRow(t: (typeof visibleTargets)[0]) {
            const s = stageMap[t.stage_name]
            const isEditing = editing === t.stage_name
            const currentDate = s?.completed_date ?? ''
            const savedNote = stageNotes[t.stage_name]
            const savedPayment = stagePayments[t.stage_name]

            // ── Finishing stage: checkbox only ────────────────────────
            if (t.category === 'finishing') {
              return (
                <tr
                  key={t.stage_name}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">finishing</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                      <input
                        type="checkbox"
                        checked={!!currentDate}
                        disabled={isPending}
                        onChange={e => handleFinishingToggle(t.stage_name, e.target.checked)}
                        className="w-4 h-4 rounded accent-green-700 cursor-pointer disabled:cursor-wait"
                      />
                      {currentDate ? (
                        <span className="text-xs text-gray-600">
                          {new Date(currentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic group-hover:text-gray-400 transition-colors">Not done</span>
                      )}
                    </label>
                  </td>
                  <td className="px-4 py-2.5">
                    {paymentEditing === t.stage_name ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          autoFocus
                          value={paymentValues[t.stage_name] ?? ''}
                          onChange={e => setPaymentValues(prev => ({ ...prev, [t.stage_name]: e.target.value }))}
                          className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                        <button
                          disabled={isPending}
                          onClick={() => {
                            const payment = paymentValues[t.stage_name]?.trim() || null
                            startTransition(async () => {
                              await updateStageDate(projectId, t.stage_name, stageMap[t.stage_name]?.completed_date ?? null, null, payment)
                              setPaymentEditing(null)
                            })
                          }}
                          className="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50"
                        >Save</button>
                        <button onClick={() => setPaymentEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPaymentEditing(t.stage_name)}
                        className="text-left text-gray-700 hover:text-green-700 transition-colors"
                      >
                        {savedPayment
                          ? new Date(savedPayment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-300 italic text-xs">Click to add date</span>
                        }
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">
                    {s?.days_from_mob != null ? `${s.days_from_mob}d` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-300 text-xs">—</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-gray-300 text-xs">—</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {s?.stage_status ? <StatusBadge status={s.stage_status} /> : <StatusBadge status="no_data" />}
                  </td>
                </tr>
              )
            }

            // ── Structure stage: full date + delay reason tracking ─────
            const editingDate = dateValues[t.stage_name] ?? ''
            const delayed = isEditing && editingDate ? willBeDelayed(t.stage_name, editingDate) : false
            const noteRequired = delayed
            const noteValue = noteValues[t.stage_name] ?? ''
            const canSave = !noteRequired || !!noteValue

            return (
              <>
                <tr
                  key={t.stage_name}
                  className={`border-b ${isEditing || savedNote ? 'border-gray-100' : 'border-gray-50'} transition-colors ${isEditing ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">structure</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="date"
                            value={editingDate}
                            onChange={e => {
                              setDateValues(prev => ({ ...prev, [t.stage_name]: e.target.value }))
                              setNoteError(null)
                            }}
                            className="border border-green-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                          />
                          <button
                            disabled={isPending || !canSave}
                            onClick={() => handleStructureSave(t.stage_name)}
                            className="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                          <button onClick={() => { setEditing(null); setNoteError(null) }} className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700">
                            Cancel
                          </button>
                          {delayed && (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Delayed</span>
                          )}
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <select
                                value={noteValue}
                                onChange={e => { setNoteValues(prev => ({ ...prev, [t.stage_name]: e.target.value })); setNoteError(null) }}
                                className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 bg-white ${
                                  noteRequired && !noteValue
                                    ? 'border-red-400 focus:ring-red-500 text-red-600'
                                    : 'border-gray-200 focus:ring-green-600 text-gray-600'
                                }`}
                              >
                                <option value="">
                                  {noteRequired ? 'Select delay reason (required)' : 'Reason for delay (optional)'}
                                </option>
                                {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              {noteRequired && <span className="text-red-500 text-xs font-medium">*</span>}
                            </div>
                            {noteError && <p className="text-xs text-red-600">{noteError}</p>}
                          </div>
                          {noteValue === 'Other' && (
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
                        onClick={() => openEdit(t.stage_name)}
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
                      <button
                        onClick={() => openEdit(t.stage_name)}
                        className="text-left text-gray-700 hover:text-green-700 transition-colors"
                      >
                        {savedPayment
                          ? new Date(savedPayment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-300 italic text-xs">Click to add date</span>
                        }
                      </button>
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
  }

  const COLS = 8

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
          {/* Structure section */}
          <tr className="bg-green-50/60 border-b border-gray-100">
            <td colSpan={COLS} className="px-4 py-2">
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Structure Stages</span>
            </td>
          </tr>
          {structureTargets.map(t => renderRow(t))}

          {/* Finishing section */}
          <tr className="bg-purple-50/60 border-b border-gray-100">
            <td colSpan={COLS} className="px-4 py-2">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Finishing Stages</span>
            </td>
          </tr>
          {finishingTargets.map(t => renderRow(t))}
        </tbody>
      </table>
    </div>
  )
}
