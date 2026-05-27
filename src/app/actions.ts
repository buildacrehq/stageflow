'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAuthClient, getUserRole, getCurrentUser } from '@/lib/supabase-server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireRole(...allowed: string[]) {
  const role = await getUserRole()
  if (!allowed.includes(role)) throw new Error('Unauthorized')
}

export async function updateStageDate(
  projectId: string, stageName: string, date: string | null, notes?: string | null, paymentDate?: string | null
) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('project_stages').upsert(
    { project_id: projectId, stage_name: stageName, completed_date: date ?? null, notes: notes ?? null, payment_date: paymentDate ?? null },
    { onConflict: 'project_id,stage_name' }
  )
  // No revalidatePath: page is force-dynamic (revalidate=0) so next navigation
  // always fetches fresh data. Optimistic updates handle the current session UI.
}

export async function updateStageTargetDuration(
  stageName: string, duration: number, bufferDays: number
) {
  await requireRole('admin')
  const sb = getAdminClient()
  const { data: all } = await sb.from('stage_targets').select('*').order('sort_order')
  if (!all) return

  const idx = all.findIndex(t => t.stage_name === stageName)
  if (idx === -1) return

  const prevCumulative = idx > 0 ? all[idx - 1].target_days : 0
  const newCumulative = prevCumulative + duration
  const delta = newCumulative - all[idx].target_days

  const updates = all.slice(idx).map(t => ({
    stage_name: t.stage_name,
    target_days: t.target_days + delta,
    buffer_days: t.stage_name === stageName ? bufferDays : t.buffer_days,
  }))

  await Promise.all(updates.map(u =>
    sb.from('stage_targets')
      .update({ target_days: u.target_days, buffer_days: u.buffer_days })
      .eq('stage_name', u.stage_name)
  ))

  revalidatePath('/settings')
}

export async function signIn(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Invalid email or password.' }

  const sb = getAdminClient()
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single()
  const role = (profile?.role as string) ?? 'client'

  const cookieStore = await cookies()
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  cookieStore.set('sf_login_at', Date.now().toString(), { ...cookieOpts, maxAge: 60 * 60 * 24 })
  cookieStore.set('sf_role', role, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

  if (role === 'client') redirect('/client')
  if (role === 'site_engineer') redirect('/engineer')
  if (role === 'project_manager') redirect('/manager')
  if (role === 'coordinator') redirect('/coordinator')
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
  plot_size?: string | null
  status?: string
  notes?: string | null
  client_phone?: string | null
  engineer_name?: string | null
  engineer_phone?: string | null
  maps_link?: string | null
}) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  const { data: project, error } = await sb
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error

  // If a coordinator created the project, auto-assign them
  const creatorRole = await getUserRole()
  if (creatorRole === 'coordinator') {
    const creator = await getCurrentUser()
    if (creator) {
      await sb.from('coordinator_projects').insert({
        user_id: creator.id,
        project_id: project.id,
        assigned_at: new Date().toISOString(),
      })
    }
  }

  revalidatePath('/projects')
  return project.id as string
}

export async function upsertProjectStageOverride(
  projectId: string, stageName: string, targetDays: number, bufferDays: number
) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('project_stage_overrides').upsert(
    { project_id: projectId, stage_name: stageName, target_days: targetDays, buffer_days: bufferDays },
    { onConflict: 'project_id,stage_name' }
  )
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteProjectStageOverride(projectId: string, stageName: string) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('project_stage_overrides')
    .delete()
    .eq('project_id', projectId)
    .eq('stage_name', stageName)
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteProject(id: string) {
  await requireRole('admin')
  const sb = getAdminClient()
  await sb.from('projects').delete().eq('id', id)
  revalidatePath('/projects')
  redirect('/projects')
}

export async function updateUserRole(userId: string, role: 'admin' | 'coordinator' | 'site_engineer' | 'client') {
  await requireRole('admin')
  const sb = getAdminClient()
  await sb.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/settings')
}

export async function updateUserDetails(
  userId: string, name: string, password: string
): Promise<{ error?: string }> {
  await requireRole('admin')
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
  await requireRole('admin')
  const sb = getAdminClient()
  await sb.from('profiles').delete().eq('id', userId)
  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function assignProjectManagerProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  const { error } = await sb.from('project_manager_projects').insert({
    user_id: userId,
    project_id: projectId,
    assigned_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

export async function removeProjectManagerProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('project_manager_projects')
    .update({ removed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('removed_at', null)
  return {}
}

export async function createUser(
  email: string, password: string, role: 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client', phone?: string
): Promise<{ error?: string }> {
  await requireRole('admin')
  const sb = getAdminClient()
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return { error: error.message }
  await sb.from('profiles').insert({ id: data.user.id, name: email, role, phone: phone || null })
  revalidatePath('/settings')
  return {}
}

export async function assignClientProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  const { error: delError } = await sb.from('client_projects').delete().eq('user_id', userId)
  if (delError) return { error: `Delete failed: ${delError.message}` }
  const { data: inserted, error: insError } = await sb
    .from('client_projects')
    .insert({ user_id: userId, project_id: projectId })
    .select()
  if (insError) return { error: `Insert failed: ${insError.message}` }
  if (!inserted || inserted.length === 0) return { error: 'Nothing saved — check DB constraints or RLS' }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function removeClientProject(userId: string, projectId?: string) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('client_projects').delete().eq('user_id', userId)
  if (projectId) revalidatePath(`/projects/${projectId}`)
}

export async function assignCoordinatorProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin')
  const sb = getAdminClient()
  const { error } = await sb.from('coordinator_projects').insert({
    user_id: userId,
    project_id: projectId,
    assigned_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

export async function removeCoordinatorProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin')
  const sb = getAdminClient()
  await sb.from('coordinator_projects')
    .update({ removed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('removed_at', null)
  return {}
}

export async function upsertAllPlotSizeTargets(
  plotSize: string,
  items: { stageName: string; targetDays: number; bufferDays: number }[]
): Promise<{ error?: string }> {
  await requireRole('admin')
  const sb = getAdminClient()
  const { error } = await sb.from('plot_size_stage_targets').upsert(
    items.map(i => ({
      plot_size: plotSize,
      stage_name: i.stageName,
      target_days: i.targetDays,
      buffer_days: i.bufferDays,
    })),
    { onConflict: 'plot_size,stage_name' }
  )
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function upsertPlotSizeTarget(
  plotSize: string, stageName: string, targetDays: number, bufferDays: number
): Promise<{ error?: string }> {
  await requireRole('admin')
  const sb = getAdminClient()
  const { error } = await sb.from('plot_size_stage_targets').upsert(
    { plot_size: plotSize, stage_name: stageName, target_days: targetDays, buffer_days: bufferDays },
    { onConflict: 'plot_size,stage_name' }
  )
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function assignSiteEngineerProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  const { error } = await sb.from('site_engineer_projects').insert({
    user_id: userId,
    project_id: projectId,
    assigned_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

export async function removeSiteEngineerProject(userId: string, projectId: string): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('site_engineer_projects')
    .update({ removed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .is('removed_at', null)
  return {}
}

export async function createUserAsCoordinator(
  email: string, password: string, role: 'site_engineer' | 'project_manager' | 'client', phone?: string
): Promise<{ error?: string }> {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) return { error: error.message }
  await sb.from('profiles').insert({ id: data.user.id, name: email, role, phone: phone || null })
  revalidatePath('/coordinator/team')
  return {}
}

export async function updateProject(id: string, data: {
  client_name: string
  location: string | null
  mob_date: string | null
  floors: string | null
  plot_size: string | null
  status: string
  notes: string | null
  client_phone: string | null
  engineer_name: string | null
  engineer_phone: string | null
  maps_link: string | null
}) {
  await requireRole('admin', 'coordinator')
  const sb = getAdminClient()
  await sb.from('projects').update(data).eq('id', id)
  revalidatePath(`/projects/${id}`)
}
