import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'

export const metadata: Metadata = {
  title: 'StageFlow — Buildacre',
  description: 'Construction project stage tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex">
        <Navbar />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
