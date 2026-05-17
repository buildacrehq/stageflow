'use client'
import { useState, useTransition } from 'react'
import { updateStageTargetDuration } from '@/app/actions'
import type { StageTarget } from '@/types'

function toDurations(targets: StageTarget[]): Record<string, number> {
  return Object.fromEntries(
    targets.map((t, i) => [t.stage_name, t.target_days - (i > 0 ? targets[i - 1].target_days : 0)])
  )
}

export function TargetsEditor({ targets }: { targets: StageTarget[] }) {
  const [durations, setDurations] = useState<Record<string, number>>(toDurations(targets))
  const [buffers, setBuffers] = useState<Record<string, number>>(
    Object.fromEntries(targets.map(t => [t.stage_name, t.buffer_days]))
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  // Compute live cumulative totals from current durations state
  function getCumulative(stageName: string): number {
    let sum = 0
    for (const t of targets) {
      sum += durations[t.stage_name] ?? 0
      if (t.stage_name === stageName) break
    }
    return sum
  }

  function handleSave(stageName: string) {
    startTransition(async () => {
      await updateStageTargetDuration(stageName, durations[stageName], buffers[stageName])
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
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Duration (days)</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Buffer (days)</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Mob + (total)</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => {
                const isEditing = editing === t.stage_name
                const justSaved = saved === t.stage_name
                const cumulative = getCumulative(t.stage_name)

                return (
                  <tr key={t.stage_name} className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={durations[t.stage_name]}
                          min={1}
                          onChange={e => setDurations(prev => ({ ...prev, [t.stage_name]: +e.target.value }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="font-medium text-gray-700">{durations[t.stage_name]}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={buffers[t.stage_name]}
                          min={0}
                          onChange={e => setBuffers(prev => ({ ...prev, [t.stage_name]: +e.target.value }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="text-gray-500">{buffers[t.stage_name]}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                      {cumulative}d
                      {buffers[t.stage_name] > 0 && (
                        <span className="text-gray-300"> + {buffers[t.stage_name]}d buffer</span>
                      )}
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
