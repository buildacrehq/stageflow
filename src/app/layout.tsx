import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'
import { createAuthClient, getUserRole } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'StageFlow — BuildAcre',
  description: 'Construction project stage tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const role = user ? await getUserRole() : null

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50">
        {user && <Navbar userEmail={user.email ?? ''} role={role ?? 'staff'} />}
        <main className={user ? 'md:ml-56 pt-14 md:pt-0 min-h-screen' : 'min-h-screen'}>
          <div className={user ? 'px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto' : ''}>
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
