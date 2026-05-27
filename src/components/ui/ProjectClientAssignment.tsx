'use client'
import { useState, useTransition } from 'react'
import { User, X, Plus } from 'lucide-react'
import { assignClientProject, removeClientProject } from '@/app/actions'

interface Client {
  id: string
  name: string
}

interface Props {
  projectId: string
  allClients: Client[]
  initialAssigned: Client[]
}

export function ProjectClientAssignment({ projectId, allClients, initialAssigned }: Props) {
  const [assigned, setAssigned] = useState<Client[]>(initialAssigned)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const unassigned = allClients.filter(c => !assigned.find(a => a.id === c.id))

  function handleAssign(client: Client) {
    setAssigned(prev => [...prev, client])
    setError(null)
    startTransition(async () => {
      const result = await assignClientProject(client.id, projectId)
      if (result?.error) {
        setAssigned(prev => prev.filter(a => a.id !== client.id))
        setError(result.error)
      }
    })
  }

  function handleRemove(clientId: string) {
    setAssigned(prev => prev.filter(a => a.id !== clientId))
    setError(null)
    startTransition(async () => {
      await removeClientProject(clientId, projectId)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Clients</p>
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
                const client = allClients.find(c => c.id === id)
                if (client) handleAssign(client)
                e.target.value = ''
              }}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 bg-white text-gray-600 hover:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer disabled:opacity-50 appearance-none"
            >
              <option value="">+ Assign client</option>
              {unassigned.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Plus size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No clients assigned to this project.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assigned.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full">
              <span className="text-xs font-medium text-blue-700">{c.name}</span>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={isPending}
                className="text-blue-400 hover:text-red-500 transition-colors disabled:opacity-50"
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
