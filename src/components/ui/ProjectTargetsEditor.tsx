'use client'
import { useState, useTransition } from 'react'
import { upsertProjectStageOverride, deleteProjectStageOverride } from '@/app/actions'
import type { StageTarget, ProjectStageOverride } from '@/types'

interface Props {
  projectId: string
  defaults: StageTarget[]
  overrides: ProjectStageOverride[]
}

// Effective cumulative target_days for each stage (override wins over default)
function effectiveCumulatives(
  defaults: StageTarget[],
  overrideMap: Record<string, ProjectStageOverride>
): Record<string, number> {
  return Object.fromEntries(
    defaults.map(d => [d.stage_name, overrideMap[d.stage_name]?.target_days ?? d.target_days])
  )
}

// Duration = effective cumulative - previous stage's effective cumulative
function toDurations(
  defaults: StageTarget[],
  cumulatives: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(
    defaults.map((d, i) => {
      const prev = i > 0 ? cumulatives[defaults[i - 1].stage_name] : 0
      return [d.stage_name, cumulatives[d.stage_name] - prev]
    })
  )
}

export function ProjectTargetsEditor({ projectId, defaults, overrides }: Props) {
  const overrideMap = Object.fromEntries(overrides.map(o => [o.stage_name, o]))

  const initCumulatives = effectiveCumulatives(defaults, overrideMap)
  const initDurations = toDurations(defaults, initCumulatives)

  const [durations, setDurations] = useState<Record<string, number>>(initDurations)
  const [buffers, setBuffers] = useState<Record<string, number>>(
    Object.fromEntries(defaults.map(d => {
      const ov = overrideMap[d.stage_name]
      return [d.stage_name, ov?.buffer_days ?? d.buffer_days]
    }))
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)
  const [customSet, setCustomSet] = useState<Record<string, boolean>>(
    Object.fromEntries(defaults.map(d => [d.stage_name, !!overrideMap[d.stage_name]]))
  )

  // Compute live cumulative for a stage from current durations state
  function getCumulative(stageName: string): number {
    let sum = 0
    for (const d of defaults) {
      sum += durations[d.stage_name] ?? 0
      if (d.stage_name === stageName) break
    }
    return sum
  }

  function handleSave(stageName: string) {
    const newCumulative = getCumulative(stageName)
    startTransition(async () => {
      await upsertProjectStageOverride(projectId, stageName, newCumulative, buffers[stageName])
      setCustomSet(prev => ({ ...prev, [stageName]: true }))
      setEditing(null)
      setSaved(stageName)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleReset(stageName: string) {
    const def = defaults.find(d => d.stage_name === stageName)!
    // Recompute default duration = def.target_days - prev default target_days
    const defIdx = defaults.findIndex(d => d.stage_name === stageName)
    const prevDefCumulative = defIdx > 0 ? defaults[defIdx - 1].target_days : 0
    const defDuration = def.target_days - prevDefCumulative

    startTransition(async () => {
      await deleteProjectStageOverride(projectId, stageName)
      setDurations(prev => ({ ...prev, [stageName]: defDuration }))
      setBuffers(prev => ({ ...prev, [stageName]: def.buffer_days }))
      setCustomSet(prev => ({ ...prev, [stageName]: false }))
      setEditing(null)
      setSaved(stageName)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-120">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Stage</th>
            <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Type</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Duration (days)</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Buffer (days)</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Mob + (total)</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {defaults.map((d, idx) => {
            const isCustom = customSet[d.stage_name]
            const isEditing = editing === d.stage_name
            const justSaved = saved === d.stage_name
            const cumulative = getCumulative(d.stage_name)

            // Default duration for tooltip
            const prevDefCumulative = idx > 0 ? defaults[idx - 1].target_days : 0
            const defDuration = d.target_days - prevDefCumulative

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
                    <p className="text-xs text-gray-400 mt-0.5">default: {defDuration}d + {d.buffer_days}d buffer</p>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                    {d.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      value={durations[d.stage_name]}
                      min={1}
                      onChange={e => setDurations(prev => ({ ...prev, [d.stage_name]: +e.target.value }))}
                      className="w-20 border border-blue-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <span className={`font-medium ${isCustom ? 'text-blue-700' : 'text-gray-700'}`}>{durations[d.stage_name]}d</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      value={buffers[d.stage_name]}
                      min={0}
                      onChange={e => setBuffers(prev => ({ ...prev, [d.stage_name]: +e.target.value }))}
                      className="w-20 border border-blue-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <span className={isCustom ? 'text-blue-600' : 'text-gray-500'}>{buffers[d.stage_name]}d</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                  {cumulative}d
                  {buffers[d.stage_name] > 0 && (
                    <span className="text-gray-300"> + {buffers[d.stage_name]}d</span>
                  )}
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
  )
}
