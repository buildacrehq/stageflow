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
  const [isEditing, setIsEditing] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [rawInputs, setRawInputs] = useState<Record<string, { target: string; buffer: string }>>({})
  const [pendingTab, setPendingTab] = useState<string | null>(null)

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

  function openEdit() {
    const inputs: Record<string, { target: string; buffer: string }> = {}
    for (const t of globalTargets) {
      const key = `${activeSize}-${t.stage_name}`
      inputs[key] = {
        target: String(getVal(activeSize, t.stage_name, 'target')),
        buffer: String(getVal(activeSize, t.stage_name, 'buffer')),
      }
    }
    setRawInputs(inputs)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setRawInputs({})
  }

  function handleSaveAll() {
    const newSizeOverrides: Record<string, { target: number; buffer: number }> = {
      ...(overrides[activeSize] ?? {}),
    }
    for (const t of globalTargets) {
      const key = `${activeSize}-${t.stage_name}`
      const target = parseInt(rawInputs[key]?.target ?? '0', 10) || 0
      const buffer = parseInt(rawInputs[key]?.buffer ?? '0', 10) || 0
      newSizeOverrides[t.stage_name] = { target, buffer }
    }
    setOverrides(prev => ({ ...prev, [activeSize]: newSizeOverrides }))
    startTransition(async () => {
      await Promise.all(
        globalTargets.map(t => {
          const key = `${activeSize}-${t.stage_name}`
          const target = parseInt(rawInputs[key]?.target ?? '0', 10) || 0
          const buffer = parseInt(rawInputs[key]?.buffer ?? '0', 10) || 0
          return upsertPlotSizeTarget(activeSize, t.stage_name, target, buffer)
        })
      )
      setIsEditing(false)
      setRawInputs({})
      setSavedAll(true)
      setTimeout(() => setSavedAll(false), 2000)
    })
  }

  function handleTabClick(size: string) {
    if (isEditing) {
      setPendingTab(size)
      return
    }
    setActiveSize(size)
  }

  function confirmTabSwitch() {
    if (pendingTab) {
      setActiveSize(pendingTab)
      setIsEditing(false)
      setRawInputs({})
      setPendingTab(null)
    }
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
              </tr>
            </thead>
            <tbody>
              {items.map(t => {
                const key = `${activeSize}-${t.stage_name}`
                return (
                  <tr key={t.stage_name} className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-green-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={rawInputs[key]?.target ?? ''}
                          onChange={e => setRawInputs(prev => ({ ...prev, [key]: { ...prev[key], target: e.target.value } }))}
                          className="w-20 border border-green-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      ) : (
                        <span className="font-medium text-gray-700">{getVal(activeSize, t.stage_name, 'target')}d</span>
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
      {pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-medium text-gray-800 mb-1">Unsaved changes</p>
            <p className="text-xs text-gray-500 mb-4">
              You have unsaved edits for {activeSize}. Switch to {pendingTab} and discard them?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPendingTab(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">
                Stay
              </button>
              <button onClick={confirmTabSwitch} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                Discard &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1 overflow-x-auto">
          {PLOT_SIZES.map(size => (
            <button
              key={size}
              onClick={() => handleTabClick(size)}
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
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              <button
                disabled={isPending}
                onClick={handleSaveAll}
                className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save All'}
              </button>
            </>
          ) : savedAll ? (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          ) : (
            <button onClick={openEdit} className="px-3 py-1.5 border border-green-700 text-green-700 text-xs rounded-lg hover:bg-green-50">
              Edit
            </button>
          )}
        </div>
      </div>

      {renderSection('Structure Stages', structure)}
      {renderSection('Finishing Stages', finishing)}
    </div>
  )
}
