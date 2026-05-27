'use client'
import { useState, useTransition } from 'react'
import { upsertPlotSizeTarget } from '@/app/actions'
import type { StageTarget } from '@/types'

const PLOT_SIZES = ['20x30', '20x40', '30x40', '30x50', '40x40', '40x60'] as const

interface PlotSizeRow {
  plot_size: string
  stage_name: string
  target_days: number
  buffer_days: number
}

interface Props {
  globalTargets: StageTarget[]
  plotSizeTargets: PlotSizeRow[]
}

export function PlotSizeTargetsEditor({ globalTargets, plotSizeTargets }: Props) {
  const [activeSize, setActiveSize] = useState<string>(PLOT_SIZES[0])
  const [editing, setEditing] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [rawInputs, setRawInputs] = useState<Record<string, { target: string; buffer: string }>>({})

  // Build a map: plot_size -> stage_name -> { target_days, buffer_days }
  const [overrides, setOverrides] = useState<Record<string, Record<string, { target: number; buffer: number }>>>(() => {
    const map: Record<string, Record<string, { target: number; buffer: number }>> = {}
    for (const r of plotSizeTargets) {
      if (!map[r.plot_size]) map[r.plot_size] = {}
      map[r.plot_size][r.stage_name] = { target: r.target_days, buffer: r.buffer_days }
    }
    return map
  })

  function getVal(plotSize: string, stageName: string, field: 'target' | 'buffer'): number {
    return overrides[plotSize]?.[stageName]?.[field]
      ?? (field === 'target'
        ? (globalTargets.find(t => t.stage_name === stageName)?.target_days ?? 0)
        : (globalTargets.find(t => t.stage_name === stageName)?.buffer_days ?? 7))
  }

  function setVal(plotSize: string, stageName: string, field: 'target' | 'buffer', val: number) {
    setOverrides(prev => ({
      ...prev,
      [plotSize]: {
        ...(prev[plotSize] ?? {}),
        [stageName]: {
          target: field === 'target' ? val : getVal(plotSize, stageName, 'target'),
          buffer: field === 'buffer' ? val : getVal(plotSize, stageName, 'buffer'),
        },
      },
    }))
  }

  function openEdit(key: string, stageName: string) {
    setRawInputs(prev => ({
      ...prev,
      [key]: {
        target: String(getVal(activeSize, stageName, 'target')),
        buffer: String(getVal(activeSize, stageName, 'buffer')),
      },
    }))
    setEditing(key)
  }

  function handleSave(stageName: string) {
    const key = `${activeSize}-${stageName}`
    const target = parseInt(rawInputs[key]?.target ?? '0', 10) || 0
    const buffer = parseInt(rawInputs[key]?.buffer ?? '0', 10) || 0
    setVal(activeSize, stageName, 'target', target)
    setVal(activeSize, stageName, 'buffer', buffer)
    startTransition(async () => {
      await upsertPlotSizeTarget(activeSize, stageName, target, buffer)
      setEditing(null)
      setSaved(`${activeSize}-${stageName}`)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  const structure = globalTargets.filter(t => t.category === 'structure')
  const finishing = globalTargets.filter(t => t.category === 'finishing')

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
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Target (days)</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Buffer (days)</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => {
                const key = `${activeSize}-${t.stage_name}`
                const isEditing = editing === key
                const justSaved = saved === key
                const hasOverride = !!overrides[activeSize]?.[t.stage_name]

                return (
                  <tr key={t.stage_name} className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">
                      {t.stage_name}
                      {hasOverride && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">custom</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={rawInputs[key]?.target ?? ''}
                          onChange={e => setRawInputs(prev => ({ ...prev, [key]: { ...prev[key], target: e.target.value } }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className={`font-medium ${hasOverride ? 'text-amber-700' : 'text-gray-700'}`}>
                          {getVal(activeSize, t.stage_name, 'target')}d
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={rawInputs[key]?.buffer ?? ''}
                          onChange={e => setRawInputs(prev => ({ ...prev, [key]: { ...prev[key], buffer: e.target.value } }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="text-gray-500">{getVal(activeSize, t.stage_name, 'buffer')}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button disabled={isPending} onClick={() => handleSave(t.stage_name)}
                            className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50">
                            Save
                          </button>
                          <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                      ) : justSaved ? (
                        <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                      ) : (
                        <button onClick={() => openEdit(key, t.stage_name)} className="text-xs text-green-700 hover:text-green-900">Edit</button>
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
      {/* Plot size tabs */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-100 overflow-x-auto">
        {PLOT_SIZES.map(size => (
          <button
            key={size}
            onClick={() => { setActiveSize(size); setEditing(null); setRawInputs({}) }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeSize === size
                ? 'bg-green-700 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      {renderSection('Structure Stages', structure)}
      {renderSection('Finishing Stages', finishing)}
    </div>
  )
}
