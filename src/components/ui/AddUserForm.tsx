'use client'
import { useState, useTransition } from 'react'
import { createUser } from '@/app/actions'

export function AddUserForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createUser(email, password, role)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setEmail('')
        setPassword('')
        setRole('staff')
        setTimeout(() => { setSuccess(false); setOpen(false) }, 1500)
      }
    })
  }

  if (!open) {
    return (
      <div className="px-5 py-3 border-t border-gray-100">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-green-700 hover:text-green-900 font-medium"
        >
          + Add new user
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
      <p className="text-sm font-medium text-gray-700 mb-3">Add new user</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'staff' | 'viewer')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600 font-medium">User created successfully ✓</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create user'}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null) }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
