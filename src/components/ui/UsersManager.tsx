'use client'
import { useTransition, useState } from 'react'
import { updateUserRole } from '@/app/actions'

interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'staff'
}

export function UsersManager({ users, currentUserId }: { users: UserProfile[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  function handleToggle(user: UserProfile) {
    const newRole = user.role === 'admin' ? 'staff' : 'admin'
    startTransition(async () => {
      await updateUserRole(user.id, newRole)
      setSaved(user.id)
      setTimeout(() => setSaved(null), 2000)
    })
  }

  return (
    <div className="divide-y divide-gray-50">
      {users.map(u => {
        const isCurrentUser = u.id === currentUserId
        return (
          <div key={u.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm text-gray-800">{u.email}</p>
              {isCurrentUser && <p className="text-xs text-gray-400 mt-0.5">You</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                u.role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {u.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
              {saved === u.id ? (
                <span className="text-xs text-green-600 font-medium">Saved ✓</span>
              ) : isCurrentUser ? (
                <span className="text-xs text-gray-300">—</span>
              ) : (
                <button
                  disabled={isPending}
                  onClick={() => handleToggle(u)}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Make {u.role === 'admin' ? 'Staff' : 'Admin'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
