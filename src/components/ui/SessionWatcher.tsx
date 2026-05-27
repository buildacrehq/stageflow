'use client'
import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

export function SessionWatcher() {
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') setExpired(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!expired) return null

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1">Session expired</p>
        <p className="text-xs text-gray-500 mb-4">
          Your session has timed out. Please log in again to continue — any unsaved changes may be lost.
        </p>
        <button
          onClick={() => { window.location.href = '/login' }}
          className="w-full py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
        >
          Log in again
        </button>
      </div>
    </div>
  )
}
