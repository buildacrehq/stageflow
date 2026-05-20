'use client'
import { useTransition, useState } from 'react'
import { updateUserRole, assignClientProject, removeClientProject } from '@/app/actions'

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

  function handleRoleChange(user: UserProfile, newRole: 'admin' | 'staff' | 'viewer') {
    startTransition(async () => {
      await updateUserRole(user.id, newRole)
      setSaved(user.id)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  function handleAssignProject(userId: string, projectId: string) {
    startTransition(async () => {
      if (projectId) await assignClientProject(userId, projectId)
      else await removeClientProject(userId)
      setSaved(userId + '_proj')
      setTimeout(() => setSaved(null), 2000)
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
        return (
          <div key={u.id} className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">{u.email}</p>
                {isCurrentUser && <p className="text-xs text-gray-400 mt-0.5">You</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[u.role]}`}>
                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </span>
                {saved === u.id ? (
                  <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                ) : isCurrentUser ? (
                  <span className="text-xs text-gray-300">—</span>
                ) : (
                  <select
                    defaultValue={u.role}
                    disabled={isPending}
                    onChange={e => handleRoleChange(u, e.target.value as 'admin' | 'staff' | 'viewer')}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                )}
              </div>
            </div>

            {/* Project assignment for viewer role */}
            {u.role === 'viewer' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Assigned project:</span>
                {saved === u.id + '_proj' ? (
                  <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                ) : (
                  <select
                    defaultValue={u.projectId ?? ''}
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
            )}
          </div>
        )
      })}
    </div>
  )
}
