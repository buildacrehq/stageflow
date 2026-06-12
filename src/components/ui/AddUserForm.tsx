'use client'
import { useState, useTransition } from 'react'
import { createUser } from '@/app/actions'

type Role = 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client'
const FIELD_ROLES: Role[] = ['site_engineer', 'project_manager', 'client']

export function AddUserForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('coordinator')
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ phone: string; password: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const isField = FIELD_ROLES.includes(role)

  function reset() {
    setName(''); setEmail(''); setPassword(''); setPhone(''); setRole('coordinator')
    setError(null); setCredentials(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createUser(
        isField ? '' : email,
        isField ? '' : password,
        role,
        phone || undefined,
        name || undefined,
      )
      if (res.error) {
        setError(res.error)
      } else if (res.generatedPassword) {
        setCredentials({ phone, password: res.generatedPassword })
        setName(''); setEmail(''); setPassword(''); setPhone('')
      } else {
        reset()
        setOpen(false)
      }
    })
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'

  if (!open) {
    return (
      <div className="px-5 py-3 border-t border-gray-100">
        <button onClick={() => setOpen(true)} className="text-sm text-green-700 hover:text-green-900 font-medium">
          + Add new user
        </button>
      </div>
    )
  }

  if (credentials) {
    return (
      <div className="px-5 py-4 border-t border-gray-100 bg-green-50 space-y-3">
        <p className="text-sm font-semibold text-green-800">User created — share these credentials</p>
        <div className="bg-white border border-green-200 rounded-xl p-4 space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-sans">Login (phone)</span>
            <span className="font-semibold text-gray-900">{credentials.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-sans">Password</span>
            <span className="font-semibold text-gray-900">{credentials.password}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">Copy these now — the password won&apos;t be shown again.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setCredentials(null)}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800"
          >
            Add another
          </button>
          <button
            onClick={() => { reset(); setOpen(false) }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
      <p className="text-sm font-medium text-gray-700 mb-3">Add new user</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
          {!isField && (
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          )}
          {!isField && (
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputCls} />
          )}
          <select
            value={role}
            onChange={e => setRole(e.target.value as Role)}
            className={inputCls + ' bg-white'}
          >
            <option value="admin">Admin</option>
            <option value="coordinator">Coordinator</option>
            <option value="site_engineer">Site Engineer</option>
            <option value="project_manager">Project Manager</option>
            <option value="client">Client</option>
          </select>
        </div>

        <input
          type="tel" inputMode="numeric" maxLength={10}
          placeholder={isField ? 'Phone number (10 digits) — used as login' : 'Phone number (optional)'}
          value={phone}
          onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); setPhone(e.currentTarget.value) }}
          onChange={e => setPhone(e.target.value)}
          required={isField}
          className={inputCls + ' w-full sm:w-72'}
        />

        {isField && (
          <p className="text-xs text-gray-400">Password will be auto-generated and shown after creation.</p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending} className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50">
            {isPending ? 'Creating…' : 'Create user'}
          </button>
          <button type="button" onClick={() => { reset(); setOpen(false) }} className="text-sm text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
