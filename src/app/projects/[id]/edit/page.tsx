import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProjectForm } from '@/components/ui/ProjectForm'
import Link from 'next/link'
import type { Project } from '@/types'

export const revalidate = 0

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Edit Project</h1>
          <p className="text-sm text-gray-500 mt-0.5">{project.client_name}</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <ProjectForm project={project as Project} />
      </div>
    </div>
  )
}
