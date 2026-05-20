'use client'
import { useTransition, useState } from 'react'
import { updateUserRole, assignClientProject, removeClientProject, updateUserDetails, deleteUser } from '@/app/actions'

interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'staff' | 'viewer'
  projectId?: string | null
}

interface Project {
  id: string
  client_name: string
}

export function UsersManager({
  users, currentUserId, projects,
}: {
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openEdit(u: UserProfile) {
    setEditingId(u.id)
    setEditName(u.email)
    setEditPassword('')
    setEditError(null)
    setConfirmDelete(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
    setConfirmDelete(null)
  }

  function handleRoleChange(userId: string, newRole: 'admin' | 'staff' | 'viewer') {
    setRoles(r => ({ ...r, [userId]: newRole }))
    startTransition(async () => {
      await updateUserRole(userId, newRole)
      setSaved(userId)
      setTimeout(() => setSaved(null), 2000)
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
      setSaved(userId + '_proj')
      setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleSaveEdit(userId: string) {
    if (!editName.trim()) return
    setEditError(null)
    startTransition(async () => {
      const res = await updateUserDetails(userId, editName.trim(), editPassword)
      if (res.error) {
        setEditError(res.error)
      } else {
        setEditingId(null)
        setSaved(userId + '_edit')
        setTimeout(() => setSaved(null), 2000)
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
    staff: 'bg-gray-100 text-gray-500',
    viewer: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="divide-y divide-gray-50">
      {users.map(u => {
        const isCurrentUser = u.id === currentUserId
        const isEditing = editingId === u.id
        const currentRole = roles[u.id] ?? u.role
        const currentProjectId = projectIds[u.id] ?? ''
        return (
          <div key={u.id} className="px-5 py-3.5">
            {/* Name + role row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">{u.email}</p>
                {isCurrentUser && <p className="text-xs text-gray-400 mt-0.5">You</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {saved === u.id + '_edit' && (
                  <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[currentRole]}`}>
                  {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
                </span>
                {saved === u.id ? (
                  <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                ) : isCurrentUser ? (
                  <span className="text-xs text-gray-300">—</span>
                ) : (
                  <select
                    value={currentRole}
                    disabled={isPending}
                    onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'staff' | 'viewer')}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                )}
                {!isCurrentUser && (
                  <button
                    onClick={() => isEditing ? cancelEdit() : openEdit(u)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>
            </div>

            {/* Project assignment for viewer role */}
            {currentRole === 'viewer' && !isEditing && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Assigned project:</span>
                  {saved === u.id + '_proj' ? (
                    <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                  ) : (
                    <select
                      value={currentProjectId}
                      disabled={isPending}
                      onChange={e => handleAssignProject(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50 flex-1 max-w-xs"
                    >
                      <option value="">— none —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.client_name}</option>
                      ))}
                    </select>
                  )}
                </div>
                {projError && (
                  <p className="text-xs text-red-600">{projError}</p>
                )}
              </div>
            )}

            {/* Inline edit form */}
            {isEditing && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email / Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      New password <span className="text-gray-400">(leave blank to keep)</span>
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="••••••"
                      minLength={6}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>
                {editError && <p className="text-xs text-red-600">{editError}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEdit(u.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-green-700 text-white text-xs rounded hover:bg-green-800 disabled:opacity-50"
                    >
                      {isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Delete this user?</span>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(u.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete user
                    </button>
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
