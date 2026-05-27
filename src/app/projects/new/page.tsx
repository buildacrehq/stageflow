import { ProjectForm } from '@/components/ui/ProjectForm'
import { getUserRole } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function NewProjectPage() {
  const role = await getUserRole()
  const backHref = role === 'coordinator' ? '/coordinator/projects' : '/projects'
  const backLabel = role === 'coordinator' ? '← My Projects' : '← Projects'

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-sm text-gray-400 hover:text-gray-600">{backLabel}</Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">New Project</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new construction project</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <ProjectForm />
      </div>
    </div>
  )
}
