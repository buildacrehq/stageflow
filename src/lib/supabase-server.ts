import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function getUserRole(): Promise<'admin' | 'staff' | 'coordinator' | 'viewer'> {
  // Read from cookie set at login — avoids a DB round-trip on every render
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get('sf_role')?.value
  if (fromCookie) return fromCookie as 'admin' | 'staff' | 'coordinator' | 'viewer'

  // Fallback to DB if cookie missing (e.g. first load after deploy)
  const user = await getCurrentUser()
  if (!user) return 'staff'
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return (data?.role as 'admin' | 'staff' | 'coordinator' | 'viewer') ?? 'staff'
}
