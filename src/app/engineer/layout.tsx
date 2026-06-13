import { EngineerNavbar } from '@/components/ui/EngineerNavbar'
import { createAuthClient, getCurrentUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export default async function EngineerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  let userName = ''
  if (user) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await sb.from('profiles').select('name').eq('id', user.id).single()
    userName = data?.name ?? ''
  }

  return (
    <>
      <EngineerNavbar userName={userName} />
      {children}
    </>
  )
}
