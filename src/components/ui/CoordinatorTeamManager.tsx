'use client'
import { useState, useTransition } from 'react'
import { HardHat, User, Plus, X } from 'lucide-react'
import { createUserAsCoordinator, assignSiteEngineerProject, removeSiteEngineerProject, assignClientProject, removeClientProject } from '@/app/actions'

interface Person { id: string; name: string }
interface Project { id: string; client_name: string }

interface Props {
  engineers: Person[]
  clients: Person[]
  projects: Project[]
}

type Tab = 'engineers' | 'clients'

export function CoordinatorTeamManager({ engineers: initialEngineers, clients: initialClients, projects }: Props) {
  const [tab, setTab] = useState<Tab>('engineers')
  const [engineers, setEngineers] = useState(initialEngineers)
  const [clients, setClients] = useState(initialClients)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New user form state
  const [addOpen, setAddOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  function handleAddUser() {
    if (!newEmail || !newPassword) return
    setError(null)
    const role = tab === 'engineers' ? 'site_engineer' : 'client'
    startTransition(async () => {
      const res = await createUserAsCoordinator(newEmail, newPassword, role)
      if (res.error) { setError(res.error); return }
      // Optimistically add to list
      const newPerson = { id: crypto.randomUUID(), name: newEmail }
      if (tab === 'engineers') setEngineers(prev => [...prev, newPerson])
      else setClients(prev => [...prev, newPerson])
      setNewEmail(''); setNewPassword('')
      setAddOpen(false)
      flash(`${role === 'site_engineer' ? 'Site engineer' : 'Client'} created`)
    })
  }

  const people = tab === 'engineers' ? engineers : clients

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('engineers'); setAddOpen(false) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'engineers' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <HardHat size={14} />Site Engineers
          {engineers.length > 0 && <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded-full">{engineers.length}</span>}
        </button>
        <button onClick={() => { setTab('clients'); setAddOpen(false) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'clients' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <User size={14} />Clients
          {clients.length > 0 && <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded-full">{clients.length}</span>}
        </button>
      </div>

      {/* People list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {people.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 italic">
            No {tab === 'engineers' ? 'site engineers' : 'clients'} yet. Add one below.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {people.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    {tab === 'engineers' ? <HardHat size={13} className="text-gray-500" /> : <User size={13} className="text-gray-500" />}
                  </div>
                  <span className="text-sm text-gray-800">{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new user form */}
        {addOpen ? (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Add {tab === 'engineers' ? 'site engineer' : 'client'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" placeholder="Email address" value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              <input type="password" placeholder="Temporary password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} minLength={6}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600 font-medium">{success} ✓</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleAddUser} disabled={isPending || !newEmail || !newPassword}
                className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50">
                {isPending ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => { setAddOpen(false); setError(null) }} className="text-sm text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium">
              <Plus size={14} />
              Add {tab === 'engineers' ? 'site engineer' : 'client'}
            </button>
          </div>
        )}
      </div>

      {success && !addOpen && (
        <p className="text-xs text-green-600 font-medium">{success} ✓</p>
      )}
    </div>
  )
}
