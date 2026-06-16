import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — middleware handles session refresh
          }
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function getUserRole(): Promise<'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client'> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get('sf_role')?.value
  if (fromCookie) return fromCookie as 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client'

  const user = await getCurrentUser()
  if (!user) return 'client'
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return (data?.role as 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client') ?? 'client'
}

export interface AssignedPerson { id: string; name: string; phone: string | null }

export async function getAssignedTeam(client: SupabaseClient, projectId: string): Promise<{ engineers: AssignedPerson[]; managers: AssignedPerson[] }> {
  const [engRes, mgrRes] = await Promise.all([
    client.from('site_engineer_projects').select('user_id').eq('project_id', projectId).is('removed_at', null),
    client.from('project_manager_projects').select('user_id').eq('project_id', projectId).is('removed_at', null),
  ])
  const ids = [...(engRes.data ?? []).map(r => r.user_id), ...(mgrRes.data ?? []).map(r => r.user_id)]
  if (ids.length === 0) return { engineers: [], managers: [] }
  const { data: profiles } = await client.from('profiles').select('id, name, phone').in('id', ids)
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p as AssignedPerson]))
  return {
    engineers: (engRes.data ?? []).map(r => profileMap[r.user_id]).filter(Boolean),
    managers: (mgrRes.data ?? []).map(r => profileMap[r.user_id]).filter(Boolean),
  }
}
