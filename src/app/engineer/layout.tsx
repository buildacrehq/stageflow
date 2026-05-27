import { EngineerNavbar } from '@/components/ui/EngineerNavbar'
import { createAuthClient } from '@/lib/supabase-server'

export default async function EngineerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userEmail = session?.user?.email ?? ''

  return (
    <>
      <EngineerNavbar userEmail={userEmail} />
      {children}
    </>
  )
}
