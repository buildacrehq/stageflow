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

export async function updateStageDate(
  projectId: string, stageName: string, date: string | null, notes?: string | null
) {
  const sb = getAdminClient()

  if (date) {
    await sb.from('project_stages').upsert(
      { project_id: projectId, stage_name: stageName, completed_date: date, notes: notes ?? null },
      { onConflict: 'project_id,stage_name' }
    )
  } else {
    await sb.from('project_stages')
      .update({ completed_date: null, notes: notes ?? null })
      .eq('project_id', projectId)
      .eq('stage_name', stageName)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  revalidatePath('/')
}

export async function updateStageTargetDuration(
  stageName: string, duration: number, bufferDays: number
) {
  const sb = getAdminClient()
  const { data: all } = await sb.from('stage_targets').select('*').order('sort_order')
  if (!all) return

  const idx = all.findIndex(t => t.stage_name === stageName)
  if (idx === -1) return

  const prevCumulative = idx > 0 ? all[idx - 1].target_days : 0
  const newCumulative = prevCumulative + duration
  const delta = newCumulative - all[idx].target_days

  // Update this stage and cascade-shift all subsequent stages
  const updates = all.slice(idx).map(t => ({
    stage_name: t.stage_name,
    target_days: t.target_days + delta,
    buffer_days: t.stage_name === stageName ? bufferDays : t.buffer_days,
  }))

  for (const u of updates) {
    await sb.from('stage_targets')
      .update({ target_days: u.target_days, buffer_days: u.buffer_days })
      .eq('stage_name', u.stage_name)
  }

  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/analysis')
}

export async function signIn(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Invalid email or password.' }

  const sb = getAdminClient()
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single()
  const role = (profile?.role as string) ?? 'staff'

  const cookieStore = await cookies()
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  cookieStore.set('sf_login_at', Date.now().toString(), { ...cookieOpts, maxAge: 60 * 60 * 24 })
  cookieStore.set('sf_role', role, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

  if (role === 'viewer') redirect('/viewer')
  redirect('/')
}

export async function signOut() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('sf_login_at')
  cookieStore.delete('sf_role')

  redirect('/login')
}

export async function createProject(data: {
  client_name: string
  location: string | null
  mob_date: string | null
  floors?: string | null
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

export async function deleteProject(id: string) {
  const sb = getAdminClient()
  await sb.from('projects').delete().eq('id', id)
  revalidatePath('/projects')
  revalidatePath('/')
  redirect('/projects')
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'viewer') {
  const sb = getAdminClient()
  await sb.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/settings')
}

export async function updateUserDetails(
  userId: string, name: string, password: string
): Promise<{ error?: string }> {
  const sb = getAdminClient()
  await sb.from('profiles').update({ name }).eq('id', userId)
  if (password) {
    const { error } = await sb.auth.admin.updateUserById(userId, { password })
    if (error) return { error: error.message }
  }
  revalidatePath('/settings')
  return {}
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const sb = getAdminClient()
  await sb.from('profiles').delete().eq('id', userId)
  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function createUser(
  email: string, password: string, role: 'admin' | 'staff' | 'viewer'
): Promise<{ error?: string }> {
  const sb = getAdminClient()
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return { error: error.message }
  await sb.from('profiles').insert({ id: data.user.id, name: email, role })
  revalidatePath('/settings')
  return {}
}

export async function assignClientProject(userId: string, projectId: string): Promise<{ error?: string }> {
  const sb = getAdminClient()

  const { error: delError } = await sb.from('client_projects').delete().eq('user_id', userId)
  if (delError) return { error: `Delete failed: ${delError.message}` }

  const { data: inserted, error: insError } = await sb
    .from('client_projects')
    .insert({ user_id: userId, project_id: projectId })
    .select()
  if (insError) return { error: `Insert failed: ${insError.message}` }
  if (!inserted || inserted.length === 0) return { error: 'Nothing saved — check DB constraints or RLS' }

  return {}
}

export async function removeClientProject(userId: string) {
  const sb = getAdminClient()
  await sb.from('client_projects').delete().eq('user_id', userId)
}

export async function updateProject(id: string, data: {
  client_name: string
  location: string | null
  mob_date: string | null
  floors: string | null
  status: string
  notes: string | null
}) {
  const sb = getAdminClient()
  await sb.from('projects').update(data).eq('id', id)
  revalidatePath(`/projects/${id}`)
  revalidatePath('/projects')
  revalidatePath('/')
}
