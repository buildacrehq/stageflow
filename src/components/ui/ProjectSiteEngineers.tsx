'use client'
import { useState, useTransition } from 'react'
import { HardHat, X, Plus, History } from 'lucide-react'
import { assignSiteEngineerProject, removeSiteEngineerProject } from '@/app/actions'

interface Engineer {
  id: string
  name: string
}

interface HistoryEntry {
  name: string
  assigned_at: string | null
  removed_at: string
}

interface Props {
  projectId: string
  allEngineers: Engineer[]
  initialAssigned: Engineer[]
  history?: HistoryEntry[]
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProjectSiteEngineers({ projectId, allEngineers, initialAssigned, history = [] }: Props) {
  const [assigned, setAssigned] = useState<Engineer[]>(initialAssigned)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const unassigned = allEngineers.filter(e => !assigned.find(a => a.id === e.id))

  function handleAssign(engineer: Engineer) {
    setAssigned(prev => [...prev, engineer])
    setError(null)
    startTransition(async () => {
      const result = await assignSiteEngineerProject(engineer.id, projectId)
      if (result?.error) {
        setAssigned(prev => prev.filter(a => a.id !== engineer.id))
        setError(result.error)
      }
    })
  }

  function handleRemove(engineerId: string) {
    setAssigned(prev => prev.filter(a => a.id !== engineerId))
    setError(null)
    startTransition(async () => {
      await removeSiteEngineerProject(engineerId, projectId)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardHat size={14} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Site Engineers</p>
          {assigned.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
              {assigned.length}
            </span>
          )}
        </div>
        {unassigned.length > 0 && (
          <div className="relative">
            <select
              defaultValue=""
              disabled={isPending}
              onChange={e => {
                const id = e.target.value
                if (!id) return
                const engineer = allEngineers.find(en => en.id === id)
                if (engineer) handleAssign(engineer)
                e.target.value = ''
              }}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 bg-white text-gray-600 hover:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer disabled:opacity-50 appearance-none"
            >
              <option value="">+ Assign engineer</option>
              {unassigned.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <Plus size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No site engineers assigned to this project.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assigned.map(e => (
            <div key={e.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full">
              <span className="text-xs font-medium text-gray-700">{e.name}</span>
              <button
                onClick={() => handleRemove(e.id)}
                disabled={isPending}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <History size={11} />
            {showHistory ? 'Hide' : 'Show'} handover history ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600 font-medium">{h.name}</span>
                  <span className="text-gray-400">{fmtDate(h.assigned_at)} → {fmtDate(h.removed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
