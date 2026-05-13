'use client'
import { useState, useTransition } from 'react'
import { updateStageTarget } from '@/app/actions'
import type { StageTarget } from '@/types'

export function TargetsEditor({ targets }: { targets: StageTarget[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, { target: number; buffer: number }>>(
    Object.fromEntries(targets.map(t => [t.stage_name, { target: t.target_days, buffer: t.buffer_days }]))
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  function handleSave(stageName: string) {
    const v = values[stageName]
    startTransition(async () => {
      await updateStageTarget(stageName, v.target, v.buffer)
      setEditing(null)
      setSaved(stageName)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  const structure = targets.filter(t => t.category === 'structure')
  const finishing = targets.filter(t => t.category === 'finishing')

  function renderSection(title: string, items: StageTarget[]) {
    return (
      <div>
        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-120">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Stage</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Target days</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Buffer days</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Deadline = Mob +</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => {
                const v = values[t.stage_name]
                const isEditing = editing === t.stage_name
                const justSaved = saved === t.stage_name

                return (
                  <tr key={t.stage_name} className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={v.target}
                          min={1}
                          onChange={e => setValues(prev => ({ ...prev, [t.stage_name]: { ...prev[t.stage_name], target: +e.target.value } }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="font-medium text-gray-700">{v.target}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={v.buffer}
                          min={0}
                          onChange={e => setValues(prev => ({ ...prev, [t.stage_name]: { ...prev[t.stage_name], buffer: +e.target.value } }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="text-gray-500">{v.buffer}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                      {v.target + v.buffer}d
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={isPending}
                            onClick={() => handleSave(t.stage_name)}
                            className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">
                            Cancel
                          </button>
                        </div>
                      ) : justSaved ? (
                        <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                      ) : (
                        <button
                          onClick={() => setEditing(t.stage_name)}
                          className="text-xs text-green-700 hover:text-green-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderSection('Structure Stages', structure)}
      {renderSection('Finishing Stages', finishing)}
    </div>
  )
}
