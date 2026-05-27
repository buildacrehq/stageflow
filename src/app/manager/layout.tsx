import { ManagerNavbar } from '@/components/ui/ManagerNavbar'
import { createAuthClient } from '@/lib/supabase-server'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userEmail = session?.user?.email ?? ''

  return (
    <>
      <ManagerNavbar userEmail={userEmail} />
      {children}
    </>
  )
}
