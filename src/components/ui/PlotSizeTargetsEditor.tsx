'use client'
import { useState, useTransition } from 'react'
import { upsertAllPlotSizeTargets } from '@/app/actions'
import { useBeforeUnload } from '@/lib/hooks'
import type { StageTarget } from '@/types'

const STANDARD_PLOT_SIZES = ['20x30', '20x40', '30x40', '30x50', '40x40', '40x60']

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
  const existingCustom = plotSizeTargets
    .map(r => r.plot_size)
    .filter(s => !STANDARD_PLOT_SIZES.includes(s))
    .filter((s, i, arr) => arr.indexOf(s) === i)

  const [customSizes, setCustomSizes] = useState<string[]>(existingCustom)
  const [newSizeInput, setNewSizeInput] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const allSizes = [...STANDARD_PLOT_SIZES, ...customSizes]
  const [activeSize, setActiveSize] = useState<string>(STANDARD_PLOT_SIZES[0])
  const [isEditing, setIsEditing] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [rawInputs, setRawInputs] = useState<Record<string, { target: string; buffer: string }>>({})
  const [pendingTab, setPendingTab] = useState<string | null>(null)

  useBeforeUnload(isEditing)

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
    for (const t of structure) {
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
    for (const t of structure) {
      const key = `${activeSize}-${t.stage_name}`
      const target = parseInt(rawInputs[key]?.target ?? '0', 10) || 0
      const buffer = parseInt(rawInputs[key]?.buffer ?? '0', 10) || 0
      newSizeOverrides[t.stage_name] = { target, buffer }
    }
    setOverrides(prev => ({ ...prev, [activeSize]: newSizeOverrides }))
    startTransition(async () => {
      await upsertAllPlotSizeTargets(
        activeSize,
        structure.map(t => {
          const key = `${activeSize}-${t.stage_name}`
          return {
            stageName: t.stage_name,
            targetDays: parseInt(rawInputs[key]?.target ?? '0', 10) || 0,
            bufferDays: parseInt(rawInputs[key]?.buffer ?? '0', 10) || 0,
          }
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

  function handleAddCustomSize() {
    const size = newSizeInput.trim()
    if (!size || allSizes.includes(size)) {
      setNewSizeInput('')
      setShowAddInput(false)
      return
    }
    setCustomSizes(prev => [...prev, size])
    setNewSizeInput('')
    setShowAddInput(false)
    setActiveSize(size)
    startTransition(async () => {
      await upsertAllPlotSizeTargets(
        size,
        globalTargets.map(t => ({ stageName: t.stage_name, targetDays: t.target_days, bufferDays: t.buffer_days }))
      )
    })
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
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 border-r border-gray-200">Stage</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Target (days)</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Buffer (days)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t, i) => {
                const key = `${activeSize}-${t.stage_name}`
                return (
                  <tr key={t.stage_name} className={`border-b border-gray-200 transition-colors ${isEditing ? (i % 2 === 0 ? 'bg-green-50/50' : 'bg-green-50/20') : (i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100/60')}`}>
                    <td className="px-5 py-3 font-medium text-gray-800 border-r border-gray-200">{t.stage_name}</td>
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
        <div className="flex items-center gap-1 overflow-x-auto flex-wrap">
          {allSizes.map(size => (
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
          {showAddInput ? (
            <div className="flex items-center gap-1 ml-1">
              <input
                autoFocus
                value={newSizeInput}
                onChange={e => setNewSizeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSize() } if (e.key === 'Escape') { setShowAddInput(false); setNewSizeInput('') } }}
                placeholder="e.g. 25x35"
                className="text-xs px-2 py-1.5 border border-green-300 rounded-lg w-24 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <button onClick={handleAddCustomSize} className="text-xs px-2 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800">Add</button>
              <button onClick={() => { setShowAddInput(false); setNewSizeInput('') }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Add custom dimension"
            >
              + Custom
            </button>
          )}
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
    </div>
  )
}
