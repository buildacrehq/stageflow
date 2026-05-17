'use client'
import { useTransition } from 'react'
import { deleteProject } from '@/app/actions'

export function DeleteProjectButton({ projectId, clientName }: { projectId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${clientName}"? This will permanently remove all stage data for this project and cannot be undone.`)) return
    startTransition(async () => {
      await deleteProject(projectId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Deleting…' : 'Delete project'}
    </button>
  )
}
