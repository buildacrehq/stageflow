import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'
import { ClientNavbar } from '@/components/ui/ClientNavbar'
import { CoordinatorNavbar } from '@/components/ui/CoordinatorNavbar'
import { SessionWatcher } from '@/components/ui/SessionWatcher'
import { createAuthClient, getUserRole } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'StageFlow — BuildAcre',
  description: 'Construction project stage tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const role = user ? await getUserRole() : null

  let clientProjectName: string | undefined
  if (role === 'client' && user) {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await sb
      .from('client_projects')
      .select('projects(client_name)')
      .eq('user_id', user.id)
      .single()
    const proj = data?.projects as unknown as { client_name: string } | { client_name: string }[] | null
    clientProjectName = (Array.isArray(proj) ? proj[0] : proj)?.client_name
  }

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50">
        {user && role === 'client' && (
          <ClientNavbar userEmail={user.email ?? ''} projectName={clientProjectName} />
        )}
        {user && role === 'coordinator' && (
          <CoordinatorNavbar userEmail={user.email ?? ''} />
        )}
        {user && role !== 'client' && role !== 'coordinator' && role !== 'site_engineer' && (
          <Navbar userEmail={user.email ?? ''} role={role ?? 'admin'} />
        )}
        {user && <SessionWatcher />}
        <main className={user ? 'md:ml-56 pt-14 md:pt-0 min-h-screen' : 'min-h-screen'}>
          <div className={user ? 'px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto' : ''}>
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
