import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'
import { createAuthClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'StageFlow — Buildacre',
  description: 'Construction project stage tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex">
        {user && <Navbar userEmail={user.email ?? ''} />}
        <main className={`flex-1 min-h-screen overflow-y-auto ${!user ? 'w-full' : ''}`}>
          <div className={user ? 'max-w-7xl mx-auto px-6 py-6' : ''}>
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
