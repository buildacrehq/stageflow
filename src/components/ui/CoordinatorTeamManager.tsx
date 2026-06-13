'use client'
import { useState, useTransition } from 'react'
import { HardHat, User, Plus, Briefcase, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { createUserAsCoordinator, updateMemberDetails } from '@/app/actions'

interface Person { id: string; name: string; phone?: string | null; authEmail?: string | null }
interface Project { id: string; client_name: string }

interface Props {
  engineers: Person[]
  managers: Person[]
  clients: Person[]
  projects: Project[]
}

type Tab = 'engineers' | 'managers' | 'clients'

interface Credentials { phone: string; password: string }

interface EditState { id: string; name: string; phone: string; email: string; password: string }

export function CoordinatorTeamManager({ engineers: initialEngineers, managers: initialManagers, clients: initialClients, projects }: Props) {
  const [tab, setTab] = useState<Tab>('engineers')
  const [engineers, setEngineers] = useState(initialEngineers)
  const [managers, setManagers] = useState(initialManagers)
  const [clients, setClients] = useState(initialClients)
  const [isPending, startTransition] = useTransition()
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [newCredentials, setNewCredentials] = useState<Credentials | null>(null)

  // Persist credentials per userId for the lifetime of the page
  const [credentialsMap, setCredentialsMap] = useState<Record<string, Credentials>>({})
  const [showPassFor, setShowPassFor] = useState<Record<string, boolean>>({})

  // Add form state
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // Edit state
  const [editState, setEditState] = useState<EditState | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  function closeAdd() {
    setAddOpen(false); setNewName(''); setNewPhone(''); setNewCredentials(null); setAddError(null)
  }

  function switchTab(t: Tab) {
    setTab(t); closeAdd(); setEditState(null); setEditError(null)
  }

  function handleAddUser() {
    if (!newName || !newPhone) return
    setAddError(null)
    const role = tab === 'engineers' ? 'site_engineer' : tab === 'managers' ? 'project_manager' : 'client'
    startTransition(async () => {
      const res = await createUserAsCoordinator(role, newPhone, newName)
      if (res.error) { setAddError(res.error); return }
      const uid = res.userId!
      const creds: Credentials = { phone: newPhone, password: res.generatedPassword! }
      const newPerson: Person = { id: uid, name: newName, phone: newPhone }
      if (tab === 'engineers') setEngineers(prev => [...prev, newPerson])
      else if (tab === 'managers') setManagers(prev => [...prev, newPerson])
      else setClients(prev => [...prev, newPerson])
      setNewName(''); setNewPhone('')
      setNewCredentials(creds)
      setCredentialsMap(prev => ({ ...prev, [uid]: creds }))
    })
  }

  function handleSaveEdit() {
    if (!editState) return
    setEditError(null)
    const snap = editState
    startTransition(async () => {
      try {
        const res = await updateMemberDetails(snap.id, {
          name: snap.name || undefined,
          phone: snap.phone || undefined,
          email: snap.email || undefined,
          password: snap.password || undefined,
        })
        if (res.error) { setEditError(res.error); return }
      } catch (e) {
        setEditError(e instanceof Error ? e.message : 'Failed to save. Try again.')
        return
      }

      function updatePerson(prev: Person[]) {
        return prev.map(p => p.id === snap.id
          ? { ...p, name: snap.name || p.name, phone: snap.phone || p.phone, authEmail: snap.email || p.authEmail }
          : p
        )
      }
      if (tab === 'engineers') setEngineers(updatePerson)
      else if (tab === 'managers') setManagers(updatePerson)
      else setClients(updatePerson)

      // Update stored credentials if phone or password changed
      if (snap.phone || snap.password) {
        setCredentialsMap(prev => {
          const existing = prev[snap.id]
          return {
            ...prev,
            [snap.id]: {
              phone: snap.phone || existing?.phone || '',
              password: snap.password || existing?.password || '',
            },
          }
        })
      }

      setEditState(null)
      setSavedId(snap.id)
      setTimeout(() => setSavedId(null), 2500)
    })
  }

  const people = tab === 'engineers' ? engineers : tab === 'managers' ? managers : clients
  const tabRole = tab === 'engineers' ? 'site engineer' : tab === 'managers' ? 'project manager' : 'client'

  const tabIcon = (t: Tab, active: boolean) => {
    const cls = `text-${active ? 'white' : 'gray-500'}`
    if (t === 'engineers') return <HardHat size={14} className={cls} />
    if (t === 'managers') return <Briefcase size={14} className={cls} />
    return <User size={14} className={cls} />
  }

  const tabBtn = (t: Tab, label: string, count: number) => (
    <button key={t} onClick={() => switchTab(t)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}>
      {tabIcon(t, tab === t)}
      {label}
      {count > 0 && <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded-full text-white">{count}</span>}
    </button>
  )

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabBtn('engineers', 'Site Engineers', engineers.length)}
        {tabBtn('managers', 'Proj. Managers', managers.length)}
        {tabBtn('clients', 'Clients', clients.length)}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* People list */}
        {people.length === 0 && !addOpen && (
          <p className="px-5 py-6 text-sm text-gray-400 italic">No {tabRole}s yet. Add one below.</p>
        )}

        {people.length > 0 && (
          <div className="divide-y divide-gray-50">
            {people.map(p => {
              const isEditing = editState?.id === p.id
              const creds = credentialsMap[p.id]
              const showPass = showPassFor[p.id] ?? false
              return (
                <div key={p.id}>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        {tab === 'engineers' ? <HardHat size={13} className="text-gray-500" /> : tab === 'managers' ? <Briefcase size={13} className="text-gray-500" /> : <User size={13} className="text-gray-500" />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{p.name}</p>
                        {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                        {p.authEmail && !p.authEmail.endsWith('@buildacre.in') && (
                          <p className="text-xs text-gray-400">{p.authEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {savedId === p.id && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
                      <button
                        onClick={() => { if (isEditing) { setEditState(null); setEditError(null) } else { const realEmail = p.authEmail && !p.authEmail.endsWith('@buildacre.in') ? p.authEmail : ''; setEditState({ id: p.id, name: p.name, phone: p.phone ?? '', email: realEmail, password: '' }); setEditError(null) } }}
                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        {isEditing ? <X size={12} /> : <Pencil size={12} />}
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      {/* Stored credentials */}
                      {creds && (
                        <div className="pt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-medium text-gray-500">Login credentials</p>
                            <button
                              type="button"
                              onClick={() => setShowPassFor(prev => ({ ...prev, [p.id]: !showPass }))}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                            >
                              {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                              {showPass ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400 font-sans">Phone</span>
                              <span className="text-gray-800">{creds.phone}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400 font-sans">Password</span>
                              <span className="text-gray-800">{showPass ? creds.password : '••••••••'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-xs font-medium text-gray-500 pt-1">Edit details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Name" value={editState.name} onChange={e => setEditState(s => s && ({ ...s, name: e.target.value }))} className={inputCls} />
                        <input type="tel" inputMode="numeric" maxLength={10} placeholder="Phone (= login)" value={editState.phone} onChange={e => setEditState(s => s && ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} className={inputCls} />
                        <input type="email" placeholder="Email address" value={editState.email} onChange={e => setEditState(s => s && ({ ...s, email: e.target.value }))} className={inputCls} />
                        <input type="text" placeholder="New password (leave blank to keep)" minLength={6} value={editState.password} onChange={e => setEditState(s => s && ({ ...s, password: e.target.value }))} className={inputCls} />
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-3 items-center">
                        <button onClick={handleSaveEdit} disabled={isPending} className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 disabled:opacity-50">
                          {isPending ? 'Saving…' : 'Save changes'}
                        </button>
                        <button onClick={() => { setEditState(null); setEditError(null) }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Credentials card after creation */}
        {newCredentials && (
          <div className="px-5 py-4 border-t border-green-100 bg-green-50 space-y-3">
            <p className="text-sm font-semibold text-green-800">Created — share these credentials</p>
            <div className="bg-white border border-green-200 rounded-xl p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-sans">Login (phone)</span>
                <span className="font-semibold text-gray-900">{newCredentials.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-sans">Password</span>
                <span className="font-semibold text-gray-900">{newCredentials.password}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">You can view these again via Edit on the person&apos;s row.</p>
            <button onClick={() => setNewCredentials(null)} className="text-xs text-green-700 font-medium hover:text-green-900">
              + Add another {tabRole}
            </button>
          </div>
        )}

        {/* Add form */}
        {addOpen && !newCredentials ? (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <p className="text-sm font-medium text-gray-700">Add {tabRole}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} required className={inputCls} />
              <input
                type="tel" inputMode="numeric" maxLength={10}
                placeholder="Phone number (10 digits)"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={inputCls}
              />
            </div>
            <p className="text-xs text-gray-400">Password will be auto-generated and shown after creation.</p>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleAddUser} disabled={isPending || !newName || !newPhone}
                className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50">
                {isPending ? 'Creating…' : 'Create'}
              </button>
              <button onClick={closeAdd} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        ) : !newCredentials ? (
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium">
              <Plus size={14} />Add {tabRole}
            </button>
          </div>
        ) : null}
      </div>

    </div>
  )
}
