'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase-server'

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

export async function signIn(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Invalid email or password.' }

  const cookieStore = await cookies()
  cookieStore.set('sf_login_at', Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  redirect('/')
}

export async function signOut() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('sf_login_at')

  redirect('/login')
}

export async function createProject(data: {
  client_name: string
  location: string | null
  mob_date: string | null
  status?: string
  notes?: string | null
}) {
  const sb = getAdminClient()
  const { data: project, error } = await sb
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/projects')
  revalidatePath('/')
  return project.id as string
}

export async function upsertProjectStageOverride(
  projectId: string, stageName: string, targetDays: number, bufferDays: number
) {
  const sb = getAdminClient()
  await sb.from('project_stage_overrides').upsert(
    { project_id: projectId, stage_name: stageName, target_days: targetDays, buffer_days: bufferDays },
    { onConflict: 'project_id,stage_name' }
  )
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteProjectStageOverride(projectId: string, stageName: string) {
  const sb = getAdminClient()
  await sb.from('project_stage_overrides')
    .delete()
    .eq('project_id', projectId)
    .eq('stage_name', stageName)
  revalidatePath(`/projects/${projectId}`)
}

export async function updateProject(id: string, data: {
  client_name: string
  location: string | null
  mob_date: string | null
  status: string
  notes: string | null
}) {
  const sb = getAdminClient()
  await sb.from('projects').update(data).eq('id', id)
  revalidatePath(`/projects/${id}`)
  revalidatePath('/projects')
  revalidatePath('/')
}
