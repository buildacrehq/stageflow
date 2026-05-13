'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function updateStageDate(projectId: string, stageName: string, date: string | null) {
  const sb = getAdminClient()

  if (date) {
    await sb.from('project_stages').upsert(
      { project_id: projectId, stage_name: stageName, completed_date: date },
      { onConflict: 'project_id,stage_name' }
    )
  } else {
    await sb.from('project_stages')
      .update({ completed_date: null })
      .eq('project_id', projectId)
      .eq('stage_name', stageName)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  revalidatePath('/')
}

export async function updateStageTarget(stageName: string, targetDays: number, bufferDays: number) {
  const sb = getAdminClient()
  await sb.from('stage_targets')
    .update({ target_days: targetDays, buffer_days: bufferDays })
    .eq('stage_name', stageName)

  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/analysis')
}

export async function createProject(data: {
  client_name: string
  location: string
  mob_date: string | null
}) {
  const sb = getAdminClient()
  const { data: project, error } = await sb
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/projects')
  return project.id as string
}
