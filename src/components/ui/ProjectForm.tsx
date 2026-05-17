'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, updateProject } from '@/app/actions'
import type { Project } from '@/types'

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      client_name: fd.get('client_name') as string,
      location: (fd.get('location') as string) || null,
      mob_date: (fd.get('mob_date') as string) || null,
      floors: (fd.get('floors') as string) || null,
      status: fd.get('status') as string,
      notes: (fd.get('notes') as string) || null,
    }

    startTransition(async () => {
      try {
        if (project) {
          await updateProject(project.id, data)
          router.push(`/projects/${project.id}`)
        } else {
          const id = await createProject(data)
          router.push(`/projects/${id}`)
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Client name *</label>
          <input name="client_name" required defaultValue={project?.client_name} placeholder="e.g. Rajesh Kumar" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
          <input name="location" defaultValue={project?.location ?? ''} placeholder="e.g. Whitefield, Bangalore" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobilisation date</label>
          <input name="mob_date" type="date" defaultValue={project?.mob_date ?? ''} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
          <select name="status" defaultValue={project?.status ?? 'active'} className={inputCls + ' bg-white'}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Number of floors</label>
          <select name="floors" defaultValue={project?.floors ?? ''} className={inputCls + ' bg-white'}>
            <option value="">Not set (show all stages)</option>
            <option value="G">G — Ground floor only</option>
            <option value="G+1">G+1 — 1 upper floor</option>
            <option value="G+2">G+2 — 2 upper floors</option>
            <option value="G+3">G+3 — 3 upper floors</option>
            <option value="G+4">G+4 — 4 upper floors</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
        <textarea name="notes" defaultValue={project?.notes ?? ''} rows={3} placeholder="Any additional notes..." className={inputCls + ' resize-none'} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={isPending} className="px-5 py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-60">
          {isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  )
}
