'use client'
import { useState, useTransition } from 'react'
import { UserCheck, X, Plus } from 'lucide-react'
import { assignCoordinatorProject, removeCoordinatorProject } from '@/app/actions'

interface Coordinator {
  id: string
  name: string
}

interface Props {
  projectId: string
  allCoordinators: Coordinator[]
  initialAssigned: Coordinator[]
}

export function ProjectCoordinators({ projectId, allCoordinators, initialAssigned }: Props) {
  const [assigned, setAssigned] = useState<Coordinator[]>(initialAssigned)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const unassigned = allCoordinators.filter(c => !assigned.find(a => a.id === c.id))

  function handleAssign(coordinator: Coordinator) {
    setAssigned(prev => [...prev, coordinator])
    setError(null)
    startTransition(async () => {
      const result = await assignCoordinatorProject(coordinator.id, projectId)
      if (result?.error) {
        setAssigned(prev => prev.filter(a => a.id !== coordinator.id))
        setError(result.error)
      }
    })
  }

  function handleRemove(coordinatorId: string) {
    setAssigned(prev => prev.filter(a => a.id !== coordinatorId))
    setError(null)
    startTransition(async () => {
      await removeCoordinatorProject(coordinatorId, projectId)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserCheck size={14} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Coordinators</p>
          {assigned.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              {assigned.length}
            </span>
          )}
        </div>

        {/* Assign dropdown */}
        {unassigned.length > 0 && (
          <div className="relative">
            <select
              defaultValue=""
              disabled={isPending}
              onChange={e => {
                const id = e.target.value
                if (!id) return
                const coordinator = allCoordinators.find(c => c.id === id)
                if (coordinator) handleAssign(coordinator)
                e.target.value = ''
              }}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 bg-white text-gray-600 hover:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer disabled:opacity-50 appearance-none"
            >
              <option value="">+ Assign coordinator</option>
              {unassigned.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Plus size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No coordinators assigned to this project.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assigned.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full"
            >
              <span className="text-xs font-medium text-amber-800">{c.name}</span>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={isPending}
                className="text-amber-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
