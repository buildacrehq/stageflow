'use client'
import { useState, useTransition } from 'react'
import { upsertProjectStageOverride, deleteProjectStageOverride } from '@/app/actions'
import type { StageTarget, ProjectStageOverride } from '@/types'

interface Props {
  projectId: string
  defaults: StageTarget[]
  overrides: ProjectStageOverride[]
}

export function ProjectTargetsEditor({ projectId, defaults, overrides }: Props) {
  const overrideMap = Object.fromEntries(overrides.map(o => [o.stage_name, o]))

  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, { target: number; buffer: number }>>(
    Object.fromEntries(defaults.map(d => {
      const ov = overrideMap[d.stage_name]
      return [d.stage_name, { target: ov?.target_days ?? d.target_days, buffer: ov?.buffer_days ?? d.buffer_days }]
    }))
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  function handleSave(stageName: string) {
    const v = values[stageName]
    startTransition(async () => {
      await upsertProjectStageOverride(projectId, stageName, v.target, v.buffer)
      setEditing(null)
      setSaved(stageName)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleReset(stageName: string) {
    const def = defaults.find(d => d.stage_name === stageName)!
    startTransition(async () => {
      await deleteProjectStageOverride(projectId, stageName)
      setValues(prev => ({ ...prev, [stageName]: { target: def.target_days, buffer: def.buffer_days } }))
      setEditing(null)
      setSaved(stageName)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  const structure = defaults.filter(d => d.category === 'structure')
  const finishing = defaults.filter(d => d.category === 'finishing')

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
              {items.map(d => {
                const isCustom = !!overrideMap[d.stage_name]
                const isEditing = editing === d.stage_name
                const justSaved = saved === d.stage_name
                const v = values[d.stage_name]

                return (
                  <tr key={d.stage_name} className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{d.stage_name}</span>
                        {isCustom && !isEditing && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">custom</span>
                        )}
                      </div>
                      {isCustom && !isEditing && (
                        <p className="text-xs text-gray-400 mt-0.5">default: {d.target_days}d + {d.buffer_days}d buffer</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={v.target}
                          min={1}
                          onChange={e => setValues(prev => ({ ...prev, [d.stage_name]: { ...prev[d.stage_name], target: +e.target.value } }))}
                          className="w-20 border border-blue-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      ) : (
                        <span className={`font-medium ${isCustom ? 'text-blue-700' : 'text-gray-700'}`}>{v.target}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={v.buffer}
                          min={0}
                          onChange={e => setValues(prev => ({ ...prev, [d.stage_name]: { ...prev[d.stage_name], buffer: +e.target.value } }))}
                          className="w-20 border border-blue-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      ) : (
                        <span className={isCustom ? 'text-blue-600' : 'text-gray-500'}>{v.buffer}d</span>
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
                            onClick={() => handleSave(d.stage_name)}
                            className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          {isCustom && (
                            <button
                              disabled={isPending}
                              onClick={() => handleReset(d.stage_name)}
                              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              Reset
                            </button>
                          )}
                          <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">
                            Cancel
                          </button>
                        </div>
                      ) : justSaved ? (
                        <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                      ) : (
                        <button
                          onClick={() => setEditing(d.stage_name)}
                          className="text-xs text-blue-700 hover:text-blue-900"
                        >
                          {isCustom ? 'Edit' : 'Override'}
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
