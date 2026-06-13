'use client'
import { useTransition, useState } from 'react'
import {
  updateUserRole, assignClientProject, removeClientProject,
  assignCoordinatorProject, removeCoordinatorProject,
  updateUserDetails, deleteUser, updateMemberDetails,
} from '@/app/actions'

const FIELD_ROLES = ['site_engineer', 'project_manager', 'client'] as const

interface UserProfile {
  id: string
  name: string
  phone: string | null
  authEmail: string | null
  role: 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client'
  projectId?: string | null
  coordinatorProjectIds?: string[]
  engineerProjectIds?: string[]
  managerProjectIds?: string[]
}

interface Project { id: string; client_name: string }

export function UsersManager({ users, currentUserId, projects }: {
  users: UserProfile[]
  currentUserId: string
  projects: Project[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)
  const [projError, setProjError] = useState<string | null>(null)
  const [roles, setRoles] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.role]))
  )
  const [projectIds, setProjectIds] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.projectId ?? '']))
  )
  const [coordProjectIds, setCoordProjectIds] = useState<Record<string, string[]>>(
    Object.fromEntries(users.map(u => [u.id, u.coordinatorProjectIds ?? []]))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openEdit(u: UserProfile) {
    setEditingId(u.id)
    setEditName(u.name ?? '')
    setEditEmail(u.authEmail && !u.authEmail.endsWith('@buildacre.in') ? u.authEmail : '')
    setEditPhone(u.phone ?? '')
    setEditPassword('')
    setEditError(null)
    setConfirmDelete(null)
  }

  function cancelEdit() { setEditingId(null); setEditError(null); setConfirmDelete(null) }

  function handleRoleChange(userId: string, newRole: UserProfile['role']) {
    setRoles(r => ({ ...r, [userId]: newRole }))
    startTransition(async () => {
      await updateUserRole(userId, newRole)
      setSaved(userId); setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleAssignProject(userId: string, projectId: string) {
    setProjectIds(p => ({ ...p, [userId]: projectId }))
    setProjError(null)
    startTransition(async () => {
      if (projectId) {
        const res = await assignClientProject(userId, projectId)
        if (res.error) { setProjError(res.error); return }
      } else {
        await removeClientProject(userId)
      }
      setSaved(userId + '_proj'); setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleAddCoordProject(userId: string, projectId: string) {
    if (!projectId || (coordProjectIds[userId] ?? []).includes(projectId)) return
    setCoordProjectIds(p => ({ ...p, [userId]: [...(p[userId] ?? []), projectId] }))
    startTransition(async () => {
      const res = await assignCoordinatorProject(userId, projectId)
      if (res.error) { setProjError(res.error); return }
      setSaved(userId + '_cproj'); setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleRemoveCoordProject(userId: string, projectId: string) {
    setCoordProjectIds(p => ({ ...p, [userId]: (p[userId] ?? []).filter(id => id !== projectId) }))
    startTransition(async () => { await removeCoordinatorProject(userId, projectId) })
  }

  function handleSaveEdit(u: UserProfile) {
    setEditError(null)
    const isField = (FIELD_ROLES as readonly string[]).includes(u.role)
    startTransition(async () => {
      try {
        const res = isField
          ? await updateMemberDetails(u.id, {
              name: editName.trim() || undefined,
              phone: editPhone.trim() || undefined,
              password: editPassword || undefined,
            })
          : await updateUserDetails(u.id, editName.trim(), editPassword, editEmail.trim() || undefined)
        if (res.error) { setEditError(res.error); return }
        setEditingId(null)
        setSaved(u.id + '_edit'); setTimeout(() => setSaved(null), 2000)
      } catch (e) {
        setEditError(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      const res = await deleteUser(userId)
      if (res.error) setEditError(res.error)
      else setEditingId(null)
    })
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-green-100 text-green-700',
    coordinator: 'bg-amber-100 text-amber-700',
    site_engineer: 'bg-gray-100 text-gray-600',
    project_manager: 'bg-purple-100 text-purple-700',
    client: 'bg-blue-100 text-blue-700',
  }
  const roleLabels: Record<string, string> = {
    admin: 'Admin', coordinator: 'Coordinator', site_engineer: 'Site Engineer',
    project_manager: 'Project Manager', client: 'Client',
  }

  const inp = 'w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <div className="divide-y divide-gray-50">
      {users.map(u => {
        const isCurrentUser = u.id === currentUserId
        const isEditing = editingId === u.id
        const currentRole = roles[u.id] ?? u.role
        const currentProjectId = projectIds[u.id] ?? ''
        const currentCoordProjects = coordProjectIds[u.id] ?? []
        const availableForCoord = projects.filter(p => !currentCoordProjects.includes(p.id))
        const isField = (FIELD_ROLES as readonly string[]).includes(currentRole)

        // Login email: hide fake @buildacre.in ones
        const loginEmail = u.authEmail && !u.authEmail.endsWith('@buildacre.in') ? u.authEmail : null

        return (
          <div key={u.id} className="px-5 py-4">
            {/* Header row: name + role + actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{u.name || '—'}</p>

                {/* All info fields in a compact grid */}
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {loginEmail && (
                    <span className="text-xs text-gray-500">
                      <span className="text-gray-400">Email: </span>{loginEmail}
                    </span>
                  )}
                  {u.phone && (
                    <span className="text-xs text-gray-500">
                      <span className="text-gray-400">Phone: </span>{u.phone}
                    </span>
                  )}
                  {isField && !u.phone && (
                    <span className="text-xs text-amber-500 italic">No phone set</span>
                  )}
                  {isCurrentUser && <span className="text-xs text-green-600 font-medium">You</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {saved === u.id + '_edit' && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[currentRole]}`}>
                  {roleLabels[currentRole] ?? currentRole}
                </span>
                {isCurrentUser ? (
                  <span className="text-xs text-gray-300">—</span>
                ) : saved === u.id ? (
                  <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                ) : (
                  <select
                    value={currentRole}
                    disabled={isPending}
                    onChange={e => handleRoleChange(u.id, e.target.value as UserProfile['role'])}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="site_engineer">Site Engineer</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="client">Client</option>
                  </select>
                )}
                {!isCurrentUser && (
                  <button onClick={() => isEditing ? cancelEdit() : openEdit(u)}
                    className="text-xs text-gray-400 hover:text-gray-700 underline">
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>
            </div>

            {/* Project chips for SE */}
            {currentRole === 'site_engineer' && !isEditing && (u.engineerProjectIds ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(u.engineerProjectIds ?? []).map(pid => {
                  const p = projects.find(p => p.id === pid)
                  return p ? <span key={pid} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{p.client_name}</span> : null
                })}
              </div>
            )}

            {/* Project chips for PM */}
            {currentRole === 'project_manager' && !isEditing && (u.managerProjectIds ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(u.managerProjectIds ?? []).map(pid => {
                  const p = projects.find(p => p.id === pid)
                  return p ? <span key={pid} className="text-xs bg-purple-50 text-purple-700 rounded px-2 py-0.5">{p.client_name}</span> : null
                })}
              </div>
            )}

            {/* Client project */}
            {currentRole === 'client' && !isEditing && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Project:</span>
                {saved === u.id + '_proj' ? <span className="text-xs text-green-600">Saved ✓</span> : (
                  <select value={currentProjectId} disabled={isPending}
                    onChange={e => handleAssignProject(u.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-xs">
                    <option value="">— none —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.client_name}</option>)}
                  </select>
                )}
                {projError && <span className="text-xs text-red-600">{projError}</span>}
              </div>
            )}

            {/* Coordinator projects */}
            {currentRole === 'coordinator' && !isEditing && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentCoordProjects.length === 0 && <span className="text-xs text-gray-400 italic">No projects</span>}
                  {currentCoordProjects.map(pid => {
                    const p = projects.find(p => p.id === pid)
                    return p ? (
                      <span key={pid} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
                        {p.client_name}
                        <button onClick={() => handleRemoveCoordProject(u.id, pid)} disabled={isPending} className="text-amber-400 hover:text-red-600">×</button>
                      </span>
                    ) : null
                  })}
                  {saved === u.id + '_cproj' && <span className="text-xs text-green-600">Saved ✓</span>}
                </div>
                {availableForCoord.length > 0 && (
                  <select defaultValue="" disabled={isPending}
                    onChange={e => { handleAddCoordProject(u.id, e.target.value); e.target.value = '' }}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-xs">
                    <option value="">+ Add project…</option>
                    {availableForCoord.map(p => <option key={p.id} value={p.id}>{p.client_name}</option>)}
                  </select>
                )}
                {projError && <p className="text-xs text-red-600">{projError}</p>}
              </div>
            )}

            {/* Edit panel */}
            {isEditing && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edit user</p>

                {/* Read-only info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white border border-gray-100 rounded-lg p-3">
                  <div>
                    <span className="text-gray-400">Role: </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${roleColors[currentRole]}`}>{roleLabels[currentRole]}</span>
                  </div>
                  {loginEmail && <div><span className="text-gray-400">Email: </span><span className="text-gray-700">{loginEmail}</span></div>}
                  {u.phone && <div><span className="text-gray-400">Current phone: </span><span className="text-gray-700">{u.phone}</span></div>}
                </div>

                {/* Editable fields */}
                <div className={`grid gap-3 ${isField ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={inp} />
                  </div>
                  {!isField && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Email <span className="text-gray-400">(login)</span></label>
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@example.com" className={inp} />
                    </div>
                  )}
                  {isField && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Phone <span className="text-gray-400">(= login)</span></label>
                      <input type="tel" inputMode="numeric" maxLength={10} value={editPhone}
                        onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className={inp} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">New password <span className="text-gray-400">(blank = keep)</span></label>
                    <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                      placeholder="min 6 characters" minLength={6} className={inp} />
                  </div>
                </div>

                {editError && <p className="text-xs text-red-600">{editError}</p>}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(u)} disabled={isPending}
                      className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 disabled:opacity-50">
                      {isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Delete user?</span>
                      <button onClick={() => handleDelete(u.id)} disabled={isPending}
                        className="text-xs text-red-600 font-medium hover:text-red-800 disabled:opacity-50">Yes, delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(u.id)} className="text-xs text-red-400 hover:text-red-600">Delete user</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
